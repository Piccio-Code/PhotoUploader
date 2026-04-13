const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

function assertAbsoluteHttpUrl(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing env var: ${name}. Configure it in your Vite env (e.g. .env.local).`);
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`Invalid ${name}: "${value}". Expected an absolute URL (http/https).`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Invalid ${name}: only http/https protocols are allowed.`);
  }

  return parsed.origin + parsed.pathname.replace(/\/+$/, "");
}

function parseTimeoutMs(raw: string | undefined): number {
  if (!raw) return 15000;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1000) return 15000;
  return Math.floor(parsed);
}

export const API_BASE_URL = assertAbsoluteHttpUrl("VITE_API_BASE_URL", rawApiBaseUrl);
export const API_TIMEOUT_MS = parseTimeoutMs(import.meta.env.VITE_API_TIMEOUT_MS as string | undefined);
