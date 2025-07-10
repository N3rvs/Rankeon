// src/components/teams/TeamTasksDialog.tsx
'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/contexts/i18n-context';
import { addTask, updateTaskStatus, deleteTask } from '@/lib/actions/teams';
import { onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Plus, Trash2 } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { cn } from '@/lib/utils';
import { Spinner } from '../ui/spinner';

const taskSchema = z.object({
  title: z.string().min(1, 'Task cannot be empty.').max(100),
});

interface TeamTasksDialogProps {
  teamId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: any;
}

export function TeamTasksDialog({ teamId, open, onOpenChange }: TeamTasksDialogProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const endOfListRef = useRef<HTMLDivElement>(null);

  const form = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: '' },
  });

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const tasksRef = collection(db, `teams/${teamId}/tasks`);
    const q = query(tasksRef, orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      setTasks(fetchedTasks);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching tasks:", error);
      toast({ title: 'Error', description: 'Could not load team tasks.', variant: 'destructive' });
      setLoading(false);
    });
    return () => unsubscribe();
  }, [teamId, open, toast]);

  useEffect(() => {
    endOfListRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tasks]);

  const onSubmit = (values: { title: string }) => {
    startTransition(async () => {
      const result = await addTask(teamId, values.title);
      if (result.success) {
        form.reset();
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    });
  };

  const handleToggleTask = (taskId: string, completed: boolean) => {
    startTransition(async () => {
      const result = await updateTaskStatus(teamId, taskId, completed);
      if (!result.success) {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    });
  };

  const handleDeleteTask = (taskId: string) => {
    startTransition(async () => {
      const result = await deleteTask(teamId, taskId);
      if (!result.success) {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('TeamsPage.team_tasks')}</DialogTitle>
          <DialogDescription>{t('TeamsPage.team_tasks_desc')}</DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <div className="h-64 overflow-y-auto pr-4 space-y-2">
            {loading ? (
                <div className="h-full flex items-center justify-center">
                    <Spinner />
                </div>
            ) : tasks.length > 0 ? (
              tasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 group">
                  <Checkbox
                    id={task.id}
                    checked={task.completed}
                    onCheckedChange={(checked) => handleToggleTask(task.id, !!checked)}
                  />
                  <label htmlFor={task.id} className={cn("flex-1 text-sm", task.completed && "line-through text-muted-foreground")}>
                    {task.title}
                  </label>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteTask(task.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))
            ) : (
                <div className="text-center text-muted-foreground pt-10">
                    <p>No tasks yet. Add one below!</p>
                </div>
            )}
             <div ref={endOfListRef} />
          </div>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-center gap-2 pt-4 border-t">
            <Input {...form.register('title')} placeholder="New task..." disabled={isPending} />
            <Button type="submit" size="icon" disabled={isPending}>
              <Plus className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
