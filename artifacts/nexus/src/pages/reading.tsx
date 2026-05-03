import { useState } from "react";
import { useListReadingItems, useCreateReadingItem, useUpdateReadingItem, useDeleteReadingItem, getListReadingItemsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, BookOpen, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

const STATUS_COLORS: Record<string, string> = {
  want_to_read: "secondary",
  reading: "default",
  completed: "outline",
};

export default function ReadingPage() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("want_to_read");
  const [filter, setFilter] = useState("all");
  const qc = useQueryClient();
  const { toast } = useToast();

  const items = useListReadingItems();
  const create = useCreateReadingItem();
  const update = useUpdateReadingItem();
  const remove = useDeleteReadingItem();

  async function handleCreate() {
    if (!title.trim()) return;
    try {
      await create.mutateAsync({ data: { title, author, url: url ? (url.startsWith("http") ? url : `https://${url}`) : "", status } });
      qc.invalidateQueries({ queryKey: getListReadingItemsQueryKey() });
      setTitle(""); setAuthor(""); setUrl(""); setStatus("want_to_read"); setOpen(false);
      toast({ title: t.reading.saved });
    } catch {
      toast({ title: t.common.error, variant: "destructive" });
    }
  }

  async function handleProgressUpdate(id: number, progress: number) {
    try {
      await update.mutateAsync({ id, data: { progress, status: progress === 100 ? "completed" : progress > 0 ? "reading" : "want_to_read" } });
      qc.invalidateQueries({ queryKey: getListReadingItemsQueryKey() });
    } catch { /* silent */ }
  }

  async function handleDelete(id: number) {
    try {
      await remove.mutateAsync({ id });
      qc.invalidateQueries({ queryKey: getListReadingItemsQueryKey() });
      toast({ title: t.reading.deleted });
    } catch {
      toast({ title: t.common.error, variant: "destructive" });
    }
  }

  const statuses = ["all", "want_to_read", "reading", "completed"];
  const itemsList: any[] = Array.isArray(items.data) ? items.data : (items.data as any)?.data ?? [];
  const filtered = filter === "all" ? itemsList : itemsList.filter(i => i.status === filter);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-serif">{t.reading.title}</h1>
          <p className="text-muted-foreground mt-1">{t.reading.subtitle}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />{t.reading.new}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl font-normal">{t.reading.new}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t.reading.title_}</label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t.reading.titlePlaceholder} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">{t.reading.author}</label>
                  <Input value={author} onChange={e => setAuthor(e.target.value)} placeholder={t.reading.authorPlaceholder} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">{t.reading.status}</label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="want_to_read">{t.reading.statuses.want_to_read}</SelectItem>
                      <SelectItem value="reading">{t.reading.statuses.reading}</SelectItem>
                      <SelectItem value="completed">{t.reading.statuses.completed}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t.reading.url}</label>
                <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={create.isPending}>
                {create.isPending ? t.reading.saving : t.reading.save}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {statuses.map(s => (
          <Badge key={s} variant={filter === s ? "default" : "outline"} className="cursor-pointer capitalize" onClick={() => setFilter(s)}>
            {s === "all" ? "All" : t.reading.statuses[s as keyof typeof t.reading.statuses]}
          </Badge>
        ))}
      </div>

      {items.isLoading ? (
        <div className="space-y-4">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-serif text-2xl mb-2">{t.reading.empty}</h3>
          <p className="text-muted-foreground text-sm">{t.reading.emptyHint}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <Card key={item.id} className="group hover:shadow-sm transition-shadow">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{item.title}</span>
                      <Badge variant={STATUS_COLORS[item.status] as any} className="text-xs">
                        {t.reading.statuses[item.status as keyof typeof t.reading.statuses]}
                      </Badge>
                    </div>
                    {item.author && <p className="text-xs text-muted-foreground mt-0.5">{item.author}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <Slider
                        value={[item.progress]}
                        min={0} max={100} step={5}
                        className="flex-1"
                        onValueChange={([v]) => handleProgressUpdate(item.id, v)}
                      />
                      <span className="text-xs text-muted-foreground w-8 text-right">{item.progress}%</span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-1 text-muted-foreground hover:text-primary">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button onClick={() => handleDelete(item.id)} className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
