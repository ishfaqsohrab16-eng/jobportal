import type { ApiErrorBody } from "@digibizz/jobs-shared";

function body(err: unknown): ApiErrorBody["error"] | null {
  if (err && typeof err === "object" && "data" in err) {
    const data = (err as { data?: unknown }).data;
    if (data && typeof data === "object" && "error" in data) return (data as ApiErrorBody).error;
  }
  return null;
}

export function errorStatus(err: unknown): number | null {
  if (err && typeof err === "object" && "status" in err && typeof (err as { status: unknown }).status === "number") {
    return (err as { status: number }).status;
  }
  return null;
}

export function errorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  const b = body(err);
  if (b?.message) return b.message;
  if (err && typeof err === "object" && "status" in err && (err as { status: unknown }).status === "FETCH_ERROR") {
    return "Can't reach the server. Check your connection.";
  }
  return fallback;
}

export function fieldErrors(err: unknown): Record<string, string> {
  return body(err)?.fields ?? {};
}
