"use client";

import { useCallback, useEffect, useState } from "react";

export type NotificationSupportState =
  | "supported"
  | "unsupported"
  | "unknown";

export interface UseNotificationPermissionResult {
  permission: NotificationPermission;
  isSupported: boolean;
  supportState: NotificationSupportState;
  requestPermission: () => Promise<NotificationPermission>;
  subscribeToPush: () => Promise<boolean>;
  unsubscribeFromPush: () => Promise<boolean>;
}

/**
 * Hook for browser notification permission and Web Push subscription.
 *
 * Notes:
 * - The Web Push API requires HTTPS in production. localhost is allowed
 *   for development.
 * - We register `/sw.js` as the service worker.
 * - Subscriptions are persisted to /api/notifications/subscribe.
 * - VAPID keys are NOT required for the basic notification flow used here
 *   (we rely on browser-local notifications via showNotification when the
 *    server cannot reach the user). When a VAPID public key is available
 *   via NEXT_PUBLIC_VAPID_PUBLIC_KEY we wire it into the subscription.
 */
export function useNotificationPermission(): UseNotificationPermissionResult {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [supportState, setSupportState] =
    useState<NotificationSupportState>("unknown");

  useEffect(() => {
    if (typeof window === "undefined") {
      setSupportState("unsupported");
      return;
    }

    const supported =
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window;
    setSupportState(supported ? "supported" : "unsupported");

    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof Notification === "undefined") return "denied";
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const subscribeToPush = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return false;
    }

    try {
      const registration =
        (await navigator.serviceWorker.getRegistration("/sw.js")) ||
        (await navigator.serviceWorker.register("/sw.js"));

      // Wait for the SW to become ready
      await navigator.serviceWorker.ready;

      const existing = await registration.pushManager.getSubscription();
      let subscription = existing;
      if (!subscription) {
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        const opts: PushSubscriptionOptionsInit = {
          userVisibleOnly: true,
        };
        if (vapidKey) {
          // Cast to BufferSource — the runtime type accepts Uint8Array even
          // though TS strictness flags the SharedArrayBuffer overlap.
          opts.applicationServerKey = urlBase64ToUint8Array(
            vapidKey
          ) as unknown as BufferSource;
        }
        try {
          subscription = await registration.pushManager.subscribe(opts);
        } catch (e) {
          // Browsers without VAPID configured will throw; that's OK — the
          // service worker can still surface local notifications.
          console.warn("Push subscribe failed:", e);
          return false;
        }
      }

      const res = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      return res.ok;
    } catch (e) {
      console.warn("subscribeToPush failed:", e);
      return false;
    }
  }, []);

  const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      if (registration) {
        const sub = await registration.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
      }
      await fetch("/api/notifications/subscribe", { method: "DELETE" });
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    permission,
    isSupported: supportState === "supported",
    supportState,
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
  };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData =
    typeof window !== "undefined" ? window.atob(base64) : Buffer.from(base64, "base64").toString("binary");
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
