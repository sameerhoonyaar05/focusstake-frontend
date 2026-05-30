import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function TimerPage({ user, task, setCurrentPage }) {
  const [timeLeft, setTimeLeft] = useState(task?.duration_seconds || 0);
  const [isActive, setIsActive] = useState(true);
  const [checkpoint1Window, setCheckpoint1Window] = useState(false);
  const [checkpoint2Window, setCheckpoint2Window] = useState(false);
  const [finalWindow, setFinalWindow] = useState(false);

  const totalSeconds = task?.duration_seconds || 0;
  const buffer = Math.floor(totalSeconds / 18);
  const cp1Time = Math.floor(totalSeconds * (2 / 3));
  const cp2Time = Math.floor(totalSeconds * (1 / 3));

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

  useEffect(() => {
    const elapsed = totalSeconds - timeLeft;
    setCheckpoint1Window(elapsed >= cp1Time - buffer && elapsed <= cp1Time + buffer);
    setCheckpoint2Window(elapsed >= cp2Time - buffer && elapsed <= cp2Time + buffer);
    setFinalWindow(timeLeft >= 0 && timeLeft <= buffer);
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
        <h1 className="text-3xl font-bold text-center mb-4">{task?.description}</h1>
        
        <div className="text-6xl font-bold text-center text-blue-600 mb-8 font-mono">
          {formatTime(timeLeft)}
        </div>

        <div className="space-y-3 mb-6">
          <div className={`p-4 rounded ${checkpoint1Window ? 'bg-green-100 border-2 border-green-500' : 'bg-gray-100'}`}>
            <p className="font-bold">Checkpoint 1 {checkpoint1Window ? '✓ OPEN' : '❌ Closed'}</p>
          </div>
          <div className={`p-4 rounded ${checkpoint2Window ? 'bg-green-100 border-2 border-green-500' : 'bg-gray-100'}`}>
            <p className="font-bold">Checkpoint 2 {checkpoint2Window ? '✓ OPEN' : '❌ Closed'}</p>
          </div>
          <div className={`p-4 rounded ${finalWindow ? 'bg-green-100 border-2 border-green-500' : 'bg-gray-100'}`}>
            <p className="font-bold">Final Submission {finalWindow ? '✓ OPEN' : '❌ Closed'}</p>
          </div>
        </div>

        <button 
          onClick={() => { setCurrentPage('proof'); }} 
          disabled={!checkpoint1Window && !checkpoint2Window && !finalWindow}
          className="w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 disabled:opacity-50"
        >
          Submit Proof
        </button>

        <button 
          onClick={() => setCurrentPage('dashboard')}
          className="w-full bg-gray-400 text-white py-3 rounded font-bold hover:bg-gray-500 mt-2"
        >
          Back
        </button>
      </div>
    </div>
  );
}

export default TimerPage;