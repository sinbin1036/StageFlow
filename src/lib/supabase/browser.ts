import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

// 관리자 화면의 브라우저 클라이언트. 로그인 쿠키를 그대로 써서 DRAFT 행사도 읽고 Realtime을 받는다.
export function createAdminBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
