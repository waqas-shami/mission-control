'use client';

import { useEffect, useState } from 'react';
import { Paper, Group, Text, Stack, Badge, Progress } from '@mantine/core';
import { 
  IconTrendingUp, 
  IconActivity, 
  IconBox, 
  IconCheck,
  IconRefresh
} from '@tabler/icons-react';
import type { KanbanMetrics } from '@/types';

interface MetricsHeaderProps {
  onRefresh?: () => void;
}

export function MetricsHeader({ onRefresh }: MetricsHeaderProps) {
  const [metrics, setMetrics] = useState<KanbanMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/metrics');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setMetrics(data);
      setError(null);
    } catch (err) {
      setError('Failed to load metrics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // Remove auto-refresh to prevent page wobble
    // If you want refresh, add a manual refresh button or use a different approach
  }, []);

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color,
    subtitle 
  }: { 
    title: string; 
    value: string | number; 
    icon: any; 
    color: string;
    subtitle?: string;
  }) => (
    <Paper p="md" radius="md" withBorder h="100%">
      <Group justify="space-between">
        <Stack gap={4}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
            {title}
          </Text>
          {loading ? (
            <Text size="xl" fw={700}>-</Text>
          ) : (
            <Text size="xl" fw={700} style={{ fontSize: '1.5rem' }}>
              {value}
            </Text>
          )}
          {subtitle && !loading && (
            <Text size="xs" c="dimmed">
              {subtitle}
            </Text>
          )}
        </Stack>
        <Icon size={32} color={`var(--mantine-color-${color}-6)`} />
      </Group>
    </Paper>
  );

  return (
    <Paper p="md" radius="md" mb="md" withBorder style={{ borderLeft: '4px solid var(--mantine-color-blue-6)' }}>
      <Group justify="space-between" mb="md">
        <Text size="lg" fw={700}>Mission Control Dashboard</Text>
        <Group gap="xs">
          <Badge size="lg" variant="light" color="green">
            Live
          </Badge>
          <IconRefresh 
            size={20} 
            style={{ cursor: 'pointer' }} 
            onClick={() => { fetchMetrics(); onRefresh?.(); }}
          />
        </Group>
      </Group>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
        <StatCard
          title="Weekly Velocity"
          value={metrics?.weeklyVelocity || 0}
          icon={IconTrendingUp}
          color="green"
          subtitle="Tasks completed (7d)"
        />
        <StatCard
          title="Active Load"
          value={metrics?.activeLoad || 0}
          icon={IconActivity}
          color="blue"
          subtitle="In Progress + Review"
        />
        <StatCard
          title="Total Inventory"
          value={metrics?.totalInventory || 0}
          icon={IconBox}
          color="grape"
          subtitle="All tasks"
        />
        <StatCard
          title="Completion Rate"
          value={`${metrics?.completionRate || 0}%`}
          icon={IconCheck}
          color="teal"
          subtitle={`${metrics?.columnCounts?.completed || 0} completed`}
        />
      </div>

      {metrics && metrics.totalInventory > 0 && (
        <Paper mt="md" p="sm" radius="md" bg="dark.6">
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Pipeline Distribution</Text>
            <Text size="xs" c="dimmed">{metrics.totalInventory} total tasks</Text>
          </Group>
          <Progress.Root size="xl" radius="xl">
            <Progress.Section value={metrics.columnCounts.recurring || 0} color="orange">
              <Progress.Label>{metrics.columnCounts.recurring || 0}</Progress.Label>
            </Progress.Section>
            <Progress.Section value={metrics.columnCounts.backlog || 0} color="gray">
              <Progress.Label>{metrics.columnCounts.backlog || 0}</Progress.Label>
            </Progress.Section>
            <Progress.Section value={metrics.columnCounts.in_progress || 0} color="blue">
              <Progress.Label>{metrics.columnCounts.in_progress || 0}</Progress.Label>
            </Progress.Section>
            <Progress.Section value={metrics.columnCounts.review || 0} color="violet">
              <Progress.Label>{metrics.columnCounts.review || 0}</Progress.Label>
            </Progress.Section>
            <Progress.Section value={metrics.columnCounts.completed || 0} color="green">
              <Progress.Label>{metrics.columnCounts.completed || 0}</Progress.Label>
            </Progress.Section>
          </Progress.Root>
          <Group mt="xs" gap="xs">
            <Badge size="xs" variant="dot" color="orange">Recurring</Badge>
            <Badge size="xs" variant="dot" color="gray">Backlog</Badge>
            <Badge size="xs" variant="dot" color="blue">In Progress</Badge>
            <Badge size="xs" variant="dot" color="violet">Review</Badge>
            <Badge size="xs" variant="dot" color="green">Completed</Badge>
          </Group>
        </Paper>
      )}
    </Paper>
  );
}
