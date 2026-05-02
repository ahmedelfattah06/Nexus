import { useState } from "react";
import {
  useListSnippets,
  useCreateSnippet,
  useUpdateSnippet,
  useDeleteSnippet,
  getListSnippetsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Code2, Trash2, Copy, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";

const LANGUAGES = [
  "javascript", "typescript", "python", "rust", "go", "java", "cpp",
  "css", "html", "sql", "bash", "json", "yaml", "markdown", "other",
];

interface SnippetForm {
  language: string;
  code: string;
  description: string;
}

export default function SnippetsPage() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [copied, setCopied] = useState<number | null>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const snippets = useListSnippets();
  const create = useCreateSnippet();
  const remove = useDeleteSnippet();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<SnippetForm>({
    defaultValues: { language: "javascript", code: "", description: "" },
  });
  const language = watch("language");

  async function onSubmit(data: SnippetForm) {
    try {
      await create.mutateAsync({ data: { language: data.language, code: data.code, description: data.description } });
      qc.invalidateQueries({ queryKey: getListSnippetsQueryKey() });
      reset();
      setOpen(false);
      toast({ title: "Snippet saved!" });
    } catch {
      toast({ title: "Failed to save snippet", variant: "destructive" });
    }
  }

  async function handleDelete(id: number) {
    try {
      await remove.mutateAsync({ id });
      qc.invalidateQueries({ queryKey: getListSnippetsQueryKey() });
      toast({ title: "Snippet deleted" });
    } catch {
      toast({ title: "Failed to delete snippet", variant: "destructive" });
    }
  }

  async function handleCopy(code: string, id: number) {
    await navigator.clipboard.writeText(code);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const languages = ["all", ...Array.from(new Set(snippets.data?.map((s) => s.language) ?? []))];
  const filtered = filter === "all"
    ? (snippets.data ?? [])
    : (snippets.data ?? []).filter((s) => s.language === filter);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-serif">Code Snippets</h1>
          <p className="text-muted-foreground mt-1">Your personal snippet library</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="create-snippet-button">
              <Plus className="w-4 h-4 mr-2" /> New Snippet
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl font-normal">New Snippet</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Language</label>
                  <Select value={language} onValueChange={(v) => setValue("language", v)}>
                    <SelectTrigger data-testid="snippet-language-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((l) => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Description</label>
                <Input {...register("description", { required: "Description is required" })} placeholder="What does this do?" data-testid="snippet-description-input" />
                {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Code</label>
                <textarea
                  {...register("code", { required: "Code is required" })}
                  className="w-full h-40 font-mono text-sm p-3 rounded-lg border border-input bg-muted/40 outline-none focus:ring-2 focus:ring-ring resize-none"
                  placeholder="// paste your code here"
                  data-testid="snippet-code-input"
                />
                {errors.code && <p className="text-xs text-destructive mt-1">{errors.code.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={create.isPending} data-testid="submit-snippet">
                {create.isPending ? "Saving..." : "Save Snippet"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {languages.length > 1 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          {languages.map((l) => (
            <Badge
              key={l}
              variant={filter === l ? "default" : "outline"}
              className="cursor-pointer capitalize"
              onClick={() => setFilter(l)}
              data-testid={`language-filter-${l}`}
            >
              {l}
            </Badge>
          ))}
        </div>
      )}

      {snippets.isLoading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Code2 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-serif text-2xl mb-2">No snippets yet</h3>
          <p className="text-muted-foreground text-sm">Save code snippets to reuse across your projects.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((snippet) => (
            <Card key={snippet.id} className="group" data-testid={`snippet-card-${snippet.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-sm font-medium">{snippet.description}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">{snippet.language}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs capitalize">{snippet.language}</Badge>
                    <button
                      onClick={() => handleCopy(snippet.code, snippet.id)}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                      data-testid={`copy-snippet-${snippet.id}`}
                    >
                      {copied === snippet.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDelete(snippet.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                      data-testid={`delete-snippet-${snippet.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="text-xs font-mono bg-muted/50 rounded-lg p-3 overflow-x-auto max-h-36 leading-relaxed">
                  {snippet.code}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
