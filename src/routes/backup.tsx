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
      const result = await importBackup({ data: parsed });
      setFileHint(
        `已导入：${result.days} 天、${result.entries} 条、${result.images} 张照片、${result.notes} 条周记、${result.spans} 段行程。去「我的日志」刷新即可看到。`,
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
            先登录，再选 JSON。访客数据、账号备份、网盘里下回来的文件都能认。
          </p>
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
        这是公开协议：填文件夹地址、用户名、密码即可，不是只给坚果云用。Nextcloud、群晖、威联通、InfiniCLOUD、TeraCLOUD 都能用。
        夸克、百度、阿里云盘官方没有 WebDAV，不能直接填；若你用 AList 等工具把夸克转成 WebDAV，地址填那个中转即可。
        填好后，打开网站时若距上次已超过 12 小时，会自动只传有改动的日子（增量）。立刻备份则推一份完整 JSON。
      </p>
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
