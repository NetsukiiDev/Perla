import QRCode from "qrcode";
import { requireAdmin } from "@/lib/admin-guard";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const url = new URL(req.url);
  const text = url.searchParams.get("text")?.trim();
  if (!text || text.length > 1024) {
    return Response.json({ error: "invalid_text" }, { status: 400 });
  }

  const svg = await QRCode.toString(text, {
    type: "svg",
    margin: 1,
    width: 220,
    color: {
      dark: "#0a0a0b",
      light: "#ffffff",
    },
  });

  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
