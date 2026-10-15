"use server";

import { redirect } from "next/navigation";
import { adminEmail, requireAdmin } from "@/lib/admin";
import type { EntryRow, EventStatus } from "@/lib/event-data";
import { createAuthClient } from "@/lib/supabase/server";

// 관리자 쓰기는 모두 로그인 세션 클라이언트로 한다. 권한은 RLS(admins 등록 여부)가 다시 확인한다.

export type AdminResult<T = null> = { ok: true; data: T } | { ok: false; message: string };
export type AdminSong = { id?: string; artist: string; title: string };

const MESSAGES: Record<string, string> = {
  MAIN_SET_NOT_FINISHED: "본 공연이 5곡 이하로 남았을 때부터 앵콜을 열 수 있어요.",
  FORBIDDEN: "관리자만 할 수 있어요.",
  INVALID_INPUT: "입력한 내용을 다시 확인해 주세요.",
  duplicate: "이미 쓰고 있는 링크 주소예요. 다른 주소를 입력해 주세요.",
};

function fail(error: { message: string; code?: string }): { ok: false; message: string } {
  if (error.code === "23505") return { ok: false, message: MESSAGES.duplicate };
  const code = Object.keys(MESSAGES).find((c) => error.message.includes(c));
  return { ok: false, message: code ? MESSAGES[code] : "잠시 후 다시 시도해 주세요." };
}

const ok = <T,>(data: T): AdminResult<T> => ({ ok: true, data });

// ─── 로그인 ─────────────────────────────────────────────────

export async function signIn(loginId: string, password: string): Promise<AdminResult> {
  if (!loginId.trim() || !password) return { ok: false, message: "아이디와 비밀번호를 입력해 주세요." };
  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: adminEmail(loginId), password });
  if (error || !data.user) return { ok: false, message: "아이디 또는 비밀번호가 맞지 않아요." };

  const { data: admin } = await supabase.from("admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (!admin) {
    await supabase.auth.signOut();
    return { ok: false, message: "운영진으로 등록되지 않은 계정이에요. 회장에게 요청하세요." };
  }
  redirect("/admin");
}

export async function signOut() {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

// ─── 행사 ───────────────────────────────────────────────────

export async function createEvent(input: { title: string; eventDate: string; venue: string; publicCode: string }) {
  const { supabase } = await requireAdmin();
  const title = input.title.trim();
  const code = input.publicCode.trim();
  if (!title) return { ok: false, message: "행사 이름을 입력해 주세요." } as const;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.eventDate)) return { ok: false, message: "공연 날짜를 골라 주세요." } as const;
  if (code && !/^[A-Za-z0-9_-]{4,32}$/.test(code)) {
    return { ok: false, message: "링크 주소는 영문 · 숫자 · 하이픈으로 4~32자예요." } as const;
  }

  const { data, error } = await supabase
    .from("events")
    .insert({ title, event_date: input.eventDate, venue: input.venue.trim() || null, ...(code ? { public_code: code } : {}) })
    .select("id")
    .single();
  if (error) return fail(error);
  redirect(`/admin/events/${data.id}`);
}

// 단계는 앞으로만 간다. 앵콜 없이 끝낼 수 있도록 공연 중 → 종료도 허용한다.
const NEXT: Record<EventStatus, EventStatus[]> = {
  DRAFT: ["OPEN"],
  OPEN: ["CLOSED"],
  CLOSED: ["PUBLISHED"],
  PUBLISHED: ["LIVE"],
  LIVE: ["ENCORE", "ENDED"],
  ENCORE: ["ENDED"],
  ENDED: [],
};

export async function changeStatus(eventId: string, to: EventStatus): Promise<AdminResult> {
  const { supabase } = await requireAdmin();
  const { data: event, error } = await supabase.from("events").select("status").eq("id", eventId).single();
  if (error) return fail(error);
  if (!NEXT[event.status].includes(to)) return { ok: false, message: "지금 단계에서는 할 수 없어요. 화면을 새로고침해 주세요." };

  if (to === "LIVE") {
    // 아직 순서에 없는 곡이 있으면 먼저 알려준다
    const { count } = await supabase
      .from("performance_entries")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("is_encore", false)
      .is("order_index", null)
      .neq("status", "CANCELLED");
    if (count) return { ok: false, message: `순서에 넣지 않은 곡이 ${count}개 있어요. 순서 편성에서 먼저 넣어 주세요.` };
  }

  const update = await supabase.from("events").update({ status: to }).eq("id", eventId);
  if (update.error) return fail(update.error);

  // 공연 시작: 01번부터 공연 중으로 표시한다
  if (to === "LIVE") return advance(eventId);
  return ok(null);
}

// ─── 신청 (현장 추가 · 수정 · 삭제) ─────────────────────────

function cleanSongs(songs: AdminSong[]) {
  return songs.map((s) => ({ ...s, artist: s.artist.trim(), title: s.title.trim() })).filter((s) => s.artist || s.title);
}

function validate(performers: string[], songs: AdminSong[]) {
  if (performers.length === 0) return "부르는 사람 이름을 입력해 주세요.";
  if (songs.length === 0) return "곡을 하나 이상 넣어 주세요.";
  if (songs.some((s) => !s.artist || !s.title)) return "아티스트와 곡 제목을 모두 입력해 주세요.";
  return null;
}

type Supabase = Awaited<ReturnType<typeof createAuthClient>>;

// 순서가 이미 공개 · 진행 중이면 새 곡은 순서 맨 뒤에 붙이고, 아니면 미배치로 둔다
async function placement(supabase: Supabase, eventId: string, isEncore: boolean, status: EventStatus) {
  const scheduled = isEncore || ["PUBLISHED", "LIVE", "ENCORE"].includes(status);
  if (!scheduled) return { next: () => ({ order_index: null, status: "SUBMITTED" as const }) };
  const { data } = await supabase
    .from("performance_entries")
    .select("order_index")
    .eq("event_id", eventId)
    .eq("is_encore", isEncore)
    .not("order_index", "is", null)
    .order("order_index", { ascending: false })
    .limit(1);
  let last = data?.[0]?.order_index ?? 0;
  return { next: () => ({ order_index: ++last, status: "SCHEDULED" as const }) };
}

export async function addSubmission(eventId: string, rawPerformers: string[], rawSongs: AdminSong[]): Promise<AdminResult> {
  const { supabase } = await requireAdmin();
  const performers = rawPerformers.map((p) => p.trim()).filter(Boolean);
  const songs = cleanSongs(rawSongs);
  const invalid = validate(performers, songs);
  if (invalid) return { ok: false, message: invalid };

  const { data: event, error } = await supabase.from("events").select("status").eq("id", eventId).single();
  if (error) return fail(error);
  const isEncore = event.status === "ENCORE";

  const sub = await supabase
    .from("submissions")
    .insert({ event_id: eventId, performer_names: performers, is_encore: isEncore })
    .select("id")
    .single();
  if (sub.error) return fail(sub.error);

  const place = await placement(supabase, eventId, isEncore, event.status);
  const entries = await supabase.from("performance_entries").insert(
    songs.map((s) => ({
      event_id: eventId,
      submission_id: sub.data.id,
      is_encore: isEncore,
      artist: s.artist,
      song_title: s.title,
      ...place.next(),
    })),
  );
  if (entries.error) return fail(entries.error);
  return ok(null);
}

export async function updateSubmission(submissionId: string, rawPerformers: string[], rawSongs: AdminSong[]): Promise<AdminResult> {
  const { supabase } = await requireAdmin();
  const performers = rawPerformers.map((p) => p.trim()).filter(Boolean);
  const songs = cleanSongs(rawSongs);
  const invalid = validate(performers, songs);
  if (invalid) return { ok: false, message: invalid };

  const { data: sub, error } = await supabase
    .from("submissions")
    .select("id, event_id, is_encore, events(status), performance_entries(id)")
    .eq("id", submissionId)
    .single();
  if (error) return fail(error);

  const upd = await supabase.from("submissions").update({ performer_names: performers }).eq("id", submissionId);
  if (upd.error) return fail(upd.error);

  // 남은 곡은 내용만 바꿔 순서를 유지하고, 지운 곡은 삭제, 새 곡은 순서 맨 뒤(또는 미배치)로
  const keep = new Set(songs.filter((s) => s.id).map((s) => s.id!));
  const removed = sub.performance_entries.map((e) => e.id).filter((id) => !keep.has(id));
  if (removed.length) {
    const del = await supabase.from("performance_entries").delete().in("id", removed);
    if (del.error) return fail(del.error);
  }
  for (const s of songs.filter((s) => s.id)) {
    const r = await supabase.from("performance_entries").update({ artist: s.artist, song_title: s.title }).eq("id", s.id!);
    if (r.error) return fail(r.error);
  }
  const added = songs.filter((s) => !s.id);
  if (added.length) {
    const status = (sub.events as unknown as { status: EventStatus }).status;
    const place = await placement(supabase, sub.event_id, sub.is_encore, status);
    const ins = await supabase.from("performance_entries").insert(
      added.map((s) => ({
        event_id: sub.event_id,
        submission_id: submissionId,
        is_encore: sub.is_encore,
        artist: s.artist,
        song_title: s.title,
        ...place.next(),
      })),
    );
    if (ins.error) return fail(ins.error);
  }
  return ok(null);
}

export async function deleteSubmission(submissionId: string): Promise<AdminResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("submissions").delete().eq("id", submissionId);
  if (error) return fail(error);
  return ok(null);
}

// ─── 순서 ───────────────────────────────────────────────────

export async function reorder(eventId: string, isEncore: boolean, entryIds: string[]): Promise<AdminResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("reorder_entries", { p_event_id: eventId, p_is_encore: isEncore, p_entry_ids: entryIds });
  if (error) return fail(error);
  return ok(null);
}

async function orderedSegment(supabase: Supabase, eventId: string, isEncore: boolean) {
  const { data, error } = await supabase
    .from("performance_entries")
    .select("*")
    .eq("event_id", eventId)
    .eq("is_encore", isEncore)
    .not("order_index", "is", null)
    .order("order_index");
  if (error) throw error;
  return data as EntryRow[];
}

export type MoveMode = "next" | "up" | "down" | "last";

export async function moveEntry(entryId: string, mode: MoveMode): Promise<AdminResult> {
  const { supabase } = await requireAdmin();
  const { data: entry, error } = await supabase.from("performance_entries").select("*").eq("id", entryId).single();
  if (error) return fail(error);

  const list = await orderedSegment(supabase, entry.event_id, entry.is_encore);
  const ids = list.map((e) => e.id).filter((id) => id !== entryId);
  const from = list.findIndex((e) => e.id === entryId);
  let to: number;
  if (mode === "up") to = Math.max(0, from - 1);
  else if (mode === "down") to = Math.min(ids.length, from + 1);
  else if (mode === "last") to = ids.length;
  else {
    // 바로 다음 순서: 아직 공연하지 않은 곡들 중 맨 앞
    const firstWaiting = list.findIndex((e) => e.id !== entryId && e.status === "SCHEDULED");
    to = firstWaiting === -1 ? ids.length : ids.indexOf(list[firstWaiting].id);
  }
  ids.splice(to, 0, entryId);
  return reorder(entry.event_id, entry.is_encore, ids);
}

export async function setEntryCancelled(entryId: string, cancelled: boolean): Promise<AdminResult> {
  const { supabase } = await requireAdmin();
  const { data: entry, error } = await supabase.from("performance_entries").select("order_index").eq("id", entryId).single();
  if (error) return fail(error);
  const status = cancelled ? "CANCELLED" : entry.order_index ? "SCHEDULED" : "SUBMITTED";
  const r = await supabase.from("performance_entries").update({ status }).eq("id", entryId);
  if (r.error) return fail(r.error);
  return ok(null);
}

// ─── 공연 진행 ──────────────────────────────────────────────

// 공연 순서: 본 공연 → 앵콜. 앵콜은 본 공연이 5곡 이하로 남았을 때 열리므로,
// 앵콜 단계에서도 남은 본 공연 곡을 먼저 마치고 앵콜 곡으로 넘어간다.
async function playOrder(supabase: Supabase, eventId: string) {
  const { data, error } = await supabase.from("events").select("status").eq("id", eventId).single();
  if (error) throw error;
  const main = await orderedSegment(supabase, eventId, false);
  return data.status === "ENCORE" ? [...main, ...(await orderedSegment(supabase, eventId, true))] : main;
}

// 지금 곡을 완료하고, 그 뒤로 아직 공연하지 않은 첫 곡을 공연 중으로
export async function advance(eventId: string): Promise<AdminResult> {
  const { supabase } = await requireAdmin();
  const list = await playOrder(supabase, eventId);
  const at = list.findIndex((e) => e.status === "PERFORMING");
  const current = at === -1 ? undefined : list[at];
  const next = list.find((e, i) => e.status === "SCHEDULED" && i > at) ?? list.find((e) => e.status === "SCHEDULED");

  if (current) {
    const r = await supabase.from("performance_entries").update({ status: "COMPLETED" }).eq("id", current.id);
    if (r.error) return fail(r.error);
  }
  if (next) {
    const r = await supabase.from("performance_entries").update({ status: "PERFORMING" }).eq("id", next.id);
    if (r.error) return fail(r.error);
  }
  return ok(null);
}

// 잘못 넘겼을 때: 지금 곡을 대기로 돌리고, 가장 최근에 완료한 곡을 다시 공연 중으로
export async function undoAdvance(eventId: string): Promise<AdminResult> {
  const { supabase } = await requireAdmin();
  const list = await playOrder(supabase, eventId);
  const current = list.find((e) => e.status === "PERFORMING");
  const last = list
    .filter((e) => e.status === "COMPLETED")
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  if (!last) return { ok: false, message: "되돌릴 곡이 없어요." };

  if (current) {
    const r = await supabase.from("performance_entries").update({ status: "SCHEDULED" }).eq("id", current.id);
    if (r.error) return fail(r.error);
  }
  const r = await supabase.from("performance_entries").update({ status: "PERFORMING" }).eq("id", last.id);
  if (r.error) return fail(r.error);
  return ok(null);
}
