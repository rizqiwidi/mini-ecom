import { ToastProvider } from "./components/ToastProvider";
import "./globals.css";

export const metadata = { title: "Mini E-Commerce", description: "Search + price trend + forecast" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="scroll-smooth">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <ToastProvider>
          <div
            className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.45),rgba(15,23,42,0.75)_55%)]"
            aria-hidden
          />
          <main className="relative mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-5 py-10 md:px-12">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}

