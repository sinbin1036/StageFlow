// B안(Street Zine) 공통 조각. 색은 bg · ink · accent 세 토큰만 쓴다.
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export function Screen({ children }: { children: ReactNode }) {
  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col overflow-hidden bg-bg text-ink">
      <div aria-hidden className="halftone pointer-events-none absolute inset-x-0 top-0 h-[460px]" />
      {children}
    </main>
  );
}

export function Logo({ size = 44 }: { size?: number }) {
  return (
    <Image
      src="/brand/hid-logo.jpg"
      alt="Hi:D"
      width={960}
      height={640}
      priority
      className="w-auto mix-blend-multiply grayscale contrast-125"
      style={{ height: size }}
    />
  );
}

type ChipTone = "accent" | "ink" | "outline";
const chipTone: Record<ChipTone, string> = {
  accent: "bg-accent text-ink",
  ink: "bg-ink text-bg",
  outline: "border-2 border-ink",
};

export function Chip({ children, tone = "accent", tilt = -4 }: { children: ReactNode; tone?: ChipTone; tilt?: number }) {
  return (
    <span
      className={`inline-block px-2.5 py-1 font-display text-[15px] tracking-[0.06em] ${chipTone[tone]}`}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      {children}
    </span>
  );
}

export function TopBar({ left, chip }: { left?: ReactNode; chip?: ReactNode }) {
  return (
    <header className="relative flex min-h-[62px] items-center justify-between px-5 pt-4">
      {left ?? <Logo />}
      {chip}
    </header>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="flex min-h-11 items-center gap-1.5 text-sm font-extrabold no-underline">
      <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
        <path d="M15 5l-7 7 7 7" />
      </svg>
      {children}
    </Link>
  );
}

// 화면을 채우는 큰 영문 장식 글자. 스크린리더에는 읽히지 않는다.
export function Display({ children, size = 104 }: { children: ReactNode; size?: number }) {
  return (
    <div aria-hidden className="font-display leading-[0.92] tracking-[-0.01em]" style={{ fontSize: size }}>
      {children}
    </div>
  );
}

export function EventHeading({ meta, title }: { meta: string; title: string }) {
  return (
    <>
      <div className="mt-3 text-xs font-extrabold tracking-[0.1em]">{meta}</div>
      <h1 className="mt-1 font-heading text-[26px] leading-tight">{title}</h1>
    </>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between border-b-[3px] border-ink pb-1.5">
      <h2 className="font-display text-2xl tracking-[0.02em]">{children}</h2>
      {aside}
    </div>
  );
}

export function Tag({ children, tone = "accent" }: { children: ReactNode; tone?: "accent" | "ink" | "outline" | "plain" }) {
  const cls = {
    accent: "bg-accent text-ink",
    ink: "bg-ink text-bg",
    outline: "border-[1.5px] border-ink",
    plain: "",
  }[tone];
  return <span className={`shrink-0 px-2 py-0.5 font-display text-[13px] tracking-[0.06em] ${cls}`}>{children}</span>;
}

export const ArrowIcon = () => (
  <svg aria-hidden width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

// 오려낸 강조색 카드 형태의 큰 버튼 링크
export function CutLink({ href, kicker, label }: { href: string; kicker: string; label: string }) {
  return (
    <Link
      href={href}
      className="cut-edge flex -rotate-2 items-center justify-between bg-accent px-[22px] py-5 text-ink no-underline"
    >
      <span className="flex flex-col">
        <span className="text-xs font-extrabold">{kicker}</span>
        <span className="font-heading text-[30px] leading-tight">{label}</span>
      </span>
      <ArrowIcon />
    </Link>
  );
}

export const primaryButton =
  "flex h-[60px] w-full -rotate-1 items-center justify-center bg-ink font-heading text-[22px] text-bg no-underline disabled:opacity-50";
export const secondaryButton =
  "flex min-h-12 w-full items-center justify-center border-2 border-ink text-sm font-extrabold no-underline";
export const inputClass =
  "h-[52px] w-full rounded-none border-2 border-ink bg-bg px-3.5 text-base font-semibold text-ink outline-none";
