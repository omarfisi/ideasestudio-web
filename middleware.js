const BOT_UA_RE =
  /facebookexternalhit|Facebot|WhatsApp|Twitterbot|LinkedInBot|Slackbot|Discordbot|TelegramBot|SkypeUriPreview|Applebot/i;

export const config = {
  matcher: ["/blog/:path+"],
};

export default async function middleware(request) {
  const ua = request.headers.get("user-agent") || "";
  if (!BOT_UA_RE.test(ua)) return;

  const url = new URL(request.url);
  const slug = url.pathname.replace(/^\/blog\/?/, "").replace(/\/$/, "");
  if (!slug) return;

  const ogUrl = new URL("/api/og/blog", url.origin);
  ogUrl.searchParams.set("slug", slug);

  try {
    const res = await fetch(ogUrl.toString());
    const html = await res.text();
    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch {
    // On error fall through to the SPA as normal
  }
}
