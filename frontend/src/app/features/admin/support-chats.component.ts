import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { SupportAgent, SupportChat, SupportChatSummary } from '../../core/models';
import {
  avatarColor,
  chatStatusLabel,
  clockTime,
  initials,
  priorityLabel,
  relativeTime,
} from '../support/support-shared';

const QUICK_REPLIES = [
  'Hi! Thanks for reaching out — I can help with that.',
  'Let me check that for you, one moment.',
  'Could you share the order or product reference?',
  'I have raised this with the team and will update you here.',
  'Anything else I can help with before we close this chat?',
];

@Component({
  selector: 'app-admin-support-chats',
  imports: [FormsModule],
  template: `
    <header class="page-head">
      <div>
        <p class="eyebrow">Service desk</p>
        <h1>Live chat</h1>
      </div>
      @if (summary(); as s) {
        <div class="head-stats">
          <span class="stat waiting" [class.alert]="s.queued > 0"><strong>{{ s.queued }}</strong> waiting</span>
          <span class="stat"><strong>{{ s.active }}</strong> live</span>
          <span class="stat"><strong>{{ waitLabel(s.avg_wait_seconds) }}</strong> avg. pickup</span>
          <span class="live-dot" [class.on]="polling()"><i></i>{{ polling() ? 'Auto-refreshing' : 'Paused' }}</span>
          <button class="btn ghost sm" type="button" (click)="togglePolling()">{{ polling() ? 'Pause' : 'Resume' }}</button>
        </div>
      }
    </header>

    @if (error()) { <p class="err">{{ error() }}</p> }

    <div class="desk">
      <!-- -------------------------------------------------------- inbox -->
      <aside class="inbox card">
        <div class="inbox-head">
          <div class="tabs">
            @for (f of filters; track f.value) {
              <button type="button" [class.on]="filter() === f.value" (click)="setFilter(f.value)">
                {{ f.label }}
                @if (countFor(f.value)) { <i>{{ countFor(f.value) }}</i> }
              </button>
            }
          </div>
          <input class="finder" [(ngModel)]="search" (keyup.enter)="load()" placeholder="Search visitor or topic…" aria-label="Search chats" />
        </div>

        <div class="inbox-list">
          @if (loading() && !chats().length) {
            @for (i of [1,2,3]; track i) { <div class="skeleton row-skel"></div> }
          } @else if (!chats().length) {
            <p class="empty-note muted">No conversations in this view.</p>
          }

          @for (c of chats(); track c.id) {
            <button type="button" class="c-item" [class.on]="selectedId() === c.id" (click)="select(c.id)">
              <span class="c-avatar" [style.background]="avatarColor(c.visitor.name)">
                {{ initials(c.visitor.name) }}
                <i class="state" [class]="c.status"></i>
              </span>
              <span class="c-body">
                <span class="c-top">
                  <span class="c-who">{{ c.visitor.name }}</span>
                  <span class="c-time muted">{{ relativeTime(c.last_message_at) }}</span>
                </span>
                <span class="c-topic">{{ c.topic || 'New conversation' }}</span>
                <span class="c-preview muted">{{ preview(c) }}</span>
                <span class="c-meta">
                  @if (c.tenant) { <span class="c-tenant">{{ c.tenant.name }}</span> }
                  @if (c.status === 'queued') { <span class="wait">waiting {{ relativeTime(c.started_at) }}</span> }
                  <span class="spacer"></span>
                  @if (c.unread_count) { <span class="badge">{{ c.unread_count }}</span> }
                </span>
              </span>
            </button>
          }
        </div>
      </aside>

      <!-- --------------------------------------------------- conversation -->
      <section class="room card">
        @if (!active()) {
          <div class="placeholder">
            <div class="ph-icon">
              <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            </div>
            <h2>No conversation selected</h2>
            <p class="muted">Pick a chat on the left. Queued visitors are waiting for a first reply.</p>
          </div>
        } @else if (active(); as c) {
          <header class="room-head">
            <span class="avatar" [style.background]="avatarColor(c.visitor.name)">{{ initials(c.visitor.name) }}</span>
            <div class="rh-main">
              <h2>{{ c.visitor.name }}</h2>
              <p class="muted small">
                <span class="state-pill" [class]="c.status">{{ chatStatusLabel(c.status) }}</span>
                {{ c.topic || 'New conversation' }}
                @if (c.tenant) { · {{ c.tenant.name }} }
                @if (c.wait_seconds) { · picked up in {{ waitLabel(c.wait_seconds) }} }
              </p>
            </div>
            <div class="rh-actions">
              @if (c.status === 'queued') {
                <button class="btn accent sm" type="button" (click)="act('claim')">Claim chat</button>
              }
              @if (c.status === 'active') {
                <button class="btn ghost sm" type="button" (click)="act('end')">End chat</button>
              }
              @if (c.status === 'ended') {
                <button class="btn ghost sm" type="button" (click)="act('reopen')">Reopen</button>
              }
              @if (!c.ticket_id) {
                <button class="btn ghost sm" type="button" (click)="act('escalate')">Escalate to ticket</button>
              } @else {
                <button class="btn ghost sm" type="button" (click)="openTicket(c.ticket_id)">Open ticket</button>
              }
            </div>
          </header>

          <div class="stream">
            @for (m of c.messages || []; track m.id) {
              @if (m.author_role === 'system') {
                <p class="system-line">{{ m.body }} · {{ clockTime(m.created_at) }}</p>
              } @else {
                <article class="bubble-row" [class.mine]="m.author_role === 'agent'">
                  @if (m.author_role !== 'agent') {
                    <span class="b-avatar" [style.background]="m.author_role === 'bot' ? '#5a4fcf' : avatarColor(m.author_name)">
                      {{ m.author_role === 'bot' ? '◆' : initials(m.author_name) }}
                    </span>
                  }
                  <div class="bubble" [class.bot]="m.author_role === 'bot'">
                    <p>{{ m.body }}</p>
                    <span class="b-time">{{ m.author_name }} · {{ clockTime(m.created_at) }}</span>
                  </div>
                </article>
              }
            }
            @if (typing()) {
              <article class="bubble-row">
                <span class="b-avatar" [style.background]="avatarColor(c.visitor.name)">{{ initials(c.visitor.name) }}</span>
                <div class="bubble typing"><i></i><i></i><i></i></div>
              </article>
            }
          </div>

          <footer class="say">
            <div class="quick-row">
              @for (q of quickReplies; track q) {
                <button type="button" class="quick" (click)="draft = q">{{ q }}</button>
              }
            </div>
            <div class="say-row">
              <textarea
                [(ngModel)]="draft"
                rows="1"
                [placeholder]="c.status === 'ended' ? 'Reopen the chat to keep talking…' : 'Type a message…'"
                [disabled]="c.status === 'ended'"
                (keydown.enter)="onEnter($event)"
              ></textarea>
              <button class="btn accent send" type="button" [disabled]="!draft.trim() || sending() || c.status === 'ended'" (click)="send()">
                <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
              </button>
            </div>
          </footer>
        }
      </section>

      <!-- ------------------------------------------------------- context -->
      @if (active(); as c) {
        <aside class="side card">
          <h3>Visitor</h3>
          <div class="party">
            <span class="avatar" [style.background]="avatarColor(c.visitor.name)">{{ initials(c.visitor.name) }}</span>
            <div>
              <strong>{{ c.visitor.name }}</strong>
              <small class="muted">{{ c.visitor.email || c.visitor.type }}</small>
            </div>
          </div>
          @if (c.tenant) {
            <div class="party">
              <span class="avatar sq" [style.background]="avatarColor(c.tenant.name)">{{ initials(c.tenant.name) }}</span>
              <div>
                <strong>{{ c.tenant.name }}</strong>
                <small class="muted">Tenant · {{ c.tenant.status }}</small>
              </div>
            </div>
          }

          <h3 class="spaced">Session</h3>
          <div class="facts">
            <div><span class="muted">Status</span><strong>{{ chatStatusLabel(c.status) }}</strong></div>
            <div><span class="muted">Priority</span><strong>{{ priorityLabel(c.priority) }}</strong></div>
            <div><span class="muted">Started</span><strong>{{ relativeTime(c.started_at) }}</strong></div>
            <div><span class="muted">Pickup</span><strong>{{ c.wait_seconds ? waitLabel(c.wait_seconds) : '—' }}</strong></div>
            <div><span class="muted">Messages</span><strong>{{ (c.messages || []).length }}</strong></div>
            @if (c.rating) { <div><span class="muted">Rating</span><strong class="stars">{{ stars(c.rating) }}</strong></div> }
          </div>

          <h3 class="spaced">Assign</h3>
          <select class="assign" [ngModel]="c.agent?.id ?? ''" (ngModelChange)="assign($event)">
            <option value="">Unassigned (back to queue)</option>
            @for (a of agents(); track a.id) { <option [value]="a.id">{{ a.name }}</option> }
          </select>

          @if (c.ticket_id) {
            <p class="linked-note">
              Escalated to ticket
              <button type="button" class="link" (click)="openTicket(c.ticket_id)">#{{ c.ticket_id }}</button>
            </p>
          }
        </aside>
      }
    </div>
  `,
  styles: [`
    :host { display:block; max-width:1560px; margin:0 auto; }

    .page-head { display:flex; justify-content:space-between; align-items:flex-end; gap:20px; flex-wrap:wrap; margin-bottom:16px; }
    .eyebrow { margin:0 0 5px; color:var(--accent); font-size:10px; font-weight:800; letter-spacing:.15em; text-transform:uppercase; }
    h1 { margin:0; font-size:clamp(24px,2.6vw,32px); }
    .head-stats { display:flex; align-items:center; gap:16px; flex-wrap:wrap; font-size:12.5px; color:var(--ink-soft); }
    .head-stats strong { font-family:Fraunces,serif; font-size:16px; color:var(--ink); margin-right:3px; }
    .stat.waiting.alert strong { color:var(--accent); }
    .live-dot { display:inline-flex; align-items:center; gap:6px; font-size:11.5px; }
    .live-dot i { width:7px; height:7px; border-radius:50%; background:var(--line); }
    .live-dot.on i { background:#45a675; box-shadow:0 0 0 3px rgba(69,166,117,.18); animation:sd-blink 2s ease-in-out infinite; }
    @keyframes sd-blink { 50% { opacity:.4; } }
    .btn { padding:10px 16px; font-size:13px; }
    .btn.sm { padding:7px 12px; font-size:12px; border-radius:10px; }
    .err { color:var(--danger); font-size:13px; margin:0 0 10px; }

    .desk { display:grid; grid-template-columns:320px minmax(0,1fr) 270px; gap:14px; align-items:start; height:calc(100vh - 185px); min-height:560px; }

    /* ---- inbox ---- */
    .inbox { display:flex; flex-direction:column; overflow:hidden; height:100%; }
    .inbox-head { padding:11px; border-bottom:1px solid var(--line); display:grid; gap:8px; }
    .tabs { display:flex; gap:3px; }
    .tabs button { flex:1; display:inline-flex; align-items:center; justify-content:center; gap:5px; border:0; border-radius:9px; background:transparent; color:var(--ink-soft); padding:7px 8px; font-size:11.5px; font-weight:750; cursor:pointer; }
    .tabs button.on { background:var(--ink); color:var(--card); }
    .tabs button i { font-style:normal; font-size:10px; padding:1px 5px; border-radius:99px; background:var(--paper-2); color:var(--ink-soft); }
    .tabs button.on i { background:rgba(255,255,255,.22); color:#fff; }
    .finder { width:100%; border:1px solid var(--line); border-radius:10px; padding:8px 11px; background:var(--paper-2); color:var(--ink); font-size:12.5px; }

    .inbox-list { flex:1; overflow-y:auto; padding:6px; }
    .row-skel { height:74px; margin:5px; }
    .c-item { display:flex; gap:10px; width:100%; text-align:left; border:0; background:transparent; padding:10px; border-radius:12px; cursor:pointer; color:var(--ink); border-left:3px solid transparent; }
    .c-item:hover { background:var(--paper-2); }
    .c-item.on { background:var(--paper-2); border-left-color:var(--accent); }
    .c-avatar { position:relative; display:grid; place-items:center; width:36px; height:36px; border-radius:999px; color:#fff; font-size:12px; font-weight:800; flex:none; }
    .state { position:absolute; right:-1px; bottom:-1px; width:11px; height:11px; border-radius:50%; border:2px solid var(--card); background:var(--line); }
    .state.active { background:#45a675; }
    .state.queued { background:var(--accent); animation:sd-blink 1.4s ease-in-out infinite; }
    .c-body { flex:1; min-width:0; display:grid; gap:1px; }
    .c-top { display:flex; justify-content:space-between; gap:8px; }
    .c-who { font-size:12.5px; font-weight:750; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .c-time { font-size:10.5px; white-space:nowrap; }
    .c-topic { font-size:12px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .c-preview { font-size:11.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .c-meta { display:flex; align-items:center; gap:6px; font-size:10px; margin-top:3px; }
    .c-meta .spacer { flex:1; }
    .c-tenant { color:var(--ink-soft); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:96px; }
    .wait { color:var(--accent); font-weight:700; }
    .badge { display:grid; place-items:center; min-width:17px; height:17px; padding:0 5px; border-radius:99px; background:var(--accent); color:#fff; font-size:10px; font-weight:800; }

    /* ---- room ---- */
    .room { display:flex; flex-direction:column; overflow:hidden; height:100%; }
    .placeholder { flex:1; display:grid; place-content:center; justify-items:center; gap:8px; padding:40px; text-align:center; }
    .ph-icon { display:grid; place-items:center; width:58px; height:58px; border-radius:18px; background:var(--paper-2); }
    .ph-icon svg { width:26px; height:26px; fill:none; stroke:var(--ink-soft); stroke-width:1.6; stroke-linecap:round; stroke-linejoin:round; }
    .placeholder h2 { margin:6px 0 0; font-size:18px; }
    .placeholder p { margin:0; max-width:40ch; font-size:13px; }

    .room-head { display:flex; align-items:center; gap:11px; padding:12px 16px; border-bottom:1px solid var(--line); flex-wrap:wrap; }
    .rh-main { flex:1; min-width:0; }
    .rh-main h2 { margin:0; font-size:16px; }
    .rh-main p { margin:3px 0 0; display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
    .rh-actions { display:flex; gap:7px; flex-wrap:wrap; }
    .state-pill { font-size:9.5px; font-weight:800; letter-spacing:.07em; text-transform:uppercase; padding:3px 7px; border-radius:6px; background:var(--paper-2); color:var(--ink-soft); }
    .state-pill.active { background:color-mix(in srgb,#45a675 18%,transparent); color:#2d7a55; }
    .state-pill.queued { background:color-mix(in srgb,var(--accent) 18%,transparent); color:var(--accent); }

    .stream { flex:1; overflow-y:auto; padding:18px 18px 8px; display:grid; gap:10px; align-content:start; background:
      radial-gradient(circle at 20% 0%, color-mix(in srgb,var(--accent) 4%,transparent), transparent 55%); }
    .system-line { text-align:center; font-size:11px; color:var(--ink-soft); margin:4px 0; }
    .bubble-row { display:flex; gap:9px; max-width:76%; align-items:flex-end; }
    .bubble-row.mine { margin-left:auto; flex-direction:row-reverse; }
    .b-avatar { display:grid; place-items:center; width:27px; height:27px; border-radius:999px; color:#fff; font-size:10.5px; font-weight:800; flex:none; }
    .bubble { background:var(--paper-2); border-radius:16px 16px 16px 4px; padding:9px 13px; min-width:0; }
    .bubble.bot { background:color-mix(in srgb,#5a4fcf 11%,var(--card)); border:1px solid color-mix(in srgb,#5a4fcf 24%,transparent); }
    .bubble-row.mine .bubble { background:var(--accent); color:#fff; border-radius:16px 16px 4px 16px; }
    .bubble p { margin:0; font-size:13.5px; line-height:1.5; white-space:pre-wrap; word-break:break-word; }
    .b-time { display:block; margin-top:4px; font-size:10px; opacity:.68; }
    .bubble.typing { display:flex; gap:4px; padding:12px 14px; }
    .bubble.typing i { width:6px; height:6px; border-radius:50%; background:var(--ink-soft); animation:sd-typing 1.2s infinite; }
    .bubble.typing i:nth-child(2) { animation-delay:.15s; }
    .bubble.typing i:nth-child(3) { animation-delay:.3s; }
    @keyframes sd-typing { 0%,60%,100% { transform:translateY(0); opacity:.4; } 30% { transform:translateY(-4px); opacity:1; } }

    .say { border-top:1px solid var(--line); padding:9px 14px 12px; }
    .quick-row { display:flex; gap:6px; overflow-x:auto; padding-bottom:8px; scrollbar-width:none; }
    .quick-row::-webkit-scrollbar { display:none; }
    .quick { border:1px solid var(--line); border-radius:99px; background:var(--card); color:var(--ink-soft); padding:5px 11px; font-size:11px; white-space:nowrap; cursor:pointer; }
    .quick:hover { border-color:var(--accent); color:var(--accent); }
    .say-row { display:flex; gap:8px; align-items:flex-end; }
    .say textarea { flex:1; border:1px solid var(--line); border-radius:14px; padding:11px 13px; background:var(--card); color:var(--ink); resize:none; min-height:44px; max-height:140px; font-size:13.5px; line-height:1.45; }
    .say textarea:focus { outline:2px solid color-mix(in srgb,var(--accent) 45%,transparent); outline-offset:1px; border-color:var(--accent); }
    .send { width:44px; height:44px; padding:0; border-radius:14px; flex:none; }
    .send svg { width:18px; height:18px; fill:none; stroke:#fff; stroke-width:1.9; stroke-linecap:round; stroke-linejoin:round; }

    /* ---- side ---- */
    .side { padding:14px 15px; overflow-y:auto; height:100%; }
    .side h3 { margin:0 0 9px; font-size:10.5px; letter-spacing:.11em; text-transform:uppercase; color:var(--ink-soft); font-family:inherit; font-weight:800; }
    .side h3.spaced { margin-top:18px; }
    .party { display:flex; align-items:center; gap:9px; margin-bottom:9px; }
    .party strong { display:block; font-size:13px; }
    .party small { display:block; font-size:11px; }
    .avatar { display:grid; place-items:center; width:32px; height:32px; border-radius:999px; color:#fff; font-size:11.5px; font-weight:800; flex:none; }
    .avatar.sq { border-radius:9px; }
    .facts { display:grid; gap:7px; font-size:12px; }
    .facts > div { display:flex; justify-content:space-between; gap:10px; }
    .facts strong { font-weight:700; text-align:right; }
    .stars { color:var(--gold); letter-spacing:1px; }
    .assign { width:100%; border:1px solid var(--line); border-radius:10px; padding:8px 9px; background:var(--card); color:var(--ink); font-size:12.5px; }
    .linked-note { margin-top:14px; font-size:12px; color:var(--ink-soft); }
    .link { border:0; background:none; color:var(--accent); font-weight:750; cursor:pointer; font-size:12px; padding:0; }

    .empty-note { padding:28px 14px; text-align:center; font-size:13px; }
    .skeleton { background:linear-gradient(90deg,var(--paper-2),var(--card),var(--paper-2)); background-size:200% 100%; animation:sd-shimmer 1.2s infinite; border-radius:12px; }
    @keyframes sd-shimmer { to { background-position:-200% 0; } }

    @media (max-width:1280px) {
      .desk { grid-template-columns:290px minmax(0,1fr); height:auto; }
      .side { grid-column:1 / -1; height:auto; }
      .inbox, .room { height:620px; }
    }
    @media (max-width:860px) { .desk { grid-template-columns:1fr; } .inbox { height:380px; } }
  `],
})
export class AdminSupportChatsComponent implements OnDestroy {
  private api = inject(ApiService);
  private router = inject(Router);

  readonly filters: { value: string; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'queued', label: 'Waiting' },
    { value: 'active', label: 'Live' },
    { value: 'ended', label: 'Ended' },
  ];
  readonly quickReplies = QUICK_REPLIES;

  readonly initials = initials;
  readonly avatarColor = avatarColor;
  readonly relativeTime = relativeTime;
  readonly clockTime = clockTime;
  readonly chatStatusLabel = chatStatusLabel;
  readonly priorityLabel = priorityLabel;

  loading = signal(true);
  error = signal('');
  chats = signal<SupportChat[]>([]);
  summary = signal<SupportChatSummary | null>(null);
  agents = signal<SupportAgent[]>([]);

  selectedId = signal<number | null>(null);
  active = signal<SupportChat | null>(null);

  filter = signal('all');
  search = '';
  draft = '';
  sending = signal(false);
  typing = signal(false);
  polling = signal(true);

  private timer: ReturnType<typeof setInterval> | null = null;
  private typingTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.api.supportAgents().subscribe({ next: (r) => this.agents.set(r.data), error: () => {} });
    this.load(true);
    this.startPolling();
  }

  ngOnDestroy() {
    this.stopPolling();
    if (this.typingTimer) clearTimeout(this.typingTimer);
  }

  // -------------------------------------------------------------- loading

  load(selectFirst = false) {
    const params: Record<string, string> = {};
    if (this.filter() !== 'all') params['status'] = this.filter();
    if (this.search.trim()) params['q'] = this.search.trim();

    this.api.supportChats(params).subscribe({
      next: (res) => {
        this.chats.set(res.data);
        this.summary.set(res.summary);
        this.loading.set(false);
        this.error.set('');
        if ((selectFirst || !this.selectedId()) && res.data.length) this.select(res.data[0].id);
      },
      error: () => {
        this.error.set('Could not load conversations.');
        this.loading.set(false);
      },
    });
  }

  select(id: number) {
    this.selectedId.set(id);
    this.draft = '';
    this.api.supportChat(id).subscribe({
      next: (res) => {
        this.active.set(res.data);
        this.chats.update((list) => list.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c)));
      },
      error: () => this.error.set('Could not open that conversation.'),
    });
  }

  setFilter(value: string) {
    this.filter.set(value);
    this.load(true);
  }

  countFor(value: string): number | null {
    const s = this.summary();
    if (!s) return null;
    if (value === 'queued') return s.queued || null;
    if (value === 'active') return s.active || null;
    return null;
  }

  togglePolling() {
    this.polling.update((v) => !v);
    this.polling() ? this.startPolling() : this.stopPolling();
  }

  private startPolling() {
    this.stopPolling();
    this.timer = setInterval(() => {
      const params: Record<string, string> = {};
      if (this.filter() !== 'all') params['status'] = this.filter();
      this.api.supportChats(params).subscribe({
        next: (res) => {
          this.chats.set(res.data);
          this.summary.set(res.summary);
        },
        error: () => {},
      });
    }, 10000);
  }

  private stopPolling() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  // ------------------------------------------------------------ mutations

  act(action: 'claim' | 'end' | 'reopen' | 'escalate') {
    const id = this.selectedId();
    if (!id) return;
    this.api.updateSupportChat(id, action).subscribe({
      next: (res) => {
        this.active.set(res.data);
        this.load();
      },
      error: () => this.error.set('That action failed.'),
    });
  }

  assign(agentId: string | number) {
    const id = this.selectedId();
    if (!id) return;
    this.api.updateSupportChat(id, 'assign', agentId ? Number(agentId) : null).subscribe({
      next: (res) => {
        this.active.set(res.data);
        this.load();
      },
      error: () => this.error.set('Could not reassign the chat.'),
    });
  }

  onEnter(event: Event) {
    const ke = event as KeyboardEvent;
    if (ke.shiftKey) return;
    ke.preventDefault();
    this.send();
  }

  send() {
    const id = this.selectedId();
    const body = this.draft.trim();
    if (!id || !body || this.sending()) return;

    this.sending.set(true);
    this.api.replySupportChat(id, body).subscribe({
      next: (res) => {
        const chat = this.active();
        if (chat) {
          this.active.set({
            ...chat,
            status: 'active',
            messages: [...(chat.messages ?? []), res.data],
            last_message_at: res.data.created_at,
          });
        }
        this.draft = '';
        this.sending.set(false);
        this.simulateTyping();
        this.load();
      },
      error: () => {
        this.error.set('Message could not be delivered.');
        this.sending.set(false);
      },
    });
  }

  /** Visual affordance only: shows the visitor "typing" right after a reply. */
  private simulateTyping() {
    if (this.typingTimer) clearTimeout(this.typingTimer);
    this.typing.set(true);
    this.typingTimer = setTimeout(() => this.typing.set(false), 2600);
  }

  openTicket(ticketId: number | null) {
    if (!ticketId) return;
    this.router.navigate(['/admin/support/tickets'], { queryParams: { ticket: ticketId } });
  }

  // -------------------------------------------------------------- display

  preview(chat: SupportChat): string {
    const last = (chat.messages ?? []).at(-1);
    return last ? last.body : 'No messages yet';
  }

  waitLabel(seconds: number | null | undefined): string {
    if (!seconds) return '—';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    return `${Math.round(seconds / 60)}m`;
  }

  stars(rating: number): string {
    return '★★★★★'.slice(0, rating) + '☆☆☆☆☆'.slice(0, 5 - rating);
  }

  activeCount = computed(() => this.chats().filter((c) => c.status === 'active').length);
}
