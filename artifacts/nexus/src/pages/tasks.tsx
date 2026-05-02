import { useState } from "react";
import { useParams } from "wouter";
import {
  useListTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  getListTasksQueryKey,
} from "@workspace/api-client-react";
import { useGetWorkspace } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Status = "todo" | "in_progress" | "done";

const COLUMNS: { id: Status; label: string; color: string }[] = [
  { id: "todo", label: "To Do", color: "bg-muted" },
  { id: "in_progress", label: "In Progress", color: "bg-blue-50 dark:bg-blue-950/30" },
  { id: "done", label: "Done", color: "bg-green-50 dark:bg-green-950/30" },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function TasksPage() {
  const params = useParams<{ id: string }>();
  const workspaceId = parseInt(params.id);
  const [addingTo, setAddingTo] = useState<Status | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [dragTask, setDragTask] = useState<number | null>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const workspace = useGetWorkspace(workspaceId);
  const tasks = useListTasks(workspaceId);
  const create = useCreateTask();
  const update = useUpdateTask();
  const remove = useDeleteTask();

  async function handleCreate(status: Status) {
    if (!newTitle.trim()) return;
    try {
      await create.mutateAsync({
        workspaceId,
        data: { title: newTitle, status, priority: "medium" },
      });
      qc.invalidateQueries({ queryKey: getListTasksQueryKey(workspaceId) });
      setNewTitle("");
      setAddingTo(null);
      toast({ title: "Task created" });
    } catch {
      toast({ title: "Failed to create task", variant: "destructive" });
    }
  }

  async function handleStatusChange(id: number, status: Status) {
    try {
      await update.mutateAsync({ workspaceId, id, data: { status } });
      qc.invalidateQueries({ queryKey: getListTasksQueryKey(workspaceId) });
    } catch {
      toast({ title: "Failed to update task", variant: "destructive" });
    }
  }

  async function handleDelete(id: number) {
    try {
      await remove.mutateAsync({ workspaceId, id });
      qc.invalidateQueries({ queryKey: getListTasksQueryKey(workspaceId) });
    } catch {
      toast({ title: "Failed to delete task", variant: "destructive" });
    }
  }

  function onDrop(status: Status) {
    if (dragTask !== null) {
      handleStatusChange(dragTask, status);
      setDragTask(null);
    }
  }

  const tasksByStatus = (status: Status) =>
    tasks.data?.filter((t) => t.status === status) ?? [];

  return (
    <div className="px-6 py-8 h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-4xl font-serif">
          {workspace.data?.icon || "📁"} {workspace.data?.name}
        </h1>
        <p className="text-muted-foreground mt-1">Kanban Board</p>
      </div>

      {tasks.isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array(3).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1 min-h-0">
          {COLUMNS.map((col) => (
            <div
              key={col.id}
              className={cn("rounded-xl p-3 flex flex-col gap-2", col.color)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(col.id)}
              data-testid={`kanban-column-${col.id}`}
            >
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-semibold">{col.label}</span>
                <Badge variant="secondary" className="text-xs">
                  {tasksByStatus(col.id).length}
                </Badge>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto">
                {tasksByStatus(col.id).map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => setDragTask(task.id)}
                    onDragEnd={() => setDragTask(null)}
                    className="group bg-card border border-card-border rounded-lg p-3 cursor-grab active:cursor-grabbing shadow-sm"
                    data-testid={`task-card-${task.id}`}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm leading-snug", task.status === "done" && "line-through text-muted-foreground")}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {task.priority && (
                            <Badge className={cn("text-xs px-1.5 py-0 h-5", PRIORITY_COLORS[task.priority])}>
                              {task.priority}
                            </Badge>
                          )}
                          {col.id !== "done" && (
                            <button
                              onClick={() => handleStatusChange(task.id, col.id === "todo" ? "in_progress" : "done")}
                              className="text-xs text-muted-foreground hover:text-primary ml-auto"
                              data-testid={`advance-task-${task.id}`}
                            >
                              → {col.id === "todo" ? "Start" : "Done"}
                            </button>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                        data-testid={`delete-task-${task.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {addingTo === col.id ? (
                <div className="space-y-1.5 mt-1">
                  <Input
                    autoFocus
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Task title..."
                    className="text-sm h-8 bg-card"
                    data-testid={`new-task-input-${col.id}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreate(col.id);
                      if (e.key === "Escape") { setAddingTo(null); setNewTitle(""); }
                    }}
                  />
                  <div className="flex gap-1">
                    <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => handleCreate(col.id)}>Add</Button>
                    <Button size="sm" variant="ghost" className="flex-1 h-7 text-xs" onClick={() => { setAddingTo(null); setNewTitle(""); }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground justify-start"
                  onClick={() => setAddingTo(col.id)}
                  data-testid={`add-task-${col.id}`}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Add task
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
