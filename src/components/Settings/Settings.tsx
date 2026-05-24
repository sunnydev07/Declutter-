import { useSettings } from '../../hooks/useSettings';
import { LockMode } from '../../types/session';
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

      {/* Safety & Recovery */}
      <section className="settings-section" style={{ marginTop: 'var(--space-md)' }}>
        <h3 style={{ color: 'var(--accent-danger)', borderColor: 'rgba(248, 113, 113, 0.2)' }}>
          Safety & Recovery
        </h3>
        <div className="settings-grid">
          <div className="glass-card setting-card" style={{ border: '1px solid rgba(248, 113, 113, 0.2)' }}>
            <div className="setting-row">
              <div className="setting-label">
                <span className="setting-title" style={{ color: 'var(--accent-danger)' }}>Panic Mode (System Repair)</span>
                <span className="setting-desc" style={{ marginTop: '4px' }}>
                  If your PC crashes during a lock and restrictions (like Task Manager) remain blocked, use this to force-clear them. Requires Administrator privileges.
                </span>
              </div>
              <button 
                className="btn btn-secondary btn-danger-glow"
                onClick={() => {
                  if (confirm("This will forcefully reset system registry policies. Only use this if you are stuck locked out. Continue?")) {
                    alert("System repair initiated. You will see a UAC prompt.");
                    // In real implementation, this invokes Tauri command to run cleanup as admin
                  }
                }}
              >
                Repair System
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Settings;
