"use client";

import { useT } from "@/lib/i18n/context";
import { EventInfoGrid } from "./EventInfoGrid";

interface PrivacyConsentProps {
  region: string;
  startsAt: string;
  endsAt: string | null;
  loading: boolean;
  error: string | null;
  onConsent: () => void;
}

export function PrivacyConsent({
  region,
  startsAt,
  endsAt,
  loading,
  error,
  onConsent,
}: PrivacyConsentProps) {
  const t = useT();
  return (
    <div className="flex flex-col gap-5 text-center">
      <EventInfoGrid region={region} startsAt={startsAt} endsAt={endsAt} />
      <p className="text-sm text-muted">{t.participantFlow.privacyNotice}</p>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="button"
        onClick={onConsent}
        disabled={loading}
        className="w-full rounded-lg bg-accent px-4 py-3 text-center font-medium text-accent-foreground transition-opacity disabled:opacity-50"
      >
        {loading ? "..." : t.participantFlow.consentButton}
      </button>
    </div>
  );
}
