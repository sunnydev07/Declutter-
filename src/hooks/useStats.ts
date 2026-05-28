import { useState, useEffect } from 'react';
import { db } from '../utils/db';
import { FocusSession, DailyStats } from '../types/session';

export interface PeriodStats {
  totalFocusMinutes: number;
  totalFocusHours: number;
  sessionsCompleted: number;
  sessionsFailed: number;
  totalSessions: number;
  successRate: number;
  plantsGrown: number;
  plantsWilted: number;
  longestStreak: number;
}

export interface ChartDataPoint {
  date: string;
  dayName: string;
  dateLabel: string;
  minutes: number;
}

export interface CategoryDataPoint {
  name: string;
  minutes: number;
}

export const useStats = () => {
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [coins, setCoins] = useState(0);
  const [plantsGrown, setPlantsGrown] = useState<FocusSession[]>([]);

  // Advanced Stats
  const [allSessions, setAllSessions] = useState<FocusSession[]>([]);
  const [dailyStats, setDailyStats] = useState<Record<string, DailyStats>>({});
  const [longestStreakAllTime, setLongestStreakAllTime] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);

  // Period Stats
  const [stats7, setStats7] = useState<PeriodStats>({
    totalFocusMinutes: 0,
    totalFocusHours: 0,
    sessionsCompleted: 0,
    sessionsFailed: 0,
    totalSessions: 0,
    successRate: 100,
    plantsGrown: 0,
    plantsWilted: 0,
    longestStreak: 0,
  });

  const [stats30, setStats30] = useState<PeriodStats>({
    totalFocusMinutes: 0,
    totalFocusHours: 0,
    sessionsCompleted: 0,
    sessionsFailed: 0,
    totalSessions: 0,
    successRate: 100,
    plantsGrown: 0,
    plantsWilted: 0,
    longestStreak: 0,
  });

  const [stats365, setStats365] = useState<PeriodStats>({
    totalFocusMinutes: 0,
    totalFocusHours: 0,
    sessionsCompleted: 0,
    sessionsFailed: 0,
    totalSessions: 0,
    successRate: 100,
    plantsGrown: 0,
    plantsWilted: 0,
    longestStreak: 0,
  });

  // Chart Data
  const [chartData7, setChartData7] = useState<ChartDataPoint[]>([]);
  const [chartData14, setChartData14] = useState<ChartDataPoint[]>([]);
  const [chartData30, setChartData30] = useState<ChartDataPoint[]>([]);
  const [categoryData30, setCategoryData30] = useState<CategoryDataPoint[]>([]);

  // Generate consecutive date strings in YYYY-MM-DD format (local time)
  const getDatesInLastNDays = (n: number): string[] => {
    const dates: string[] = [];
    for (let i = 0; i < n; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.getFullYear() + '-' + 
                 String(d.getMonth() + 1).padStart(2, '0') + '-' + 
                 String(d.getDate()).padStart(2, '0'));
    }
    return dates;
  };

  // Calculate Streak of all time
  const calculateAllTimeLongestStreak = (stats: Record<string, DailyStats>): number => {
    const dates = Object.keys(stats)
      .filter((dateStr) => (stats[dateStr].totalFocusMinutes || 0) > 0)
      .sort();

    if (dates.length === 0) return 0;

    let longest = 0;
    let current = 0;
    let prevTime: number | null = null;

    for (const dateStr of dates) {
      const [year, month, day] = dateStr.split('-').map(Number);
      const currentTime = Date.UTC(year, month - 1, day);

      if (prevTime === null) {
        current = 1;
      } else {
        const diffDays = Math.round((currentTime - prevTime) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          current += 1;
        } else if (diffDays > 1) {
          if (current > longest) longest = current;
          current = 1;
        }
      }
      prevTime = currentTime;
    }
    if (current > longest) longest = current;
    return longest;
  };

  // Calculate current streak
  const calculateCurrentStreakVal = (stats: Record<string, DailyStats>): number => {
    const today = new Date();
    const formatDate = (d: Date) => 
      d.getFullYear() + '-' + 
      String(d.getMonth() + 1).padStart(2, '0') + '-' + 
      String(d.getDate()).padStart(2, '0');

    const todayStr = formatDate(today);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);

    const hasFocusedToday = stats[todayStr] && stats[todayStr].totalFocusMinutes > 0;
    const hasFocusedYesterday = stats[yesterdayStr] && stats[yesterdayStr].totalFocusMinutes > 0;

    if (!hasFocusedToday && !hasFocusedYesterday) {
      return 0;
    }

    let streak = 0;
    const checkDate = new Date(hasFocusedToday ? today : yesterday);

    while (true) {
      const dateStr = formatDate(checkDate);
      const active = stats[dateStr] && stats[dateStr].totalFocusMinutes > 0;
      
      if (active) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  const refreshStats = () => {
    const sessions = db.getSessions();
    const stats = db.getDailyStats();

    setAllSessions(sessions);
    setDailyStats(stats);

    // ─── Legacy Stats ───
    const successful = sessions.filter((s) => s.status === 'completed');
    const totalMin = successful.reduce((acc, curr) => acc + (curr.actualDurationMinutes || curr.plannedDurationMinutes), 0);
    const earnedCoins = totalMin;

    setTotalMinutes(totalMin);
    setSessionsCompleted(successful.length);
    setCoins(earnedCoins);
    setPlantsGrown(successful);

    // ─── Streaks ───
    setLongestStreakAllTime(calculateAllTimeLongestStreak(stats));
    setCurrentStreak(calculateCurrentStreakVal(stats));

    // Helper for period calculations
    const calculatePeriod = (days: number): PeriodStats => {
      const dates = getDatesInLastNDays(days);
      let totalFocusMinutes = 0;
      let sessionsCompleted = 0;
      let sessionsFailed = 0;
      let plantsGrown = 0;
      let plantsWilted = 0;

      // Longest streak in this period
      const datesReversed = [...dates].reverse();
      let longestStreak = 0;
      let currStreak = 0;

      datesReversed.forEach((dStr) => {
        const dayStat = stats[dStr];
        const hasFocused = dayStat && dayStat.totalFocusMinutes > 0;

        if (hasFocused) {
          currStreak++;
          if (currStreak > longestStreak) {
            longestStreak = currStreak;
          }
        } else {
          currStreak = 0;
        }

        if (dayStat) {
          totalFocusMinutes += dayStat.totalFocusMinutes || 0;
          sessionsCompleted += dayStat.sessionsCompleted || 0;
          sessionsFailed += dayStat.sessionsFailed || 0;
          plantsGrown += dayStat.plantsGrown || 0;
          plantsWilted += dayStat.plantsWilted || 0;
        }
      });

      const totalSessions = sessionsCompleted + sessionsFailed;
      const successRate = totalSessions > 0 ? Math.round((sessionsCompleted / totalSessions) * 100) : 100;

      return {
        totalFocusMinutes,
        totalFocusHours: Math.round((totalFocusMinutes / 60) * 10) / 10,
        sessionsCompleted,
        sessionsFailed,
        totalSessions,
        successRate,
        plantsGrown,
        plantsWilted,
        longestStreak,
      };
    };

    setStats7(calculatePeriod(7));
    setStats30(calculatePeriod(30));
    setStats365(calculatePeriod(365));

    // ─── Chart Formatting ───
    const buildChartData = (days: number): ChartDataPoint[] => {
      const dates = getDatesInLastNDays(days).reverse();
      return dates.map((dateStr) => {
        const dayStat = stats[dateStr];
        const parts = dateStr.split('-');
        const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        return {
          date: dateStr,
          dayName: weekday,
          dateLabel: formattedDate,
          minutes: dayStat ? dayStat.totalFocusMinutes : 0,
        };
      });
    };

    setChartData7(buildChartData(7));
    setChartData14(buildChartData(14));
    setChartData30(buildChartData(30));

    // ─── Category Breakdown (Last 30 Days) ───
    const dates30 = getDatesInLastNDays(30);
    const recentSessions = sessions.filter((s) => {
      if (!s.startedAt) return false;
      const dateStr = s.startedAt.split('T')[0];
      return dates30.includes(dateStr);
    });

    const categoryMap: Record<string, number> = {};
    recentSessions.forEach((s) => {
      if (s.status === 'completed') {
        const cat = s.category || 'General';
        const duration = s.actualDurationMinutes || s.plannedDurationMinutes || 0;
        categoryMap[cat] = (categoryMap[cat] || 0) + duration;
      }
    });

    const categoriesList = Object.keys(categoryMap).map((name) => ({
      name,
      minutes: categoryMap[name],
    })).sort((a, b) => b.minutes - a.minutes);

    setCategoryData30(categoriesList);
  };

  useEffect(() => {
    refreshStats();

    window.addEventListener('storage', refreshStats);
    return () => window.removeEventListener('storage', refreshStats);
  }, []);

  return {
    // Legacy support
    totalMinutes,
    sessionsCompleted,
    coins,
    plantsGrown,

    // Advanced Stats
    allSessions,
    dailyStats,
    longestStreakAllTime,
    currentStreak,

    // Period Stats
    stats7,
    stats30,
    stats365,

    // Charts
    chartData7,
    chartData14,
    chartData30,
    categoryData30,

    // Operations
    refreshStats,
  };
};
