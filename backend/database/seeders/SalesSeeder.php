<?php

namespace Database\Seeders;

use App\Models\SalesCustomer;
use App\Models\SalesLead;
use App\Models\SalesOpportunity;
use App\Models\SalesQuote;
use App\Models\SalesQuoteItem;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

/** Realistic tenant CRM fixtures for the leads → pipeline → quotes sales workspace. */
class SalesSeeder extends Seeder
{
    public function run(): void
    {
        foreach (Tenant::query()->with('owner')->get() as $tenant) {
            $ownerId = $tenant->owner_user_id;
            $currency = 'USD';
            $suffix = strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $tenant->name), 0, 3));

            // ---- Customer accounts -------------------------------------------
            $customers = collect([
                ['name' => 'Adjoa Mansa', 'company' => 'Atlas Retail Group', 'email' => 'procurement@atlas-retail.test', 'phone' => '+233 20 555 0140', 'segment' => 'enterprise'],
                ['name' => 'Kojo Frimpong', 'company' => 'Harbour Lane Markets', 'email' => 'kofo@harbourlane.test', 'phone' => '+233 24 810 2217', 'segment' => 'wholesale'],
                ['name' => 'Esi Okyere', 'company' => 'Bloom & Co. Beauty', 'email' => 'hello@bloomco.test', 'phone' => '+233 55 118 9023', 'segment' => 'retail'],
                ['name' => 'Yaw Boateng', 'company' => 'Tema Corporate Services', 'email' => 'facilities@temacorp.test', 'phone' => '+233 30 277 4510', 'segment' => 'enterprise'],
                ['name' => 'Ama Serwaa', 'company' => 'Northside Grocers', 'email' => 'orders@northsidegro.test', 'phone' => '+233 20 744 3356', 'segment' => 'wholesale'],
                ['name' => 'Fiifi Tagoe', 'company' => 'Cape Coast Boutiques', 'email' => 'fiifi@ccboutiques.test', 'phone' => '+233 26 905 1284', 'segment' => 'retail'],
            ])->map(fn (array $row) => SalesCustomer::withoutGlobalScopes()->create([
                ...$row,
                'tenant_id' => $tenant->id,
                'created_by' => $ownerId,
                'status' => 'active',
                'currency' => $currency,
            ]));

            // ---- Leads ---------------------------------------------------------
            $leadBlueprints = [
                ['name' => 'Nana Kufuor', 'company' => 'Airport Plaza Shops', 'email' => 'nkufuor@airportplaza.test', 'source' => 'web', 'status' => 'new', 'value' => 3200.00, 'days' => 2],
                ['name' => 'Efua Appiah', 'company' => 'Coastal Events Ltd', 'email' => 'efua@coastalevents.test', 'source' => 'referral', 'status' => 'new', 'value' => 1450.00, 'days' => 4],
                ['name' => 'Kwame Darko', 'company' => 'Darko Hospitality', 'email' => null, 'phone' => '+233 27 660 4821', 'source' => 'walk_in', 'status' => 'contacted', 'value' => 6800.00, 'days' => 9],
                ['name' => 'Akosua Agyei', 'company' => 'Wellness Hub Ghana', 'email' => 'akosua@wellnesshub.test', 'source' => 'campaign', 'status' => 'contacted', 'value' => 2200.00, 'days' => 13],
                ['name' => 'Selorm Eyram', 'company' => 'Volta Craft Export', 'email' => 'selorm@voltacraft.test', 'source' => 'partner', 'status' => 'qualified', 'value' => 12400.00, 'days' => 18],
                ['name' => 'Mawuli Agbodo', 'company' => null, 'email' => 'mawuli.a@example.test', 'source' => 'web', 'status' => 'qualified', 'value' => 940.00, 'days' => 21],
                ['name' => 'Linda Osei', 'company' => 'Osu Concept Store', 'email' => 'linda@osuconcept.test', 'source' => 'campaign', 'status' => 'disqualified', 'value' => 500.00, 'days' => 30],
                ['name' => 'Rex Nyarko', 'company' => 'Nyarko Furnishings', 'email' => 'rex@nyarkofurn.test', 'source' => 'referral', 'status' => 'new', 'value' => 4150.00, 'days' => 1],
            ];

            $leads = collect($leadBlueprints)->map(function (array $row, int $i) use ($tenant, $ownerId, $currency) {
                $created = now()->subDays($row['days']);

                return SalesLead::withoutGlobalScopes()->create([
                    'tenant_id' => $tenant->id,
                    'owner_id' => $ownerId,
                    'created_by' => $ownerId,
                    'name' => $row['name'],
                    'company' => $row['company'],
                    'email' => $row['email'] ?? null,
                    'phone' => $row['phone'] ?? null,
                    'source' => $row['source'],
                    'status' => $row['status'],
                    'estimated_value' => $row['value'],
                    'currency' => $currency,
                    'notes' => $row['status'] === 'disqualified' ? 'Budget frozen until next quarter.' : null,
                    'last_contacted_at' => in_array($row['status'], ['contacted', 'qualified'], true) ? $created->copy()->addDays(2) : null,
                    'created_at' => $created,
                    'updated_at' => $created,
                ]);
            });

            // Converted lead powering the won deal below.
            $convertedLead = SalesLead::withoutGlobalScopes()->create([
                'tenant_id' => $tenant->id,
                'owner_id' => $ownerId,
                'created_by' => $ownerId,
                'name' => 'Adjoa Mansa',
                'company' => 'Atlas Retail Group',
                'email' => 'procurement@atlas-retail.test',
                'source' => 'referral',
                'status' => 'converted',
                'estimated_value' => 18600.00,
                'currency' => $currency,
                'converted_customer_id' => $customers[0]->id,
                'last_contacted_at' => now()->subDays(130),
                'converted_at' => now()->subDays(125),
                'created_at' => now()->subDays(135),
                'updated_at' => now()->subDays(125),
            ]);

            // ---- Opportunities across the pipeline (history feeds the trend) ---
            $opportunityBlueprints = [
                ['customer' => 0, 'lead' => $convertedLead->id, 'title' => 'Atlas annual retail supply', 'stage' => 'won', 'value' => 18600.00, 'created' => 125, 'closed' => 118, 'closeIn' => -99],
                ['customer' => 1, 'lead' => null, 'title' => 'Harbour Lane wholesale restock', 'stage' => 'won', 'value' => 7420.00, 'created' => 84, 'closed' => 66, 'closeIn' => -70],
                ['customer' => 2, 'lead' => null, 'title' => 'Bloom & Co. product launch kit', 'stage' => 'won', 'value' => 3275.00, 'created' => 41, 'closed' => 24, 'closeIn' => -31],
                ['customer' => 3, 'lead' => null, 'title' => 'Tema Corp office provisioning', 'stage' => 'negotiation', 'value' => 9800.00, 'created' => 26, 'closed' => null, 'closeIn' => 12],
                ['customer' => 5, 'lead' => $leads[4]->id, 'title' => 'Volta Craft export partnership', 'stage' => 'proposal', 'value' => 12400.00, 'created' => 18, 'closed' => null, 'closeIn' => 22],
                ['customer' => 4, 'lead' => null, 'title' => 'Northside Grocers quarterly contract', 'stage' => 'qualified', 'value' => 5600.00, 'created' => 12, 'closed' => null, 'closeIn' => 30],
                ['customer' => 5, 'lead' => $leads[7]->id, 'title' => 'Nyarko Furnishings showroom order', 'stage' => 'prospecting', 'value' => 4150.00, 'created' => 1, 'closed' => null, 'closeIn' => 45],
                ['customer' => 3, 'lead' => null, 'title' => 'Tema Corp event catering supply', 'stage' => 'lost', 'value' => 2900.00, 'created' => 60, 'closed' => 38, 'closeIn' => -35, 'lost' => 'Chose incumbent supplier'],
            ];

            $opportunities = collect($opportunityBlueprints)->map(function (array $row, int $i) use ($tenant, $ownerId, $currency, $customers, $suffix) {
                $closedAt = $row['closed'] !== null ? now()->subDays($row['closed']) : null;

                return SalesOpportunity::withoutGlobalScopes()->create([
                    'tenant_id' => $tenant->id,
                    'customer_id' => $customers[$row['customer']]->id,
                    'lead_id' => $row['lead'],
                    'owner_id' => $ownerId,
                    'created_by' => $ownerId,
                    'number' => sprintf('OPP-%s-%s-%04d', now()->format('Y'), $suffix, $i + 1),
                    'title' => $row['title'],
                    'stage' => $row['stage'],
                    'expected_value' => $row['value'],
                    'probability' => SalesOpportunity::STAGE_PROBABILITY[$row['stage']],
                    'currency' => $currency,
                    'expected_close_date' => now()->addDays($row['closeIn'])->toDateString(),
                    'lost_reason' => $row['lost'] ?? null,
                    'closed_at' => $closedAt,
                    'created_at' => now()->subDays($row['created']),
                    'updated_at' => $closedAt ?? now()->subDays(max(0, $row['created'] - 2)),
                ]);
            });

            // ---- Quotes ---------------------------------------------------------
            $quoteBlueprints = [
                ['customer' => 0, 'opportunity' => 0, 'status' => 'accepted', 'total' => 18600.00, 'days' => 122, 'expiry' => 28, 'label' => 'Annual supply agreement'],
                ['customer' => 1, 'opportunity' => 1, 'status' => 'accepted', 'total' => 7420.00, 'days' => 70, 'expiry' => 14, 'label' => 'Wholesale replenishment batch'],
                ['customer' => 3, 'opportunity' => 3, 'status' => 'sent', 'total' => 9800.00, 'days' => 6, 'expiry' => 24, 'label' => 'Office provisioning package'],
                ['customer' => 5, 'opportunity' => 4, 'status' => 'sent', 'total' => 2540.00, 'days' => 3, 'expiry' => 27, 'label' => 'Export samples & first crate'],
                ['customer' => 4, 'opportunity' => null, 'status' => 'draft', 'total' => 1180.00, 'days' => 1, 'expiry' => 30, 'label' => 'Seasonal produce display'],
                ['customer' => 2, 'opportunity' => null, 'status' => 'declined', 'total' => 890.00, 'days' => 20, 'expiry' => 10, 'label' => 'Launch add-on services'],
                ['customer' => 1, 'opportunity' => null, 'status' => 'expired', 'total' => 1640.00, 'days' => 44, 'expiry' => 13, 'label' => 'Cold-chain storage pilot'],
            ];

            foreach ($quoteBlueprints as $i => $row) {
                $subtotal = round($row['total'] / 1.05, 2);
                $tax = round($row['total'] - $subtotal, 2);
                $issueDate = now()->subDays($row['days']);
                $status = $row['status'];
                $customer = $customers[$row['customer']];
                $quote = SalesQuote::withoutGlobalScopes()->create([
                    'tenant_id' => $tenant->id,
                    'customer_id' => $customer->id,
                    'opportunity_id' => $row['opportunity'] !== null ? $opportunities[$row['opportunity']]->id : null,
                    'created_by' => $ownerId,
                    'number' => sprintf('QTE-%s-%s-%04d', now()->format('Y'), $suffix, $i + 1),
                    'customer_name' => $customer->name,
                    'customer_email' => $customer->email,
                    'issue_date' => $issueDate->toDateString(),
                    'expiry_date' => $issueDate->copy()->addDays($row['expiry'])->toDateString(),
                    'status' => $status,
                    'subtotal' => $subtotal,
                    'tax_total' => $tax,
                    'discount_total' => 0,
                    'total' => $row['total'],
                    'currency' => $currency,
                    'notes' => null,
                    'sent_at' => $status !== 'draft' ? $issueDate->copy()->addDay() : null,
                    'accepted_at' => $status === 'accepted' ? $issueDate->copy()->addDays(4) : null,
                    'created_at' => $issueDate,
                    'updated_at' => $issueDate->copy()->addDays(4),
                ]);
                SalesQuoteItem::withoutGlobalScopes()->create([
                    'quote_id' => $quote->id,
                    'description' => $row['label'],
                    'quantity' => 1,
                    'unit_price' => $subtotal,
                    'tax_rate' => 5,
                    'line_subtotal' => $subtotal,
                    'line_tax' => $tax,
                    'line_total' => $row['total'],
                ]);
            }
        }
    }
}
