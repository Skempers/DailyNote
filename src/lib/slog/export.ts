import { WEEKDAYS, weekdayIndex, parseDate, viewRangeLabel } from "./calendar";
import { DAY_TONES } from "./types";
import type { LogSnapshot, ViewMode } from "./types";

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\r?\n/g, "&#10;");
}
function toneLabel(id: string | null | undefined): string {
  if (!id || id === "month") return "月份底色";
  return DAY_TONES.find((t) => t.id === id)?.label ?? id;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  downloadBlob(blob, filename);
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function cell(value: string | number, type: "String" | "Number" = "String"): string {
  return `<Cell><Data ss:Type="${type}">${type === "String" ? xmlEscape(String(value)) : value}</Data></Cell>`;
}

export function exportViewExcel(
  snap: LogSnapshot,
  dates: string[],
  view: ViewMode,
  opts: { sheetKey: string; weekMonday: string; year: number; month: number },
) {
  const title = viewRangeLabel(view, opts);
  const header = [
    "日期",
    "星期",
    "小标题",
    "地点",
    "主色",
    "次色",
    "正文",
    "P3-1",
    "P3-2",
    "P3-3",
    "条目",
    "照片数",
    "时段",
  ];

  const dayRows = dates.map((iso) => {
    const day = snap.days[iso];
    const entries = snap.entries[iso] ?? [];
    const images = snap.images?.[iso] ?? [];
    const span = snap.spans.find((s) => iso >= s.startDate && iso <= s.endDate);
    const weekday = WEEKDAYS[weekdayIndex(parseDate(iso))] ?? "";
    const p3 = day?.p3 ?? [];
    const body = entries.map((e) => e.body).join(" · ");
    return [
      iso,
      weekday,
      day?.headerNote ?? "",
      day?.location ?? "",
      toneLabel(day?.primaryTone),
      day?.secondaryTone ? toneLabel(day.secondaryTone) : "",
      day?.journal ?? "",
      p3[0] ?? "",
      p3[1] ?? "",
      p3[2] ?? "",
      body,
      String(images.length),
      span?.label ?? "",
    ];
  });

  const dateSet = new Set(dates);
  const noteRows = snap.notes
    .filter((n) => {
      if (!n.weekStart) return view === "half";
      return dateSet.has(n.weekStart);
    })
    .map((n) => [n.weekStart ?? "半年", n.kind, n.title, n.body]);

  const spanRows = snap.spans
    .filter((s) => dates.some((d) => d >= s.startDate && d <= s.endDate))
    .map((s) => [s.startDate, s.endDate, s.label, s.kind]);

  const daysXml = [
    `<Row>${header.map((h) => cell(h)).join("")}</Row>`,
    ...dayRows.map((row) => `<Row>${row.map((v) => cell(v)).join("")}</Row>`),
  ].join("");

  const notesXml = [
    `<Row>${["周起始", "类型", "标题", "正文"].map((h) => cell(h)).join("")}</Row>`,
    ...noteRows.map((row) => `<Row>${row.map((v) => cell(v)).join("")}</Row>`),
  ].join("");

  const spansXml = [
    `<Row>${["开始", "结束", "名称", "类型"].map((h) => cell(h)).join("")}</Row>`,
    ...spanRows.map((row) => `<Row>${row.map((v) => cell(v)).join("")}</Row>`),
  ].join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Top" ss:WrapText="1"/><Font ss:FontName="Microsoft YaHei" ss:Size="11"/></Style>
  </Styles>
  <Worksheet ss:Name="日子">
    <Table>${daysXml}</Table>
  </Worksheet>
  <Worksheet ss:Name="备注">
    <Table>${notesXml}</Table>
  </Worksheet>
  <Worksheet ss:Name="时段">
    <Table>${spansXml}</Table>
  </Worksheet>
</Workbook>`;

  const blob = new Blob(["\uFEFF", xml], { type: "application/vnd.ms-excel;charset=utf-8" });
  const safe = title.replace(/[\\/:*?"<>|]/g, "-");
  downloadBlob(blob, `SLog-${safe}.xls`);
}

export async function exportNodePng(node: HTMLElement, filename: string) {
  const { toPng } = await import("html-to-image");
  const width = Math.max(node.scrollWidth, node.offsetWidth);
  const height = Math.max(node.scrollHeight, node.offsetHeight);
  const pixelRatio = width > 1800 ? 1.4 : 2;
  const dataUrl = await toPng(node, {
    pixelRatio,
    backgroundColor: "#f3eee4",
    width,
    height,
    cacheBust: true,
    filter: (el) => {
      if (!(el instanceof HTMLElement)) return true;
      return el.dataset.exportIgnore !== "1";
    },
  });
  downloadDataUrl(dataUrl, filename);
}
