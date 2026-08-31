import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "@/components/landing";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <div className="min-h-svh">
      <SiteHeader />
      <Landing />
    </div>
  );
}
