import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Camera, ChevronLeft } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { authClient, authEnabled } from "@/lib/auth/client";
import { emailAndPasswordEnabled } from "@/lib/auth/email-password";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { loadSettings, loadUsage, saveSettings, exportBackup } from "@/lib/slog/api";
import { compressAvatarFile } from "@/lib/slog/compress-image";
import { formatBytes } from "@/lib/slog/format";
import { downloadJson } from "@/lib/slog/export";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return (
      <div className="min-h-svh">
        <SiteHeader solid />
        <div className="mx-auto max-w-lg p-6">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="mt-4 h-48 w-full" />
        </div>
      </div>
    );
  }
  if (!user) return <RedirectToSignIn />;
  return <SettingsBody />;
}

function SettingsBody() {
  const { user } = useCurrentUserState();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user?.displayName ?? "");
  const [favorite, setFavorite] = useState("照相");
  const [semester, setSemester] = useState("");
  const [usage, setUsage] = useState<{ imageBytes: number; imageCount: number; dayCount: number } | null>(null);
  const [curPass, setCurPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const canPassword = Boolean(authEnabled && emailAndPasswordEnabled && user?.primaryEmail && !user?.isDevFallback);

  useEffect(() => {
    void loadSettings()
      .then((s) => {
        setFavorite(s.favoriteLabel);
        setSemester(s.semesterStart ?? "");
      })
      .catch(() => undefined);
    void loadUsage()
      .then(setUsage)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setBusy("profile");
    setHint(null);
    try {
      if (authEnabled && !user?.isDevFallback && name.trim()) {
        const res = await authClient.updateUser({ name: name.trim() });
        if (res.error) throw new Error(res.error.message || "名字没改成");
        await authClient.getSession();
      }
      await saveSettings({ data: { favoriteLabel: favorite.trim() || "照相", semesterStart: semester.trim() || null } });
      setHint("设置已保存");
    } catch (err) {
      setHint(err instanceof Error ? err.message : "没保存成");
    } finally {
      setBusy(null);
    }
  }

  async function onAvatar(list: FileList | null) {
    const file = list?.[0];
    if (!file) return;
    setBusy("avatar");
    setHint(null);
    try {
      const image = await compressAvatarFile(file);
      const res = await authClient.updateUser({ image });
      if (res.error) throw new Error(res.error.message || "头像没换上");
      await authClient.getSession();
      setHint("头像已更新");
    } catch (err) {
      setHint(err instanceof Error ? err.message : "头像没换上");
    } finally {
      setBusy(null);
    }
  }

  async function onPassword(e: FormEvent) {
    e.preventDefault();
    setBusy("password");
    setHint(null);
    try {
      const res = await authClient.changePassword({
        currentPassword: curPass,
        newPassword: newPass,
        revokeOtherSessions: true,
      });
      if (res.error) throw new Error(res.error.message || "密码没改成");
      setCurPass("");
      setNewPass("");
      setHint("密码已更新");
    } catch (err) {
      setHint(err instanceof Error ? err.message : "密码没改成");
    } finally {
      setBusy(null);
    }
  }

  const label = user?.displayName ?? user?.primaryEmail ?? "账户";
  const used = usage ? formatBytes(usage.imageBytes) : "…";
  const usedPct = usage ? Math.min(100, (usage.imageBytes / (200 * 1024 * 1024)) * 100) : 0;

  return (
    <div className="min-h-svh bg-background">
      <SiteHeader solid />
      <main className="mx-auto max-w-lg px-4 py-6">
        <Link to="/log" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" />
          回日志
        </Link>
        <h1 className="font-display text-3xl font-medium">设置</h1>
        {hint ? <p className="mt-2 text-sm text-primary">{hint}</p> : null}

        <section className="mt-6 rounded-xl bg-card p-4 shadow-border">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="relative"
              onClick={() => fileRef.current?.click()}
              aria-label="换头像"
              disabled={Boolean(busy) || !authEnabled || user?.isDevFallback}
            >
              {user?.profileImageUrl ? (
                <img src={user.profileImageUrl} alt="" className="size-16 rounded-full object-cover" />
              ) : (
                <span className="grid size-16 place-items-center rounded-full bg-muted text-lg font-medium">
                  {label.slice(0, 1)}
                </span>
              )}
              <span className="absolute right-0 bottom-0 grid size-6 place-items-center rounded-full bg-foreground text-background">
                <Camera className="size-3" />
              </span>
            </button>
            <div className="min-w-0">
              <p className="truncate font-medium">{label}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.primaryEmail ?? "未绑定邮箱"}</p>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              void onAvatar(e.target.files);
              e.target.value = "";
            }}
          />
        </section>

        <form className="mt-4 space-y-3 rounded-xl bg-card p-4 shadow-border" onSubmit={(e) => void saveProfile(e)}>
          <div>
            <Label htmlFor="display-name">怎么称呼</Label>
            <Input
              id="display-name"
              className="mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="显示名"
            />
          </div>
          <div>
            <Label htmlFor="fav">「热爱」格子上的字</Label>
            <Input
              id="fav"
              className="mt-1"
              value={favorite}
              onChange={(e) => setFavorite(e.target.value)}
              placeholder="照相"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">红色格子默认叫「照相」，可改成你真正热爱的事。</p>
          </div>
          <div>
            <Label htmlFor="semester">学期开始日</Label>
            <Input
              id="semester"
              className="mt-1"
              type="date"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">用来在半年表左边标第几教学周。可空。</p>
          </div>
          <Button type="submit" disabled={busy === "profile"}>
            {busy === "profile" ? "保存中…" : "保存设置"}
          </Button>
        </form>

        {canPassword ? (
          <form
            id="password"
            className="mt-4 scroll-mt-20 space-y-3 rounded-xl bg-card p-4 shadow-border"
            onSubmit={(e) => void onPassword(e)}
          >
            <h2 className="font-display text-lg font-medium">改密码</h2>
            <p className="text-xs text-muted-foreground">仅邮箱注册的账户可以改。改完后其他设备需要重新登录。</p>
            <div>
              <Label htmlFor="cur-pass">当前密码</Label>
              <Input
                id="cur-pass"
                className="mt-1"
                type="password"
                value={curPass}
                onChange={(e) => setCurPass(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div>
              <Label htmlFor="new-pass">新密码</Label>
              <Input
                id="new-pass"
                className="mt-1"
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <Button type="submit" variant="outline" disabled={busy === "password"}>
              {busy === "password" ? "更新中…" : "更新密码"}
            </Button>
          </form>
        ) : (
          <p className="mt-4 text-xs text-muted-foreground">用第三方登录的账户，密码请在对应平台修改。</p>
        )}

        <section id="storage" className="mt-4 scroll-mt-20 rounded-xl bg-card p-4 shadow-border">
          <h2 className="font-display text-lg font-medium">存储空间</h2>
          <p className="mt-1 text-sm text-muted-foreground">照片占了大头。格子文字几乎不占地方。</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${usedPct}%` }} />
          </div>
          <p className="mt-2 text-sm">
            已用 <span className="font-medium">{used}</span>
            <span className="text-muted-foreground"> / 建议 200 MB</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {usage ? `${usage.imageCount} 张照片 · ${usage.dayCount} 天有记录` : "正在统计…"}
          </p>
          <Button
            className="mt-3"
            variant="outline"
            type="button"
            disabled={busy === "backup"}
            onClick={() => {
              setBusy("backup");
              setHint(null);
              void exportBackup()
                .then((data) => {
                  downloadJson(`slog-backup-${data.exportedAt.slice(0, 10)}.json`, data);
                  setHint(`已导出 ${data.days.length} 天、${data.images.length} 张照片。`);
                })
                .catch((err) => setHint(err instanceof Error ? err.message : "导出失败"))
                .finally(() => setBusy(null));
            }}
          >
            {busy === "backup" ? "导出中…" : "导出全部日记（JSON）"}
          </Button>
        </section>
      </main>
    </div>
  );
}
