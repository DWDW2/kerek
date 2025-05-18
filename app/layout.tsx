import { OnlineStatusProvider } from "@/providers/online-status-provider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <OnlineStatusProvider>{children}</OnlineStatusProvider>
      </body>
    </html>
  );
}
