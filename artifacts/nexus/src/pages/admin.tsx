import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { Redirect } from "wouter";
import {
  Shield, Users, BarChart3, Brain, Activity,
  Trash2, ChevronRight, Crown, UserX, RefreshCw,
  FileText, CheckSquare, Target, Smile, Zap,
  MessageSquare, TrendingUp, Database, Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch(path: string, opts?: RequestInit) {
  const r = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) },
    ...opts,
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: r.statusText }));
    throw new Error(err.error ?? "Request failed");
  }
  return r.json();
}

type Tab = "overview" | "users" | "ai" | "content";

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "users", label: "Users", icon: Users },
  { id: "ai", label: "AI Usage", icon: Brain },
  { id: "content", label: "Content", icon: Database },
];

function StatCard({ label, value, icon: Icon, color = "text-primary" }: { label: string; value: number | string; icon: React.ElementType; color?: string }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center bg-muted", color)}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-2xl font-semibold leading-none">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OverviewTab() {
  const statsQ = useQuery({ queryKey: ["admin-stats"], queryFn: () => apiFetch("/api/admin/stats") });
  const growthQ = useQuery({ queryKey: ["admin-growth"], queryFn: () => apiFetch("/api/admin/growth") });

  if (statsQ.isLoading) return <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array(12).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  if (statsQ.isError) return <p className="text-destructive text-sm">Failed to load stats</p>;

  const s = statsQ.data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">System Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={s.uniqueUsers} icon={Users} color="text-blue-500" />
          <StatCard label="Workspaces" value={s.workspaces} icon={Zap} color="text-amber-500" />
          <StatCard label="Pages" value={s.pages} icon={FileText} color="text-violet-500" />
          <StatCard label="Tasks" value={s.tasks} icon={CheckSquare} color="text-green-500" />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Activity & AI</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Conversations" value={s.conversations} icon={MessageSquare} color="text-cyan-500" />
          <StatCard label="Messages" value={s.messages} icon={Brain} color="text-pink-500" />
          <StatCard label="Focus Sessions" value={s.focusSessions} icon={Activity} color="text-orange-500" />
          <StatCard label="Moods Logged" value={s.moods} icon={Smile} color="text-rose-500" />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Knowledge & Habits</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Habits" value={s.habits} icon={RefreshCw} color="text-emerald-500" />
          <StatCard label="Goals" value={s.goals} icon={Target} color="text-indigo-500" />
          <StatCard label="Flashcard Sets" value={s.flashcardSets} icon={Brain} color="text-teal-500" />
          <StatCard label="Flashcards" value={s.flashcards} icon={Brain} color="text-sky-500" />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Other</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Snippets" value={s.snippets} icon={Database} color="text-slate-500" />
          <StatCard label="Bookmarks" value={s.bookmarks} icon={Eye} color="text-yellow-500" />
          <StatCard label="Admins" value={s.admins} icon={Shield} color="text-red-500" />
        </div>
      </div>
    </div>
  );
}

function UsersTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selected, setSelected] = useState<string | null>(null);

  const usersQ = useQuery({ queryKey: ["admin-users"], queryFn: () => apiFetch("/api/admin/users") });
  const userDataQ = useQuery({
    queryKey: ["admin-user-data", selected],
    queryFn: () => apiFetch(`/api/admin/users/${selected}/data`),
    enabled: !!selected,
  });

  const promote = useMutation({
    mutationFn: (userId: string) => apiFetch(`/api/admin/users/${userId}/promote`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); toast({ title: "User promoted to admin" }); },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const demote = useMutation({
    mutationFn: (userId: string) => apiFetch(`/api/admin/users/${userId}/promote`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); toast({ title: "Admin role removed" }); },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteData = useMutation({
    mutationFn: (userId: string) => apiFetch(`/api/admin/users/${userId}/data`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      setSelected(null);
      toast({ title: "User data deleted" });
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  if (usersQ.isLoading) return <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  if (usersQ.isError) return <p className="text-destructive text-sm">Failed to load users</p>;

  const users: any[] = usersQ.data ?? [];

  return (
    <div className="grid md:grid-cols-5 gap-6">
      <div className="md:col-span-3 space-y-2">
        <p className="text-xs text-muted-foreground mb-3">{users.length} users found in system</p>
        {users.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No users yet</p>
          </div>
        ) : users.map((user: any) => (
          <div
            key={user.userId}
            onClick={() => setSelected(selected === user.userId ? null : user.userId)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all",
              selected === user.userId ? "border-primary bg-primary/5" : "border-border hover:border-primary/30 hover:bg-muted/30"
            )}
          >
            {user.imageUrl ? (
              <img src={user.imageUrl} alt="" className="w-8 h-8 rounded-full flex-shrink-0 object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium truncate">{user.name || "Unknown"}</span>
                {user.isAdmin && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Crown className="w-3 h-3" /> Admin
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-muted-foreground">{user.workspaces} ws</p>
            </div>
            <ChevronRight className={cn("w-4 h-4 text-muted-foreground/50 transition-transform flex-shrink-0", selected === user.userId && "rotate-90")} />
          </div>
        ))}
      </div>

      <div className="md:col-span-2">
        {selected ? (
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-serif font-normal">User Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {userDataQ.isLoading ? (
                <div className="space-y-2">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : userDataQ.data ? (
                <>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(userDataQ.data).filter(([k]) => k !== "userId").map(([key, val]) => (
                      <div key={key} className="bg-muted/50 rounded-lg px-3 py-2">
                        <p className="text-xs text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</p>
                        <p className="font-medium">{String(val)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    {!users.find((u: any) => u.userId === selected)?.isAdmin ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => promote.mutate(selected)}
                        disabled={promote.isPending}
                      >
                        <Crown className="w-3.5 h-3.5" />
                        Promote to Admin
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => demote.mutate(selected)}
                        disabled={demote.isPending}
                      >
                        <UserX className="w-3.5 h-3.5" />
                        Remove Admin Role
                      </Button>
                    )}

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" className="w-full gap-2">
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete All Data
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete all user data?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete all workspaces, pages, tasks, habits, moods, goals, snippets, bookmarks, and focus sessions for this user. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteData.mutate(selected)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete Everything
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground/50 border border-dashed rounded-xl">
            <Eye className="w-8 h-8 mb-2" />
            <p className="text-sm">Select a user to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AITab() {
  const aiQ = useQuery({ queryKey: ["admin-ai-stats"], queryFn: () => apiFetch("/api/admin/ai-stats") });

  if (aiQ.isLoading) return <div className="space-y-4">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  if (aiQ.isError) return <p className="text-destructive text-sm">Failed to load AI stats</p>;

  const d = aiQ.data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Conversations" value={d.totalConversations} icon={MessageSquare} color="text-cyan-500" />
        <StatCard label="Total Messages" value={d.totalMessages} icon={Brain} color="text-violet-500" />
        <StatCard label="Avg Msgs / Conversation" value={d.avgMessagesPerConv} icon={TrendingUp} color="text-pink-500" />
      </div>

      <div>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Recent Conversations</h2>
        {d.recentConversations?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground/50">
            <MessageSquare className="w-10 h-10 mx-auto mb-3" />
            <p className="text-sm">No conversations yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {d.recentConversations?.map((conv: any) => (
              <div key={conv.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{conv.title || "Untitled conversation"}</p>
                  <p className="text-xs text-muted-foreground">{new Date(conv.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ContentTab() {
  const contentQ = useQuery({ queryKey: ["admin-recent-content"], queryFn: () => apiFetch("/api/admin/recent-content") });

  if (contentQ.isLoading) return <div className="space-y-3">{Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>;
  if (contentQ.isError) return <p className="text-destructive text-sm">Failed to load content</p>;

  const { recentPages = [], recentTasks = [], recentGoals = [] } = contentQ.data ?? {};

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" /> Recent Pages
        </h2>
        <div className="space-y-2">
          {recentPages.length === 0 ? <p className="text-xs text-muted-foreground">No pages yet</p> : recentPages.map((p: any) => (
            <div key={p.id} className="px-3 py-2.5 rounded-lg border border-border">
              <p className="text-sm font-medium truncate">{p.title || "Untitled"}</p>
              <p className="text-xs text-muted-foreground font-mono truncate">{p.userId?.slice(0, 12)}…</p>
              <p className="text-xs text-muted-foreground">{new Date(p.updatedAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <CheckSquare className="w-4 h-4" /> Recent Tasks
        </h2>
        <div className="space-y-2">
          {recentTasks.length === 0 ? <p className="text-xs text-muted-foreground">No tasks yet</p> : recentTasks.map((t: any) => (
            <div key={t.id} className="px-3 py-2.5 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-medium truncate flex-1">{t.title || "Untitled"}</p>
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full flex-shrink-0",
                  t.status === "done" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                  t.status === "in_progress" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                  "bg-muted text-muted-foreground"
                )}>
                  {t.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-mono truncate">{t.userId?.slice(0, 12)}…</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Target className="w-4 h-4" /> Recent Goals
        </h2>
        <div className="space-y-2">
          {recentGoals.length === 0 ? <p className="text-xs text-muted-foreground">No goals yet</p> : recentGoals.map((g: any) => (
            <div key={g.id} className="px-3 py-2.5 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-medium truncate flex-1">{g.title}</p>
                <span className="text-xs text-muted-foreground flex-shrink-0">{g.progress}%</span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden mb-1">
                <div className="h-full bg-primary rounded-full" style={{ width: `${g.progress}%` }} />
              </div>
              <p className="text-xs text-muted-foreground font-mono truncate">{g.userId?.slice(0, 12)}…</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const checkQ = useQuery({
    queryKey: ["admin-check"],
    queryFn: () => apiFetch("/api/admin/check"),
    enabled: !!user,
    retry: false,
  });

  const seed = useMutation({
    mutationFn: () => apiFetch("/api/admin/seed", { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-check"] });
      toast({ title: "You are now the admin!" });
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  if (checkQ.isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="text-center">
          <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Verifying admin access…</p>
        </div>
      </div>
    );
  }

  if (checkQ.data && !checkQ.data.isAdmin) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="text-center max-w-sm">
          <Shield className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
          <h2 className="font-serif text-2xl mb-2">Admin Access Required</h2>
          <p className="text-muted-foreground text-sm mb-6">
            You don't have admin privileges. If no admin exists yet, you can claim the role.
          </p>
          <Button onClick={() => seed.mutate()} disabled={seed.isPending} className="gap-2">
            <Crown className="w-4 h-4" />
            {seed.isPending ? "Claiming…" : "Claim Admin Role"}
          </Button>
          <p className="text-xs text-muted-foreground mt-3">Only works if no admins exist yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-4xl font-serif">Admin Panel</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">Full control over the Nexus workspace</p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-muted/50 rounded-xl p-1 w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === id
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "users" && <UsersTab />}
        {activeTab === "ai" && <AITab />}
        {activeTab === "content" && <ContentTab />}
      </div>
    </div>
  );
}
