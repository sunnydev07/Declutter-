import React, { useState } from 'react';
import { useStats } from '../../hooks/useStats';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const {
    allSessions,
    dailyStats,
    longestStreakAllTime,
    currentStreak,
    stats7,
    stats30,
    stats365,
    chartData7,
    chartData14,
    categoryData30,
  } = useStats();

  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '365d'>('30d');
  const [chartDays, setChartDays] = useState<7 | 14>(7);

  // Determine active stats based on timeRange
  const activeStats =
    timeRange === '7d' ? stats7 : timeRange === '30d' ? stats30 : stats365;

  // Helper: Generate date strings for last N days
  const getDatesInLastNDays = (n: number): string[] => {
    const dates: string[] = [];
    for (let i = 0; i < n; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(
        d.getFullYear() +
          '-' +
          String(d.getMonth() + 1).padStart(2, '0') +
          '-' +
          String(d.getDate()).padStart(2, '0')
      );
    }
    return dates;
  };

  // Calculate Longest Focus Session in selected timeRange
  const getLongestFocusSession = (range: '7d' | '30d' | '365d'): number => {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 365;
    const dates = getDatesInLastNDays(days);
    const filtered = allSessions.filter((s) => {
      if (!s.startedAt) return false;
      const dateStr = s.startedAt.split('T')[0];
      return dates.includes(dateStr) && s.status === 'completed';
    });

    if (filtered.length === 0) return 0;
    return Math.max(
      ...filtered.map((s) => s.actualDurationMinutes || s.plannedDurationMinutes || 0)
    );
  };

  const longestSession = getLongestFocusSession(timeRange);

  // ─── Heatmap Data Generator (Last 12 Months) ───
  const generateHeatmapDays = () => {
    const today = new Date();
    const totalDaysToShow = 365;

    // Start from a Sunday approx 52 weeks ago
    const startDate = new Date();
    startDate.setDate(today.getDate() - totalDaysToShow + 1);
    const startDayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - startDayOfWeek); // Backtrack to Sunday

    // End on a Saturday near today
    const endDate = new Date(today);
    const endDayOfWeek = endDate.getDay();
    endDate.setDate(today.getDate() + (6 - endDayOfWeek)); // Forward to Saturday

    const allHeatmapDays = [];
    const tempDate = new Date(startDate);

    while (tempDate <= endDate) {
      const dateStr =
        tempDate.getFullYear() +
        '-' +
        String(tempDate.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(tempDate.getDate()).padStart(2, '0');

      const dayStat = dailyStats[dateStr];
      const minutes = dayStat ? dayStat.totalFocusMinutes : 0;

      let level = 0;
      if (minutes > 0 && minutes <= 25) level = 1;
      else if (minutes > 25 && minutes <= 60) level = 2;
      else if (minutes > 60 && minutes <= 120) level = 3;
      else if (minutes > 120) level = 4;

      const dateObj = new Date(tempDate);

      allHeatmapDays.push({
        date: dateStr,
        minutes,
        level,
        dateLabel: dateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      });

      tempDate.setDate(tempDate.getDate() + 1);
    }

    return allHeatmapDays;
  };

  const heatmapDays = generateHeatmapDays();

  // Chunk heatmap into weeks (columns)
  const heatmapWeeks: typeof heatmapDays[] = [];
  for (let i = 0; i < heatmapDays.length; i += 7) {
    heatmapWeeks.push(heatmapDays.slice(i, i + 7));
  }

  // Calculate Month Labels with their week column indices
  let lastMonthName = '';
  const monthLabels = heatmapWeeks
    .map((week, idx) => {
      const sunday = new Date(week[0].date);
      const monthName = sunday.toLocaleDateString('en-US', { month: 'short' });
      if (monthName !== lastMonthName) {
        lastMonthName = monthName;
        return { name: monthName, index: idx };
      }
      return null;
    })
    .filter(Boolean) as { name: string; index: number }[];

  // ─── Recharts Custom Tooltip ───
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card chart-tooltip">
          <p className="tooltip-label">{label}</p>
          <p className="tooltip-value">
            <span className="bullet" style={{ backgroundColor: 'var(--accent-primary)' }} />
            Focus Time: <span className="bold">{payload[0].value} mins</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="glass-card chart-tooltip">
          <p className="tooltip-label" style={{ color: data.color }}>
            {data.name}
          </p>
          <p className="tooltip-value">
            {data.value} plant{data.value !== 1 ? 's' : ''} ({data.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  // Pie Chart formatting
  const totalPlants = activeStats.plantsGrown + activeStats.plantsWilted;
  const pieData = [
    {
      name: 'Grown',
      value: activeStats.plantsGrown,
      color: 'var(--accent-primary)',
      percentage: totalPlants > 0 ? Math.round((activeStats.plantsGrown / totalPlants) * 100) : 0,
    },
    {
      name: 'Wilted',
      value: activeStats.plantsWilted,
      color: 'var(--accent-danger)',
      percentage: totalPlants > 0 ? Math.round((activeStats.plantsWilted / totalPlants) * 100) : 0,
    },
  ];

  const hasPieData = totalPlants > 0;

  // Bar Chart data selection
  const barChartData = chartDays === 7 ? chartData7 : chartData14;

  return (
    <div className="dashboard-container animate-fade-in-up">
      {/* Dashboard Top Header Section */}
      <div className="dashboard-header-row">
        <div>
          <h1 className="dashboard-title">Advanced Analytics</h1>
          <p className="dashboard-subtitle">
            Track your neural focus, session habits, and garden growth.
          </p>
        </div>

        {/* Global Time Range Filter */}
        <div className="time-range-tabs">
          <button
            className={`tab-btn ${timeRange === '7d' ? 'active' : ''}`}
            onClick={() => setTimeRange('7d')}
          >
            7 Days
          </button>
          <button
            className={`tab-btn ${timeRange === '30d' ? 'active' : ''}`}
            onClick={() => setTimeRange('30d')}
          >
            30 Days
          </button>
          <button
            className={`tab-btn ${timeRange === '365d' ? 'active' : ''}`}
            onClick={() => setTimeRange('365d')}
          >
            1 Year
          </button>
        </div>
      </div>

      {/* Streak Information Banner */}
      <div className="glass-card streak-banner flex-center gap-lg">
        <div className="streak-stat-item flex-center gap-sm">
          <span className="streak-icon-flame animate-pulse-slow">🔥</span>
          <div>
            <span className="streak-banner-value">{currentStreak} Days</span>
            <span className="streak-banner-label">Current Focus Streak</span>
          </div>
        </div>
        <div className="streak-banner-divider" />
        <div className="streak-stat-item flex-center gap-sm">
          <span className="streak-icon-crown">👑</span>
          <div>
            <span className="streak-banner-value">{longestStreakAllTime} Days</span>
            <span className="streak-banner-label">All-Time Record Streak</span>
          </div>
        </div>
      </div>

      {/* Top Row: Key Metrics */}
      <div className="stats-grid">
        {/* Total Focus Time */}
        <div className="glass-card metric-card flex-col">
          <span className="metric-label">Total Focus Time</span>
          <span className="metric-value-large">{activeStats.totalFocusHours}h</span>
          <span className="metric-subtext">
            {activeStats.totalFocusMinutes} total focus minutes
          </span>
          <div className="metric-glow-dot green" />
        </div>

        {/* Success Rate */}
        <div className="glass-card metric-card flex-col">
          <span className="metric-label">Win Rate %</span>
          <span
            className={`metric-value-large ${
              activeStats.successRate >= 80
                ? 'text-success'
                : activeStats.successRate >= 50
                ? 'text-warning'
                : 'text-danger'
            }`}
          >
            {activeStats.successRate}%
          </span>
          <span className="metric-subtext">
            {activeStats.sessionsCompleted} of {activeStats.totalSessions} sessions won
          </span>
          <div
            className={`metric-glow-dot ${
              activeStats.successRate >= 80
                ? 'green'
                : activeStats.successRate >= 50
                ? 'yellow'
                : 'red'
            }`}
          />
        </div>

        {/* Plants Grown */}
        <div className="glass-card metric-card flex-col">
          <span className="metric-label">Plants Grown</span>
          <span className="metric-value-large text-success">
            {activeStats.plantsGrown} 🌳
          </span>
          <span className="metric-subtext">
            {activeStats.plantsWilted} wilted saplings ({activeStats.plantsWilted} failed)
          </span>
          <div className="metric-glow-dot green" />
        </div>

        {/* Longest Focus Session */}
        <div className="glass-card metric-card flex-col">
          <span className="metric-label">Longest Focus Session</span>
          <span className="metric-value-large text-blue">{longestSession} min</span>
          <span className="metric-subtext">Single longest session in this period</span>
          <div className="metric-glow-dot blue" />
        </div>
      </div>

      {/* Middle Row: The Heatmap */}
      <div className="glass-card heatmap-card flex-col gap-md">
        <div className="heatmap-header-row">
          <h3>Concentration Consistency (Last 12 Months)</h3>
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

        {/* Heatmap Grid container for horizontal scrolling */}
        <div className="heatmap-scroll-wrapper">
          <div className="heatmap-grid-inner">
            {/* Month Labels row */}
            <div className="heatmap-months-labels-row">
              {monthLabels.map((lbl) => (
                <span
                  key={`${lbl.name}-${lbl.index}`}
                  className="month-label"
                  style={{
                    left: `${(lbl.index / heatmapWeeks.length) * 100}%`,
                  }}
                >
                  {lbl.name}
                </span>
              ))}
            </div>

            <div className="heatmap-grid-row">
              {/* Day Labels column */}
              <div className="heatmap-days-labels-column">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* Pure CSS Heatmap Grid */}
              <div className="heatmap-cells-grid">
                {heatmapDays.map((day) => (
                  <div
                    key={day.date}
                    className={`heatmap-cell level-${day.level}`}
                    title={
                      day.minutes > 0
                        ? `${day.minutes} mins focused on ${day.dateLabel}`
                        : `No focus sessions on ${day.dateLabel}`
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Charts & Category breakdown */}
      <div className="dashboard-charts-row">
        {/* Bar Chart Card */}
        <div className="glass-card chart-card flex-col gap-md">
          <div className="chart-header-row">
            <h3>Focus Minutes</h3>
            <div className="chart-toggle-tabs">
              <button
                className={`chart-tab ${chartDays === 7 ? 'active' : ''}`}
                onClick={() => setChartDays(7)}
              >
                7 Days
              </button>
              <button
                className={`chart-tab ${chartDays === 14 ? 'active' : ''}`}
                onClick={() => setChartDays(14)}
              >
                14 Days
              </button>
            </div>
          </div>

          <div className="chart-container">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="dayName" stroke="rgba(255,255,255,0.15)" tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.15)" tickLine={false} />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar
                  dataKey="minutes"
                  fill="var(--accent-primary)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart Card */}
        <div className="glass-card chart-card flex-col gap-md">
          <h3>Flora Growth Ratio</h3>

          <div className="pie-chart-wrapper flex-center">
            {hasPieData ? (
              <div className="pie-container-inner">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                {/* Legend & Summary inside Donut center or label */}
                <div className="pie-center-label flex-col flex-center">
                  <span className="pie-center-percentage">{pieData[0].percentage}%</span>
                  <span className="pie-center-label-text">Success</span>
                </div>
              </div>
            ) : (
              <div className="pie-empty-state flex-col flex-center gap-sm">
                <span className="empty-emoji">🪴</span>
                <p className="empty-title">No Plant Data Available</p>
                <p className="empty-desc">
                  Plants grow once you successfully finish a session!
                </p>
              </div>
            )}

            {hasPieData && (
              <div className="pie-legend-rows flex-col">
                <div className="legend-row flex-center">
                  <div className="legend-bullet green" />
                  <span className="legend-name">Plants Grown</span>
                  <span className="legend-val">{activeStats.plantsGrown}</span>
                </div>
                <div className="legend-row flex-center">
                  <div className="legend-bullet red" />
                  <span className="legend-name">Plants Wilted</span>
                  <span className="legend-val">{activeStats.plantsWilted}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category breakdown (Last 30 Days) */}
      <div className="glass-card category-breakdown-card flex-col gap-md">
        <h3>Cognitive Focus Categories (Last 30 Days)</h3>
        {categoryData30.length === 0 ? (
          <div className="empty-categories flex-center flex-col gap-sm">
            <span className="empty-emoji">🎯</span>
            <p>No categorised study cycles completed yet in the last 30 days.</p>
          </div>
        ) : (
          <div className="category-progress-list">
            {categoryData30.map((cat) => {
              const maxVal = Math.max(...categoryData30.map((c) => c.minutes), 1);
              const ratio = (cat.minutes / maxVal) * 100;
              return (
                <div key={cat.name} className="category-progress-item">
                  <div className="category-name-row">
                    <span className="category-name">{cat.name}</span>
                    <span className="category-value">{cat.minutes} mins focused</span>
                  </div>
                  <div className="category-bar-bg">
                    <div className="category-bar-fill" style={{ width: `${ratio}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
