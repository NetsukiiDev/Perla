"use client";

import { useEffect, useRef, useState } from "react";
import type { PublicState } from "@/lib/public-projection";
import { useT } from "@/lib/i18n/context";
import { PrivacyConsent } from "./PrivacyConsent";
import { ScheduledNotice } from "./ScheduledNotice";
import { ParticipantStepView } from "./ParticipantStepView";
import { GenericError } from "./GenericError";

const POLL_INTERVAL_MS = 20_000;
const LOCATION_REPORT_MIN_INTERVAL_MS = 12_000;

// Client-side state machine driving the participant flow after the code
// has been verified. Initial state comes from the server component (no
// extra round trip); subsequent transitions come from /api/session/start,
// a throttled geolocation watch posting to /api/session/location, and a
// low-frequency poll of /api/session/current as a resync fallback (e.g.
// the admin forced a step change).
export function ParticipantFlow({ initialState }: { initialState: PublicState }) {
  const t = useT();
  const [state, setState] = useState<PublicState>(initialState);
  const [consentLoading, setConsentLoading] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);
  const lastReportRef = useRef(0);

  function handleConsent() {
    const contextError = (() => {
      if (typeof window === "undefined" || window.isSecureContext) return null;
      if (["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)) return null;
      return t.participantFlow.insecureWarning;
    })();
    if (contextError) {
      setConsentError(contextError);
      return;
    }

    if (!("geolocation" in navigator)) {
      setConsentError(t.participantFlow.noGeolocation);
      return;
    }
    setConsentLoading(true);
    setConsentError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await fetch("/api/session/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
            }),
          });
          const data = await res.json();
          if (data.state) {
            setState(data.state);
          } else if (data.error === "already_used") {
            setState({ kind: "already_used" });
          } else if (data.error === "not_available") {
            setState({ kind: "not_available" });
          } else {
            setConsentError(data.message ?? t.participantFlow.errors.generic);
          }
        } catch {
          setConsentError(t.participantFlow.errors.generic);
        } finally {
          setConsentLoading(false);
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setConsentError(t.participantFlow.geolocationError);
        } else if (error.code === error.TIMEOUT) {
          setConsentError(t.participantFlow.timeoutError);
        } else {
          setConsentError(t.participantFlow.errors.generic);
        }
        setConsentLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  useEffect(() => {
    if (state.kind !== "in_progress") return;

    function reportPosition(lat: number, lng: number, accuracy?: number) {
      const now = Date.now();
      if (now - lastReportRef.current < LOCATION_REPORT_MIN_INTERVAL_MS) return;
      lastReportRef.current = now;
      fetch("/api/session/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng, accuracy }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.state) setState(data.state);
        })
        .catch(() => {});
    }

    let watchId: number | null = null;
    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          reportPosition(position.coords.latitude, position.coords.longitude, position.coords.accuracy);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 10000 },
      );
    }

    const pollId = setInterval(() => {
      fetch("/api/session/current")
        .then((res) => res.json())
        .then((data) => {
          if (data.state) setState(data.state);
        })
        .catch(() => {});
    }, POLL_INTERVAL_MS);

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      clearInterval(pollId);
    };
  }, [state.kind]);

  switch (state.kind) {
    case "not_yet_available":
      return (
        <ScheduledNotice
          region={state.region}
          startsAt={state.startsAt}
          endsAt={state.endsAt}
          message={state.message}
        />
      );
    case "needs_consent":
      return (
        <PrivacyConsent
          region={state.region}
          startsAt={state.startsAt}
          endsAt={state.endsAt}
          loading={consentLoading}
          error={consentError}
          onConsent={handleConsent}
        />
      );
    case "geolocation_denied":
      return <GenericError message={t.participantFlow.errors.locationDenied} />;
    case "in_progress":
      return (
        <ParticipantStepView
          region={state.region}
          startsAt={state.startsAt}
          endsAt={state.endsAt}
          stepIndex={state.stepIndex}
          stepsCount={state.stepsCount}
          lat={state.lat}
          lng={state.lng}
          totalDistanceM={state.totalDistanceM}
          totalDurationS={state.totalDurationS}
          stepDistanceM={state.stepDistanceM}
          stepDurationS={state.stepDurationS}
          hasHighway={state.hasHighway}
          tollEstimateCents={state.tollEstimateCents}
          hint={state.hint}
        />
      );
    case "arrived":
      return <GenericError message={t.participantFlow.errors.routeComplete} />;
    case "already_used":
      return <GenericError message={t.participantFlow.errors.alreadyUsed} />;
    case "not_available":
      return <GenericError message={t.participantFlow.errors.codeNotAvailable} />;
    case "invalid":
    default:
      return <GenericError message={t.participantFlow.errors.invalidCode} />;
  }
}
