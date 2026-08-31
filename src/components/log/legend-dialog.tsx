import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { TONE_COLORS } from "@/lib/slog/colors";
import { MONTH_COLORS } from "@/lib/slog/colors";
import { DAY_TONES, ENTRY_KINDS } from "@/lib/slog/types";

export function LegendDialog({
  open,
  onOpenChange,
  favoriteLabel,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  favoriteLabel: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogTitle>图例 · 他当初就是这样涂的</DialogTitle>
        <DialogDescription>
          颜色是给眼睛用的检索。习惯之后，你不用看表头也能认出「这是周三，这是十月」。
        </DialogDescription>

        <section className="mt-4">
          <h3 className="text-sm font-medium">一天的主色</h3>
          <ul className="mt-2 space-y-1.5">
            {DAY_TONES.map((t) => (
              <li key={t.id} className="flex items-start gap-2 text-sm">
                <span
                  className="mt-0.5 size-4 shrink-0 rounded-sm"
                  style={{
                    background: t.id === "month" ? "var(--color-month-10)" : TONE_COLORS[t.id].bg,
                  }}
                />
                <span>
                  <strong className="font-medium">
                    {t.id === "favorite" ? favoriteLabel : t.label}
                  </strong>
                  <span className="text-muted-foreground"> · {t.hint}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-4">
          <h3 className="text-sm font-medium">格子里的字</h3>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {ENTRY_KINDS.map((k) => (
              <li key={k.id}>
                <span className="text-foreground">{k.label}</span> · {k.hint}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-4">
          <h3 className="text-sm font-medium">月份底色</h3>
          <div className="mt-2 grid grid-cols-6 gap-1">
            {Object.entries(MONTH_COLORS).map(([m, c]) => (
              <div
                key={m}
                className="rounded-sm px-1 py-2 text-center text-[11px]"
                style={{ background: c.bg, color: c.fg }}
              >
                {m}月
              </div>
            ))}
          </div>
        </section>

        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          左边那一列写学期周或旅行第几周；粗线框住一段时间；右边两列是康奈尔留白——提醒、复盘、鸡汤、课表、分数结构，都可以先写上，做不做另说。
        </p>
      </DialogContent>
    </Dialog>
  );
}
