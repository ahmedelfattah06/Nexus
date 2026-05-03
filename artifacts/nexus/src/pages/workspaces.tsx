import { useState } from "react";
import { useLocation } from "wouter";
import {
  useListWorkspaces,
  useCreateWorkspace,
  useDeleteWorkspace,
  getListWorkspacesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, FolderOpen, Trash2, FileText, CheckSquare, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";

interface WorkspaceForm {
  name: string;
  icon: string;
}

const WORKSPACE_ICONS = ["📚", "💻", "🎨", "🔬", "🚀", "📊", "🎯", "🌿", "⚡", "🏗️"];

export default function WorkspacesPage() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState("📚");
  const qc = useQueryClient();
  const { toast } = useToast();

  const workspaces = useListWorkspaces();
  const workspaceList: any[] = Array.isArray(workspaces.data) ? workspaces.data : (workspaces.data as any)?.data ?? [];
  const create = useCreateWorkspace();
  const remove = useDeleteWorkspace();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<WorkspaceForm>({
    defaultValues: { name: "", icon: "📚" },
  });

  async function onSubmit(data: WorkspaceForm) {
    try {
      await create.mutateAsync({ data: { name: data.name, icon: selectedIcon } });
      qc.invalidateQueries({ queryKey: getListWorkspacesQueryKey() });
      reset();
      setOpen(false);
      toast({ title: "Workspace created!" });
    } catch {
      toast({ title: "Failed to create workspace", variant: "destructive" });
    }
  }

  async function handleDelete(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    try {
      await remove.mutateAsync({ id });
      qc.invalidateQueries({ queryKey: getListWorkspacesQueryKey() });
      toast({ title: "Workspace deleted" });
    } catch {
      toast({ title: "Failed to delete workspace", variant: "destructive" });
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-serif">Workspaces</h1>
          <p className="text-muted-foreground mt-1">Organize your projects and ideas</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="create-workspace-button">
              <Plus className="w-4 h-4 mr-2" /> New Workspace
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl font-normal">New Workspace</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Name</label>
                <Input
                  {...register("name", { required: "Name is required" })}
                  placeholder="e.g. Computer Science Notes"
                  data-testid="workspace-name-input"
                />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {WORKSPACE_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setSelectedIcon(icon)}
                      className={`w-9 h-9 text-lg rounded-lg transition-all ${selectedIcon === icon ? "ring-2 ring-primary bg-primary/10" : "hover:bg-muted"}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={create.isPending} data-testid="submit-workspace">
                {create.isPending ? "Creating..." : "Create Workspace"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {workspaces.isLoading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : workspaceList.length === 0 ? (
        <div className="text-center py-20">
          <FolderOpen className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-serif text-2xl mb-2">No workspaces yet</h3>
          <p className="text-muted-foreground text-sm">Create your first workspace to start organizing your work.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {workspaceList.map((ws) => (
            <Card
              key={ws.id}
              className="cursor-pointer hover:shadow-md transition-shadow group"
              data-testid={`workspace-card-${ws.id}`}
              onClick={() => setLocation(`/workspaces/${ws.id}/pages`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{ws.icon || "📁"}</span>
                    <div>
                      <CardTitle className="text-base font-medium">{ws.name}</CardTitle>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, ws.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
                    data-testid={`delete-workspace-${ws.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <button
                    onClick={(e) => { e.stopPropagation(); setLocation(`/workspaces/${ws.id}/pages`); }}
                    className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                    data-testid={`workspace-pages-${ws.id}`}
                  >
                    <FileText className="w-3.5 h-3.5" /> Pages
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setLocation(`/workspaces/${ws.id}/tasks`); }}
                    className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                    data-testid={`workspace-tasks-${ws.id}`}
                  >
                    <CheckSquare className="w-3.5 h-3.5" /> Tasks
                    <ArrowRight className="w-3 h-3" />
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
