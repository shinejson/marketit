<?php

namespace Database\Seeders;

use App\Models\HelpArticle;
use App\Models\HelpCategory;
use App\Models\SupportCannedReply;
use App\Models\SupportChat;
use App\Models\SupportChatMessage;
use App\Models\SupportMessage;
use App\Models\SupportTask;
use App\Models\SupportTicket;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Demo content for the service desk so the console has a realistic queue,
 * live chats, a task board and a published help centre out of the box.
 */
class SupportSeeder extends Seeder
{
    public function run(): void
    {
        TenantContext::bypass(true);

        try {
            $admin = User::query()->where('email', 'admin@markethub.test')->first();
            $tenants = Tenant::query()->get()->values();
            $sellers = User::query()->whereIn('email', ['seller1@markethub.test', 'seller2@markethub.test'])->get()->values();
            $customer = User::query()->where('email', 'customer@markethub.test')->first();
            $ops = User::query()->where('email', 'ops@markethub.test')->first();

            $this->seedCannedReplies($admin);
            $categories = $this->seedHelpCentre($admin);
            $tickets = $this->seedTickets($admin, $tenants, $sellers, $customer);
            $this->seedChats($admin, $tenants, $sellers, $customer);
            $this->seedTasks($admin, $ops, $tenants, $tickets);

            unset($categories);
        } finally {
            TenantContext::bypass(false);
        }
    }

    // ------------------------------------------------------------- tickets

    /** @return \Illuminate\Support\Collection<int, SupportTicket> */
    protected function seedTickets(?User $admin, $tenants, $sellers, ?User $customer)
    {
        $blueprint = [
            [
                'subject' => 'Payout for September settlement has not landed',
                'category' => 'payouts', 'channel' => 'email', 'priority' => 'urgent', 'status' => 'open',
                'age_hours' => 5, 'responded' => true, 'tenant' => 0, 'requester' => 0,
                'tags' => ['payout', 'finance'],
                'thread' => [
                    ['requester', 'Our September settlement of $4,218.40 was marked released on the 28th but nothing has arrived in the bank account. Order references are attached. Can you trace it?'],
                    ['agent', 'Thanks for flagging this — I can see the settlement batch was released on 28 Sep at 14:02 UTC. Our payments partner shows it in "processing". I have escalated to them with reference SET-99214 and asked for a trace.'],
                    ['internal', 'Partner confirmed a batch delay affecting 6 tenants. ETA 24h. Keep the ticket urgent until funds are confirmed.'],
                    ['requester', 'Appreciated. Please keep us posted — we have supplier invoices due Friday.'],
                ],
            ],
            [
                'subject' => 'Custom domain stuck on DNS pending',
                'category' => 'technical', 'channel' => 'portal', 'priority' => 'high', 'status' => 'pending',
                'age_hours' => 26, 'responded' => true, 'tenant' => 1, 'requester' => 1,
                'tags' => ['domains', 'dns'],
                'thread' => [
                    ['requester', 'We added kenteandco.market three days ago and it still shows DNS pending. The CNAME is set at our registrar.'],
                    ['agent', 'I checked the record and your CNAME points at the apex instead of the store host. Please point `shop` to `edge.markethub.app` and remove the conflicting A record — full walkthrough here: Connecting a custom domain.'],
                ],
            ],
            [
                'subject' => 'Bulk product import fails on row 142',
                'category' => 'catalog', 'channel' => 'portal', 'priority' => 'normal', 'status' => 'open',
                'age_hours' => 50, 'responded' => true, 'tenant' => 0, 'requester' => 0,
                'tags' => ['import', 'catalog'],
                'thread' => [
                    ['requester', 'The CSV import stops at row 142 with "variant option mismatch". The row looks identical to the ones above it.'],
                    ['agent', 'That error fires when a variant option column is present but empty. Row 142 has a trailing comma creating an empty "Size" value. Strip the empty column and re-upload — I have also raised a task to improve the error message.'],
                ],
            ],
            [
                'subject' => 'How do I add a finance-only staff account?',
                'category' => 'account', 'channel' => 'chat', 'priority' => 'low', 'status' => 'resolved',
                'age_hours' => 96, 'responded' => true, 'resolved' => true, 'satisfaction' => 5, 'tenant' => 0, 'requester' => 0,
                'tags' => ['staff', 'permissions'],
                'thread' => [
                    ['requester', 'I want our accountant to only see settlements and invoices, nothing else.'],
                    ['agent', 'Open Tenant console → Users → Invite, pick the Finance department and the Store staff role. They will only see the finance dashboard and settlements. Guide: Inviting staff and setting permissions.'],
                    ['requester', 'Worked perfectly, thank you!'],
                ],
            ],
            [
                'subject' => 'Customer charged twice for order #10492',
                'category' => 'billing', 'channel' => 'phone', 'priority' => 'urgent', 'status' => 'new',
                'age_hours' => 1, 'responded' => false, 'tenant' => 1, 'requester' => 1,
                'tags' => ['refund', 'payments'],
                'thread' => [
                    ['requester', 'A buyer says their card was charged twice for order #10492. They have two pending authorisations of $142.00 each.'],
                ],
            ],
            [
                'subject' => 'Delivery marked shipped but tracking never updated',
                'category' => 'orders', 'channel' => 'portal', 'priority' => 'normal', 'status' => 'pending',
                'age_hours' => 18, 'responded' => true, 'tenant' => 0, 'requester' => 'customer',
                'tags' => ['delivery'],
                'thread' => [
                    ['requester', 'My order was marked shipped five days ago but the tracking number has no scans.'],
                    ['agent', 'I have contacted the seller and the courier. If there is no scan by tomorrow we will reship at no cost or refund you in full — your choice.'],
                ],
            ],
            [
                'subject' => 'Request: webhook for settlement released',
                'category' => 'technical', 'channel' => 'email', 'priority' => 'low', 'status' => 'on_hold',
                'age_hours' => 170, 'responded' => true, 'tenant' => 0, 'requester' => 0,
                'tags' => ['api', 'feature-request'],
                'thread' => [
                    ['requester', 'We reconcile payouts automatically. Could you emit a webhook when a settlement moves to released?'],
                    ['agent', 'Good idea — logged on the platform roadmap. Holding this ticket open so you get notified when it ships.'],
                    ['internal', 'Roadmap item PLT-212. Review at next platform planning.'],
                ],
            ],
            [
                'subject' => 'Onboarding: documents rejected, what is missing?',
                'category' => 'onboarding', 'channel' => 'portal', 'priority' => 'high', 'status' => 'open',
                'age_hours' => 8, 'responded' => false, 'tenant' => 1, 'requester' => 1,
                'tags' => ['kyc', 'onboarding'],
                'thread' => [
                    ['requester', 'Our business registration upload was rejected but the reason just says "unclear". What exactly do you need?'],
                ],
            ],
            [
                'subject' => 'Low stock alerts are not being emailed',
                'category' => 'technical', 'channel' => 'portal', 'priority' => 'normal', 'status' => 'resolved',
                'age_hours' => 140, 'responded' => true, 'resolved' => true, 'satisfaction' => 4, 'tenant' => 0, 'requester' => 0,
                'tags' => ['notifications'],
                'thread' => [
                    ['requester', 'We set the low stock threshold to 5 but never receive the alert email.'],
                    ['agent', 'Your tenant notification settings had low-stock alerts disabled. I have enabled them and sent a test — let me know if it arrives.'],
                    ['requester', 'Got it, thanks.'],
                ],
            ],
            [
                'subject' => 'Commission rate seems wrong on handmade category',
                'category' => 'billing', 'channel' => 'whatsapp', 'priority' => 'high', 'status' => 'open',
                'age_hours' => 34, 'responded' => true, 'tenant' => 1, 'requester' => 1,
                'tags' => ['commission'],
                'thread' => [
                    ['requester', 'We were told handmade goods are at 6% but settlements show 8%.'],
                    ['agent', 'Checking with the commercial team — the handmade rate applies from 1 Oct. I will confirm whether September orders qualify for a retroactive adjustment.'],
                    ['internal', 'Pricing confirmed 6% applies from 1 Oct only. Prepare a goodwill credit note offer.'],
                ],
            ],
            [
                'subject' => 'Need an invoice copy for August subscription',
                'category' => 'billing', 'channel' => 'email', 'priority' => 'low', 'status' => 'closed',
                'age_hours' => 300, 'responded' => true, 'resolved' => true, 'satisfaction' => 5, 'tenant' => 0, 'requester' => 0,
                'tags' => ['invoice'],
                'thread' => [
                    ['requester', 'Could you resend the August subscription invoice as a PDF?'],
                    ['agent', 'Sent to your billing email. You can also download past invoices under Tenant console → Settings → Billing.'],
                ],
            ],
            [
                'subject' => 'Ad campaign spending faster than daily budget',
                'category' => 'other', 'channel' => 'portal', 'priority' => 'normal', 'status' => 'new',
                'age_hours' => 3, 'responded' => false, 'tenant' => 0, 'requester' => 0,
                'tags' => ['ads'],
                'thread' => [
                    ['requester', 'Our daily budget is $20 but yesterday we were charged $31.40.'],
                ],
            ],
        ];

        $created = collect();

        foreach ($blueprint as $i => $row) {
            $tenant = $tenants->get($row['tenant'] ?? 0);
            $requesterUser = $row['requester'] === 'customer' ? $customer : $sellers->get($row['requester'] ?? 0);
            $createdAt = now()->subHours($row['age_hours']);
            $priority = $row['priority'];
            $slaDue = $createdAt->copy()->addMinutes(SupportTicket::SLA_MINUTES[$priority] ?? 480);
            $responded = (bool) ($row['responded'] ?? false);
            $firstResponse = $responded ? $createdAt->copy()->addMinutes(random_int(12, 180)) : null;

            $ticket = SupportTicket::query()->create([
                'reference' => 'TKT-'.str_pad((string) (10401 + $i), 5, '0', STR_PAD_LEFT),
                'tenant_id' => $tenant?->id,
                'requester_id' => $requesterUser?->id,
                'requester_name' => $requesterUser?->name ?? 'Marketplace user',
                'requester_email' => $requesterUser?->email,
                'requester_type' => $row['requester'] === 'customer' ? 'customer' : 'tenant',
                'subject' => $row['subject'],
                'summary' => Str::limit($row['thread'][0][1] ?? '', 160),
                'category' => $row['category'],
                'channel' => $row['channel'],
                'status' => $row['status'],
                'priority' => $priority,
                'assignee_id' => $responded ? $admin?->id : null,
                'tags' => $row['tags'] ?? [],
                'first_response_at' => $firstResponse,
                'last_reply_at' => $createdAt->copy()->addMinutes(random_int(20, 400)),
                'resolved_at' => ! empty($row['resolved']) ? $createdAt->copy()->addHours(random_int(2, 40)) : null,
                'closed_at' => $row['status'] === 'closed' ? $createdAt->copy()->addHours(random_int(4, 48)) : null,
                'sla_due_at' => $slaDue,
                'sla_breached' => ! $responded && $slaDue->isPast(),
                'satisfaction' => $row['satisfaction'] ?? null,
                'messages_count' => count($row['thread']),
            ]);

            $ticket->forceFill(['created_at' => $createdAt, 'updated_at' => $createdAt])->save();

            $offset = 0;
            foreach ($row['thread'] as $entry) {
                $role = $entry[0];
                $body = $entry[1];
                $offset += random_int(18, 260);
                $isInternal = $role === 'internal';

                $message = SupportMessage::query()->create([
                    'ticket_id' => $ticket->id,
                    'author_id' => $role === 'requester' ? $requesterUser?->id : $admin?->id,
                    'author_name' => $role === 'requester' ? ($requesterUser?->name ?? 'Marketplace user') : ($admin?->name ?? 'Support'),
                    'author_role' => $role === 'requester' ? SupportMessage::ROLE_REQUESTER : SupportMessage::ROLE_AGENT,
                    'visibility' => $isInternal ? SupportMessage::VISIBILITY_INTERNAL : SupportMessage::VISIBILITY_PUBLIC,
                    'body' => $body,
                ]);

                $at = $createdAt->copy()->addMinutes($offset);
                $message->forceFill(['created_at' => $at, 'updated_at' => $at])->save();
            }

            $created->push($ticket);
        }

        return $created;
    }

    // --------------------------------------------------------------- chats

    protected function seedChats(?User $admin, $tenants, $sellers, ?User $customer): void
    {
        $blueprint = [
            [
                'status' => 'active', 'topic' => 'Checkout error on mobile', 'minutes_ago' => 4, 'answered' => true, 'tenant' => 0, 'visitor' => 0, 'priority' => 'high',
                'thread' => [
                    ['visitor', 'Hi! Buyers on Android are seeing "payment could not be initialised" at checkout.'],
                    ['agent', 'Thanks for the heads-up — are they all on the same payment method?'],
                    ['visitor', 'Mobile money mostly. Card seems fine.'],
                    ['agent', 'Got it. I can see elevated errors from the mobile-money gateway in the last 20 minutes. Our payments team is on it; I will keep this chat open and update you here.'],
                ],
            ],
            [
                'status' => 'queued', 'topic' => 'Store not visible in search', 'minutes_ago' => 2, 'answered' => false, 'tenant' => 1, 'visitor' => 1, 'priority' => 'normal',
                'thread' => [
                    ['visitor', 'Our store went live yesterday but it does not appear in marketplace search.'],
                    ['bot', 'Thanks! You are 1st in the queue — an agent will be with you shortly. Meanwhile: "Why is my store not showing in search?" may help.'],
                ],
            ],
            [
                'status' => 'queued', 'topic' => 'Refund policy question', 'minutes_ago' => 7, 'answered' => false, 'tenant' => null, 'visitor' => 'customer', 'priority' => 'low',
                'thread' => [
                    ['visitor', 'How long does a refund take once the seller approves it?'],
                ],
            ],
            [
                'status' => 'active', 'topic' => 'Bulk price update', 'minutes_ago' => 11, 'answered' => true, 'tenant' => 0, 'visitor' => 0, 'priority' => 'normal',
                'thread' => [
                    ['visitor', 'Is there a way to raise all prices in a category by 5%?'],
                    ['agent', 'Yes — Products → filter by category → select all → Bulk edit → Adjust price by percentage. Want me to walk through it?'],
                    ['visitor', 'Found it, thanks!'],
                ],
            ],
            [
                'status' => 'ended', 'topic' => 'Invoice download', 'minutes_ago' => 95, 'answered' => true, 'tenant' => 1, 'visitor' => 1, 'priority' => 'low', 'rating' => 5,
                'thread' => [
                    ['visitor', 'Where do I download my subscription invoices?'],
                    ['agent', 'Tenant console → Settings → Billing → Invoices. Each row has a PDF download.'],
                    ['visitor', 'Perfect, thank you.'],
                    ['system', 'Chat ended by visitor.'],
                ],
            ],
        ];

        foreach ($blueprint as $row) {
            $tenant = $row['tenant'] === null ? null : $tenants->get($row['tenant']);
            $visitor = $row['visitor'] === 'customer' ? $customer : $sellers->get($row['visitor']);
            $startedAt = now()->subMinutes($row['minutes_ago'] + count($row['thread']) * 2);

            $chat = SupportChat::query()->create([
                'tenant_id' => $tenant?->id,
                'visitor_id' => $visitor?->id,
                'visitor_name' => $visitor?->name ?? 'Marketplace visitor',
                'visitor_email' => $visitor?->email,
                'visitor_type' => $row['visitor'] === 'customer' ? 'customer' : 'tenant',
                'topic' => $row['topic'],
                'status' => $row['status'],
                'priority' => $row['priority'],
                'agent_id' => $row['answered'] ? $admin?->id : null,
                'started_at' => $startedAt,
                'answered_at' => $row['answered'] ? $startedAt->copy()->addSeconds(random_int(20, 180)) : null,
                'ended_at' => $row['status'] === 'ended' ? now()->subMinutes($row['minutes_ago']) : null,
                'last_message_at' => now()->subMinutes($row['minutes_ago']),
                'unread_count' => $row['status'] === 'queued' ? 1 : 0,
                'rating' => $row['rating'] ?? null,
            ]);

            $offset = 0;
            foreach ($row['thread'] as $entry) {
                [$role, $body] = $entry;
                $offset += random_int(20, 120);
                $at = $startedAt->copy()->addSeconds($offset);

                $message = SupportChatMessage::query()->create([
                    'chat_id' => $chat->id,
                    'author_id' => $role === 'visitor' ? $visitor?->id : ($role === 'agent' ? $admin?->id : null),
                    'author_name' => match ($role) {
                        'visitor' => $visitor?->name ?? 'Visitor',
                        'agent' => $admin?->name ?? 'Support',
                        'bot' => 'MarketHub Assistant',
                        default => 'System',
                    },
                    'author_role' => $role,
                    'body' => $body,
                    'read_at' => $role === 'visitor' && $chat->status === 'queued' ? null : $at,
                ]);

                $message->forceFill(['created_at' => $at, 'updated_at' => $at])->save();
            }
        }
    }

    // --------------------------------------------------------------- tasks

    protected function seedTasks(?User $admin, ?User $ops, $tenants, $tickets): void
    {
        $byRef = $tickets->keyBy('reference');

        $blueprint = [
            ['Trace delayed settlement batch SET-99214 with payments partner', 'in_progress', 'urgent', 'support', 0, 'TKT-10401', +1, ['Open partner ticket', 'Confirm batch IDs', 'Notify affected tenants']],
            ['Publish guide: fixing CNAME records for custom domains', 'review', 'high', 'support', 1, 'TKT-10402', +2, ['Draft article', 'Add screenshots', 'Technical review']],
            ['Improve CSV import error message for empty variant columns', 'todo', 'normal', 'support', 0, 'TKT-10403', +6, ['Reproduce', 'Write copy', 'Ship with next release']],
            ['Prepare goodwill credit note for handmade commission gap', 'todo', 'high', 'support', 1, 'TKT-10410', +3, ['Confirm amount', 'Finance approval']],
            ['Weekly SLA review — breached tickets retro', 'todo', 'normal', 'support', null, null, +4, ['Pull breach list', 'Find root causes', 'Share summary']],
            ['Audit help centre for out-of-date screenshots', 'in_progress', 'low', 'support', null, null, +9, ['List articles > 6 months', 'Reshoot UI']],
            ['Upload a clearer business registration certificate', 'todo', 'high', 'tenant', 1, 'TKT-10408', +2, ['Scan at 300dpi', 'Full page visible', 'Upload in Settings → Documents']],
            ['Complete payout bank verification', 'todo', 'urgent', 'tenant', 1, null, +1, ['Add account number', 'Upload bank letter']],
            ['Add delivery zones for Kumasi and Takoradi', 'blocked', 'normal', 'tenant', 0, null, +5, ['Define zones', 'Set fees']],
            ['Finish store branding (logo + banner)', 'done', 'normal', 'tenant', 0, null, -2, ['Upload logo', 'Upload banner']],
            ['Verify webhook endpoint for order events', 'done', 'low', 'support', 0, null, -4, ['Send test event', 'Confirm 2xx']],
        ];

        foreach ($blueprint as $i => [$title, $status, $priority, $ownerType, $tenantIndex, $ticketRef, $dueDays, $checklist]) {
            $tenant = $tenantIndex === null ? null : $tenants->get($tenantIndex);
            $done = $status === SupportTask::STATUS_DONE;

            SupportTask::query()->create([
                'tenant_id' => $tenant?->id,
                'ticket_id' => $ticketRef ? $byRef->get($ticketRef)?->id : null,
                'title' => $title,
                'description' => null,
                'status' => $status,
                'priority' => $priority,
                'owner_type' => $ownerType,
                'assignee_id' => $ownerType === 'support' ? ($i % 2 === 0 ? $admin?->id : $ops?->id) : null,
                'created_by' => $admin?->id,
                'due_at' => now()->addDays($dueDays)->setTime(17, 0),
                'completed_at' => $done ? now()->subDays(abs($dueDays)) : null,
                'checklist' => collect($checklist)->map(fn ($label, $idx) => [
                    'label' => $label,
                    'done' => $done || ($status === SupportTask::STATUS_IN_PROGRESS && $idx === 0),
                ])->all(),
                'labels' => [$ownerType === 'tenant' ? 'tenant-action' : 'internal'],
                'position' => $i,
            ]);
        }
    }

    // --------------------------------------------------------- help centre

    protected function seedHelpCentre(?User $admin)
    {
        $categories = collect([
            ['Getting started', 'Open your store and make the first sale', 'rocket'],
            ['Payouts & billing', 'Settlements, commissions, invoices and taxes', 'wallet'],
            ['Orders & delivery', 'Fulfilment, shipping zones and returns', 'truck'],
            ['Catalog & inventory', 'Products, variants, imports and stock', 'box'],
            ['Account & security', 'Staff, roles, 2FA and API access', 'shield'],
        ])->map(fn ($row, $i) => HelpCategory::query()->create([
            'name' => $row[0],
            'slug' => Str::slug($row[0]),
            'description' => $row[1],
            'icon' => $row[2],
            'position' => $i,
        ]));

        $articles = [
            ['Launch checklist: from application to first sale', 0, 'published', true, 2840, 96, 7,
                "Everything a new tenant needs, in order.\n\n## 1. Finish your application\nUpload your business registration, owner ID and a payout method. Applications with all three documents are approved in under 24 hours.\n\n## 2. Create your store\nTenant console → Stores → New store. Set your currency, delivery fee and delivery window.\n\n## 3. Add your first products\nUse Products → New product, or import a CSV. Every product needs at least one variant with tracked stock.\n\n## 4. Set delivery zones\nDefine the areas you ship to and the fee for each. Orders outside your zones will not be offered to buyers.\n\n## 5. Publish\nFlip the store to Active. Your products appear in marketplace search within a few minutes."],
            ['How settlements and payouts work', 1, 'published', true, 2110, 92, 6,
                "Your money moves in three steps.\n\n**Order paid** — funds are held by the platform.\n**Order delivered** — a settlement is created: gross − commission + delivery fee = net.\n**Settlement released** — the net amount is queued for payout to your bank or mobile money account.\n\nPayout runs happen every Tuesday and Friday. A release after the cut-off (14:00 UTC) moves to the next run.\n\n### Why is my payout smaller than my sales?\nCommission, refunds and chargebacks are deducted before payout. Open Finance → Settlements for a line-by-line breakdown."],
            ['Connecting a custom domain', 4, 'published', false, 1680, 88, 5,
                "You can serve your storefront from your own domain.\n\n1. Tenant console → Domains → Add domain.\n2. Copy the CNAME target we show you (for example `edge.markethub.app`).\n3. At your registrar, create a **CNAME** record for the subdomain you want (`shop`) pointing at that target.\n4. Remove any conflicting A or AAAA record for the same host.\n5. Back in the console press **Verify**.\n\nDNS can take up to 30 minutes to propagate. Once verified we issue a TLS certificate automatically — the domain flips to Active when the certificate is live.\n\n> Apex domains (`example.com` with no subdomain) need an ALIAS/ANAME record. Not all registrars support this."],
            ['Importing products with CSV', 3, 'published', false, 1420, 81, 8,
                "Download the template from Products → Import.\n\n### Required columns\n`name`, `price`, `sku`, `quantity`.\n\n### Variants\nAdd one column per option (`Size`, `Colour`). Leave the column out entirely if a product has no variants — an empty value is treated as a real option and will fail validation.\n\n### Common errors\n- **variant option mismatch** — an option column is present but empty on that row. Usually a trailing comma.\n- **duplicate sku** — SKUs must be unique across your whole catalog.\n- **invalid price** — use plain numbers, no currency symbols or thousands separators."],
            ['Inviting staff and setting permissions', 4, 'published', false, 1190, 94, 4,
                "Tenant console → Users → Invite.\n\nPick a **role** (Store staff) and a **department**:\n\n| Department | Sees |\n| --- | --- |\n| Finance | Settlements, invoices, finance dashboard |\n| Sales | Orders, customers, sales dashboard |\n| Operations | Inventory, fulfilment, delivery |\n| Marketing | Campaigns, ads, analytics |\n\nStaff never see tenant settings, API keys or payout details — only the owner does."],
            ['Handling refunds and returns', 2, 'published', false, 980, 79, 5,
                "A buyer can request a return within 7 days of delivery.\n\n1. The request appears under Orders → Returns.\n2. Approve or decline with a reason within 48 hours.\n3. On approval the buyer ships the item back; mark it received when it arrives.\n4. The refund is deducted from your next settlement.\n\nDeclined requests are escalated to platform support automatically if the buyer disputes them."],
            ['Why is my store not showing in search?', 0, 'published', false, 1530, 85, 3,
                "Run through this list:\n\n- **Tenant status is Active** — pending tenants stay private.\n- **Store status is Active** — drafts are never indexed.\n- **At least one active product with stock** — empty stores are hidden.\n- **Delivery zones configured** — stores with no shipping coverage are hidden from buyers.\n\nIf all four are true and you still do not appear after 30 minutes, raise a ticket with your store slug."],
            ['Setting up low stock alerts', 3, 'published', false, 640, 90, 3,
                "Inventory → select a variant → set **Low stock threshold**.\n\nEmails go to the addresses listed under Settings → Notifications. If you are not receiving them, confirm that **Low stock alerts** is enabled there — it is off by default for newly created tenants."],
            ['Using the Seller API and webhooks', 4, 'published', false, 760, 87, 9,
                "Create a key under Settings → API keys. Scopes are granular: `products.read`, `orders.read`, `orders.fulfill`, `inventory.write`, `settlements.read`.\n\n```\ncurl https://api.markethub.app/api/seller/v1/orders \\\n  -H \"Authorization: Bearer sk_live_...\"\n```\n\nWebhooks are signed with HMAC-SHA256 in the `X-MarketHub-Signature` header. Always verify the signature and respond 2xx within 5 seconds — we retry with exponential backoff for 24 hours."],
            ['Understanding commission rates', 1, 'review', false, 0, null, 4,
                "Commission is charged per order line and varies by category.\n\n| Category | Rate |\n| --- | --- |\n| Electronics | 8% |\n| Fashion | 10% |\n| Home & kitchen | 8% |\n| Handmade | 6% (from 1 Oct) |\n| Groceries | 5% |\n\nRates are applied at the time the order is placed, not when it is settled."],
            ['Preparing for the festive season', 2, 'draft', false, 0, null, 6,
                "Draft — outline only.\n\n- Stock planning: 3x normal cover on best sellers\n- Delivery cut-off dates\n- Extending returns window\n- Running a campaign with the Ads workspace"],
        ];

        foreach ($articles as [$title, $catIndex, $status, $pinned, $views, $helpful, $minutes, $body]) {
            $yes = $helpful === null ? 0 : (int) round($views * 0.42 * ($helpful / 100));
            $no = $helpful === null ? 0 : max(0, (int) round($yes * (100 - $helpful) / max(1, $helpful)));

            HelpArticle::query()->create([
                'category_id' => $categories[$catIndex]->id,
                'title' => $title,
                'slug' => Str::slug($title),
                'excerpt' => Str::limit(strip_tags(preg_replace('/[#*>|`\-]/', '', explode("\n", $body)[0])), 160),
                'body' => $body,
                'status' => $status,
                'audience' => 'tenant',
                'tags' => [$categories[$catIndex]->slug],
                'is_pinned' => $pinned,
                'read_minutes' => $minutes,
                'views' => $views,
                'helpful_yes' => $yes,
                'helpful_no' => $no,
                'author_id' => $admin?->id,
                'published_at' => $status === 'published' ? now()->subDays(random_int(3, 120)) : null,
            ]);
        }

        return $categories;
    }

    // ------------------------------------------------------ canned replies

    protected function seedCannedReplies(?User $admin): void
    {
        $replies = [
            ['Acknowledge & investigating', '/ack', 'general', "Thanks for reaching out — I have picked this up and I am investigating now. I will come back to you with an update within the next few hours."],
            ['Payout delay explanation', '/payout', 'payouts', "I can see the settlement was released on our side and is now with our payments partner. Bank transfers typically land within 1–2 business days of release. I have asked for a trace and will update you as soon as I hear back."],
            ['DNS / custom domain fix', '/dns', 'technical', "Your domain needs a CNAME record on the subdomain you want to use, pointing at our edge host, with any conflicting A record removed. Full walkthrough: Connecting a custom domain. Press Verify in the console once the record is live — DNS can take up to 30 minutes."],
            ['Request more information', '/info', 'general', "To dig into this I need a little more detail:\n\n- The order or product reference\n- A screenshot of what you are seeing\n- The approximate time it happened\n\nAs soon as I have those I can trace it in our logs."],
            ['Resolve & close', '/resolve', 'general', "Glad that worked! I am marking this as resolved — just reply here if anything changes and the ticket will reopen automatically."],
            ['KYC document rejected', '/kyc', 'onboarding', "Your document was rejected because the scan was partially cut off. Please upload a 300dpi scan or photo with all four corners of the page visible and the registration number legible. Settings → Documents → Replace."],
        ];

        foreach ($replies as [$title, $shortcut, $category, $body]) {
            SupportCannedReply::query()->create([
                'title' => $title,
                'shortcut' => $shortcut,
                'category' => $category,
                'body' => $body,
                'uses' => random_int(4, 90),
                'created_by' => $admin?->id,
            ]);
        }
    }
}
