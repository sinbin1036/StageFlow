import { Display, Screen, TopBar } from "@/components/zine";

export function LoadingScreen() {
  return (
    <Screen>
      <TopBar />
      <section className="relative px-5 pt-2.5" aria-busy="true">
        <Display>LOAD<br />ING</Display>
        <p className="mt-3 text-sm font-semibold">행사 정보를 불러오는 중이에요.</p>
      </section>
    </Screen>
  );
}
