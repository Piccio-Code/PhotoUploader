import { auth } from "./firebase";
import { API_BASE_URL, API_TIMEOUT_MS } from "./env";
import type { ApiResponse } from "./types";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

async function request<T>(
  method: string,
  path: string,
  opts?: { body?: unknown; formData?: FormData },
): Promise<T> {
  const headers: Record<string, string> = {
    ...(await getAuthHeaders()),
  };

  let body: BodyInit | undefined;
  if (opts?.formData) {
    body = opts.formData;
  } else if (opts?.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  const endpoint = `${API_BASE_URL}${path}`;
  let res: Response;
  try {
    res = await fetch(endpoint, { method, headers, body, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Richiesta scaduta. Controlla la connessione e riprova.");
    }
    throw new Error("Errore di connessione al server.");
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent("api:unauthorized"));
    throw new Error("Sessione scaduta. Effettua nuovamente il login.");
  }

  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    if (!res.ok) throw new Error(`Errore ${res.status}`);
    return undefined as T;
  }

  const envelope: ApiResponse<T> = await res.json();
  if (!envelope.success) {
    throw new Error(envelope.error ? String(envelope.error) : `Errore ${res.status}`);
  }
  return envelope.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),

  post: <T>(path: string, body?: unknown) =>
    request<T>("POST", path, { body }),

  put: <T>(path: string, body?: unknown) =>
    request<T>("PUT", path, { body }),

  del: <T>(path: string) => request<T>("DELETE", path),

  postForm: <T>(path: string, formData: FormData) =>
    request<T>("POST", path, { formData }),

  putForm: <T>(path: string, formData: FormData) =>
    request<T>("PUT", path, { formData }),
};
