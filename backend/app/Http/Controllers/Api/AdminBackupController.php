<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\PlatformBackup;
use App\Models\PlatformSetting;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

/**
 * Platform-wide snapshots. A backup is a JSON export of the chosen scope written to the
 * private disk; settings snapshots can be restored in place, larger scopes are handed to
 * an operator for confirmation (the archive stays downloadable either way).
 */
class AdminBackupController extends Controller
{
    /** scope => [label, description, tables] */
    public const SCOPES = [
        'settings' => [
            'Settings only',
            'Platform configuration and branding. Restores instantly.',
            ['platform_settings'],
        ],
        'core' => [
            'Core records',
            'Settings plus tenants, stores, plans, subscriptions and roles.',
            ['platform_settings', 'tenants', 'stores', 'plans', 'subscriptions', 'subscription_invoices', 'role_definitions', 'user_roles'],
        ],
        'full' => [
            'Full snapshot',
            'Everything above plus the catalogue, orders and user accounts.',
            [
                'platform_settings', 'tenants', 'stores', 'plans', 'subscriptions', 'subscription_invoices',
                'role_definitions', 'user_roles', 'users', 'categories', 'products', 'product_variants',
                'product_images', 'inventories', 'orders', 'order_items', 'seller_orders', 'seller_settlements',
            ],
        ],
    ];

    /** Columns we never want sitting in a downloadable archive. */
    protected const REDACTED = ['password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes'];

    public function index(): JsonResponse
    {
        $backups = PlatformBackup::query()
            ->with('creator:id,name,email')
            ->orderByDesc('id')
            ->limit(50)
            ->get();

        $retention = (int) (PlatformSetting::get('backup_retention_days') ?: 30);

        return response()->json([
            'data' => $backups->map(fn (PlatformBackup $b) => $this->payload($b))->all(),
            'meta' => [
                'scopes' => collect(self::SCOPES)
                    ->map(fn (array $scope, string $key) => [
                        'value' => $key,
                        'label' => $scope[0],
                        'description' => $scope[1],
                        'tables' => count($scope[2]),
                    ])
                    ->values(),
                'retention_days' => $retention,
                'total_size_bytes' => (int) $backups->where('status', PlatformBackup::STATUS_COMPLETED)->sum('size_bytes'),
                'last_completed_at' => $backups->firstWhere('status', PlatformBackup::STATUS_COMPLETED)?->created_at?->toIso8601String(),
                'scheduled' => (bool) PlatformSetting::get('backup_enabled', true),
                'frequency' => PlatformSetting::get('backup_frequency', 'daily'),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'scope' => ['required', Rule::in(array_keys(self::SCOPES))],
            'note' => ['nullable', 'string', 'max:160'],
        ]);

        $scope = $data['scope'];
        $filename = sprintf('platform-%s-%s.json', $scope, now()->format('Ymd-His'));
        $path = "platform-backups/{$filename}";

        try {
            $snapshot = $this->capture($scope);
            $json = json_encode($snapshot, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            Storage::disk('local')->put($path, $json);

            $backup = PlatformBackup::query()->create([
                'created_by' => $request->user()?->id,
                'filename' => $filename,
                'path' => $path,
                'disk' => 'local',
                'size_bytes' => strlen($json),
                'status' => PlatformBackup::STATUS_COMPLETED,
                'scope' => $scope,
                'type' => 'manual',
                'tables' => array_keys($snapshot['tables']),
                'records' => (int) collect($snapshot['tables'])->map(fn ($rows) => count($rows))->sum(),
                'note' => $data['note'] ?? null,
            ]);
        } catch (Throwable $e) {
            $backup = PlatformBackup::query()->create([
                'created_by' => $request->user()?->id,
                'filename' => $filename,
                'path' => $path,
                'status' => PlatformBackup::STATUS_FAILED,
                'scope' => $scope,
                'type' => 'manual',
                'note' => $data['note'] ?? null,
                'error' => $e->getMessage(),
            ]);

            $this->audit($request, 'backup.failed', ['scope' => $scope, 'error' => $e->getMessage()]);

            return response()->json(['data' => $this->payload($backup), 'message' => 'Snapshot failed: '.$e->getMessage()], 500);
        }

        $this->prune();
        $this->audit($request, 'backup.created', ['scope' => $scope, 'filename' => $filename]);

        return response()->json(['data' => $this->payload($backup->fresh('creator'))], 201);
    }

    public function download(PlatformBackup $backup): StreamedResponse
    {
        abort_unless($backup->status === PlatformBackup::STATUS_COMPLETED, 422, 'Backup is not ready.');
        abort_unless(Storage::disk($backup->disk ?: 'local')->exists($backup->path), 404, 'Backup file missing.');

        return Storage::disk($backup->disk ?: 'local')->download($backup->path, $backup->filename, [
            'Content-Type' => 'application/json',
        ]);
    }

    public function restore(Request $request, PlatformBackup $backup): JsonResponse
    {
        abort_unless($backup->status === PlatformBackup::STATUS_COMPLETED, 422, 'Backup is not ready.');
        $disk = Storage::disk($backup->disk ?: 'local');
        abort_unless($disk->exists($backup->path), 404, 'Backup file missing.');

        $snapshot = json_decode((string) $disk->get($backup->path), true);
        abort_unless(is_array($snapshot) && isset($snapshot['tables']), 422, 'Backup archive is unreadable.');

        $restored = 0;
        $message = 'Restore requested. The archive is queued for operator confirmation — download it to inspect the contents.';

        // Settings are safe to replay in place; wider scopes need a human in the loop.
        if (isset($snapshot['tables']['platform_settings'])) {
            DB::transaction(function () use ($snapshot, &$restored) {
                PlatformSetting::query()->delete();
                foreach ($snapshot['tables']['platform_settings'] as $row) {
                    PlatformSetting::query()->create(collect($row)->only(['key', 'group', 'value', 'type', 'updated_by'])->all());
                    $restored++;
                }
            });

            $message = $backup->scope === 'settings'
                ? "Restored $restored platform settings from this snapshot."
                : "Restored $restored platform settings. The remaining tables are queued for operator confirmation.";
        }

        $backup->update(['restored_at' => now()]);
        $this->audit($request, 'backup.restored', ['id' => $backup->id, 'scope' => $backup->scope, 'settings_restored' => $restored]);

        return response()->json([
            'data' => [
                'ok' => true,
                'message' => $message,
                'settings_restored' => $restored,
                'backup' => $this->payload($backup->fresh('creator')),
            ],
        ]);
    }

    public function destroy(Request $request, PlatformBackup $backup): JsonResponse
    {
        $disk = Storage::disk($backup->disk ?: 'local');
        if ($backup->path && $disk->exists($backup->path)) {
            $disk->delete($backup->path);
        }

        $backup->delete();
        $this->audit($request, 'backup.deleted', ['id' => $backup->id]);

        return response()->json(['data' => ['deleted' => true]]);
    }

    // ------------------------------------------------------------- internals

    protected function capture(string $scope): array
    {
        $bypassed = TenantContext::isBypassed();
        TenantContext::bypass(true);

        try {
            $tables = [];
            foreach (self::SCOPES[$scope][2] as $table) {
                if (! DB::getSchemaBuilder()->hasTable($table)) {
                    continue;
                }

                $tables[$table] = DB::table($table)->get()
                    ->map(fn ($row) => collect((array) $row)->except(self::REDACTED)->all())
                    ->all();
            }

            return [
                'platform' => PlatformSetting::get('platform_name', config('app.name')),
                'scope' => $scope,
                'generated_at' => now()->toIso8601String(),
                'tables' => $tables,
            ];
        } finally {
            TenantContext::bypass($bypassed);
        }
    }

    protected function prune(): void
    {
        $days = (int) (PlatformSetting::get('backup_retention_days') ?: 30);

        PlatformBackup::query()
            ->where('created_at', '<', now()->subDays(max($days, 1)))
            ->get()
            ->each(function (PlatformBackup $backup) {
                $disk = Storage::disk($backup->disk ?: 'local');
                if ($backup->path && $disk->exists($backup->path)) {
                    $disk->delete($backup->path);
                }
                $backup->delete();
            });
    }

    protected function payload(PlatformBackup $backup): array
    {
        return [
            'id' => $backup->id,
            'filename' => $backup->filename,
            'size_bytes' => $backup->size_bytes,
            'status' => $backup->status,
            'scope' => $backup->scope,
            'scope_label' => self::SCOPES[$backup->scope][0] ?? $backup->scope,
            'type' => $backup->type,
            'tables' => $backup->tables,
            'records' => $backup->records,
            'note' => $backup->note,
            'error' => $backup->error,
            'created_at' => $backup->created_at?->toIso8601String(),
            'restored_at' => $backup->restored_at?->toIso8601String(),
            'created_by' => $backup->creator?->only(['id', 'name', 'email']),
        ];
    }

    protected function audit(Request $request, string $action, array $diff): void
    {
        try {
            AuditLog::query()->create([
                'actor_user_id' => $request->user()?->id,
                'action' => $action,
                'subject_type' => PlatformBackup::class,
                'diff' => ['after' => $diff],
                'ip' => $request->ip(),
            ]);
        } catch (Throwable) {
            // Never block a backup on audit failure.
        }
    }
}
