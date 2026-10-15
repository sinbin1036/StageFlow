"use client";

import { useState, useTransition, type FormEvent } from "react";
import { inputClass, primaryButton } from "@/components/zine";
import { signIn } from "../actions";
import { Alert } from "../_components/admin-ui";

export function LoginForm() {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      // 성공하면 서버에서 /admin으로 이동시킨다
      const result = await signIn(loginId, password);
      if (result && !result.ok) setMessage(result.message);
    });
  };

  return (
    <form onSubmit={submit} className="relative flex flex-col gap-3.5 px-5 pt-[26px]" noValidate>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-extrabold">아이디</span>
        <input className={inputClass} value={loginId} onChange={(e) => setLoginId(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-extrabold">비밀번호</span>
        <input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
      </label>
      {message && <Alert message={message} />}
      <button type="submit" disabled={pending} className={`${primaryButton} mt-1`}>
        {pending ? "확인하는 중…" : "로그인"}
      </button>
    </form>
  );
}
