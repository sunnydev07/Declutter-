import { useState } from 'react';
import './App.css';
import Sidebar from './components/Sidebar/Sidebar';
import Timer from './components/Timer/Timer';
import Dashboard from './components/Dashboard/Dashboard';
import Settings from './components/Settings/Settings';
import Garden from './components/Gamification/Garden';
import AppBlocker from './components/AppBlocker/AppBlocker';

function App() {
  const [currentView, setCurrentView] = useState<'timer' | 'garden' | 'dashboard' | 'settings' | 'app_blocker'>('timer');

  return (
    <div className="app-container">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      
      <main className="main-content">
        {currentView === 'timer' && <Timer />}
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'garden' && <Garden />}
        {currentView === 'settings' && <Settings />}
        {currentView === 'app_blocker' && <AppBlocker />}
      </main>
    </div>
  );
}

export default App;
