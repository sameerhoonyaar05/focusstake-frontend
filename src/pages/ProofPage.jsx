import { useState } from 'react';
import { supabase } from '../supabaseClient';

function ProofPage({ user, task, setCurrentPage }) {
  const [checkpoint1Photo, setCheckpoint1Photo] = useState(null);
  const [checkpoint2Photo, setCheckpoint2Photo] = useState(null);
  const [finalVideo, setFinalVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState('');

  const uploadToSupabase = async (file, bucket, path) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return urlData.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!checkpoint1Photo && !checkpoint2Photo) {
        throw new Error('Kam se kam 1 checkpoint photo upload karo!');
      }

      if (!finalVideo) {
        throw new Error('Final video mandatory hai!');
      }

      const timestamp = Date.now();

      // Upload Checkpoint 1 Photo
      if (checkpoint1Photo) {
        setUploadProgress('Checkpoint 1 photo upload ho rahi hai...');
        const photoUrl = await uploadToSupabase(
          checkpoint1Photo,
          'proofs',
          `${user.id}/${task.id}/checkpoint1_${timestamp}.jpg`
        );

        await supabase.from('proofs').insert([{
          task_id: task.id,
          user_id: user.id,
          checkpoint: '1',
          proof_type: 'photo',
          proof_url: photoUrl,
          status: 'pending',
        }]);
      }

      // Upload Checkpoint 2 Photo
      if (checkpoint2Photo) {
        setUploadProgress('Checkpoint 2 photo upload ho rahi hai...');
        const photoUrl = await uploadToSupabase(
          checkpoint2Photo,
          'proofs',
          `${user.id}/${task.id}/checkpoint2_${timestamp}.jpg`
        );

        await supabase.from('proofs').insert([{
          task_id: task.id,
          user_id: user.id,
          checkpoint: '2',
          proof_type: 'photo',
          proof_url: photoUrl,
          status: 'pending',
        }]);
      }

      // Upload Final Video
      setUploadProgress('Final video upload ho raha hai... (time lag sakta hai)');
      const videoUrl = await uploadToSupabase(
        finalVideo,
        'proofs',
        `${user.id}/${task.id}/final_video_${timestamp}.mp4`
      );

      await supabase.from('proofs').insert([{
        task_id: task.id,
        user_id: user.id,
        checkpoint: 'final',
        proof_type: 'video',
        proof_url: videoUrl,
        status: 'pending',
      }]);

      // Update task status
      await supabase
        .from('tasks')
        .update({ status: 'completed' })
        .eq('id', task.id);

      setUploadProgress('');
      setSubmitted(true);

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message);
      setUploadProgress('');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-7xl mb-6">🎉</div>
          <h1 className="text-3xl font-bold mb-4 text-green-600">Proofs Submit Ho Gaye!</h1>
          <p className="text-gray-600 mb-8">
            Admin tumhari video review karega aur 24 hours mein decision lega.
          </p>

          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-8 text-left">
            <p className="font-bold text-green-800 mb-2">🎯 Aage Kya Hoga?</p>
            <ul className="space-y-2 text-sm text-green-700">
              <li>✓ Admin video 2X speed mein dekha</li>
              <li>✓ Approve hone par: ₹{task?.stake_amount - 1} refund tumhare UPI mein</li>
              <li>✓ Karma points tumhare account mein add honge</li>
              <li>✓ Platform fee: ₹1 only</li>
            </ul>
          </div>

          <button
            onClick={() => setCurrentPage('dashboard')}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition"
          >
            Dashboard Par Jao →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-2">📸 Proof Submit Karo</h1>
        <p className="text-gray-600 mb-2 italic">"{task?.description}"</p>
        <p className="text-sm text-gray-500 mb-6">Stake: ₹{task?.stake_amount}</p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            ❌ {error}
          </div>
        )}

        {uploadProgress && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-6 animate-pulse">
            ⏳ {uploadProgress}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Checkpoint 1 */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-400 transition">
            <div className="flex items-center mb-3">
              <span className="text-2xl mr-2">📷</span>
              <div>
                <h3 className="font-bold">Checkpoint 1 Photo</h3>
                <p className="text-xs text-gray-500">Optional - 1/3 time par</p>
              </div>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCheckpoint1Photo(e.target.files[0])}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {checkpoint1Photo && (
              <p className="text-green-600 mt-2 text-sm font-medium">✅ {checkpoint1Photo.name}</p>
            )}
          </div>

          {/* Checkpoint 2 */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-400 transition">
            <div className="flex items-center mb-3">
              <span className="text-2xl mr-2">📷</span>
              <div>
                <h3 className="font-bold">Checkpoint 2 Photo</h3>
                <p className="text-xs text-gray-500">Optional - 2/3 time par</p>
              </div>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCheckpoint2Photo(e.target.files[0])}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {checkpoint2Photo && (
              <p className="text-green-600 mt-2 text-sm font-medium">✅ {checkpoint2Photo.name}</p>
            )}
          </div>

          {/* Final Video */}
          <div className="border-2 border-dashed border-red-300 rounded-lg p-6 bg-red-50 hover:border-red-500 transition">
            <div className="flex items-center mb-3">
              <span className="text-2xl mr-2">🎥</span>
              <div>
                <h3 className="font-bold text-red-700">Final Video <span className="text-red-500">(REQUIRED)</span></h3>
                <p className="text-xs text-gray-500">Task completion ka video proof</p>
              </div>
            </div>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setFinalVideo(e.target.files[0])}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-red-100 file:text-red-700 hover:file:bg-red-200"
              required
            />
            {finalVideo && (
              <p className="text-green-600 mt-2 text-sm font-medium">✅ {finalVideo.name}</p>
            )}
          </div>

          {/* Requirements */}
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <p className="font-bold text-yellow-800 mb-2">📋 Requirements:</p>
            <ul className="text-sm space-y-1 text-yellow-700">
              <li>✓ Checkpoint 1 ya 2 mein se koi ek photo zaroori</li>
              <li>✓ Final video mandatory hai</li>
              <li>✓ Clear visibility honi chahiye</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-4 rounded-lg font-bold hover:bg-green-700 transition disabled:opacity-50 text-lg"
          >
            {loading ? '⏳ Uploading...' : '✅ Submit All Proofs'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ProofPage;