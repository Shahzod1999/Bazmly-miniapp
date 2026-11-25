import { ApiErrorResponse, TokenPair } from "./types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL !== undefined
    ? process.env.NEXT_PUBLIC_API_BASE_URL
    : typeof window !== "undefined"
    ? ""
    : "https://bazmly-backend-production.up.railway.app";

interface ValidationIssue {
  msg?: string;
  loc?: (string | number)[];
}

interface RawErrorBody {
  code?: string;
  message?: string;
  detail?: string | ValidationIssue[];
  details?: Record<string, unknown> | null;
  request_id?: string;
}

export class BazmlyApiError extends Error {
  public code: string;
  public status: number;
  public details?: Record<string, unknown> | null;
  public requestId?: string;

  constructor(status: number, data: RawErrorBody | null | undefined) {
    let msg = data?.message;
    if (!msg && Array.isArray(data?.detail)) {
      msg = data.detail.map((d) => d.msg || d.loc?.join(".") || "").filter(Boolean).join(", ");
    } else if (!msg && typeof data?.detail === "string") {
      msg = data.detail;
    }
    super(msg || `So'rov bajarilmadi (${status})`);
    this.name = "BazmlyApiError";
    this.status = status;
    this.code = data?.code || "unknown_error";
    this.details = data?.details || (Array.isArray(data?.detail) ? { errors: data.detail } : null);
    this.requestId = data?.request_id;
  }
}

export function isApiError(err: unknown): err is BazmlyApiError {
  return err instanceof BazmlyApiError;
}

// Token storage helpers
export const TOKEN_STORAGE_KEY = "bazmly_access_token";
export const REFRESH_TOKEN_STORAGE_KEY = "bazmly_refresh_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
}

export function setTokens(tokens: { access_token: string; refresh_token: string }) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_STORAGE_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, tokens.refresh_token);
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
}

function notifyLogout() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("auth:logout"));
  }
}

// Bir vaqtda faqat bitta refresh so'rovi yuboriladi; qolganlar shu Promise'ni kutadi.
let refreshPromise: Promise<string | null> | null = null;

async function requestNewAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const data: TokenPair = await res.json();
    setTokens({ access_token: data.access_token, refresh_token: data.refresh_token });
    return data.access_token;
  } catch {
    return null;
  }
}

/** Access tokenni yangilaydi. Muvaffaqiyatsiz bo'lsa sessiya tozalanadi va null qaytadi. */
function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = requestNewAccessToken()
      .then((token) => {
        if (!token) {
          clearTokens();
          notifyLogout();
        }
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

type QueryValue = string | number | boolean | null | undefined;

export interface FetchOptions extends RequestInit {
  params?: Record<string, QueryValue> | object;
  skipAuth?: boolean;
}

export async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, skipAuth, headers: customHeaders, ...restOptions } = options;

  let url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params as Record<string, QueryValue>).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  const headers = new Headers(customHeaders || {});
  if (!headers.has("Content-Type") && !(restOptions.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const token = !skipAuth ? getAccessToken() : null;
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(url, { ...restOptions, headers });
  } catch {
    throw new BazmlyApiError(0, {
      code: "network_error",
      message: "Internet aloqasi yo'q yoki server javob bermadi.",
    });
  }

  // 401: tokenni yangilab, so'rovni bir marta qaytaramiz
  if (response.status === 401 && !skipAuth && token) {
    const newToken = await refreshAccessToken();
    if (!newToken) {
      throw new BazmlyApiError(401, { code: "unauthorized", message: "Sessiya tugadi. Qaytadan kiring." });
    }
    headers.set("Authorization", `Bearer ${newToken}`);
    response = await fetch(url, { ...restOptions, headers });
  }

  if (!response.ok) {
    let errorData: Partial<ApiErrorResponse> | null = null;
    try {
      errorData = await response.json();
    } catch {
      errorData = {
        code: "http_error",
        message:
          response.status >= 500
            ? "Serverda xatolik. Birozdan so'ng urinib ko'ring."
            : `So'rov bajarilmadi (${response.status})`,
      };
    }
    throw new BazmlyApiError(response.status, errorData as RawErrorBody);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
