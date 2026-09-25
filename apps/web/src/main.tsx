import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { MotionConfig } from "motion/react";
import "@fontsource-variable/inter";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/jetbrains-mono";
import "./index.css";
import { store } from "./store";
import App from "./App";
import { ThemeSync } from "./components/layout/Splash";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      {/* "user" = honour the OS reduced-motion setting everywhere. */}
      <MotionConfig reducedMotion="user">
        <ThemeSync />
        <App />
      </MotionConfig>
    </Provider>
  </StrictMode>,
);
