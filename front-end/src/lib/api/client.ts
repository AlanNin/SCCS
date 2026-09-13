import { env } from "@/env";
import type { ApiErrorBody } from "@/types/api";

/** Thrown for every non-2xx response, and for network failures (status 0). */
export class ApiError extends Error {
  readonly status: number;
  readonly path?: string;

  constructor(message: string, status: number, path?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.path = path;
  }

  get isNotFound() {
    return this.status === 404;
  }

  /** The backend could not be reached at all (down, wrong URL, CORS, offline). */
  get isUnreachable() {
    return this.status === 0;
  }
}

async function parseErrorBody(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as ApiErrorBody;
    return Array.isArray(body.message) ? body.message.join(", ") : body.message;
  } catch {
    return res.statusText || `Request failed with status ${res.status}`;
  }
}

/**
 * Thin fetch wrapper shared by every resource module. Works from both
 * Server Components (SSR) and the browser since NEXT_PUBLIC_API_URL is
 * available in both contexts.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${env.NEXT_PUBLIC_API_URL}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      // Data changes via mutations elsewhere (recompute, counts); TanStack
      // Query owns client-side caching, so Next's fetch cache would only
      // add a layer of staleness with no benefit here.
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      `Could not reach the API at ${env.NEXT_PUBLIC_API_URL}. Is the backend running?`,
      0,
      path,
    );
  }

  if (!res.ok) {
    throw new ApiError(await parseErrorBody(res), res.status, path);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
