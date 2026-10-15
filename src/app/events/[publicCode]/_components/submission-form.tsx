"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { inputClass, primaryButton } from "@/components/zine";
import type { SongInput, SubmissionInput } from "../actions";

type Mode = "main" | "encore";

export type SubmissionFormProps = {
  mode: Mode;
  initial?: { performers: string[]; songs: SongInput[] };
  // 수정할 때는 PIN을 이미 확인했으므로 입력칸을 숨긴다
  fixedPin?: string;
  submitLabel: (songCount: number) => string;
  onSubmit: (input: SubmissionInput) => Promise<{ ok: true } | { ok: false; message: string }>;
};

const XIcon = ({ size = 14 }: { size?: number }) => (
  <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

function Step({ no, title, aside, children }: { no: string; title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <fieldset className="mt-7 flex flex-col gap-3 first:mt-[22px]">
      <legend className="flex w-full items-baseline gap-2.5 border-b-[3px] border-ink pb-2.5">
        <span className="font-display text-[26px] leading-none">{no}</span>
        <span className="font-heading text-xl">{title}</span>
        {aside && <span className="ml-auto text-xs font-extrabold">{aside}</span>}
      </legend>
      <div className="mt-3.5 flex flex-col gap-3">{children}</div>
    </fieldset>
  );
}

export function SubmissionForm({ mode, initial, fixedPin, submitLabel, onSubmit }: SubmissionFormProps) {
  const [group, setGroup] = useState((initial?.performers.length ?? 1) > 1);
  const [performers, setPerformers] = useState<string[]>(initial?.performers ?? [""]);
  const [memberDraft, setMemberDraft] = useState("");
  const [songs, setSongs] = useState<SongInput[]>(mode === "main" ? initial?.songs ?? [] : []);
  const [draft, setDraft] = useState<SongInput>(
    mode === "encore" && initial?.songs[0] ? initial.songs[0] : { artist: "", title: "" },
  );
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const draftFilled = draft.artist.trim() !== "" || draft.title.trim() !== "";
  const allSongs = mode === "encore" ? [draft] : draftFilled ? [...songs, draft] : songs;

  const addMember = () => {
    const name = memberDraft.trim();
    if (!name) return;
    setPerformers((p) => [...p.filter(Boolean), name]);
    setMemberDraft("");
  };

  const addSong = () => {
    if (!draft.artist.trim() || !draft.title.trim()) {
      setMessage("아티스트와 곡 제목을 모두 입력해 주세요.");
      return;
    }
    setSongs((s) => [...s, { artist: draft.artist.trim(), title: draft.title.trim() }]);
    setDraft({ artist: "", title: "" });
    setMessage(null);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const names = group ? [...performers, memberDraft] : [performers[0] ?? ""];
    startTransition(async () => {
      const result = await onSubmit({ performers: names, songs: allSongs, pin: fixedPin ?? pin });
      if (!result.ok) setMessage(result.message);
    });
  };

  const toggle = (next: boolean) => {
    setGroup(next);
    if (!next) setPerformers((p) => [p[0] ?? ""]);
  };

  return (
    <form onSubmit={submit} className="relative flex flex-col px-5" noValidate>
      <Step no="01" title="누가 불러요?">
        <div role="group" aria-label="공연 형태" className="grid grid-cols-2 border-2 border-ink">
          {[
            { label: "솔로", value: false },
            { label: "듀엣 · 팀", value: true },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              aria-pressed={group === o.value}
              onClick={() => toggle(o.value)}
              className={`h-12 text-[15px] font-extrabold ${group === o.value ? "bg-ink text-bg" : ""}`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {!group ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-extrabold">이름</span>
            <input
              className={inputClass}
              value={performers[0] ?? ""}
              onChange={(e) => setPerformers([e.target.value])}
              placeholder="신승빈"
              maxLength={30}
              autoComplete="name"
            />
          </label>
        ) : (
          <>
            {performers.filter(Boolean).length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="부르는 사람">
                {performers.filter(Boolean).map((name, i) => (
                  <li key={`${name}-${i}`} className="inline-flex h-10 items-center gap-1 bg-accent pl-3 pr-1 text-[15px] font-extrabold">
                    {name}
                    <button
                      type="button"
                      aria-label={`${name} 빼기`}
                      onClick={() => setPerformers((p) => p.filter(Boolean).filter((_, j) => j !== i))}
                      className="inline-flex h-8 w-8 items-center justify-center"
                    >
                      <XIcon />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <label className="min-w-0 flex-1">
                <span className="sr-only">부르는 사람 이름</span>
                <input
                  className={`${inputClass} h-12`}
                  value={memberDraft}
                  onChange={(e) => setMemberDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addMember();
                    }
                  }}
                  placeholder={performers.filter(Boolean).length ? "함께 부르는 사람 이름" : "부르는 사람 이름"}
                  maxLength={30}
                />
              </label>
              <button type="button" onClick={addMember} className="h-12 bg-ink px-3.5 text-sm font-extrabold text-bg">
                + 추가
              </button>
            </div>
          </>
        )}
      </Step>

      <Step no="02" title="어떤 곡?" aside={mode === "main" && allSongs.length ? `${allSongs.length}곡` : undefined}>
        {mode === "main" &&
          songs.map((s, i) => (
            <div key={`${s.title}-${i}`} className="flex items-center gap-3 border-2 border-ink bg-bg py-3 pl-3.5 pr-1.5">
              <span className="font-display text-2xl leading-none">{String(i + 1).padStart(2, "0")}</span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-heading text-lg">{s.title}</span>
                <span className="text-xs font-semibold">{s.artist}</span>
              </div>
              <button
                type="button"
                aria-label={`${s.title} 빼기`}
                onClick={() => setSongs((all) => all.filter((_, j) => j !== i))}
                className="inline-flex h-11 w-11 items-center justify-center"
              >
                <XIcon size={16} />
              </button>
            </div>
          ))}
        <div className="grid grid-cols-2 gap-2.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-extrabold">아티스트</span>
            <input
              className={inputClass}
              value={draft.artist}
              onChange={(e) => setDraft((d) => ({ ...d, artist: e.target.value }))}
              placeholder="박효신"
              maxLength={100}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-extrabold">곡 제목</span>
            <input
              className={inputClass}
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="연인"
              maxLength={100}
            />
          </label>
        </div>
        {mode === "main" ? (
          <>
            <button type="button" onClick={addSong} className="h-[52px] border-2 border-dashed border-ink text-[15px] font-extrabold">
              + 곡 추가
            </button>
            <p className="text-xs font-semibold leading-normal">곡마다 공연 순서가 따로 잡혀요. 위 공연자가 모든 곡을 함께 불러요.</p>
          </>
        ) : (
          <p className="text-xs font-semibold leading-normal">앵콜은 한 번에 한 곡이에요. 더 부르고 싶으면 다시 신청하세요.</p>
        )}
      </Step>

      {fixedPin === undefined && (
        <Step no="03" title="수정 PIN">
          <label className="flex flex-col gap-2.5">
            <span className="text-[13px] font-extrabold">
              숫자 4자리{mode === "main" ? " · 이 신청의 모든 곡에 공통" : ""}
            </span>
            <input
              className="h-16 w-full rounded-none border-2 border-ink bg-accent px-3.5 text-center font-display text-[32px] tracking-[0.7em] text-ink outline-none"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
              placeholder="0000"
            />
            <span className="text-xs font-semibold leading-normal">
              {mode === "main"
                ? "내 신청 수정·삭제할 때만 써요. 친구랑 같아도 OK."
                : "내 차례가 오기 전까지 이 PIN으로 곡을 바꿀 수 있어요."}
            </span>
          </label>
        </Step>
      )}

      {message && (
        <p role="alert" className="mt-5 flex items-center gap-2 text-[13px] font-extrabold">
          <span className="inline-flex h-5 w-5 items-center justify-center bg-ink font-display text-[13px] text-bg">!</span>
          {message}
        </p>
      )}

      <button type="submit" disabled={pending} className={`${primaryButton} mb-8 mt-6`}>
        {pending ? "보내는 중…" : submitLabel(allSongs.length)}
      </button>
    </form>
  );
}
