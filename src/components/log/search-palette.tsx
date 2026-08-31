import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatShort } from "@/lib/slog/calendar";
import type { SearchHit } from "@/lib/slog/types";

export function SearchPalette({
  open,
  onOpenChange,
  onQuery,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onQuery: (q: string) => Promise<SearchHit[]> | SearchHit[];
  onPick: (hit: SearchHit) => void;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      void Promise.resolve(onQuery(q)).then(setHits);
    }, 120);
    return () => window.clearTimeout(t);
  }, [q, open, onQuery]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0">
        <DialogTitle className="sr-only">搜索日志</DialogTitle>
        <DialogDescription className="sr-only">按原文、地点、备注检索</DialogDescription>
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="size-4 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="找一个人、一门课、一次旅行…"
            className="h-12 border-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <ul className="max-h-80 overflow-y-auto p-2">
          {hits.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-muted-foreground">
              {q ? "没有找到。忘了的事，往往就不重要。" : "这就是他反复提到的「寻找」。"}
            </li>
          ) : (
            hits.map((h) => (
              <li key={`${h.kind}-${h.id}`}>
                <button
                  type="button"
                  className="flex w-full flex-col rounded-md px-3 py-2 text-left hover:bg-muted"
                  onClick={() => {
                    onPick(h);
                    onOpenChange(false);
                  }}
                >
                  <span className="text-sm">{h.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {h.date.length === 10 ? formatShort(h.date) : h.date} · {h.snippet}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
