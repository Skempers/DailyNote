import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { loadAuthFlags } from "@/lib/auth/flags";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [federated, setFederated] = useState(false);

  useEffect(() => {
    const err = new URLSearchParams(window.location.search).get("error");
    if (err) setError("第三方登录没走完（回调失败）。请用邮箱登录，或再试一次。");
    void loadAuthFlags()
      .then((f) => setFederated(f.federated))
      .catch(() => setFederated(false));
  }, []);

  useEffect(() => {
    if (!isPending && user) void navigate({ to: "/log" });
  }, [isPending, user, navigate]);

  async function onEmail(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "up") {
        const res = await authClient.signUp.email({ email, password, name: name || email.split("@")[0]! });
        if (res.error) throw new Error(res.error.message || "注册失败");
      } else {
        const res = await authClient.signIn.email({ email, password });
        if (res.error) throw new Error(res.error.message || "登录失败");
      }
      await navigate({ to: "/log" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "没写成");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-svh">
      <SiteHeader solid />
      <main className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-md place-items-center px-4 py-10">
        <div className="w-full rounded-xl bg-card p-6 shadow-border">
          <p className="text-xs tracking-[0.2em] text-primary uppercase">SLog</p>
          <h1 className="mt-1 font-display text-3xl font-medium">把这本日志锁在你名下</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            日记、周期、情绪都是私人的。登录之后，电脑和手机写的是同一份。
          </p>

          {authEnabled && federated ? (
            <div className="mt-6 space-y-2">
              {GROK_PROVIDERS.map((p) => (
                <Button
                  key={p.providerId}
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={busy}
                  onClick={() => {
                    setError(null);
                    setBusy(true);
                    void signIn(p.providerId, { callbackURL: "/log", errorCallbackURL: "/login?error=oauth" })
                      .catch((err) => {
                        setError(err instanceof Error ? err.message : "第三方登录失败，请用邮箱。");
                      })
                      .finally(() => setBusy(false));
                  }}
                >
                  使用 {p.label} 继续
                </Button>
              ))}
            </div>
          ) : authEnabled ? (
            <p className="mt-4 text-sm text-muted-foreground">
              这个站点还没接上谷歌 / X 的登录回调，请用下面的邮箱注册或登录。
            </p>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">登录暂未打开。</p>
          )}

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            或者用邮箱
            <span className="h-px flex-1 bg-border" />
          </div>

          <form className="space-y-3" onSubmit={(e) => void onEmail(e)}>
            {mode === "up" ? (
              <div>
                <Label htmlFor="name">怎么称呼</Label>
                <Input id="name" className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            ) : null}
            <div>
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                required
                className="mt-1"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                className="mt-1"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "请稍候…" : mode === "up" ? "创建账户" : "登录"}
            </Button>
          </form>
          <button
            type="button"
            className="mt-3 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => setMode(mode === "up" ? "in" : "up")}
          >
            {mode === "up" ? "已有账户？登录" : "没有账户？注册一份"}
          </button>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Link to="/try" className="underline-offset-4 hover:underline">
              先试用，不注册
            </Link>
            <span className="mx-2 opacity-40">·</span>
            <Link to="/" className="underline-offset-4 hover:underline">
              先回去看方法
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
