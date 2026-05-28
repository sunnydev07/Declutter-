import { useSettings } from '../../hooks/useSettings';
import { CoachAiMode, CoachPersona, LockMode } from '../../types/session';
import { invoke } from '@tauri-apps/api/core';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { resolveResource } from '@tauri-apps/api/path';
import './Settings.css';

const ACCENT_COLORS = [
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f59e0b', // Amber
];

const Settings = () => {
  const { settings, updateSettings } = useSettings();

  const handleEmergencyRepair = async () => {
    const confirmed = window.confirm(
      "Are you sure? This will forcefully rebuild your Windows registry policies to re-enable Task Manager. Only use if the app is broken."
    );
    if (!confirmed) return;

    try {
      await invoke('emergency_system_repair');
      alert("Emergency system repair executed successfully! Task Manager, CMD, and hosts file have been restored.");
    } catch (err: any) {
      alert(`System repair failed: ${err}`);
    }
  };

  const handleOpenFailsafeFolder = async () => {
    try {
      const resourcePath = await resolveResource('failsafe/EmergencyUnlock.bat');
      await revealItemInDir(resourcePath);
    } catch (err) {
      console.warn('Failed to resolve failsafe path or reveal it, trying direct reveal:', err);
      try {
        await revealItemInDir('public/failsafe/EmergencyUnlock.bat');
      } catch (innerErr) {
        alert('Failsafe script is located in your Declutter installation folder at "public/failsafe/EmergencyUnlock.bat"');
      }
    }
  };

  return (
    <div className="settings-container animate-fade-in-up">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Configure your distraction-free parameters and workspace.</p>
      </div>

      {/* Lock System Parameters */}
      <section className="settings-section">
        <h3>Lock Customization</h3>
        <div className="settings-grid">
          
          <div className="glass-card setting-card">
            <div className="setting-row">
              <div className="setting-label">
                <span className="setting-title">Default Lock Intensity</span>
                <span className="setting-desc">The default lock configuration for new timers.</span>
              </div>
              <select
                className="setting-select"
                value={settings.defaultLockMode}
                onChange={(e) => updateSettings({ defaultLockMode: e.target.value as LockMode })}
              >
                <option value="soft">Soft Lock (Warn Only)</option>
                <option value="app">App Lock (Block Apps)</option>
                <option value="view">View Lock (Reader Mode)</option>
                <option value="full">Full Lock (Kiosk System)</option>
              </select>
            </div>
          </div>

          <div className="glass-card setting-card">
            <div className="setting-row">
              <div className="setting-label">
                <span className="setting-title">Emergency Unlock Flow</span>
                <span className="setting-desc">How to break out of a locked session.</span>
              </div>
              <select
                className="setting-select"
                value={settings.emergencyUnlockMethod}
                onChange={(e) => updateSettings({ emergencyUnlockMethod: e.target.value as any })}
              >
                <option value="string">30-Char Random String</option>
                <option value="password">Admin Password Check</option>
                <option value="cooldown">5-Min Cooling Cooldown</option>
              </select>
            </div>
          </div>

          <div className="glass-card setting-card">
            <div className="setting-row">
              <div className="setting-label">
                <span className="setting-title">Emergency Penalty</span>
                <span className="setting-desc">What occurs when you force-exit your focus timer.</span>
              </div>
              <select
                className="setting-select"
                value={settings.emergencyUnlockPenalty}
                onChange={(e) => updateSettings({ emergencyUnlockPenalty: e.target.value as any })}
              >
                <option value="lose_plant">Wilt current plant</option>
                <option value="lose_streak">Reset focus streak</option>
                <option value="time_penalty">Apply focus debt timer</option>
              </select>
            </div>
          </div>

          <div className="glass-card setting-card">
            <div className="setting-row">
              <div className="setting-label">
                <span className="setting-title">Enable Pause Mode</span>
                <span className="setting-desc">Allow pausing during focus periods.</span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.allowPausing}
                  onChange={(e) => updateSettings({ allowPausing: e.target.checked })}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>

        </div>
      </section>

      {/* Coach Agent */}
      <section className="settings-section">
        <h3>Coach Agent</h3>
        <div className="settings-grid">
          
          <div className="glass-card setting-card coach-agent-card">
            <div className="setting-row">
              <div className="setting-label">
                <span className="setting-title">Default Coach Persona</span>
                <span className="setting-desc">Voice used before an emergency unlock is revealed.</span>
              </div>
              <select
                className="setting-select"
                value={settings.coachPersona}
                onChange={(e) => updateSettings({ coachPersona: e.target.value as CoachPersona })}
              >
                <option value="male">Ares</option>
                <option value="female">Athena</option>
              </select>
            </div>
          </div>

          <div className="glass-card setting-card coach-agent-card">
            <div className="setting-row">
              <div className="setting-label">
                <span className="setting-title">Gemini Personalization</span>
                <span className="setting-desc">Optional copy variation with local fallback.</span>
              </div>
              <label className="switch" title="Toggle Gemini personalization">
                <input
                  type="checkbox"
                  checked={settings.coachAiMode === 'gemini_optional'}
                  onChange={(e) => updateSettings({
                    coachAiMode: (e.target.checked ? 'gemini_optional' : 'off') as CoachAiMode,
                  })}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>

          <div className="glass-card setting-card coach-key-card">
            <div className="setting-row coach-key-row">
              <div className="setting-label">
                <span className="setting-title">Gemini API Key</span>
                <span className="setting-desc">Stored locally in Declutter settings.</span>
              </div>
              <input
                type="password"
                className="setting-input coach-key-input"
                value={settings.coachGeminiApiKey ?? ''}
                onChange={(e) => updateSettings({ coachGeminiApiKey: e.target.value })}
                placeholder="AIza..."
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>

        </div>
      </section>

      {/* Gamification & Goals */}
      <section className="settings-section">
        <h3>Focus Targets</h3>
        <div className="settings-grid">
          
          <div className="glass-card setting-card">
            <div className="setting-row">
              <div className="setting-label">
                <span className="setting-title">Daily Study Target</span>
                <span className="setting-desc">Goal hours of daily distraction-free study.</span>
              </div>
              <div className="flex-center gap-sm">
                <input
                  type="number"
                  className="setting-input"
                  value={settings.dailyGoalMinutes}
                  onChange={(e) => updateSettings({ dailyGoalMinutes: parseInt(e.target.value) || 0 })}
                  min="5"
                  max="1440"
                />
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>min</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Appearance & Theming */}
      <section className="settings-section">
        <h3>Theme Customization</h3>
        <div className="settings-grid">
          
          <div className="glass-card setting-card">
            <div className="setting-row">
              <div className="setting-label">
                <span className="setting-title">Application Theme</span>
                <span className="setting-desc">Visual base style of Declutter.</span>
              </div>
              <select
                className="setting-select"
                value={settings.theme}
                onChange={(e) => updateSettings({ theme: e.target.value as any })}
              >
                <option value="dark">Deep Space (Dark)</option>
                <option value="light">Zen Breeze (Light)</option>
                <option value="auto">System Default</option>
              </select>
            </div>
          </div>

          <div className="glass-card setting-card">
            <div className="setting-label">
              <span className="setting-title">Accent Colors</span>
              <span className="setting-desc">Choose a brand color for the app interface.</span>
              <div className="color-presets">
                {ACCENT_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`color-swatch ${settings.accentColor === color ? 'active' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => updateSettings({ accentColor: color })}
                  />
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Safety & Recovery (Panic Mode) */}
      <section className="settings-section" style={{ marginTop: 'var(--space-md)' }}>
        <h3 style={{ color: 'var(--accent-danger)', borderColor: 'rgba(248, 113, 113, 0.2)' }}>
          Safety & Recovery (Panic Mode)
        </h3>
        <div className="settings-grid">
          <div className="glass-card setting-card" style={{ border: '1px solid rgba(248, 113, 113, 0.2)' }}>
            <div className="setting-row" style={{ alignItems: 'flex-start' }}>
              <div className="setting-label" style={{ maxWidth: '70%' }}>
                <span className="setting-title" style={{ color: 'var(--accent-danger)' }}>Panic Mode (System Registry Repair)</span>
                <span className="setting-desc" style={{ marginTop: '4px' }}>
                  Forcefully resets Task Manager, Command Prompt, Registry Tools restrictions, and cleans Declutter's blocked websites from the hosts file.
                </span>
                <div style={{ marginTop: '12px' }}>
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); void handleOpenFailsafeFolder(); }}
                    style={{
                      color: 'var(--accentColor, var(--accent-primary, #10b981))',
                      fontSize: '0.8rem',
                      textDecoration: 'underline',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    📂 Locate Offline Emergency Unlock Script (EmergencyUnlock.bat)
                  </a>
                </div>
              </div>
              <button 
                type="button"
                className="btn btn-secondary"
                style={{
                  backgroundColor: 'rgba(248, 113, 113, 0.1)',
                  borderColor: 'rgba(248, 113, 113, 0.3)',
                  color: 'var(--accent-danger)',
                  padding: '10px 18px',
                  fontWeight: 600
                }}
                onClick={handleEmergencyRepair}
              >
                🚨 Execute Emergency Registry Repair
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Settings;
