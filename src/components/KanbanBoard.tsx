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
  useDraggable,
  useDroppable
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { 
  IconPlus, 
  IconDots, 
  IconEdit, 
  IconTrash,
  IconClock,
  IconRecycle
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import type { Task, TaskColumn } from '@/types';
import { io } from 'socket.io-client';

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

// Draggable Task Card
function DraggableTask({ task, onEdit, onDelete }: { task: Task; onEdit: (t: Task) => void; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.9 : 1,
    cursor: 'grab',
  };

  return (
    <Paper
      ref={setNodeRef}
      style={{ ...style, boxShadow: 'none !important' }}
      {...listeners}
      {...attributes}
      p="sm"
      radius="md"
      withBorder
      mb="xs"
      shadow="none"
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
      
      {task.due_date && (
        <Group gap={4} mt="xs">
          <IconClock size={12} color="var(--mantine-color-dimmed)" />
          <Text size="xs" c="dimmed">
            {new Date(task.due_date).toLocaleDateString()}
          </Text>
        </Group>
      )}
    </Paper>
  );
}

// Droppable Column
function KanbanColumn({ 
  column, 
  tasks, 
  onAdd, 
  onEdit, 
  onDelete 
}: { 
  column: { id: TaskColumn; title: string; color: string }; 
  tasks: Task[];
  onAdd: (columnId: TaskColumn) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        flex: '1 1 0',
        minHeight: 400,
        backgroundColor: isOver ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
        border: isOver ? '1px solid var(--mantine-color-blue-5)' : '1px solid var(--mantine-color-dark-3)',
        borderRadius: 'var(--mantine-radius-md)',
        padding: '8px',
        transition: 'background-color 0.15s ease, border-color 0.15s ease',
      }}
    >
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <Text fw={600} style={{ color: 'var(--mantine-color-text)' }}>{column.title}</Text>
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
      
      {tasks.map((task) => (
        <DraggableTask 
          key={task.id} 
          task={task} 
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
      
      {tasks.length === 0 && (
        <Text size="xs" c="dimmed" ta="center" py="xl" style={{ opacity: 0.5 }}>
          Drop tasks here
        </Text>
      )}
    </div>
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
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
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
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // WebSocket connection
  useEffect(() => {
    const wsUrl = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_WS_URL || 'http://10.10.20.75:3004') : '';
    const ws = io(wsUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    ws.on('connect', () => {
      console.log('WebSocket connected');
    });

    ws.on('task:created', (task: Task) => {
      setTasks(prev => {
        if (prev.find(t => t.id === task.id)) return prev;
        return [...prev, task];
      });
    });

    ws.on('task:updated', (task: Task) => {
      setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    });

    ws.on('task:deleted', ({ id }: { id: string }) => {
      setTasks(prev => prev.filter(t => t.id !== id));
    });

    ws.on('task:moved', (data: { id: string; column_id: TaskColumn }) => {
      setTasks(prev => prev.map(t => 
        t.id === data.id ? { ...t, column_id: data.column_id } : t
      ));
    });

    return () => {
      ws.disconnect();
    };
  }, []);

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
    if (!activeTask) return;

    // If dragging over a column, update locally
    if (COLUMNS.some((col) => col.id === overId)) {
      const overColumn = COLUMNS.find((col) => col.id === overId)!.id;
      if (activeTask.column_id !== overColumn) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === activeId ? { ...t, column_id: overColumn } : t
          )
        );
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) {
      fetchTasks();
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    const targetColumn = COLUMNS.find((col) => col.id === overId);
    if (targetColumn) {
      const newColumn = targetColumn.id;
      if (activeTask.column_id !== newColumn) {
        try {
          const res = await fetch('/api/tasks', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: activeId, column_id: newColumn }),
          });
          
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Failed to update');
          }
          
          notifications.show({
            title: 'Task moved',
            message: `"${activeTask.title}" moved to ${targetColumn.title}`,
            color: 'green',
          });
        } catch (error) {
          console.error('Failed to move task:', error);
          fetchTasks();
          notifications.show({
            title: 'Error',
            message: error instanceof Error ? error.message : 'Failed to move task',
            color: 'red',
          });
        }
      }
    } else {
      fetchTasks();
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
        message: 'Task has been removed',
        color: 'red',
      });
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const taskData = {
      title: formData.title,
      description: formData.description,
      column_id: formData.column_id,
      priority: formData.priority,
      due_date: formData.due_date || null,
      tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
      is_recurring: formData.is_recurring,
    };

    try {
      if (editingTask) {
        const res = await fetch('/api/tasks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingTask.id, ...taskData }),
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to update');
        }
        
        const updated = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? updated : t)));
        notifications.show({ title: 'Task updated', message: 'Changes saved successfully', color: 'green' });
      } else {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData),
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to create');
        }
        
        const created = await res.json();
        setTasks((prev) => [...prev, created]);
        notifications.show({ title: 'Task created', message: 'New task added to the board', color: 'green' });
      }
      closeModal();
    } catch (error) {
      console.error('Failed to save task:', error);
      notifications.show({ 
        title: 'Error', 
        message: error instanceof Error ? error.message : 'Failed to save task', 
        color: 'red' 
      });
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
          display: 'flex', 
          gap: '8px',
          paddingBottom: '16px',
          width: '100%',
          maxWidth: '100%',
          overflowX: 'hidden',
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
            <Paper 
              p="sm" 
              radius="md" 
              withBorder
              shadow="none"
              style={{
                backgroundColor: 'var(--mantine-color-body)',
                opacity: 0.95,
                boxShadow: 'none !important',
                filter: 'none !important',
                WebkitBoxShadow: 'none !important',
                MozBoxShadow: 'none !important',
                transform: 'translate(-50%, -50%)',
                position: 'fixed',
                left: '50%',
                top: '50%',
                width: 200,
                pointerEvents: 'none',
                zIndex: 9999,
              }}
            >
              <Badge size="xs" color={PRIORITY_COLORS[activeTask.priority]} variant="light" mb="xs">
                {activeTask.priority}
              </Badge>
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
                label="Status"
                data={COLUMNS.map((c) => ({ value: c.id, label: c.title }))}
                value={formData.column_id}
                onChange={(value) => setFormData({ ...formData, column_id: (value || 'backlog') as TaskColumn })}
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
