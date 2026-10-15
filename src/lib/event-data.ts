import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "./supabase/database.types";

export type EventRow = Tables<"events">;
export type SubmissionRow = Tables<"submissions">;
export type EntryRow = Tables<"performance_entries">;
export type EventStatus = Database["public"]["Enums"]["event_status"];
export type EntryStatus = Database["public"]["Enums"]["entry_status"];

export type EventSnapshot = {
  event: EventRow;
  submissions: SubmissionRow[];
  entries: EntryRow[];
};

// 행사 하나의 데이터 전체. 참가자(anon)에게 DRAFT 행사는 RLS로 보이지 않으므로 null.
export async function fetchEventSnapshot(
  client: SupabaseClient<Database>,
  publicCode: string,
): Promise<EventSnapshot | null> {
  return fetchSnapshotBy(client, "public_code", publicCode);
}

// 관리자 화면은 행사 id로 찾는다
export async function fetchEventSnapshotById(
  client: SupabaseClient<Database>,
  eventId: string,
): Promise<EventSnapshot | null> {
  return fetchSnapshotBy(client, "id", eventId);
}

async function fetchSnapshotBy(
  client: SupabaseClient<Database>,
  column: "id" | "public_code",
  value: string,
): Promise<EventSnapshot | null> {
  const { data: event, error } = await client.from("events").select("*").eq(column, value).maybeSingle();
  if (error) throw error;
  if (!event) return null;

  const [submissions, entries] = await Promise.all([
    client.from("submissions").select("*").eq("event_id", event.id).order("created_at"),
    client.from("performance_entries").select("*").eq("event_id", event.id).order("created_at"),
  ]);
  if (submissions.error) throw submissions.error;
  if (entries.error) throw entries.error;

  return { event, submissions: submissions.data, entries: entries.data };
}
