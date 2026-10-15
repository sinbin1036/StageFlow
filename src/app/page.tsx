import { Display, Screen, TopBar } from "@/components/zine";

// 참가자는 단톡방에 공유된 행사 링크(/events/{코드})로 바로 들어온다. 이 화면은 링크 없이 들어온 경우의 안내다.
export default function Home() {
  return (
    <Screen>
      <TopBar />
      <section className="relative px-5 pt-2.5">
        <Display>STAGE<br />FLOW</Display>
        <h1 className="mt-4 font-heading text-[26px] leading-tight">버스킹 참가곡 신청 · 공연 순서</h1>
        <p className="mt-2 text-sm font-semibold leading-relaxed">
          단톡방에 올라온 행사 링크로 들어오면 곡을 신청하고 공연 순서를 볼 수 있어요.
        </p>
      </section>
    </Screen>
  );
}
