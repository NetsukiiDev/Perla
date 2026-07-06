"use client";

import { PRIVACY_NOTICE } from "@/lib/constants";
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
  return (
    <div className="flex flex-col gap-5 text-center">
      <EventInfoGrid region={region} startsAt={startsAt} endsAt={endsAt} />
      <p className="text-sm text-muted">{PRIVACY_NOTICE}</p>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="button"
        onClick={onConsent}
        disabled={loading}
        className="w-full rounded-lg bg-accent px-4 py-3 text-center font-medium text-accent-foreground transition-opacity disabled:opacity-50"
      >
        {loading ? "..." : "Consenti posizione"}
      </button>
    </div>
  );
}
