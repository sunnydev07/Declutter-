import React, { useState } from 'react';
import { db } from '../../utils/db';
import { AppRule, WebRule } from '../../types/session';
import { invoke } from '@tauri-apps/api/core';
import './AppBlocker.css';

const AppBlocker: React.FC = () => {
  // Tabs State
  const [activeTab, setActiveTab] = useState<'apps' | 'sites'>('apps');

  // Application Blocking State
  const [rules, setRules] = useState<AppRule[]>(db.getAppRules());
  const [appName, setAppName] = useState('');
  const [ruleType, setRuleType] = useState<'block' | 'allow'>('block');
  const [exePath, setExePath] = useState('');

  // Website Blocking State
  const [webRules, setWebRules] = useState<WebRule[]>(db.getWebRules());
  const [domain, setDomain] = useState('');

  // Active Process Picker State
  const [runningProcesses, setRunningProcesses] = useState<string[]>([]);
  const [showProcessDropdown, setShowProcessDropdown] = useState(false);
  const [isLoadingProcesses, setIsLoadingProcesses] = useState(false);
  const [processSearch, setProcessSearch] = useState('');

  // --- Handlers for Apps ---
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

  // --- Handlers for Websites ---
  const handleAddWebRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) return;

    // Clean up domain (strip protocol and subdomain if typed)
    let cleanDomain = domain.trim().toLowerCase();
    cleanDomain = cleanDomain.replace(/^(https?:\/\/)?(www\.)?/, '');
    
    const newRule = db.addWebRule(cleanDomain, 'block');
    setWebRules([...webRules, newRule]);
    
    setDomain('');
  };

  const handleDeleteWebRule = (id: string) => {
    db.deleteWebRule(id);
    setWebRules(webRules.filter((r) => r.id !== id));
  };

  // --- Process Picker Helper ---
  const fetchProcesses = async () => {
    setIsLoadingProcesses(true);
    try {
      const list = await invoke<string[]>('get_running_processes');
      setRunningProcesses(list);
      setShowProcessDropdown(true);
      setProcessSearch('');
    } catch (err) {
      console.warn('[AppBlocker] Tauri get_running_processes failed — is app running inside Tauri shell?', err);
      // Fallback/mock list for web development mode
      setRunningProcesses(['chrome.exe', 'discord.exe', 'spotify.exe', 'steam.exe', 'vscode.exe', 'notion.exe']);
      setShowProcessDropdown(true);
      setProcessSearch('');
    } finally {
      setIsLoadingProcesses(false);
    }
  };

  const handleSelectProcess = (proc: string) => {
    const baseName = proc.replace(/\.exe$/i, '');
    const capitalized = baseName.charAt(0).toUpperCase() + baseName.slice(1);
    setAppName(capitalized);
    setExePath(proc);
    setShowProcessDropdown(false);
  };

  const filteredProcesses = runningProcesses.filter((proc) =>
    proc.toLowerCase().includes(processSearch.toLowerCase())
  );

  return (
    <div className="appblocker-container animate-fade-in-up">
      <div className="appblocker-header flex-col gap-sm">
        <h1>Lockdown Rules Manager</h1>
        <p>Configure which applications and website domains are blocked or allowed during your focus locks.</p>
        
        {/* Navigation Tabs */}
        <div className="appblocker-tabs flex gap-sm" style={{ marginTop: 'var(--space-md)' }}>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'apps' ? 'active' : ''}`}
            onClick={() => setActiveTab('apps')}
          >
            🖥️ Application Rules
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'sites' ? 'active' : ''}`}
            onClick={() => setActiveTab('sites')}
          >
            🌐 Website Rules
          </button>
        </div>
      </div>

      <div className="appblocker-grid">
        {activeTab === 'apps' ? (
          <>
            {/* Left Side: Create New Process Rules */}
            <form className="glass-card flex-col gap-md" onSubmit={handleAddRule}>
              <h3>Add Application Rule</h3>
              
              <div className="flex-col gap-xs relative">
                <div className="flex-center justify-between" style={{ width: '100%' }}>
                  <span className="setting-desc">Application Name:</span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '2px 8px', fontSize: '0.75rem', height: 'auto', minHeight: 'unset' }}
                    onClick={fetchProcesses}
                    disabled={isLoadingProcesses}
                  >
                    {isLoadingProcesses ? '🔄 Fetching...' : '🔍 Fetch Active'}
                  </button>
                </div>
                
                <input
                  type="text"
                  className="setting-input appblocker-input"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="e.g. Steam, Discord, Chrome"
                  required
                />

                {showProcessDropdown && (
                  <div className="process-dropdown glass-card z-50 flex-col gap-xs" style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    maxHeight: '220px',
                    overflowY: 'auto',
                    marginTop: '6px',
                    padding: '10px',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
                    backgroundColor: 'rgba(22, 22, 27, 0.98)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    <div className="flex-center justify-between pb-2 mb-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span className="text-xs text-secondary font-bold">Select Active Process</span>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
                        onClick={() => setShowProcessDropdown(false)}
                      >
                        ✕
                      </button>
                    </div>
                    
                    <input
                      type="text"
                      className="setting-input text-xs"
                      placeholder="Search processes..."
                      value={processSearch}
                      onChange={(e) => setProcessSearch(e.target.value)}
                      style={{ padding: '6px 10px', width: '100%', marginBottom: '8px', boxSizing: 'border-box' }}
                    />
                    
                    <div className="flex-col gap-xxs" style={{ maxHeight: '120px', overflowY: 'auto' }}>
                      {filteredProcesses.length === 0 ? (
                        <span className="text-xs text-tertiary p-2 text-center">No active processes matched</span>
                      ) : (
                        filteredProcesses.map((proc) => (
                          <button
                            key={proc}
                            type="button"
                            className="text-left text-xs p-2 rounded hover-bg-white-05 flex-center justify-between"
                            style={{ 
                              width: '100%', 
                              background: 'none', 
                              border: 'none', 
                              color: 'var(--text-primary)', 
                              cursor: 'pointer',
                              borderRadius: 'var(--radius-xs)',
                              transition: 'all 0.1s'
                            }}
                            onClick={() => handleSelectProcess(proc)}
                          >
                            <span style={{ fontWeight: 500 }}>{proc.replace(/\.exe$/i, '')}</span>
                            <span className="text-xxs text-tertiary font-mono">{proc}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
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

              <button type="submit" className="btn btn-primary start-btn" style={{ marginTop: 'var(--space-xs)' }}>
                ➕ Add Restriction Rule
              </button>
            </form>

            {/* Right Side: Active Restrictions Table */}
            <div className="glass-card flex-col gap-md">
              <h3>Active Application Rules</h3>
              
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
          </>
        ) : (
          <>
            {/* Left Side: Create New Website Rule */}
            <form className="glass-card flex-col gap-md" onSubmit={handleAddWebRule}>
              <h3>Add Website Block</h3>
              
              <div className="flex-col gap-xs">
                <span className="setting-desc">Website Domain:</span>
                <input
                  type="text"
                  className="setting-input appblocker-input"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="e.g. reddit.com, youtube.com"
                  required
                />
              </div>

              <div className="flex-col gap-xs">
                <span className="setting-desc">Restriction Type:</span>
                <select
                  className="setting-select"
                  value="block"
                  disabled
                  style={{ width: '100%', opacity: 0.6 }}
                >
                  <option value="block">🚫 Blocklist (Access Blocked)</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary start-btn" style={{ marginTop: 'var(--space-xs)' }}>
                ➕ Add Website Block
              </button>
            </form>

            {/* Right Side: Active Website Restrictions Table */}
            <div className="glass-card flex-col gap-md">
              <h3>Active Website Blocks</h3>
              
              {webRules.length === 0 ? (
                <div className="empty-rules flex-center flex-col gap-md">
                  <span className="empty-rule-icon">🌐</span>
                  <p>No website blocking rules configured yet.</p>
                </div>
              ) : (
                <div className="rules-list flex-col gap-sm">
                  {webRules.map((rule) => (
                    <div key={rule.id} className="rule-item-card glass-card flex-center">
                      <div className="rule-badge flex-center">
                        🚫
                      </div>
                      
                      <div className="rule-details flex-col">
                        <span className="rule-title">{rule.domain}</span>
                        <span className="rule-exe">Dynamic DNS Block</span>
                      </div>

                      <button 
                        className="btn btn-secondary delete-rule-btn"
                        onClick={() => handleDeleteWebRule(rule.id)}
                        title="Remove rule"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AppBlocker;

