import './Timer.css';

const Timer = () => {
  return (
    <div className="timer-container animate-fade-in-up">
      <div className="timer-header">
        <h1>Focus Session</h1>
        <p>Stay distraction-free and grow your garden.</p>
      </div>

      <div className="glass-card timer-card flex-center flex-col">
        <div className="time-display">
          <span>25:00</span>
        </div>
        
        <div className="timer-controls">
          <button className="btn btn-secondary">Lock Mode: Soft</button>
          <button className="btn btn-primary start-btn">Start Focusing</button>
        </div>
      </div>
    </div>
  );
};

export default Timer;
