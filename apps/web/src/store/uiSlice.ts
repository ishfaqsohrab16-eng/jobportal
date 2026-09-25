import { createSlice, nanoid, type PayloadAction } from "@reduxjs/toolkit";

export type ThemePref = "light" | "dark";
export type ToastTone = "success" | "error" | "info";

export interface Toast {
  id: string;
  tone: ToastTone;
  title: string;
  body?: string;
}

interface UiState {
  theme: ThemePref;
  toasts: Toast[];
}

function readTheme(): ThemePref {
  try {
    return localStorage.getItem("dbj-theme") === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

const initialState: UiState = { theme: readTheme(), toasts: [] };

export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<ThemePref>) {
      state.theme = action.payload;
    },
    pushToast: {
      reducer(state, action: PayloadAction<Toast>) {
        state.toasts = [...state.toasts.slice(-3), action.payload];
      },
      prepare(toast: Omit<Toast, "id">) {
        return { payload: { ...toast, id: nanoid() } };
      },
    },
    dismissToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
  },
});

export const { setTheme, pushToast, dismissToast } = uiSlice.actions;
