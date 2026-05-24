import React from 'react';
import { useStats } from '../../hooks/useStats';
import { AVAILABLE_PLANTS } from './PlantSelector';
import './Garden.css';

const Garden: React.FC = () => {
  const { totalMinutes, sessionsCompleted, coins, plantsGrown } = useStats();

  const getPlantEmoji = (plantType: string | undefined, survived: boolean | undefined) => {
    if (survived === false) return '🥀';
    const found = AVAILABLE_PLANTS.find((p) => p.name === plantType || p.id === plantType);
    return found ? found.emoji : '🌳';
  };

  const getPlantName = (plantType: string | undefined) => {
    const found = AVAILABLE_PLANTS.find((p) => p.name === plantType || p.id === plantType);
    return found ? found.name : 'Unknown Sapling';
  };

  return (
    <div className="garden-container animate-fade-in-up">
      <div className="garden-header flex-center" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1>My Focus Garden</h1>
          <p>A living garden built block-by-block from your deep concentration.</p>
        </div>
        <div className="coin-counter glass-card flex-center gap-sm">
          <span className="coin-icon">🪙</span>
          <span className="coin-value">{coins} Focus Coins</span>
        </div>
      </div>

      <div className="garden-stats-row">
        <div className="glass-card stat-item flex-col flex-center">
          <span className="stat-num">{sessionsCompleted}</span>
          <span className="stat-label">Successful Sessions</span>
        </div>
        <div className="glass-card stat-item flex-col flex-center">
          <span className="stat-num">🌳</span>
          <span className="stat-label">Total Flora Grown</span>
        </div>
        <div className="glass-card stat-item flex-col flex-center">
          <span className="stat-num">{totalMinutes}m</span>
          <span className="stat-label">Focus Duration</span>
        </div>
      </div>

      <div className="garden-layout-grid">
        {/* Left Side: The Interactive Garden Grid */}
        <div className="glass-card garden-grid-card flex-col gap-md">
          <h3>Garden Landscape</h3>
          
          {plantsGrown.length === 0 ? (
            <div className="empty-garden flex-center flex-col gap-md">
              <span className="empty-emoji">🪴</span>
              <p>Your garden is currently empty. Complete focus sessions to grow trees!</p>
            </div>
          ) : (
            <div className="garden-plot-grid">
              {plantsGrown.map((session) => (
                <div 
                  key={session.id} 
                  className={`garden-plot-cell flex-center flex-col ${session.plantSurvived === false ? 'wilted' : ''}`}
                  title={`${getPlantName(session.plantType)} - Focused for ${session.plannedDurationMinutes}m on ${new Date(session.startedAt).toLocaleDateString()}`}
                >
                  <span className="plot-flora">{getPlantEmoji(session.plantType, session.plantSurvived)}</span>
                  <span className="plot-label">{getPlantName(session.plantType)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Milestones/Achievements Board */}
        <div className="garden-achievements-sidebar glass-card flex-col gap-md">
          <h3>Achievements</h3>
          <div className="achievements-list flex-col gap-sm">
            <div className={`achievement-item glass-card flex-center gap-md ${sessionsCompleted >= 1 ? 'unlocked' : 'locked'}`}>
              <span className="badge-icon">🌱</span>
              <div className="badge-info flex-col">
                <span className="badge-name">First Sprout</span>
                <span className="badge-desc">Grow your very first study plant.</span>
              </div>
            </div>
            <div className={`achievement-item glass-card flex-center gap-md ${totalMinutes >= 120 ? 'unlocked' : 'locked'}`}>
              <span className="badge-icon">⏳</span>
              <div className="badge-info flex-col">
                <span className="badge-name">Deep Focus</span>
                <span className="badge-desc">Spend over 2 hours focusing.</span>
              </div>
            </div>
            <div className={`achievement-item glass-card flex-center gap-md ${sessionsCompleted >= 5 ? 'unlocked' : 'locked'}`}>
              <span className="badge-icon">🏆</span>
              <div className="badge-info flex-col">
                <span className="badge-name">Zen Master</span>
                <span className="badge-desc">Successfully grow 5 focus plants.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Garden;
