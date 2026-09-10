import { Route, Router as WouterRouter, Switch, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/providers/theme-provider";
import { LanguageProvider } from "@/providers/language-provider";
import { AuthProvider, useAuth } from "@/providers/auth-provider";
import { AppShell } from "@/layout/AppShell";
import { Toaster } from "@/components/ui/toaster";
import LandingPage from "@/pages/LandingPage";
import Dashboard from "@/pages/Dashboard";
import Bills from "@/pages/Bills";
import Debts from "@/pages/Debts";
import Savings from "@/pages/Savings";
import Settings from "@/pages/Settings";
import AuthPage from "@/pages/AuthPage";
import NotFound from "@/pages/not-found";
import { ErrorBoundary } from "@/components/error-boundary";

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function Home() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  return user ? <Redirect to="/dashboard" /> : <LandingPage />;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  return user ? (
    <AppShell>
      <Component />
    </AppShell>
  ) : (
    <Redirect to="/sign-in" />
  );
}

function PublicAuthRoute({ mode }: { mode: "login" | "signup" }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  return user ? <Redirect to="/dashboard" /> : <AuthPage mode={mode} />;
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/sign-in"><PublicAuthRoute mode="login" /></Route>
      <Route path="/sign-up"><PublicAuthRoute mode="signup" /></Route>
      <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
      <Route path="/bills"><ProtectedRoute component={Bills} /></Route>
      <Route path="/debts"><ProtectedRoute component={Debts} /></Route>
      <Route path="/savings"><ProtectedRoute component={Savings} /></Route>
      <Route path="/settings"><ProtectedRoute component={Settings} /></Route>
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary resetKey={window.location.pathname}>
      <WouterRouter base={basePath}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ThemeProvider defaultTheme="system">
              <LanguageProvider>
                <AppRoutes />
                <Toaster />
              </LanguageProvider>
            </ThemeProvider>
          </AuthProvider>
        </QueryClientProvider>
      </WouterRouter>
    </ErrorBoundary>
  );
}