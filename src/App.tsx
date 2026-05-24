import { useState } from 'react';
import './App.css';
import Sidebar from './components/Sidebar/Sidebar';
import Timer from './components/Timer/Timer';
import Dashboard from './components/Dashboard/Dashboard';
import Settings from './components/Settings/Settings';
import Garden from './components/Gamification/Garden';

function App() {
  const [currentView, setCurrentView] = useState<'timer' | 'garden' | 'dashboard' | 'settings'>('timer');

  return (
    <div className="app-container">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      
      <main className="main-content">
        {currentView === 'timer' && <Timer />}
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'garden' && <Garden />}
        {currentView === 'settings' && <Settings />}
      </main>
    </div>
  );
}

export default App;
