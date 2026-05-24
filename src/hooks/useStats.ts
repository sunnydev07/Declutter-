import { useState, useEffect } from 'react';
import { db } from '../utils/db';
import { FocusSession } from '../types/session';

export const useStats = () => {
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [coins, setCoins] = useState(0);
  const [plantsGrown, setPlantsGrown] = useState<FocusSession[]>([]);

  const refreshStats = () => {
    const sessions = db.getSessions();
    
    // Calculate total minutes of successful focus
    const successful = sessions.filter((s) => s.status === 'completed');
    const totalMin = successful.reduce((acc, curr) => acc + (curr.actualDurationMinutes || curr.plannedDurationMinutes), 0);
    
    // Earn 1 coin per focused minute
    const earnedCoins = totalMin;

    setTotalMinutes(totalMin);
    setSessionsCompleted(successful.length);
    setCoins(earnedCoins);
    setPlantsGrown(successful);
  };

  useEffect(() => {
    refreshStats();
    
    // Add custom event listener to refresh stats when database changes
    window.addEventListener('storage', refreshStats);
    return () => window.removeEventListener('storage', refreshStats);
  }, []);

  return {
    totalMinutes,
    sessionsCompleted,
    coins,
    plantsGrown,
    refreshStats,
  };
};
