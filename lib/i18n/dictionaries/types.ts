import type { it } from "./it";

// The Italian dictionary defines the required shape; every locale must provide
// the same keys (string leaves), enforced by typing each locale as Dictionary.
export type Dictionary = typeof it;
