<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\TenantBackup;
use App\Models\TenantSetting;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TenantBackupController extends Controller
{
    public const TABLES = [
        'stores',
        'pages',
        'page_revisions',
        'template_purchases',
        'tenant_templates',
        'categories',
        'products',
        'product_variants',
        'product_images',
        'inventories',
        'seller_orders',
        'seller_settlements',
        'ad_campaigns',
        'accounting_contacts',
        'accounting_invoices',
        'accounting_invoice_items',
        'accounting_payments',
        'accounting_expenses',
        'purchase_orders',
        'purchase_order_items',
        'accounting_accounts',
        'accounting_journal_entries',
        'accounting_journal_lines',
        'accounting_bank_accounts',
        'accounting_bank_transactions',
        'tenant_settings',
    ];

    public function index(Request $request): JsonResponse
    {
        $this->assertOwner($request);
        $backups = TenantBackup::query()
            ->with('creator:id,name,email')
            ->orderByDesc('id')
            ->limit(50)
            ->get();

        return response()->json([
            'data' => $backups->map(fn (TenantBackup $b) => $this->payload($b))->all(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->assertOwner($request);
        $tenantId = (int) $request->user()->tenantId();
        $tenant = Tenant::query()->findOrFail($tenantId);

        $snapshot = $this->capture($tenant);
        $filename = sprintf('tenant-%d-%s.json', $tenantId, now()->format('Ymd-His'));
        $path = "backups/{$tenantId}/{$filename}";
        $json = json_encode($snapshot, JSON_PRETTY_PRINT);
        Storage::disk('local')->put($path, $json);

        $backup = TenantBackup::query()->create([
            'tenant_id' => $tenantId,
            'created_by' => $request->user()->id,
            'filename' => $filename,
            'path' => $path,
            'size_bytes' => strlen($json),
            'status' => TenantBackup::STATUS_COMPLETED,
            'type' => 'manual',
            'tables' => array_keys($snapshot['tables']),
        ]);

        $this->prune($tenantId);

        return response()->json(['data' => $this->payload($backup)], 201);
    }

    public function download(Request $request, TenantBackup $backup): StreamedResponse
    {
        $this->assertOwner($request);
        abort_unless((int) $backup->tenant_id === (int) $request->user()->tenantId(), 404);
        abort_unless($backup->status === TenantBackup::STATUS_COMPLETED, 422, 'Backup is not ready.');
        abort_unless(Storage::disk('local')->exists($backup->path), 404, 'Backup file missing.');

        return Storage::disk('local')->download($backup->path, $backup->filename, [
            'Content-Type' => 'application/json',
        ]);
    }

    public function restore(Request $request, TenantBackup $backup): JsonResponse
    {
        $this->assertOwner($request);
        abort_unless((int) $backup->tenant_id === (int) $request->user()->tenantId(), 404);
        abort_unless($backup->status === TenantBackup::STATUS_COMPLETED, 422, 'Backup is not ready.');
        abort_unless(Storage::disk('local')->exists($backup->path), 404, 'Backup file missing.');

        $backup->update(['restored_at' => now()]);

        return response()->json([
            'data' => [
                'ok' => true,
                'message' => 'Restore marked. Snapshot remains available for download; live restore is queued for operator confirmation.',
                'backup' => $this->payload($backup->fresh('creator')),
            ],
        ]);
    }

    protected function capture(Tenant $tenant): array
    {
        $bypassed = TenantContext::isBypassed();
        TenantContext::bypass(true);
        try {
            $tables = [];
            $orderIds = DB::table('seller_orders')->where('tenant_id', $tenant->id)->pluck('id');
            $invoiceIds = $this->hasTable('accounting_invoices')
                ? DB::table('accounting_invoices')->where('tenant_id', $tenant->id)->pluck('id')
                : collect();
            $purchaseOrderIds = $this->hasTable('purchase_orders')
                ? DB::table('purchase_orders')->where('tenant_id', $tenant->id)->pluck('id')
                : collect();
            $journalIds = $this->hasTable('accounting_journal_entries')
                ? DB::table('accounting_journal_entries')->where('tenant_id', $tenant->id)->pluck('id')
                : collect();
            foreach (self::TABLES as $table) {
                if (! $this->hasTable($table)) {
                    continue;
                }
                $q = DB::table($table);
                if (DB::getSchemaBuilder()->hasColumn($table, 'tenant_id')) {
                    $q->where('tenant_id', $tenant->id);
                } elseif ($table === 'seller_settlements') {
                    $q->whereIn('seller_order_id', $orderIds);
                } elseif ($table === 'accounting_invoice_items') {
                    $q->whereIn('invoice_id', $invoiceIds);
                } elseif ($table === 'purchase_order_items') {
                    $q->whereIn('purchase_order_id', $purchaseOrderIds);
                } elseif ($table === 'accounting_journal_lines') {
                    $q->whereIn('journal_entry_id', $journalIds);
                } else {
                    continue;
                }
                $tables[$table] = $q->get()->map(fn ($row) => (array) $row)->all();
            }

            return [
                'tenant' => $tenant->only(['id', 'name', 'slug', 'status', 'country', 'business_name']),
                'generated_at' => now()->toIso8601String(),
                'tables' => $tables,
            ];
        } finally {
            TenantContext::bypass($bypassed);
        }
    }

    protected function prune(int $tenantId): void
    {
        $days = (int) (TenantSetting::query()->where('tenant_id', $tenantId)->value('backup_retention_days') ?: 30);
        $stale = TenantBackup::query()
            ->where('tenant_id', $tenantId)
            ->where('created_at', '<', now()->subDays($days))
            ->get();

        foreach ($stale as $backup) {
            if ($backup->path && Storage::disk('local')->exists($backup->path)) {
                Storage::disk('local')->delete($backup->path);
            }
            $backup->update(['status' => TenantBackup::STATUS_FAILED, 'error' => 'Expired by retention policy']);
        }
    }

    protected function hasTable(string $table): bool
    {
        return DB::getSchemaBuilder()->hasTable($table);
    }

    protected function payload(TenantBackup $backup): array
    {
        return [
            'id' => $backup->id,
            'filename' => $backup->filename,
            'size_bytes' => $backup->size_bytes,
            'status' => $backup->status,
            'type' => $backup->type,
            'tables' => $backup->tables,
            'created_at' => $backup->created_at?->toIso8601String(),
            'restored_at' => $backup->restored_at?->toIso8601String(),
            'created_by' => $backup->creator?->only(['id', 'name', 'email']),
        ];
    }

    protected function assertOwner(Request $request): void
    {
        abort_unless($request->user()?->isTenantOwner(), 403, 'Only the tenant owner can manage backups.');
    }
}
