import { useState } from 'react';
import './App.css';
import Sidebar from './components/Sidebar/Sidebar';
import Timer from './components/Timer/Timer';
import Dashboard from './components/Dashboard/Dashboard';

function App() {
  const [currentView, setCurrentView] = useState<'timer' | 'garden' | 'dashboard' | 'settings'>('timer');

  return (
    <div className="app-container">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      
      <main className="main-content">
        {currentView === 'timer' && <Timer />}
        {currentView === 'dashboard' && <Dashboard />}
        {/* We will add other views here as we build them */}
        {currentView === 'garden' && <div className="placeholder">Garden View (Coming Soon)</div>}
        {currentView === 'settings' && <div className="placeholder">Settings View (Coming Soon)</div>}
      </main>
    </div>
  );
}

export default App;
