import { Link } from "@tanstack/react-router";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { AccountMenu } from "@/components/account-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SiteHeader({ solid = false }: { solid?: boolean }) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex items-center gap-4 px-4 py-3 md:px-8",
        solid ? "border-b border-border bg-background" : "bg-background/80 backdrop-blur-sm",
      )}
    >
      <Link to="/" className="flex items-baseline gap-2">
        <span className="font-display text-2xl font-medium tracking-tight">SLog</span>
        <span className="text-xs tracking-[0.2em] text-muted-foreground">航海日志</span>
      </Link>
      <nav className="ml-auto flex items-center gap-2">
        <Link
          to="/"
          hash="method"
          className="hidden px-2 py-1 text-sm text-muted-foreground hover:text-foreground md:inline"
        >
          方法
        </Link>
        <Link
          to="/"
          hash="demo"
          className="hidden px-2 py-1 text-sm text-muted-foreground hover:text-foreground md:inline"
        >
          示例
        </Link>
        <AuthSlot />
      </nav>
    </header>
  );
}

function AuthSlot() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <div className="h-10 w-24 animate-pulse rounded-md bg-muted" />;
  if (user) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild size="sm">
          <Link to="/log">我的日志</Link>
        </Button>
        <SignedIn>
          <AccountMenu />
        </SignedIn>
      </div>
    );
  }
  return (
    <SignedOut>
      <Button asChild size="sm" variant="ghost">
        <Link to="/try">访客试用</Link>
      </Button>
      <Button asChild size="sm" variant="outline">
        <Link to="/login">登录，开始写</Link>
      </Button>
    </SignedOut>
  );
}
