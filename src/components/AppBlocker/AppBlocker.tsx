import React, { useState } from 'react';
import { db } from '../../utils/db';
import { AppRule } from '../../types/session';
import './AppBlocker.css';

const AppBlocker: React.FC = () => {
  const [rules, setRules] = useState<AppRule[]>(db.getAppRules());
  const [appName, setAppName] = useState('');
  const [ruleType, setRuleType] = useState<'block' | 'allow'>('block');
  const [exePath, setExePath] = useState('');

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName.trim()) return;

    const newRule = db.addAppRule(appName.trim(), ruleType, exePath.trim() || undefined);
    setRules([...rules, newRule]);
    
    // Reset inputs
    setAppName('');
    setExePath('');
  };

  const handleDeleteRule = (id: string) => {
    db.deleteAppRule(id);
    setRules(rules.filter((r) => r.id !== id));
  };

  return (
    <div className="appblocker-container animate-fade-in-up">
      <div className="appblocker-header">
        <h1>Process Lockdown Manager</h1>
        <p>Configure which applications are terminated or allowed during your focus locks.</p>
      </div>

      <div className="appblocker-grid">
        {/* Left Side: Create New Process Rules */}
        <form className="glass-card flex-col gap-md" onSubmit={handleAddRule}>
          <h3>Add Restriction Rule</h3>
          
          <div className="flex-col gap-xs">
            <span className="setting-desc">Application Name:</span>
            <input
              type="text"
              className="setting-input appblocker-input"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="e.g. Steam, Discord, Chrome"
              required
            />
          </div>

          <div className="flex-col gap-xs">
            <span className="setting-desc">Process Executable (.exe):</span>
            <input
              type="text"
              className="setting-input appblocker-input"
              value={exePath}
              onChange={(e) => setExePath(e.target.value)}
              placeholder="e.g. steam.exe, discord.exe (optional)"
            />
          </div>

          <div className="flex-col gap-xs">
            <span className="setting-desc">Restriction Type:</span>
            <select
              className="setting-select"
              value={ruleType}
              onChange={(e) => setRuleType(e.target.value as 'block' | 'allow')}
              style={{ width: '100%' }}
            >
              <option value="block">🚫 Blocklist (Terminate on open)</option>
              <option value="allow">✅ Whitelist (Permit under View Lock)</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary start-btn">
            ➕ Add Restriction Rule
          </button>
        </form>

        {/* Right Side: Active Restrictions Table */}
        <div className="glass-card flex-col gap-md">
          <h3>Active Restriction Rules</h3>
          
          {rules.length === 0 ? (
            <div className="empty-rules flex-center flex-col gap-md">
              <span className="empty-rule-icon">🛡️</span>
              <p>No custom application rules configured yet.</p>
            </div>
          ) : (
            <div className="rules-list flex-col gap-sm">
              {rules.map((rule) => (
                <div key={rule.id} className="rule-item-card glass-card flex-center">
                  <div className="rule-badge flex-center">
                    {rule.ruleType === 'block' ? '🚫' : '✅'}
                  </div>
                  
                  <div className="rule-details flex-col">
                    <span className="rule-title">{rule.appName}</span>
                    <span className="rule-exe">{rule.exePath}</span>
                  </div>

                  <button 
                    className="btn btn-secondary delete-rule-btn"
                    onClick={() => handleDeleteRule(rule.id)}
                    title="Remove rule"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppBlocker;
