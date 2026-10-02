import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import {
  HelpArticle,
  HelpCategory,
  SupportChat,
  SupportTask,
  SupportTicket,
  TenantSupportOverview,
} from '../../core/models';
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  avatarColor,
  categoryLabel,
  clockTime,
  initials,
  priorityLabel,
  relativeTime,
  renderGuide,
  statusLabel,
} from '../support/support-shared';

type Tab = 'tickets' | 'chat' | 'tasks' | 'guides';

@Component({
  selector: 'app-tenant-support',
  imports: [FormsModule, DatePipe],
  template: `
    <header class="page-head">
      <div>
        <p class="eyebrow">Support</p>
        <h1>Help centre</h1>
        <p class="intro muted">
          Raise a request, chat with the MarketHub team, track what is waiting on you, and read the guides.
        </p>
      </div>
      @if (overview(); as o) {
        <div class="head-stats">
          <span class="stat"><strong>{{ o.tickets.open }}</strong> open requests</span>
          <span class="stat"><strong>{{ o.tasks.open }}</strong> tasks to do</span>
          <span class="stat"><strong>{{ o.guides.published }}</strong> guides</span>
        </div>
      }
    </header>

    <nav class="tabs">
      @for (t of tabs; track t.value) {
        <button type="button" [class.on]="tab() === t.value" (click)="setTab(t.value)">
          {{ t.label }}
          @if (badge(t.value); as b) { <i>{{ b }}</i> }
        </button>
      }
    </nav>

    @if (error()) { <p class="err">{{ error() }}</p> }

    <!-- ============================================================ tickets -->
    @if (tab() === 'tickets') {
      <section class="pane two-col">
        <div class="list-col">
          <div class="col-head">
            <h2>Your requests</h2>
            <button class="btn accent sm" type="button" (click)="composing.set(true)">New request</button>
          </div>

          @if (!tickets().length) {
            <div class="card empty">
              <h3>No requests yet</h3>
              <p class="muted">Anything you raise here reaches the MarketHub support team directly.</p>
              <button class="btn accent" type="button" (click)="composing.set(true)">Raise a request</button>
            </div>
          }

          @for (t of tickets(); track t.id) {
            <button type="button" class="t-row card" [class.on]="ticket()?.id === t.id" (click)="openTicket(t.id)">
              <div class="t-head">
                <span class="ref">{{ t.reference }}</span>
                <span class="st" [attr.data-tone]="toneFor(t.status)">{{ statusLabel(t.status) }}</span>
                <span class="spacer"></span>
                <span class="muted tiny">{{ relativeTime(t.last_reply_at || t.created_at) }}</span>
              </div>
              <h3>{{ t.subject }}</h3>
              <div class="t-foot">
                <span class="chip">{{ categoryLabel(t.category) }}</span>
                <span class="chip soft">{{ priorityLabel(t.priority) }}</span>
                @if (t.assignee) { <span class="muted tiny">with {{ t.assignee.name }}</span> }
              </div>
            </button>
          }
        </div>

        <div class="detail-col">
          @if (ticket(); as t) {
            <article class="card thread-card">
              <header class="th-head">
                <div>
                  <p class="muted tiny">{{ t.reference }} · opened {{ relativeTime(t.created_at) }}</p>
                  <h2>{{ t.subject }}</h2>
                </div>
                <span class="st big" [attr.data-tone]="toneFor(t.status)">{{ statusLabel(t.status) }}</span>
              </header>

              <div class="thread">
                @for (m of t.messages || []; track m.id) {
                  @if (m.author_role === 'system') {
                    <p class="system-line">{{ m.body }}</p>
                  } @else {
                    <div class="msg" [class.mine]="m.author_role === 'requester'">
                      <span class="m-avatar" [style.background]="avatarColor(m.author_name)">{{ initials(m.author_name) }}</span>
                      <div class="m-body">
                        <p class="m-who">{{ m.author_name }} <span class="muted tiny">· {{ clockTime(m.created_at) }}</span></p>
                        <div class="m-text">{{ m.body }}</div>
                      </div>
                    </div>
                  }
                }
              </div>

              @if (t.status === 'resolved' || t.status === 'closed') {
                @if (!t.satisfaction) {
                  <div class="rate-box">
                    <p>How did we do?</p>
                    <div class="stars">
                      @for (n of [5,4,3,2,1]; track n) {
                        <button type="button" (click)="rate(t.id, n)" [attr.aria-label]="n + ' stars'">★</button>
                      }
                    </div>
                  </div>
                } @else {
                  <p class="rated muted">You rated this {{ t.satisfaction }}/5 — thank you.</p>
                }
              }

              <footer class="reply">
                <textarea [(ngModel)]="replyBody" rows="3" placeholder="Add a reply…"></textarea>
                <div class="reply-foot">
                  <span class="muted tiny">Replying reopens a resolved request.</span>
                  <button class="btn accent sm" type="button" [disabled]="!replyBody.trim() || sending()" (click)="sendReply()">
                    {{ sending() ? 'Sending…' : 'Send reply' }}
                  </button>
                </div>
              </footer>
            </article>
          } @else {
            <div class="card empty tall">
              <h3>Select a request</h3>
              <p class="muted">Pick one on the left to read the conversation.</p>
            </div>
          }
        </div>
      </section>
    }

    <!-- =============================================================== chat -->
    @if (tab() === 'chat') {
      <section class="pane">
        <div class="card chat-card">
          @if (chat(); as c) {
            <header class="chat-head">
              <span class="pulse" [class.live]="c.status === 'active'"></span>
              <div>
                <h2>{{ c.agent ? c.agent.name : 'MarketHub support' }}</h2>
                <p class="muted tiny">
                  @switch (c.status) {
                    @case ('active') { Connected — typically replies in a couple of minutes }
                    @case ('queued') { You are in the queue. An agent will join shortly. }
                    @default { This conversation has ended. Send a message to start a new one. }
                  }
                </p>
              </div>
              @if (c.agent) {
                <span class="avatar" [style.background]="avatarColor(c.agent.name)">{{ initials(c.agent.name) }}</span>
              }
            </header>

            <div class="chat-stream">
              @for (m of c.messages || []; track m.id) {
                @if (m.author_role === 'system') {
                  <p class="system-line">{{ m.body }}</p>
                } @else {
                  <div class="bubble-row" [class.mine]="m.author_role === 'visitor'">
                    <div class="bubble" [class.bot]="m.author_role === 'bot'">
                      <p>{{ m.body }}</p>
                      <span class="b-time">{{ m.author_name }} · {{ clockTime(m.created_at) }}</span>
                    </div>
                  </div>
                }
              }
            </div>

            <footer class="chat-say">
              <textarea [(ngModel)]="chatDraft" rows="1" placeholder="Type a message…" (keydown.enter)="onChatEnter($event)"></textarea>
              <button class="btn accent" type="button" [disabled]="!chatDraft.trim() || sending()" (click)="sendChat()">Send</button>
            </footer>
          } @else {
            <div class="empty tall"><h3>Starting a conversation…</h3><p class="muted">Hang tight.</p></div>
          }
        </div>
      </section>
    }

    <!-- ============================================================== tasks -->
    @if (tab() === 'tasks') {
      <section class="pane">
        @if (!tasks().length) {
          <div class="card empty"><h3>Nothing waiting on you</h3><p class="muted">When support needs an action from your team it shows up here.</p></div>
        }
        <div class="task-grid">
          @for (t of tasks(); track t.id) {
            <article class="card task" [class.done]="t.status === 'done'" [class.overdue]="t.overdue">
              <div class="t-top">
                <span class="pri" [class]="t.priority">{{ priorityLabel(t.priority) }}</span>
                @if (t.overdue) { <span class="late-tag">Overdue</span> }
                <span class="spacer"></span>
                @if (t.due_at) { <span class="muted tiny">due {{ t.due_at | date: 'MMM d' }}</span> }
              </div>
              <h3>{{ t.title }}</h3>
              @if (t.description) { <p class="muted small">{{ t.description }}</p> }
              @if (t.checklist.length) {
                <ul class="checks">
                  @for (c of t.checklist; track c.label) {
                    <li [class.done]="c.done"><span class="tick">{{ c.done ? '✓' : '○' }}</span>{{ c.label }}</li>
                  }
                </ul>
              }
              <div class="t-actions">
                @if (t.status !== 'done') {
                  @if (t.status === 'todo') {
                    <button class="btn ghost sm" type="button" (click)="advance(t, 'in_progress')">Start</button>
                  }
                  <button class="btn accent sm" type="button" (click)="advance(t, 'done')">Mark done</button>
                } @else {
                  <span class="done-tag">Completed</span>
                }
              </div>
            </article>
          }
        </div>
      </section>
    }

    <!-- ============================================================= guides -->
    @if (tab() === 'guides') {
      <section class="pane">
        @if (reading(); as g) {
          <article class="card reader">
            <button type="button" class="back" (click)="reading.set(null)">← All guides</button>
            <p class="muted tiny">{{ g.category?.name }} · {{ g.read_minutes }} min read</p>
            <h2>{{ g.title }}</h2>
            <div class="guide-body" [innerHTML]="renderGuide(g.body)"></div>
            <footer class="feedback">
              @if (rated()) {
                <p class="muted">Thanks for the feedback.</p>
              } @else {
                <p>Was this helpful?</p>
                <button class="btn ghost sm" type="button" (click)="rateGuide(g, true)">Yes</button>
                <button class="btn ghost sm" type="button" (click)="rateGuide(g, false)">Not really</button>
              }
            </footer>
          </article>
        } @else {
          <div class="guide-search">
            <input [(ngModel)]="guideQuery" (keyup.enter)="loadGuides()" placeholder="Search the help centre…" aria-label="Search guides" />
          </div>
          @for (c of guideCategories(); track c.id) {
            @if (articlesIn(c.id).length) {
              <div class="g-group">
                <h2>{{ c.name }}</h2>
                @if (c.description) { <p class="muted small">{{ c.description }}</p> }
                <div class="g-grid">
                  @for (a of articlesIn(c.id); track a.id) {
                    <button type="button" class="card g-card" (click)="read(a)">
                      @if (a.is_pinned) { <span class="g-pin">★ Popular</span> }
                      <h3>{{ a.title }}</h3>
                      <p class="muted small">{{ a.excerpt }}</p>
                      <span class="muted tiny">{{ a.read_minutes }} min read</span>
                    </button>
                  }
                </div>
              </div>
            }
          }
          @if (!guideArticles().length) {
            <div class="card empty"><h3>No guides matched</h3><p class="muted">Try a different search term.</p></div>
          }
        }
      </section>
    }

    <!-- ========================================================== composer -->
    @if (composing()) {
      <div class="modal-backdrop" (click)="composing.set(false)">
        <div class="modal card" (click)="$event.stopPropagation()">
          <header><h2>New support request</h2><button type="button" class="close" (click)="composing.set(false)">×</button></header>
          <label class="field"><span>Subject</span><input [(ngModel)]="draft.subject" placeholder="Short summary" /></label>
          <div class="grid2">
            <label class="field">
              <span>Topic</span>
              <select [(ngModel)]="draft.category">
                @for (c of categories; track c.value) { <option [value]="c.value">{{ c.label }}</option> }
              </select>
            </label>
            <label class="field">
              <span>Priority</span>
              <select [(ngModel)]="draft.priority">
                @for (p of priorities; track p.value) { <option [value]="p.value">{{ p.label }}</option> }
              </select>
            </label>
          </div>
          <label class="field"><span>Details</span><textarea [(ngModel)]="draft.body" rows="6" placeholder="What is happening? Include order or product references where you can."></textarea></label>
          @if (formError()) { <p class="err">{{ formError() }}</p> }
          <footer>
            <button class="btn ghost" type="button" (click)="composing.set(false)">Cancel</button>
            <button class="btn accent" type="button" [disabled]="sending()" (click)="submit()">{{ sending() ? 'Sending…' : 'Send request' }}</button>
          </footer>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display:block; max-width:1340px; margin:0 auto; }

    .page-head { display:flex; justify-content:space-between; align-items:flex-end; gap:20px; flex-wrap:wrap; margin-bottom:14px; }
    .eyebrow { margin:0 0 5px; color:var(--accent); font-size:10px; font-weight:800; letter-spacing:.15em; text-transform:uppercase; }
    h1 { margin:0; font-size:clamp(24px,2.6vw,32px); }
    .intro { margin:6px 0 0; font-size:13.5px; max-width:60ch; }
    .head-stats { display:flex; gap:18px; font-size:12.5px; color:var(--ink-soft); }
    .head-stats strong { display:block; font-family:Fraunces,serif; font-size:20px; color:var(--ink); }
    .stat.sla strong { font-size:16px; }

    .tabs { display:flex; gap:4px; border-bottom:1px solid var(--line); margin-bottom:18px; }
    .tabs button { display:inline-flex; align-items:center; gap:6px; border:0; background:transparent; color:var(--ink-soft); padding:10px 15px; font-size:13px; font-weight:750; cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-1px; }
    .tabs button.on { color:var(--ink); border-bottom-color:var(--accent); }
    .tabs i { font-style:normal; font-size:10px; font-weight:800; padding:1px 6px; border-radius:99px; background:var(--accent); color:#fff; }

    .btn { padding:10px 16px; font-size:13px; }
    .btn.sm { padding:7px 12px; font-size:12px; border-radius:10px; }
    .err { color:var(--danger); font-size:13px; margin:0 0 10px; }
    .small { font-size:12.5px; }
    .tiny { font-size:11px; }
    .spacer { flex:1; }

    .pane { display:block; }
    .two-col { display:grid; grid-template-columns:330px minmax(0,1fr); gap:14px; align-items:start; }
    .col-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
    .col-head h2 { margin:0; font-size:16px; }
    .list-col { display:grid; gap:9px; align-content:start; }

    .t-row { text-align:left; border:1px solid var(--line); cursor:pointer; padding:12px 14px; display:grid; gap:6px; color:var(--ink); }
    .t-row:hover { border-color:var(--accent); }
    .t-row.on { border-color:var(--accent); box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 18%,transparent); }
    .t-head { display:flex; align-items:center; gap:7px; }
    .ref { font-family:ui-monospace,Menlo,monospace; font-size:10.5px; color:var(--ink-soft); }
    .st { font-size:9.5px; font-weight:800; letter-spacing:.07em; text-transform:uppercase; padding:3px 7px; border-radius:6px; background:var(--paper-2); color:var(--ink-soft); }
    .st[data-tone="accent"] { background:color-mix(in srgb,var(--accent) 16%,transparent); color:var(--accent); }
    .st[data-tone="ok"] { background:color-mix(in srgb,var(--ok) 16%,transparent); color:var(--ok); }
    .st[data-tone="gold"] { background:color-mix(in srgb,var(--gold) 22%,transparent); color:#8a6d11; }
    .st.big { padding:5px 10px; font-size:10.5px; }
    .t-row h3 { margin:0; font-size:13.5px; line-height:1.35; font-family:inherit; font-weight:650; }
    .t-foot { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
    .chip { font-size:10px; font-weight:700; padding:3px 8px; border-radius:99px; background:color-mix(in srgb,var(--accent) 12%,transparent); color:var(--accent); }
    .chip.soft { background:var(--paper-2); color:var(--ink-soft); }

    .thread-card { padding:0; overflow:hidden; display:flex; flex-direction:column; }
    .th-head { display:flex; justify-content:space-between; align-items:flex-start; gap:14px; padding:16px 20px; border-bottom:1px solid var(--line); }
    .th-head h2 { margin:3px 0 0; font-size:19px; }
    .th-head p { margin:0; }
    .thread { padding:18px 20px; display:grid; gap:14px; max-height:50vh; overflow-y:auto; }
    .system-line { text-align:center; font-size:11px; color:var(--ink-soft); margin:0; }
    .msg { display:flex; gap:10px; }
    .msg.mine { flex-direction:row-reverse; }
    .msg.mine .m-body { background:color-mix(in srgb,var(--accent) 9%,var(--card)); border-color:color-mix(in srgb,var(--accent) 26%,transparent); }
    .m-avatar { display:grid; place-items:center; width:30px; height:30px; border-radius:999px; color:#fff; font-size:11px; font-weight:800; flex:none; }
    .m-body { flex:1; border:1px solid var(--line); border-radius:14px; padding:10px 14px; background:var(--card); min-width:0; }
    .m-who { margin:0 0 4px; font-size:12px; font-weight:750; }
    .m-text { font-size:13.5px; line-height:1.6; white-space:pre-wrap; word-break:break-word; }

    .rate-box { display:flex; align-items:center; gap:12px; padding:12px 20px; border-top:1px solid var(--line); background:var(--paper-2); }
    .rate-box p { margin:0; font-size:13px; font-weight:650; }
    .stars button { border:0; background:transparent; color:var(--line); font-size:21px; cursor:pointer; padding:0 1px; line-height:1; }
    .stars button:hover, .stars button:hover ~ button { color:var(--gold); }
    .stars { display:flex; flex-direction:row-reverse; }
    .rated { padding:12px 20px; margin:0; border-top:1px solid var(--line); font-size:12.5px; }

    .reply { border-top:1px solid var(--line); padding:12px 20px 16px; }
    .reply textarea { width:100%; border:1px solid var(--line); border-radius:12px; padding:11px 13px; background:var(--card); color:var(--ink); font-size:13.5px; resize:vertical; }
    .reply-foot { display:flex; justify-content:space-between; align-items:center; margin-top:8px; }

    /* ---- chat ---- */
    .chat-card { padding:0; overflow:hidden; display:flex; flex-direction:column; height:min(66vh,620px); }
    .chat-head { display:flex; align-items:center; gap:11px; padding:13px 18px; border-bottom:1px solid var(--line); }
    .chat-head h2 { margin:0; font-size:16px; }
    .chat-head p { margin:2px 0 0; }
    .chat-head .avatar { margin-left:auto; display:grid; place-items:center; width:34px; height:34px; border-radius:999px; color:#fff; font-size:12px; font-weight:800; }
    .pulse { width:9px; height:9px; border-radius:50%; background:var(--line); flex:none; }
    .pulse.live { background:#45a675; box-shadow:0 0 0 4px rgba(69,166,117,.16); animation:tsup-blink 2s infinite; }
    @keyframes tsup-blink { 50% { opacity:.45; } }
    .chat-stream { flex:1; overflow-y:auto; padding:18px; display:grid; gap:9px; align-content:start; }
    .bubble-row { display:flex; max-width:74%; }
    .bubble-row.mine { margin-left:auto; justify-content:flex-end; }
    .bubble { background:var(--paper-2); border-radius:16px 16px 16px 4px; padding:9px 13px; }
    .bubble.bot { background:color-mix(in srgb,#5a4fcf 10%,var(--card)); border:1px solid color-mix(in srgb,#5a4fcf 22%,transparent); }
    .bubble-row.mine .bubble { background:var(--accent); color:#fff; border-radius:16px 16px 4px 16px; }
    .bubble p { margin:0; font-size:13.5px; line-height:1.5; white-space:pre-wrap; }
    .b-time { display:block; margin-top:4px; font-size:10px; opacity:.7; }
    .chat-say { display:flex; gap:9px; align-items:flex-end; border-top:1px solid var(--line); padding:12px 16px; }
    .chat-say textarea { flex:1; border:1px solid var(--line); border-radius:14px; padding:11px 13px; background:var(--card); color:var(--ink); resize:none; min-height:44px; max-height:120px; font-size:13.5px; }

    /* ---- tasks ---- */
    .task-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(290px,1fr)); gap:13px; }
    .task { padding:15px 17px; display:flex; flex-direction:column; gap:8px; }
    .task.done { opacity:.62; }
    .task.overdue { border-color:color-mix(in srgb,var(--danger) 42%,var(--line)); }
    .t-top { display:flex; align-items:center; gap:6px; }
    .pri { font-size:9.5px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; padding:2px 7px; border-radius:5px; background:var(--paper-2); color:var(--ink-soft); }
    .pri.urgent { background:color-mix(in srgb,var(--danger) 16%,transparent); color:var(--danger); }
    .pri.high { background:color-mix(in srgb,var(--accent) 16%,transparent); color:var(--accent); }
    .late-tag { font-size:9.5px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; color:var(--danger); }
    .task h3 { margin:0; font-size:14.5px; line-height:1.35; }
    .task p { margin:0; line-height:1.5; }
    .checks { list-style:none; margin:0; padding:0; display:grid; gap:4px; }
    .checks li { display:flex; gap:7px; font-size:12px; line-height:1.4; }
    .checks li.done { color:var(--ink-soft); text-decoration:line-through; }
    .tick { color:var(--accent-2); font-weight:800; }
    .t-actions { display:flex; gap:7px; margin-top:auto; padding-top:4px; }
    .done-tag { font-size:11.5px; font-weight:750; color:var(--ok); }

    /* ---- guides ---- */
    .guide-search { margin-bottom:16px; }
    .guide-search input { width:min(460px,100%); border:1px solid var(--line); border-radius:12px; padding:12px 15px; background:var(--card); color:var(--ink); font-size:14px; }
    .g-group { margin-bottom:24px; }
    .g-group h2 { margin:0 0 3px; font-size:18px; }
    .g-group p { margin:0 0 10px; }
    .g-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:12px; }
    .g-card { text-align:left; cursor:pointer; padding:15px 17px; display:grid; gap:6px; align-content:start; color:var(--ink); border:1px solid var(--line); }
    .g-card:hover { border-color:var(--accent); transform:translateY(-1px); }
    .g-pin { font-size:9.5px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:var(--gold); }
    .g-card h3 { margin:0; font-size:14.5px; line-height:1.35; }
    .g-card p { margin:0; display:-webkit-box; -webkit-line-clamp:3; line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }

    .reader { padding:26px 30px 20px; max-width:780px; }
    .back { border:0; background:transparent; color:var(--ink-soft); font-size:12.5px; font-weight:700; cursor:pointer; padding:0; margin-bottom:12px; }
    .back:hover { color:var(--accent); }
    .reader h2 { margin:4px 0 16px; font-size:27px; line-height:1.2; }
    .guide-body { font-size:14.5px; line-height:1.72; }
    .guide-body :is(h2,h3,h4) { font-family:Fraunces,Georgia,serif; margin:22px 0 8px; line-height:1.25; }
    .guide-body h2 { font-size:20px; }
    .guide-body h3 { font-size:16.5px; }
    .guide-body p { margin:0 0 13px; }
    .guide-body ul { margin:0 0 14px; padding-left:21px; }
    .guide-body li { margin-bottom:5px; }
    .guide-body code { background:var(--paper-2); padding:1px 6px; border-radius:5px; font-size:13px; }
    .guide-body pre { background:var(--paper-2); padding:13px 15px; border-radius:12px; overflow-x:auto; margin:0 0 14px; }
    .guide-body blockquote { margin:0 0 14px; padding:10px 16px; border-left:3px solid var(--accent); background:color-mix(in srgb,var(--accent) 7%,transparent); border-radius:0 10px 10px 0; }
    .guide-body blockquote p { margin:0; }
    .guide-body table { width:100%; border-collapse:collapse; margin:0 0 16px; font-size:13px; }
    .guide-body th, .guide-body td { text-align:left; padding:8px 11px; border-bottom:1px solid var(--line); }
    .feedback { display:flex; align-items:center; gap:10px; margin-top:26px; padding-top:16px; border-top:1px solid var(--line); }
    .feedback p { margin:0; font-size:13px; font-weight:650; }

    .empty { padding:40px 26px; text-align:center; display:grid; gap:8px; justify-items:center; }
    .empty.tall { padding:70px 26px; }
    .empty h3 { margin:0; font-size:17px; }
    .empty p { margin:0; max-width:44ch; font-size:13px; }

    /* ---- modal ---- */
    .modal-backdrop { position:fixed; inset:0; background:rgba(10,8,5,.5); display:grid; place-items:center; z-index:60; padding:20px; backdrop-filter:blur(2px); }
    .modal { width:min(560px,100%); padding:20px 22px 22px; display:grid; gap:12px; max-height:90vh; overflow-y:auto; }
    .modal header { display:flex; justify-content:space-between; align-items:center; }
    .modal header h2 { margin:0; font-size:19px; }
    .close { border:0; background:transparent; font-size:24px; line-height:1; color:var(--ink-soft); cursor:pointer; }
    .field { display:grid; gap:5px; }
    .field > span { font-size:11.5px; font-weight:700; color:var(--ink-soft); }
    .field input, .field select, .field textarea { border:1px solid var(--line); border-radius:11px; padding:10px 12px; background:var(--card); color:var(--ink); font-size:13.5px; width:100%; }
    .field textarea { resize:vertical; }
    .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:11px; }
    .modal footer { display:flex; justify-content:flex-end; gap:8px; margin-top:4px; }

    @media (max-width:980px) { .two-col { grid-template-columns:1fr; } }
    @media (max-width:620px) { .grid2 { grid-template-columns:1fr; } }
  `],
})
export class TenantSupportComponent implements OnDestroy {
  private api = inject(ApiService);

  readonly tabs: { value: Tab; label: string }[] = [
    { value: 'tickets', label: 'My requests' },
    { value: 'chat', label: 'Live chat' },
    { value: 'tasks', label: 'My tasks' },
    { value: 'guides', label: 'Guides' },
  ];
  readonly categories = TICKET_CATEGORIES;
  readonly priorities = TICKET_PRIORITIES;

  readonly initials = initials;
  readonly avatarColor = avatarColor;
  readonly relativeTime = relativeTime;
  readonly clockTime = clockTime;
  readonly statusLabel = statusLabel;
  readonly priorityLabel = priorityLabel;
  readonly categoryLabel = categoryLabel;
  readonly renderGuide = renderGuide;

  tab = signal<Tab>('tickets');
  error = signal('');
  sending = signal(false);
  formError = signal('');

  overview = signal<TenantSupportOverview | null>(null);
  tickets = signal<SupportTicket[]>([]);
  ticket = signal<SupportTicket | null>(null);
  chat = signal<SupportChat | null>(null);
  tasks = signal<SupportTask[]>([]);
  guideCategories = signal<HelpCategory[]>([]);
  guideArticles = signal<HelpArticle[]>([]);
  reading = signal<HelpArticle | null>(null);
  rated = signal(false);

  composing = signal(false);
  replyBody = '';
  chatDraft = '';
  guideQuery = '';
  draft = { subject: '', category: 'technical', priority: 'normal', body: '' };

  private chatTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.api.tenantSupportOverview().subscribe({ next: (r) => this.overview.set(r.data), error: () => {} });
    this.loadTickets();
  }

  ngOnDestroy() {
    if (this.chatTimer) clearInterval(this.chatTimer);
  }

  setTab(tab: Tab) {
    this.tab.set(tab);
    if (this.chatTimer) { clearInterval(this.chatTimer); this.chatTimer = null; }

    if (tab === 'tickets' && !this.tickets().length) this.loadTickets();
    if (tab === 'chat') this.loadChat();
    if (tab === 'tasks') this.loadTasks();
    if (tab === 'guides' && !this.guideArticles().length) this.loadGuides();
  }

  badge(tab: Tab): number | null {
    const o = this.overview();
    if (!o) return null;
    if (tab === 'tickets') return o.tickets.awaiting_you || o.tickets.open || null;
    if (tab === 'tasks') return o.tasks.open || null;
    if (tab === 'chat') return o.chat.unread || null;
    return null;
  }

  toneFor(status: string): string {
    if (status === 'resolved' || status === 'closed') return 'ok';
    if (status === 'pending' || status === 'on_hold') return 'gold';
    return 'accent';
  }

  // ------------------------------------------------------------- tickets

  loadTickets() {
    this.api.tenantTickets().subscribe({
      next: (res) => {
        this.tickets.set(res.data);
        if (res.data.length && !this.ticket()) this.openTicket(res.data[0].id);
      },
      error: () => this.error.set('Could not load your requests.'),
    });
  }

  openTicket(id: number) {
    this.replyBody = '';
    this.api.tenantTicket(id).subscribe({
      next: (res) => this.ticket.set(res.data),
      error: () => this.error.set('Could not open that request.'),
    });
  }

  sendReply() {
    const t = this.ticket();
    if (!t || !this.replyBody.trim()) return;
    this.sending.set(true);
    this.api.replyTenantTicket(t.id, this.replyBody.trim()).subscribe({
      next: (res) => {
        this.ticket.set(res.data);
        this.replyBody = '';
        this.sending.set(false);
        this.loadTickets();
      },
      error: () => {
        this.sending.set(false);
        this.error.set('Reply failed to send.');
      },
    });
  }

  rate(id: number, stars: number) {
    this.api.rateTenantTicket(id, stars).subscribe({
      next: (res) => this.ticket.set(res.data),
      error: () => this.error.set('Could not save your rating.'),
    });
  }

  submit() {
    if (!this.draft.subject.trim() || !this.draft.body.trim()) {
      this.formError.set('Add a subject and some detail.');
      return;
    }
    this.sending.set(true);
    this.api.createTenantTicket({ ...this.draft, subject: this.draft.subject.trim(), body: this.draft.body.trim() }).subscribe({
      next: (res) => {
        this.sending.set(false);
        this.composing.set(false);
        this.draft = { subject: '', category: 'technical', priority: 'normal', body: '' };
        this.formError.set('');
        this.loadTickets();
        this.ticket.set(res.data);
      },
      error: () => {
        this.sending.set(false);
        this.formError.set('Could not send the request.');
      },
    });
  }

  // ---------------------------------------------------------------- chat

  loadChat() {
    this.api.tenantChat().subscribe({
      next: (res) => {
        this.chat.set(res.data);
        if (!this.chatTimer) {
          this.chatTimer = setInterval(() => {
            this.api.tenantChat().subscribe({ next: (r) => this.chat.set(r.data), error: () => {} });
          }, 9000);
        }
      },
      error: () => this.error.set('Live chat is unavailable right now.'),
    });
  }

  onChatEnter(event: Event) {
    const ke = event as KeyboardEvent;
    if (ke.shiftKey) return;
    ke.preventDefault();
    this.sendChat();
  }

  sendChat() {
    const body = this.chatDraft.trim();
    if (!body) return;
    this.sending.set(true);
    this.api.sendTenantChatMessage(body).subscribe({
      next: (res) => {
        const c = this.chat();
        if (c) this.chat.set({ ...c, messages: [...(c.messages ?? []), res.data] });
        this.chatDraft = '';
        this.sending.set(false);
      },
      error: () => {
        this.sending.set(false);
        this.error.set('Message failed to send.');
      },
    });
  }

  // --------------------------------------------------------------- tasks

  loadTasks() {
    this.api.tenantSupportTasks().subscribe({
      next: (res) => this.tasks.set(res.data),
      error: () => this.error.set('Could not load your tasks.'),
    });
  }

  advance(task: SupportTask, status: 'in_progress' | 'done') {
    this.tasks.update((list) => list.map((t) => (t.id === task.id ? { ...t, status } : t)));
    this.api.updateTenantSupportTask(task.id, { status }).subscribe({
      next: () => {
        this.loadTasks();
        this.api.tenantSupportOverview().subscribe({ next: (r) => this.overview.set(r.data), error: () => {} });
      },
      error: () => this.loadTasks(),
    });
  }

  // -------------------------------------------------------------- guides

  loadGuides() {
    const params: Record<string, string> = {};
    if (this.guideQuery.trim()) params['q'] = this.guideQuery.trim();
    this.api.tenantGuides(params).subscribe({
      next: (res) => {
        this.guideCategories.set(res.data.categories);
        this.guideArticles.set(res.data.articles);
      },
      error: () => this.error.set('Could not load the guides.'),
    });
  }

  articlesIn(categoryId: number): HelpArticle[] {
    return this.guideArticles().filter((a) => a.category_id === categoryId);
  }

  read(article: HelpArticle) {
    this.rated.set(false);
    this.api.readTenantGuide(article.id).subscribe({
      next: (res) => this.reading.set(res.data),
      error: () => this.reading.set(article),
    });
  }

  rateGuide(article: HelpArticle, helpful: boolean) {
    this.rated.set(true);
    this.api.rateTenantGuide(article.id, helpful).subscribe({ error: () => {} });
  }

  openCount = computed(() => this.tickets().filter((t) => !['resolved', 'closed'].includes(t.status)).length);
}
