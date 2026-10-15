import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

// 로그인한 관리자의 세션(쿠키)으로 동작하는 서버 클라이언트. RLS가 관리자 권한을 판단한다.
// 서버 컴포넌트에서는 쿠키를 쓸 수 없으므로 setAll 실패는 무시한다 (세션 갱신은 proxy가 맡는다).
export async function createAuthClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // 서버 컴포넌트 렌더링 중
          }
        },
      },
    },
  );
}
