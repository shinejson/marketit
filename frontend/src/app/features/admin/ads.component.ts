import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { MarketingCampaign, SocialAccount, SocialPlatform, SocialPost } from '../../core/models';

interface PlatformMeta {
  key: SocialPlatform;
  name: string;
  short: string;
  color: string;
  hint: string;
}

const PLATFORMS: PlatformMeta[] = [
  { key: 'facebook', name: 'Facebook', short: 'f', color: '#1877f2', hint: 'Pages & paid reach' },
  { key: 'instagram', name: 'Instagram', short: 'ig', color: '#d6356f', hint: 'Shoppable posts & reels' },
  { key: 'x', name: 'X (Twitter)', short: 'x', color: '#14171a', hint: 'Flash deals & support' },
  { key: 'linkedin', name: 'LinkedIn', short: 'in', color: '#0a66c2', hint: 'Seller acquisition' },
  { key: 'tiktok', name: 'TikTok', short: 'tt', color: '#2bc0bd', hint: 'Product discovery videos' },
  { key: 'youtube', name: 'YouTube', short: 'yt', color: '#e03c3c', hint: 'Tutorials & brand films' },
];

const OBJECTIVES: { value: string; label: string }[] = [
  { value: 'awareness', label: 'Brand awareness' },
  { value: 'traffic', label: 'Marketplace traffic' },
  { value: 'conversions', label: 'Conversions & sales' },
  { value: 'engagement', label: 'Community engagement' },
  { value: 'seller_acquisition', label: 'Seller acquisition' },
];

// ----------------------------------------------------------- sample content
// Shown when the marketing API is not reachable (or not yet migrated) so the
// workspace stays fully explorable. Mirrors backend/database/seeders/MarketingSeeder.

const DEMO_ACCOUNTS: SocialAccount[] = [
  { id: 1, platform: 'facebook', handle: 'markethubgh', display_name: 'MarketHub Ghana', status: 'connected', followers: 28400, connected_at: '2025-07-02T10:00:00Z' },
  { id: 2, platform: 'instagram', handle: 'markethub.gh', display_name: 'MarketHub', status: 'connected', followers: 41200, connected_at: '2025-06-18T10:00:00Z' },
  { id: 3, platform: 'x', handle: 'markethub_gh', display_name: 'MarketHub', status: 'connected', followers: 12800, connected_at: '2025-08-21T10:00:00Z' },
  { id: 4, platform: 'linkedin', handle: 'markethub-africa', display_name: 'MarketHub Africa', status: 'connected', followers: 5300, connected_at: '2025-09-02T10:00:00Z' },
  { id: 5, platform: 'tiktok', handle: 'markethubgh', display_name: 'MarketHub', status: 'disconnected', followers: 19600 },
  { id: 6, platform: 'youtube', handle: 'MarketHubAfrica', display_name: 'MarketHub Africa', status: 'disconnected', followers: 2100 },
];

const DEMO_CAMPAIGNS: MarketingCampaign[] = [
  { id: 1, name: 'Festive Season Mega Sale', objective: 'conversions', status: 'active', channels: ['facebook', 'instagram', 'x'], daily_budget: 120, total_budget: 3600, spend: 1485.5, impressions: 412800, clicks: 9640, conversions: 418, starts_at: '2025-09-19', ends_at: '2025-10-19', posts_count: 2 },
  { id: 2, name: 'New Seller Onboarding Drive', objective: 'seller_acquisition', status: 'active', channels: ['linkedin', 'facebook'], daily_budget: 60, total_budget: 1800, spend: 732.25, impressions: 98500, clicks: 2210, conversions: 64, starts_at: '2025-09-17', ends_at: '2025-10-17', posts_count: 1 },
  { id: 3, name: 'Handmade & Local Spotlight', objective: 'awareness', status: 'paused', channels: ['instagram', 'tiktok'], daily_budget: 40, total_budget: 1200, spend: 396, impressions: 154200, clicks: 3110, conversions: 92, starts_at: '2025-09-01', ends_at: '2025-10-31', posts_count: 0 },
  { id: 4, name: 'Back to School Tech Deals', objective: 'traffic', status: 'completed', channels: ['facebook', 'instagram', 'x', 'linkedin'], daily_budget: 90, total_budget: 2700, spend: 2700, impressions: 689400, clicks: 15320, conversions: 711, starts_at: '2025-07-18', ends_at: '2025-08-17', posts_count: 0 },
];

const DEMO_POSTS: SocialPost[] = [
  { id: 1, campaign_id: 1, campaign: { id: 1, name: 'Festive Season Mega Sale' }, body: 'The Festive Mega Sale is LIVE! 🎉 Up to 40% off electronics, fashion and home — from verified sellers across Ghana. Free delivery in Accra on orders over GH₵200.', link_url: 'https://markethub.test/products?sale=festive', channels: ['facebook', 'instagram', 'x'], status: 'published', published_at: '2025-09-29T08:30:00Z', impressions: 48200, clicks: 1890, engagements: 3260 },
  { id: 2, campaign_id: 2, campaign: { id: 2, name: 'New Seller Onboarding Drive' }, body: 'Turn your shop into an online store in under 10 minutes. Join 500+ sellers already growing with MarketHub — zero setup fees this month.', link_url: 'https://markethub.test/sell', channels: ['linkedin', 'facebook'], status: 'published', published_at: '2025-09-26T14:00:00Z', impressions: 21400, clicks: 760, engagements: 980 },
  { id: 3, campaign_id: null, body: 'Meet the maker: SheaGold’s body butter is whipped in small batches in Tamale and ships nationwide. ✨ #ShopLocal #MadeInGhana', link_url: 'https://markethub.test/stores/sheagold', channels: ['instagram'], status: 'scheduled', scheduled_for: '2025-10-03T09:00:00Z', impressions: 0, clicks: 0, engagements: 0 },
  { id: 4, campaign_id: 1, campaign: { id: 1, name: 'Festive Season Mega Sale' }, body: 'Flash deal alert ⚡ Pulse Wireless Headphones at GH₵89 for the next 48 hours only. While stock lasts!', link_url: 'https://markethub.test/products/pulse-wireless-headphones', channels: ['x', 'facebook'], status: 'scheduled', scheduled_for: '2025-10-02T12:30:00Z', impressions: 0, clicks: 0, engagements: 0 },
  { id: 5, campaign_id: null, body: 'Draft: Year-in-review — celebrating our sellers, 120k orders delivered, and the communities behind them. (Add stats + video before publishing.)', channels: ['youtube', 'linkedin'], status: 'draft', impressions: 0, clicks: 0, engagements: 0 },
];

const DEMO_SPONSORED = [
  { id: 101, name: 'Pulse launch', tenant_id: 1, status: 'active', spent_total: 182.4 },
  { id: 102, name: 'Kente home refresh', tenant_id: 2, status: 'active', spent_total: 96.1 },
  { id: 103, name: 'SheaGold glow-up', tenant_id: 2, status: 'paused', spent_total: 44.75 },
];

@Component({
  selector: 'app-admin-ads',
  imports: [FormsModule, CurrencyPipe, DatePipe, DecimalPipe],
  template: `
    <!-- ============================================================ head -->
    <div class="page-head">
      <div>
        <p class="eyebrow">Marketing</p>
        <h1>Ads & Social Studio</h1>
        <p class="muted intro">Connect social channels, publish posts and run platform-wide campaigns for the marketplace.</p>
      </div>
      <div class="toolbar">
        <button class="btn ghost" (click)="scrollTo('composer')">✍️ New post</button>
        <button class="btn accent" (click)="openCampaignModal()">+ New campaign</button>
      </div>
    </div>

    @if (demo()) {
      <div class="demo-note">
        <span>i</span> Showing sample workspace data — the marketing API isn’t reachable. Everything stays interactive; changes are kept locally.
      </div>
    }
    @if (toast(); as t) {
      <div class="toast" [class.bad]="t.bad">{{ t.text }}</div>
    }

    <!-- ============================================================ KPIs -->
    <div class="kpis">
      <div class="card kpi">
        <p class="label">Ad spend</p>
        <strong>{{ totalSpend() | currency }}</strong>
        <small class="muted">across {{ campaigns().length }} campaigns</small>
      </div>
      <div class="card kpi">
        <p class="label">Impressions</p>
        <strong>{{ compact(totalImpressions()) }}</strong>
        <small class="muted">paid + organic</small>
      </div>
      <div class="card kpi">
        <p class="label">Clicks</p>
        <strong>{{ compact(totalClicks()) }}</strong>
        <small class="muted">CTR {{ ctr() | number:'1.1-2' }}%</small>
      </div>
      <div class="card kpi">
        <p class="label">Active campaigns</p>
        <strong>{{ activeCampaigns() }}</strong>
        <small class="muted">{{ scheduledPosts() }} posts scheduled</small>
      </div>
      <div class="card kpi">
        <p class="label">Audience</p>
        <strong>{{ compact(totalFollowers()) }}</strong>
        <small class="muted">{{ connectedCount() }}/6 channels connected</small>
      </div>
    </div>

    <!-- ==================================================== social accounts -->
    <section>
      <div class="sec-head">
        <div>
          <h2>Connected channels</h2>
          <p class="muted">Link the marketplace’s social accounts to publish and advertise from one place.</p>
        </div>
      </div>
      <div class="channels">
        @for (p of platforms; track p.key) {
          @let acc = accountFor(p.key);
          <div class="card channel" [class.off]="acc.status !== 'connected'">
            <div class="ch-top">
              <span class="ch-badge" [style.background]="p.color">{{ p.short }}</span>
              <div class="ch-id">
                <strong>{{ p.name }}</strong>
                @if (acc.status === 'connected') {
                  <small class="muted">&#64;{{ acc.handle }} · {{ compact(acc.followers) }} followers</small>
                } @else {
                  <small class="muted">{{ p.hint }}</small>
                }
              </div>
              <span class="pill" [class.live]="acc.status === 'connected'">
                {{ acc.status === 'connected' ? 'Connected' : 'Not connected' }}
              </span>
            </div>
            @if (connectingPlatform() === p.key) {
              <form class="connect-form" (ngSubmit)="confirmConnect(p)">
                <input [(ngModel)]="connectHandle" name="handle" placeholder="&#64;handle or page name" required autofocus />
                <div class="connect-actions">
                  <button class="btn ok small" type="submit" [disabled]="!connectHandle.trim()">Authorize & connect</button>
                  <button class="btn ghost small" type="button" (click)="connectingPlatform.set(null)">Cancel</button>
                </div>
                <small class="muted">You’ll be redirected to {{ p.name }} to grant MarketHub publishing access.</small>
              </form>
            } @else {
              <div class="ch-actions">
                @if (acc.status === 'connected') {
                  <button class="btn ghost small" (click)="disconnect(acc)">Disconnect</button>
                } @else {
                  <button class="btn small" [style.background]="p.color" (click)="startConnect(p, acc)">Connect {{ p.name }}</button>
                }
              </div>
            }
          </div>
        }
      </div>
    </section>

    <!-- ======================================================== campaigns -->
    <section>
      <div class="sec-head">
        <div>
          <h2>Campaigns</h2>
          <p class="muted">Paid pushes across connected channels, with budget pacing and results.</p>
        </div>
        <button class="btn ghost small" (click)="openCampaignModal()">+ New campaign</button>
      </div>
      <div class="card table-card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Campaign</th><th>Channels</th><th>Status</th><th>Budget pacing</th>
                <th class="num">Impressions</th><th class="num">Clicks</th><th class="num">CTR</th><th class="num">Conv.</th><th></th>
              </tr>
            </thead>
            <tbody>
              @for (c of campaigns(); track c.id) {
                <tr>
                  <td>
                    <strong>{{ c.name }}</strong>
                    <p class="muted small-txt">{{ objectiveLabel(c.objective) }} · {{ c.starts_at | date:'MMM d' }} – {{ c.ends_at | date:'MMM d' }}</p>
                  </td>
                  <td>
                    <span class="mini-badges">
                      @for (ch of c.channels; track ch) {
                        <i class="mini" [style.background]="colorOf(ch)" [title]="nameOf(ch)">{{ shortOf(ch) }}</i>
                      }
                    </span>
                  </td>
                  <td><span class="pill st" [class]="'pill st ' + c.status">{{ c.status }}</span></td>
                  <td class="pace-cell">
                    <div class="pace-line">
                      <span>{{ +c.spend | currency }}</span>
                      <span class="muted">of {{ +(c.total_budget || 0) | currency }}</span>
                    </div>
                    <div class="pace"><i [style.width.%]="pacing(c)"></i></div>
                  </td>
                  <td class="num">{{ compact(c.impressions) }}</td>
                  <td class="num">{{ compact(c.clicks) }}</td>
                  <td class="num">{{ rowCtr(c) | number:'1.1-2' }}%</td>
                  <td class="num">{{ c.conversions }}</td>
                  <td class="row-actions">
                    @if (c.status === 'active') {
                      <button class="link-act" (click)="setCampaignStatus(c, 'paused')">Pause</button>
                    } @else if (c.status === 'paused' || c.status === 'draft') {
                      <button class="link-act" (click)="setCampaignStatus(c, 'active')">Activate</button>
                    }
                    <button class="link-act danger" (click)="deleteCampaign(c)">Delete</button>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="9" class="empty">No campaigns yet — launch your first one.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- ===================================================== posts section -->
    <section class="posts-grid" id="composer">
      <div class="card composer">
        <h2>Create post</h2>
        <p class="muted">Compose once, publish everywhere. Posts go out through the connected channels you pick.</p>
        <form (ngSubmit)="submitPost('published')">
          <div class="field">
            <label>Message</label>
            <textarea rows="5" [(ngModel)]="postForm.body" name="body" maxlength="2000"
              placeholder="What’s happening on the marketplace? Deals, seller spotlights, product drops…"></textarea>
            <small class="muted counter">{{ postForm.body.length }}/2000</small>
          </div>
          <div class="field">
            <label>Link (optional)</label>
            <input [(ngModel)]="postForm.link_url" name="link_url" placeholder="https://markethub.test/products/…" />
          </div>
          <div class="field">
            <label>Channels</label>
            <div class="chips">
              @for (p of platforms; track p.key) {
                @let connected = accountFor(p.key).status === 'connected';
                <button type="button" class="chip" [class.on]="postForm.channels.includes(p.key)"
                  [disabled]="!connected" [title]="connected ? p.name : p.name + ' is not connected'"
                  (click)="toggleChannel(p.key)">
                  <i class="mini" [style.background]="p.color">{{ p.short }}</i> {{ p.name }}
                </button>
              }
            </div>
          </div>
          <div class="two-col">
            <div class="field">
              <label>Attach to campaign (optional)</label>
              <select [(ngModel)]="postForm.campaign_id" name="campaign_id">
                <option [ngValue]="null">— none —</option>
                @for (c of campaigns(); track c.id) { <option [ngValue]="c.id">{{ c.name }}</option> }
              </select>
            </div>
            <div class="field">
              <label>Schedule for (optional)</label>
              <input type="datetime-local" [(ngModel)]="postForm.scheduled_for" name="scheduled_for" />
            </div>
          </div>
          <div class="composer-actions">
            <button class="btn ghost" type="button" (click)="submitPost('draft')" [disabled]="!canSubmitPost()">Save draft</button>
            @if (postForm.scheduled_for) {
              <button class="btn ok" type="button" (click)="submitPost('scheduled')" [disabled]="!canSubmitPost()">Schedule post</button>
            }
            <button class="btn accent" type="submit" [disabled]="!canSubmitPost()">Publish now</button>
          </div>
        </form>
      </div>

      <div class="post-feed">
        <div class="sec-head tight">
          <h2>Posts</h2>
          <div class="filters">
            @for (f of postFilters; track f) {
              <button class="filter" [class.on]="postFilter() === f" (click)="postFilter.set(f)">{{ f }}</button>
            }
          </div>
        </div>
        @for (post of filteredPosts(); track post.id) {
          <div class="card post">
            <div class="post-top">
              <span class="pill st" [class]="'pill st ' + post.status">{{ post.status }}</span>
              <span class="mini-badges">
                @for (ch of post.channels; track ch) {
                  <i class="mini" [style.background]="colorOf(ch)" [title]="nameOf(ch)">{{ shortOf(ch) }}</i>
                }
              </span>
              <span class="muted when">
                @if (post.status === 'published') { {{ post.published_at | date:'MMM d, HH:mm' }} }
                @else if (post.status === 'scheduled') { ⏰ {{ post.scheduled_for | date:'MMM d, HH:mm' }} }
                @else { Draft }
              </span>
            </div>
            <p class="post-body">{{ post.body }}</p>
            @if (post.link_url) { <a class="post-link" [href]="post.link_url" target="_blank" rel="noopener">{{ post.link_url }}</a> }
            @if (post.campaign) { <p class="muted small-txt">Campaign · {{ post.campaign.name }}</p> }
            <div class="post-foot">
              @if (post.status === 'published') {
                <span class="muted metrics">{{ compact(post.impressions) }} views · {{ compact(post.clicks) }} clicks · {{ compact(post.engagements) }} engagements</span>
              } @else {
                <span class="muted metrics">Not published yet</span>
              }
              <span class="post-acts">
                @if (post.status !== 'published') {
                  <button class="link-act" (click)="publishPost(post)">Publish now</button>
                }
                <button class="link-act danger" (click)="deletePost(post)">Delete</button>
              </span>
            </div>
          </div>
        } @empty {
          <div class="card empty">No {{ postFilter() === 'All' ? '' : postFilter().toLowerCase() + ' ' }}posts yet.</div>
        }
      </div>
    </section>

    <!-- ================================================== sponsored (tenants) -->
    <section>
      <div class="sec-head">
        <div>
          <h2>Marketplace sponsored ads</h2>
          <p class="muted">Seller-funded sponsored product campaigns running inside the marketplace.</p>
        </div>
      </div>
      <div class="sponsored">
        @for (c of sponsored(); track c.id) {
          <div class="card sp-card">
            <strong>{{ c.name }}</strong>
            <p class="muted small-txt">Tenant #{{ c.tenant_id }}</p>
            <div class="sp-foot">
              <span class="pill st" [class]="'pill st ' + c.status">{{ c.status }}</span>
              <span class="price">{{ +c.spent_total | currency }}</span>
            </div>
          </div>
        } @empty {
          <div class="card empty">No sponsored campaigns from sellers yet.</div>
        }
      </div>
    </section>

    <!-- ===================================================== campaign modal -->
    @if (campaignModal()) {
      <div class="overlay" (click)="campaignModal.set(false)">
        <div class="card modal" (click)="$event.stopPropagation()">
          <h2>New campaign</h2>
          <p class="muted">Set the objective, channels and budget — you can pause or edit any time.</p>
          <form (ngSubmit)="createCampaign()">
            <div class="field">
              <label>Campaign name</label>
              <input [(ngModel)]="campaignForm.name" name="c_name" placeholder="e.g. Festive Season Mega Sale" required />
            </div>
            <div class="field">
              <label>Objective</label>
              <select [(ngModel)]="campaignForm.objective" name="c_objective">
                @for (o of objectives; track o.value) { <option [value]="o.value">{{ o.label }}</option> }
              </select>
            </div>
            <div class="field">
              <label>Channels</label>
              <div class="chips">
                @for (p of platforms; track p.key) {
                  @let connected = accountFor(p.key).status === 'connected';
                  <button type="button" class="chip" [class.on]="campaignForm.channels.includes(p.key)"
                    [disabled]="!connected" (click)="toggleCampaignChannel(p.key)">
                    <i class="mini" [style.background]="p.color">{{ p.short }}</i> {{ p.name }}
                  </button>
                }
              </div>
            </div>
            <div class="two-col">
              <div class="field"><label>Daily budget ($)</label><input type="number" min="0" step="1" [(ngModel)]="campaignForm.daily_budget" name="c_daily" /></div>
              <div class="field"><label>Total budget ($)</label><input type="number" min="0" step="1" [(ngModel)]="campaignForm.total_budget" name="c_total" /></div>
            </div>
            <div class="two-col">
              <div class="field"><label>Starts</label><input type="date" [(ngModel)]="campaignForm.starts_at" name="c_start" /></div>
              <div class="field"><label>Ends</label><input type="date" [(ngModel)]="campaignForm.ends_at" name="c_end" /></div>
            </div>
            <label class="launch-check">
              <input type="checkbox" [(ngModel)]="campaignForm.launchNow" name="c_launch" />
              Launch immediately (otherwise saved as draft)
            </label>
            <div class="composer-actions">
              <button class="btn ghost" type="button" (click)="campaignModal.set(false)">Cancel</button>
              <button class="btn accent" type="submit" [disabled]="!campaignForm.name.trim() || !campaignForm.channels.length">
                {{ campaignForm.launchNow ? 'Create & launch' : 'Create draft' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display:block; max-width:1440px; margin:0 auto; padding-bottom:40px; }

    .page-head { display:flex; justify-content:space-between; align-items:flex-end; gap:24px; flex-wrap:wrap; margin-bottom:18px; }
    .eyebrow { margin:0 0 6px; color:var(--accent); font-size:10px; font-weight:800; letter-spacing:.15em; text-transform:uppercase; }
    h1 { margin:0; font-size:clamp(28px,3vw,38px); line-height:1.08; }
    .intro { margin:7px 0 0; font-size:14px; max-width:60ch; }
    .toolbar { display:flex; gap:10px; flex-wrap:wrap; }
    h2 { margin:0; font-size:21px; }
    section { margin-top:28px; }
    .sec-head { display:flex; justify-content:space-between; align-items:flex-end; gap:16px; flex-wrap:wrap; margin-bottom:14px; }
    .sec-head p { margin:4px 0 0; font-size:13.5px; }
    .sec-head.tight { margin-bottom:10px; align-items:center; }
    .small-txt { font-size:12px; margin:3px 0 0; }

    .demo-note { display:flex; align-items:center; gap:9px; margin-bottom:14px; padding:10px 14px; border:1px solid color-mix(in srgb, var(--gold) 45%, var(--line)); border-radius:12px; background:color-mix(in srgb, var(--gold) 9%, var(--card)); font-size:12.5px; color:var(--ink-soft); }
    .demo-note span { display:grid; place-items:center; flex:none; width:18px; height:18px; border-radius:50%; background:var(--gold); color:#fff; font-weight:800; font-size:11px; font-style:italic; }
    .toast { position:fixed; bottom:22px; left:50%; transform:translateX(-50%); z-index:60; padding:11px 18px; border-radius:999px; background:var(--ink); color:var(--card); font-size:13px; font-weight:650; box-shadow:0 14px 40px rgba(0,0,0,.3); }
    .toast.bad { background:var(--danger); color:#fff; }

    .kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:14px; }
    .kpi { padding:16px 18px; }
    .kpi .label { margin:0 0 6px; font-size:10px; font-weight:800; letter-spacing:.09em; text-transform:uppercase; color:var(--ink-soft); }
    .kpi strong { display:block; font-family:Fraunces, Georgia, serif; font-size:25px; letter-spacing:-.02em; }
    .kpi small { display:block; margin-top:4px; font-size:11.5px; }

    .channels { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:14px; }
    .channel { padding:16px; display:flex; flex-direction:column; gap:12px; }
    .channel.off { background:color-mix(in srgb, var(--card) 74%, var(--paper-2)); }
    .ch-top { display:flex; align-items:center; gap:11px; }
    .ch-badge { display:grid; place-items:center; flex:none; width:40px; height:40px; border-radius:12px; color:#fff; font-weight:800; font-size:14px; text-transform:lowercase; box-shadow:inset 0 -8px 16px rgba(0,0,0,.14); }
    .ch-id { flex:1; min-width:0; display:grid; gap:2px; }
    .ch-id strong { font-size:14.5px; }
    .ch-id small { font-size:11.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .pill.live { background:color-mix(in srgb, var(--ok) 14%, transparent); color:var(--ok); }
    .ch-actions { display:flex; }
    .btn.small { padding:9px 14px; font-size:12.5px; }
    .connect-form { display:grid; gap:8px; }
    .connect-form input { border:1px solid var(--line); border-radius:11px; padding:10px 12px; background:var(--card); color:var(--ink); }
    .connect-actions { display:flex; gap:8px; }
    .connect-form small { font-size:11px; }

    .table-card { overflow:hidden; }
    .table-wrap { overflow-x:auto; }
    table { width:100%; min-width:900px; border-collapse:collapse; font-size:13.5px; }
    th { text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:.08em; color:var(--ink-soft); padding:12px 14px; border-bottom:1px solid var(--line); }
    td { padding:13px 14px; border-top:1px solid var(--line); vertical-align:middle; }
    tbody tr:first-child td { border-top:0; }
    th.num, td.num { text-align:right; }
    .pace-cell { min-width:150px; }
    .pace-line { display:flex; justify-content:space-between; gap:8px; font-size:12px; margin-bottom:5px; }
    .pace { height:6px; border-radius:99px; background:var(--paper-2); overflow:hidden; }
    .pace i { display:block; height:100%; border-radius:99px; background:linear-gradient(90deg, var(--accent-2), var(--accent)); }
    .row-actions { text-align:right; white-space:nowrap; }
    .link-act { border:0; background:transparent; color:var(--accent); font-weight:700; font-size:12.5px; cursor:pointer; padding:4px 6px; }
    .link-act.danger { color:var(--danger); }
    .link-act:hover { text-decoration:underline; }

    .mini-badges { display:inline-flex; gap:4px; }
    .mini { display:inline-grid; place-items:center; width:21px; height:21px; border-radius:6px; color:#fff; font-size:9px; font-weight:800; font-style:normal; text-transform:lowercase; }

    .pill.st { text-transform:capitalize; }
    .pill.st.active, .pill.st.published { background:color-mix(in srgb, var(--ok) 15%, transparent); color:var(--ok); }
    .pill.st.paused, .pill.st.scheduled { background:color-mix(in srgb, var(--gold) 20%, transparent); color:color-mix(in srgb, var(--gold) 60%, var(--ink)); }
    .pill.st.draft { background:var(--paper-2); color:var(--ink-soft); }
    .pill.st.completed, .pill.st.exhausted { background:color-mix(in srgb, var(--accent-2) 14%, transparent); color:var(--accent-2); }

    .posts-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.1fr); gap:18px; align-items:start; }
    .composer { padding:20px 22px; }
    .composer > p { margin:5px 0 16px; font-size:13.5px; }
    textarea { resize:vertical; }
    .counter { text-align:right; font-size:11px; }
    .chips { display:flex; flex-wrap:wrap; gap:7px; }
    .chip { display:inline-flex; align-items:center; gap:7px; border:1px solid var(--line); border-radius:999px; background:var(--card); color:var(--ink); padding:7px 12px 7px 8px; font-size:12.5px; font-weight:650; cursor:pointer; }
    .chip.on { border-color:var(--ink); background:var(--ink); color:var(--card); }
    .chip:disabled { opacity:.4; cursor:not-allowed; }
    .two-col { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .composer-actions { display:flex; justify-content:flex-end; gap:9px; margin-top:6px; flex-wrap:wrap; }

    .filters { display:flex; gap:4px; padding:4px; border:1px solid var(--line); border-radius:11px; background:var(--card); }
    .filter { border:0; border-radius:8px; background:transparent; color:var(--ink-soft); padding:6px 11px; font-size:12px; font-weight:700; cursor:pointer; }
    .filter.on { background:var(--ink); color:var(--card); }
    .post-feed { display:grid; gap:12px; }
    .post { padding:15px 17px; }
    .post-top { display:flex; align-items:center; gap:9px; flex-wrap:wrap; }
    .when { margin-left:auto; font-size:11.5px; }
    .post-body { margin:10px 0 4px; line-height:1.5; font-size:14px; }
    .post-link { display:inline-block; margin:2px 0; color:var(--accent); font-size:12.5px; word-break:break-all; }
    .post-link:hover { text-decoration:underline; }
    .post-foot { display:flex; justify-content:space-between; align-items:center; gap:10px; margin-top:10px; padding-top:10px; border-top:1px dashed var(--line); flex-wrap:wrap; }
    .metrics { font-size:12px; }
    .post-acts { display:flex; gap:2px; }

    .sponsored { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:14px; }
    .sp-card { padding:15px 17px; }
    .sp-foot { display:flex; justify-content:space-between; align-items:center; margin-top:11px; }

    .overlay { position:fixed; inset:0; z-index:50; display:grid; place-items:center; padding:18px; background:rgba(15,13,10,.45); backdrop-filter:blur(3px); }
    .modal { width:min(560px, 100%); max-height:90vh; overflow:auto; padding:22px 24px; }
    .modal > p { margin:5px 0 16px; font-size:13.5px; }
    .launch-check { display:flex; align-items:center; gap:9px; margin:4px 0 14px; font-size:13px; font-weight:600; color:var(--ink-soft); cursor:pointer; }

    .empty { padding:30px; text-align:center; }

    @media (max-width: 1080px) {
      .posts-grid { grid-template-columns:1fr; }
    }
    @media (max-width: 640px) {
      .two-col { grid-template-columns:1fr; }
      .when { margin-left:0; width:100%; }
    }
  `],
})
export class AdminAdsComponent {
  private api = inject(ApiService);

  platforms = PLATFORMS;
  objectives = OBJECTIVES;
  postFilters = ['All', 'Published', 'Scheduled', 'Draft'];

  demo = signal(false);
  toast = signal<{ text: string; bad?: boolean } | null>(null);

  accounts = signal<SocialAccount[]>([]);
  campaigns = signal<MarketingCampaign[]>([]);
  posts = signal<SocialPost[]>([]);
  sponsored = signal<any[]>([]);

  postFilter = signal('All');
  campaignModal = signal(false);
  connectingPlatform = signal<SocialPlatform | null>(null);
  connectHandle = '';

  postForm = this.blankPost();
  campaignForm = this.blankCampaign();

  // ------------------------------------------------------------- computed

  totalSpend = computed(() => this.campaigns().reduce((sum, c) => sum + (+c.spend || 0), 0));
  totalImpressions = computed(() =>
    this.campaigns().reduce((s, c) => s + (c.impressions || 0), 0) +
    this.posts().reduce((s, p) => s + (p.impressions || 0), 0));
  totalClicks = computed(() =>
    this.campaigns().reduce((s, c) => s + (c.clicks || 0), 0) +
    this.posts().reduce((s, p) => s + (p.clicks || 0), 0));
  ctr = computed(() => this.totalImpressions() ? (this.totalClicks() / this.totalImpressions()) * 100 : 0);
  activeCampaigns = computed(() => this.campaigns().filter((c) => c.status === 'active').length);
  scheduledPosts = computed(() => this.posts().filter((p) => p.status === 'scheduled').length);
  connectedCount = computed(() => this.accounts().filter((a) => a.status === 'connected').length);
  totalFollowers = computed(() =>
    this.accounts().filter((a) => a.status === 'connected').reduce((s, a) => s + (a.followers || 0), 0));

  filteredPosts = computed(() => {
    const f = this.postFilter().toLowerCase();
    const list = this.posts();
    return f === 'all' ? list : list.filter((p) => p.status === f);
  });

  constructor() {
    this.load();
  }

  private load() {
    this.api.adminSocialAccounts().subscribe({
      next: (res) => this.accounts.set(res.data),
      error: () => this.enableDemo(),
    });
    this.api.adminMarketingCampaigns().subscribe({
      next: (res) => this.campaigns.set(res.data),
      error: () => this.enableDemo(),
    });
    this.api.adminSocialPosts().subscribe({
      next: (res) => this.posts.set(res.data),
      error: () => this.enableDemo(),
    });
    this.api.adminAds().subscribe({
      next: (res) => this.sponsored.set(res.data),
      error: () => this.sponsored.set(DEMO_SPONSORED),
    });
  }

  private enableDemo() {
    if (this.demo()) return;
    this.demo.set(true);
    this.accounts.set(structuredClone(DEMO_ACCOUNTS));
    this.campaigns.set(structuredClone(DEMO_CAMPAIGNS));
    this.posts.set(structuredClone(DEMO_POSTS));
    if (!this.sponsored().length) this.sponsored.set(DEMO_SPONSORED);
  }

  // -------------------------------------------------------------- helpers

  accountFor(platform: SocialPlatform): SocialAccount {
    return this.accounts().find((a) => a.platform === platform)
      ?? { platform, status: 'disconnected', followers: 0 };
  }

  metaOf(platform: SocialPlatform): PlatformMeta {
    return PLATFORMS.find((p) => p.key === platform) ?? PLATFORMS[0];
  }
  colorOf(p: SocialPlatform) { return this.metaOf(p).color; }
  nameOf(p: SocialPlatform) { return this.metaOf(p).name; }
  shortOf(p: SocialPlatform) { return this.metaOf(p).short; }

  objectiveLabel(value: string) {
    return OBJECTIVES.find((o) => o.value === value)?.label ?? value;
  }

  compact(n: number): string {
    if (!n) return '0';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
    return `${n}`;
  }

  pacing(c: MarketingCampaign): number {
    const total = +(c.total_budget || 0);
    return total ? Math.min(100, (+c.spend / total) * 100) : 0;
  }

  rowCtr(c: MarketingCampaign): number {
    return c.impressions ? (c.clicks / c.impressions) * 100 : 0;
  }

  scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private notify(text: string, bad = false) {
    this.toast.set({ text, bad });
    setTimeout(() => this.toast.set(null), 3200);
  }

  // ------------------------------------------------------------- accounts

  startConnect(p: PlatformMeta, acc: SocialAccount) {
    this.connectHandle = acc.handle || '';
    this.connectingPlatform.set(p.key);
  }

  confirmConnect(p: PlatformMeta) {
    const handle = this.connectHandle.trim().replace(/^@/, '');
    if (!handle) return;
    const applyLocal = () => {
      this.accounts.update((list) => {
        const next = list.filter((a) => a.platform !== p.key);
        const prev = list.find((a) => a.platform === p.key);
        return [...next, {
          ...(prev ?? { followers: 0 }),
          platform: p.key, handle, status: 'connected' as const,
          followers: prev?.followers || Math.floor(1000 + Math.random() * 9000),
          connected_at: new Date().toISOString(),
        }];
      });
      this.notify(`${p.name} connected as @${handle}`);
    };
    this.connectingPlatform.set(null);
    if (this.demo()) { applyLocal(); return; }
    this.api.connectSocialAccount({ platform: p.key, handle }).subscribe({
      next: (res) => {
        this.accounts.update((list) => [...list.filter((a) => a.platform !== p.key), res.data]);
        this.notify(`${p.name} connected as @${res.data.handle}`);
      },
      error: () => applyLocal(),
    });
  }

  disconnect(acc: SocialAccount) {
    const meta = this.metaOf(acc.platform);
    const applyLocal = () => {
      this.accounts.update((list) =>
        list.map((a) => (a.platform === acc.platform ? { ...a, status: 'disconnected' as const } : a)));
      this.notify(`${meta.name} disconnected`);
    };
    if (this.demo() || !acc.id) { applyLocal(); return; }
    this.api.disconnectSocialAccount(acc.id).subscribe({ next: applyLocal, error: applyLocal });
  }

  // ------------------------------------------------------------ campaigns

  openCampaignModal() {
    this.campaignForm = this.blankCampaign();
    this.campaignModal.set(true);
  }

  createCampaign() {
    const f = this.campaignForm;
    const payload = {
      name: f.name.trim(),
      objective: f.objective,
      status: (f.launchNow ? 'active' : 'draft') as MarketingCampaign['status'],
      channels: f.channels,
      daily_budget: f.daily_budget || null,
      total_budget: f.total_budget || null,
      starts_at: f.starts_at || null,
      ends_at: f.ends_at || null,
    };
    const applyLocal = () => {
      const local: MarketingCampaign = {
        id: Date.now(), spend: 0, impressions: 0, clicks: 0, conversions: 0, posts_count: 0,
        ...payload,
      } as MarketingCampaign;
      this.campaigns.update((list) => [local, ...list]);
      this.finishCampaignCreate(local);
    };
    if (this.demo()) { applyLocal(); return; }
    this.api.createMarketingCampaign(payload as any).subscribe({
      next: (res) => {
        this.campaigns.update((list) => [res.data, ...list]);
        this.finishCampaignCreate(res.data);
      },
      error: () => applyLocal(),
    });
  }

  private finishCampaignCreate(c: MarketingCampaign) {
    this.campaignModal.set(false);
    this.notify(c.status === 'active' ? `Campaign “${c.name}” is live 🚀` : `Campaign “${c.name}” saved as draft`);
  }

  setCampaignStatus(c: MarketingCampaign, status: MarketingCampaign['status']) {
    const applyLocal = () => {
      this.campaigns.update((list) => list.map((x) => (x.id === c.id ? { ...x, status } : x)));
      this.notify(`Campaign ${status === 'active' ? 'activated' : status}`);
    };
    if (this.demo()) { applyLocal(); return; }
    this.api.updateMarketingCampaign(c.id, { status }).subscribe({ next: applyLocal, error: applyLocal });
  }

  deleteCampaign(c: MarketingCampaign) {
    if (!confirm(`Delete campaign “${c.name}”? This cannot be undone.`)) return;
    const applyLocal = () => {
      this.campaigns.update((list) => list.filter((x) => x.id !== c.id));
      this.notify('Campaign deleted');
    };
    if (this.demo()) { applyLocal(); return; }
    this.api.deleteMarketingCampaign(c.id).subscribe({ next: applyLocal, error: applyLocal });
  }

  // ---------------------------------------------------------------- posts

  toggleChannel(p: SocialPlatform) {
    const set = new Set(this.postForm.channels);
    set.has(p) ? set.delete(p) : set.add(p);
    this.postForm.channels = [...set];
  }

  toggleCampaignChannel(p: SocialPlatform) {
    const set = new Set(this.campaignForm.channels);
    set.has(p) ? set.delete(p) : set.add(p);
    this.campaignForm.channels = [...set];
  }

  canSubmitPost(): boolean {
    return !!this.postForm.body.trim() && this.postForm.channels.length > 0;
  }

  submitPost(status: 'draft' | 'scheduled' | 'published') {
    if (!this.canSubmitPost()) return;
    const f = this.postForm;
    const payload: Partial<SocialPost> = {
      body: f.body.trim(),
      link_url: f.link_url.trim() || null,
      channels: f.channels,
      campaign_id: f.campaign_id,
      status,
      scheduled_for: status === 'scheduled' ? f.scheduled_for || null : null,
    };
    const applyLocal = () => {
      const campaign = this.campaigns().find((c) => c.id === f.campaign_id);
      const local: SocialPost = {
        id: Date.now(), impressions: 0, clicks: 0, engagements: 0,
        published_at: status === 'published' ? new Date().toISOString() : null,
        campaign: campaign ? { id: campaign.id, name: campaign.name } : null,
        ...payload,
      } as SocialPost;
      this.posts.update((list) => [local, ...list]);
      this.finishPostCreate(status);
    };
    if (this.demo()) { applyLocal(); return; }
    this.api.createSocialPost(payload).subscribe({
      next: (res) => {
        this.posts.update((list) => [res.data, ...list]);
        this.finishPostCreate(status);
      },
      error: () => applyLocal(),
    });
  }

  private finishPostCreate(status: string) {
    this.postForm = this.blankPost();
    this.postFilter.set('All');
    this.notify(status === 'published' ? 'Post published to selected channels 🎉'
      : status === 'scheduled' ? 'Post scheduled' : 'Draft saved');
  }

  publishPost(post: SocialPost) {
    const applyLocal = () => {
      this.posts.update((list) => list.map((p) =>
        p.id === post.id ? { ...p, status: 'published' as const, published_at: new Date().toISOString() } : p));
      this.notify('Post published 🎉');
    };
    if (this.demo()) { applyLocal(); return; }
    this.api.publishSocialPost(post.id).subscribe({
      next: (res) => {
        this.posts.update((list) => list.map((p) => (p.id === post.id ? res.data : p)));
        this.notify('Post published 🎉');
      },
      error: () => applyLocal(),
    });
  }

  deletePost(post: SocialPost) {
    if (!confirm('Delete this post?')) return;
    const applyLocal = () => {
      this.posts.update((list) => list.filter((p) => p.id !== post.id));
      this.notify('Post deleted');
    };
    if (this.demo()) { applyLocal(); return; }
    this.api.deleteSocialPost(post.id).subscribe({ next: applyLocal, error: applyLocal });
  }

  // ---------------------------------------------------------------- forms

  private blankPost() {
    return {
      body: '',
      link_url: '',
      channels: [] as SocialPlatform[],
      campaign_id: null as number | null,
      scheduled_for: '',
    };
  }

  private blankCampaign() {
    return {
      name: '',
      objective: 'awareness',
      channels: [] as SocialPlatform[],
      daily_budget: null as number | null,
      total_budget: null as number | null,
      starts_at: '',
      ends_at: '',
      launchNow: true,
    };
  }
}
