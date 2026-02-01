'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Paper, 
  Text, 
  Badge, 
  Group, 
  Button, 
  Modal, 
  TextInput, 
  Select, 
  Textarea,
  Stack,
  ActionIcon,
  Menu,
  Tooltip
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  IconPlus, 
  IconDots, 
  IconEdit, 
  IconTrash,
  IconClock,
  IconUser,
  IconRecycle
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import type { Task, TaskColumn } from '@/types';

const COLUMNS: { id: TaskColumn; title: string; color: string }[] = [
  { id: 'recurring', title: 'Recurring', color: 'orange' },
  { id: 'backlog', title: 'Backlog', color: 'gray' },
  { id: 'in_progress', title: 'In Progress', color: 'blue' },
  { id: 'review', title: 'Review', color: 'violet' },
  { id: 'completed', title: 'Activity Completed', color: 'green' },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: 'gray',
  medium: 'blue',
  high: 'orange',
  critical: 'red',
};

interface KanbanCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

function KanbanCard({ task, onEdit, onDelete }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatDate = (date?: string) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      p="sm"
      radius="md"
      withBorder
      mb="xs"
      shadow="xs"
      className="kanban-card"
    >
      <Group justify="space-between" mb="xs">
        <Group gap="xs">
          {task.is_recurring && (
            <Tooltip label="Recurring Task">
              <IconRecycle size={14} color="var(--mantine-color-orange-6)" />
            </Tooltip>
          )}
          <Badge size="xs" color={PRIORITY_COLORS[task.priority]} variant="light">
            {task.priority}
          </Badge>
          {task.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} size="xs" variant="outline" color="dimmed">
              {tag}
            </Badge>
          ))}
        </Group>
        <Menu position="bottom-end" shadow="md">
          <Menu.Target>
            <ActionIcon variant="subtle" size="sm" onPointerDown={(e) => e.stopPropagation()}>
              <IconDots size={14} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown onPointerDown={(e) => e.stopPropagation()}>
            <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => onEdit(task)}>
              Edit
            </Menu.Item>
            <Menu.Item 
              leftSection={<IconTrash size={14} />} 
              color="red"
              onClick={() => onDelete(task.id)}
            >
              Delete
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
      
      <Text size="sm" fw={500} mb="xs" lineClamp={2}>
        {task.title}
      </Text>
      
      {task.description && (
        <Text size="xs" c="dimmed" mb="xs" lineClamp={2}>
          {task.description}
        </Text>
      )}
      
      <Group justify="space-between" mt="xs">
        {task.due_date && (
          <Group gap={4}>
            <IconClock size={12} color="var(--mantine-color-dimmed)" />
            <Text size="xs" c="dimmed">
              {formatDate(task.due_date)}
            </Text>
          </Group>
        )}
        {task.assignee_id && (
          <Tooltip label="Assigned">
            <Group gap={4}>
              <IconUser size={12} color="var(--mantine-color-dimmed)" />
            </Group>
          </Tooltip>
        )}
      </Group>
    </Paper>
  );
}

interface KanbanColumnProps {
  column: { id: TaskColumn; title: string; color: string };
  tasks: Task[];
  onAdd: (columnId: TaskColumn) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

function KanbanColumn({ column, tasks, onAdd, onEdit, onDelete }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <Paper
      ref={setNodeRef}
      p="sm"
      radius="md"
      style={{ 
        minHeight: 400,
        backgroundColor: isOver ? 'var(--mantine-color-dark-6)' : undefined,
        border: isOver ? '2px dashed var(--mantine-color-blue-5)' : undefined,
      }}
    >
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <Text fw={600}>{column.title}</Text>
          <Badge size="sm" variant="light" color={column.color}>
            {tasks.length}
          </Badge>
        </Group>
        <ActionIcon 
          variant="subtle" 
          size="sm"
          onClick={() => onAdd(column.id)}
        >
          <IconPlus size={16} />
        </ActionIcon>
      </Group>
      
      <SortableContext 
        items={tasks.map(t => t.id)} 
        strategy={verticalListSortingStrategy}
      >
        {tasks.map((task) => (
          <KanbanCard 
            key={task.id} 
            task={task} 
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </SortableContext>
      
      {tasks.length === 0 && (
        <Text size="xs" c="dimmed" ta="center" py="xl">
          No tasks
        </Text>
      )}
    </Paper>
  );
}

export function KanbanBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    column_id: 'backlog' as TaskColumn,
    priority: 'medium',
    due_date: '',
    tags: '',
    is_recurring: false,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const data = await res.json();
      setTasks(data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load tasks',
        color: 'red',
      });
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find((t) => t.id === activeId);
    const overTask = tasks.find((t) => t.id === overId);

    if (!activeTask) return;

    // If dragging over a column
    if (COLUMNS.some((col) => col.id === overId)) {
      const overColumn = COLUMNS.find((col) => col.id === overId)!.id;
      if (activeTask.column_id !== overColumn) {
        setTasks((prev) => {
          return prev.map((t) =>
            t.id === activeId ? { ...t, column_id: overColumn } : t
          );
        });
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    // If dropped on a column, update the task
    if (COLUMNS.some((col) => col.id === overId)) {
      const overColumn = COLUMNS.find((col) => col.id === overId)!.id;
      if (activeTask.column_id !== overColumn) {
        // Optimistic update
        setTasks((prev) =>
          prev.map((t) => (t.id === activeId ? { ...t, column_id: overColumn } : t))
        );

        // API call
        try {
          await fetch('/api/tasks', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: activeId, column_id: overColumn }),
          });
          notifications.show({
            title: 'Task moved',
            message: `"${activeTask.title}" moved to ${COLUMNS.find(c => c.id === overColumn)?.title}`,
            color: 'green',
          });
        } catch (error) {
          console.error('Failed to update task:', error);
          fetchTasks(); // Revert on error
        }
      }
    }
  };

  const handleAdd = (columnId: TaskColumn) => {
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      column_id: columnId,
      priority: 'medium',
      due_date: '',
      tags: '',
      is_recurring: false,
    });
    openModal();
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      column_id: task.column_id,
      priority: task.priority,
      due_date: task.due_date?.split('T')[0] || '',
      tags: task.tags.join(', '),
      is_recurring: task.is_recurring,
    });
    openModal();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this task?')) return;
    
    try {
      await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' });
      setTasks((prev) => prev.filter((t) => t.id !== id));
      notifications.show({
        title: 'Task deleted',
        color: 'red',
      });
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const taskData = {
      ...formData,
      tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
    };

    try {
      if (editingTask) {
        const res = await fetch('/api/tasks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingTask.id, ...taskData }),
        });
        if (!res.ok) throw new Error('Failed to update');
        const updated = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? updated : t)));
        notifications.show({ title: 'Task updated', color: 'green' });
      } else {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData),
        });
        if (!res.ok) throw new Error('Failed to create');
        const created = await res.json();
        setTasks((prev) => [...prev, created]);
        notifications.show({ title: 'Task created', color: 'green' });
      }
      closeModal();
    } catch (error) {
      console.error('Failed to save task:', error);
      notifications.show({ title: 'Error', message: 'Failed to save task', color: 'red' });
    }
  };

  const getTasksByColumn = (columnId: TaskColumn) => 
    tasks.filter((t) => t.column_id === columnId);

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(220px, 1fr))`, 
          gap: '12px',
          overflowX: 'auto',
          paddingBottom: '16px',
        }}>
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={getTasksByColumn(column.id)}
              onAdd={handleAdd}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <Paper p="sm" radius="md" withBorder shadow="lg" className="kanban-card">
              <Text size="sm" fw={500}>{activeTask.title}</Text>
            </Paper>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Modal 
        opened={modalOpened} 
        onClose={closeModal} 
        title={editingTask ? 'Edit Task' : 'New Task'}
        size="md"
      >
        <form onSubmit={handleSubmit}>
          <Stack>
            <TextInput
              label="Title"
              placeholder="Task title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
            <Textarea
              label="Description"
              placeholder="Task description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
            <Group grow>
              <Select
                label="Column"
                data={COLUMNS.map((c) => ({ value: c.id, label: c.title }))}
                value={formData.column_id}
                onChange={(value) => setFormData({ ...formData, column_id: value as TaskColumn })}
              />
              <Select
                label="Priority"
                data={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                  { value: 'critical', label: 'Critical' },
                ]}
                value={formData.priority}
                onChange={(value) => setFormData({ ...formData, priority: value || 'medium' })}
              />
            </Group>
            <TextInput
              label="Due Date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
            <TextInput
              label="Tags (comma separated)"
              placeholder="bug, feature, urgent"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={closeModal}>Cancel</Button>
              <Button type="submit">{editingTask ? 'Update' : 'Create'}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
