import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import {
  SupportAgent,
  SupportCannedReply,
  SupportTicket,
  SupportTicketSummary,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '../../core/models';
import {
  TICKET_CATEGORIES,
  TICKET_CHANNELS,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  avatarColor,
  categoryLabel,
  channelLabel,
  clockTime,
  durationLabel,
  initials,
  priorityLabel,
  relativeTime,
  statusLabel,
} from '../support/support-shared';

type QuickFilter = 'all' | 'open' | 'unassigned' | 'breached' | 'resolved';

@Component({
  selector: 'app-admin-support-tickets',
  imports: [FormsModule, DatePipe],
  template: `
    <header class="page-head">
      <div>
        <p class="eyebrow">Service desk</p>
        <h1>Ticket inbox</h1>
      </div>
      <div class="head-actions">
        @if (summary(); as s) {
          <div class="head-stats">
            <span><strong>{{ s.open }}</strong> open</span>
            <span><strong>{{ s.unassigned }}</strong> unassigned</span>
            <span class="danger"><strong>{{ s.breached }}</strong> breached</span>
          </div>
        }
        <button class="btn accent" type="button" (click)="openComposer()">New ticket</button>
      </div>
    </header>

    @if (error()) { <p class="err">{{ error() }}</p> }

    <div class="desk">
      <!-- ----------------------------------------------------- queue list -->
      <aside class="queue card">
        <div class="queue-head">
          <div class="search">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input [(ngModel)]="search" (keyup.enter)="reload()" placeholder="Search subject, ref, requester…" aria-label="Search tickets" />
            @if (search) { <button type="button" class="clear" (click)="search = ''; reload()" aria-label="Clear">×</button> }
          </div>
          <div class="tabs">
            @for (f of quickFilters; track f.value) {
              <button type="button" [class.on]="quick() === f.value" (click)="setQuick(f.value)">
                {{ f.label }}
                @if (countFor(f.value) !== null) { <i>{{ countFor(f.value) }}</i> }
              </button>
            }
          </div>
          <div class="filter-row">
            <select [(ngModel)]="priority" (change)="reload()" aria-label="Priority">
              <option value="all">Any priority</option>
              @for (p of priorities; track p.value) { <option [value]="p.value">{{ p.label }}</option> }
            </select>
            <select [(ngModel)]="category" (change)="reload()" aria-label="Topic">
              <option value="all">Any topic</option>
              @for (c of categories; track c.value) { <option [value]="c.value">{{ c.label }}</option> }
            </select>
            <select [(ngModel)]="assignee" (change)="reload()" aria-label="Assignee">
              <option value="all">Anyone</option>
              <option value="unassigned">Unassigned</option>
              @for (a of agents(); track a.id) { <option [value]="a.id">{{ a.name }}</option> }
            </select>
          </div>
        </div>

        <div class="queue-list">
          @if (loading()) {
            @for (i of [1,2,3,4,5]; track i) { <div class="skeleton row-skel"></div> }
          } @else if (!tickets().length) {
            <p class="empty-note muted">No tickets match these filters.</p>
          }

          @for (t of tickets(); track t.id) {
            <button
              type="button"
              class="q-item"
              [class.on]="selectedId() === t.id"
              [class.unread]="t.status === 'new'"
              (click)="select(t.id)"
            >
              <span class="q-avatar" [style.background]="avatarColor(t.requester.name)">{{ initials(t.requester.name) }}</span>
              <span class="q-body">
                <span class="q-top">
                  <span class="q-who">{{ t.requester.name }}</span>
                  <span class="q-time muted">{{ relativeTime(t.last_reply_at || t.created_at) }}</span>
                </span>
                <span class="q-subject">{{ t.subject }}</span>
                <span class="q-meta">
                  <i class="pri-dot" [class]="t.priority" [title]="priorityLabel(t.priority)"></i>
                  <span class="muted">{{ t.reference }}</span>
                  @if (t.tenant) { <span class="q-tenant">{{ t.tenant.name }}</span> }
                  <span class="spacer"></span>
                  @if (t.sla_breached) { <span class="tag breach">SLA</span> }
                  <span class="tag" [attr.data-status]="t.status">{{ statusLabel(t.status) }}</span>
                </span>
              </span>
            </button>
          }
        </div>
      </aside>

      <!-- ---------------------------------------------------- conversation -->
      <section class="thread card">
        @if (!selected()) {
          <div class="placeholder">
            <div class="ph-icon">
              <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
            </div>
            <h2>Pick a conversation</h2>
            <p class="muted">Select a ticket from the queue to read the thread, reply, and update its status.</p>
          </div>
        } @else if (detail(); as d) {
          <header class="thread-head">
            <div class="th-main">
              <h2>{{ d.subject }}</h2>
              <p class="muted small">
                {{ d.reference }} · opened {{ relativeTime(d.created_at) }} by {{ d.requester.name }}
                @if (d.requester.email) { <span class="dot">·</span> {{ d.requester.email }} }
              </p>
            </div>
            <div class="th-actions">
              @if (d.status !== 'resolved' && d.status !== 'closed') {
                <button class="btn ghost sm" type="button" (click)="patch({ status: 'resolved' })">Mark resolved</button>
              } @else {
                <button class="btn ghost sm" type="button" (click)="patch({ status: 'open' })">Reopen</button>
              }
              <button class="btn ghost sm icon" type="button" (click)="refreshDetail()" title="Refresh">↻</button>
            </div>
          </header>

          @if (slaBanner(); as sla) {
            <div class="sla-banner" [class.breach]="sla.breached">
              <span class="sla-dot"></span>
              <span>{{ sla.text }}</span>
            </div>
          }

          <div class="messages" #scroller>
            @for (m of visibleMessages(); track m.id) {
              <article class="msg" [class.agent]="m.author_role === 'agent'" [class.internal]="m.visibility === 'internal'">
                <span class="m-avatar" [style.background]="avatarColor(m.author_name)">{{ initials(m.author_name) }}</span>
                <div class="m-bubble">
                  <div class="m-head">
                    <strong>{{ m.author_name }}</strong>
                    @if (m.visibility === 'internal') { <span class="note-tag">Internal note</span> }
                    <span class="m-time muted">{{ clockTime(m.created_at) }} · {{ m.created_at | date: 'MMM d' }}</span>
                  </div>
                  <p class="m-body">{{ m.body }}</p>
                </div>
              </article>
            }
          </div>

          <!-- composer -->
          <footer class="composer" [class.note-mode]="mode() === 'internal'">
            <div class="c-tabs">
              <button type="button" [class.on]="mode() === 'public'" (click)="mode.set('public')">Reply to requester</button>
              <button type="button" [class.on]="mode() === 'internal'" (click)="mode.set('internal')">Internal note</button>
              <div class="c-tools">
                <div class="macro-wrap">
                  <button type="button" class="macro-btn" (click)="macrosOpen.set(!macrosOpen())" [attr.aria-expanded]="macrosOpen()">
                    Canned replies ▾
                  </button>
                  @if (macrosOpen()) {
                    <div class="macro-panel">
                      @for (r of cannedReplies(); track r.id) {
                        <button type="button" (click)="applyMacro(r)">
                          <strong>{{ r.title }}</strong>
                          @if (r.shortcut) { <code>{{ r.shortcut }}</code> }
                          <small class="muted">{{ r.body }}</small>
                        </button>
                      } @empty {
                        <p class="empty-note muted">No saved replies yet.</p>
                      }
                    </div>
                  }
                </div>
              </div>
            </div>

            <textarea
              [(ngModel)]="draft"
              [placeholder]="mode() === 'internal' ? 'Add a note only the support team can see…' : 'Write a reply to ' + d.requester.name + '…'"
              rows="3"
              (keydown.control.enter)="send()"
              (keydown.meta.enter)="send()"
            ></textarea>

            <div class="c-foot">
              <span class="muted tiny">⌘/Ctrl + Enter to send</span>
              <div class="c-buttons">
                @if (mode() === 'public') {
                  <button class="btn ghost sm" type="button" [disabled]="!draft.trim() || sending()" (click)="send('resolved')">
                    Send &amp; resolve
                  </button>
                }
                <button class="btn accent sm" type="button" [disabled]="!draft.trim() || sending()" (click)="send()">
                  {{ sending() ? 'Sending…' : mode() === 'internal' ? 'Save note' : 'Send reply' }}
                </button>
              </div>
            </div>
          </footer>
        } @else {
          <div class="placeholder"><div class="skeleton" style="width:100%;height:240px"></div></div>
        }
      </section>

      <!-- -------------------------------------------------------- context -->
      @if (detail(); as d) {
        <aside class="context card">
          <h3>Properties</h3>
          <label class="ctl">
            <span>Status</span>
            <select [ngModel]="d.status" (ngModelChange)="patch({ status: $any($event) })">
              @for (s of statuses; track s.value) { <option [value]="s.value">{{ s.label }}</option> }
            </select>
          </label>
          <label class="ctl">
            <span>Priority</span>
            <select [ngModel]="d.priority" (ngModelChange)="patch({ priority: $any($event) })">
              @for (p of priorities; track p.value) { <option [value]="p.value">{{ p.label }}</option> }
            </select>
          </label>
          <label class="ctl">
            <span>Assignee</span>
            <select [ngModel]="d.assignee?.id ?? ''" (ngModelChange)="patch({ assignee_id: $event ? +$event : null })">
              <option value="">Unassigned</option>
              @for (a of agents(); track a.id) { <option [value]="a.id">{{ a.name }}</option> }
            </select>
          </label>
          <label class="ctl">
            <span>Topic</span>
            <select [ngModel]="d.category" (ngModelChange)="patch({ category: $any($event) })">
              @for (c of categories; track c.value) { <option [value]="c.value">{{ c.label }}</option> }
            </select>
          </label>

          <div class="facts">
            <div><span class="muted">Channel</span><strong>{{ channelLabel(d.channel) }}</strong></div>
            <div><span class="muted">First reply</span><strong>{{ firstReplyLabel(d) }}</strong></div>
            <div><span class="muted">Messages</span><strong>{{ d.messages_count }}</strong></div>
            <div><span class="muted">Last activity</span><strong>{{ relativeTime(d.last_reply_at || d.created_at) }}</strong></div>
            @if (d.satisfaction) {
              <div><span class="muted">Rating</span><strong class="stars">{{ starString(d.satisfaction) }}</strong></div>
            }
          </div>

          @if (d.tags.length) {
            <div class="tag-row">
              @for (t of d.tags; track t) { <span class="pill">{{ t }}</span> }
            </div>
          }

          <h3 class="spaced">Requester</h3>
          <div class="party">
            <span class="avatar" [style.background]="avatarColor(d.requester.name)">{{ initials(d.requester.name) }}</span>
            <div>
              <strong>{{ d.requester.name }}</strong>
              <small class="muted">{{ d.requester.email || d.requester.type }}</small>
            </div>
          </div>
          @if (d.tenant) {
            <div class="party">
              <span class="avatar sq" [style.background]="avatarColor(d.tenant.name)">{{ initials(d.tenant.name) }}</span>
              <div>
                <strong>{{ d.tenant.name }}</strong>
                <small class="muted">Tenant · {{ d.tenant.status }}</small>
              </div>
            </div>
          }

          @if (d.tasks?.length) {
            <h3 class="spaced">Linked tasks</h3>
            <ul class="linked">
              @for (t of d.tasks || []; track t.id) {
                <li>
                  <span class="t-status" [attr.data-status]="t.status"></span>
                  <span>{{ t.title }}</span>
                </li>
              }
            </ul>
          }
        </aside>
      }
    </div>

    <!-- ------------------------------------------------------ new ticket -->
    @if (composerOpen()) {
      <div class="modal-backdrop" (click)="composerOpen.set(false)">
        <div class="modal card" (click)="$event.stopPropagation()">
          <h2>Log a new ticket</h2>
          <p class="muted small">Use this when a request arrives by phone, WhatsApp or any channel outside the portal.</p>

          <div class="form-grid">
            <label class="field full"><span>Subject</span><input [(ngModel)]="form.subject" placeholder="Short summary of the request" /></label>
            <label class="field"><span>Requester name</span><input [(ngModel)]="form.requester_name" placeholder="Who is asking?" /></label>
            <label class="field"><span>Requester email</span><input [(ngModel)]="form.requester_email" type="email" placeholder="name@example.com" /></label>
            <label class="field">
              <span>Priority</span>
              <select [(ngModel)]="form.priority">
                @for (p of priorities; track p.value) { <option [value]="p.value">{{ p.label }}</option> }
              </select>
            </label>
            <label class="field">
              <span>Topic</span>
              <select [(ngModel)]="form.category">
                @for (c of categories; track c.value) { <option [value]="c.value">{{ c.label }}</option> }
              </select>
            </label>
            <label class="field">
              <span>Channel</span>
              <select [(ngModel)]="form.channel">
                @for (c of channels; track c.value) { <option [value]="c.value">{{ c.label }}</option> }
              </select>
            </label>
            <label class="field">
              <span>Assign to</span>
              <select [(ngModel)]="form.assignee_id">
                <option [ngValue]="null">Unassigned</option>
                @for (a of agents(); track a.id) { <option [ngValue]="a.id">{{ a.name }}</option> }
              </select>
            </label>
            <label class="field full"><span>What do they need?</span><textarea [(ngModel)]="form.body" rows="5" placeholder="Describe the request in the requester's own words…"></textarea></label>
          </div>

          @if (formError()) { <p class="err">{{ formError() }}</p> }

          <div class="modal-foot">
            <button class="btn ghost" type="button" (click)="composerOpen.set(false)">Cancel</button>
            <button class="btn accent" type="button" [disabled]="creating()" (click)="createTicket()">
              {{ creating() ? 'Creating…' : 'Create ticket' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display:block; max-width:1560px; margin:0 auto; }

    .page-head { display:flex; justify-content:space-between; align-items:flex-end; gap:20px; flex-wrap:wrap; margin-bottom:16px; }
    .eyebrow { margin:0 0 5px; color:var(--accent); font-size:10px; font-weight:800; letter-spacing:.15em; text-transform:uppercase; }
    h1 { margin:0; font-size:clamp(24px,2.6vw,32px); }
    .head-actions { display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
    .head-stats { display:flex; gap:14px; font-size:12.5px; color:var(--ink-soft); }
    .head-stats strong { font-family:Fraunces,serif; font-size:16px; color:var(--ink); margin-right:3px; }
    .head-stats .danger strong { color:var(--danger); }
    .btn { padding:10px 16px; font-size:13px; }
    .btn.sm { padding:7px 13px; font-size:12px; border-radius:10px; }
    .btn.icon { padding:7px 11px; }
    .err { color:var(--danger); font-size:13px; margin:0 0 10px; }

    .desk { display:grid; grid-template-columns:340px minmax(0,1fr) 290px; gap:14px; align-items:start; height:calc(100vh - 185px); min-height:560px; }

    /* ---- queue ---- */
    .queue { display:flex; flex-direction:column; overflow:hidden; height:100%; }
    .queue-head { padding:12px; border-bottom:1px solid var(--line); display:grid; gap:9px; }
    .search { position:relative; display:flex; align-items:center; }
    .search svg { position:absolute; left:11px; width:15px; height:15px; fill:none; stroke:var(--ink-soft); stroke-width:1.9; stroke-linecap:round; pointer-events:none; }
    .search input { width:100%; padding:9px 30px 9px 33px; border-radius:10px; border:1px solid var(--line); background:var(--paper-2); color:var(--ink); font-size:13px; }
    .search input:focus { outline:2px solid color-mix(in srgb,var(--accent) 50%,transparent); outline-offset:1px; }
    .clear { position:absolute; right:7px; border:0; background:transparent; color:var(--ink-soft); font-size:17px; cursor:pointer; line-height:1; }
    .tabs { display:flex; gap:3px; overflow-x:auto; scrollbar-width:none; }
    .tabs::-webkit-scrollbar { display:none; }
    .tabs button { display:inline-flex; align-items:center; gap:5px; border:0; border-radius:8px; background:transparent; color:var(--ink-soft); padding:6px 9px; font-size:11.5px; font-weight:750; cursor:pointer; white-space:nowrap; }
    .tabs button.on { background:var(--ink); color:var(--card); }
    .tabs button i { font-style:normal; font-size:10px; padding:1px 5px; border-radius:99px; background:var(--paper-2); color:var(--ink-soft); }
    .tabs button.on i { background:rgba(255,255,255,.22); color:#fff; }
    .filter-row { display:grid; grid-template-columns:repeat(3,1fr); gap:5px; }
    .filter-row select { border:1px solid var(--line); border-radius:9px; padding:6px 5px; background:var(--card); color:var(--ink); font-size:11px; min-width:0; }

    .queue-list { flex:1; overflow-y:auto; padding:6px; }
    .row-skel { height:72px; margin:5px; }
    .q-item { display:flex; gap:10px; width:100%; text-align:left; border:0; background:transparent; padding:10px; border-radius:12px; cursor:pointer; color:var(--ink); border-left:3px solid transparent; }
    .q-item:hover { background:var(--paper-2); }
    .q-item.on { background:var(--paper-2); border-left-color:var(--accent); }
    .q-item.unread .q-subject { font-weight:750; }
    .q-avatar { display:grid; place-items:center; width:34px; height:34px; border-radius:999px; color:#fff; font-size:12px; font-weight:800; flex:none; }
    .q-body { flex:1; min-width:0; display:grid; gap:2px; }
    .q-top { display:flex; justify-content:space-between; gap:8px; }
    .q-who { font-size:12.5px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .q-time { font-size:10.5px; white-space:nowrap; }
    .q-subject { font-size:13px; line-height:1.3; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .q-meta { display:flex; align-items:center; gap:6px; font-size:10.5px; margin-top:2px; }
    .q-meta .spacer { flex:1; }
    .q-tenant { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:88px; color:var(--ink-soft); }
    .pri-dot { width:7px; height:7px; border-radius:50%; background:var(--line); flex:none; }
    .pri-dot.urgent { background:var(--danger); box-shadow:0 0 0 3px color-mix(in srgb,var(--danger) 18%,transparent); }
    .pri-dot.high { background:var(--accent); }
    .pri-dot.normal { background:var(--gold); }
    .tag { font-size:9.5px; font-weight:750; padding:2px 6px; border-radius:99px; background:var(--paper-2); color:var(--ink-soft); white-space:nowrap; }
    .tag[data-status="new"] { background:color-mix(in srgb,#5a4fcf 16%,transparent); color:#5a4fcf; }
    .tag[data-status="open"] { background:color-mix(in srgb,var(--accent) 16%,transparent); color:var(--accent); }
    .tag[data-status="resolved"], .tag[data-status="closed"] { background:color-mix(in srgb,var(--ok) 16%,transparent); color:var(--ok); }
    .tag.breach { background:var(--danger); color:#fff; }

    /* ---- thread ---- */
    .thread { display:flex; flex-direction:column; overflow:hidden; height:100%; }
    .placeholder { flex:1; display:grid; place-content:center; justify-items:center; gap:8px; padding:40px; text-align:center; }
    .ph-icon { display:grid; place-items:center; width:58px; height:58px; border-radius:18px; background:var(--paper-2); }
    .ph-icon svg { width:26px; height:26px; fill:none; stroke:var(--ink-soft); stroke-width:1.6; stroke-linecap:round; stroke-linejoin:round; }
    .placeholder h2 { margin:6px 0 0; font-size:18px; }
    .placeholder p { margin:0; max-width:40ch; font-size:13px; }

    .thread-head { display:flex; justify-content:space-between; align-items:flex-start; gap:14px; padding:14px 18px; border-bottom:1px solid var(--line); flex-wrap:wrap; }
    .thread-head h2 { margin:0; font-size:18px; line-height:1.25; }
    .thread-head p { margin:4px 0 0; }
    .th-actions { display:flex; gap:7px; }
    .dot { opacity:.5; }

    .sla-banner { display:flex; align-items:center; gap:8px; padding:8px 18px; font-size:12px; font-weight:650; background:color-mix(in srgb,var(--ok) 10%,transparent); color:var(--ok); border-bottom:1px solid var(--line); }
    .sla-banner.breach { background:color-mix(in srgb,var(--danger) 12%,transparent); color:var(--danger); }
    .sla-dot { width:7px; height:7px; border-radius:50%; background:currentColor; }

    .messages { flex:1; overflow-y:auto; padding:18px; display:grid; gap:14px; align-content:start; }
    .msg { display:flex; gap:10px; max-width:84%; }
    .msg.agent { margin-left:auto; flex-direction:row-reverse; }
    .m-avatar { display:grid; place-items:center; width:30px; height:30px; border-radius:999px; color:#fff; font-size:11px; font-weight:800; flex:none; }
    .m-bubble { background:var(--paper-2); border:1px solid var(--line); border-radius:14px; padding:10px 13px; min-width:0; }
    .msg.agent .m-bubble { background:color-mix(in srgb,var(--accent) 9%,var(--card)); border-color:color-mix(in srgb,var(--accent) 24%,var(--line)); }
    .msg.internal .m-bubble { background:color-mix(in srgb,var(--gold) 13%,var(--card)); border-color:color-mix(in srgb,var(--gold) 38%,var(--line)); border-style:dashed; }
    .m-head { display:flex; align-items:center; gap:8px; margin-bottom:4px; flex-wrap:wrap; }
    .m-head strong { font-size:12.5px; }
    .m-time { font-size:10.5px; }
    .note-tag { font-size:9.5px; font-weight:800; letter-spacing:.07em; text-transform:uppercase; padding:2px 6px; border-radius:5px; background:var(--gold); color:#1c1914; }
    .m-body { margin:0; font-size:13.5px; line-height:1.55; white-space:pre-wrap; word-break:break-word; }

    .composer { border-top:1px solid var(--line); padding:11px 14px 13px; background:var(--card); }
    .composer.note-mode { background:color-mix(in srgb,var(--gold) 7%,var(--card)); }
    .c-tabs { display:flex; align-items:center; gap:4px; margin-bottom:8px; }
    .c-tabs > button { border:0; border-radius:8px; background:transparent; color:var(--ink-soft); padding:6px 11px; font-size:12px; font-weight:750; cursor:pointer; }
    .c-tabs > button.on { background:var(--paper-2); color:var(--ink); }
    .c-tools { margin-left:auto; }
    .macro-wrap { position:relative; }
    .macro-btn { border:1px solid var(--line); border-radius:9px; background:var(--card); color:var(--ink-soft); padding:6px 10px; font-size:11.5px; font-weight:700; cursor:pointer; }
    .macro-btn:hover { border-color:var(--accent); color:var(--accent); }
    .macro-panel { position:absolute; right:0; bottom:calc(100% + 6px); width:340px; max-height:300px; overflow-y:auto; background:var(--card); border:1px solid var(--line); border-radius:14px; box-shadow:var(--shadow); padding:5px; z-index:20; }
    .macro-panel button { display:block; width:100%; text-align:left; border:0; background:transparent; padding:9px 10px; border-radius:10px; cursor:pointer; color:var(--ink); }
    .macro-panel button:hover { background:var(--paper-2); }
    .macro-panel strong { font-size:12.5px; }
    .macro-panel code { font-size:10px; margin-left:6px; padding:1px 5px; border-radius:5px; background:var(--paper-2); }
    .macro-panel small { display:block; margin-top:3px; font-size:11px; line-height:1.4; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; line-clamp:2; -webkit-box-orient:vertical; }

    .composer textarea { width:100%; border:1px solid var(--line); border-radius:12px; padding:10px 12px; background:var(--card); color:var(--ink); resize:vertical; min-height:72px; font-size:13.5px; line-height:1.5; }
    .composer textarea:focus { outline:2px solid color-mix(in srgb,var(--accent) 45%,transparent); outline-offset:1px; border-color:var(--accent); }
    .c-foot { display:flex; justify-content:space-between; align-items:center; margin-top:8px; gap:10px; flex-wrap:wrap; }
    .c-buttons { display:flex; gap:7px; margin-left:auto; }
    .tiny { font-size:10.5px; }

    /* ---- context ---- */
    .context { padding:14px 15px; overflow-y:auto; height:100%; }
    .context h3 { margin:0 0 9px; font-size:10.5px; letter-spacing:.11em; text-transform:uppercase; color:var(--ink-soft); font-family:inherit; font-weight:800; }
    .context h3.spaced { margin-top:18px; }
    .ctl { display:grid; gap:4px; margin-bottom:9px; }
    .ctl span { font-size:11px; font-weight:650; color:var(--ink-soft); }
    .ctl select { border:1px solid var(--line); border-radius:10px; padding:8px 9px; background:var(--card); color:var(--ink); font-size:12.5px; width:100%; }
    .facts { display:grid; gap:7px; margin-top:14px; padding-top:13px; border-top:1px solid var(--line); font-size:12px; }
    .facts > div { display:flex; justify-content:space-between; gap:10px; }
    .facts strong { font-weight:700; text-align:right; }
    .stars { color:var(--gold); letter-spacing:1px; }
    .tag-row { display:flex; flex-wrap:wrap; gap:5px; margin-top:12px; }
    .party { display:flex; align-items:center; gap:9px; margin-bottom:9px; }
    .party strong { display:block; font-size:13px; }
    .party small { display:block; font-size:11px; }
    .avatar { display:grid; place-items:center; width:32px; height:32px; border-radius:999px; color:#fff; font-size:11.5px; font-weight:800; flex:none; }
    .avatar.sq { border-radius:9px; }
    .linked { list-style:none; margin:0; padding:0; display:grid; gap:7px; font-size:12px; }
    .linked li { display:flex; gap:8px; align-items:flex-start; line-height:1.4; }
    .t-status { width:8px; height:8px; border-radius:3px; background:var(--line); margin-top:4px; flex:none; }
    .t-status[data-status="in_progress"] { background:var(--accent); }
    .t-status[data-status="blocked"] { background:var(--danger); }
    .t-status[data-status="review"] { background:var(--gold); }
    .t-status[data-status="done"] { background:var(--ok); }

    .empty-note { padding:28px 14px; text-align:center; font-size:13px; }
    .skeleton { background:linear-gradient(90deg,var(--paper-2),var(--card),var(--paper-2)); background-size:200% 100%; animation:sd-shimmer 1.2s infinite; border-radius:12px; }
    @keyframes sd-shimmer { to { background-position:-200% 0; } }

    /* ---- modal ---- */
    .modal-backdrop { position:fixed; inset:0; background:rgba(10,8,5,.5); display:grid; place-items:center; padding:20px; z-index:60; backdrop-filter:blur(2px); }
    .modal { width:min(640px,100%); max-height:88vh; overflow-y:auto; padding:22px 24px; }
    .modal h2 { margin:0; font-size:21px; }
    .modal > p { margin:5px 0 16px; }
    .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .field { display:grid; gap:5px; }
    .field.full { grid-column:1 / -1; }
    .field span { font-size:11.5px; font-weight:650; color:var(--ink-soft); }
    .field input, .field select, .field textarea { border:1px solid var(--line); border-radius:11px; padding:10px 11px; background:var(--card); color:var(--ink); font-size:13px; width:100%; }
    .field textarea { resize:vertical; }
    .modal-foot { display:flex; justify-content:flex-end; gap:9px; margin-top:18px; }

    @media (max-width:1280px) {
      .desk { grid-template-columns:300px minmax(0,1fr); height:auto; }
      .context { grid-column:1 / -1; height:auto; }
      .queue, .thread { height:620px; }
    }
    @media (max-width:860px) {
      .desk { grid-template-columns:1fr; }
      .queue { height:400px; }
      .form-grid { grid-template-columns:1fr; }
    }
  `],
})
export class AdminSupportTicketsComponent {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly statuses = TICKET_STATUSES;
  readonly priorities = TICKET_PRIORITIES;
  readonly categories = TICKET_CATEGORIES;
  readonly channels = TICKET_CHANNELS;
  readonly quickFilters: { value: QuickFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'open', label: 'Open' },
    { value: 'unassigned', label: 'Unassigned' },
    { value: 'breached', label: 'Breached' },
    { value: 'resolved', label: 'Resolved' },
  ];

  // Template helpers
  readonly initials = initials;
  readonly avatarColor = avatarColor;
  readonly relativeTime = relativeTime;
  readonly clockTime = clockTime;
  readonly statusLabel = statusLabel;
  readonly priorityLabel = priorityLabel;
  readonly categoryLabel = categoryLabel;
  readonly channelLabel = channelLabel;

  loading = signal(true);
  error = signal('');
  tickets = signal<SupportTicket[]>([]);
  summary = signal<SupportTicketSummary | null>(null);
  agents = signal<SupportAgent[]>([]);
  cannedReplies = signal<SupportCannedReply[]>([]);

  selectedId = signal<number | null>(null);
  detail = signal<SupportTicket | null>(null);
  selected = computed(() => this.selectedId() !== null);

  quick = signal<QuickFilter>('all');
  search = '';
  priority = 'all';
  category = 'all';
  assignee = 'all';

  mode = signal<'public' | 'internal'>('public');
  draft = '';
  sending = signal(false);
  macrosOpen = signal(false);

  composerOpen = signal(false);
  creating = signal(false);
  formError = signal('');
  form: {
    subject: string; body: string; requester_name: string; requester_email: string;
    priority: TicketPriority; category: TicketCategory; channel: string; assignee_id: number | null;
  } = this.blankForm();

  visibleMessages = computed(() => this.detail()?.messages ?? []);

  constructor() {
    this.api.supportAgents().subscribe({ next: (r) => this.agents.set(r.data), error: () => {} });
    this.api.supportCannedReplies().subscribe({ next: (r) => this.cannedReplies.set(r.data), error: () => {} });

    const deepLink = Number(this.route.snapshot.queryParamMap.get('ticket'));
    this.reload(Number.isFinite(deepLink) && deepLink > 0 ? deepLink : undefined);
  }

  // ------------------------------------------------------------- loading

  reload(preselect?: number) {
    this.loading.set(true);
    this.error.set('');

    const params: Record<string, string | number | boolean> = { per_page: 50 };
    if (this.search.trim()) params['q'] = this.search.trim();
    if (this.priority !== 'all') params['priority'] = this.priority;
    if (this.category !== 'all') params['category'] = this.category;
    if (this.assignee !== 'all') params['assignee'] = this.assignee;

    const quick = this.quick();
    if (quick === 'open' || quick === 'unassigned') params['status'] = 'open';
    if (quick === 'resolved') params['status'] = 'resolved';
    if (quick === 'unassigned') params['assignee'] = 'unassigned';
    if (quick === 'breached') params['breached'] = true;

    this.api.supportTickets(params).subscribe({
      next: (res) => {
        this.tickets.set(res.data);
        this.summary.set(res.summary);
        this.loading.set(false);

        const target = preselect ?? this.selectedId() ?? res.data[0]?.id ?? null;
        if (target && res.data.some((t) => t.id === target)) this.select(target);
        else if (res.data.length) this.select(res.data[0].id);
        else {
          this.selectedId.set(null);
          this.detail.set(null);
        }
      },
      error: () => {
        this.error.set('Could not load tickets. Is the API running?');
        this.loading.set(false);
      },
    });
  }

  select(id: number) {
    if (this.selectedId() === id && this.detail()?.id === id) return;
    this.selectedId.set(id);
    this.detail.set(null);
    this.draft = '';
    this.mode.set('public');
    this.macrosOpen.set(false);
    this.router.navigate([], { queryParams: { ticket: id }, queryParamsHandling: 'merge', replaceUrl: true });
    this.refreshDetail();
  }

  refreshDetail() {
    const id = this.selectedId();
    if (!id) return;
    this.api.supportTicket(id).subscribe({
      next: (res) => this.detail.set(res.data),
      error: () => this.error.set('Could not open that ticket.'),
    });
  }

  setQuick(value: QuickFilter) {
    this.quick.set(value);
    this.reload();
  }

  countFor(value: QuickFilter): number | null {
    const s = this.summary();
    if (!s) return null;
    switch (value) {
      case 'all': return s.all;
      case 'open': return s.open;
      case 'unassigned': return s.unassigned;
      case 'breached': return s.breached;
      case 'resolved': return s.resolved;
      default: return null;
    }
  }

  // ------------------------------------------------------------ mutations

  patch(payload: Record<string, unknown>) {
    const id = this.selectedId();
    if (!id) return;
    // Optimistic: reflect in the detail pane immediately.
    const current = this.detail();
    if (current) this.detail.set({ ...current, ...(payload as Partial<SupportTicket>) });

    this.api.updateSupportTicket(id, payload).subscribe({
      next: (res) => {
        this.detail.set({ ...res.data, messages: res.data.messages ?? current?.messages ?? [] });
        this.mergeIntoList(res.data);
      },
      error: () => {
        this.error.set('Update failed.');
        this.refreshDetail();
      },
    });
  }

  send(thenStatus?: TicketStatus) {
    const id = this.selectedId();
    const body = this.draft.trim();
    if (!id || !body || this.sending()) return;

    this.sending.set(true);
    const payload: Record<string, unknown> = { body, visibility: this.mode() };
    if (thenStatus) payload['status'] = thenStatus;

    this.api.replySupportTicket(id, payload).subscribe({
      next: (res) => {
        this.detail.set(res.data);
        this.mergeIntoList(res.data);
        this.draft = '';
        this.sending.set(false);
        this.mode.set('public');
      },
      error: () => {
        this.error.set('Reply could not be sent.');
        this.sending.set(false);
      },
    });
  }

  applyMacro(reply: SupportCannedReply) {
    this.draft = this.draft.trim() ? `${this.draft.trim()}\n\n${reply.body}` : reply.body;
    this.macrosOpen.set(false);
  }

  openComposer() {
    this.form = this.blankForm();
    this.formError.set('');
    this.composerOpen.set(true);
  }

  createTicket() {
    if (!this.form.subject.trim() || !this.form.body.trim() || !this.form.requester_name.trim()) {
      this.formError.set('Subject, requester name and the request body are required.');
      return;
    }
    this.creating.set(true);
    this.api.createSupportTicket({ ...this.form }).subscribe({
      next: (res) => {
        this.creating.set(false);
        this.composerOpen.set(false);
        this.reload(res.data.id);
      },
      error: () => {
        this.creating.set(false);
        this.formError.set('Could not create the ticket.');
      },
    });
  }

  // -------------------------------------------------------------- display

  slaBanner(): { text: string; breached: boolean } | null {
    const d = this.detail();
    if (!d) return null;
    if (d.status === 'resolved' || d.status === 'closed') {
      return { text: `Closed out · first reply ${this.firstReplyLabel(d)}`, breached: false };
    }
    if (d.first_response_at) {
      return d.sla_breached
        ? { text: `First reply took ${this.firstReplyLabel(d)} — past the response target`, breached: true }
        : { text: `First reply sent in ${this.firstReplyLabel(d)} — within target`, breached: false };
    }
    if (d.sla_breached) return { text: 'First-response SLA breached — reply as a priority', breached: true };
    const left = d.sla_minutes_remaining;
    if (left === null || left === undefined) return null;
    return left < 0
      ? { text: `First-response SLA overdue by ${durationLabel(left)}`, breached: true }
      : { text: `${durationLabel(left)} left to hit the first-response target`, breached: false };
  }

  firstReplyLabel(t: SupportTicket): string {
    if (!t.first_response_at) return 'pending';
    const mins = (Date.parse(t.first_response_at) - Date.parse(t.created_at)) / 60000;
    return durationLabel(mins);
  }

  starString(rating: number): string {
    return '★★★★★'.slice(0, rating) + '☆☆☆☆☆'.slice(0, 5 - rating);
  }

  private mergeIntoList(ticket: SupportTicket) {
    this.tickets.update((list) => list.map((t) => (t.id === ticket.id ? { ...t, ...ticket, messages: undefined } : t)));
  }

  private blankForm() {
    return {
      subject: '',
      body: '',
      requester_name: '',
      requester_email: '',
      priority: 'normal' as TicketPriority,
      category: 'other' as TicketCategory,
      channel: 'phone',
      assignee_id: null as number | null,
    };
  }
}
