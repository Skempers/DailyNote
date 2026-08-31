import { Camera, ChevronRight, HardDrive, KeyRound, LogOut, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { authClient, authEnabled, signOut } from "@/lib/auth/client";
import { emailAndPasswordEnabled } from "@/lib/auth/email-password";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { compressAvatarFile } from "@/lib/slog/compress-image";
import { formatBytes } from "@/lib/slog/format";
import { loadUsage } from "@/lib/slog/api";
import { cn } from "@/lib/utils";

export function AccountMenu() {
  const { user } = useCurrentUserState();
  const [open, setOpen] = useState(false);
  const [used, setUsed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const label = user?.displayName ?? user?.primaryEmail ?? "账户";
  const canPassword = Boolean(authEnabled && emailAndPasswordEnabled && user?.primaryEmail && !user.isDevFallback);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !user || user.isDevFallback) return;
    let cancelled = false;
    void loadUsage()
      .then((u) => {
        if (!cancelled) setUsed(formatBytes(u.imageBytes));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open, user]);

  if (!user) return null;

  async function onAvatar(list: FileList | null) {
    const file = list?.[0];
    if (!file) return;
    setBusy(true);
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
      setBusy(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="账户菜单"
      >
        {user.profileImageUrl ? (
          <img
            src={user.profileImageUrl}
            alt=""
            className="size-8 rounded-full object-cover outline outline-1 -outline-offset-1 outline-foreground/10"
          />
        ) : (
          <span className="grid size-8 place-items-center rounded-full bg-muted text-xs font-medium">
            {label.slice(0, 1)}
          </span>
        )}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute top-[calc(100%+0.5rem)] right-0 z-50 w-72 overflow-hidden rounded-xl bg-card py-1 shadow-border"
        >
          <div className="flex items-center gap-3 border-b border-border px-3 py-3">
            {user.profileImageUrl ? (
              <img src={user.profileImageUrl} alt="" className="size-11 rounded-full object-cover" />
            ) : (
              <span className="grid size-11 place-items-center rounded-full bg-muted text-sm font-medium">
                {label.slice(0, 1)}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{label}</p>
              {user.primaryEmail ? (
                <p className="truncate text-[11px] text-muted-foreground">{user.primaryEmail}</p>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted"
            disabled={busy || !authEnabled || user.isDevFallback}
            onClick={() => fileRef.current?.click()}
          >
            <Camera className="size-4 text-muted-foreground" />
            {busy ? "正在换头像…" : "换头像"}
          </button>
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

          <Link
            to="/settings"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted"
            onClick={() => setOpen(false)}
          >
            <Settings className="size-4 text-muted-foreground" />
            设置
            <ChevronRight className="ml-auto size-3.5 text-muted-foreground" />
          </Link>

          {canPassword ? (
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted"
              onClick={() => {
                setOpen(false);
                void navigate({ to: "/settings", hash: "password" });
              }}
            >
              <KeyRound className="size-4 text-muted-foreground" />
              改密码
            </button>
          ) : null}

          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted"
            onClick={() => {
              setOpen(false);
              void navigate({ to: "/settings", hash: "storage" });
            }}
          >
            <HardDrive className="size-4 text-muted-foreground" />
            已用空间
            <span className="ml-auto text-[11px] text-muted-foreground">{used ?? "…"}</span>
          </button>

          {hint ? <p className="px-3 py-1 text-[11px] text-muted-foreground">{hint}</p> : null}

          {authEnabled && !user.isDevFallback ? (
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-left text-sm text-destructive hover:bg-muted"
              onClick={() => void signOut("/").catch(() => undefined)}
            >
              <LogOut className="size-4" />
              退出登录
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function AccountAvatar({
  url,
  label,
  className,
}: {
  url?: string | null;
  label: string;
  className?: string;
}) {
  if (url) {
    return <img src={url} alt="" className={cn("rounded-full object-cover", className)} />;
  }
  return (
    <span className={cn("grid place-items-center rounded-full bg-muted font-medium", className)}>
      {label.slice(0, 1)}
    </span>
  );
}
