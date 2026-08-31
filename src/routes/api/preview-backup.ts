import { createFileRoute } from "@tanstack/react-router";
import { dbSource } from "@/lib/db";
import { dumpPreviewAllUsers } from "@/lib/slog/api";

export const Route = createFileRoute("/api/preview-backup")({
  server: {
    handlers: {
      GET: async () => {
        if (dbSource !== "pglite") {
          return new Response("backup is only for the preview database", { status: 404 });
        }
        const payload = await dumpPreviewAllUsers();
        return Response.json(payload);
      },
    },
  },
});
