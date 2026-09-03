import { createServerFn } from "@tanstack/react-start";

/** True only when this deploy has its own Grok broker client (not the preview fallback). */
export const loadAuthFlags = createServerFn({ method: "GET" }).handler(async () => ({
  federated: Boolean(process.env.GROK_AUTH_CLIENT_ID?.trim()),
}));
