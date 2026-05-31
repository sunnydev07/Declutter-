import { useState, useEffect } from 'react';
import { db } from '../utils/db';
import { UserSettings } from '../types/session';

const hexToRgb = (hex: string): string => {
  const normalized = hex.replace('#', '');

  if (normalized.length !== 6) {
    return '52, 211, 153';
  }

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);

  if ([r, g, b].some((value) => Number.isNaN(value))) {
    return '52, 211, 153';
  }

  return `${r}, ${g}, ${b}`;
};

export const useSettings = () => {
  const [settings, setSettings] = useState<UserSettings>(db.getSettings());

  const updateSettings = (updates: Partial<UserSettings>) => {
    const updated = { ...settings, ...updates };
    setSettings(updated);
    db.saveSettings(updated);
  };

  // Sync theme changes with body element for global styling
  useEffect(() => {
    const applyTheme = () => {
      const isDark =
        settings.theme === 'dark' ||
        (settings.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      
      document.body.classList.toggle('light-theme', !isDark);
    };

    applyTheme();
    
    if (settings.theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [settings.theme]);

  // Sync custom accent color if changed
  useEffect(() => {
    const accentRgb = hexToRgb(settings.accentColor);
    document.documentElement.style.setProperty('--accent-primary', settings.accentColor);
    document.documentElement.style.setProperty('--accent-primary-rgb', accentRgb);
    document.documentElement.style.setProperty('--accent-primary-dark-rgb', accentRgb);
  }, [settings.accentColor]);

  return {
    settings,
    updateSettings,
  };
};
