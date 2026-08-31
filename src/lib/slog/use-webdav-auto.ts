import { useEffect, useRef } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { maybeWebdavBackup } from "./api";

const CHECK_EVERY_MS = 30 * 60 * 1000;

export function useWebdavAutoBackup() {
  const { user } = useCurrentUserState();
  const running = useRef(false);

  useEffect(() => {
    if (!user || user.isDevFallback) return;

    async function tick() {
      if (running.current) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      running.current = true;
      try {
        await maybeWebdavBackup();
      } catch {
        /* keep writing; next check retries */
      } finally {
        running.current = false;
      }
    }

    void tick();
    const id = window.setInterval(() => void tick(), CHECK_EVERY_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [user?.id, user?.isDevFallback]);
}
