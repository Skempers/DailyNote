import type {
  DayRecord,
  DayTone,
  EntryKind,
  EntryMarker,
  LogEntry,
  LogNote,
  LogSnapshot,
  LogSpan,
  NoteKind,
} from "./types";

let n = 0;
function id(prefix: string) {
  n += 1;
  return `${prefix}-${n}`;
}

function day(
  date: string,
  primaryTone: DayTone,
  extra: Partial<Omit<DayRecord, "id" | "date" | "primaryTone">> = {},
): DayRecord {
  return {
    id: id("d"),
    date,
    primaryTone,
    secondaryTone: extra.secondaryTone ?? null,
    location: extra.location ?? "",
    headerNote: extra.headerNote ?? "",
    p3: extra.p3 ?? [],
    journal: extra.journal ?? "",
  };
}

function entry(
  date: string,
  kind: EntryKind,
  body: string,
  extra: Partial<Pick<LogEntry, "marker" | "emphasis" | "starred">> = {},
): LogEntry {
  return {
    id: id("e"),
    date,
    kind,
    body,
    marker: extra.marker ?? null,
    emphasis: extra.emphasis ?? "normal",
    starred: extra.starred ?? false,
    sortOrder: 0,
  };
}

function note(
  weekStart: string | null,
  kind: NoteKind,
  title: string,
  body: string,
  extra: Partial<Pick<LogNote, "tone" | "emphasized">> = {},
): LogNote {
  return {
    id: id("n"),
    sheetKey: "2024-H2",
    weekStart,
    kind,
    title,
    body,
    tone: extra.tone ?? null,
    emphasized: extra.emphasized ?? false,
    sortOrder: 0,
  };
}

function span(
  startDate: string,
  endDate: string,
  label: string,
  color: string,
  extra: Partial<Pick<LogSpan, "kind" | "showWeeks">> = {},
): LogSpan {
  return {
    id: id("s"),
    startDate,
    endDate,
    kind: extra.kind ?? "trip",
    label,
    color,
    showWeeks: extra.showWeeks ?? false,
  };
}

export function buildDemoSnapshot(): LogSnapshot {
  n = 0;
  const daysList: DayRecord[] = [
    day("2024-07-01", "first", {
      headerNote: "下半年开始",
      journal: "把半年摊开。这一次换成本地、换成网页。听林忆莲，把歌单整理进这一格。先写三个字也算开始。",
    }),
    day("2024-07-04", "month", {
      headerNote: "独立日",
      location: "纽约",
      journal: "独立日烟火。站在桥上看对岸，冷风把耳朵灌满。JFK 到市区四十五分钟，第一次觉得这座城愿意被走进去。",
    }),
    day("2024-07-08", "social", {
      location: "纽约",
      journal: "见阿河。中央公园走了两小时，谁也没提回去的机票。绿格子就是为了这种下午。",
    }),
    day("2024-07-12", "first", {
      location: "纽约",
      journal: "律所实习第一天。前台比我还紧张。领工牌、读利益冲突清单，结构是对的——被改到体无完肤之前先记住这句话。",
    }),
    day("2024-07-15", "favorite", { location: "纽约", journal: "海马体 · 律师风证件照。红色留给真正喜欢的事。" }),
    day("2024-07-20", "first", {
      journal: "第一次写法律备忘录。被改到体无完肤，但被留下一句：结构是对的。蓝格子是勇气的证据。",
    }),
    day("2024-07-26", "first", { journal: "第一次射箭，第一次浆板。读《P3》：每天只选三件最重要的。" }),
    day("2024-08-05", "first", {
      location: "A 所",
      journal: "整理卷宗目录，查类案，写起诉状草稿。实习可写进文书的：法律意见、起诉状、推文、法律汇编。",
    }),
    day("2024-08-08", "first", { headerNote: "扩列日", journal: "和很多人相遇的日子。记下来。不一定会再见面。" }),
    day("2024-08-10", "emo", {
      journal: "一边复习一边崩。从今天开始把崩溃也写下来，不当没发生过。连续灰超过一周就要停下来。",
    }),
    day("2024-08-11", "emo", { journal: "刑法。看不进去。把灰格子连成一片，回头才知道这周有多难。" }),
    day("2024-08-12", "emo", { journal: "发烧 + 电脑卡死。身体先投降的时候，表格还在。" }),
    day("2024-08-13", "important", { journal: "民诉 56 分，不能再拖。民法主观题模板明天过一遍。" }),
    day("2024-08-14", "important", { journal: "民法主观题模板过一遍。黄的日子不一定开心，但一定被看见。" }),
    day("2024-08-16", "important", { journal: "模拟卷 · 客观。做完改错再睡，别跟自己谈判。" }),
    day("2024-08-20", "social", {
      secondaryTone: "important",
      journal: "跟小满吃饭，比考试开心。凌晨五点还有一个补考窗口。绿上面再叠一层黄。",
    }),
    day("2024-08-24", "month", {
      journal:
        "今天好好早起床了，但相应的睡眠时间被压缩了，全天状态不太行，状态一般，充足睡眠还是非常非常必要的。看采访视频看到了提及的巴特说的一句话：你想做的事情不要等到明天做，不要等到你有钱了再做，要现在就去做。",
    }),
    day("2024-08-26", "cycle", { journal: "周期来了。比上个月早两天。用来观察，不是用来评判。" }),
    day("2024-09-01", "month", { headerNote: "开学准备", journal: "课表先全部写上。做不做另说，选择权得握在自己手里。" }),
    day("2024-09-02", "first", {
      headerNote: "开学第一天",
      journal: "新学期。国际法 / 商标法 / 证据法。蓝的。勇气来自无数个蓝格子。",
    }),
    day("2024-09-10", "important", { journal: "学年论文提纲 DDL。先写在格子里，截止日就不会从背后拍肩膀。" }),
    day("2024-09-16", "social", { journal: "给阿河写信。不是必须，是想。想做的事用小一号的字，但要写上。" }),
    day("2024-09-21", "month", {
      headerNote: "中秋",
      journal: "院线《宇宙探索编辑部》。月饼寄到宿舍，学委值班。节日不一定热闹，有颜色就够。",
    }),
    day("2024-09-28", "favorite", { journal: "哈利波特主题写真。红色。真正喜欢的事不用跟谁解释。" }),
    day("2024-10-01", "social", { headerNote: "国庆", journal: "家里人聚餐。绿的。电话也可以是小一号的绿。" }),
    day("2024-10-08", "important", {
      p3: ["民法", "民诉", "作息"],
      journal: "开始法考冲刺。每天 25 题 + 改错。读《埃萨斯》p.122。P3 写在格子顶上，免得一天被琐事吃掉。",
    }),
    day("2024-10-11", "month", {
      p3: ["刑诉", "理论法", "睡眠"],
      journal: "刑诉 / 理论法 / 刑法。狂犬病疫苗第三针。睡眠被写进 P3，才有可能真的睡。",
    }),
    day("2024-10-13", "important", { journal: "著作权法作业（又来了，别选这个老师）。每周都交，慎选。下次选课看这一格。" }),
    day("2024-10-18", "social", { location: "北京", journal: "小满来住 · 第 1 天。粗框。很开心。四天从今天开始数。" }),
    day("2024-10-19", "social", { journal: "手工 + 火锅。把朋友框在格子里，比发朋友圈记得更久。" }),
    day("2024-10-20", "social", { journal: "骑行去圆明园。风很大，话很少，这就够了。" }),
    day("2024-10-21", "social", { journal: "四天，记在旁边。送小满去车站，下雨。" }),
    day("2024-10-31", "first", {
      headerNote: "Halloween",
      journal: "第一次美式 Halloween party，和室友一起。Arbitration 本该有课，翘了。蓝的，第一次的勇气。",
    }),
    day("2024-11-01", "important", {
      headerNote: "法考客观",
      journal: "法考客观题。带准考证、水、巧克力。黄格子铺满的那一周，原来是为了这一天。",
    }),
    day("2024-11-04", "month", { headerNote: "Veterans Day?" }),
    day("2024-11-07", "month", { journal: "Arbitration · 麦当劳楼 200。课表写在格子里，回头问同学才不会慌。" }),
    day("2024-11-12", "first", { journal: "科学上网的号，记在传输助手。有些第一次很琐碎，也值得蓝一下。" }),
    day("2024-11-15", "first", {
      location: "伦敦",
      headerNote: "入境",
      journal: "PEK 0140 — DOH 转机 3h — LHR 0620。粉框从今天起。入境章盖上的时候，格子已经先到了。",
    }),
    day("2024-11-16", "favorite", {
      location: "伦敦",
      journal: "国家画廊。真是没看够。哈利波特纪念品。红色叠在粉色旅行框上。",
    }),
    day("2024-11-18", "month", { location: "伦敦", journal: "西敏寺 + 泰晤士河边走。冷冷的地方配冷冷的颜色。" }),
    day("2024-11-22", "social", {
      location: "伦敦",
      headerNote: "感恩节",
      journal: "和房东一家吃烤鸡。在别人的节日里做客人，绿格子依然成立。",
    }),
    day("2024-11-28", "month", { location: "伦敦", journal: "读完一篇同人文。写得真好。旅行末尾反而最安静。" }),
    day("2024-12-06", "first", {
      headerNote: "解封纪念日",
      journal: "解封。放大加粗。不能忘。有些新闻会过去，表格还在。深色留给不想忘记的公共事件。",
    }),
    day("2024-12-21", "social", { journal: "朋友画的圣诞树，单独框起来。想做的、别人送的，都写进格子。" }),
    day("2024-12-24", "first", { headerNote: "圣诞夜", journal: "飞机上重看《爱在黎明破晓前》。第一次在两万英尺过圣诞夜。" }),
    day("2024-12-25", "social", { headerNote: "圣诞", journal: "很多人给我发小作文。绿框。被惦记的证据。" }),
    day("2024-12-31", "first", {
      headerNote: "跨年",
      journal: "辞旧。明天又是一个蓝格子。半年写满了。能力变强的证据不在成绩单上，在这张表里。",
    }),
  ];

  const entriesList: LogEntry[] = [
    entry("2024-07-01", "pride", "把半年摊开。这一次换成本地、换成网页。", { starred: true, emphasis: "large" }),
    entry("2024-07-01", "hobby", "听林忆莲，把歌单整理进这一格"),
    entry("2024-07-04", "activity", "独立日烟花，站在桥上看对岸"),
    entry("2024-07-04", "flight", "JFK → 市区 45min", { marker: "car" }),
    entry("2024-07-08", "ordinary", "见阿河，中央公园走了两小时"),
    entry("2024-07-12", "pride", "律所实习第一天。前台比我还紧张。", { emphasis: "bold" }),
    entry("2024-07-12", "important", "领工牌、读利益冲突清单"),
    entry("2024-07-15", "hobby", "海马体 · 律师风证件照", { marker: "star" }),
    entry("2024-07-20", "pride", "第一次写法律备忘录，被改到体无完肤"),
    entry("2024-07-20", "pride", "但被留下一句：结构是对的", { starred: true }),
    entry("2024-07-26", "pride", "第一次射箭 / 第一次浆板", { emphasis: "large" }),
    entry("2024-07-26", "book", "读《P3》· 每天只选三件最重要的"),
    entry("2024-08-05", "ordinary", "整理卷宗目录 / 查类案"),
    entry("2024-08-05", "important", "写起诉状草稿", { emphasis: "bold" }),
    entry("2024-08-08", "pride", "和很多人相遇的日子。记下来。", { emphasis: "large" }),
    entry("2024-08-10", "ordinary", "一边复习一边崩。从今天开始。"),
    entry("2024-08-11", "ordinary", "刑法。看不进去。"),
    entry("2024-08-12", "ordinary", "发烧 + 电脑卡死", { marker: "sick" }),
    entry("2024-08-13", "important", "民诉 56 分，不能再拖"),
    entry("2024-08-14", "important", "民法主观题模板过一遍"),
    entry("2024-08-16", "important", "模拟卷 · 客观"),
    entry("2024-08-20", "hobby", "跟小满吃饭，比考试开心", { marker: "gift" }),
    entry("2024-08-20", "important", "凌晨 5 点的补考窗口"),
    entry("2024-08-26", "ordinary", "周期来了。比上个月早两天。"),
    entry("2024-09-02", "class", "国际法 / 商标法 / 证据法"),
    entry("2024-09-02", "pride", "新学期。课表先全部写上。"),
    entry("2024-09-10", "important", "学年论文提纲 DDL"),
    entry("2024-09-16", "hobby", "给阿河写信，不是必须，是想"),
    entry("2024-09-21", "movie", "院线《宇宙探索编辑部》"),
    entry("2024-09-21", "ordinary", "月饼寄到宿舍，学委值班"),
    entry("2024-09-28", "hobby", "哈利波特主题写真", { marker: "star" }),
    entry("2024-10-01", "ordinary", "家里人聚餐。绿的。"),
    entry("2024-10-08", "important", "开始法考冲刺。每天 25 题 + 改错。"),
    entry("2024-10-08", "book", "读《埃萨斯》· p.122"),
    entry("2024-10-11", "ordinary", "刑诉 / 理论法 / 刑法"),
    entry("2024-10-11", "ordinary", "狂犬病疫苗第三针"),
    entry("2024-10-13", "important", "著作权法作业（又来了，别选这个老师）"),
    entry("2024-10-18", "hobby", "小满来住 · 第 1 天"),
    entry("2024-10-19", "hobby", "手工 + 火锅"),
    entry("2024-10-20", "hobby", "骑行去圆明园"),
    entry("2024-10-21", "ordinary", "四天，记在旁边。"),
    entry("2024-10-21", "ordinary", "送小满去车站", { marker: "rain" }),
    entry("2024-10-31", "pride", "第一次美式 Halloween party，和室友一起", {
      emphasis: "large",
    }),
    entry("2024-10-31", "skipped", "Arbitration 本该有课"),
    entry("2024-11-01", "important", "法考客观题。带准考证、水、巧克力。", {
      emphasis: "large",
    }),
    entry("2024-11-07", "class", "Arbitration · 麦当劳楼 200"),
    entry("2024-11-12", "pride", "科学上网的号，记在传输助手", { emphasis: "bold" }),
    entry("2024-11-15", "flight", "PEK 0140 — DOH 转机 3h — LHR 0620", { marker: "flight" }),
    entry("2024-11-16", "activity", "国家画廊。真是没看够。"),
    entry("2024-11-16", "hobby", "哈利波特纪念品"),
    entry("2024-11-18", "activity", "西敏寺 + 泰晤士河边走"),
    entry("2024-11-22", "hobby", "和房东一家吃烤鸡"),
    entry("2024-11-28", "book", "读完一篇同人文。写得真好。"),
    entry("2024-12-06", "pride", "解封。放大加粗。不能忘。", { emphasis: "large", starred: true }),
    entry("2024-12-06", "ordinary", "有些新闻会过去，表格还在。", { marker: "candle" }),
    entry("2024-12-21", "hobby", "朋友画的圣诞树，单独框起来"),
    entry("2024-12-24", "movie", "《爱在黎明破晓前》· 飞机上"),
    entry("2024-12-25", "ordinary", "很多人给我发小作文。绿框。"),
    entry("2024-12-31", "pride", "辞旧。明天又是一个蓝格子。", { emphasis: "large" }),
    entry("2024-12-31", "pride", "半年写满了。能力变强的证据。", { starred: true }),
  ];
  const entriesListOrdered = entriesList.map((e, i) => ({ ...e, sortOrder: i }));

  const notes: LogNote[] = [
    note(
      null,
      "quote",
      "How do we win",
      "不要问困难有多大。只问：我们怎样能赢。撑不住的时候看这里。",
      { tone: "first", emphasized: true },
    ),
    note(
      null,
      "plan",
      "这半年想做的",
      "法考客观 · 实习文书留底 · 托福抢位（三、五、日 10:00）· 取消 4 月到期的学生 Prime · 12/3 前决定要不要报 1 月 LSAT",
      { tone: "important", emphasized: true },
    ),
    note("2024-07-08", "summary", "纽约", "一周。蓝的。冷冷的地方配冷冷的颜色。合并居中只是为了定位。"),
    note(
      "2024-08-05",
      "course",
      "实习可写进文书的",
      "法律意见 · 起诉状 · 推文 · 法律汇编。画线的以后都能用。",
      { tone: "important" },
    ),
    note(
      "2024-08-12",
      "reminder",
      "考前崩溃监测",
      "连续灰超过一周就要停下来。今年 8 月灰了一片，明年不要再这样。",
      { tone: "emo" },
    ),
    note(
      "2024-09-02",
      "course",
      "本学期课",
      "周一 商标法 / 证据法 / 批判性思维\n周三 国际法\n周四 著作权法（每周都交，慎选）\n周五 法职\nAnne-Marie · 仲裁 · 邮箱已贴在这儿",
    ),
    note(
      "2024-10-07",
      "goal",
      "法考分值",
      "民法+民诉 56。先看它们。理论法别放最后一天。\n客观题已过的人说：每天 25 道，改完错再睡。",
      { tone: "important", emphasized: true },
    ),
    note("2024-10-14", "summary", "小满来住", "10.18–10.21 四天。粗框。很开心。", { tone: "social" }),
    note(
      "2024-11-11",
      "checklist",
      "英国行前",
      "签证已贴黄 · 插座 · 药 · 国家画廊周日免费\n返程记得在第 6 天取消 Paramount+ 试用",
      { tone: "important" },
    ),
    note(
      "2024-12-16",
      "plan",
      "明年也能先写着",
      "3/2–3/9 春假 · 3/15 半马（第一次，标蓝）· 毕业论文 / 专业实习 / 选课，放大加黄。做不做另说，先写在这儿。",
      { tone: "important" },
    ),
  ];

  const spans: LogSpan[] = [
    span("2024-07-02", "2024-07-09", "纽约", "trip-blue", { kind: "trip", showWeeks: true }),
    span("2024-08-05", "2024-08-23", "A 所实习", "trip-purple", { kind: "stay", showWeeks: true }),
    span("2024-10-18", "2024-10-21", "小满来住", "trip-teal", { kind: "friend" }),
    span("2024-11-15", "2024-11-29", "英国", "trip-pink", { kind: "trip", showWeeks: true }),
  ];

  const days: Record<string, DayRecord> = {};
  for (const d of daysList) days[d.date] = d;

  const entries: Record<string, LogEntry[]> = {};
  for (const e of entriesListOrdered) {
    (entries[e.date] ??= []).push(e);
  }

  return {
    sheetKey: "2024-H2",
    settings: { favoriteLabel: "照相", semesterStart: "2024-09-02" },
    days,
    entries,
    images: {},
    notes,
    spans,
  };
}

export function emptySnapshot(sheetKey: string, todayIso: string): LogSnapshot {
  return {
    sheetKey,
    settings: { favoriteLabel: "照相", semesterStart: null },
    days: {
      [todayIso]: {
        id: "welcome-day",
        date: todayIso,
        primaryTone: "first",
        secondaryTone: null,
        location: "",
        headerNote: "开船",
        p3: ["写下今天", "定一个颜色", "先不求全"],
        journal: "航海日志第一格。先写三个字也算开始。颜色：黄=重要 绿=朋友 蓝=第一次 灰=情绪 红=热爱。",
      },
    },
    entries: {
      [todayIso]: [
        {
          id: "welcome-e1",
          date: todayIso,
          kind: "pride",
          body: "航海日志第一格。先写三个字也算开始。",
          marker: "star",
          emphasis: "large",
          starred: true,
          sortOrder: 0,
        },
        {
          id: "welcome-e2",
          date: todayIso,
          kind: "ordinary",
          body: "颜色：黄=重要 绿=朋友 蓝=第一次 灰=情绪 红=热爱",
          marker: null,
          emphasis: "normal",
          starred: false,
          sortOrder: 1,
        },
      ],
    },
    images: {},
    notes: [
      {
        id: "welcome-n1",
        sheetKey,
        weekStart: null,
        kind: "quote",
        title: "人不能二过",
        body: "做这张表，是因为曾经把马拉松和志愿选在同一天。提前半年写下来，选择权就在自己手里。",
        tone: "first",
        emphasized: true,
        sortOrder: 0,
      },
    ],
    spans: [],
  };
}
