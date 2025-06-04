import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/dashboard/header";
import { AppMessagesSidebar } from "@/components/app-messages-sidebar";
import { getLatestMessagesByConversation } from "@/packages/api/actions";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex flex-col flex-1">
        <Header />
        {children}
      </div>
      <AppMessagesSidebar getLatestMessages={getLatestMessagesByConversation} />
    </SidebarProvider>
  );
}
