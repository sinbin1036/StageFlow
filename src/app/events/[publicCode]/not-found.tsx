import { Display, Screen, TopBar } from "@/components/zine";

export default function EventNotFound() {
  return (
    <Screen>
      <TopBar />
      <section className="relative px-5 pt-2.5">
        <Display>NOT<br />FOUND</Display>
        <h1 className="mt-4 font-heading text-[26px] leading-tight">행사를 찾을 수 없어요</h1>
        <p className="mt-2 text-sm font-semibold leading-relaxed">
          링크가 바뀌었거나 아직 공개되지 않은 행사예요. 단톡방에 올라온 최신 링크로 다시 들어와 주세요.
        </p>
      </section>
    </Screen>
  );
}
