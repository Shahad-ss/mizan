import { useLocation, Link } from 'wouter';
import { useLanguage } from '@/providers/language-provider';
import { LayoutDashboard, Receipt, Landmark, PiggyBank, Settings, LogOut, Menu } from 'lucide-react';
import { useClerk } from '@clerk/react';
import { Button } from '@/components/ui';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { FloatingFinancialAssistant } from '@/components/FinancialAssistant';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { t, dir } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { signOut } = useClerk();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  const navItems = [
    { href: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { href: '/bills', label: t('bills'), icon: Receipt },
    { href: '/debts', label: t('debts'), icon: Landmark },
    { href: '/savings', label: t('savings'), icon: PiggyBank },
    { href: '/settings', label: t('settings'), icon: Settings },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-2 text-primary">
          <Landmark className="h-6 w-6" />
          <span className="font-serif text-xl font-semibold">Mizan</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 z-50 flex flex-col w-64 bg-card border-e border-border transition-transform duration-300 ease-in-out md:static md:translate-x-0 shadow-lg md:shadow-none",
        mobileOpen ? (dir === 'rtl' ? "translate-x-0" : "translate-x-0") : (dir === 'rtl' ? "translate-x-full" : "-translate-x-full"),
        dir === 'rtl' ? "end-0" : "start-0"
      )}>
        <div className="p-6 hidden md:flex items-center gap-3 text-primary">
          <Landmark className="h-8 w-8" />
          <span className="font-serif text-2xl font-bold">Mizan</span>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}>
                <item.icon className="h-5 w-5" />
                <span className="font-medium text-[15px]">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border mt-auto">
          <button
            onClick={() => signOut({ redirectUrl: basePath || "/" })}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">{t('logout')}</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden animate-in fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full">
        <div className="max-w-5xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
          {children}
        </div>
      </main>

      {/* Global Financial Assistant Widget */}
      <FloatingFinancialAssistant />
    </div>
  );
}