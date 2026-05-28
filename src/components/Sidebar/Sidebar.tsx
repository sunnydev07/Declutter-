import './Sidebar.css';

type ViewId = 'timer' | 'garden' | 'dashboard' | 'settings' | 'app_blocker';
type IconName = 'timer' | 'garden' | 'blocker' | 'analytics' | 'settings' | 'logo';

interface SidebarProps {
  currentView: ViewId;
  onViewChange: (view: ViewId) => void;
}

interface IconProps {
  name: IconName;
}

const NavIcon = ({ name }: IconProps) => {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  if (name === 'logo') {
    return (
      <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
        <path {...common} d="M8 23c7-1 13-7 15-17" />
        <path {...common} d="M9 20C5 16 5 10 8 5c6 3 9 8 8 14" />
        <path {...common} d="M14 17c4-5 8-7 13-7 0 7-4 12-11 14" />
        <path {...common} d="M12 24c3-1 6-1 9 1" />
      </svg>
    );
  }

  if (name === 'timer') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle {...common} cx="12" cy="13" r="8" />
        <path {...common} d="M12 13V8" />
        <path {...common} d="M12 13l4 2" />
        <path {...common} d="M9 2h6" />
      </svg>
    );
  }

  if (name === 'garden') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path {...common} d="M12 20v-8" />
        <path {...common} d="M12 12c-5 0-7-3-7-8 5 0 7 3 7 8Z" />
        <path {...common} d="M12 14c5 0 7-3 7-8-5 0-7 3-7 8Z" />
        <path {...common} d="M5 21h14" />
      </svg>
    );
  }

  if (name === 'blocker') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle {...common} cx="12" cy="12" r="8.5" />
        <path {...common} d="M6 6l12 12" />
      </svg>
    );
  }

  if (name === 'analytics') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path {...common} d="M4 20h16" />
        <path {...common} d="M6 16V9" />
        <path {...common} d="M10 16V5" />
        <path {...common} d="M14 16v-6" />
        <path {...common} d="M18 16V7" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle {...common} cx="12" cy="12" r="3" />
      <path {...common} d="M12 2v3" />
      <path {...common} d="M12 19v3" />
      <path {...common} d="M4.9 4.9 7 7" />
      <path {...common} d="m17 17 2.1 2.1" />
      <path {...common} d="M2 12h3" />
      <path {...common} d="M19 12h3" />
      <path {...common} d="M4.9 19.1 7 17" />
      <path {...common} d="m17 7 2.1-2.1" />
    </svg>
  );
};

const Sidebar = ({ currentView, onViewChange }: SidebarProps) => {
  const navItems = [
    { id: 'timer' as const, label: 'Focus Timer', icon: 'timer' as const },
    { id: 'garden' as const, label: 'My Garden', icon: 'garden' as const },
    { id: 'app_blocker' as const, label: 'App Blocker', icon: 'blocker' as const },
    { id: 'dashboard' as const, label: 'Analytics', icon: 'analytics' as const },
    { id: 'settings' as const, label: 'Settings', icon: 'settings' as const },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <NavIcon name="logo" />
        <h2 className="logo-text">Declutter</h2>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${currentView === item.id ? 'active' : ''}`}
            onClick={() => onViewChange(item.id)}
          >
            <span className="nav-icon">
              <NavIcon name={item.icon} />
            </span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-divider" />
      <div className="sidebar-footer">
        <div className="streak-badge"><span className="streak-flame" aria-hidden="true" /> 5 Day Streak</div>
      </div>
    </aside>
  );
};

export default Sidebar;
