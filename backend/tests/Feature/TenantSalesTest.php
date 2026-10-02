<?php

namespace Tests\Feature;

use App\Models\SalesCustomer;
use App\Models\SalesLead;
use App\Models\SalesOpportunity;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantSalesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        TenantContext::clear();
    }

    public function test_sales_workspace_is_restricted_to_owners_and_sales_staff(): void
    {
        $sales = User::query()->where('email', 'sales@markethub.test')->firstOrFail();
        $finance = User::query()->where('email', 'finance@markethub.test')->firstOrFail();

        $this->actingAs($sales, 'sanctum')->getJson('/api/tenant/sales/dashboard')->assertOk();
        $this->actingAs($finance, 'sanctum')->getJson('/api/tenant/sales/dashboard')->assertForbidden();
    }

    public function test_sales_dashboard_and_lists_are_populated(): void
    {
        $seller = User::query()->where('email', 'seller1@markethub.test')->firstOrFail();

        $this->actingAs($seller, 'sanctum')
            ->getJson('/api/tenant/sales/dashboard')
            ->assertOk()
            ->assertJsonStructure(['data' => [
                'currency',
                'kpis' => ['pipeline_value', 'weighted_forecast', 'active_leads', 'open_quotes', 'win_rate', 'active_customers'],
                'stages', 'trend', 'lead_sources', 'recent_activity', 'top_customers',
            ]]);

        $this->actingAs($seller, 'sanctum')
            ->getJson('/api/tenant/sales/leads')
            ->assertOk()
            ->assertJsonCount(9, 'data');

        $this->actingAs($seller, 'sanctum')
            ->getJson('/api/tenant/sales/opportunities')
            ->assertOk()
            ->assertJsonCount(8, 'data');

        $this->actingAs($seller, 'sanctum')
            ->getJson('/api/tenant/sales/quotes')
            ->assertOk()
            ->assertJsonCount(7, 'data');

        $this->actingAs($seller, 'sanctum')
            ->getJson('/api/tenant/sales/customers')
            ->assertOk()
            ->assertJsonCount(6, 'data');
    }

    public function test_tenant_can_capture_qualify_and_convert_a_lead(): void
    {
        $seller = User::query()->where('email', 'seller1@markethub.test')->firstOrFail();

        $lead = $this->actingAs($seller, 'sanctum')
            ->postJson('/api/tenant/sales/leads', [
                'name' => 'New Prospect',
                'company' => 'Prospect Trading Co',
                'email' => 'buyer@prospecttrading.test',
                'source' => 'web',
                'estimated_value' => 2500,
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'new')
            ->json('data');

        $this->actingAs($seller, 'sanctum')
            ->patchJson('/api/tenant/sales/leads/'.$lead['id'], ['status' => 'contacted'])
            ->assertOk()
            ->assertJsonPath('data.status', 'contacted');

        $this->actingAs($seller, 'sanctum')
            ->patchJson('/api/tenant/sales/leads/'.$lead['id'], ['status' => 'qualified'])
            ->assertOk()
            ->assertJsonPath('data.status', 'qualified');

        $converted = $this->actingAs($seller, 'sanctum')
            ->postJson('/api/tenant/sales/leads/'.$lead['id'].'/convert', [
                'customer_name' => 'New Prospect',
                'customer_company' => 'Prospect Trading Co',
                'opportunity_title' => 'Prospect Trading first contract',
                'expected_value' => 2500,
                'expected_close_date' => now()->addDays(30)->toDateString(),
            ])
            ->assertCreated()
            ->assertJsonPath('data.lead.status', 'converted')
            ->assertJsonPath('data.opportunity.stage', 'qualified')
            ->json('data');

        $this->assertDatabaseHas('sales_customers', ['id' => $converted['customer']['id'], 'company' => 'Prospect Trading Co']);
        $this->assertDatabaseHas('sales_opportunities', ['id' => $converted['opportunity']['id'], 'lead_id' => $lead['id']]);

        $this->actingAs($seller, 'sanctum')
            ->postJson('/api/tenant/sales/leads/'.$lead['id'].'/convert', [
                'customer_name' => 'New Prospect',
                'opportunity_title' => 'Duplicate',
            ])
            ->assertStatus(422);
    }

    public function test_opportunity_stage_transitions_are_enforced(): void
    {
        $seller = User::query()->where('email', 'seller1@markethub.test')->firstOrFail();
        $tenantId = $seller->load('roles')->tenantId();
        $opportunity = SalesOpportunity::withoutGlobalScopes()->where('tenant_id', $tenantId)->where('stage', 'prospecting')->firstOrFail();

        $this->actingAs($seller, 'sanctum')
            ->patchJson('/api/tenant/sales/opportunities/'.$opportunity->id, ['stage' => 'won'])
            ->assertStatus(422);

        $this->actingAs($seller, 'sanctum')
            ->patchJson('/api/tenant/sales/opportunities/'.$opportunity->id, ['stage' => 'qualified'])
            ->assertOk()
            ->assertJsonPath('data.stage', 'qualified');

        $this->actingAs($seller, 'sanctum')
            ->patchJson('/api/tenant/sales/opportunities/'.$opportunity->id, ['stage' => 'lost'])
            ->assertStatus(422);

        $this->actingAs($seller, 'sanctum')
            ->patchJson('/api/tenant/sales/opportunities/'.$opportunity->id, ['stage' => 'lost', 'lost_reason' => 'No budget this year'])
            ->assertOk()
            ->assertJsonPath('data.stage', 'lost')
            ->assertJsonPath('data.lost_reason', 'No budget this year');
    }

    public function test_accepting_a_quote_wins_the_linked_opportunity(): void
    {
        $seller = User::query()->where('email', 'seller1@markethub.test')->firstOrFail();
        $tenantId = $seller->load('roles')->tenantId();
        $customer = SalesCustomer::withoutGlobalScopes()->where('tenant_id', $tenantId)->firstOrFail();

        $opportunity = $this->actingAs($seller, 'sanctum')
            ->postJson('/api/tenant/sales/opportunities', [
                'customer_id' => $customer->id,
                'title' => 'Quote-driven deal',
                'stage' => 'proposal',
                'expected_value' => 1050,
            ])
            ->assertCreated()
            ->json('data');

        $quote = $this->actingAs($seller, 'sanctum')
            ->postJson('/api/tenant/sales/quotes', [
                'customer_id' => $customer->id,
                'opportunity_id' => $opportunity['id'],
                'customer_name' => $customer->name,
                'customer_email' => $customer->email,
                'issue_date' => now()->toDateString(),
                'expiry_date' => now()->addDays(14)->toDateString(),
                'send_now' => true,
                'items' => [[
                    'description' => 'Retail display bundle',
                    'quantity' => 10,
                    'unit_price' => 100,
                    'tax_rate' => 5,
                ]],
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'sent')
            ->assertJsonPath('data.total', '1050.00')
            ->json('data');

        $this->actingAs($seller, 'sanctum')
            ->patchJson('/api/tenant/sales/quotes/'.$quote['id'], ['status' => 'accepted'])
            ->assertOk()
            ->assertJsonPath('data.status', 'accepted');

        $this->assertDatabaseHas('sales_opportunities', ['id' => $opportunity['id'], 'stage' => 'won']);
        $this->actingAs($seller, 'sanctum')
            ->patchJson('/api/tenant/sales/quotes/'.$quote['id'], ['status' => 'void'])
            ->assertStatus(422);
    }
}
