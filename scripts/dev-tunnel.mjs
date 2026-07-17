// Runs `next dev` behind an ngrok HTTPS tunnel, so the participant flow
// (which requires a secure context for geolocation) can be tested from a
// real phone instead of just localhost.
//
// Reads the ngrok authtoken/domain saved via the admin panel (Impostazioni →
// Tunnel ngrok) — the same NgrokConfig row the /api/admin/settings/ngrok/*
// routes use — so there's a single place to configure it. Uses the
// @ngrok/ngrok SDK (bundled native binary, no separate system-wide ngrok
// CLI install required).
//
// Starts the tunnel first so its hostname is known before `next dev` boots,
// then passes it through TUNNEL_HOST so next.config.ts can add it to
// allowedDevOrigins.
try {
  await import("dotenv/config");
} catch {
  // dotenv not available — env vars come from the platform
}
import { spawn } from "node:child_process";
import * as ngrok from "@ngrok/ngrok";
import { prisma } from "../lib/db.ts";
import { decrypt } from "../lib/crypto.ts";

const PORT = Number(process.env.PORT || 3000);

const cfg = await prisma.ngrokConfig.findUnique({ where: { id: "default" } });
if (!cfg?.authtokenEncrypted) {
  console.error(
    "No ngrok authtoken configured. Save one first in the admin panel under Impostazioni → Tunnel ngrok.",
  );
  process.exit(1);
}

let listener;
try {
  listener = await ngrok.forward({
    addr: PORT,
    authtoken: decrypt(cfg.authtokenEncrypted),
    domain: cfg.domain || undefined,
  });
} catch (err) {
  console.error(`Failed to start the ngrok tunnel: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}

const publicUrl = listener.url();
const tunnelHost = new URL(publicUrl).host;
console.log(`\nngrok tunnel ready: ${publicUrl}`);
console.log("Share this URL with participants testing on a real phone.\n");

const next = spawn("next dev", {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, TUNNEL_HOST: tunnelHost },
});

async function shutdown() {
  next.kill();
  await listener.close();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
next.on("exit", async (code) => {
  await listener.close();
  process.exit(code ?? 0);
});
