import { useState } from "react";
import { useListBookmarks, useCreateBookmark, useDeleteBookmark, getListBookmarksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ExternalLink, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

export default function BookmarksPage() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const { toast } = useToast();

  const bookmarks = useListBookmarks();
  const create = useCreateBookmark();
  const remove = useDeleteBookmark();

  function addTag(e: React.KeyboardEvent) {
    if (e.key === "Enter" && tagInput.trim()) {
      setTags(prev => [...prev, tagInput.trim()]);
      setTagInput("");
    }
  }

  async function handleCreate() {
    if (!title.trim() || !url.trim()) return;
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    try {
      await create.mutateAsync({ data: { title, url: fullUrl, description, tags } });
      qc.invalidateQueries({ queryKey: getListBookmarksQueryKey() });
      setTitle(""); setUrl(""); setDescription(""); setTags([]); setOpen(false);
      toast({ title: t.bookmarks.saved });
    } catch {
      toast({ title: t.common.error, variant: "destructive" });
    }
  }

  async function handleDelete(id: number) {
    try {
      await remove.mutateAsync({ id });
      qc.invalidateQueries({ queryKey: getListBookmarksQueryKey() });
      toast({ title: t.bookmarks.deleted });
    } catch {
      toast({ title: t.common.error, variant: "destructive" });
    }
  }

  const filtered = (bookmarks.data || []).filter(b =>
    !search || b.title.toLowerCase().includes(search.toLowerCase()) || b.url.toLowerCase().includes(search.toLowerCase())
  );

  function getDomain(url: string) {
    try { return new URL(url).hostname.replace("www.", ""); } catch { return url; }
  }

  function getFaviconUrl(url: string) {
    try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`; } catch { return null; }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-serif">{t.bookmarks.title}</h1>
          <p className="text-muted-foreground mt-1">{t.bookmarks.subtitle}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />{t.bookmarks.new}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl font-normal">{t.bookmarks.new}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t.bookmarks.url}</label>
                <Input value={url} onChange={e => setUrl(e.target.value)} placeholder={t.bookmarks.urlPlaceholder} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t.bookmarks.title_}</label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t.bookmarks.titlePlaceholder} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t.bookmarks.description}</label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder={t.bookmarks.descriptionPlaceholder} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Tags</label>
                <Input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag} placeholder="Press Enter to add tag" />
                {tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-2">
                    {tags.map(tag => <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => setTags(prev => prev.filter(t => t !== tag))}>{tag} ×</Badge>)}
                  </div>
                )}
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={create.isPending}>
                {create.isPending ? t.bookmarks.saving : t.bookmarks.save}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Input className="mb-6" placeholder={t.common.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} />

      {bookmarks.isLoading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Bookmark className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-serif text-2xl mb-2">{t.bookmarks.empty}</h3>
          <p className="text-muted-foreground text-sm">{t.bookmarks.emptyHint}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map(bookmark => (
            <Card key={bookmark.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden mt-0.5">
                    {getFaviconUrl(bookmark.url) ? (
                      <img src={getFaviconUrl(bookmark.url)!} alt="" className="w-4 h-4" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <Bookmark className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sm hover:text-primary transition-colors line-clamp-1 block">{bookmark.title}</a>
                    <p className="text-xs text-muted-foreground mt-0.5">{getDomain(bookmark.url)}</p>
                    {bookmark.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{bookmark.description}</p>}
                    {bookmark.tags && bookmark.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-2">
                        {bookmark.tags.map(tag => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="p-1 text-muted-foreground hover:text-primary transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button onClick={() => handleDelete(bookmark.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100">
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
