import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Landing } from "@/components/landing";
import { SiteHeader } from "@/components/site-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return (
      <div className="min-h-svh">
        <SiteHeader />
        <div className="p-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="mt-4 h-96 w-full" />
        </div>
      </div>
    );
  }
  if (user) return <Navigate to="/log" />;
  return (
    <div className="min-h-svh">
      <SiteHeader />
      <Landing />
    </div>
  );
}
