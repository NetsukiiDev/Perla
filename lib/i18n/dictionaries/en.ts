import type { Dictionary } from "./types";

// English messages — must mirror the Italian dictionary's shape (enforced by
// the Dictionary type).
export const en: Dictionary = {
  common: {
    loading: "Loading...",
    save: "Save",
    cancel: "Cancel",
    close: "Close",
    retry: "Retry",
  },
  nav: {
    events: "Events",
    users: "Users",
    account: "Account",
    settings: "Settings",
    logout: "Log out",
  },
  settings: {
    title: "Settings",
    language: {
      section: "Language",
      description: "Choose the interface language.",
      italian: "Italian",
      english: "English",
    },
    version: {
      section: "Version",
      current: "Current version",
      check: "Check for updates",
      checking: "Checking...",
      upToDate: "You are on the latest version.",
      available: "Update available",
      availableTo: "Version {version} is available.",
      failed: "Unable to check for updates.",
      viewOnGithub: "View on GitHub",
    },
    info: {
      section: "Information",
      environment: "Environment",
      commit: "Commit",
      notAvailable: "N/A",
    },
  },
};
