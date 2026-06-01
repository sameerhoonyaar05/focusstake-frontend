import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function ProofPage({ user, task, setCurrentPage }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [currentCheckpoint, setCurrentCheckpoint] = useState(null);
  const [checkpointStatus, setCheckpointStatus] = useState({});
  const [timeLeft, setTimeLeft] = useState(task?.duration_seconds || 0);

  const totalSeconds = task?.duration_seconds || 0;
  const buffer = Math.floor(totalSeconds / 18);
  const cp1Time = Math.floor(totalSeconds * (2 / 3));
  const cp2Time = Math.floor(totalSeconds * (1 / 3));

  // Timer
  useEffect(() => {
    let interval = setInterval(() => {
      setTimeLeft(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check current checkpoint window
  useEffect(() => {
    const elapsed = totalSeconds - timeLeft;
    
    const cp1Open = elapsed >= cp1Time - buffer && elapsed <= cp1Time + buffer;
    const cp2Open = elapsed >= cp2Time - buffer && elapsed <= cp2Time + buffer;
    const finalOpen = timeLeft >= 0 && timeLeft <= buffer;

    if (cp1Open) setCurrentCheckpoint('cp1');
    else if (cp2Open) setCurrentCheckpoint('cp2');
    else if (finalOpen) setCurrentCheckpoint('final');
    else setCurrentCheckpoint(null);

    setCheckpointStatus({ cp1Open, cp2Open, finalOpen });
  }, [timeLeft]);

  const handleFileSelect = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const uploadProof = async () => {
    if (!selectedFile) {
      alert('Please select a file!');
      return;
    }

    // Validate checkpoint window
    if (!currentCheckpoint) {
      alert('❌ Checkpoint window is closed! Please wait for the next checkpoint.');
      return;
    }

    setUploading(true);
    try {
      const bucket = 'proofs';
      const fileName = `${task.id}/${currentCheckpoint}_${Date.now()}`;

      // Upload to storage
      const { error: uploadError } = await supabase
        .storage
        .from(bucket)
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Save to database
      const proofData = {
        task_id: task.id,
        user_id: user.id,
        checkpoint: currentCheckpoint,
        proof_url: fileName,
        submitted_at: new Date().toISOString()
      };

      const { error: dbError } = await supabase
        .from('proofs')
        .insert([proofData]);

      if (dbError) throw dbError;

      alert(`✅ ${currentCheckpoint.toUpperCase()} proof submitted successfully!`);
      setSelectedFile(null);

      // Check if all proofs submitted
      const { data: allProofs } = await supabase
        .from('proofs')
        .select('checkpoint')
        .eq('task_id', task.id);

      const submittedCheckpoints = allProofs?.map(p => p.checkpoint) || [];
      if (submittedCheckpoints.includes('cp1') && submittedCheckpoints.includes('cp2') && submittedCheckpoints.includes('final')) {
        // All proofs submitted
        await supabase
          .from('tasks')
          .update({ status: 'completed' })
          .eq('id', task.id);
        
        alert('🎉 All proofs submitted! Task completed.');
        setCurrentPage('dashboard');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error: ' + error.message);
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

  return (
    <div className="min-h-screen bg-purple-600">
      <div className="bg-gray-900 text-white p-4">
        <h1 className="text-2xl font-bold">📤 Submit Proof</h1>
      </div>

      <div className="max-w-2xl mx-auto mt-6 px-4 pb-10">
        <div className="bg-white rounded-lg p-8 mb-6">
          <h2 className="text-xl font-bold mb-4">Task: {task?.description}</h2>

          {/* Checkpoint Status */}
          <div className="bg-blue-50 p-4 rounded mb-6 border-l-4 border-blue-600">
            {currentCheckpoint ? (
              <>
                <p className="text-lg font-bold text-green-600">✅ {currentCheckpoint.toUpperCase()} Window is OPEN</p>
                <p className="text-sm text-gray-700 mt-2">Time left: <span className="font-bold text-blue-600">{formatTime(timeLeft)}</span></p>
                <p className="text-sm text-gray-700">⏰ Window closes in {buffer} seconds</p>
              </>
            ) : (
              <>
                <p className="text-lg font-bold text-red-600">❌ No checkpoint window open</p>
                <p className="text-sm text-gray-700 mt-2">Please wait for the next checkpoint...</p>
              </>
            )}
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-bold mb-2">
              Select {currentCheckpoint ? currentCheckpoint.toUpperCase() : 'Proof'} File
              {currentCheckpoint === 'final' ? ' (Video)' : ' (Photo)'}
            </label>
            <input 
              type="file" 
              accept={currentCheckpoint === 'final' ? 'video/*' : 'image/*'}
              onChange={handleFileSelect}
              disabled={!currentCheckpoint}
              className="w-full px-4 py-2 border rounded disabled:opacity-50"
            />
            {selectedFile && <p className="text-sm text-green-600 mt-1">✓ {selectedFile.name} selected</p>}
          </div>

          {/* Submit Button */}
          <button 
            onClick={uploadProof} 
            disabled={uploading || !currentCheckpoint || !selectedFile}
            className="w-full bg-green-600 text-white py-3 rounded font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? '⏳ Uploading...' : '📤 Submit Proof'}
          </button>

          <button 
            onClick={() => setCurrentPage('timer')}
            className="w-full bg-gray-400 text-white py-3 rounded font-bold hover:bg-gray-500 mt-2"
          >
            Back to Timer
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProofPage;