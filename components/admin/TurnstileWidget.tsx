"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import Script from "next/script";

export function TurnstileWidget({
  onToken,
  onStatus,
}: {
  onToken: (token: string) => void;
  // Called once the config is known, with whether Turnstile is enabled. Lets
  // the login form decide if a CAPTCHA token is required before submitting.
  onStatus?: (enabled: boolean) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [siteKey, setSiteKey] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/turnstile")
      .then((r) => r.json())
      .then((data) => {
        if (data.siteKey) {
          setSiteKey(data.siteKey);
          onStatus?.(true);
        } else {
          onStatus?.(false);
        }
      })
      .catch(() => {
        // fallback to env var
        const envKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
        if (envKey) {
          setSiteKey(envKey);
          onStatus?.(true);
        } else {
          onStatus?.(false);
        }
      });
  }, [onStatus]);

  const render = useCallback(() => {
    if (!containerRef.current || !window.turnstile || !siteKey) return;
    widgetId.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: (token: string) => onToken(token),
      "expired-callback": () => onToken(""),
    });
    setReady(true);
  }, [onToken, siteKey]);

  useEffect(() => {
    if (window.turnstile) {
      render();
    }
  }, [render]);

  if (!siteKey) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="lazyOnload"
        onLoad={() => {
          if (!ready) render();
        }}
      />
      <div ref={containerRef} />
    </>
  );
}
