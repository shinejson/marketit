<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * A named, reusable set of permissions. UserRole records reference this model
 * by its stable `key`, so role titles and permissions can be safely edited.
 */
class RoleDefinition extends Model
{
    protected $table = 'roles';

    protected $fillable = [
        'key',
        'name',
        'description',
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

    /**
     * The permission catalog is deliberately kept server-side. It gives the
     * admin UI human labels and stops arbitrary permission strings being saved.
     * Add a permission here when a new protected capability is introduced.
     */
    public static function permissionGroups(): array
    {
        return [
            [
                'key' => 'platform',
                'label' => 'Platform administration',
                'permissions' => [
                    ['key' => 'platform.access', 'label' => 'Access the platform console', 'description' => 'Open the super admin workspace.'],
                    ['key' => 'tenants.view', 'label' => 'View tenants', 'description' => 'View seller applications and tenant records.'],
                    ['key' => 'tenants.manage', 'label' => 'Manage tenants', 'description' => 'Approve, suspend, and edit tenant records.'],
                    ['key' => 'billing.view', 'label' => 'View billing', 'description' => 'View plans, subscriptions, and invoices.'],
                    ['key' => 'billing.manage', 'label' => 'Manage billing', 'description' => 'Create and update plans, subscriptions, and invoices.'],
                    ['key' => 'analytics.view', 'label' => 'View analytics', 'description' => 'View platform reporting and insights.'],
                    ['key' => 'settings.manage', 'label' => 'Manage platform settings', 'description' => 'Change platform-wide settings.'],
                ],
            ],
            [
                'key' => 'access',
                'label' => 'People and access',
                'permissions' => [
                    ['key' => 'users.view', 'label' => 'View users', 'description' => 'Search and review user accounts.'],
                    ['key' => 'users.manage', 'label' => 'Manage users', 'description' => 'Create, edit, suspend, and delete users.'],
                    ['key' => 'roles.manage', 'label' => 'Manage roles and permissions', 'description' => 'Create, edit, and delete roles.'],
                    ['key' => 'staff.manage', 'label' => 'Manage tenant staff', 'description' => 'Invite and manage staff within a tenant.'],
                ],
            ],
            [
                'key' => 'commerce',
                'label' => 'Commerce operations',
                'permissions' => [
                    ['key' => 'stores.manage', 'label' => 'Manage stores', 'description' => 'Create and edit storefronts.'],
                    ['key' => 'catalog.manage', 'label' => 'Manage catalog', 'description' => 'Create and edit products and categories.'],
                    ['key' => 'inventory.manage', 'label' => 'Manage inventory', 'description' => 'Adjust product stock and variants.'],
                    ['key' => 'orders.manage', 'label' => 'Manage orders', 'description' => 'View and fulfill orders.'],
                    ['key' => 'marketing.manage', 'label' => 'Manage marketing', 'description' => 'Manage campaigns, domains, webhooks, and API keys.'],
                ],
            ],
            [
                'key' => 'customer',
                'label' => 'Customer experience',
                'permissions' => [
                    ['key' => 'marketplace.shop', 'label' => 'Shop the marketplace', 'description' => 'Browse products and place orders.'],
                    ['key' => 'account.manage', 'label' => 'Manage own account', 'description' => 'Manage profile, addresses, and personal orders.'],
                ],
            ],
        ];
    }

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

    /** Default roles are inserted by the migration for existing installations. */
    public static function defaults(): array
    {
        $all = self::permissionKeys();

        return [
            [
                'key' => 'super_admin',
                'name' => 'Super admin',
                'description' => 'Full access to the platform administration console.',
                'permissions' => $all,
                'is_system' => true,
            ],
            [
                'key' => 'tenant_owner',
                'name' => 'Tenant owner',
                'description' => 'Full operational access to an assigned tenant.',
                'permissions' => [
                    'staff.manage', 'stores.manage', 'catalog.manage', 'inventory.manage',
                    'orders.manage', 'marketing.manage', 'account.manage',
                ],
                'is_system' => true,
            ],
            [
                'key' => 'store_staff',
                'name' => 'Store staff',
                'description' => 'Operational access for a store team member.',
                'permissions' => [
                    'catalog.manage', 'inventory.manage', 'orders.manage', 'account.manage',
                ],
                'is_system' => true,
            ],
            [
                'key' => 'customer',
                'name' => 'Customer',
                'description' => 'Marketplace shopper with access to their own account.',
                'permissions' => ['marketplace.shop', 'account.manage'],
                'is_system' => true,
            ],
        ];
    }
}
