import type { Dictionary } from "./types";

export const en: Dictionary = {
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
      italian: "Italiano",
      english: "English",
    },
    version: {
      section: "Version",
      current: "Current version",
      check: "Check for updates",
      checking: "Checking…",
      available: "Update available!",
      availableTo: "Version {version} available.",
      viewOnGithub: "View on GitHub",
      failed: "Unable to check for updates.",
      upToDate: "Up to date.",
    },
    info: {
      section: "Info",
      environment: "Environment",
      commit: "Commit",
      notAvailable: "N/A",
    },
  },
};
