import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function AdminPage({ setCurrentPage }) {
  const [pendingTasks, setPendingTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProofModal, setSelectedProofModal] = useState(null);
  const [proofFiles, setProofFiles] = useState({});

  useEffect(() => {
    fetchPendingTasks();
  }, []);

  const fetchPendingTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          description,
          stake_amount,
          status,
          user_id,
          created_at,
          users(name, upi_id)
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingTasks(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProofFiles = async (taskId) => {
    try {
      const { data, error } = await supabase
        .from('proofs')
        .select('*')
        .eq('task_id', taskId);

      if (error) throw error;

      const proofs = {};
      for (const proof of data) {
        const { data: fileData } = supabase
          .storage
          .from('proofs')
          .getPublicUrl(proof.proof_url);
        
        proofs[proof.checkpoint] = fileData.publicUrl;
      }
      setProofFiles(proofs);
    } catch (error) {
      console.error('Error fetching proofs:', error);
    }
  };

  const handleViewProof = async (taskId) => {
    await fetchProofFiles(taskId);
    setSelectedProofModal(taskId);
  };

  const handleApprove = async (taskId, userId, stakeAmount, userName, upiId) => {
    try {
      const refundAmount = stakeAmount - 1;

      if (!upiId) {
        alert(`❌ User ki UPI ID nahi mili!`);
        return;
      }

      await navigator.clipboard.writeText(upiId);

      const userConfirmed = window.confirm(
        `📋 UPI ID Copy Ho Gayi Hai!\n\n` +
        `👤 User: ${userName}\n` +
        `💳 UPI: ${upiId}\n` +
        `💰 Refund: ₹${refundAmount}\n\n` +
        `👉 PhonePe/GPay mein manually ₹${refundAmount} pay kar de.\n` +
        `👉 Payment ke baad OK dabao.`
      );

      if (!userConfirmed) return;

      const { error } = await supabase
        .from('tasks')
        .update({ status: 'active' })
        .eq('id', taskId);

      if (error) throw error;

      setPendingTasks(prev => prev.filter(t => t.id !== taskId));
      alert('✅ Task approved!');
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleReject = async (taskId, userId, stakeAmount) => {
    try {
      const remaining = stakeAmount - 1;
      const charityAmount = Math.floor(remaining * 0.6);

      await supabase
        .from('tasks')
        .update({ status: 'failed' })
        .eq('id', taskId);

      await supabase.from('charity_log').insert([{
        task_id: taskId,
        user_id: userId,
        charity_amount: charityAmount,
        platform_profit: remaining - charityAmount
      }]);

      setPendingTasks(prev => prev.filter(t => t.id !== taskId));
      alert('❌ Task rejected!');
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gray-900 text-white p-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <button 
            onClick={() => setCurrentPage('dashboard')} 
            className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
          >
            Back
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto mt-6 px-4 pb-10">
        <h2 className="text-2xl font-bold mb-6">
          Pending Approvals: <span className="text-blue-600">{pendingTasks.length}</span>
        </h2>

        {loading ? (
          <p>Loading...</p>
        ) : pendingTasks.length === 0 ? (
          <p className="text-center text-gray-600 text-lg">✅ No pending tasks</p>
        ) : (
          <div className="space-y-4">
            {pendingTasks.map((task) => (
              <div key={task.id} className="bg-white rounded-lg p-6 shadow-lg border-l-4 border-blue-600">
                <h3 className="font-bold text-lg mb-4">📝 {task.description}</h3>
                
                <div className="mb-4 pb-4 border-b">
                  <p className="text-gray-700">
                    <span className="font-semibold">👤 User:</span> {task.users?.name || 'Unknown'}
                  </p>
                </div>
                
                <div className="mb-6 bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-gray-700 mb-3">
                    💰 <span className="font-semibold">Stake:</span> ₹{task.stake_amount}
                  </p>
                  <p className="text-xl font-bold text-green-600">
                    🟢 Refund: ₹{task.stake_amount - 1}
                  </p>
                </div>

                {/* Proof View Button */}
                <button
                  onClick={() => handleViewProof(task.id)}
                  className="w-full bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 font-semibold mb-3"
                >
                  👁️ View Proofs
                </button>
                
                {/* Approve/Reject Buttons */}
                <div className="flex gap-3">
                  <button 
                    onClick={() => handleApprove(task.id, task.user_id, task.stake_amount, task.users?.name, task.users?.upi_id)} 
                    className="flex-1 bg-green-600 text-white px-4 py-3 rounded hover:bg-green-700 font-semibold"
                  >
                    ✅ Approve
                  </button>
                  <button 
                    onClick={() => handleReject(task.id, task.user_id, task.stake_amount)} 
                    className="flex-1 bg-red-600 text-white px-4 py-3 rounded hover:bg-red-700 font-semibold"
                  >
                    ❌ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Proof Modal */}
      {selectedProofModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-gray-900 text-white p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">📸 Task Proofs</h2>
              <button 
                onClick={() => setSelectedProofModal(null)}
                className="text-2xl hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {proofFiles.cp1 && (
                <div>
                  <p className="font-bold mb-2">📸 Checkpoint 1</p>
                  <img src={proofFiles.cp1} alt="CP1" className="w-full rounded max-h-48 object-cover" />
                </div>
              )}
              {proofFiles.cp2 && (
                <div>
                  <p className="font-bold mb-2">📸 Checkpoint 2</p>
                  <img src={proofFiles.cp2} alt="CP2" className="w-full rounded max-h-48 object-cover" />
                </div>
              )}
              {proofFiles.final && (
                <div>
                  <p className="font-bold mb-2">🎬 Final Video</p>
                  <video src={proofFiles.final} controls className="w-full rounded max-h-48" />
                </div>
              )}
              {Object.keys(proofFiles).length === 0 && (
                <p className="text-center text-gray-600">No proofs found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPage;