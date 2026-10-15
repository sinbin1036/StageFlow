import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// 참가자 권한(anon) 클라이언트. 서버 · 브라우저 어디서나 공개 데이터 읽기와 Realtime 구독에 쓴다.
export function createPublicClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
