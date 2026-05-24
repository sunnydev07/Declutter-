import { useState, useEffect } from 'react';
import { db } from '../utils/db';
import { UserSettings } from '../types/session';

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
    document.documentElement.style.setProperty('--accent-primary', settings.accentColor);
  }, [settings.accentColor]);

  return {
    settings,
    updateSettings,
  };
};
