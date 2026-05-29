import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

function TimerPage({ user, task, setCurrentPage }) {
  const totalSeconds = task?.duration_seconds || (task?.duration_minutes * 60) || 180;
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const [isRunning, setIsRunning] = useState(true);
  const [uploadingCheckpoint, setUploadingCheckpoint] = useState(null);
  const [proofsDone, setProofsDone] = useState({ cp1: false, cp2: false, final: false });
  const fileInputRef = useRef(null);
  const [activeCheckpoint, setActiveCheckpoint] = useState(null);

  // Buffer ratio: totalSeconds / 18 (based on 180s → 10s buffer ratio)
  const buffer = Math.max(5, Math.floor(totalSeconds / 18));

  // Checkpoint times (seconds remaining when checkpoint hits)
  const cp1Time = Math.floor(totalSeconds * (2 / 3)); // 1/3 elapsed
  const cp2Time = Math.floor(totalSeconds * (1 / 3)); // 2/3 elapsed
  const finalTime = 0; // end

  // Windows (timeLeft values when window is open)
  const cp1WindowOpen = cp1Time + buffer;
  const cp1WindowClose = cp1Time - buffer;
  const cp2WindowOpen = cp2Time + buffer;
  const cp2WindowClose = cp2Time - buffer;
  const finalWindowOpen = buffer;

  const progressPercent = ((totalSeconds - timeLeft) / totalSeconds) * 100;

  // Check if currently in a checkpoint window
  const inCp1Window = timeLeft <= cp1WindowOpen && timeLeft >= cp1WindowClose && !proofsDone.cp1;
  const inCp2Window = timeLeft <= cp2WindowOpen && timeLeft >= cp2WindowClose && !proofsDone.cp2;
  const inFinalWindow = timeLeft <= finalWindowOpen;
  const taskComplete = timeLeft <= 0;

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatCountdown = (seconds) => {
    if (seconds <= 0) return 'Now!';
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  const handleProofUpload = async (checkpoint, file) => {
    if (!file) return;
    setUploadingCheckpoint(checkpoint);

    try {
      const timestamp = Date.now();
      const ext = file.type.includes('video') ? 'mp4' : 'jpg';
      const path = `${user.id}/${task.id}/${checkpoint}_${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('proofs')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('proofs').getPublicUrl(path);

      await supabase.from('proofs').insert([{
        task_id: task.id,
        user_id: user.id,
        checkpoint: checkpoint,
        proof_type: file.type.includes('video') ? 'video' : 'photo',
        proof_url: urlData.publicUrl,
        status: 'pending',
      }]);

      setProofsDone(prev => ({
        ...prev,
        [checkpoint === '1' ? 'cp1' : checkpoint === '2' ? 'cp2' : 'final']: true
      }));

      if (checkpoint === 'final') {
        await supabase.from('tasks').update({ status: 'completed' }).eq('id', task.id);
        setTimeout(() => setCurrentPage('dashboard'), 2000);
      }

      alert(`✅ ${checkpoint === 'final' ? 'Final video' : `Checkpoint ${checkpoint}`} proof submit ho gaya!`);
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploadingCheckpoint(null);
      setActiveCheckpoint(null);
    }
  };

  const triggerUpload = (checkpoint) => {
    setActiveCheckpoint(checkpoint);
    setTimeout(() => fileInputRef.current?.click(), 100);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && activeCheckpoint) {
      handleProofUpload(activeCheckpoint, file);
    }
    e.target.value = '';
  };

  const handleAbandon = async () => {
    if (window.confirm('❌ Kya aap sure hain? ₹' + task?.stake_amount + ' forfeit ho jayega!')) {
      await supabase.from('tasks').update({ status: 'failed' }).eq('id', task.id);
      setCurrentPage('dashboard');
    }
  };

  // Next checkpoint countdown
  const getNextCheckpointInfo = () => {
    if (!proofsDone.cp1 && timeLeft > cp1WindowOpen) {
      return { name: 'Checkpoint 1', timeUntilOpen: timeLeft - cp1WindowOpen };
    }
    if (!proofsDone.cp2 && timeLeft > cp2WindowOpen) {
      return { name: 'Checkpoint 2', timeUntilOpen: timeLeft - cp2WindowOpen };
    }
    if (!proofsDone.final && timeLeft > finalWindowOpen) {
      return { name: 'Final Video', timeUntilOpen: timeLeft - finalWindowOpen };
    }
    return null;
  };

  const nextCp = getNextCheckpointInfo();

  return (
    <div className="max-w-2xl mx-auto mt-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={activeCheckpoint === 'final' ? 'video/*' : 'image/*'}
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-1">⏱️ Task Timer</h1>
        <p className="text-gray-600 italic mb-1">"{task?.description}"</p>
        <p className="text-xs text-gray-400 mb-6">
          Buffer window: ±{buffer}s per checkpoint
        </p>

        {/* Main Timer */}
        <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-8 mb-6 text-center text-white shadow-xl">
          <p className="text-xs opacity-75 uppercase tracking-widest mb-2">Time Remaining</p>
          <div className="text-6xl font-bold font-mono tracking-wider">
            {formatTime(Math.max(0, timeLeft))}
          </div>
          <p className="text-xs opacity-75 mt-2">{totalSeconds}s total</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-1000 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Next Checkpoint Countdown */}
        {nextCp && !taskComplete && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 text-center">
            <p className="text-sm text-blue-700">
              ⏳ <strong>{nextCp.name}</strong> window opens in:{' '}
              <strong className="text-blue-900">{formatCountdown(nextCp.timeUntilOpen)}</strong>
            </p>
          </div>
        )}

        {/* Checkpoint Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">

          {/* Checkpoint 1 */}
          <div className={`p-3 rounded-lg text-center border-2 transition-all ${
            proofsDone.cp1 ? 'border-green-500 bg-green-50' :
            inCp1Window ? 'border-blue-500 bg-blue-50 animate-pulse' :
            'border-gray-200 bg-gray-50'
          }`}>
            <p className="text-lg mb-1">
              {proofsDone.cp1 ? '✅' : inCp1Window ? '📸' : '⏳'}
            </p>
            <p className="text-xs font-bold">CP 1</p>
            <p className="text-xs text-gray-500">Photo</p>
            {inCp1Window && !proofsDone.cp1 && (
              <button
                onClick={() => triggerUpload('1')}
                disabled={uploadingCheckpoint === '1'}
                className="mt-2 w-full bg-blue-600 text-white text-xs py-1 rounded font-bold hover:bg-blue-700 disabled:opacity-50"
              >
                {uploadingCheckpoint === '1' ? '⏳' : 'Upload!'}
              </button>
            )}
            {!inCp1Window && !proofsDone.cp1 && timeLeft < cp1WindowClose && (
              <p className="text-xs text-red-500 mt-1 font-bold">Missed!</p>
            )}
          </div>

          {/* Checkpoint 2 */}
          <div className={`p-3 rounded-lg text-center border-2 transition-all ${
            proofsDone.cp2 ? 'border-green-500 bg-green-50' :
            inCp2Window ? 'border-purple-500 bg-purple-50 animate-pulse' :
            'border-gray-200 bg-gray-50'
          }`}>
            <p className="text-lg mb-1">
              {proofsDone.cp2 ? '✅' : inCp2Window ? '📸' : '⏳'}
            </p>
            <p className="text-xs font-bold">CP 2</p>
            <p className="text-xs text-gray-500">Photo</p>
            {inCp2Window && !proofsDone.cp2 && (
              <button
                onClick={() => triggerUpload('2')}
                disabled={uploadingCheckpoint === '2'}
                className="mt-2 w-full bg-purple-600 text-white text-xs py-1 rounded font-bold hover:bg-purple-700 disabled:opacity-50"
              >
                {uploadingCheckpoint === '2' ? '⏳' : 'Upload!'}
              </button>
            )}
            {!inCp2Window && !proofsDone.cp2 && timeLeft < cp2WindowClose && (
              <p className="text-xs text-red-500 mt-1 font-bold">Missed!</p>
            )}
          </div>

          {/* Final Video */}
          <div className={`p-3 rounded-lg text-center border-2 transition-all ${
            proofsDone.final ? 'border-green-500 bg-green-50' :
            inFinalWindow ? 'border-red-500 bg-red-50 animate-pulse' :
            'border-gray-200 bg-gray-50'
          }`}>
            <p className="text-lg mb-1">
              {proofsDone.final ? '✅' : inFinalWindow ? '🎥' : '⏳'}
            </p>
            <p className="text-xs font-bold">Final</p>
            <p className="text-xs text-gray-500">Video</p>
            {inFinalWindow && !proofsDone.final && (
              <button
                onClick={() => triggerUpload('final')}
                disabled={uploadingCheckpoint === 'final'}
                className="mt-2 w-full bg-red-600 text-white text-xs py-1 rounded font-bold hover:bg-red-700 disabled:opacity-50"
              >
                {uploadingCheckpoint === 'final' ? '⏳' : 'Upload!'}
              </button>
            )}
          </div>
        </div>

        {/* Rules */}
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
          <p className="font-bold text-yellow-800 text-sm mb-2">📋 Rules:</p>
          <ul className="text-xs space-y-1 text-yellow-700">
            <li>✓ CP 1 ya CP 2 mein se koi ek photo submit karo (window mein)</li>
            <li>✓ Final video mandatory hai (last {buffer}s mein)</li>
            <li>✓ Window miss = proof submit nahi hoga!</li>
            <li>✓ Buffer: ±{buffer}s har checkpoint ke liye</li>
          </ul>
        </div>

        {/* Buttons */}
        {!taskComplete ? (
          <div className="flex gap-4">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`flex-1 py-3 rounded-lg font-bold text-white transition ${
                isRunning ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isRunning ? '⏸ Pause' : '▶ Resume'}
            </button>
            <button
              onClick={handleAbandon}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-bold transition"
            >
              ❌ Abandon
            </button>
          </div>
        ) : (
          <div className="text-center">
            {proofsDone.final ? (
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-2xl mb-2">🎉</p>
                <p className="font-bold text-green-700">Sab proofs submit ho gaye!</p>
                <p className="text-sm text-gray-600">Dashboard par redirect ho raha hai...</p>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <p className="text-2xl mb-2">⚠️</p>
                <p className="font-bold text-red-700">Timer khatam! Final video upload karo!</p>
                <button
                  onClick={() => triggerUpload('final')}
                  disabled={uploadingCheckpoint === 'final'}
                  className="mt-3 bg-red-600 text-white px-6 py-2 rounded font-bold hover:bg-red-700 disabled:opacity-50"
                >
                  {uploadingCheckpoint === 'final' ? '⏳ Uploading...' : '🎥 Upload Final Video'}
                </button>
              </div>
            )}
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-4">
          Stake: ₹{task?.stake_amount} | Status: {isRunning ? '🟢 Running' : '⏸ Paused'}
        </p>
      </div>
    </div>
  );
}

export default TimerPage;