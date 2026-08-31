import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { LiveLogWorkspace } from "@/components/log/live-workspace";
import { SiteHeader } from "@/components/site-header";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { currentSheetKey } from "@/lib/slog/calendar";
import { Skeleton } from "@/components/ui/skeleton";

type LogSearch = { sheet?: string };

export const Route = createFileRoute("/log")({
  validateSearch: (s: Record<string, unknown>): LogSearch => ({
    sheet: typeof s.sheet === "string" ? s.sheet : undefined,
  }),
  component: LogPage,
});

function LogPage() {
  const { user, isPending } = useCurrentUserState();
  const { sheet } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [fallback] = useState(() => currentSheetKey());
  const sheetKey = sheet ?? fallback;

  if (isPending) {
    return (
      <div className="min-h-svh">
        <SiteHeader solid />
        <div className="p-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="mt-4 h-96 w-full" />
        </div>
      </div>
    );
  }
  if (!user) return <RedirectToSignIn />;

  return (
    <div className="flex h-svh min-h-0 flex-col overflow-hidden">
      <SiteHeader solid />
      <div className="flex min-h-0 flex-1 flex-col">
        <LiveLogWorkspace
          sheetKey={sheetKey}
          onSheetChange={(key) => void navigate({ search: { sheet: key } })}
        />
      </div>
    </div>
  );
}
