<?php

namespace App\Models;

use App\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A named, reusable permission set owned by one tenant.
 *
 * Portal access (can this person open the tenant console at all?) stays on
 * `user_roles.role`. This model answers the next question — which parts of the
 * console they may use — so a tenant admin can create "Finance officer" or
 * "Warehouse lead" without a platform deploy.
 */
class TenantRole extends Model
{
    use BelongsToTenant;

    /** The owner role is implicit: it always resolves to every permission. */
    public const KEY_OWNER = 'owner';

    protected $fillable = [
        'tenant_id',
        'key',
        'name',
        'description',
        'department',
        'permissions',
        'is_system',
    ];

    protected function casts(): array
    {
        return [
            'permissions' => 'array',
            'is_system' => 'boolean',
        ];
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(UserRole::class, 'tenant_role_id');
    }

    /**
     * The tenant permission catalog.
     *
     * Kept server-side so the console can render human labels, and so an
     * arbitrary permission string can never be persisted. Add an entry here
     * when a new protected capability ships.
     */
    public static function permissionGroups(): array
    {
        return [
            [
                'key' => 'workspace',
                'label' => 'Workspace',
                'description' => 'Everyday visibility across the console.',
                'permissions' => [
                    ['key' => 'dashboard.view', 'label' => 'View dashboard', 'description' => 'Open the tenant dashboard and KPI cards.'],
                    ['key' => 'analytics.view', 'label' => 'View analytics', 'description' => 'Traffic, conversion and revenue reporting.'],
                    ['key' => 'reports.export', 'label' => 'Export reports', 'description' => 'Download CSV exports of console data.'],
                ],
            ],
            [
                'key' => 'catalog',
                'label' => 'Catalog & inventory',
                'description' => 'Products, variants and stock control.',
                'permissions' => [
                    ['key' => 'catalog.view', 'label' => 'View catalog', 'description' => 'Browse products, categories and stores.'],
                    ['key' => 'catalog.manage', 'label' => 'Manage catalog', 'description' => 'Create, edit, publish and archive products.'],
                    ['key' => 'inventory.view', 'label' => 'View inventory', 'description' => 'See stock levels and the stock ledger.'],
                    ['key' => 'inventory.manage', 'label' => 'Manage inventory', 'description' => 'Receive, adjust, count and write off stock.'],
                ],
            ],
            [
                'key' => 'orders',
                'label' => 'Orders & fulfillment',
                'description' => 'The order pipeline from payment to delivery.',
                'permissions' => [
                    ['key' => 'orders.view', 'label' => 'View orders', 'description' => 'Open orders and their line items.'],
                    ['key' => 'orders.manage', 'label' => 'Manage orders', 'description' => 'Advance status, edit and cancel orders.'],
                    ['key' => 'fulfillment.manage', 'label' => 'Fulfil & ship', 'description' => 'Pick, pack, ship and add tracking.'],
                    ['key' => 'orders.refund', 'label' => 'Refund orders', 'description' => 'Issue refunds and returns.'],
                ],
            ],
            [
                'key' => 'customers',
                'label' => 'Customers',
                'description' => 'Shoppers who bought from this tenant.',
                'permissions' => [
                    ['key' => 'customers.view', 'label' => 'View customers', 'description' => 'See customer profiles, spend and order history.'],
                    ['key' => 'customers.manage', 'label' => 'Manage customers', 'description' => 'Edit notes, tags, segments and block abusive accounts.'],
                    ['key' => 'customers.message', 'label' => 'Contact customers', 'description' => 'Send order and marketing messages.'],
                ],
            ],
            [
                'key' => 'finance',
                'label' => 'Finance',
                'description' => 'Accounting, invoicing and payouts.',
                'permissions' => [
                    ['key' => 'finance.view', 'label' => 'View finance', 'description' => 'Open accounting dashboards and reports.'],
                    ['key' => 'finance.manage', 'label' => 'Manage finance', 'description' => 'Invoices, expenses, journals and reconciliation.'],
                    ['key' => 'payouts.manage', 'label' => 'Manage payouts', 'description' => 'Settlement accounts and payout details.'],
                ],
            ],
            [
                'key' => 'sales',
                'label' => 'Sales',
                'description' => 'Leads, pipeline and quotes.',
                'permissions' => [
                    ['key' => 'sales.view', 'label' => 'View sales workspace', 'description' => 'Open leads, pipeline and quotes.'],
                    ['key' => 'sales.manage', 'label' => 'Manage sales workspace', 'description' => 'Create and progress leads, deals and quotes.'],
                ],
            ],
            [
                'key' => 'marketing',
                'label' => 'Marketing & ads',
                'description' => 'Campaigns, promotions and sponsored ads.',
                'permissions' => [
                    ['key' => 'marketing.view', 'label' => 'View marketing', 'description' => 'Campaign performance and content calendar.'],
                    ['key' => 'marketing.manage', 'label' => 'Manage marketing', 'description' => 'Create and edit campaigns and promotions.'],
                    ['key' => 'ads.manage', 'label' => 'Manage sponsored ads', 'description' => 'Fund, launch and pause ad campaigns.'],
                ],
            ],
            [
                'key' => 'support',
                'label' => 'Support',
                'description' => 'Help centre, tickets and live chat.',
                'permissions' => [
                    ['key' => 'support.view', 'label' => 'View support', 'description' => 'Read tickets, chats and guides.'],
                    ['key' => 'support.manage', 'label' => 'Handle support', 'description' => 'Reply, assign and resolve conversations.'],
                ],
            ],
            [
                'key' => 'administration',
                'label' => 'Administration',
                'description' => 'Who works here and how the account is configured.',
                'permissions' => [
                    ['key' => 'team.view', 'label' => 'View system users', 'description' => 'See staff accounts and their access.'],
                    ['key' => 'team.manage', 'label' => 'Manage system users', 'description' => 'Invite, edit, suspend and remove staff.'],
                    ['key' => 'roles.manage', 'label' => 'Manage roles & permissions', 'description' => 'Create roles and change what they can do.'],
                    ['key' => 'settings.manage', 'label' => 'Manage settings', 'description' => 'Business profile, notifications and preferences.'],
                    ['key' => 'integrations.manage', 'label' => 'Manage integrations', 'description' => 'Domains, API keys and webhooks.'],
                    ['key' => 'backups.manage', 'label' => 'Manage backups', 'description' => 'Create, download and restore backups.'],
                ],
            ],
        ];
    }

    /** @return string[] */
    public static function permissionKeys(): array
    {
        $keys = [];

        foreach (self::permissionGroups() as $group) {
            foreach ($group['permissions'] as $permission) {
                $keys[] = $permission['key'];
            }
        }

        return $keys;
    }

    /** Read-only permissions, used to build the "Viewer" preset. */
    protected static function viewPermissions(): array
    {
        return array_values(array_filter(
            self::permissionKeys(),
            fn (string $key) => str_ends_with($key, '.view')
        ));
    }

    /**
     * Built-in roles created for every tenant. They can be edited (except the
     * owner role) but not deleted, so a tenant always has somewhere to put a
     * new hire.
     */
    public static function defaults(): array
    {
        $all = self::permissionKeys();

        return [
            [
                'key' => self::KEY_OWNER,
                'name' => 'Owner',
                'description' => 'Unrestricted access to everything in this tenant, including billing and access control.',
                'department' => null,
                'permissions' => $all,
            ],
            [
                'key' => 'manager',
                'name' => 'General manager',
                'description' => 'Runs the day-to-day business across every workspace, without access-control or backup powers.',
                'department' => null,
                'permissions' => array_values(array_diff($all, ['roles.manage', 'team.manage', 'backups.manage', 'integrations.manage'])),
            ],
            [
                'key' => 'finance',
                'name' => 'Finance officer',
                'description' => 'Accounting, invoicing, expenses and payouts.',
                'department' => 'finance',
                'permissions' => [
                    'dashboard.view', 'analytics.view', 'reports.export',
                    'orders.view', 'customers.view',
                    'finance.view', 'finance.manage', 'payouts.manage',
                ],
            ],
            [
                'key' => 'sales',
                'name' => 'Sales representative',
                'description' => 'Leads, quotes, customer relationships and order follow-up.',
                'department' => 'sales',
                'permissions' => [
                    'dashboard.view', 'catalog.view', 'orders.view', 'orders.manage',
                    'customers.view', 'customers.manage', 'customers.message',
                    'sales.view', 'sales.manage',
                ],
            ],
            [
                'key' => 'operations',
                'name' => 'Operations lead',
                'description' => 'Fulfilment, stock control and catalog upkeep.',
                'department' => 'operations',
                'permissions' => [
                    'dashboard.view', 'catalog.view', 'catalog.manage',
                    'inventory.view', 'inventory.manage',
                    'orders.view', 'orders.manage', 'fulfillment.manage',
                ],
            ],
            [
                'key' => 'marketing',
                'name' => 'Marketing manager',
                'description' => 'Campaigns, sponsored ads and customer communications.',
                'department' => 'marketing',
                'permissions' => [
                    'dashboard.view', 'analytics.view', 'catalog.view',
                    'customers.view', 'customers.message',
                    'marketing.view', 'marketing.manage', 'ads.manage',
                ],
            ],
            [
                'key' => 'support',
                'name' => 'Support agent',
                'description' => 'Answers tickets and live chat with read access to orders.',
                'department' => null,
                'permissions' => [
                    'dashboard.view', 'orders.view', 'customers.view', 'customers.message',
                    'support.view', 'support.manage',
                ],
            ],
            [
                'key' => 'store_staff',
                'name' => 'Store staff',
                'description' => 'Shop-floor access: sell, fulfil and keep stock accurate.',
                'department' => null,
                'permissions' => [
                    'dashboard.view', 'catalog.view', 'inventory.view', 'inventory.manage',
                    'orders.view', 'orders.manage', 'fulfillment.manage', 'customers.view',
                ],
            ],
            [
                'key' => 'viewer',
                'name' => 'Viewer',
                'description' => 'Read-only access for auditors, accountants and advisors.',
                'department' => null,
                'permissions' => self::viewPermissions(),
            ],
        ];
    }

    /** Create the built-in roles for a tenant that does not have them yet. */
    public static function seedDefaultsFor(int $tenantId): void
    {
        foreach (self::defaults() as $role) {
            static::withoutGlobalScopes()->firstOrCreate(
                ['tenant_id' => $tenantId, 'key' => $role['key']],
                [
                    'name' => $role['name'],
                    'description' => $role['description'],
                    'department' => $role['department'],
                    'permissions' => $role['permissions'],
                    'is_system' => true,
                ]
            );
        }
    }
}
