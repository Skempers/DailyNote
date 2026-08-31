import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GuestLogWorkspace } from "@/components/log/guest-workspace";
import { SiteHeader } from "@/components/site-header";
import { Skeleton } from "@/components/ui/skeleton";
import { currentSheetKey } from "@/lib/slog/calendar";

type TrySearch = { sheet?: string };

export const Route = createFileRoute("/try")({
  validateSearch: (s: Record<string, unknown>): TrySearch => ({
    sheet: typeof s.sheet === "string" ? s.sheet : undefined,
  }),
  component: TryPage,
});

function TryPage() {
  const { sheet } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [fallback] = useState(() => currentSheetKey());
  const [ready, setReady] = useState(false);
  const sheetKey = sheet ?? fallback;

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <div className="flex h-svh min-h-0 flex-col overflow-hidden">
      <SiteHeader solid />
      <div className="flex min-h-0 flex-1 flex-col">
        {ready ? (
          <GuestLogWorkspace
            sheetKey={sheetKey}
            onSheetChange={(key) => void navigate({ search: { sheet: key } })}
          />
        ) : (
          <div className="space-y-3 p-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-96 w-full" />
          </div>
        )}
      </div>
    </div>
  );
}
