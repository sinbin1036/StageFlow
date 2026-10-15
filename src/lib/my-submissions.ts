"use client";

import { useCallback, useSyncExternalStore } from "react";

// 이 브라우저에서 낸(또는 "이게 나예요"로 고른) 신청 id 목록. 표시용이라 서버에는 저장하지 않는다.
// 저장소를 쓸 수 없는 환경(시크릿 모드 등)에서도 화면은 그대로 동작해야 하므로 모든 접근을 try/catch로 감싼다.

const key = (publicCode: string) => `stageflow:${publicCode}`;
const listeners = new Set<() => void>();
const EMPTY: string[] = [];
const cache = new Map<string, { raw: string | null; ids: string[] }>();

function read(publicCode: string): string[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key(publicCode));
  } catch {
    return EMPTY;
  }
  const hit = cache.get(publicCode);
  if (hit && hit.raw === raw) return hit.ids;
  let ids: string[] = EMPTY;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) ids = parsed.filter((v): v is string => typeof v === "string");
  } catch {
    ids = EMPTY;
  }
  cache.set(publicCode, { raw, ids });
  return ids;
}

function write(publicCode: string, ids: string[]) {
  try {
    window.localStorage.setItem(key(publicCode), JSON.stringify([...new Set(ids)]));
  } catch {
    // 저장할 수 없으면 표시만 생략된다
  }
  listeners.forEach((l) => l());
}

export function addMySubmission(publicCode: string, id: string) {
  write(publicCode, [...read(publicCode), id]);
}

export function removeMySubmission(publicCode: string, id: string) {
  write(publicCode, read(publicCode).filter((v) => v !== id));
}

// "이게 나예요": 본 공연 신청은 하나만 내 것으로 표시하고, 앵콜 신청은 그대로 둔다
export function replaceMyMainSubmission(publicCode: string, id: string, mainIds: string[]) {
  const main = new Set(mainIds);
  write(publicCode, [...read(publicCode).filter((v) => !main.has(v)), id]);
}

export function useMySubmissions(publicCode: string) {
  const subscribe = useCallback((onChange: () => void) => {
    listeners.add(onChange);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key(publicCode)) onChange();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [publicCode]);

  return useSyncExternalStore(
    subscribe,
    () => read(publicCode),
    () => EMPTY,
  );
}
