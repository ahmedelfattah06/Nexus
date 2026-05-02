import { useState } from "react";
import { useParams } from "wouter";
import {
  useListPages,
  useCreatePage,
  useGetPage,
  useUpdatePage,
  useDeletePage,
  getListPagesQueryKey,
  getGetPageQueryKey,
} from "@workspace/api-client-react";
import { useGetWorkspace } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, FileText, Trash2, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";


export default function PagesPage() {
  const params = useParams<{ id: string }>();
  const workspaceId = parseInt(params.id);
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingContent, setEditingContent] = useState("");
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const qc = useQueryClient();
  const { toast } = useToast();

  const workspace = useGetWorkspace(workspaceId);
  const pages = useListPages(workspaceId);
  const selectedPage = useGetPage(workspaceId, selectedPageId!, {
    query: {
      enabled: !!selectedPageId,
      queryKey: getGetPageQueryKey(workspaceId, selectedPageId!),
    },
  });
  const createPage = useCreatePage();
  const updatePage = useUpdatePage();
  const deletePage = useDeletePage();

  const [isDirty, setIsDirty] = useState(false);

  function openPage(id: number) {
    setSelectedPageId(id);
    setIsDirty(false);
  }

  function onTitleChange(v: string) {
    setEditingTitle(v);
    setIsDirty(true);
  }

  function onContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setEditingContent(e.target.value);
    setIsDirty(true);
  }

  if (selectedPage.data && !isDirty && selectedPage.data.id === selectedPageId) {
    if (editingTitle !== selectedPage.data.title) setEditingTitle(selectedPage.data.title);
    if (editingContent !== (selectedPage.data.content || "")) setEditingContent(selectedPage.data.content || "");
  }

  async function handleSave() {
    if (!selectedPageId) return;
    try {
      await updatePage.mutateAsync({
        workspaceId,
        id: selectedPageId,
        data: { title: editingTitle, content: editingContent },
      });
      qc.invalidateQueries({ queryKey: getListPagesQueryKey(workspaceId) });
      qc.invalidateQueries({ queryKey: getGetPageQueryKey(workspaceId, selectedPageId) });
      setIsDirty(false);
      toast({ title: "Page saved" });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  }

  async function handleCreate() {
    if (!newTitle.trim()) return;
    try {
      const page = await createPage.mutateAsync({
        workspaceId,
        data: { title: newTitle, content: "" },
      });
      qc.invalidateQueries({ queryKey: getListPagesQueryKey(workspaceId) });
      setCreating(false);
      setNewTitle("");
      openPage(page.id);
      toast({ title: "Page created" });
    } catch {
      toast({ title: "Failed to create page", variant: "destructive" });
    }
  }

  async function handleDelete(id: number) {
    try {
      await deletePage.mutateAsync({ workspaceId, id });
      qc.invalidateQueries({ queryKey: getListPagesQueryKey(workspaceId) });
      if (selectedPageId === id) setSelectedPageId(null);
      toast({ title: "Page deleted" });
    } catch {
      toast({ title: "Failed to delete page", variant: "destructive" });
    }
  }

  return (
    <div className="flex h-full">
      <aside className="w-56 border-r border-border flex flex-col bg-muted/20">
        <div className="px-3 py-3 border-b border-border">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <span>{workspace.data?.icon || "📁"}</span>
            <span className="truncate font-medium text-foreground">{workspace.data?.name}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs h-8"
            onClick={() => setCreating(true)}
            data-testid="create-page-button"
          >
            <Plus className="w-3 h-3 mr-1.5" /> New Page
          </Button>
        </div>
        {creating && (
          <div className="px-3 py-2 border-b border-border">
            <Input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Page title..."
              className="text-xs h-7"
              data-testid="new-page-title"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") { setCreating(false); setNewTitle(""); }
              }}
            />
            <div className="flex gap-1 mt-1.5">
              <Button size="sm" className="flex-1 h-6 text-xs" onClick={handleCreate}>Create</Button>
              <Button size="sm" variant="ghost" className="flex-1 h-6 text-xs" onClick={() => { setCreating(false); setNewTitle(""); }}>Cancel</Button>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto py-1">
          {pages.isLoading ? (
            <div className="px-3 py-2 space-y-1">
              {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-7 w-full" />)}
            </div>
          ) : pages.data?.length === 0 ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">No pages yet</p>
          ) : (
            pages.data?.map((page) => (
              <div
                key={page.id}
                className={`group flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm transition-colors ${
                  selectedPageId === page.id ? "bg-primary/10 text-primary" : "hover:bg-muted/60"
                }`}
                onClick={() => openPage(page.id)}
                data-testid={`page-item-${page.id}`}
              >
                <FileText className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
                <span className="truncate flex-1 text-xs">{page.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(page.id); }}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                  data-testid={`delete-page-${page.id}`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        {!selectedPageId ? (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="font-serif text-2xl mb-1">Select a page</h3>
              <p className="text-sm text-muted-foreground">or create a new one to start writing</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-6 py-3 border-b border-border">
              <input
                value={editingTitle}
                onChange={(e) => onTitleChange(e.target.value)}
                className="text-2xl font-serif bg-transparent outline-none flex-1 mr-4"
                placeholder="Untitled"
                data-testid="page-title-input"
              />
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!isDirty || updatePage.isPending}
                data-testid="save-page-button"
              >
                {updatePage.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
            <div className="flex-1 px-6 py-4">
              {selectedPage.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <textarea
                  value={editingContent}
                  onChange={onContentChange}
                  className="w-full h-full resize-none bg-transparent outline-none text-sm leading-relaxed font-sans"
                  placeholder="Start writing... (Markdown supported)"
                  data-testid="page-content-input"
                />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
