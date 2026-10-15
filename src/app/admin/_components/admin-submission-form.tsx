"use client";

import { useState, type FormEvent } from "react";
import { inputClass } from "@/components/zine";
import type { AdminSong } from "../actions";
import { Alert } from "./admin-ui";

// 운영진용 신청 폼: 현장 추가와 수정에 같이 쓴다. PIN은 받지 않는다.
// 기존 곡은 id를 유지해 순서를 지키고, 새로 넣은 곡만 순서 맨 뒤(또는 미배치)로 들어간다.
export function AdminSubmissionForm({
  initial,
  submitLabel,
  pending,
  message,
  onSubmit,
}: {
  initial?: { performers: string[]; songs: AdminSong[] };
  submitLabel: string;
  pending: boolean;
  message: string | null;
  onSubmit: (performers: string[], songs: AdminSong[]) => void;
}) {
  const [performers, setPerformers] = useState<string[]>(initial?.performers.length ? initial.performers : [""]);
  const [songs, setSongs] = useState<AdminSong[]>(initial?.songs.length ? initial.songs : [{ artist: "", title: "" }]);

  const setPerformer = (i: number, v: string) => setPerformers((p) => p.map((x, j) => (j === i ? v : x)));
  const setSong = (i: number, patch: Partial<AdminSong>) => setSongs((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(performers, songs);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 pt-4" noValidate>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[13px] font-extrabold">부르는 사람</legend>
        {performers.map((p, i) => (
          <div key={i} className="flex gap-2">
            <label className="min-w-0 flex-1">
              <span className="sr-only">부르는 사람 {i + 1}</span>
              <input className={`${inputClass} h-12`} value={p} onChange={(e) => setPerformer(i, e.target.value)} placeholder="이름" maxLength={30} />
            </label>
            {performers.length > 1 && (
              <button
                type="button"
                aria-label={`${p || "이름"} 빼기`}
                onClick={() => setPerformers((all) => all.filter((_, j) => j !== i))}
                className="h-12 w-12 shrink-0 border-2 border-ink font-extrabold"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={() => setPerformers((p) => [...p, ""])} className="h-11 border-2 border-dashed border-ink text-sm font-extrabold">
          + 함께 부르는 사람
        </button>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[13px] font-extrabold">곡</legend>
        {songs.map((s, i) => (
          <div key={s.id ?? `new-${i}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <label>
              <span className="sr-only">아티스트 {i + 1}</span>
              <input className={`${inputClass} h-12 px-3`} value={s.artist} onChange={(e) => setSong(i, { artist: e.target.value })} placeholder="아티스트" maxLength={100} />
            </label>
            <label>
              <span className="sr-only">곡 제목 {i + 1}</span>
              <input className={`${inputClass} h-12 px-3`} value={s.title} onChange={(e) => setSong(i, { title: e.target.value })} placeholder="곡 제목" maxLength={100} />
            </label>
            <button
              type="button"
              aria-label={`${s.title || "곡"} 빼기`}
              disabled={songs.length === 1}
              onClick={() => setSongs((all) => all.filter((_, j) => j !== i))}
              className="h-12 w-12 border-2 border-ink font-extrabold disabled:opacity-30"
            >
              ✕
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setSongs((s) => [...s, { artist: "", title: "" }])} className="h-11 border-2 border-dashed border-ink text-sm font-extrabold">
          + 곡 추가
        </button>
      </fieldset>

      {message && <Alert message={message} />}
      <button type="submit" disabled={pending} className="h-14 bg-ink font-heading text-xl text-bg disabled:opacity-50">
        {pending ? "저장 중…" : submitLabel}
      </button>
    </form>
  );
}
