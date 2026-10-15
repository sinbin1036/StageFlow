"use server";

import { createServiceClient } from "@/lib/supabase/service";

export type SongInput = { artist: string; title: string };
export type SubmissionInput = { performers: string[]; songs: SongInput[]; pin: string };

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; message: string };

// DB 함수가 던지는 오류 코드 → 참가자에게 보여줄 문구
const MESSAGES: Record<string, string> = {
  EVENT_NOT_FOUND: "행사를 찾을 수 없어요.",
  SUBMISSION_NOT_FOUND: "신청을 찾을 수 없어요. 이미 삭제됐을 수 있어요.",
  SUBMISSION_CLOSED: "지금은 신청할 수 없어요.",
  NOT_EDITABLE: "지금은 수정할 수 없어요. 변경이 필요하면 운영진에게 말해 주세요.",
  INVALID_PIN: "PIN이 맞지 않아요. 다시 입력해 주세요.",
  INVALID_INPUT: "입력한 내용을 다시 확인해 주세요.",
};

function fail(error: { message: string }): { ok: false; message: string } {
  const code = Object.keys(MESSAGES).find((c) => error.message.includes(c));
  return { ok: false, message: code ? MESSAGES[code] : "잠시 후 다시 시도해 주세요." };
}

const PIN_RE = /^[0-9]{4}$/;

function clean(input: SubmissionInput) {
  return {
    performers: input.performers.map((p) => p.trim()).filter(Boolean),
    songs: input.songs
      .map((s) => ({ artist: s.artist.trim(), title: s.title.trim() }))
      .filter((s) => s.artist || s.title),
    pin: input.pin,
  };
}

function validate(input: ReturnType<typeof clean>): string | null {
  if (input.performers.length === 0) return "부르는 사람 이름을 입력해 주세요.";
  if (input.songs.length === 0) return "곡을 하나 이상 담아 주세요.";
  if (input.songs.some((s) => !s.artist || !s.title)) return "아티스트와 곡 제목을 모두 입력해 주세요.";
  if (!PIN_RE.test(input.pin)) return "PIN은 숫자 4자리로 입력해 주세요.";
  return null;
}

export async function createSubmission(publicCode: string, raw: SubmissionInput): Promise<ActionResult<string>> {
  const input = clean(raw);
  const invalid = validate(input);
  if (invalid) return { ok: false, message: invalid };

  const { data, error } = await createServiceClient().rpc("create_submission", {
    p_public_code: publicCode,
    p_performers: input.performers,
    p_songs: input.songs,
    p_pin: input.pin,
  });
  if (error) return fail(error);
  return { ok: true, data };
}

export async function verifyPin(submissionId: string, pin: string): Promise<ActionResult> {
  if (!PIN_RE.test(pin)) return { ok: false, message: "PIN은 숫자 4자리로 입력해 주세요." };
  const { error } = await createServiceClient().rpc("verify_submission_pin", {
    p_submission_id: submissionId,
    p_pin: pin,
  });
  if (error) return fail(error);
  return { ok: true, data: null };
}

export async function updateSubmission(submissionId: string, raw: SubmissionInput): Promise<ActionResult> {
  const input = clean(raw);
  const invalid = validate(input);
  if (invalid) return { ok: false, message: invalid };

  const { error } = await createServiceClient().rpc("update_submission", {
    p_submission_id: submissionId,
    p_pin: input.pin,
    p_performers: input.performers,
    p_songs: input.songs,
  });
  if (error) return fail(error);
  return { ok: true, data: null };
}

export async function deleteSubmission(submissionId: string, pin: string): Promise<ActionResult> {
  const { error } = await createServiceClient().rpc("delete_submission", {
    p_submission_id: submissionId,
    p_pin: pin,
  });
  if (error) return fail(error);
  return { ok: true, data: null };
}
