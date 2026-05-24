import './Sidebar.css';

interface SidebarProps {
  currentView: 'timer' | 'garden' | 'dashboard' | 'settings';
  onViewChange: (view: 'timer' | 'garden' | 'dashboard' | 'settings') => void;
}

const Sidebar = ({ currentView, onViewChange }: SidebarProps) => {
  const navItems = [
    { id: 'timer' as const, label: 'Focus Timer', icon: '⏱️' },
    { id: 'garden' as const, label: 'My Garden', icon: '🌿' },
    { id: 'dashboard' as const, label: 'Analytics', icon: '📊' },
    { id: 'settings' as const, label: 'Settings', icon: '⚙️' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-icon">🌿</div>
        <h2 className="logo-text">Declutter</h2>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${currentView === item.id ? 'active' : ''}`}
            onClick={() => onViewChange(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="streak-badge">🔥 5 Day Streak</div>
      </div>
    </aside>
  );
};

export default Sidebar;
