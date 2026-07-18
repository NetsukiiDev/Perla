// Runs `next dev` behind an ngrok HTTPS tunnel, so the participant flow
// (which requires a secure context for geolocation) can be tested from a
// real phone instead of just localhost.
//
// Reads the ngrok authtoken/domain saved via the admin panel (Account →
// Tunnel ngrok) — the same NgrokConfig row the /api/admin/account/ngrok/*
// routes use. Config is per admin user, so pass which one to use as an
// argument (`npm run dev:tunnel -- you@example.com`); if only one admin
// user has a saved config, it's picked automatically.
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
const emailArg = process.argv[2];

let cfg;
if (emailArg) {
  cfg = await prisma.ngrokConfig.findFirst({ where: { adminUser: { email: emailArg } } });
  if (!cfg) {
    console.error(`No ngrok config saved for ${emailArg}. Save one first in the admin panel under Account → Tunnel ngrok.`);
    process.exit(1);
  }
} else {
  const all = await prisma.ngrokConfig.findMany({ include: { adminUser: true } });
  if (all.length === 0) {
    console.error("No ngrok config saved yet. Save one first in the admin panel under Account → Tunnel ngrok.");
    process.exit(1);
  }
  if (all.length > 1) {
    console.error(
      "Multiple users have a saved ngrok config. Specify which one to use:\n" +
        all.map((c) => `  npm run dev:tunnel -- ${c.adminUser.email}`).join("\n"),
    );
    process.exit(1);
  }
  cfg = all[0];
}

if (!cfg.authtokenEncrypted) {
  console.error("Saved ngrok config has no authtoken. Save one first in the admin panel under Account → Tunnel ngrok.");
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
