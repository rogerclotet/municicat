"use client";

import { useEffect } from "react";

/**
 * Registers the offline shell. Failure is non-fatal — the game works without it, so a
 * blocked or unsupported service worker must not surface as an error to the player.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
      console.warn("Service worker registration failed", error);
    });
  }, []);

  return null;
}
