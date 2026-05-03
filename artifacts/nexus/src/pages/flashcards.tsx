import { useState } from "react";
import { useListFlashcardSets, useCreateFlashcardSet, useDeleteFlashcardSet, useListFlashcards, useCreateFlashcard, useDeleteFlashcard, getListFlashcardSetsQueryKey, getListFlashcardsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Brain, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

function StudyMode({ setId, onClose }: { setId: number; onClose: () => void }) {
  const { t } = useLanguage();
  const cards = useListFlashcards(setId);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const cardList: any[] = Array.isArray(cards.data) ? cards.data : (cards.data as any)?.data ?? [];
  const current = cardList[idx];
  if (cards.isLoading) return <div className="flex items-center justify-center h-64"><Skeleton className="w-full h-full" /></div>;
  if (!cardList.length) return <div className="text-center py-10 text-muted-foreground">No cards in this set yet.</div>;

  return (
    <div className="space-y-6">
      <div className="text-center text-sm text-muted-foreground">{idx + 1} / {cardList.length}</div>
      <div className="relative cursor-pointer" onClick={() => setFlipped(f => !f)} style={{ perspective: "1000px" }}>
        <div className={cn("relative w-full transition-all duration-500", flipped ? "[transform:rotateY(180deg)]"  : "")} style={{ transformStyle: "preserve-3d", minHeight: "200px" }}>
          <Card className="absolute inset-0 flex items-center justify-center p-8 text-center" style={{ backfaceVisibility: "hidden" }}>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">{t.flashcards.front}</p>
              <p className="text-xl font-medium">{current?.front}</p>
              <p className="text-xs text-muted-foreground mt-4">{t.flashcards.flip} →</p>
            </div>
          </Card>
          <Card className="absolute inset-0 flex items-center justify-center p-8 text-center bg-primary/5 border-primary/20" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">{t.flashcards.back}</p>
              <p className="text-xl font-medium">{current?.back}</p>
            </div>
          </Card>
        </div>
      </div>
      <div className="flex justify-between items-center">
        <Button variant="outline" size="icon" onClick={() => { setIdx(i => Math.max(0, i - 1)); setFlipped(false); }} disabled={idx === 0}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => { setIdx(0); setFlipped(false); }}>
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => { setIdx(i => Math.min(cardList.length - 1, i + 1)); setFlipped(false); }} disabled={idx === cardList.length - 1}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
      <Button variant="outline" className="w-full" onClick={onClose}>{t.common.close}</Button>
    </div>
  );
}

function SetView({ setId, onBack }: { setId: number; onBack: () => void }) {
  const { t } = useLanguage();
  const [studying, setStudying] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const qc = useQueryClient();
  const { toast } = useToast();
  const cards = useListFlashcards(setId);
  const create = useCreateFlashcard();
  const remove = useDeleteFlashcard();

  async function handleAdd() {
    if (!front.trim() || !back.trim()) return;
    try {
      await create.mutateAsync({ id: setId, data: { front, back } });
      qc.invalidateQueries({ queryKey: getListFlashcardsQueryKey(setId) });
      setFront(""); setBack("");
    } catch {
      toast({ title: t.common.error, variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      {studying ? (
        <StudyMode setId={setId} onClose={() => setStudying(false)} />
      ) : (
        <>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onBack}><ChevronLeft className="w-4 h-4 mr-1" /> Back</Button>
            {((Array.isArray(cards.data) ? cards.data : (cards.data as any)?.data ?? []) as any[]).length > 0 && (
              <Button onClick={() => setStudying(true)} className="ml-auto"><Brain className="w-4 h-4 mr-2" />{t.flashcards.study}</Button>
            )}
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input value={front} onChange={e => setFront(e.target.value)} placeholder={t.flashcards.frontPlaceholder} />
              <Input value={back} onChange={e => setBack(e.target.value)} placeholder={t.flashcards.backPlaceholder} onKeyDown={e => e.key === "Enter" && handleAdd()} />
            </div>
            <Button className="w-full" variant="outline" onClick={handleAdd} disabled={create.isPending}>
              <Plus className="w-4 h-4 mr-2" />{t.flashcards.addCard}
            </Button>
          </div>
          {cards.isLoading ? <Skeleton className="h-24 w-full" /> : (
            <div className="space-y-2">
              {((Array.isArray(cards.data) ? cards.data : (cards.data as any)?.data ?? []) as any[]).map(card => (
                <Card key={card.id} className="group">
                  <CardContent className="pt-3 pb-3 flex gap-4 items-start">
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <p className="text-sm">{card.front}</p>
                      <p className="text-sm text-muted-foreground">{card.back}</p>
                    </div>
                    <button onClick={async () => { await remove.mutateAsync({ id: card.id }); qc.invalidateQueries({ queryKey: getListFlashcardsQueryKey(setId) }); }} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function FlashcardsPage() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [activeSet, setActiveSet] = useState<number | null>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const sets = useListFlashcardSets();
  const create = useCreateFlashcardSet();
  const remove = useDeleteFlashcardSet();

  async function handleCreate() {
    if (!title.trim()) return;
    try {
      await create.mutateAsync({ data: { title, description } });
      qc.invalidateQueries({ queryKey: getListFlashcardSetsQueryKey() });
      setTitle(""); setDescription(""); setOpen(false);
    } catch {
      toast({ title: t.common.error, variant: "destructive" });
    }
  }

  if (activeSet !== null) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-4xl font-serif mb-8">{sets.data?.find(s => s.id === activeSet)?.title}</h1>
        <SetView setId={activeSet} onBack={() => setActiveSet(null)} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-serif">{t.flashcards.title}</h1>
          <p className="text-muted-foreground mt-1">{t.flashcards.subtitle}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />{t.flashcards.newSet}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl font-normal">{t.flashcards.newSet}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t.flashcards.setNamePlaceholder} />
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder={t.flashcards.setDescription} />
              <Button className="w-full" onClick={handleCreate} disabled={create.isPending}>
                {create.isPending ? t.flashcards.creating : t.flashcards.createSet}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {sets.isLoading ? (
        <div className="grid sm:grid-cols-2 gap-4">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
      ) : ((Array.isArray(sets.data) ? sets.data : (sets.data as any)?.data ?? []) as any[]).length === 0 ? (
        <div className="text-center py-20">
          <Brain className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-serif text-2xl mb-2">{t.flashcards.empty}</h3>
          <p className="text-muted-foreground text-sm">{t.flashcards.emptyHint}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {((Array.isArray(sets.data) ? sets.data : (sets.data as any)?.data ?? []) as any[]).map(set => (
            <Card key={set.id} className="cursor-pointer hover:shadow-md transition-shadow group" onClick={() => setActiveSet(set.id)}>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                      <Brain className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-medium">{set.title}</h3>
                    {set.description && <p className="text-xs text-muted-foreground mt-0.5">{set.description}</p>}
                  </div>
                  <button onClick={e => { e.stopPropagation(); remove.mutateAsync({ id: set.id }).then(() => qc.invalidateQueries({ queryKey: getListFlashcardSetsQueryKey() })); }} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
