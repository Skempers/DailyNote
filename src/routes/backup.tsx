import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  clearDemoSheet,
  exportBackup,
  importBackup,
  loadWebdav,
  pushWebdavBackup,
  saveWebdav,
  testWebdav,
  type FullBackup,
  type WebdavPublic,
} from "@/lib/slog/api";
import { downloadJson } from "@/lib/slog/export";

export const Route = createFileRoute("/backup")({ component: BackupPage });

const DEMO_FROM = "2024-07-01";
const DEMO_TO = "2024-12-31";

function isDemoDate(iso: string) {
  return iso >= DEMO_FROM && iso <= DEMO_TO;
}

function withoutDemo(data: FullBackup): FullBackup {
  return {
    ...data,
    days: data.days.filter((d) => !isDemoDate(d.date)),
    entries: data.entries.filter((e) => !isDemoDate(e.date)),
    images: data.images.filter((i) => !isDemoDate(i.date)),
    notes: data.notes.filter((n) => n.sheetKey !== "2024-H2"),
    spans: data.spans.filter((s) => s.startDate < DEMO_FROM || s.startDate > DEMO_TO),
  };
}

function collectBrowserData() {
  const guest = sessionStorage.getItem("slog-guest-sheets");
  const drafts: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("slog-draft:")) {
      try {
        drafts[k] = JSON.parse(localStorage.getItem(k) ?? "null");
      } catch {
        drafts[k] = localStorage.getItem(k);
      }
    }
  }
  return {
    exportedAt: new Date().toISOString(),
    guestSheets: guest ? (JSON.parse(guest) as unknown) : null,
    drafts,
  };
}

function BackupPage() {
  const { user, isPending } = useCurrentUserState();
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [fileHint, setFileHint] = useState<string | null>(null);
  const [includeDemo, setIncludeDemo] = useState(false);
  const [importMode, setImportMode] = useState<"fill" | "replace-overlap">("fill");

  async function fromServer() {
    setBusy("server");
    setHint(null);
    try {
      const raw = await exportBackup();
      const demoDays = raw.days.filter((d) => isDemoDate(d.date)).length;
      const data = includeDemo ? raw : withoutDemo(raw);
      downloadJson(`slog-server-${data.exportedAt.slice(0, 10)}.json`, data);
      const photoNote =
        data.images.length === 0
          ? "这账号目前没有照片，所以 JSON 里也没有图。有照片的话会整张写进文件。"
          : `含 ${data.images.length} 张照片（嵌在 JSON 里）。`;
      setHint(
        demoDays && !includeDemo
          ? `已导出你自己的格子：${data.days.length} 天、${data.entries.length} 条。另有 ${demoDays} 天是「载入示例半年」，这次没放进去。${photoNote}`
          : `已下载账号数据：${data.days.length} 天、${data.entries.length} 条、${data.images.length} 张照片。${photoNote}`,
      );
    } catch (err) {
      setHint(err instanceof Error ? err.message : "服务器上没有可导出的账号数据（可能要先登录）。");
    } finally {
      setBusy(null);
    }
  }

  async function wipeDemo() {
    if (!window.confirm("只删掉账号里 2024 下半年那张示例表，你自己写的格子不动。确定？")) return;
    setBusy("wipe");
    setHint(null);
    try {
      const r = await clearDemoSheet();
      setHint(`已从账号里去掉示例 ${r.removedDays} 天。你自己写的格子还在。`);
    } catch (err) {
      setHint(err instanceof Error ? err.message : "删除示例失败");
    } finally {
      setBusy(null);
    }
  }

  function fromBrowser() {
    setBusy("browser");
    setHint(null);
    try {
      const data = collectBrowserData();
      const guestDays = data.guestSheets
        ? Object.values(data.guestSheets as Record<string, { days?: Record<string, unknown> }>).reduce(
            (n, s) => n + Object.keys(s?.days ?? {}).length,
            0,
          )
        : 0;
      downloadJson(`slog-browser-${new Date().toISOString().slice(0, 10)}.json`, data);
      setHint(
        `已下载这台浏览器里的备份：访客格子 ${guestDays} 天，本地草稿 ${Object.keys(data.drafts).length} 份。关掉访客标签页后访客数据会消失，请尽快保存。`,
      );
    } catch (err) {
      setHint(err instanceof Error ? err.message : "浏览器里没有可导出的数据。");
    } finally {
      setBusy(null);
    }
  }

  async function intoServer(file: File) {
    setBusy("import");
    setFileHint(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const result = await importBackup({ data: { backup: parsed, mode: importMode } });
      const skip = result.skippedDays ? `有 ${result.skippedDays} 天你这边已经写过，没覆盖。` : "";
      const imgErr = result.imageErrors ? ` ${result.imageErrors} 张图跳过（太大或格式不对）。` : "";
      setFileHint(
        `已导入：新增/写入 ${result.days} 天、${result.entries} 条、${result.images} 张照片、${result.notes} 条周记、${result.spans} 段行程。${skip}${imgErr}去「我的日志」刷新即可看到。`,
      );
    } catch (err) {
      setFileHint(err instanceof Error ? err.message : "导入失败");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-svh bg-background">
      <SiteHeader solid />
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="font-display text-3xl font-medium">导出我的数据</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          可以下载到这台电脑，也可以填 WebDAV，推到你自己的网盘（坚果云、Nextcloud、群晖都可以）。
        </p>
        {hint ? <p className="mt-4 text-sm text-primary">{hint}</p> : null}

        <section className="mt-6 rounded-xl bg-card p-4 shadow-border">
          <h2 className="font-medium">下载到这台电脑</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {isPending ? "正在确认登录状态…" : user ? `当前账号：${user.displayName ?? user.primaryEmail}` : "登录后可导出账号数据。访客试用请用下面的浏览器导出。"}
          </p>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeDemo}
              onChange={(e) => setIncludeDemo(e.target.checked)}
            />
            包含「载入示例半年」
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button disabled={busy !== null || !user} onClick={() => void fromServer()}>
              {busy === "server" ? "导出中…" : "手动导出（JSON）"}
            </Button>
            <Button variant="outline" disabled={busy !== null} onClick={fromBrowser}>
              {busy === "browser" ? "导出中…" : "导出浏览器数据"}
            </Button>
            <Button variant="ghost" disabled={busy !== null || !user} onClick={() => void wipeDemo()}>
              {busy === "wipe" ? "清除中…" : "从账号删掉示例"}
            </Button>
          </div>
        </section>

        <WebdavCard user={Boolean(user)} busy={busy} setBusy={setBusy} />

        <section className="mt-4 rounded-xl bg-card p-4 shadow-border">
          <h2 className="font-medium">把备份导进当前账号</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            默认只补空的：已有日子、已有正文和重复的条目不会被换成备份里的内容。访客数据、账号备份、网盘里下回来的 JSON 都能认。
          </p>
          <div className="mt-3 space-y-1.5 text-sm">
            <label className="flex items-start gap-2">
              <input
                type="radio"
                className="mt-1"
                checked={importMode === "fill"}
                onChange={() => setImportMode("fill")}
              />
              <span>只补没有的（推荐）· 你现在写过的日子原样保留</span>
            </label>
            <label className="flex items-start gap-2">
              <input
                type="radio"
                className="mt-1"
                checked={importMode === "replace-overlap"}
                onChange={() => setImportMode("replace-overlap")}
              />
              <span>覆盖日期重合的日子 · 只改备份里出现的那些天，其它天不动</span>
            </label>
          </div>
          <label className="mt-3 inline-flex">
            <input
              type="file"
              accept="application/json,.json"
              disabled={busy !== null || !user}
              className="text-sm file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:text-primary-foreground"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void intoServer(file);
              }}
            />
          </label>
          {fileHint ? <p className="mt-2 text-sm text-primary">{fileHint}</p> : null}
        </section>
      </main>
    </div>
  );
}

function WebdavCard({
  user,
  busy,
  setBusy,
}: {
  user: boolean;
  busy: string | null;
  setBusy: (v: string | null) => void;
}) {
  const [url, setUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [cfg, setCfg] = useState<WebdavPublic | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void loadWebdav()
      .then((c) => {
        setCfg(c);
        setUrl(c.url);
        setUsername(c.username);
      })
      .catch(() => undefined);
  }, [user]);

  async function save() {
    setBusy("dav-save");
    setMsg(null);
    try {
      const next = await saveWebdav({ data: { url, username, password } });
      setCfg(next);
      setPassword("");
      setMsg("网盘地址已保存。密码只存在服务器上，页面里不会再显示。");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "保存失败");
    } finally {
      setBusy(null);
    }
  }

  async function test() {
    setBusy("dav-test");
    setMsg(null);
    try {
      await testWebdav();
      const next = await loadWebdav();
      setCfg(next);
      setMsg("连上了。网盘文件夹里会有一个 slog-webdav-test.json。");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "连接失败");
    } finally {
      setBusy(null);
    }
  }

  async function push() {
    setBusy("dav-push");
    setMsg(null);
    try {
      const r = await pushWebdavBackup();
      const next = await loadWebdav();
      setCfg(next);
      setMsg(`已推到网盘：${r.filename}（以及 slog-latest.json）。${r.days} 天、${r.entries} 条、${r.images} 张照片。`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "备份失败");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mt-4 rounded-xl bg-card p-4 shadow-border">
      <h2 className="font-medium">备份到我的网盘（WebDAV）</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        把日记推到你自己的网盘。普通用户用坚果云即可，三栏填好就能测。打开网站超过 12 小时会自动增量备份。
      </p>
      <JianguoHint />
      <QuarkHint />
      {!user ? (
        <p className="mt-3 text-sm text-muted-foreground">登录后才能绑定网盘。</p>
      ) : (
        <div className="mt-3 space-y-3">
          <div>
            <Label htmlFor="dav-url">文件夹地址</Label>
            <Input
              id="dav-url"
              className="mt-1"
              value={url}
              placeholder="https://dav.jianguoyun.com/dav/SLog/"
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="dav-user">用户名</Label>
            <Input
              id="dav-user"
              className="mt-1"
              value={username}
              autoComplete="username"
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="dav-pass">密码 / 应用专用密码</Label>
            <Input
              id="dav-pass"
              className="mt-1"
              type="password"
              value={password}
              placeholder={cfg?.hasPassword ? "已保存，留空则不改" : "坚果云请用应用密码，不要用登录密码"}
              autoComplete="new-password"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={busy !== null} onClick={() => void save()}>
              {busy === "dav-save" ? "保存中…" : "保存网盘设置"}
            </Button>
            <Button variant="outline" disabled={busy !== null} onClick={() => void test()}>
              {busy === "dav-test" ? "测试中…" : "测试连接"}
            </Button>
            <Button disabled={busy !== null} onClick={() => void push()}>
              {busy === "dav-push" ? "备份中…" : "立即备份（完整）"}
            </Button>
          </div>
          {cfg?.lastAt ? (
            <p className="text-xs text-muted-foreground">
              上次：{cfg.lastAt.replace("T", " ").slice(0, 19)}
              {cfg.lastError ? ` · ${cfg.lastError}` : " · 成功"}
            </p>
          ) : null}
          {msg ? <p className="text-sm text-primary">{msg}</p> : null}
        </div>
      )}
    </section>
  );
}

function JianguoHint() {
  return (
    <details className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2" open>
      <summary className="cursor-pointer text-sm font-medium">推荐：坚果云（不用装任何工具）</summary>
      <div className="mt-2 space-y-2 text-xs leading-relaxed text-muted-foreground">
        <p>国内能直接用的官方 WebDAV，注册后生成一个「应用密码」填到上面三栏。</p>
        <ol className="list-decimal space-y-1 pl-4">
          <li>
            打开{" "}
            <a className="underline" href="https://www.jianguoyun.com/" target="_blank" rel="noreferrer">
              坚果云官网
            </a>{" "}
            注册/登录。
          </li>
          <li>右上角账户名 → 账户信息 → 安全选项 → 第三方应用 → 添加应用，生成密码。</li>
          <li>
            文件夹地址填{" "}
            <code className="rounded bg-background px-1">https://dav.jianguoyun.com/dav/SLog/</code>
            （没有 SLog 文件夹会在第一次备份时尝试创建）。
          </li>
          <li>用户名填坚果云邮箱，密码填刚才生成的应用密码（不是登录密码）。</li>
        </ol>
        <p>
          官方说明：
          <a className="ml-1 underline" href="https://help.jianguoyun.com/?p=2064" target="_blank" rel="noreferrer">
            如何开启 WebDAV
          </a>
        </p>
      </div>
    </details>
  );
}

function QuarkHint() {
  return (
    <details className="mt-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
      <summary className="cursor-pointer text-sm font-medium">夸克 / 百度 / 阿里：没有官方接口，要自己架中转</summary>
      <div className="mt-2 space-y-2 text-xs leading-relaxed text-muted-foreground">
        <p>
          这些网盘不提供 WebDAV。所谓「转 WebDAV 工具」不是一个 App 商店能下载的软件，而是要你自己有一台 24
          小时开着的电脑、NAS 或服务器，再跑下面这种开源项目。普通用户请用坚果云，不必走这条。
        </p>
        <ul className="list-disc space-y-1 pl-4">
          <li>
            <a className="underline" href="https://github.com/chenqimiao/quarkdrive-webdav" target="_blank" rel="noreferrer">
              quarkdrive-webdav
            </a>
            ：专门把夸克变成 WebDAV，要填夸克 Cookie。
          </li>
          <li>
            <a className="underline" href="https://github.com/OpenListTeam/OpenList" target="_blank" rel="noreferrer">
              OpenList
            </a>
            （AList 的后续）：可挂夸克、阿里等，再对外提供 WebDAV。夸克说明在
            <a className="ml-1 underline" href="https://doc.oplist.org/guide/drivers/quark" target="_blank" rel="noreferrer">
              这里
            </a>
            。
          </li>
        </ul>
        <p>装好后，把中转给出的地址、用户名、密码填到本页上面三栏。网站不会替你安装这些工具。</p>
      </div>
    </details>
  );
}
