import { Link } from "@tanstack/react-router";
import { ArrowRight, Eye, Layers, Search, Smartphone } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LogWorkspace } from "@/components/log/workspace";
import { MONTH_COLORS, TONE_COLORS } from "@/lib/slog/colors";
import { DAY_TONES } from "@/lib/slog/types";

export function Landing() {
  const [sheet, setSheet] = useState("2024-H2");

  return (
    <div>
      <section className="relative overflow-hidden px-4 pt-12 pb-16 md:px-8 md:pt-20 md:pb-24">
        <div className="paper-grid pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-5xl">
          <p className="text-xs font-medium tracking-[0.25em] text-primary uppercase">Skipper's Log</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl leading-[1.15] font-medium tracking-tight md:text-6xl">
            半年一张表。
            <br />
            把日子摊开，就看见自己。
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            有人用 Excel 坚持了两年半。SLog 把它变成可以在手机和电脑上写的航海日志——颜色当目录，格子当记忆，备注栏留给还没做、但必须先写下来的事。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/login">
                开始我的半年
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to="/try">访客试用，不注册</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#demo">先翻一翻示例</a>
            </Button>
          </div>
          <ul className="mt-10 grid gap-3 text-sm md:grid-cols-3">
            <li className="rounded-lg bg-card p-4 shadow-border">
              <Eye className="size-4 text-primary" />
              <p className="mt-2 font-medium">靠视觉定位</p>
              <p className="mt-1 text-muted-foreground">十月是蓝的，考试是黄的，见朋友是绿的。不用翻软件，扫一眼就找到。</p>
            </li>
            <li className="rounded-lg bg-card p-4 shadow-border">
              <Layers className="size-4 text-primary" />
              <p className="mt-2 font-medium">多合一</p>
              <p className="mt-1 text-muted-foreground">课表、校历、生理周期、行程、DDL、鸡汤，全部写在同一张表上。</p>
            </li>
            <li className="rounded-lg bg-card p-4 shadow-border">
              <Smartphone className="size-4 text-primary" />
              <p className="mt-2 font-medium">电脑和手机同一份</p>
              <p className="mt-1 text-muted-foreground">登录后存在你的账户里。以后用自己的域名部署，日志还在。</p>
            </li>
          </ul>
        </div>
      </section>

      <section id="method" className="border-t border-border bg-card px-4 py-16 md:px-8 md:py-20">
        <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">他怎么做的</p>
            <h2 className="mt-2 font-display text-3xl font-medium tracking-tight">从大到小的一张 Excel</h2>
            <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>
                时间单位是<strong className="text-foreground">六个月</strong>。1 月黄、2 月粉、3 月紫、4 月橘、10 月蓝——月份本身就是色块，找十月的事就跳到蓝色带。
              </p>
              <p>
                表头是星期一到日。用久了，就算看不见上面的字，也知道这列是周三。左边多留一列：学期周、旅行第几周。右边两列学康奈尔笔记，上课写完、下课补；也可以放课表、邮箱、分数结构、到期提醒。
              </p>
              <p>
                一天可以有主色和次色。黄是考试和 DDL，绿是朋友家人，蓝是第一次（勇气来自无数个蓝格子），浅灰是自己崩溃的日子，深色是不想忘记的公共事件，红留给真正喜欢的事。格子里的字再分黑/蓝/红：必须做的、想做的、不能辜负别人的。
              </p>
              <p>
                旅行用粗线框住；地点合并居中好定位。做不做另说，先写在未来的格子里——报名截止、试用第六天取消、明年春假。Excel 的「查找」用来复盘整个人生。
              </p>
              <p className="text-foreground">
                起因是一次志愿和马拉松撞日。人不能二过，于是把半年、一年后的事都摊开。两年半才长成那样细，一开始有颜色就够。
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">SLog 怎么做</p>
            <h2 className="mt-2 font-display text-3xl font-medium tracking-tight">同一套语法，换成网站</h2>
            <ol className="mt-5 space-y-4 text-sm leading-relaxed">
              <li className="rounded-lg border border-border p-3">
                <strong>半年画布</strong>
                <p className="mt-1 text-muted-foreground">可以在一周、一月、半年之间切换。格子里的字会折行铺满，点开格子放大写，正文自动保存。</p>
              </li>
              <li className="rounded-lg border border-border p-3">
                <strong>主色 / 次色 / P3 / 行程框</strong>
                <p className="mt-1 text-muted-foreground">点格子涂色、写三条最重要的、用「时段」把旅行或同居框起来，左边自动标第几周。</p>
              </li>
              <li className="rounded-lg border border-border p-3">
                <strong>康奈尔留白</strong>
                <p className="mt-1 text-muted-foreground">每行最右可以写本周备注；半年鸡汤和计划浮在表头。提醒自己：先写着。</p>
              </li>
              <li className="rounded-lg border border-border p-3">
                <strong>寻找</strong>
                <p className="mt-1 text-muted-foreground">
                  按 <kbd className="rounded-sm bg-muted px-1">/</kbd> 搜人、课、旅行。登录后数据在服务器，换设备还能续写。
                </p>
              </li>
            </ol>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-5xl">
          <p className="mb-3 text-xs font-medium text-muted-foreground">一天的主色</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {DAY_TONES.map((t) => (
              <div
                key={t.id}
                className="rounded-md px-3 py-2 text-sm"
                style={{
                  background: t.id === "month" ? MONTH_COLORS[10].bg : TONE_COLORS[t.id].bg,
                  color: t.id === "month" ? MONTH_COLORS[10].fg : TONE_COLORS[t.id].fg,
                }}
              >
                <div className="font-medium">{t.label}</div>
                <div className="mt-0.5 text-[11px] leading-snug opacity-80">{t.hint}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="demo" className="border-t border-border px-0 py-10 md:px-6 md:py-14">
        <div className="mx-auto max-w-6xl px-4 md:px-2">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">可点的示例</p>
              <h2 className="mt-1 font-display text-3xl font-medium">2024 下半年 · 一位法学生的表</h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                人名和细节都是虚构的，语法是真的。点格子、换颜色、用寻找。这是本地示例，登录后可以一键载入到你的账户里慢慢改。
              </p>
            </div>
            <Button asChild>
              <Link to="/login">
                登录后归我写
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
        <div className="mx-auto h-[min(82vh,920px)] overflow-hidden border-y border-border bg-background md:border-x md:shadow-border">
          <LogWorkspace sheetKey={sheet} onSheetChange={setSheet} />
        </div>
        <p className="mx-auto mt-3 max-w-6xl px-4 text-xs text-muted-foreground md:px-2">
          <Search className="mr-1 inline size-3" />
          试试搜「法考」「小满」「英国」。黄格子是考试，绿的是朋友，蓝的是第一次。
        </p>
      </section>

      <section className="border-t border-border px-4 py-16 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl font-medium">先写三个字也算开始</h2>
          <p className="mt-3 text-muted-foreground">
            一开始做不了那么细。有颜色就够。能力变强了，蓝格子和黄格子会自己变多。部署到你自己的服务器时，用同一个账户继续写就行。
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/login">开船</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/try">先试用，不注册</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
