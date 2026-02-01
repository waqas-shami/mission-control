'use client';

import { useState } from 'react';
import { 
  AppShell, 
  Burger, 
  Group, 
  Text, 
  NavLink, 
  Stack, 
  Badge,
  ScrollArea,
  ThemeIcon,
  Divider,
  ActionIcon,
  Tooltip,
  Paper
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { 
  IconDashboard, 
  IconLayoutKanban, 
  IconBrain, 
  IconUsers, 
  IconFiles,
  IconList,
  IconSettings,
  IconTerminal2,
  IconMoon,
  IconSun,
  IconRefresh
} from '@tabler/icons-react';
import { MetricsHeader } from '@/components/MetricsHeader';
import { KanbanBoard } from '@/components/KanbanBoard';
import { MemoryPanel } from '@/components/MemoryPanel';
import { useColorScheme } from '@/hooks/useColorScheme';

type Tab = 'dashboard' | 'kanban' | 'memory' | 'entities' | 'artifacts' | 'instructions';

export default function Home() {
  const [opened, { toggle }] = useDisclosure();
  const [activeTab, setActiveTab] = useState<Tab>('kanban');
  const { colorScheme, toggleColorScheme, mounted } = useColorScheme();

  const navItems = [
    { icon: IconDashboard, label: 'Dashboard', value: 'dashboard' as Tab },
    { icon: IconLayoutKanban, label: 'Task Board', value: 'kanban' as Tab },
    { icon: IconBrain, label: 'Cognitive Memory', value: 'memory' as Tab },
    { icon: IconUsers, label: 'Entities', value: 'entities' as Tab },
    { icon: IconFiles, label: 'Artifacts', value: 'artifacts' as Tab },
    { icon: IconList, label: 'Instructions', value: 'instructions' as Tab },
  ];

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 250, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Group gap="xs">
              <IconTerminal2 size={24} color="var(--mantine-color-blue-5)" />
              <Text size="lg" fw={700}>Mission Control</Text>
            </Group>
            <Badge size="sm" variant="light" color="green">SSOT</Badge>
          </Group>
          
          <Group gap="xs">
            <Tooltip label="Refresh">
              <ActionIcon variant="subtle" onClick={handleRefresh}>
                <IconRefresh size={20} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={mounted && colorScheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              <ActionIcon 
                variant="subtle"
                onClick={toggleColorScheme}
                aria-label="Toggle color scheme"
              >
                {mounted && colorScheme === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <AppShell.Section grow component={ScrollArea}>
          <Stack gap="xs">
            {navItems.map((item) => (
              <NavLink
                key={item.value}
                active={activeTab === item.value}
                label={item.label}
                leftSection={
                  <ThemeIcon variant="light" size="sm" color={activeTab === item.value ? 'blue' : 'gray'}>
                    <item.icon size={16} />
                  </ThemeIcon>
                }
                onClick={() => setActiveTab(item.value)}
                style={{ borderRadius: '8px' }}
              />
            ))}
          </Stack>
        </AppShell.Section>

        <AppShell.Section>
          <Divider my="sm" />
          <NavLink
            label="Settings"
            leftSection={
              <ThemeIcon variant="light" size="sm" color="gray">
                <IconSettings size={16} />
              </ThemeIcon>
            }
            style={{ borderRadius: '8px' }}
          />
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        {activeTab === 'dashboard' && (
          <Stack gap="md">
            <MetricsHeader onRefresh={handleRefresh} />
            <Paper p="md" radius="md" withBorder>
              <Text fw={600} mb="md">System Overview</Text>
              <Text size="sm" c="dimmed">
                Welcome to Mission Control. Select a view from the sidebar.
              </Text>
            </Paper>
          </Stack>
        )}

        {activeTab === 'kanban' && (
          <Stack gap="md">
            <MetricsHeader onRefresh={handleRefresh} />
            <Paper p="md" radius="md" withBorder>
              <Group justify="space-between" mb="md">
                <Text fw={600}>Task Management Engine</Text>
                <Badge variant="light">Real-time</Badge>
              </Group>
              <KanbanBoard />
            </Paper>
          </Stack>
        )}

        {activeTab === 'memory' && (
          <Stack gap="md">
            <MetricsHeader onRefresh={handleRefresh} />
            <MemoryPanel />
          </Stack>
        )}

        {activeTab === 'entities' && (
          <Stack gap="md">
            <MetricsHeader onRefresh={handleRefresh} />
            <Paper p="md" radius="md" withBorder>
              <Text fw={600} mb="md">Entity Tracking</Text>
              <Text size="sm" c="dimmed">
                Human users and autonomous agents active within the ecosystem.
              </Text>
            </Paper>
          </Stack>
        )}

        {activeTab === 'artifacts' && (
          <Stack gap="md">
            <MetricsHeader onRefresh={handleRefresh} />
            <Paper p="md" radius="md" withBorder>
              <Text fw={600} mb="md">Artifact Repository</Text>
              <Text size="sm" c="dimmed">
                Centralized access to all documents and generated assets.
              </Text>
            </Paper>
          </Stack>
        )}

        {activeTab === 'instructions' && (
          <Stack gap="md">
            <MetricsHeader onRefresh={handleRefresh} />
            <Paper p="md" radius="md" withBorder>
              <Text fw={600} mb="md">Instruction Ledger</Text>
              <Text size="sm" c="dimmed">
                User-provided inputs, global instructions, and datasets.
              </Text>
            </Paper>
          </Stack>
        )}
      </AppShell.Main>
    </AppShell>
  );
}
