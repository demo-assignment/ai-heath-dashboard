import { API_BASE_URL } from "./endpoints";

export const UNAUTHORIZED_EVENT = "hearty:unauthorized";
let sessionEpoch = 0;
export const invalidateSessionRequests = () => {
  sessionEpoch += 1;
};

export interface ApiErrorDetail {
  field?: string;
  row?: number;
  column?: string;
  message: string;
}

export class ApiError extends Error {
  code: string;
  retryable: boolean;
  status?: number;
  details: ApiErrorDetail[];

  constructor(message: string, code: string, retryable: boolean, status?: number, details: ApiErrorDetail[] = []) {
    super(message);
    this.code = code;
    this.retryable = retryable;
    this.status = status;
    this.details = details;
  }
}

export interface ApiRequestInit extends RequestInit {
  // Login failures are form feedback, not an expired session.
  skipUnauthorizedEvent?: boolean;
}

export const notifyUnauthorized = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
};

export const toApiError = async (response: Response) => {
  const body = await response.json().catch(() => null);
  const error = body?.error;
  return new ApiError(
    error?.message || "Something went wrong! Please try again later.",
    error?.code || `HTTP_${response.status}`,
    error?.retryable ?? response.status >= 500,
    response.status,
    Array.isArray(error?.details) ? error.details : [],
  );
};

export const request = async <T>(endpoint: string, init: ApiRequestInit = {}): Promise<T> => {
  const { skipUnauthorizedEvent, ...fetchInit } = init;
  const epoch = sessionEpoch;
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, { ...fetchInit, credentials: "include" });
  } catch {
    throw new ApiError("Can't reach the server. Please check your connection.", "NETWORK_ERROR", true);
  }

  if (epoch !== sessionEpoch) throw new ApiError("This request belongs to a previous session.", "STALE_REQUEST", false);
  if (!response.ok) {
    if (response.status === 401 && !skipUnauthorizedEvent) notifyUnauthorized();
    throw await toApiError(response);
  }
  const body = (await response.json()) as T;
  if (epoch !== sessionEpoch) throw new ApiError("This request belongs to a previous session.", "STALE_REQUEST", false);
  return body;
};
