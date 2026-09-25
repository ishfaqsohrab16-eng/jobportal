import { useEffect, useRef } from "react";
import {
  Fit,
  Layout,
  RuntimeLoader,
  useRive,
  useViewModel,
  useViewModelInstance,
  useViewModelInstanceBoolean,
  useViewModelInstanceTrigger,
} from "@rive-app/react-canvas";
import riveWasmUrl from "@rive-app/canvas/rive.wasm?url";
import { cn } from "@/lib/cn";

// Serve the runtime from our own origin instead of the default CDN.
RuntimeLoader.setWasmUrl(riveWasmUrl);

export interface MascotMood {
  /** Glows while the user is making progress (typing / form valid). */
  glow: boolean;
  /** Blushes and looks away while the password field has focus. */
  shy: boolean;
  /** Increment to play the celebration once (successful sign-in). */
  celebrate: number;
}

/**
 * Mazerance robot (Rive, by oneblvckboi). Its view model exposes
 * GlowOn / IsBlushing / IsTracking booleans and a "Trigger property" trigger;
 * the state machine also follows the pointer on its own.
 */
export default function RiveMascot({ mood, className }: { mood: MascotMood; className?: string }) {
  const { rive, RiveComponent } = useRive({
    src: "/rive/mazerance.riv",
    stateMachines: "State Machine 1",
    autoplay: true,
    autoBind: false,
    layout: new Layout({ fit: Fit.Cover }),
  });
  const viewModel = useViewModel(rive, { useDefault: true });
  const instance = useViewModelInstance(viewModel, { useDefault: true, rive });
  const glow = useViewModelInstanceBoolean("GlowOn", instance);
  const blush = useViewModelInstanceBoolean("IsBlushing", instance);
  const tracking = useViewModelInstanceBoolean("IsTracking", instance);
  const { trigger } = useViewModelInstanceTrigger("Trigger property", instance);

  useEffect(() => {
    if (instance) tracking.setValue(true);
    // setValue identity changes with the instance only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance]);
  useEffect(() => {
    if (instance) glow.setValue(mood.glow);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance, mood.glow]);
  useEffect(() => {
    if (instance) blush.setValue(mood.shy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance, mood.shy]);

  const lastCelebrate = useRef(mood.celebrate);
  useEffect(() => {
    if (instance && mood.celebrate !== lastCelebrate.current) {
      lastCelebrate.current = mood.celebrate;
      trigger();
    }
  }, [instance, mood.celebrate, trigger]);

  return (
    <div
      className={cn("relative", className)}
      style={{
        // Fade the artboard's square background into the surrounding canvas.
        maskImage: "radial-gradient(closest-side, black 62%, transparent 100%)",
        WebkitMaskImage: "radial-gradient(closest-side, black 62%, transparent 100%)",
      }}
    >
      <RiveComponent aria-label="Animated robot mascot" role="img" className="size-full" />
    </div>
  );
}
