import { LogWorkspace } from "./workspace";
import { localSearch } from "@/lib/slog/use-demo-log";
import { useGuestLog } from "@/lib/slog/use-guest-log";

export function GuestLogWorkspace({
  sheetKey,
  onSheetChange,
}: {
  sheetKey: string;
  onSheetChange: (key: string) => void;
}) {
  const guest = useGuestLog(sheetKey);
  return (
    <LogWorkspace
      sheetKey={sheetKey}
      onSheetChange={onSheetChange}
      adapter={{
        snap: guest.snap,
        pending: guest.isPending,
        draftNs: "guest",
        guest: true,
        patchSnap: guest.setSnap,
        search: (q) => localSearch(guest.snap, q),
      }}
    />
  );
}
