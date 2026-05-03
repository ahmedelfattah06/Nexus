import { useState } from "react";
import { useListMoods, useCreateMood, getListMoodsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export default function MoodPage() {
  const { t } = useLanguage();
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const qc = useQueryClient();
  const { toast } = useToast();

  const moodsQuery = useListMoods();
  const create = useCreateMood();

  const moodsList: any[] = (moodsQuery.data as any)?.data ?? moodsQuery.data ?? [];

  const today = new Date().toISOString().split("T")[0];
  const safeMoods = Array.isArray(moodsList) ? moodsList : [];
  const todayLog = safeMoods.find((m: any) => m.date === today);

  async function handleLog() {
    if (selectedMood === null) return;
    try {
      await create.mutateAsync({ data: { mood: selectedMood, note, date: today } });
      qc.invalidateQueries({ queryKey: getListMoodsQueryKey() });
      setNote(""); setSelectedMood(null);
      toast({ title: t.mood.logged });
    } catch (err: any) {
      if (err?.response?.status === 409) {
        toast({ title: "Already logged today", variant: "destructive" });
        qc.invalidateQueries({ queryKey: getListMoodsQueryKey() });
      } else {
        toast({ title: t.common.error, variant: "destructive" });
      }
    }
  }

  const last7 = safeMoods.slice().sort((a: any, b: any) => b.date.localeCompare(a.date)).slice(0, 7);

  const moodColors = ["bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-green-400", "bg-emerald-500"];

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-serif">{t.mood.title}</h1>
        <p className="text-muted-foreground mt-1">{t.mood.subtitle}</p>
      </div>

      <Card className="mb-8">
        <CardContent className="pt-6">
          <h2 className="text-xl font-serif mb-6 text-center">{todayLog ? "You've already logged today" : t.mood.howAreYou}</h2>

          {todayLog ? (
            <div className="text-center">
              <div className="text-6xl mb-3">{t.mood.moodEmojis[todayLog.mood - 1]}</div>
              <p className="font-medium">{t.mood.moods[todayLog.mood - 1]}</p>
              {todayLog.note && <p className="text-muted-foreground text-sm mt-2">"{todayLog.note}"</p>}
            </div>
          ) : (
            <>
              <div className="flex justify-center gap-3 mb-6">
                {t.mood.moodEmojis.map((emoji: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedMood(idx + 1)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-xl transition-all",
                      selectedMood === idx + 1 ? "bg-primary/10 ring-2 ring-primary scale-110" : "hover:bg-muted"
                    )}
                  >
                    <span className="text-3xl">{emoji}</span>
                    <span className="text-xs text-muted-foreground">{t.mood.moods[idx]}</span>
                  </button>
                ))}
              </div>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder={t.mood.notePlaceholder}
                className="w-full h-20 text-sm px-3 py-2 rounded-lg border border-input bg-muted/40 outline-none focus:ring-2 focus:ring-ring resize-none mb-4"
              />
              <Button className="w-full" onClick={handleLog} disabled={selectedMood === null || create.isPending}>
                {create.isPending ? t.mood.logging : t.mood.log}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-medium mb-4">{t.mood.history}</h2>
        {moodsQuery.isLoading ? (
          <div className="space-y-2">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : last7.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-muted-foreground text-sm">{t.mood.emptyHint}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {last7.map((entry: any) => (
              <Card key={entry.id}>
                <CardContent className="pt-3 pb-3 flex items-center gap-4">
                  <span className="text-2xl">{t.mood.moodEmojis[entry.mood - 1]}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{t.mood.moods[entry.mood - 1]}</span>
                      <div className={`w-2 h-2 rounded-full ${moodColors[entry.mood - 1]}`} />
                    </div>
                    {entry.note && <p className="text-xs text-muted-foreground mt-0.5">"{entry.note}"</p>}
                  </div>
                  <span className="text-xs text-muted-foreground">{entry.date}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
