import type { NextConfig } from "next";

// Next.js 기본 목록(next/dist/shared/lib/router/utils/html-bots)에 카카오톡 링크 미리보기 봇을 더한다.
// 이 봇들은 <head> 안의 메타데이터만 읽으므로 스트리밍 대신 막힘 없이 렌더링해야
// 단톡방 미리보기에 행사 제목이 나온다.
const HTML_LIMITED_BOTS =
  /[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight|kakaotalk-scrap|Kakaotalk-scrap|KakaoTalk/i;

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  htmlLimitedBots: HTML_LIMITED_BOTS,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
