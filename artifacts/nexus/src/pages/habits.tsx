import { useState } from "react";
import { useListHabits, useCreateHabit, useDeleteHabit, useLogHabit } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListHabitsQueryKey } from "@workspace/api-client-react";
import { Plus, Trash2, CheckCircle2, Circle, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

const HABIT_ICONS = ["✅", "💪", "📚", "🏃", "🧘", "💧", "🥗", "😴", "✍️", "🎯", "🧹", "🌅"];
const HABIT_COLORS = ["#D4890A", "#10B981", "#6366F1", "#F43F5E", "#0EA5E9", "#8B5CF6", "#F59E0B", "#14B8A6"];

export default function HabitsPage() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("✅");
  const [color, setColor] = useState("#D4890A");
  const qc = useQueryClient();
  const { toast } = useToast();

  const habitsQuery = useListHabits();
  const create = useCreateHabit();
  const remove = useDeleteHabit();
  const log = useLogHabit();

  const today = new Date().toISOString().split("T")[0];

  const habitsList: any[] = Array.isArray(habitsQuery.data)
    ? habitsQuery.data
    : (habitsQuery.data as any)?.data ?? [];

  async function handleCreate() {
    if (!name.trim()) return;
    try {
      await create.mutateAsync({ data: { name, icon, color } });
      qc.invalidateQueries({ queryKey: getListHabitsQueryKey() });
      setName(""); setOpen(false);
      toast({ title: t.habits.created });
    } catch {
      toast({ title: t.common.error, variant: "destructive" });
    }
  }

  async function handleToggle(habitId: number, completedToday: boolean) {
    if (completedToday) return;
    try {
      await log.mutateAsync({ id: habitId, data: { date: today, completed: true } });
      qc.invalidateQueries({ queryKey: getListHabitsQueryKey() });
    } catch {
      toast({ title: t.common.error, variant: "destructive" });
    }
  }

  async function handleDelete(id: number) {
    try {
      await remove.mutateAsync({ id });
      qc.invalidateQueries({ queryKey: getListHabitsQueryKey() });
      toast({ title: t.habits.deleted });
    } catch {
      toast({ title: t.common.error, variant: "destructive" });
    }
  }

  const completedCount = habitsList.filter((h: any) => h.completedToday).length;
  const totalCount = habitsList.length;

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-serif">{t.habits.title}</h1>
          <p className="text-muted-foreground mt-1">{t.habits.subtitle}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />{t.habits.new}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl font-normal">{t.habits.new}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t.habits.name}</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder={t.habits.namePlaceholder} onKeyDown={e => e.key === "Enter" && handleCreate()} />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">{t.habits.icon}</label>
                <div className="flex flex-wrap gap-2">
                  {HABIT_ICONS.map(i => (
                    <button key={i} type="button" onClick={() => setIcon(i)} className={`w-9 h-9 text-lg rounded-lg transition-all ${icon === i ? "ring-2 ring-primary bg-primary/10" : "hover:bg-muted"}`}>{i}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">{t.habits.color}</label>
                <div className="flex gap-2 flex-wrap">
                  {HABIT_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setColor(c)} className={`w-7 h-7 rounded-full transition-all ${color === c ? "ring-2 ring-offset-2 ring-primary" : ""}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={create.isPending}>
                {create.isPending ? t.habits.creating : t.habits.create}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {totalCount > 0 && (
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Flame className="w-5 h-5 text-primary" />
              <span className="font-medium">{t.habits.today}: {completedCount}/{totalCount} completed</span>
              <div className="flex-1 bg-muted rounded-full h-2 ml-2">
                <div className="h-2 rounded-full bg-primary transition-all" style={{ width: totalCount ? `${(completedCount / totalCount) * 100}%` : "0%" }} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {habitsQuery.isLoading ? (
        <div className="space-y-3">
          {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : habitsList.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🌱</div>
          <h3 className="font-serif text-2xl mb-2">{t.habits.empty}</h3>
          <p className="text-muted-foreground text-sm">{t.habits.emptyHint}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {habitsList.map((habit: any) => {
            const done = habit.completedToday ?? false;
            const streak = habit.streak ?? 0;
            return (
              <Card key={habit.id} className={`transition-all cursor-pointer group ${done ? "opacity-70" : ""}`} onClick={() => handleToggle(habit.id, done)}>
                <CardContent className="pt-4 pb-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: `${habit.color}20` }}>
                    {habit.icon}
                  </div>
                  <div className="flex-1">
                    <div className={`font-medium ${done ? "line-through text-muted-foreground" : ""}`}>{habit.name}</div>
                    {streak > 0 && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Flame className="w-3 h-3 text-orange-500" />
                        <span className="text-xs text-orange-500 font-medium">{streak} day streak</span>
                      </div>
                    )}
                  </div>
                  {done ? (
                    <CheckCircle2 className="w-6 h-6 flex-shrink-0" style={{ color: habit.color }} />
                  ) : (
                    <Circle className="w-6 h-6 text-muted-foreground flex-shrink-0" />
                  )}
                  <button onClick={e => { e.stopPropagation(); handleDelete(habit.id); }} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 transition-opacity">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
