import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { useMeQuery } from "@/store/api";
import { useAppDispatch, useAppSelector } from "@/store";
import { pushToast, setTheme, type ToastTone } from "@/store/uiSlice";

/** Current session. `user` is null for guests; errors (401) are treated as "signed out". */
export function useAuth() {
  const { data, isLoading, isFetching, isError } = useMeQuery();
  const user = isError ? null : (data?.user ?? null);
  return { user, isLoading: isLoading || (isFetching && !data && !isError), isAdmin: user?.role === "admin" };
}

export function useTheme() {
  const theme = useAppSelector((s) => s.ui.theme);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("theme-switching");
    root.dataset.theme = theme;
    try {
      localStorage.setItem("dbj-theme", theme);
    } catch {
      /* storage may be unavailable - the theme still applies for this visit */
    }
    const id = window.setTimeout(() => root.classList.remove("theme-switching"), 350);
    return () => window.clearTimeout(id);
  }, [theme]);

  const toggle = useCallback(() => dispatch(setTheme(theme === "dark" ? "light" : "dark")), [dispatch, theme]);
  return { theme, toggle, set: (t: "dark" | "light") => dispatch(setTheme(t)) };
}

export function useToast() {
  const dispatch = useAppDispatch();
  return useMemo(() => {
    const make = (tone: ToastTone) => (title: string, body?: string) => dispatch(pushToast({ tone, title, body }));
    return { success: make("success"), error: make("error"), info: make("info") };
  }, [dispatch]);
}

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = `${title} · DigiBizz Jobs`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

/** Run `handler` on ⌘/Ctrl + key. */
export function useHotkey(key: string, handler: () => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === key) {
        e.preventDefault();
        ref.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [key]);
}

/**
 * Filter state that lives in the URL, so filtered pages can be shared and
 * survive a refresh. Changing any filter other than `page` resets to page 1.
 */
export function useUrlFilters<K extends string>(keys: readonly K[]) {
  const [params, setParams] = useSearchParams();
  const values = useMemo(
    () => Object.fromEntries(keys.map((k) => [k, params.get(k) ?? ""])) as Record<K, string>,
    // keys is a module-level constant at every call site
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params],
  );
  const set = useCallback(
    (patch: Partial<Record<K, string>>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch) as [string, string | undefined][]) {
            if (v) next.set(k, v);
            else next.delete(k);
          }
          if (!("page" in patch)) next.delete("page");
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );
  const clear = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams]);
  return { values, set, clear };
}

/** Pointer position relative to an element, for spotlight / tilt effects. */
export function usePointerGlow<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    el.addEventListener("pointermove", onMove);
    return () => el.removeEventListener("pointermove", onMove);
  }, []);
  return ref;
}
