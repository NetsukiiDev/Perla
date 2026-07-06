export function codeAccessPath(code: string): string {
  return `/?code=${encodeURIComponent(code)}`;
}

export function codeAccessUrl(origin: string, code: string): string {
  return `${origin.replace(/\/$/, "")}${codeAccessPath(code)}`;
}
