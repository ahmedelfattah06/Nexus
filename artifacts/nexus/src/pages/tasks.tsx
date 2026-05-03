import { useState } from "react";
import { useParams } from "wouter";
import {
  useListTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  getListTasksQueryKey,
  useGetWorkspace,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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

type Task = {
  id: number;
  title: string;
  status: string;
  priority: string;
};

function DroppableColumn({
  id,
  children,
}: {
  id: Status;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 space-y-2 overflow-y-auto min-h-[80px] rounded-lg transition-colors",
        isOver && "ring-2 ring-primary/40 bg-primary/5"
      )}
    >
      {children}
    </div>
  );
}

function SortableTaskCard({
  task,
  onStatusChange,
  onDelete,
  currentColumn,
}: {
  task: Task;
  onStatusChange: (id: number, status: Status) => void;
  onDelete: (id: number) => void;
  currentColumn: Status;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { status: currentColumn } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group bg-card border border-border rounded-lg p-3 shadow-sm"
      data-testid={`task-card-${task.id}`}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 flex-shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm leading-snug",
              task.status === "done" && "line-through text-muted-foreground"
            )}
          >
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-2">
            {task.priority && (
              <Badge
                className={cn(
                  "text-xs px-1.5 py-0 h-5",
                  PRIORITY_COLORS[task.priority]
                )}
              >
                {task.priority}
              </Badge>
            )}
            {currentColumn !== "done" && (
              <button
                onClick={() =>
                  onStatusChange(
                    task.id,
                    currentColumn === "todo" ? "in_progress" : "done"
                  )
                }
                className="text-xs text-muted-foreground hover:text-primary ml-auto"
                data-testid={`advance-task-${task.id}`}
              >
                → {currentColumn === "todo" ? "Start" : "Done"}
              </button>
            )}
          </div>
        </div>
        <button
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive flex-shrink-0"
          data-testid={`delete-task-${task.id}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function TaskOverlay({ task }: { task: Task | null }) {
  if (!task) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl w-64 rotate-2 opacity-90">
      <div className="flex items-start gap-2">
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
        <p className="text-sm leading-snug flex-1">{task.title}</p>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const params = useParams<{ id: string }>();
  const workspaceId = parseInt(params.id);
  const [addingTo, setAddingTo] = useState<Status | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const workspace = useGetWorkspace(workspaceId);
  const tasks = useListTasks(workspaceId);
  const create = useCreateTask();
  const update = useUpdateTask();
  const remove = useDeleteTask();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  function onDragStart(event: DragStartEvent) {
    const id = event.active.id as number;
    const task = (tasks.data ?? []).find((t) => t.id === id) ?? null;
    setActiveTask(task as Task | null);
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as number;
    const overId = String(over.id);

    const validColumns: Status[] = ["todo", "in_progress", "done"];

    if (validColumns.includes(overId as Status)) {
      const currentStatus = active.data.current?.status as Status | undefined;
      if (currentStatus !== overId) {
        handleStatusChange(taskId, overId as Status);
      }
      return;
    }

    const overTask = (tasks.data ?? []).find((t) => t.id === Number(overId));
    if (overTask) {
      const currentStatus = active.data.current?.status as Status | undefined;
      if (overTask.status !== currentStatus) {
        handleStatusChange(taskId, overTask.status as Status);
      }
    }
  }

  const tasksByStatus = (status: Status): Task[] =>
    ((tasks.data ?? []) as Task[]).filter((t) => t.status === status);

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
          {Array(3)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-xl" />
            ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1 min-h-0">
            {COLUMNS.map((col) => {
              const colTasks = tasksByStatus(col.id);
              return (
                <div
                  key={col.id}
                  className={cn("rounded-xl p-3 flex flex-col gap-2", col.color)}
                  data-testid={`kanban-column-${col.id}`}
                >
                  <div className="flex items-center justify-between px-1">
                    <span className="text-sm font-semibold">{col.label}</span>
                    <Badge variant="secondary" className="text-xs">
                      {colTasks.length}
                    </Badge>
                  </div>

                  <SortableContext
                    items={colTasks.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <DroppableColumn id={col.id}>
                      {colTasks.map((task) => (
                        <SortableTaskCard
                          key={task.id}
                          task={task}
                          onStatusChange={handleStatusChange}
                          onDelete={handleDelete}
                          currentColumn={col.id}
                        />
                      ))}
                    </DroppableColumn>
                  </SortableContext>

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
                          if (e.key === "Escape") {
                            setAddingTo(null);
                            setNewTitle("");
                          }
                        }}
                      />
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          className="flex-1 h-7 text-xs"
                          onClick={() => handleCreate(col.id)}
                        >
                          Add
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex-1 h-7 text-xs"
                          onClick={() => {
                            setAddingTo(null);
                            setNewTitle("");
                          }}
                        >
                          Cancel
                        </Button>
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
              );
            })}
          </div>
          <DragOverlay>
            <TaskOverlay task={activeTask} />
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
