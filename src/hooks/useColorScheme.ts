'use client';

import { useState, useEffect, useCallback } from 'react';

export function useColorScheme() {
  const [colorScheme, setColorScheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check localStorage or system preference
    const stored = localStorage.getItem('color-scheme');
    if (stored === 'dark' || stored === 'light') {
      setColorScheme(stored);
      document.documentElement.setAttribute('data-mantine-color-scheme', stored);
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      setColorScheme('light');
      document.documentElement.setAttribute('data-mantine-color-scheme', 'light');
    }
  }, []);

  const toggleColorScheme = useCallback(() => {
    const newScheme = colorScheme === 'dark' ? 'light' : 'dark';
    setColorScheme(newScheme);
    localStorage.setItem('color-scheme', newScheme);
    document.documentElement.setAttribute('data-mantine-color-scheme', newScheme);
  }, [colorScheme]);

  return {
    colorScheme: mounted ? colorScheme : 'dark',
    toggleColorScheme,
    mounted,
  };
}
