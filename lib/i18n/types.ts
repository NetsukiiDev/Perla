export interface Dictionary {
  nav: {
    events: string;
    users: string;
    account: string;
    settings: string;
    logout: string;
  };
  settings: {
    title: string;
    language: {
      section: string;
      description: string;
      italian: string;
      english: string;
    };
    version: {
      section: string;
      current: string;
      check: string;
      checking: string;
      available: string;
      availableTo: string;
      viewOnGithub: string;
      failed: string;
      upToDate: string;
    };
    info: {
      section: string;
      environment: string;
      commit: string;
      notAvailable: string;
    };
  };
}
