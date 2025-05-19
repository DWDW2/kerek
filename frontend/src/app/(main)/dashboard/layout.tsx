import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardBreadcrumbs } from "./_breadcrumbs";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex flex-col flex-1">
        <header className="flex flex-row w-full p-4 bg-white items-center gap-2 shadow">
          <SidebarTrigger />
          <DashboardBreadcrumbs />
        </header>
        {children}
      </div>
    </SidebarProvider>
  );
}
