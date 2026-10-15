import type { EventSnapshot, EventStatus } from "@/lib/event-data";

export const STAGE_ORDER: EventStatus[] = ["DRAFT", "OPEN", "CLOSED", "PUBLISHED", "LIVE", "ENCORE", "ENDED"];
export const STAGE_SHORT: Record<EventStatus, string> = {
  DRAFT: "준비",
  OPEN: "모집",
  CLOSED: "마감",
  PUBLISHED: "공개",
  LIVE: "공연",
  ENCORE: "앵콜",
  ENDED: "종료",
};
export const STAGE_NAME: Record<EventStatus, string> = {
  DRAFT: "준비",
  OPEN: "모집 중",
  CLOSED: "모집 마감",
  PUBLISHED: "순서 공개",
  LIVE: "공연 중",
  ENCORE: "앵콜",
  ENDED: "종료",
};

export type ConfirmSpec = {
  from: EventStatus;
  to: EventStatus;
  question: string;
  items: string[];
  confirmLabel: string;
};

// 단계를 바꾸기 전에 띄우는 확인 창 내용. 숫자는 지금 데이터로 채운다.
export function confirmFor(to: EventStatus, snapshot: EventSnapshot): ConfirmSpec {
  const from = snapshot.event.status;
  const main = snapshot.entries.filter((e) => !e.is_encore);
  const mainSubs = snapshot.submissions.filter((s) => !s.is_encore).length;
  const placed = main.filter((e) => e.order_index !== null).length;
  const unplaced = main.filter((e) => e.order_index === null && e.status !== "CANCELLED").length;
  const notDone = (e: (typeof main)[number]) => e.status === "SCHEDULED" || e.status === "PERFORMING";
  const mainLeft = main.filter((e) => e.order_index !== null && notDone(e)).length;
  const encoreLeft = snapshot.entries.filter((e) => e.is_encore && notDone(e)).length;

  switch (to) {
    case "OPEN":
      return {
        from, to, question: "모집을 시작할까요?", confirmLabel: "모집 시작",
        items: [
          "행사 링크가 공개돼서 링크를 아는 누구나 로그인 없이 곡을 신청할 수 있어요.",
          "시작한 뒤 링크를 복사해 단톡방에 올리세요.",
          "모집 중에는 참가자가 PIN으로 직접 신청을 고치고 지울 수 있어요.",
        ],
      };
    case "CLOSED":
      return {
        from, to, question: "모집을 마감할까요?", confirmLabel: "마감하기",
        items: [
          "참가자는 더 이상 곡을 신청하거나 수정 · 삭제할 수 없어요.",
          `지금 신청 ${mainSubs}건 · ${main.length}곡으로 순서 편성을 시작해요.`,
          "마감 뒤에 들어온 변경 요청은 신청 관리에서 직접 고칠 수 있어요.",
        ],
      };
    case "PUBLISHED":
      return {
        from, to, question: "순서 초안을 공개할까요?", confirmLabel: "초안 공개하기",
        items: [
          `참가자 화면에 순서 초안 ${placed}곡이 보여요.${unplaced ? ` 순서에 넣지 않은 ${unplaced}곡은 보이지 않아요.` : ""}`,
          "순서 · 곡 변경 요청은 운영진에게 오고, 순서 편성에서 계속 고칠 수 있어요. 고치면 바로 반영돼요.",
          "공연은 아직 시작되지 않아요. 공연 당일 [공연 시작하기]를 눌러야 시작돼요.",
        ],
      };
    case "LIVE":
      return {
        from, to, question: "공연을 시작할까요?", confirmLabel: "공연 시작",
        items: [
          "참가자 화면이 실시간 공연 순서(NOW · NEXT)로 바뀌어요.",
          "01번부터 공연 중으로 표시하고, [공연 완료 · 다음 곡]으로 넘겨요.",
          "순서 공개 때 받은 변경 요청은 미리 반영해 두세요. 공연 중 변경은 진행 화면에서 처리해요.",
        ],
      };
    case "ENCORE":
      return {
        from, to, question: "앵콜을 열까요?", confirmLabel: "앵콜 열기",
        items: [
          "참가자 화면에 [앵콜 신청하기] 버튼이 생겨요. 한 번에 한 곡씩, 신청한 순서대로 01번부터 번호가 붙어요.",
          mainLeft
            ? `남은 본 공연 ${mainLeft}곡은 그대로 이어서 하고, 앵콜 곡은 그 뒤에 불러요. 남은 곡은 지워지지 않아요.`
            : "본 공연이 모두 끝났으니 앵콜 신청이 들어오는 대로 진행해요.",
          "앵콜 곡은 차례가 오기 전까지 참가자가 PIN으로 직접 바꿀 수 있어요.",
        ],
      };
    case "ENDED":
      return {
        from, to, question: "공연을 종료할까요?", confirmLabel: "종료하기",
        items: [
          (from === "ENCORE" ? "앵콜 신청과 수정이 모두 닫혀요." : "앵콜 없이 공연을 마쳐요.") +
            (mainLeft + encoreLeft ? ` 아직 안 부른 ${mainLeft + encoreLeft}곡은 지워지지 않고 미공연으로 남아요.` : ""),
          "참가자 화면이 최종 셋리스트로 바뀌어요.",
          "종료한 행사는 행사 목록에서 지난 행사로 표시돼요.",
        ],
      };
    default:
      return { from, to, question: "", items: [], confirmLabel: "확인" };
  }
}
