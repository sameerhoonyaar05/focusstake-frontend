import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function TimerPage({ user, task, setCurrentPage }) {
  const [timeLeft, setTimeLeft] = useState(task?.duration_seconds || 0);
  const [isActive, setIsActive] = useState(true);
  const [submittedCPs, setSubmittedCPs] = useState([]);

  const totalSeconds = task?.duration_seconds || 0;
  const buffer = Math.floor(totalSeconds / 18);
  const cp1Time = Math.floor(totalSeconds * (1 / 3));  // 1/3rd of time
  const cp2Time = Math.floor(totalSeconds * (2 / 3));  // 2/3rd of time

  // 1. Fetch already submitted proofs from Supabase on mount
  useEffect(() => {
    const fetchSubmittedProofs = async () => {
      if (!task?.id) return;
      const { data, error } = await supabase
        .from('proofs')
        .select('checkpoint')
        .eq('task_id', task.id);

      if (data && !error) {
        setSubmittedCPs(data.map(p => p.checkpoint));
      }
    };
    fetchSubmittedProofs();
  }, [task?.id]);

  // 2. Timer countdown
  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  // 3. Real-time Window Calculations
  const elapsed = totalSeconds - timeLeft;
  const cp1Open = elapsed >= cp1Time - buffer && elapsed <= cp1Time + buffer;
  const cp2Open = elapsed >= cp2Time - buffer && elapsed <= cp2Time + buffer;
  const finalOpen = elapsed >= totalSeconds - buffer && elapsed <= totalSeconds;

  // 4. State Machine Logic helper for UI
  const getCheckpointStatus = (cpName, isOpen, targetTime) => {
    if (submittedCPs.includes(cpName)) return 'SUBMITTED';
    if (isOpen) return 'OPEN';
    
    // Check if window has passed
    const windowClose = cpName === 'final' ? totalSeconds : targetTime + buffer;
    if (elapsed > windowClose) return 'LOCKED';
    
    return 'UPCOMING';
  };

  // 5. Check if any checkpoint is currently open AND not yet submitted
  let currentActiveCheckpoint = null;
  if (cp1Open && !submittedCPs.includes('cp1')) currentActiveCheckpoint = 'cp1';
  else if (cp2Open && !submittedCPs.includes('cp2')) currentActiveCheckpoint = 'cp2';
  else if (finalOpen && !submittedCPs.includes('final')) currentActiveCheckpoint = 'final';

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper styles based on 3-States (+ Upcoming)
  const getCardStyle = (status) => {
    switch (status) {
      case 'SUBMITTED': return 'bg-green-100 border-2 border-green-500 text-green-800';
      case 'OPEN': return 'bg-yellow-100 border-2 border-yellow-500 text-yellow-900 animate-pulse';
      case 'LOCKED': return 'bg-red-100 border-2 border-red-300 text-red-700 opacity-60';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-purple-600 flex items-center justify-center">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 shadow-xl">
        <h1 className="text-3xl font-bold text-center mb-4">⏱️ {task?.description}</h1>
        
        <div className="text-6xl font-bold text-center text-blue-600 mb-8 font-mono">
          {formatTime(timeLeft)}
        </div>

        {/* Checkpoints Status Timeline */}
        <div className="space-y-3 mb-6">
          {/* Checkpoint 1 */}
          <div className={`p-4 rounded transition ${getCardStyle(getCheckpointStatus('cp1', cp1Open, cp1Time))}`}>
            <p className="font-bold flex justify-between">
              <span>📸 Checkpoint 1 (1/3rd Time)</span>
              <span className="font-mono">
                {getCheckpointStatus('cp1', cp1Open, cp1Time) === 'SUBMITTED' && '✅ SUBMITTED'}
                {getCheckpointStatus('cp1', cp1Open, cp1Time) === 'OPEN' && '⏳ OPEN NOW'}
                {getCheckpointStatus('cp1', cp1Open, cp1Time) === 'LOCKED' && '🔒 LOCKED (Missed)'}
                {getCheckpointStatus('cp1', cp1Open, cp1Time) === 'UPCOMING' && '💤 UPCOMING'}
              </span>
            </p>
            {getCheckpointStatus('cp1', cp1Open, cp1Time) === 'OPEN' && <p className="text-sm text-yellow-800 mt-1 font-semibold">👉 Submit your proof right now!</p>}
          </div>

          {/* Checkpoint 2 */}
          <div className={`p-4 rounded transition ${getCardStyle(getCheckpointStatus('cp2', cp2Open, cp2Time))}`}>
            <p className="font-bold flex justify-between">
              <span>📸 Checkpoint 2 (2/3rd Time)</span>
              <span className="font-mono">
                {getCheckpointStatus('cp2', cp2Open, cp2Time) === 'SUBMITTED' && '✅ SUBMITTED'}
                {getCheckpointStatus('cp2', cp2Open, cp2Time) === 'OPEN' && '⏳ OPEN NOW'}
                {getCheckpointStatus('cp2', cp2Open, cp2Time) === 'LOCKED' && '🔒 LOCKED (Missed)'}
                {getCheckpointStatus('cp2', cp2Open, cp2Time) === 'UPCOMING' && '💤 UPCOMING'}
              </span>
            </p>
            {getCheckpointStatus('cp2', cp2Open, cp2Time) === 'OPEN' && <p className="text-sm text-yellow-800 mt-1 font-semibold">👉 Submit your proof right now!</p>}
          </div>

          {/* Final Submission */}
          <div className={`p-4 rounded transition ${getCardStyle(getCheckpointStatus('final', finalOpen, totalSeconds))}`}>
            <p className="font-bold flex justify-between">
              <span>🎬 Final Submission (End Time)</span>
              <span className="font-mono">
                {getCheckpointStatus('final', finalOpen, totalSeconds) === 'SUBMITTED' && '✅ SUBMITTED'}
                {getCheckpointStatus('final', finalOpen, totalSeconds) === 'OPEN' && '⏳ OPEN NOW'}
                {getCheckpointStatus('final', finalOpen, totalSeconds) === 'LOCKED' && '🔒 LOCKED (Missed)'}
                {getCheckpointStatus('final', finalOpen, totalSeconds) === 'UPCOMING' && '💤 UPCOMING'}
              </span>
            </p>
            {getCheckpointStatus('final', finalOpen, totalSeconds) === 'OPEN' && <p className="text-sm text-blue-800 mt-1 font-semibold">👉 Submit your final task proof video!</p>}
          </div>
        </div>

        {/* Dynamic Action Button */}
        <button 
          onClick={() => {
            if (currentActiveCheckpoint) {
              setCurrentPage('proof');
            }
          }}
          disabled={!currentActiveCheckpoint}
          className="w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed mb-2 uppercase tracking-wide transition"
        >
          {currentActiveCheckpoint ? `📤 Upload ${currentActiveCheckpoint.toUpperCase()} Proof` : '⏳ Waiting for an Open Window...'}
        </button>

        <button 
          onClick={() => setCurrentPage('dashboard')}
          className="w-full bg-gray-400 text-white py-3 rounded font-bold hover:bg-gray-500 transition"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

export default TimerPage;