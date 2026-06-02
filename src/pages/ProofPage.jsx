import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function ProofPage({ user, task, setCurrentPage }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submittedCPs, setSubmittedCPs] = useState([]);
  const [timeLeft, setTimeLeft] = useState(task?.duration_seconds || 0);

  const totalSeconds = task?.duration_seconds || 0;
  const buffer = Math.floor(totalSeconds / 18);
  const cp1Time = Math.floor(totalSeconds * (1 / 3)); // Fixed calculation order bug
  const cp2Time = Math.floor(totalSeconds * (2 / 3));

  // 1. Sync timer countdown
  useEffect(() => {
    let interval = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. Load already submitted proofs to avoid duplicate submission bypass
  useEffect(() => {
    const fetchSubmittedProofs = async () => {
      if (!task?.id) return;
      const { data } = await supabase
        .from('proofs')
        .select('checkpoint')
        .eq('task_id', task.id);
      if (data) {
        setSubmittedCPs(data.map(p => p.checkpoint));
      }
    };
    fetchSubmittedProofs();
  }, [task?.id]);

  // 3. Evaluate exact window bounds
  const elapsed = totalSeconds - timeLeft;
  const cp1Open = elapsed >= cp1Time - buffer && elapsed <= cp1Time + buffer;
  const cp2Open = elapsed >= cp2Time - buffer && elapsed <= cp2Time + buffer;
  const finalOpen = elapsed >= totalSeconds - buffer && elapsed <= totalSeconds;

  // Determine which checkpoint is legitimately open and unsubmitted
  let currentCheckpoint = null;
  if (cp1Open && !submittedCPs.includes('cp1')) currentCheckpoint = 'cp1';
  else if (cp2Open && !submittedCPs.includes('cp2')) currentCheckpoint = 'cp2';
  else if (finalOpen && !submittedCPs.includes('final')) currentCheckpoint = 'final';

  const handleFileSelect = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const uploadProof = async () => {
    if (!selectedFile) {
      alert('Please select a file first!');
      return;
    }

    if (!currentCheckpoint) {
      alert('❌ Checkpoint window is closed or already submitted! Going back.');
      setCurrentPage('timer');
      return;
    }

    setUploading(true);
    try {
      const bucket = 'proofs';
      const fileName = `${task.id}/${currentCheckpoint}_${Date.now()}`;

      // Upload file asset to Storage
      const { error: uploadError } = await supabase
        .storage
        .from(bucket)
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Log database transaction details
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

      // If user uploads the final checkpoint proof, the entire task workflow shifts to pending evaluation
      if (currentCheckpoint === 'final') {
        await supabase
          .from('tasks')
          .update({ status: 'pending' })
          .eq('id', task.id);
        
        alert('🎉 System updated! Your final proof is locked in. Moving to review.');
        setCurrentPage('dashboard');
      } else {
        // For CP1 and CP2, route back to the running timer page
        setCurrentPage('timer');
      }
    } catch (error) {
      console.error('Error:', error);
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

  return (
    <div className="min-h-screen bg-purple-600">
      <div className="bg-gray-900 text-white p-4 flex justify-between items-center shadow-md">
        <h1 className="text-2xl font-bold">📤 Proof Submission Gateway</h1>
        <span className="font-mono text-yellow-400 bg-gray-800 px-3 py-1 rounded text-sm">
          Elapsed: {formatTime(elapsed)}
        </span>
      </div>

      <div className="max-w-2xl mx-auto mt-6 px-4 pb-10">
        <div className="bg-white rounded-lg p-8 mb-6 shadow-lg">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Task: {task?.description}</h2>

          {/* Context Window Info Alert Block */}
          <div className="bg-blue-50 p-4 rounded mb-6 border-l-4 border-blue-600">
            {currentCheckpoint ? (
              <>
                <p className="text-lg font-bold text-green-600">✅ {currentCheckpoint.toUpperCase()} WINDOW IS OPEN</p>
                <p className="text-sm text-gray-700 mt-2">Remaining Session Clock: <span className="font-bold text-blue-600">{formatTime(timeLeft)}</span></p>
                <p className="text-sm text-gray-500 mt-1">⚠️ Upload must be completed before this interval window shifts.</p>
              </>
            ) : (
              <>
                <p className="text-lg font-bold text-red-600">❌ No active checkpoint window open</p>
                <p className="text-sm text-gray-700 mt-2">This window has either passed or it is not time yet. Double submissions are locked.</p>
              </>
            )}
          </div>

          {/* Controlled File Upload Input Field */}
          <div className="mb-6">
            <label className="block text-sm font-bold mb-2 text-gray-700">
              Select {currentCheckpoint ? currentCheckpoint.toUpperCase() : 'Proof'} Document Asset
              {currentCheckpoint === 'final' ? ' (Required Format: Video)' : ' (Required Format: Photo)'}
            </label>
            <input 
              type="file" 
              accept={currentCheckpoint === 'final' ? 'video/*' : 'image/*'}
              onChange={handleFileSelect}
              disabled={!currentCheckpoint || uploading}
              className="w-full px-4 py-2 border rounded bg-gray-50 disabled:opacity-50 cursor-pointer"
            />
            {selectedFile && <p className="text-sm text-green-600 mt-1 font-semibold">✓ Ready: {selectedFile.name}</p>}
          </div>

          {/* Primary Action Button */}
          <button 
            onClick={uploadProof} 
            disabled={uploading || !currentCheckpoint || !selectedFile}
            className="w-full bg-green-600 text-white py-3 rounded font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition uppercase tracking-wide"
          >
            {uploading ? '⏳ Transmission Active...' : '📤 Deploy Proof to Cloud'}
          </button>

          <button 
            onClick={() => setCurrentPage('timer')}
            disabled={uploading}
            className="w-full bg-gray-400 text-white py-3 rounded font-bold hover:bg-gray-500 mt-2 transition"
          >
            Cancel and Return to Timer
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProofPage;