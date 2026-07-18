export interface Dictionary {
  nav: {
    events: string;
    users: string;
    account: string;
    settings: string;
    logout: string;
    menu: string;
  };

  settings: {
    title: string;
    language: {
      section: string; description: string; auto: string;
      italian: string; english: string; spanish: string;
      french: string; german: string; portuguese: string; dutch: string; polish: string;
    };
    version: {
      section: string; current: string; check: string; checking: string;
      available: string; availableTo: string; viewOnGithub: string; failed: string; upToDate: string;
      update: string; updating: string; updateStarted: string; updateFailed: string; notConfigured: string;
      confirmSelfUpdate: string; confirmDeployHook: string;
    };
    info: { section: string; environment: string; commit: string; notAvailable: string };
    smtp: {
      section: string;
      description: string;
      host: string;
      port: string;
      secure: string;
      user: string;
      password: string;
      fromName: string;
      fromEmail: string;
      enabled: string;
      enabledHint: string;
      save: string;
      saving: string;
      saved: string;
      sendTest: string;
      sendingTest: string;
      testSent: string;
      notConfigured: string;
      errors: { saveFailed: string; testFailed: string; testSent: string; invalid: string; testError: string };
    };
    logs: {
      section: string;
      description: string;
      empty: string;
      more: string;
      loadMore: string;
      table: { type: string; time: string; details: string; event: string; participant: string };
      categories: { all: string; admin: string; event: string };
      types: {
        admin_login: string;
        admin_login_failed: string;
        admin_action: string;
        password_reset_request: string;
        password_reset_success: string;
        code_verify_success: string;
        code_verify_invalid: string;
        code_verify_already_used: string;
        code_not_yet_available: string;
        code_not_available: string;
        site_opened: string;
        geolocation_denied: string;
        session_started: string;
        location_update: string;
        step_unlocked: string;
        arrived: string;
        routing_error: string;
      };
    };
    turnstile: {
      section: string;
      description: string;
      siteKeyLabel: string;
      siteKeyHint: string;
      secretKeyLabel: string;
      secretKeyHint: string;
      enabledLabel: string;
      save: string;
      saving: string;
      saved: string;
      errors: { saveFailed: string };
    };
    navLayout: {
      section: string;
      description: string;
      horizontal: string;
      sidebar: string;
    };
    ngrok: {
      section: string;
      description: string;
      authtokenLabel: string;
      authtokenHint: string;
      domainLabel: string;
      domainPlaceholder: string;
      domainHint: string;
      save: string;
      saving: string;
      saved: string;
      start: string;
      starting: string;
      stop: string;
      stopping: string;
      running: string;
      stopped: string;
      urlLabel: string;
      shareHint: string;
      notConfigured: string;
      errors: {
        saveFailed: string;
        notConfigured: string;
        vercelUnsupported: string;
        decryptFailed: string;
        startFailed: string;
        startFailedWithDetail: string;
      };
    };
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
      actions: { revoke: string; delete: string; openLink: string; qr: string; activate: string };
      errors: { createFailed: string };
      confirm: { revoke: string; delete: string };
    };
    statusToggle: { active: string; inactive: string; activate: string; deactivate: string };
  };

  participants: {
    manager: {
      generate: string; generated: string; username: string; usernamePlaceholder: string;
      showQR: string; hideCode: string; searchPlaceholder: string; allStatuses: string;
      selectedCount: string; deleteSelected: string; participants: string;
      table: { code: string; username: string; status: string; step: string };
      empty: string; noResults: string; na: string;
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
    forgotPasswordLink: string;
    errors: { invalid: string; rateLimit: string; captchaFailed: string };
    forgotPassword: {
      title: string;
      description: string;
      email: string;
      submit: string;
      submitting: string;
      sent: string;
      backToLogin: string;
      errors: { generic: string; rateLimited: string };
    };
    resetPassword: {
      title: string;
      description: string;
      newPassword: string;
      confirmPassword: string;
      submit: string;
      submitting: string;
      success: string;
      invalidToken: string;
      backToLogin: string;
      errors: { tooShort: string; notMatch: string; expired: string; invalid: string; generic: string };
    };
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

  announcements: {
    nav: string;
    composerTitle: string;
    editTitle: string;
    titleLabel: string;
    titlePlaceholder: string;
    messageLabel: string;
    messagePlaceholder: string;
    imageLabel: string;
    changeImage: string;
    removeImage: string;
    send: string;
    sending: string;
    save: string;
    saving: string;
    cancel: string;
    edit: string;
    delete: string;
    confirmDelete: string;
    recent: string;
    empty: string;
    feedTitle: string;
    open: string;
    close: string;
    errors: {
      titleRequired: string;
      messageRequired: string;
      imageTooLarge: string;
      generic: string;
      updateFailed: string;
      deleteFailed: string;
    };
  };
}
