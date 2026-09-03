export type DayTone =
  | "month"
  | "important"
  | "social"
  | "first"
  | "cycle"
  | "emo"
  | "memory"
  | "favorite";

export type EntryKind =
  | "ordinary"
  | "hobby"
  | "important"
  | "class"
  | "skipped"
  | "trip"
  | "activity"
  | "movie"
  | "book"
  | "flight"
  | "pride";

export type EntryMarker =
  | "flight"
  | "car"
  | "birthday"
  | "gift"
  | "sick"
  | "rain"
  | "candle"
  | "grad"
  | "star"
  | "coffee"
  | "book"
  | "film";

export type NoteKind =
  | "reminder"
  | "summary"
  | "goal"
  | "quote"
  | "course"
  | "checklist"
  | "plan";

export type SpanKind = "trip" | "stay" | "friend" | "block";

export type Emphasis = "normal" | "bold" | "large";

export type SheetKey = `${number}-H1` | `${number}-H2`;

export type ViewMode = "week" | "month" | "half";

export type LayerMode = "log" | "todo" | "both";

export type DayRecord = {
  id: string;
  date: string;
  primaryTone: DayTone;
  secondaryTone: DayTone | null;
  location: string;
  headerNote: string;
  p3: string[];
  journal: string;
};

export type LogEntry = {
  id: string;
  date: string;
  kind: EntryKind;
  body: string;
  marker: EntryMarker | null;
  emphasis: Emphasis;
  starred: boolean;
  sortOrder: number;
};

export type LogImage = {
  id: string;
  date: string;
  dataUrl: string;
  thumbUrl?: string;
  caption: string;
  sortOrder: number;
};

export type LogNote = {
  id: string;
  sheetKey: string;
  weekStart: string | null;
  kind: NoteKind;
  title: string;
  body: string;
  tone: DayTone | null;
  emphasized: boolean;
  sortOrder: number;
};

export type LogSpan = {
  id: string;
  startDate: string;
  endDate: string;
  kind: SpanKind;
  label: string;
  color: string;
  showWeeks: boolean;
};

export type DayTodo = {
  id: string;
  date: string;
  body: string;
  done: boolean;
  sortOrder: number;
};

export type LogSettings = {
  favoriteLabel: string;
  semesterStart: string | null;
};

export type LogSnapshot = {
  sheetKey: string;
  settings: LogSettings;
  days: Record<string, DayRecord>;
  entries: Record<string, LogEntry[]>;
  images: Record<string, LogImage[]>;
  todos: Record<string, DayTodo[]>;
  notes: LogNote[];
  spans: LogSpan[];
};

export type SearchHit = {
  id: string;
  date: string;
  kind: "entry" | "note" | "day" | "span";
  title: string;
  snippet: string;
};

export const DAY_TONES: { id: DayTone; label: string; hint: string }[] = [
  { id: "month", label: "月份底色", hint: "这一天没有特别的主色，跟着月份走" },
  { id: "important", label: "重要", hint: "考试、DDL、交作业、入党、运动会" },
  { id: "social", label: "朋友 / 家人", hint: "见面、聚餐；电话用小一号的绿" },
  { id: "first", label: "第一次", hint: "实习第一天、新年、解封、办卡、勇气" },
  { id: "favorite", label: "热爱", hint: "可换成你自己的事：照相、球赛、演出" },
  { id: "emo", label: "情绪低谷", hint: "崩溃、生病、状态不好——正视它" },
  { id: "memory", label: "不想忘记", hint: "公共事件、缅怀，比自己的 emo 更深" },
  { id: "cycle", label: "周期", hint: "一个月一次，用来观察身体节奏" },
];

export const ENTRY_KINDS: { id: EntryKind; label: string; hint: string }[] = [
  { id: "ordinary", label: "日常", hint: "普通作业、核酸、复习" },
  { id: "hobby", label: "想做的", hint: "爱好、投稿、写信——不是必须，是想" },
  { id: "important", label: "要紧", hint: "交作业、开会、抢考位、别人送的礼物" },
  { id: "class", label: "课表", hint: "当天要上的课" },
  { id: "skipped", label: "翘了", hint: "本该去但没去，方便回头问同学" },
  { id: "trip", label: "行程", hint: "飞机、高铁、几点到几点" },
  { id: "activity", label: "旅途里", hint: "金字塔、国家画廊、当天玩了什么" },
  { id: "movie", label: "电影", hint: "在家看；院线请在正文前写「院线」" },
  { id: "book", label: "阅读", hint: "读《…》·页码；读完就写读完" },
  { id: "flight", label: "航班", hint: "转机、时长" },
  { id: "pride", label: "为自己骄傲", hint: "录取、奖学金、粉丝破百" },
];

export const SPAN_PALETTE: { id: string; label: string }[] = [
  { id: "trip-pink", label: "粉·高贵" },
  { id: "trip-blue", label: "蓝·冷地" },
  { id: "trip-orange", label: "橘·西南" },
  { id: "trip-purple", label: "紫·项目" },
  { id: "trip-teal", label: "青·海" },
  { id: "trip-ink", label: "墨" },
];

export const VIEW_MODES: { id: ViewMode; label: string; hint: string }[] = [
  { id: "week", label: "一周", hint: "七个大格子，一段话也能铺满" },
  { id: "month", label: "一月", hint: "看一个月的颜色和字" },
  { id: "half", label: "半年", hint: "原来那张总表" },
];

export const LAYER_MODES: { id: LayerMode; label: string; hint: string }[] = [
  { id: "log", label: "日志", hint: "只看日记" },
  { id: "todo", label: "待办", hint: "格子里只看待办" },
  { id: "both", label: "一起", hint: "日记和待办都在格子里" },
];
