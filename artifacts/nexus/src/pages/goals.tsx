import { useState } from "react";
import { useListGoals, useCreateGoal, useUpdateGoal, useDeleteGoal, getListGoalsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Target, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

export default function GoalsPage() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const qc = useQueryClient();
  const { toast } = useToast();

  const goalsQuery = useListGoals();
  const create = useCreateGoal();
  const update = useUpdateGoal();
  const remove = useDeleteGoal();

  const goalsList: any[] = (goalsQuery.data as any)?.data ?? goalsQuery.data ?? [];

  async function handleCreate() {
    if (!title.trim()) return;
    try {
      await create.mutateAsync({ data: { title, description, targetDate } });
      qc.invalidateQueries({ queryKey: getListGoalsQueryKey() });
      setTitle(""); setDescription(""); setTargetDate(""); setOpen(false);
      toast({ title: t.goals.created });
    } catch {
      toast({ title: t.common.error, variant: "destructive" });
    }
  }

  async function handleProgressUpdate(id: number, progress: number) {
    const goal = goalsList.find((g: any) => g.id === id);
    if (!goal) return;
    try {
      await update.mutateAsync({ id, data: { progress, status: progress === 100 ? "completed" : goal.status } });
      qc.invalidateQueries({ queryKey: getListGoalsQueryKey() });
    } catch { /* silent */ }
  }

  async function handleStatusUpdate(id: number, status: string) {
    try {
      await update.mutateAsync({ id, data: { status } });
      qc.invalidateQueries({ queryKey: getListGoalsQueryKey() });
    } catch { /* silent */ }
  }

  async function handleDelete(id: number) {
    try {
      await remove.mutateAsync({ id });
      qc.invalidateQueries({ queryKey: getListGoalsQueryKey() });
      toast({ title: t.goals.deleted });
    } catch {
      toast({ title: t.common.error, variant: "destructive" });
    }
  }

  const safeList = Array.isArray(goalsList) ? goalsList : [];
  const active = safeList.filter((g: any) => g.status === "active");
  const completed = safeList.filter((g: any) => g.status === "completed");
  const paused = safeList.filter((g: any) => g.status === "paused");

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-serif">{t.goals.title}</h1>
          <p className="text-muted-foreground mt-1">{t.goals.subtitle}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />{t.goals.new}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl font-normal">{t.goals.new}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t.goals.title_}</label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t.goals.titlePlaceholder} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t.goals.description}</label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder={t.goals.descriptionPlaceholder} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t.goals.targetDate}</label>
                <Input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={create.isPending}>
                {create.isPending ? t.goals.creating : t.goals.create}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {goalsQuery.isLoading ? (
        <div className="space-y-4">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : safeList.length === 0 ? (
        <div className="text-center py-20">
          <Target className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-serif text-2xl mb-2">{t.goals.empty}</h3>
          <p className="text-muted-foreground text-sm">{t.goals.emptyHint}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {[{ label: t.goals.statuses.active, items: active }, { label: t.goals.statuses.paused, items: paused }, { label: t.goals.statuses.completed, items: completed }].map(({ label, items }) =>
            items.length === 0 ? null : (
              <div key={label}>
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">{label}</h2>
                <div className="space-y-3">
                  {items.map((goal: any) => (
                    <Card key={goal.id} className="group hover:shadow-sm transition-shadow">
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${goal.status === "completed" ? "bg-green-100 dark:bg-green-900/30" : "bg-primary/10"}`}>
                            {goal.status === "completed" ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                            ) : (
                              <Target className="w-5 h-5 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className={`font-medium text-sm ${goal.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{goal.title}</span>
                              {goal.targetDate && <span className="text-xs text-muted-foreground">Due: {goal.targetDate}</span>}
                            </div>
                            {goal.description && <p className="text-xs text-muted-foreground mb-2">{goal.description}</p>}
                            <div className="flex items-center gap-2">
                              <Slider value={[goal.progress]} min={0} max={100} step={5} className="flex-1" onValueChange={([v]) => handleProgressUpdate(goal.id, v)} />
                              <span className="text-xs text-muted-foreground w-8 text-right">{goal.progress}%</span>
                            </div>
                            <div className="flex gap-2 mt-2">
                              {Object.keys(t.goals.statuses).map(s => (
                                <button key={s} onClick={() => handleStatusUpdate(goal.id, s)} className={`text-xs px-2 py-0.5 rounded-full transition-colors ${goal.status === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                                  {t.goals.statuses[s as keyof typeof t.goals.statuses]}
                                </button>
                              ))}
                            </div>
                          </div>
                          <button onClick={() => handleDelete(goal.id)} className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
