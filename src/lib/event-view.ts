import type { EntryRow, EventRow, EventSnapshot, SubmissionRow } from "./event-data";

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

// "2026-10-24" → "2026.10.24 SAT"
export function formatEventDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${y}.${String(m).padStart(2, "0")}.${String(d).padStart(2, "0")} ${weekday}`;
}

export function eventMeta(event: EventRow) {
  return event.venue ? `${formatEventDate(event.event_date)} — ${event.venue}` : formatEventDate(event.event_date);
}

export const pad2 = (n: number) => String(n).padStart(2, "0");

export const performersLabel = (names: string[]) => names.join(" & ");

export function groupTag(names: string[]) {
  if (names.length >= 3) return "TEAM";
  if (names.length === 2) return "DUET";
  return null;
}

export type SlotView = {
  entry: EntryRow;
  submission: SubmissionRow | undefined;
  no: string;
  performers: string;
  mine: boolean;
};

export type SubmissionView = {
  submission: SubmissionRow;
  entries: EntryRow[];
  performers: string;
  tag: string | null;
  mine: boolean;
};

export function buildView(snapshot: EventSnapshot, mySubmissionIds: string[]) {
  const mine = new Set(mySubmissionIds);
  const submissionById = new Map(snapshot.submissions.map((s) => [s.id, s]));

  const toSlot = (entry: EntryRow): SlotView => {
    const submission = submissionById.get(entry.submission_id);
    return {
      entry,
      submission,
      no: entry.order_index ? pad2(entry.order_index) : "—",
      performers: performersLabel(submission?.performer_names ?? []),
      mine: mine.has(entry.submission_id),
    };
  };

  const ordered = (encore: boolean) =>
    snapshot.entries
      .filter((e) => e.is_encore === encore && e.order_index !== null)
      .sort((a, b) => a.order_index! - b.order_index!)
      .map(toSlot);

  const mainSlots = ordered(false);
  const encoreSlots = ordered(true);

  const submissions: SubmissionView[] = snapshot.submissions
    .filter((s) => !s.is_encore)
    .map((s) => ({
      submission: s,
      entries: snapshot.entries.filter((e) => e.submission_id === s.id),
      performers: performersLabel(s.performer_names),
      tag: groupTag(s.performer_names),
      mine: mine.has(s.id),
    }));

  return { mainSlots, encoreSlots, submissions, hasMine: snapshot.submissions.some((s) => mine.has(s.id)) };
}

// 진행 중인 순서에서 현재 · 다음 · 내 다음 차례
export function progress(slots: SlotView[]) {
  const current = slots.find((s) => s.entry.status === "PERFORMING") ?? null;
  const waiting = slots.filter((s) => s.entry.status === "SCHEDULED");
  const next = waiting[0] ?? null;
  const myNext = waiting.find((s) => s.mine) ?? null;
  const teamsBeforeMine = myNext ? waiting.filter((s) => s.entry.order_index! < myNext.entry.order_index!).length : null;
  return { current, next, myNext, teamsBeforeMine };
}

export function countSongs(snapshot: EventSnapshot, encore: boolean) {
  return snapshot.entries.filter((e) => e.is_encore === encore).length;
}
