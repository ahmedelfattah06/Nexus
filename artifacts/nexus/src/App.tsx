import { useEffect, useRef } from "react";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClerkProvider, Show, SignIn, SignUp, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import Layout from "@/components/Layout";
import LandingPage from "@/pages/landing";
import DashboardPage from "@/pages/dashboard";
import WorkspacesPage from "@/pages/workspaces";
import PagesPage from "@/pages/pages";
import TasksPage from "@/pages/tasks";
import SnippetsPage from "@/pages/snippets";
import FocusPage from "@/pages/focus";
import NexPage from "@/pages/nex";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

function ClerkQueryInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsub = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsub;
  }, [addListener, qc]);
  return null;
}

function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        appearance={{
          variables: {
            colorPrimary: "hsl(38, 72%, 46%)",
            colorBackground: "hsl(36, 22%, 97%)",
            colorForeground: "hsl(25, 18%, 12%)",
            colorMutedForeground: "hsl(25, 10%, 46%)",
            colorInput: "hsl(36, 22%, 97%)",
            colorInputForeground: "hsl(25, 18%, 12%)",
            colorNeutral: "hsl(36, 14%, 88%)",
            colorDanger: "hsl(0, 72%, 51%)",
            fontFamily: "'DM Sans', system-ui, sans-serif",
            borderRadius: "0.625rem",
          },
        }}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        appearance={{
          variables: {
            colorPrimary: "hsl(38, 72%, 46%)",
            colorBackground: "hsl(36, 22%, 97%)",
            colorForeground: "hsl(25, 18%, 12%)",
            colorMutedForeground: "hsl(25, 10%, 46%)",
            colorInput: "hsl(36, 22%, 97%)",
            colorInputForeground: "hsl(25, 18%, 12%)",
            colorNeutral: "hsl(36, 14%, 88%)",
            colorDanger: "hsl(0, 72%, 51%)",
            fontFamily: "'DM Sans', system-ui, sans-serif",
            borderRadius: "0.625rem",
          },
        }}
      />
    </div>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Show when="signed-in">
        <Layout>{children}</Layout>
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/dashboard" component={() => <ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/workspaces" component={() => <ProtectedRoute><WorkspacesPage /></ProtectedRoute>} />
      <Route path="/workspaces/:id/pages" component={() => <ProtectedRoute><PagesPage /></ProtectedRoute>} />
      <Route path="/workspaces/:id/tasks" component={() => <ProtectedRoute><TasksPage /></ProtectedRoute>} />
      <Route path="/snippets" component={() => <ProtectedRoute><SnippetsPage /></ProtectedRoute>} />
      <Route path="/focus" component={() => <ProtectedRoute><FocusPage /></ProtectedRoute>} />
      <Route path="/nex" component={() => <ProtectedRoute><NexPage /></ProtectedRoute>} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey!}
      proxyUrl={clerkProxyUrl}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryInvalidator />
        <TooltipProvider>
          <AppRouter />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
