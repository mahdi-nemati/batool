import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "بتول",
  description: "مدیریت دارایی و امور مالی شخصی",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" data-theme="paper">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-paper text-ink antialiased">
        {/* One provider for the whole app: every backend error, on every route
            (including login/register), is surfaced through this channel. */}
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
