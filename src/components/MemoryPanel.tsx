'use client';

import { useState, useEffect, useCallback } from 'react';
import { Paper, Group, Text, Stack, Badge, Button, Collapse, Code, Loader } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { 
  IconBrain, 
  IconChevronDown, 
  IconChevronRight, 
  IconRefresh,
  IconFileText,
  IconUsers,
  IconActivity
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface MemorySnippet {
  path: string;
  lines: string;
  content?: string;
}

interface MemorySearchResult {
  query: string;
  results: MemorySnippet[];
}

interface MemoryPanelProps {
  maxResults?: number;
}

export function MemoryPanel({ maxResults = 5 }: MemoryPanelProps) {
  const [searchResults, setSearchResults] = useState<MemorySearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [opened, { toggle }] = useDisclosure(true);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Search memory via our internal API (which uses memory_search tool)
  const searchMemory = useCallback(async (query: string) => {
    try {
      const res = await fetch('/api/memory/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, maxResults }),
      });
      if (!res.ok) throw new Error('Search failed');
      return await res.json();
    } catch (error) {
      console.error('Memory search error:', error);
      return null;
    }
  }, [maxResults]);

  // Load recent context on mount
  useEffect(() => {
    const loadInitialContext = async () => {
      setLoading(true);
      
      // Search for recent activities and context
      const queries = [
        'recent tasks and projects',
        'current operations',
        'system status',
      ];

      for (const query of queries) {
        const result = await searchMemory(query);
        if (result) {
          setSearchResults((prev) => [...prev, { query, results: result.results || [] }]);
        }
      }

      setLoading(false);
    };

    loadInitialContext();
  }, [searchMemory]);

  const handleRefresh = async () => {
    setLoading(true);
    setSearchResults([]);
    
    const queries = [
      'recent tasks and projects',
      'current operations',
      'system status',
    ];

    for (const query of queries) {
      const result = await searchMemory(query);
      if (result) {
        setSearchResults((prev) => [...prev, { query, results: result.results || [] }]);
      }
    }

    setLoading(false);
    notifications.show({ title: 'Refreshed', message: 'Memory context updated', color: 'green' });
  };

  return (
    <Paper p="md" radius="md" withBorder>
      <Group justify="space-between" mb="sm">
        <Group gap="xs">
          <IconBrain size={20} color="var(--mantine-color-violet-6)" />
          <Text fw={600}>Cognitive Memory</Text>
          <Badge size="sm" variant="light" color="violet">
            {searchResults.reduce((acc, r) => acc + (r.results?.length || 0), 0)} items
          </Badge>
        </Group>
        <Group gap="xs">
          <Button 
            variant="subtle" 
            size="xs" 
            leftSection={<IconRefresh size={14} />}
            onClick={handleRefresh}
            loading={loading}
          >
            Refresh
          </Button>
          <IconChevronDown 
            size={20} 
            style={{ cursor: 'pointer', transform: opened ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            onClick={toggle}
          />
        </Group>
      </Group>

      <Collapse in={opened}>
        {loading ? (
          <Group justify="center" py="md">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">Loading memory context...</Text>
          </Group>
        ) : searchResults.length > 0 ? (
          <Stack gap="sm">
            {searchResults.map((result, idx) => (
              <MemorySearchGroup key={idx} result={result} />
            ))}
          </Stack>
        ) : (
          <Text size="sm" c="dimmed" ta="center" py="md">
            No memory context available
          </Text>
        )}
      </Collapse>
    </Paper>
  );
}

function MemorySearchGroup({ result }: { result: MemorySearchResult }) {
  const [opened, { toggle }] = useDisclosure(false);

  return (
    <Paper p="sm" radius="md" bg="dark.6">
      <Group justify="space-between" mb={opened ? 'sm' : 0}>
        <Group gap="xs">
          <IconActivity size={14} color="var(--mantine-color-dimmed)" />
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
            {result.query}
          </Text>
          <Badge size="xs" variant="dot" color="gray">
            {result.results.length}
          </Badge>
        </Group>
        <IconChevronRight 
          size={14} 
          style={{ 
            cursor: 'pointer', 
            transform: opened ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.2s' 
          }}
          onClick={toggle}
        />
      </Group>

      <Collapse in={opened}>
        <Stack gap="xs">
          {result.results.map((snippet, idx) => (
            <Paper key={idx} p="xs" radius="sm" bg="dark.5">
              <Group gap="xs" mb={4}>
                <IconFileText size={12} color="var(--mantine-color-dimmed)" />
                <Text size="xs" style={{ fontFamily: 'monospace' }}>{snippet.path}</Text>
              </Group>
              <Text size="xs" c="dimmed" lineClamp={3}>
                {snippet.content || snippet.lines}
              </Text>
            </Paper>
          ))}
        </Stack>
      </Collapse>
    </Paper>
  );
}

// Memory Search Component
interface MemorySearchProps {
  onSearch?: (query: string) => void;
}

export function MemorySearch({ onSearch }: MemorySearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MemorySnippet[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/memory/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, maxResults: 10 }),
      });
      const data = await res.json();
      setResults(data.results || []);
      onSearch?.(query);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper p="sm" radius="md" withBorder>
      <Text size="sm" fw={600} mb="sm">Search Memory</Text>
      <Group>
        <input
          type="text"
          placeholder="Search conversations, tasks, notes..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid var(--mantine-color-dark-4)',
            background: 'var(--mantine-color-dark-7)',
            color: 'var(--mantine-color-text)',
          }}
        />
        <Button size="xs" onClick={handleSearch} loading={loading}>
          Search
        </Button>
      </Group>

      {results.length > 0 && (
        <Stack gap="xs" mt="sm">
          {results.slice(0, 5).map((result, idx) => (
            <Paper key={idx} p="xs" radius="sm" bg="dark.6">
              <Text size="xs" style={{ fontFamily: 'monospace' }}>{result.path}</Text>
              <Text size="xs" c="dimmed" mt={4}>{result.lines}</Text>
            </Paper>
          ))}
        </Stack>
      )}
    </Paper>
  );
}
