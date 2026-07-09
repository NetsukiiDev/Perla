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
    language: { section: string; description: string; italian: string; english: string };
    version: {
      section: string; current: string; check: string; checking: string;
      available: string; availableTo: string; viewOnGithub: string; failed: string; upToDate: string;
    };
    info: { section: string; environment: string; commit: string; notAvailable: string };
  };

  account: {
    title: string;
    email: string;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
    updateButton: string;
    success: string;
    errors: { tooShort: string; notMatch: string; wrongPassword: string; updateFailed: string; generic: string };
  };

  events: {
    title: string;
    newButton: string;
    empty: string;
    statusOptions: { draft: string; scheduled: string; active: string; closed: string; archived: string };
    table: { name: string; region: string; status: string; start: string };
    form: {
      labels: {
        internalName: string; location: string; destLat: string; destLng: string;
        activationTime: string; startTime: string; endTime: string; status: string;
        steps: string; unlockRadius: string; notes: string;
        showTotalDistance: string; showTotalDuration: string; showTollInfo: string;
      };
      buttons: { save: string; saving: string; create: string; creating: string; edit: string; delete: string; deleting: string };
      errors: { coordinate: string; saveFailed: string; generic: string; deleteFailed: string };
      confirmDelete: string;
    };
    overview: {
      stats: { codes: string; inactive: string; live: string; traveling: string; arrived: string; steps: string };
      routeData: { distance: string; duration: string; toll: string; hidden: string };
      sections: { destination: string; share: string; region: string; coordinates: string; tracking: string; openLive: string; times: string; start: string; end: string; activation: string; route: string; unlockRadius: string; shownData: string; notes: string };
      shareButton: { share: string; sharing: string };
      copied: string;
    };
    subnav: { overview: string; edit: string; participants: string; tickets: string };
    inactiveNotice: { closed: string; notActive: string };
    locationPicker: {
      search: string; placeholder: string;
      errors: { resolve: string; notFound: string; failed: string };
    };
    statusControl: { activate: string; deactivate: string; close: string };
  };

  codes: {
    public: {
      title: string; description: string; maxUses: string; createButton: string; creating: string;
      created: string; hide: string; show: string;
      table: { code: string; uses: string; status: string };
      statusActive: string; statusRevoked: string;
      actions: { revoke: string; delete: string; openLink: string };
      errors: { createFailed: string };
      confirm: { revoke: string; delete: string };
    };
    statusToggle: { active: string; inactive: string; activate: string; deactivate: string };
  };

  participants: {
    manager: {
      generate: string; generated: string; username: string; usernamePlaceholder: string;
      showQR: string; hideCode: string; searchPlaceholder: string; allStatuses: string;
      selectedCount: string; deleteSelected: string;
      table: { code: string; username: string; status: string; step: string };
      empty: string; na: string;
      qrModal: { title: string; close: string };
      confirmDelete: string; confirmBulkDelete: string;
      errors: { deleteFailed: string; bulkDeleteFailed: string };
      actions: { regenerate: string; openParticipant: string; delete: string };
    };
    detail: {
      title: string; stepOf: string; notes: string; saved: string;
      access: {
        section: string; newCode: string; code: string; link: string; openLink: string;
        noActiveCode: string; info: string; regenerate: string; edit: string; generate: string;
      };
      network: { section: string; ip: string; isp: string };
      location: { section: string; current: string; showDestination: string; noData: string };
      actions: {
        block: string; unblock: string; reset: string; showDestination: string;
        markArrived: string; deleteLocation: string; sessionNotActive: string;
      };
      errors: { codeInUse: string; sessionInactive: string; operationFailed: string; destinationShown: string };
    };
  };

  users: {
    title: string;
    form: { email: string; password: string; role: string; staff: string; admin: string; createButton: string };
    errors: { passwordTooShort: string; emailInUse: string; createFailed: string; generic: string };
    table: { email: string; role: string };
    you: string;
    roleActions: { makeStaff: string; makeAdmin: string; resetPassword: string; delete: string };
    confirmDelete: string;
    alerts: { lastAdmin: string; selfDelete: string; passwordUpdated: string; passwordInvalid: string; operationFailed: string };
    resetPrompt: string;
  };

  login: {
    title: string;
    email: string; password: string; loginButton: string;
    errors: { invalid: string; rateLimit: string };
  };

  setup: {
    title: string;
    wizard: {
      step1: string; step2: string;
      db: {
        provider: string; manual: string; connectionString: string;
        host: string; port: string; database: string; user: string; password: string;
        mongoInfo: string; success: string; error: string;
        initButton: string; initLoading: string;
      };
      admin: {
        email: string; password: string; confirmPassword: string;
        createButton: string; creating: string;
        errors: { passwordTooShort: string; notMatch: string; setupFailed: string; generic: string };
      };
    };
    vercel: {
      intro: string; missingVars: string; table: { name: string; description: string };
      steps: { env: string; compile: string; redeploy: string; verify: string };
      compileGuide: string; secretsInfo: string; downloadButton: string; copyButton: string;
      warning: string; redeployInfo: string; verifyButton: string; verifying: string; success: string;
      errors: { failed: string; connectionFailed: string; unreachable: string };
      fullTable: string;
    };
  };

  participantFlow: {
    codeEntry: { placeholder: string; continue: string; errors: { rateLimit: string } };
    stepView: {
      positionOf: string; stepDistance: string; stepTime: string;
      totalDistance: string; totalTime: string; na: string;
      highway: string; yes: string; no: string; toll: string;
    };
    errors: {
      invalidCode: string; codeNotAvailable: string; alreadyUsed: string;
      locationDenied: string; routeComplete: string; generic: string;
    };
    privacyNotice: string; consentButton: string; stepHint: string; openLocation: string;
    insecureWarning: string; geolocationError: string; timeoutError: string; noGeolocation: string;
    notYetAvailable: string;
  };

  eventInfo: { start: string; end: string; region: string; na: string };

  common: {
    na: string; copied: string; copy: string; openInMaps: string;
    save: string; cancel: string; delete: string; edit: string;
    search: string; loading: string; error: string; retry: string;
    close: string; confirm: string;
  };

  validation: {
    event: { endAfterStart: string };
    codes: { minLength: string; pattern: string };
    setup: { connectionRequired: string; passwordLength: string };
    users: { passwordLength: string; noChanges: string };
  };

  status: {
    display: {
      not_started: string; opened_site: string; started: string;
      in_progress: string; arrived: string; blocked: string; expired: string; na: string;
    };
    inviteCode: {
      created: string; valid: string; scheduled: string; started: string;
      in_progress: string; arrived: string; expired: string; revoked: string;
      blocked: string; deleted: string; na: string;
    };
  };

  ticketGenerator: {
    title: string; description: string; print: string;
    quantity: string; usernamePrefix: string; createCodes: string;
    selectAll: string; selectedCount: string; empty: string; na: string;
    errors: { createFailed: string; baseUrlMissing: string; popupBlocked: string };
    text: string; content: string; font: string; weight: string;
    alignment: string; textColor: string; letterSpacing: string;
    lineHeight: string; fontSize: string;
    alignLeft: string; alignCenter: string; alignRight: string;
    uppercase: string; autoFit: string;
    background: string; bgColor: string; imageFit: string; imageDarken: string;
    uploadImage: string; removeImage: string;
    fitCover: string; fitContain: string;
    qrCode: string; qrContent: string; qrPosition: string; baseUrl: string;
    qrColor: string; qrBgColor: string; showCodeBelow: string;
    qrLink: string; qrCodeOnly: string;
    positionLeft: string; positionRight: string;
    divider: string; showDivider: string; dividerColor: string;
    cardWidth: string; cardHeight: string; cardPadding: string; cardRadius: string;
    pageOrientation: string; portrait: string; landscape: string;
    columns: string; column1: string; column2: string; column3: string; column4: string;
    columnWarning: string; rowInfo: string; preset3x3: string;
    preview: string; previewInfo: string; previewFallback: string;
    printTitle: string; printInfo: string;
  };

  mapStyleToggle: {
    satellite: string; dark: string;
    enableSatellite: string; enableDark: string;
  };

  accessShare: {
    qrLink: string; qrCode: string; shareLink: string; shareCode: string;
    success: string; copyError: string;
  };
}
