import { useState, useEffect } from 'react';

function TimerPage({ user, task, setCurrentPage }) {
  const [timeLeft, setTimeLeft] = useState(task?.duration_seconds || 0);
  const [isActive, setIsActive] = useState(true);
  const [currentCheckpoint, setCurrentCheckpoint] = useState(null);
  const [checkpointWindows, setCheckpointWindows] = useState({
    cp1: false,
    cp2: false,
    final: false
  });

  const totalSeconds = task?.duration_seconds || 0;
  const buffer = Math.floor(totalSeconds / 18);
  const cp1Time = Math.floor(totalSeconds * (2 / 3));
  const cp2Time = Math.floor(totalSeconds * (1 / 3));

  // Timer countdown
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
  }, [isActive]);

  // Checkpoint window logic
  useEffect(() => {
    const elapsed = totalSeconds - timeLeft;
    
    const cp1Open = elapsed >= cp1Time - buffer && elapsed <= cp1Time + buffer;
    const cp2Open = elapsed >= cp2Time - buffer && elapsed <= cp2Time + buffer;
    const finalOpen = timeLeft >= 0 && timeLeft <= buffer;

    setCheckpointWindows({
      cp1: cp1Open,
      cp2: cp2Open,
      final: finalOpen
    });

    // Set current checkpoint
    if (cp1Open) setCurrentCheckpoint('cp1');
    else if (cp2Open) setCurrentCheckpoint('cp2');
    else if (finalOpen) setCurrentCheckpoint('final');
    else setCurrentCheckpoint(null);
  }, [timeLeft, totalSeconds, cp1Time, cp2Time, buffer]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-purple-600 flex items-center justify-center">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
        <h1 className="text-3xl font-bold text-center mb-4">⏱️ {task?.description}</h1>
        
        <div className="text-6xl font-bold text-center text-blue-600 mb-8 font-mono">
          {formatTime(timeLeft)}
        </div>

        {/* Checkpoints Status */}
        <div className="space-y-3 mb-6">
          <div className={`p-4 rounded transition ${checkpointWindows.cp1 ? 'bg-green-100 border-2 border-green-500' : 'bg-gray-100'}`}>
            <p className="font-bold">📸 Checkpoint 1 {checkpointWindows.cp1 ? '✅ OPEN' : '❌ Closed'}</p>
            {checkpointWindows.cp1 && <p className="text-sm text-green-700">👉 Submit your proof now!</p>}
          </div>

          <div className={`p-4 rounded transition ${checkpointWindows.cp2 ? 'bg-green-100 border-2 border-green-500' : 'bg-gray-100'}`}>
            <p className="font-bold">📸 Checkpoint 2 {checkpointWindows.cp2 ? '✅ OPEN' : '❌ Closed'}</p>
            {checkpointWindows.cp2 && <p className="text-sm text-green-700">👉 Submit your proof now!</p>}
          </div>

          <div className={`p-4 rounded transition ${checkpointWindows.final ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-100'}`}>
            <p className="font-bold">🎬 Final Submission {checkpointWindows.final ? '✅ OPEN' : '❌ Closed'}</p>
            {checkpointWindows.final && <p className="text-sm text-blue-700">👉 Submit your final video!</p>}
          </div>
        </div>

        {/* Submit Button */}
        <button 
          onClick={() => {
            if (currentCheckpoint) {
              setCurrentPage('proof');
            }
          }}
          disabled={!currentCheckpoint}
          className="w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed mb-2"
        >
          {currentCheckpoint ? `📤 Submit ${currentCheckpoint.toUpperCase()} Proof` : '⏳ Waiting for checkpoint...'}
        </button>

        <button 
          onClick={() => setCurrentPage('dashboard')}
          className="w-full bg-gray-400 text-white py-3 rounded font-bold hover:bg-gray-500"
        >
          Back
        </button>
      </div>
    </div>
  );
}

export default TimerPage;