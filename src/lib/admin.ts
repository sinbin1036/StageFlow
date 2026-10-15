import "server-only";
import { redirect } from "next/navigation";
import { fetchEventSnapshotById } from "./event-data";
import { createAuthClient } from "./supabase/server";

// 관리자 아이디는 Supabase Auth에 "<아이디>@stageflow.local"로 저장한다 (README 관리자 등록 참고)
export const ADMIN_EMAIL_DOMAIN = "stageflow.local";
export const adminEmail = (loginId: string) => `${loginId.trim().toLowerCase()}@${ADMIN_EMAIL_DOMAIN}`;
export const loginIdOf = (email: string | undefined) => (email ?? "").replace(`@${ADMIN_EMAIL_DOMAIN}`, "");

// 로그인했고 admins에 등록된 사용자만 통과. 아니면 로그인 화면으로 보낸다.
export async function requireAdmin() {
  const supabase = await createAuthClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/admin/login");

  const { data: admin } = await supabase.from("admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (!admin) redirect("/admin/login?denied=1");

  return { supabase, user: data.user };
}

export async function loadAdminSnapshot(eventId: string) {
  const { supabase, user } = await requireAdmin();
  const snapshot = await fetchEventSnapshotById(supabase, eventId);
  return { snapshot, user };
}
