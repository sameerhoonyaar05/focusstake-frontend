import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function TimerPage({ user, task, setCurrentPage }) {
  const [timeLeft, setTimeLeft] = useState(task?.duration_seconds || 0);
  const [isActive, setIsActive] = useState(true);
  const [submittedCPs, setSubmittedCPs] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const totalSeconds = task?.duration_seconds || 0;
  
  // 🔥 DYNAMIC ALGORITHM: Sameer's Balanced Buffer Formula
  const checkpointGap = totalSeconds / 3;
  const rawBuffer = 0.15 * checkpointGap;
  // Min 10 seconds, Max 60 seconds, baaki durations ke liye exactly 15% of Gap
  const buffer = Math.floor(Math.min(60, Math.max(10, rawBuffer))); 
  
  const cp1Time = Math.floor(totalSeconds * (1 / 3));  
  const cp2Time = Math.floor(totalSeconds * (2 / 3));  

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

  // State Machine Logic helper for UI
  const getCheckpointStatus = (cpName, isOpen, targetTime) => {
    if (submittedCPs.includes(cpName)) return 'SUBMITTED';
    if (isOpen) return 'OPEN';
    const windowClose = cpName === 'final' ? totalSeconds : targetTime + buffer;
    if (elapsed > windowClose) return 'LOCKED';
    return 'UPCOMING';
  };

  // Check which checkpoint is currently active for upload
  let currentActiveCheckpoint = null;
  if (cp1Open && !submittedCPs.includes('cp1')) currentActiveCheckpoint = 'cp1';
  else if (cp2Open && !submittedCPs.includes('cp2')) currentActiveCheckpoint = 'cp2';
  else if (finalOpen && !submittedCPs.includes('final')) currentActiveCheckpoint = 'final';

  const handleFileSelect = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  // 4. Upload Logic
  const uploadProof = async () => {
    if (!selectedFile) {
      alert('Please select a file first!');
      return;
    }

    if (!currentActiveCheckpoint) {
      alert('❌ Window closed! You missed this checkpoint.');
      return;
    }

    setUploading(true);
    try {
      const bucket = 'proofs';
      const fileName = `${task.id}/${currentActiveCheckpoint}_${Date.now()}`;

      // Storage Upload
      const { error: uploadError } = await supabase
        .storage
        .from(bucket)
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // DB Insert
      const proofData = {
        task_id: task.id,
        user_id: user.id,
        checkpoint: currentActiveCheckpoint,
        proof_url: fileName,
        submitted_at: new Date().toISOString()
      };

      const { error: dbError } = await supabase
        .from('proofs')
        .insert([proofData]);

      if (dbError) throw dbError;

      alert(`✅ ${currentActiveCheckpoint.toUpperCase()} proof submitted successfully!`);
      setSubmittedCPs(prev => [...prev, currentActiveCheckpoint]);
      setSelectedFile(null);

      // If final checkpoint is done, finish task
      if (currentActiveCheckpoint === 'final') {
        await supabase
          .from('tasks')
          .update({ status: 'pending' })
          .eq('id', task.id);
        
        alert('🎉 All done! Task submitted for Admin Review.');
        setCurrentPage('dashboard');
      }
    } catch (error) {
      console.error(error);
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCardStyle = (status) => {
    switch (status) {
      case 'SUBMITTED': return 'bg-green-100 border-2 border-green-500 text-green-800';
      case 'OPEN': return 'bg-yellow-100 border-2 border-yellow-500 text-yellow-900 animate-pulse';
      case 'LOCKED': return 'bg-red-100 border-2 border-red-200 text-red-700 opacity-60';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-purple-600 p-4 flex flex-col items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full shadow-xl">
        <h1 className="text-2xl font-bold text-center mb-2">⏱️ {task?.description}</h1>
        
        <div className="text-5xl font-bold text-center text-blue-600 mb-4 font-mono">
          {formatTime(timeLeft)}
        </div>

        {/* Debug Info for Admin/Testing */}
        <div className="text-center mb-4">
          <span className="text-xs bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-semibold">
            ⚙️ Active Buffer: {buffer} seconds
          </span>
        </div>

        {/* Checkpoints List */}
        <div className="space-y-3 mb-6">
          {['cp1', 'cp2', 'final'].map((cp, idx) => {
            const isOpen = cp === 'cp1' ? cp1Open : cp === 'cp2' ? cp2Open : finalOpen;
            const target = cp === 'cp1' ? cp1Time : cp === 'cp2' ? cp2Time : totalSeconds;
            const status = getCheckpointStatus(cp, isOpen, target);
            return (
              <div key={cp} className={`p-3 rounded transition ${getCardStyle(status)}`}>
                <p className="font-bold flex justify-between text-sm">
                  <span>📸 Checkpoint {idx + 1}</span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-white shadow-sm">{status}</span>
                </p>
              </div>
            );
          })}
        </div>

        {/* Live Upload Section */}
        {currentActiveCheckpoint ? (
          <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-400 mb-4">
            <p className="text-sm font-bold text-blue-800 mb-2 uppercase">
              🚀 {currentActiveCheckpoint.toUpperCase()} Window is Active!
            </p>
            <input 
              type="file" 
              accept={currentActiveCheckpoint === 'final' ? 'video/*' : 'image/*'}
              onChange={handleFileSelect}
              disabled={uploading}
              className="w-full text-xs block mb-3 p-1 border rounded bg-white"
            />
            <button
              onClick={uploadProof}
              disabled={uploading || !selectedFile}
              className="w-full bg-green-600 text-white py-2 rounded font-bold text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {uploading ? '⏳ Uploading...' : `Submit ${currentActiveCheckpoint.toUpperCase()} Proof`}
            </button>
          </div>
        ) : (
          <div className="bg-gray-100 text-gray-600 text-center py-4 rounded-lg text-sm font-semibold mb-4 border border-dashed border-gray-300">
            ⏳ Waiting for checkpoint window to open...
          </div>
        )}

        <button 
          onClick={() => setCurrentPage('dashboard')}
          className="w-full bg-gray-400 text-white py-2 rounded font-bold text-sm hover:bg-gray-500 transition"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

export default TimerPage;