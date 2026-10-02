<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccountingAccount;
use App\Models\AccountingBankAccount;
use App\Models\AccountingBankTransaction;
use App\Models\AccountingJournalEntry;
use App\Models\AccountingJournalLine;
use App\Models\AccountingPayment;
use App\Services\AccountingPostingService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** General ledger, financial reports and bank reconciliation. */
class AccountingLedgerController extends Controller
{
    public function __construct(private readonly AccountingPostingService $posting) {}

    public function accounts(Request $request): JsonResponse
    {
        $tenantId = (int) $request->user()->tenantId();
        $this->posting->ensureDefaultAccounts($tenantId);
        $balances = $this->balances($tenantId, null, $request->date('to')?->toDateString());
        $query = AccountingAccount::query()->orderBy('code');
        if ($type = $request->string('type')->trim()->toString()) {
            $query->where('type', $type);
        }
        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(fn (Builder $q) => $q->where('code', 'like', "%{$search}%")->orWhere('name', 'like', "%{$search}%"));
        }
        $accounts = $query->get()->map(function (AccountingAccount $account) use ($balances) {
            $totals = $balances->get($account->id, ['debit' => 0, 'credit' => 0]);
            $account->setAttribute('debit_total', round((float) $totals['debit'], 2));
            $account->setAttribute('credit_total', round((float) $totals['credit'], 2));
            $account->setAttribute('balance', $this->accountBalance($account->type, $totals));
            return $account;
        });

        return response()->json(['data' => $accounts]);
    }

    public function storeAccount(Request $request): JsonResponse
    {
        $tenantId = (int) $request->user()->tenantId();
        $data = $request->validate([
            'code' => ['required', 'string', 'max:20', Rule::unique('accounting_accounts', 'code')->where('tenant_id', $tenantId)],
            'name' => ['required', 'string', 'max:180'],
            'type' => ['required', Rule::in(AccountingAccount::TYPES)],
            'subtype' => ['nullable', 'string', 'max:60'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);
        $account = AccountingAccount::query()->create([...$data, 'tenant_id' => $tenantId]);

        return response()->json(['data' => $account], 201);
    }

    public function journals(Request $request): JsonResponse
    {
        $query = AccountingJournalEntry::query()
            ->with(['lines.account:id,code,name,type', 'creator:id,name', 'poster:id,name'])
            ->latest('entry_date')->latest('id');
        if ($status = $request->string('status')->trim()->toString()) {
            $query->where('status', $status);
        }
        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(fn (Builder $q) => $q->where('number', 'like', "%{$search}%")
                ->orWhere('reference', 'like', "%{$search}%")->orWhere('memo', 'like', "%{$search}%"));
        }
        $result = $query->paginate(min(100, max(1, $request->integer('per_page', 50))));

        return response()->json(['data' => $result->items(), 'meta' => [
            'page' => $result->currentPage(), 'per_page' => $result->perPage(),
            'total' => $result->total(), 'last_page' => $result->lastPage(),
        ]]);
    }

    public function storeJournal(Request $request): JsonResponse
    {
        $tenantId = (int) $request->user()->tenantId();
        $data = $request->validate([
            'entry_date' => ['required', 'date'],
            'reference' => ['nullable', 'string', 'max:180'],
            'memo' => ['required', 'string', 'max:255'],
            'post_now' => ['nullable', 'boolean'],
            'lines' => ['required', 'array', 'min:2', 'max:100'],
            'lines.*.account_id' => ['required', Rule::exists('accounting_accounts', 'id')->where('tenant_id', $tenantId)],
            'lines.*.description' => ['nullable', 'string', 'max:255'],
            'lines.*.debit' => ['nullable', 'numeric', 'min:0'],
            'lines.*.credit' => ['nullable', 'numeric', 'min:0'],
        ]);
        [$debit, $credit] = $this->validateBalancedLines($data['lines']);

        $entry = DB::transaction(function () use ($data, $debit, $credit, $request, $tenantId) {
            $status = ! empty($data['post_now']) ? 'posted' : 'draft';
            $entry = AccountingJournalEntry::query()->create([
                'tenant_id' => $tenantId,
                'created_by' => $request->user()->id,
                'posted_by' => $status === 'posted' ? $request->user()->id : null,
                'number' => $this->nextJournalNumber($tenantId),
                'entry_date' => $data['entry_date'],
                'reference' => $data['reference'] ?? null,
                'memo' => $data['memo'],
                'status' => $status,
                'total_debit' => $debit,
                'total_credit' => $credit,
                'posted_at' => $status === 'posted' ? now() : null,
            ]);
            $entry->lines()->createMany(collect($data['lines'])->map(fn (array $line) => [
                'account_id' => $line['account_id'],
                'description' => $line['description'] ?? null,
                'debit' => round((float) ($line['debit'] ?? 0), 2),
                'credit' => round((float) ($line['credit'] ?? 0), 2),
            ])->all());
            return $entry;
        });

        return response()->json(['data' => $entry->load('lines.account:id,code,name,type')], 201);
    }

    public function postJournal(Request $request, AccountingJournalEntry $journal): JsonResponse
    {
        if ($journal->status !== 'draft') {
            throw ValidationException::withMessages(['journal' => 'Only draft journals can be posted.']);
        }
        if (abs((float) $journal->total_debit - (float) $journal->total_credit) > 0.001) {
            throw ValidationException::withMessages(['journal' => 'Journal is not balanced.']);
        }
        $journal->update(['status' => 'posted', 'posted_by' => $request->user()->id, 'posted_at' => now()]);

        return response()->json(['data' => $journal->fresh()->load('lines.account:id,code,name,type')]);
    }

    public function reports(Request $request): JsonResponse
    {
        $tenantId = (int) $request->user()->tenantId();
        $report = $request->string('report', 'profit_loss')->toString();
        abort_unless(in_array($report, ['profit_loss', 'balance_sheet', 'trial_balance'], true), 404);
        $from = $request->date('from')?->toDateString() ?? now()->startOfYear()->toDateString();
        $to = $request->date('to')?->toDateString() ?? now()->toDateString();
        $balances = $this->balances($tenantId, $report === 'balance_sheet' ? null : $from, $to);
        $accounts = AccountingAccount::query()->orderBy('code')->get()->map(function (AccountingAccount $account) use ($balances) {
            $totals = $balances->get($account->id, ['debit' => 0, 'credit' => 0]);
            return [
                'id' => $account->id, 'code' => $account->code, 'name' => $account->name, 'type' => $account->type,
                'debit' => round((float) $totals['debit'], 2), 'credit' => round((float) $totals['credit'], 2),
                'balance' => $this->accountBalance($account->type, $totals),
            ];
        });

        $data = match ($report) {
            'profit_loss' => $this->profitLoss($accounts),
            'balance_sheet' => $this->balanceSheet($accounts, $tenantId, $to),
            'trial_balance' => $this->trialBalance($accounts),
        };

        return response()->json(['data' => [
            'report' => $report, 'from' => $from, 'to' => $to, 'currency' => 'USD', ...$data,
        ]]);
    }

    public function bankAccounts(Request $request): JsonResponse
    {
        $tenantId = (int) $request->user()->tenantId();
        $this->posting->ensureDefaultAccounts($tenantId);
        $ledgerBalances = $this->balances($tenantId, null, now()->toDateString());
        $accounts = AccountingBankAccount::query()->with('ledgerAccount:id,code,name')
            ->withCount(['transactions', 'transactions as unmatched_count' => fn ($q) => $q->where('status', 'unmatched')])
            ->get()->map(function (AccountingBankAccount $account) use ($ledgerBalances) {
                $movement = (float) $account->transactions()->sum('amount');
                $statement = round((float) $account->opening_balance + $movement, 2);
                $totals = $ledgerBalances->get($account->ledger_account_id, ['debit' => 0, 'credit' => 0]);
                $ledger = round((float) $totals['debit'] - (float) $totals['credit'], 2);
                $account->setAttribute('statement_balance', $statement);
                $account->setAttribute('ledger_balance', $ledger);
                $account->setAttribute('difference', round($statement - $ledger, 2));
                return $account;
            });

        return response()->json(['data' => $accounts]);
    }

    public function storeBankAccount(Request $request): JsonResponse
    {
        $tenantId = (int) $request->user()->tenantId();
        $this->posting->ensureDefaultAccounts($tenantId);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:180', Rule::unique('accounting_bank_accounts', 'name')->where('tenant_id', $tenantId)],
            'bank_name' => ['nullable', 'string', 'max:180'],
            'account_number_last4' => ['nullable', 'digits:4'],
            'currency' => ['nullable', 'string', 'size:3'],
            'opening_balance' => ['nullable', 'numeric'],
        ]);
        $ledger = AccountingAccount::query()->where('system_key', 'cash')->firstOrFail();
        $account = AccountingBankAccount::query()->create([
            ...$data, 'tenant_id' => $tenantId, 'ledger_account_id' => $ledger->id,
            'currency' => strtoupper($data['currency'] ?? 'USD'),
        ]);

        return response()->json(['data' => $account->load('ledgerAccount:id,code,name')], 201);
    }

    public function bankTransactions(Request $request): JsonResponse
    {
        $query = AccountingBankTransaction::query()->with([
            'bankAccount:id,name,currency',
            'payment:id,reference,direction,amount,currency,paid_on',
        ])->latest('transaction_date')->latest('id');
        if ($status = $request->string('status')->trim()->toString()) {
            $query->where('status', $status);
        }
        if ($bankId = $request->integer('bank_account_id')) {
            $query->where('bank_account_id', $bankId);
        }
        $result = $query->paginate(min(100, max(1, $request->integer('per_page', 100))));

        return response()->json(['data' => $result->items(), 'meta' => [
            'page' => $result->currentPage(), 'per_page' => $result->perPage(),
            'total' => $result->total(), 'last_page' => $result->lastPage(),
        ]]);
    }

    public function storeBankTransaction(Request $request): JsonResponse
    {
        $tenantId = (int) $request->user()->tenantId();
        $data = $request->validate([
            'bank_account_id' => ['required', Rule::exists('accounting_bank_accounts', 'id')->where('tenant_id', $tenantId)],
            'transaction_date' => ['required', 'date'],
            'description' => ['required', 'string', 'max:255'],
            'reference' => ['nullable', 'string', 'max:180'],
            'amount' => ['required', 'numeric', 'not_in:0'],
        ]);
        $transaction = AccountingBankTransaction::query()->create([...$data, 'tenant_id' => $tenantId]);

        return response()->json(['data' => $transaction->load('bankAccount:id,name,currency')], 201);
    }

    public function reconcileBankTransaction(Request $request, AccountingBankTransaction $bankTransaction): JsonResponse
    {
        $tenantId = (int) $request->user()->tenantId();
        $data = $request->validate([
            'status' => ['required', Rule::in(['matched', 'excluded', 'unmatched'])],
            'payment_id' => ['nullable', Rule::exists('accounting_payments', 'id')->where('tenant_id', $tenantId)],
        ]);
        if ($data['status'] === 'matched') {
            $payment = AccountingPayment::query()->findOrFail($data['payment_id'] ?? 0);
            $expected = $payment->direction === 'incoming' ? (float) $payment->amount : -(float) $payment->amount;
            if (abs($expected - (float) $bankTransaction->amount) > 0.01) {
                throw ValidationException::withMessages(['payment_id' => 'Payment amount and bank transaction amount must match.']);
            }
            $alreadyMatched = AccountingBankTransaction::query()
                ->where('payment_id', $payment->id)->where('status', 'matched')
                ->where('id', '!=', $bankTransaction->id)->exists();
            if ($alreadyMatched) {
                throw ValidationException::withMessages(['payment_id' => 'This payment is already matched to another bank transaction.']);
            }
        }
        $bankTransaction->update([
            'status' => $data['status'],
            'payment_id' => $data['status'] === 'matched' ? $data['payment_id'] : null,
            'reconciled_at' => $data['status'] === 'unmatched' ? null : now(),
        ]);

        return response()->json(['data' => $bankTransaction->fresh()->load(['bankAccount:id,name,currency', 'payment'])]);
    }

    private function balances(int $tenantId, ?string $from, ?string $to)
    {
        $query = AccountingJournalLine::query()
            ->join('accounting_journal_entries as entries', 'entries.id', '=', 'accounting_journal_lines.journal_entry_id')
            ->where('entries.tenant_id', $tenantId)->where('entries.status', 'posted');
        if ($from) $query->whereDate('entries.entry_date', '>=', $from);
        if ($to) $query->whereDate('entries.entry_date', '<=', $to);

        return $query->select('accounting_journal_lines.account_id', DB::raw('sum(accounting_journal_lines.debit) as debit'), DB::raw('sum(accounting_journal_lines.credit) as credit'))
            ->groupBy('accounting_journal_lines.account_id')->get()->mapWithKeys(fn ($row) => [
                (int) $row->account_id => ['debit' => (float) $row->debit, 'credit' => (float) $row->credit],
            ]);
    }

    private function accountBalance(string $type, array $totals): float
    {
        $balance = in_array($type, ['asset', 'expense'], true)
            ? (float) $totals['debit'] - (float) $totals['credit']
            : (float) $totals['credit'] - (float) $totals['debit'];
        return round($balance, 2);
    }

    private function profitLoss($accounts): array
    {
        $income = $accounts->where('type', 'income')->filter(fn ($row) => abs($row['balance']) > 0.001)->values();
        $expenses = $accounts->where('type', 'expense')->filter(fn ($row) => abs($row['balance']) > 0.001)->values();
        $totalIncome = round((float) $income->sum('balance'), 2);
        $totalExpenses = round((float) $expenses->sum('balance'), 2);
        return ['income' => $income, 'expenses' => $expenses, 'total_income' => $totalIncome, 'total_expenses' => $totalExpenses, 'net_income' => round($totalIncome - $totalExpenses, 2)];
    }

    private function balanceSheet($accounts, int $tenantId, string $to): array
    {
        $assets = $accounts->where('type', 'asset')->filter(fn ($row) => abs($row['balance']) > 0.001)->values();
        $liabilities = $accounts->where('type', 'liability')->filter(fn ($row) => abs($row['balance']) > 0.001)->values();
        $equity = $accounts->where('type', 'equity')->filter(fn ($row) => abs($row['balance']) > 0.001)->values();
        $allTime = $this->balances($tenantId, null, $to);
        $allAccounts = AccountingAccount::query()->get();
        $income = $allAccounts->where('type', 'income')->sum(fn ($a) => $this->accountBalance('income', $allTime->get($a->id, ['debit' => 0, 'credit' => 0])));
        $expenses = $allAccounts->where('type', 'expense')->sum(fn ($a) => $this->accountBalance('expense', $allTime->get($a->id, ['debit' => 0, 'credit' => 0])));
        $retained = round((float) $income - (float) $expenses, 2);
        if (abs($retained) > 0.001) $equity->push(['id' => 0, 'code' => 'RE', 'name' => 'Current retained earnings', 'type' => 'equity', 'debit' => 0, 'credit' => 0, 'balance' => $retained]);
        $totalAssets = round((float) $assets->sum('balance'), 2);
        $totalLiabilities = round((float) $liabilities->sum('balance'), 2);
        $totalEquity = round((float) $equity->sum('balance'), 2);
        return ['assets' => $assets, 'liabilities' => $liabilities, 'equity' => $equity, 'total_assets' => $totalAssets, 'total_liabilities' => $totalLiabilities, 'total_equity' => $totalEquity, 'difference' => round($totalAssets - $totalLiabilities - $totalEquity, 2)];
    }

    private function trialBalance($accounts): array
    {
        $rows = $accounts->filter(fn ($row) => abs($row['debit']) > 0.001 || abs($row['credit']) > 0.001)->values();
        return ['accounts' => $rows, 'total_debit' => round((float) $rows->sum('debit'), 2), 'total_credit' => round((float) $rows->sum('credit'), 2)];
    }

    private function validateBalancedLines(array $lines): array
    {
        $debit = 0.0; $credit = 0.0;
        foreach ($lines as $index => $line) {
            $d = round((float) ($line['debit'] ?? 0), 2); $c = round((float) ($line['credit'] ?? 0), 2);
            if (($d > 0 && $c > 0) || ($d <= 0 && $c <= 0)) {
                throw ValidationException::withMessages(["lines.{$index}" => 'Each line must contain either a debit or a credit.']);
            }
            $debit += $d; $credit += $c;
        }
        $debit = round($debit, 2); $credit = round($credit, 2);
        if ($debit <= 0 || abs($debit - $credit) > 0.001) {
            throw ValidationException::withMessages(['lines' => 'Total debits and credits must be equal and greater than zero.']);
        }
        return [$debit, $credit];
    }

    private function nextJournalNumber(int $tenantId): string
    {
        $next = AccountingJournalEntry::query()->where('tenant_id', $tenantId)->count() + 1;
        return sprintf('JRN-%s-%05d', now()->format('Y'), $next);
    }
}
