export interface ParticipantNetworkInfo {
  ipAddress: string | null;
  isp: string | null;
}

function normalizeIp(ip: string): string | null {
  const value = ip.trim();
  if (!value || value === "unknown") return null;
  if (value.startsWith("[") && value.includes("]")) return value.slice(1, value.indexOf("]"));
  const withoutMappedPrefix = value.startsWith("::ffff:") ? value.slice(7) : value;
  if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(withoutMappedPrefix)) {
    return withoutMappedPrefix.slice(0, withoutMappedPrefix.lastIndexOf(":"));
  }
  return withoutMappedPrefix;
}

function ipv4Parts(ip: string): number[] | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map((part) => Number(part));
  return nums.every((num) => Number.isInteger(num) && num >= 0 && num <= 255) ? nums : null;
}

function localIspLabel(ip: string): string | null {
  const v4 = ipv4Parts(ip);
  if (v4) {
    const [a, b] = v4;
    if (a === 127) return "Locale";
    if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254)) {
      return "Rete privata";
    }
    if (a === 100 && b >= 64 && b <= 127) return "Tailscale";
    return null;
  }

  const normalized = ip.toLowerCase();
  if (normalized === "::1") return "Locale";
  if (normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:")) return "Rete privata";
  return null;
}

function vcardValue(entity: unknown, key: "fn" | "org"): string | null {
  if (!entity || typeof entity !== "object" || !("vcardArray" in entity)) return null;
  const vcardArray = (entity as { vcardArray?: unknown }).vcardArray;
  if (!Array.isArray(vcardArray) || !Array.isArray(vcardArray[1])) return null;
  for (const entry of vcardArray[1]) {
    if (Array.isArray(entry) && entry[0] === key && typeof entry[3] === "string") {
      return entry[3];
    }
  }
  return null;
}

function rdapIspName(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const record = data as { name?: unknown; handle?: unknown; entities?: unknown };
  if (Array.isArray(record.entities)) {
    for (const entity of record.entities) {
      const org = vcardValue(entity, "org") ?? vcardValue(entity, "fn");
      if (org) return org;
    }
  }
  if (typeof record.name === "string" && record.name.trim()) return record.name.trim();
  if (typeof record.handle === "string" && record.handle.trim()) return record.handle.trim();
  return null;
}

export async function resolveParticipantNetworkInfo(ip: string): Promise<ParticipantNetworkInfo> {
  const ipAddress = normalizeIp(ip);
  if (!ipAddress) return { ipAddress: null, isp: null };

  const localLabel = localIspLabel(ipAddress);
  if (localLabel) return { ipAddress, isp: localLabel };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1800);
  try {
    const res = await fetch(`https://rdap.org/ip/${encodeURIComponent(ipAddress)}`, {
      headers: { accept: "application/rdap+json, application/json" },
      signal: controller.signal,
    });
    if (!res.ok) return { ipAddress, isp: null };
    const data = await res.json();
    return { ipAddress, isp: rdapIspName(data) };
  } catch {
    return { ipAddress, isp: null };
  } finally {
    clearTimeout(timeout);
  }
}
