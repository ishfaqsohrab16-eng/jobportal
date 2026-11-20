/**
 * Download a file from the API using the session cookie, so errors (e.g. "no
 * resumes match") can be shown as a toast instead of a broken browser tab.
 */
export async function downloadFromApi(url: string, fallbackName: string) {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    let message = `Download failed (${res.status})`;
    try {
      const body = await res.json();
      message = body?.error?.message ?? message;
    } catch {
      /* not JSON */
    }
    throw new Error(message);
  }
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const name = /filename="?([^";]+)"?/i.exec(disposition)?.[1] ?? fallbackName;
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
}

/** Build `/api/...?a=b` from a params object, skipping empty values. */
export function apiUrl(path: string, params: Record<string, string | number | undefined | null>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  const s = qs.toString();
  return `/api${path}${s ? `?${s}` : ""}`;
}
