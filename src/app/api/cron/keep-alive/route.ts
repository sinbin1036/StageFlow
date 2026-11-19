import { createServiceClient } from "@/lib/supabase/service";

// Vercel Cron이 하루 한 번 호출한다 (vercel.json의 crons 설정).
// Supabase 무료 플랜은 7일간 DB 활동이 없으면 프로젝트를 일시정지하므로, 가벼운 조회로 활동을 남긴다.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("events").select("id").limit(1);

  if (error) {
    console.error("[keep-alive] Supabase 조회 실패", error);
    return Response.json({ status: "error", message: error.message }, { status: 500 });
  }

  return Response.json({ status: "ok", timestamp: new Date().toISOString() });
}
