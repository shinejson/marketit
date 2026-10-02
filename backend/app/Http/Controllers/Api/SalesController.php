<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SalesCustomer;
use App\Models\SalesLead;
use App\Models\SalesOpportunity;
use App\Models\SalesQuote;
use App\Models\TenantSetting;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** Tenant-scoped sales workspace: leads, pipeline, quotes and customer accounts. */
class SalesController extends Controller
{
    public function dashboard(Request $request): JsonResponse
    {
        $this->refreshExpiring();
        $currency = TenantSetting::query()->value('currency') ?? 'USD';

        $openStages = ['prospecting', 'qualified', 'proposal', 'negotiation'];
        $open = SalesOpportunity::query()->whereIn('stage', $openStages)->get();
        $closed = SalesOpportunity::query()->whereIn('stage', ['won', 'lost'])->get();
        $leads = SalesLead::query()->get();
        $quotes = SalesQuote::query()->get();

        $weighted = $open->sum(fn (SalesOpportunity $opportunity) => (float) $opportunity->expected_value * ($opportunity->probability / 100));
        $wonCount = $closed->where('stage', 'won')->count();
        $lostCount = $closed->where('stage', 'lost')->count();

        $months = collect(range(5, 0))->map(function (int $back) {
            $month = now()->subMonths($back);

            return [
                'label' => $month->format('M'),
                'month' => $month->format('Y-m'),
                'opened' => round((float) SalesOpportunity::query()
                    ->whereYear('created_at', $month->year)
                    ->whereMonth('created_at', $month->month)
                    ->sum('expected_value'), 2),
                'won' => round((float) SalesOpportunity::query()
                    ->where('stage', 'won')
                    ->whereYear('closed_at', $month->year)
                    ->whereMonth('closed_at', $month->month)
                    ->sum('expected_value'), 2),
            ];
        })->values();

        $stages = collect(SalesOpportunity::STAGES)->map(fn (string $stage) => [
            'stage' => $stage,
            'label' => str($stage)->headline()->toString(),
            'count' => SalesOpportunity::query()->where('stage', $stage)->count(),
            'value' => round((float) SalesOpportunity::query()->where('stage', $stage)->sum('expected_value'), 2),
            'probability' => SalesOpportunity::STAGE_PROBABILITY[$stage],
        ])->values();

        $leadSources = SalesLead::query()
            ->select('source', DB::raw('count(*) as total'))
            ->groupBy('source')
            ->pluck('total', 'source')
            ->map(fn (int $total, string $source) => ['source' => $source, 'count' => $total])
            ->values();

        $activity = collect()
            ->merge(SalesLead::query()->latest()->limit(4)->get()->map(fn (SalesLead $row) => [
                'type' => 'lead', 'title' => $row->name.($row->company ? ' · '.$row->company : ''),
                'amount' => (float) $row->estimated_value, 'status' => $row->status, 'at' => $row->updated_at,
            ]))
            ->merge(SalesOpportunity::query()->latest()->limit(4)->get()->map(fn (SalesOpportunity $row) => [
                'type' => 'opportunity', 'title' => $row->number.' · '.$row->title,
                'amount' => (float) $row->expected_value, 'status' => $row->stage, 'at' => $row->updated_at,
            ]))
            ->merge(SalesQuote::query()->latest()->limit(4)->get()->map(fn (SalesQuote $row) => [
                'type' => 'quote', 'title' => $row->number.' · '.$row->customer_name,
                'amount' => (float) $row->total, 'status' => $row->status, 'at' => $row->updated_at,
            ]))
            ->sortByDesc('at')->take(7)->values()->map(function (array $row) {
                $row['at'] = $row['at']?->toIso8601String();
                return $row;
            });

        $topCustomers = SalesCustomer::query()
            ->where('status', 'active')
            ->withSum(['opportunities as won_total' => fn (Builder $query) => $query->where('stage', 'won')], 'expected_value')
            ->withCount(['opportunities as open_deals_count' => fn (Builder $query) => $query->whereNotIn('stage', ['won', 'lost'])])
            ->orderByDesc('won_total')
            ->limit(5)
            ->get(['id', 'name', 'company']);

        return response()->json(['data' => [
            'currency' => $currency,
            'kpis' => [
                'pipeline_value' => round((float) $open->sum('expected_value'), 2),
                'weighted_forecast' => round($weighted, 2),
                'open_opportunities' => $open->count(),
                'active_leads' => $leads->whereIn('status', ['new', 'contacted', 'qualified'])->count(),
                'new_leads_30d' => $leads->where('created_at', '>=', now()->subDays(30))->count(),
                'open_quotes' => $quotes->where('status', 'sent')->count(),
                'open_quotes_value' => round((float) $quotes->where('status', 'sent')->sum('total'), 2),
                'win_rate' => $wonCount + $lostCount > 0 ? round(($wonCount / ($wonCount + $lostCount)) * 100) : 0,
                'won_revenue_30d' => round((float) SalesOpportunity::query()
                    ->where('stage', 'won')
                    ->where('closed_at', '>=', now()->subDays(30))
                    ->sum('expected_value'), 2),
                'active_customers' => SalesCustomer::query()->where('status', 'active')->count(),
            ],
            'stages' => $stages,
            'trend' => $months,
            'lead_sources' => $leadSources,
            'recent_activity' => $activity,
            'top_customers' => $topCustomers,
        ]]);
    }

    public function leads(Request $request): JsonResponse
    {
        $query = SalesLead::query()->with(['owner:id,name'])->latest();
        $this->applySearchAndStatus($query, $request, ['name', 'company', 'email', 'phone']);

        return $this->paginated($query, $request);
    }

    public function storeLead(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:180'],
            'company' => ['nullable', 'string', 'max:180'],
            'email' => ['nullable', 'email', 'max:180'],
            'phone' => ['nullable', 'string', 'max:40'],
            'source' => ['nullable', Rule::in(SalesLead::SOURCES)],
            'estimated_value' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'notes' => ['nullable', 'string', 'max:3000'],
        ]);

        $lead = SalesLead::query()->create([
            'tenant_id' => (int) $request->user()->tenantId(),
            'owner_id' => $request->user()->id,
            'created_by' => $request->user()->id,
            'name' => $data['name'],
            'company' => $data['company'] ?? null,
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
            'source' => $data['source'] ?? 'web',
            'status' => 'new',
            'estimated_value' => $data['estimated_value'] ?? 0,
            'currency' => strtoupper($data['currency'] ?? 'USD'),
            'notes' => $data['notes'] ?? null,
        ]);

        return response()->json(['data' => $lead->load('owner:id,name')], 201);
    }

    public function updateLead(Request $request, SalesLead $lead): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['contacted', 'qualified', 'disqualified', 'new'])],
        ]);
        if (! $lead->canTransitionTo($data['status'])) {
            throw ValidationException::withMessages(['status' => "Cannot move a {$lead->status} lead to {$data['status']}."]);
        }
        if ($lead->isConverted()) {
            throw ValidationException::withMessages(['status' => 'A converted lead is read-only.']);
        }

        $lead->update([
            'status' => $data['status'],
            'last_contacted_at' => $data['status'] === 'contacted' ? now() : $lead->last_contacted_at,
        ]);

        return response()->json(['data' => $lead->fresh()->load('owner:id,name')]);
    }

    public function convertLead(Request $request, SalesLead $lead): JsonResponse
    {
        abort_if($lead->isConverted(), 422, 'This lead has already been converted.');
        $tenantId = (int) $request->user()->tenantId();

        $data = $request->validate([
            'customer_name' => ['required', 'string', 'max:180'],
            'customer_company' => ['nullable', 'string', 'max:180'],
            'customer_email' => ['nullable', 'email', 'max:180'],
            'customer_phone' => ['nullable', 'string', 'max:40'],
            'segment' => ['nullable', Rule::in(SalesCustomer::SEGMENTS)],
            'opportunity_title' => ['required', 'string', 'max:190'],
            'expected_value' => ['nullable', 'numeric', 'min:0'],
            'expected_close_date' => ['nullable', 'date'],
            'currency' => ['nullable', 'string', 'size:3'],
            'notes' => ['nullable', 'string', 'max:3000'],
        ]);

        $result = DB::transaction(function () use ($data, $lead, $request, $tenantId) {
            $customer = SalesCustomer::query()->create([
                'tenant_id' => $tenantId,
                'created_by' => $request->user()->id,
                'name' => $data['customer_name'],
                'company' => $data['customer_company'] ?? $lead->company,
                'email' => $data['customer_email'] ?? $lead->email,
                'phone' => $data['customer_phone'] ?? $lead->phone,
                'segment' => $data['segment'] ?? 'standard',
                'status' => 'active',
                'currency' => strtoupper($data['currency'] ?? $lead->currency ?: 'USD'),
                'notes' => $data['notes'] ?? null,
            ]);

            $opportunity = SalesOpportunity::query()->create([
                'tenant_id' => $tenantId,
                'customer_id' => $customer->id,
                'lead_id' => $lead->id,
                'owner_id' => $lead->owner_id ?: $request->user()->id,
                'created_by' => $request->user()->id,
                'number' => $this->nextNumber(SalesOpportunity::class, 'OPP'),
                'title' => $data['opportunity_title'],
                'stage' => 'qualified',
                'expected_value' => $data['expected_value'] ?? $lead->estimated_value,
                'probability' => SalesOpportunity::STAGE_PROBABILITY['qualified'],
                'currency' => $customer->currency,
                'expected_close_date' => $data['expected_close_date'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            $lead->update([
                'status' => 'converted',
                'converted_customer_id' => $customer->id,
                'converted_at' => now(),
            ]);

            return [$customer, $opportunity];
        });

        return response()->json(['data' => [
            'customer' => $result[0],
            'opportunity' => $result[1]->load('customer:id,name,company'),
            'lead' => $lead->fresh(),
        ]], 201);
    }

    public function opportunities(Request $request): JsonResponse
    {
        $query = SalesOpportunity::query()
            ->with(['customer:id,name,company', 'owner:id,name', 'lead:id,name'])
            ->latest();
        $this->applySearchAndStatus($query, $request, ['number', 'title'], 'stage');

        return $this->paginated($query, $request);
    }

    public function storeOpportunity(Request $request): JsonResponse
    {
        $tenantId = (int) $request->user()->tenantId();
        $data = $request->validate([
            'customer_id' => ['nullable', Rule::exists('sales_customers', 'id')->where('tenant_id', $tenantId)],
            'lead_id' => ['nullable', Rule::exists('sales_leads', 'id')->where('tenant_id', $tenantId)],
            'title' => ['required', 'string', 'max:190'],
            'stage' => ['nullable', Rule::in(['prospecting', 'qualified', 'proposal', 'negotiation'])],
            'expected_value' => ['required', 'numeric', 'min:0'],
            'probability' => ['nullable', 'integer', 'min:0', 'max:100'],
            'expected_close_date' => ['nullable', 'date'],
            'currency' => ['nullable', 'string', 'size:3'],
            'notes' => ['nullable', 'string', 'max:3000'],
        ]);

        $stage = $data['stage'] ?? 'prospecting';
        $opportunity = SalesOpportunity::query()->create([
            'tenant_id' => $tenantId,
            'customer_id' => $data['customer_id'] ?? null,
            'lead_id' => $data['lead_id'] ?? null,
            'owner_id' => $request->user()->id,
            'created_by' => $request->user()->id,
            'number' => $this->nextNumber(SalesOpportunity::class, 'OPP'),
            'title' => $data['title'],
            'stage' => $stage,
            'expected_value' => $data['expected_value'],
            'probability' => $data['probability'] ?? SalesOpportunity::STAGE_PROBABILITY[$stage],
            'currency' => strtoupper($data['currency'] ?? 'USD'),
            'expected_close_date' => $data['expected_close_date'] ?? null,
            'notes' => $data['notes'] ?? null,
        ]);

        return response()->json(['data' => $opportunity->load(['customer:id,name,company', 'owner:id,name', 'lead:id,name'])], 201);
    }

    public function updateOpportunity(Request $request, SalesOpportunity $opportunity): JsonResponse
    {
        $data = $request->validate([
            'stage' => ['required', Rule::in(SalesOpportunity::STAGES)],
            'lost_reason' => ['nullable', 'string', 'max:180'],
            'probability' => ['nullable', 'integer', 'min:0', 'max:100'],
        ]);
        if (! $opportunity->canTransitionTo($data['stage'])) {
            throw ValidationException::withMessages(['stage' => "Cannot move a {$opportunity->stage} opportunity to {$data['stage']}."]);
        }
        if ($data['stage'] === 'lost' && empty($data['lost_reason'])) {
            throw ValidationException::withMessages(['lost_reason' => 'Share why the deal was lost so win/loss reporting stays honest.']);
        }

        $updates = ['stage' => $data['stage']];
        if (in_array($data['stage'], ['won', 'lost'], true)) {
            $updates += [
                'closed_at' => now(),
                'probability' => SalesOpportunity::STAGE_PROBABILITY[$data['stage']],
                'lost_reason' => $data['stage'] === 'lost' ? $data['lost_reason'] : null,
            ];
        } else {
            $updates += [
                'closed_at' => null,
                'lost_reason' => null,
                'probability' => $data['probability'] ?? SalesOpportunity::STAGE_PROBABILITY[$data['stage']],
            ];
        }
        $opportunity->update($updates);

        return response()->json(['data' => $opportunity->fresh()->load(['customer:id,name,company', 'owner:id,name', 'lead:id,name'])]);
    }

    public function quotes(Request $request): JsonResponse
    {
        $this->refreshExpiring();
        $query = SalesQuote::query()
            ->with(['customer:id,name,company', 'opportunity:id,number,title', 'items'])
            ->latest('issue_date');
        $this->applySearchAndStatus($query, $request, ['number', 'customer_name', 'customer_email']);

        return $this->paginated($query, $request);
    }

    public function storeQuote(Request $request): JsonResponse
    {
        $tenantId = (int) $request->user()->tenantId();
        $data = $request->validate([
            'customer_id' => ['nullable', Rule::exists('sales_customers', 'id')->where('tenant_id', $tenantId)],
            'opportunity_id' => ['nullable', Rule::exists('sales_opportunities', 'id')->where('tenant_id', $tenantId)],
            'customer_name' => ['required', 'string', 'max:180'],
            'customer_email' => ['nullable', 'email', 'max:180'],
            'issue_date' => ['required', 'date'],
            'expiry_date' => ['required', 'date', 'after_or_equal:issue_date'],
            'currency' => ['nullable', 'string', 'size:3'],
            'discount_total' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:3000'],
            'send_now' => ['nullable', 'boolean'],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.description' => ['required', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);

        $quote = DB::transaction(function () use ($data, $request, $tenantId) {
            [$subtotal, $tax, $items] = $this->lineTotals($data['items']);
            $discount = min((float) ($data['discount_total'] ?? 0), $subtotal + $tax);
            $total = round($subtotal + $tax - $discount, 2);
            $status = ! empty($data['send_now']) ? 'sent' : 'draft';

            $quote = SalesQuote::query()->create([
                'tenant_id' => $tenantId,
                'customer_id' => $data['customer_id'] ?? null,
                'opportunity_id' => $data['opportunity_id'] ?? null,
                'created_by' => $request->user()->id,
                'number' => $this->nextNumber(SalesQuote::class, 'QTE'),
                'customer_name' => $data['customer_name'],
                'customer_email' => $data['customer_email'] ?? null,
                'issue_date' => $data['issue_date'],
                'expiry_date' => $data['expiry_date'],
                'status' => $status,
                'subtotal' => $subtotal,
                'tax_total' => $tax,
                'discount_total' => $discount,
                'total' => $total,
                'currency' => strtoupper($data['currency'] ?? 'USD'),
                'notes' => $data['notes'] ?? null,
                'sent_at' => $status === 'sent' ? now() : null,
            ]);
            $quote->items()->createMany($items);

            return $quote;
        });

        return response()->json(['data' => $quote->load(['customer:id,name,company', 'opportunity:id,number,title', 'items'])], 201);
    }

    public function updateQuote(Request $request, SalesQuote $quote): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(SalesQuote::STATUSES)],
        ]);
        if (! $quote->canTransitionTo($data['status'])) {
            throw ValidationException::withMessages(['status' => "Cannot move a {$quote->status} quote to {$data['status']}."]);
        }

        DB::transaction(function () use ($quote, $data) {
            $updates = ['status' => $data['status']];
            if ($data['status'] === 'sent') {
                $updates['sent_at'] = $quote->sent_at ?? now();
            }
            if ($data['status'] === 'accepted') {
                $updates['accepted_at'] = now();
            }
            $quote->update($updates);

            // An accepted quote wins its linked opportunity automatically.
            if ($data['status'] === 'accepted') {
                $opportunity = $quote->opportunity;
                if ($opportunity && $opportunity->isOpen() && $opportunity->canTransitionTo('won')) {
                    $opportunity->update([
                        'stage' => 'won',
                        'probability' => SalesOpportunity::STAGE_PROBABILITY['won'],
                        'closed_at' => now(),
                        'lost_reason' => null,
                    ]);
                }
            }
        });

        return response()->json(['data' => $quote->fresh()->load(['customer:id,name,company', 'opportunity:id,number,title', 'items'])]);
    }

    public function customers(Request $request): JsonResponse
    {
        $query = SalesCustomer::query()
            ->withCount(['opportunities', 'quotes'])
            ->withCount(['opportunities as open_deals_count' => fn (Builder $nested) => $nested->whereNotIn('stage', ['won', 'lost'])])
            ->withSum(['opportunities as won_total' => fn (Builder $nested) => $nested->where('stage', 'won')], 'expected_value')
            ->latest();
        $this->applySearchAndStatus($query, $request, ['name', 'company', 'email']);

        return $this->paginated($query, $request);
    }

    public function storeCustomer(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:180'],
            'company' => ['nullable', 'string', 'max:180'],
            'email' => ['nullable', 'email', 'max:180'],
            'phone' => ['nullable', 'string', 'max:40'],
            'segment' => ['nullable', Rule::in(SalesCustomer::SEGMENTS)],
            'currency' => ['nullable', 'string', 'size:3'],
            'notes' => ['nullable', 'string', 'max:3000'],
        ]);

        $customer = SalesCustomer::query()->create([
            'tenant_id' => (int) $request->user()->tenantId(),
            'created_by' => $request->user()->id,
            'name' => $data['name'],
            'company' => $data['company'] ?? null,
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
            'segment' => $data['segment'] ?? 'standard',
            'status' => 'active',
            'currency' => strtoupper($data['currency'] ?? 'USD'),
            'notes' => $data['notes'] ?? null,
        ]);

        return response()->json(['data' => $customer], 201);
    }

    private function lineTotals(array $rows): array
    {
        $subtotal = 0.0;
        $tax = 0.0;
        $items = [];
        foreach ($rows as $row) {
            $lineSubtotal = round((float) $row['quantity'] * (float) $row['unit_price'], 2);
            $lineTax = round($lineSubtotal * ((float) ($row['tax_rate'] ?? 0) / 100), 2);
            $subtotal += $lineSubtotal;
            $tax += $lineTax;
            $items[] = [
                ...$row,
                'tax_rate' => $row['tax_rate'] ?? 0,
                'line_subtotal' => $lineSubtotal,
                'line_tax' => $lineTax,
                'line_total' => round($lineSubtotal + $lineTax, 2),
            ];
        }

        return [round($subtotal, 2), round($tax, 2), $items];
    }

    private function nextNumber(string $model, string $prefix): string
    {
        $next = ((int) $model::query()->max('id')) + 1;
        $candidate = sprintf('%s-%s-%05d', $prefix, now()->format('Y'), $next);
        while ($model::query()->where('number', $candidate)->exists()) {
            $candidate = sprintf('%s-%s-%05d', $prefix, now()->format('Y'), ++$next);
        }
        return $candidate;
    }

    private function refreshExpiring(): void
    {
        SalesQuote::query()->where('status', 'sent')->whereDate('expiry_date', '<', today())->update(['status' => 'expired']);
    }

    private function applySearchAndStatus(Builder $query, Request $request, array $columns, string $statusColumn = 'status'): void
    {
        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function (Builder $nested) use ($search, $columns) {
                foreach ($columns as $i => $column) {
                    $method = $i === 0 ? 'where' : 'orWhere';
                    $nested->{$method}($column, 'like', '%'.$search.'%');
                }
            });
        }
        if ($status = $request->string('status')->trim()->toString()) {
            $query->where($statusColumn, $status);
        }
    }

    private function paginated(Builder $query, Request $request, int $default = 25): JsonResponse
    {
        $perPage = min(100, max(1, $request->integer('per_page', $default)));
        $result = $query->paginate($perPage);

        return response()->json([
            'data' => $result->items(),
            'meta' => [
                'page' => $result->currentPage(),
                'per_page' => $result->perPage(),
                'total' => $result->total(),
                'last_page' => $result->lastPage(),
            ],
        ]);
    }
}
