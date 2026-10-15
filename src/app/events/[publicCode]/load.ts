import "server-only";
import { cache } from "react";
import { fetchEventSnapshot } from "@/lib/event-data";
import { createPublicClient } from "@/lib/supabase/public";

// 같은 요청 안에서 generateMetadata와 페이지가 한 번만 읽도록 묶는다
export const loadSnapshot = cache(async (publicCode: string) =>
  fetchEventSnapshot(createPublicClient(), publicCode),
);
