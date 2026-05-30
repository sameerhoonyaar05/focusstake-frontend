import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function ProofPage({ user, task, setCurrentPage }) {
  const [checkpoint1, setCheckpoint1] = useState(null);
  const [checkpoint2, setCheckpoint2] = useState(null);
  const [finalVideo, setFinalVideo] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e, checkpoint) => {
    const file = e.target.files[0];
    if (checkpoint === 1) setCheckpoint1(file);
    if (checkpoint === 2) setCheckpoint2(file);
    if (checkpoint === 'final') setFinalVideo(file);
  };

  const uploadProof = async () => {
    if (!checkpoint1 || !checkpoint2 || !finalVideo) {
      alert('All proofs required!');
      return;
    }

    setUploading(true);
    try {
      const bucket = 'proofs';

      const cp1Path = `${task.id}/checkpoint1_${Date.now()}`;
      const cp2Path = `${task.id}/checkpoint2_${Date.now()}`;
      const finalPath = `${task.id}/final_${Date.now()}`;

      await supabase.storage.from(bucket).upload(cp1Path, checkpoint1);
      await supabase.storage.from(bucket).upload(cp2Path, checkpoint2);
      await supabase.storage.from(bucket).upload(finalPath, finalVideo);

      await supabase
        .from('proofs')
        .insert([{
          task_id: task.id,
          user_id: user.id,
          checkpoint1_url: cp1Path,
          checkpoint2_url: cp2Path,
          final_video_url: finalPath
        }]);

      await supabase
        .from('tasks')
        .update({ status: 'completed' })
        .eq('id', task.id);

      alert('Proofs submitted! Awaiting admin review.');
      setCurrentPage('dashboard');
    } catch (error) {
      console.error('Error uploading:', error);
      alert('Error: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-purple-600">
      <div className="bg-gray-900 text-white p-4">
        <h1 className="text-2xl font-bold">Submit Proofs</h1>
      </div>

      <div className="max-w-2xl mx-auto mt-6 px-4">
        <div className="bg-white rounded-lg p-8 mb-6">
          <h2 className="text-xl font-bold mb-4">Task: {task?.description}</h2>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-bold mb-2">Checkpoint 1 Photo</label>
              <input type="file" accept="image/*" onChange={(e) => handleFileSelect(e, 1)} className="w-full px-4 py-2 border rounded" />
              {checkpoint1 && <p className="text-sm text-green-600 mt-1">✓ Selected</p>}
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">Checkpoint 2 Photo</label>
              <input type="file" accept="image/*" onChange={(e) => handleFileSelect(e, 2)} className="w-full px-4 py-2 border rounded" />
              {checkpoint2 && <p className="text-sm text-green-600 mt-1">✓ Selected</p>}
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">Final Video (REQUIRED)</label>
              <input type="file" accept="video/*" onChange={(e) => handleFileSelect(e, 'final')} className="w-full px-4 py-2 border rounded" />
              {finalVideo && <p className="text-sm text-green-600 mt-1">✓ Selected</p>}
            </div>
          </div>

          <button onClick={uploadProof} disabled={uploading} className="w-full bg-green-600 text-white py-3 rounded font-bold hover:bg-green-700 disabled:opacity-50">
            {uploading ? 'Uploading...' : 'Submit Proofs'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProofPage;