import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useKeyboardShortcuts } from "@/contexts/KeyboardShortcutsContext";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { openPalette } = useKeyboardShortcuts();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between gap-3 border-b border-border/40 px-4 sm:px-6 lg:px-8 bg-background/80 backdrop-blur-xl sticky top-0 z-30">
            <SidebarTrigger className="h-9 w-9 rounded-xl" />
            <button
              type="button"
              onClick={openPalette}
              className="flex flex-1 max-w-xs items-center gap-2 rounded-xl border border-border/60 bg-muted/40 px-3 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/70"
            >
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline truncate">{t("commandPalette.placeholder")}</span>
              <kbd className="ml-auto hidden sm:inline-flex h-5 items-center rounded border border-border/60 bg-background px-1.5 font-mono text-[10px]">
                ⌘K
              </kbd>
            </button>
            <div className="flex items-center gap-2 shrink-0">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-10 animate-fade-in">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
