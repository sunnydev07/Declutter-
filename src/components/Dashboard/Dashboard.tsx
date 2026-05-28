import React from 'react';
import { useStats } from '../../hooks/useStats';
import { db } from '../../utils/db';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const { totalMinutes, sessionsCompleted } = useStats();

  const sessions = db.getSessions();
  const failedCount = sessions.filter((s) => s.status === 'failed' || s.status === 'emergency_unlocked').length;
  const totalSessions = sessionsCompleted + failedCount;
  
  // Calculate completion rate
  const successRate = totalSessions > 0 ? Math.round((sessionsCompleted / totalSessions) * 100) : 100;
  
  // Calculate average session duration
  const avgDuration = sessionsCompleted > 0 ? Math.round(totalMinutes / sessionsCompleted) : 0;

  // Calculate daily goal progress
  const settings = db.getSettings();
  const dailyGoal = settings.dailyGoalMinutes;
  const todayDateStr = new Date().toISOString().split('T')[0];
  const dailyStats = db.getDailyStats();
  const todayFocus = dailyStats[todayDateStr]?.totalFocusMinutes || 0;
  const goalProgress = dailyGoal > 0 ? Math.min(Math.round((todayFocus / dailyGoal) * 100), 100) : 100;

  // Extract category focus times
  const categories = ['General Study', 'Online Lectures', 'Coding & Tech', 'Reading & Research'];
  const categoryTimes = categories.map((cat) => {
    const successful = sessions.filter((s) => s.status === 'completed' && s.category === cat);
    return {
      name: cat,
      minutes: successful.reduce((acc, curr) => acc + (curr.actualDurationMinutes || curr.plannedDurationMinutes), 0),
    };
  });
  const maxCategoryTime = Math.max(...categoryTimes.map((c) => c.minutes), 1);

  // Generate simulated contribution heatmap blocks (last 24 days)
  const heatmapCells = Array.from({ length: 24 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (23 - i));
    const dateStr = date.toISOString().split('T')[0];
    const minutes = dailyStats[dateStr]?.totalFocusMinutes || 0;
    
    let level = 'level-0';
    if (minutes > 0 && minutes <= 25) level = 'level-1';
    else if (minutes > 25 && minutes <= 60) level = 'level-2';
    else if (minutes > 60 && minutes <= 120) level = 'level-3';
    else if (minutes > 120) level = 'level-4';

    return {
      date: dateStr,
      minutes,
      level,
    };
  });

  return (
    <div className="dashboard-container animate-fade-in-up">
      <div className="dashboard-header">
        <h1>Focus Analytics</h1>
        <p>Analyze your cognitive work cycles, target milestones, and habits.</p>
      </div>

      {/* Main Stats Grid */}
      <div className="stats-grid">
        <div className="glass-card flex-col">
          <span className="stat-label">Focused Duration</span>
          <span className="stat-value-large">{totalMinutes}m</span>
          <span className="setting-desc">Total minutes focused</span>
        </div>
        <div className="glass-card flex-col">
          <span className="stat-label">Daily Goal Progress</span>
          <span className="stat-value-large">{goalProgress}%</span>
          <span className="setting-desc">{todayFocus}m of {dailyGoal}m goal today</span>
        </div>
        <div className="glass-card flex-col">
          <span className="stat-label">Focus Success Rate</span>
          <span className="stat-value-large">{successRate}%</span>
          <span className="setting-desc">{sessionsCompleted} of {totalSessions} completed</span>
        </div>
        <div className="glass-card flex-col">
          <span className="stat-label">Average Session</span>
          <span className="stat-value-large">{avgDuration}m</span>
          <span className="setting-desc">Minutes focused per session</span>
        </div>
      </div>

      <div className="dashboard-layout-row">
        {/* Focus Intensity Heatmap */}
        <div className="glass-card heatmap-card flex-col gap-md">
          <h3>Concentration Consistency (Last 24 Days)</h3>
          
          <div className="heatmap-months-header">
            <span>Recent Study Cycles</span>
          </div>

          <div className="heatmap-grid-container">
            <div className="heatmap-days-labels">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
            </div>

            <div className="heatmap-grid">
              {heatmapCells.map((cell, idx) => (
                <div
                  key={idx}
                  className={`heatmap-cell ${cell.level}`}
                  title={`${cell.minutes}m focused on ${cell.date}`}
                />
              ))}
            </div>
          </div>

          <div className="heatmap-legend">
            <span>Less</span>
            <div className="legend-box level-0" />
            <div className="legend-box level-1" />
            <div className="legend-box level-2" />
            <div className="legend-box level-3" />
            <div className="legend-box level-4" />
            <span>More</span>
          </div>
        </div>

        {/* Category Breakdown list */}
        <div className="glass-card flex-col gap-md">
          <h3>Category Distribution</h3>
          <div className="category-progress-list">
            {categoryTimes.map((cat) => {
              const ratio = (cat.minutes / maxCategoryTime) * 100;
              return (
                <div key={cat.name} className="category-progress-item">
                  <div className="category-name-row">
                    <span className="category-name">{cat.name}</span>
                    <span className="category-value">{cat.minutes} min</span>
                  </div>
                  <div className="category-bar-bg">
                    <div 
                      className="category-bar-fill" 
                      style={{ 
                        width: `${ratio}%`,
                        backgroundColor: cat.minutes > 0 ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
