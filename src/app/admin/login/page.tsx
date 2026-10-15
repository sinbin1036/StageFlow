import type { Metadata } from "next";
import { Suspense } from "react";
import { Display, Logo } from "@/components/zine";
import { AdminScreen } from "../_components/admin-ui";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "운영진 로그인" };

export default function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <AdminScreen>
      <div aria-hidden className="halftone pointer-events-none absolute inset-x-0 top-0 h-[420px]" />
      <header className="relative flex min-h-[62px] items-center justify-between px-5 pt-4">
        <Logo />
        <span className="rotate-[4deg] bg-ink px-2.5 py-1 font-display text-[15px] tracking-[0.06em] text-bg">ADMIN</span>
      </header>
      <section className="relative px-5 pt-2.5">
        <Display>STAFF<br />ONLY</Display>
        <h1 className="mt-3 font-heading text-[26px] leading-tight">운영진 로그인</h1>
        <p className="mt-1.5 text-[13px] font-semibold leading-normal">행사 만들기, 순서 편성, 공연 진행은 운영진만 할 수 있어요.</p>
      </section>
      <Suspense>
        <LoginNotice searchParams={searchParams} />
      </Suspense>
      <LoginForm />
      <footer className="relative mt-auto px-5 pb-7 pt-6">
        <p className="text-xs font-semibold leading-relaxed">계정은 운영진만 만들 수 있어요. 계정이 필요하거나 비밀번호를 잊었다면 회장에게 요청하세요.</p>
      </footer>
    </AdminScreen>
  );
}

async function LoginNotice({ searchParams }: { searchParams: PageProps<"/admin/login">["searchParams"] }) {
  const { denied } = await searchParams;
  if (!denied) return null;
  return (
    <p role="alert" className="relative mx-5 mt-5 border-2 border-ink px-3 py-2.5 text-[13px] font-extrabold">
      운영진으로 등록되지 않은 계정이에요. 회장에게 요청하세요.
    </p>
  );
}
