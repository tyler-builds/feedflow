import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Suspense } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session?.data?.session) {
      throw redirect({ to: "/login" });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 w-full">
        <div className="p-2">
          <SidebarTrigger />
        </div>
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
    </SidebarProvider>
  );
}
