import {
  ChatStatus,
  GuideStatus,
  TaskStatus,
  TicketCategory,
  TicketChannel,
  TicketPriority,
  TicketStatus,
} from '../../core/models';

// --------------------------------------------------------------- vocabulary

export const TICKET_STATUSES: { value: TicketStatus; label: string; tone: string }[] = [
  { value: 'new', label: 'New', tone: 'info' },
  { value: 'open', label: 'Open', tone: 'warn' },
  { value: 'pending', label: 'Awaiting reply', tone: 'muted' },
  { value: 'on_hold', label: 'On hold', tone: 'muted' },
  { value: 'resolved', label: 'Resolved', tone: 'ok' },
  { value: 'closed', label: 'Closed', tone: 'muted' },
];

export const TICKET_PRIORITIES: { value: TicketPriority; label: string }[] = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Low' },
];

export const TICKET_CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: 'billing', label: 'Billing' },
  { value: 'payouts', label: 'Payouts' },
  { value: 'orders', label: 'Orders' },
  { value: 'catalog', label: 'Catalog' },
  { value: 'technical', label: 'Technical' },
  { value: 'account', label: 'Account' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'other', label: 'Other' },
];

export const TICKET_CHANNELS: { value: TicketChannel; label: string }[] = [
  { value: 'portal', label: 'Portal' },
  { value: 'email', label: 'Email' },
  { value: 'chat', label: 'Live chat' },
  { value: 'phone', label: 'Phone' },
  { value: 'whatsapp', label: 'WhatsApp' },
];

export const TASK_COLUMNS: { value: TaskStatus; label: string; accent: string }[] = [
  { value: 'todo', label: 'To do', accent: '#8e8574' },
  { value: 'in_progress', label: 'In progress', accent: '#c45c26' },
  { value: 'blocked', label: 'Blocked', accent: '#9b2c2c' },
  { value: 'review', label: 'In review', accent: '#c9a227' },
  { value: 'done', label: 'Done', accent: '#1f4b3a' },
];

export const GUIDE_STATUSES: { value: GuideStatus; label: string }[] = [
  { value: 'published', label: 'Published' },
  { value: 'review', label: 'In review' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
];

export const label = <T extends string>(list: { value: T; label: string }[], value: T | null | undefined): string =>
  list.find((i) => i.value === value)?.label ?? String(value ?? '—');

export const statusLabel = (s: TicketStatus) => label(TICKET_STATUSES, s);
export const priorityLabel = (p: TicketPriority) => label(TICKET_PRIORITIES, p);
export const categoryLabel = (c: TicketCategory) => label(TICKET_CATEGORIES, c);
export const channelLabel = (c: TicketChannel) => label(TICKET_CHANNELS, c);

export const chatStatusLabel = (s: ChatStatus) =>
  ({ queued: 'Waiting', active: 'Live', ended: 'Ended' })[s] ?? s;

// ------------------------------------------------------------------ helpers

export function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join('') || '?';
}

/** Deterministic pastel-ish avatar colour derived from the name. */
export function avatarColor(name: string | null | undefined): string {
  const palette = ['#c45c26', '#1f4b3a', '#c9a227', '#5a4fcf', '#2f7d8f', '#9b2c2c', '#7a5c2e'];
  let hash = 0;
  for (const ch of name ?? '') hash = (hash * 31 + ch.charCodeAt(0)) % 9973;
  return palette[hash % palette.length];
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const diff = Date.now() - then;
  const future = diff < 0;
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  let text: string;
  if (mins < 1) text = 'just now';
  else if (mins < 60) text = `${mins}m`;
  else if (mins < 60 * 24) text = `${Math.round(mins / 60)}h`;
  else if (mins < 60 * 24 * 30) text = `${Math.round(mins / (60 * 24))}d`;
  else text = `${Math.round(mins / (60 * 24 * 30))}mo`;

  if (text === 'just now') return text;
  return future ? `in ${text}` : `${text} ago`;
}

export function clockTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function durationLabel(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return '—';
  const abs = Math.abs(minutes);
  if (abs < 60) return `${Math.round(abs)}m`;
  if (abs < 60 * 24) return `${(abs / 60).toFixed(1)}h`;
  return `${Math.round(abs / 60 / 24)}d`;
}

/**
 * Very small markdown subset renderer used for help-centre guides:
 * headings, bold, italic, inline code, fenced code, lists, blockquotes,
 * tables and paragraphs. Input is escaped first, so it is safe to bind.
 */
export function renderGuide(markdown: string | null | undefined): string {
  if (!markdown) return '';
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (t: string) =>
    esc(t)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');

  const lines = markdown.replace(/\r/g, '').split('\n');
  const out: string[] = [];
  let list: string[] | null = null;
  let table: string[][] | null = null;
  let code: string[] | null = null;

  const flushList = () => {
    if (list?.length) out.push(`<ul>${list.map((i) => `<li>${i}</li>`).join('')}</ul>`);
    list = null;
  };
  const flushTable = () => {
    if (table?.length) {
      const [head, ...rows] = table;
      out.push(
        `<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead>` +
          `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`,
      );
    }
    table = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.startsWith('```')) {
      if (code) {
        out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`);
        code = null;
      } else {
        flushList();
        flushTable();
        code = [];
      }
      continue;
    }
    if (code) {
      code.push(raw);
      continue;
    }

    if (/^\|(.+)\|$/.test(line)) {
      const cells = line.slice(1, -1).split('|').map((c) => c.trim());
      if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue; // separator row
      flushList();
      (table ??= []).push(cells);
      continue;
    }
    flushTable();

    if (!line.trim()) {
      flushList();
      continue;
    }
    if (/^#{1,4}\s/.test(line)) {
      flushList();
      const level = Math.min(4, line.match(/^#+/)![0].length);
      out.push(`<h${level + 1}>${inline(line.replace(/^#+\s*/, ''))}</h${level + 1}>`);
      continue;
    }
    if (/^>\s?/.test(line)) {
      flushList();
      out.push(`<blockquote>${inline(line.replace(/^>\s?/, ''))}</blockquote>`);
      continue;
    }
    if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      (list ??= []).push(inline(line.replace(/^([-*]|\d+\.)\s+/, '')));
      continue;
    }
    flushList();
    out.push(`<p>${inline(line)}</p>`);
  }

  flushList();
  flushTable();
  if (code) out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`);

  return out.join('');
}
