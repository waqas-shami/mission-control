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
  Tooltip,
  Avatar,
  Divider
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
  IconRecycle,
  IconUser,
  IconUsers
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

// Entity type for assignees
interface Entity {
  id: string;
  name: string;
  type: 'human' | 'agent' | 'system';
  metadata: Record<string, unknown>;
}

// Get initials from name
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Get avatar color based on entity type
function getAvatarColor(type: string): string {
  switch (type) {
    case 'human':
      return 'blue';
    case 'agent':
      return 'violet';
    default:
      return 'gray';
  }
}

// Assignee Badge Component
function AssigneeBadge({ entity }: { entity?: Entity }) {
  if (!entity) return null;

  return (
    <Tooltip label={entity.type === 'agent' ? 'AI Assistant' : 'Human'}>
      <Avatar
        size="sm"
        radius="xl"
        color={getAvatarColor(entity.type)}
        style={{ cursor: 'default' }}
      >
        {getInitials(entity.name)}
      </Avatar>
    </Tooltip>
  );
}

// Draggable Task Card
function DraggableTask({ task, onEdit, onDelete, entities }: { task: Task; onEdit: (t: Task) => void; onDelete: (id: string) => void; entities: Entity[] }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style = {
    transform: undefined, // Prevent original item from moving
    opacity: isDragging ? 0 : 1, // Hide original item completely while dragging
    cursor: 'grab',
  };

  return (
    <Paper
      ref={setNodeRef}
      style={{ ...style, boxShadow: 'none !important', cursor: 'pointer' }}
      {...listeners}
      {...attributes}
      p="sm"
      radius="md"
      withBorder
      mb="xs"
      shadow="none"
      className="kanban-card"
      onClick={() => onEdit(task)}
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
            <ActionIcon
              variant="subtle"
              size="sm"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()} // Prevent opening the detailed view
            >
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

      {
        task.description && (
          <Text size="xs" c="dimmed" mb="xs" lineClamp={2}>
            {task.description}
          </Text>
        )
      }

      {
        task.due_date && (
          <Group gap={4} mt="xs">
            <IconClock size={12} color="var(--mantine-color-dimmed)" />
            <Text size="xs" c="dimmed">
              {new Date(task.due_date).toLocaleDateString()}
            </Text>
          </Group>
        )
      }
    </Paper >
  );
}

// Droppable Column
function KanbanColumn({
  column,
  tasks,
  onAdd,
  onEdit,
  onDelete,
  entities
}: {
  column: { id: TaskColumn; title: string; color: string };
  tasks: Task[];
  onAdd: (columnId: TaskColumn) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  entities: Entity[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        flex: '1 1 0',
        minHeight: 400,
        backgroundColor: isOver
          ? 'var(--mantine-color-blue-light)'
          : 'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))',
        border: isOver
          ? '2px dashed var(--mantine-color-blue-filled)'
          : '1px solid transparent', // Keep transparent border to prevent layout jump
        borderRadius: 'var(--mantine-radius-md)',
        padding: '8px',
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
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
          entities={entities}
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
  const [entities, setEntities] = useState<Entity[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    column_id: 'backlog' as TaskColumn,
    priority: 'medium',
    due_date: '',
    tags: '',
    assignee_id: '',
    is_recurring: false,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Fetch entities for assignees
  const fetchEntities = useCallback(async () => {
    try {
      const res = await fetch('/api/entities');
      if (!res.ok) throw new Error('Failed to fetch entities');
      const data = await res.json();
      setEntities(data);
    } catch (error) {
      console.error('Failed to fetch entities:', error);
    }
  }, []);

  // Fetch tasks with optional assignee filter
  const fetchTasks = useCallback(async () => {
    try {
      let url = '/api/tasks';
      if (assigneeFilter !== 'all') {
        url += `?assignee_id=${assigneeFilter}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const data = await res.json();
      setTasks(data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  }, [assigneeFilter]);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

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
      assignee_id: '',
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
      assignee_id: task.assignee_id || '',
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
      assignee_id: formData.assignee_id || null,
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
      {/* Assignee Filter */}
      <Paper mb="md" p="md" radius="md" withBorder style={{ backgroundColor: 'var(--mantine-color-body)' }}>
        <Group justify="space-between">
          <Group gap="xs">
            <IconUsers size={18} style={{ color: 'var(--mantine-color-dimmed)' }} />
            <Text size="sm" fw={500} c="dimmed">Filter by Assignee:</Text>
            <Select
              size="xs"
              w={180}
              data={[
                { value: 'all', label: 'All Tasks' },
                { value: 'unassigned', label: 'Unassigned' },
                ...entities.map((e) => ({
                  value: e.id,
                  label: e.type === 'agent' ? `🤖 ${e.name}` : `👤 ${e.name}`
                }))
              ]}
              value={assigneeFilter}
              onChange={(value) => {
                setAssigneeFilter(value || 'all');
              }}
              placeholder="Select assignee"
            />
            {assigneeFilter !== 'all' && (
              <Button
                size="xs"
                variant="subtle"
                onClick={() => setAssigneeFilter('all')}
              >
                Clear Filter
              </Button>
            )}
          </Group>
          <Text size="xs" c="dimmed">
            Showing {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          </Text>
        </Group>
      </Paper>

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
              entities={entities}
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
                // Remove fixed positioning hacks that break dnd-kit
                width: 280, // Match column width roughly or use fixed width
                cursor: 'grabbing',
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
        size="lg"
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
            <Select
              label="Assignee"
              placeholder="Select assignee"
              data={[
                { value: '', label: 'Unassigned' },
                ...entities.map((e) => ({
                  value: e.id,
                  label: e.type === 'agent' ? `🤖 ${e.name}` : `👤 ${e.name}`
                }))
              ]}
              value={formData.assignee_id}
              onChange={(value) => setFormData({ ...formData, assignee_id: value || '' })}
              clearable
            />
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
