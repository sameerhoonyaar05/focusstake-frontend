import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function AdminPage({ setCurrentPage }) {
  const [pendingTasks, setPendingTasks] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const handleApprove = async (taskId, userId, stakeAmount, userName, upiId) => {
    try {
      const refundAmount = stakeAmount - 1;

      if (!upiId) {
        alert(`❌ Is user ki UPI ID database mein nahi mili!`);
        return;
      }

      // UPI ID copy kar do
      await navigator.clipboard.writeText(upiId);

      // Confirmation dialog
      const userConfirmed = window.confirm(
        `📋 UPI ID Copy Ho Gayi Hai!\n\n` +
        `👤 User Name: ${userName}\n` +
        `💳 UPI ID: ${upiId}\n` +
        `💰 Refund Amount: ₹${refundAmount}\n\n` +
        `👉 Pehle apne PhonePe/GPay mein jaakar manually ₹${refundAmount} pay kar lijiye.\n` +
        `👉 Successful payment karne ke baad hi yahan 'OK' dabayein.`
      );

      if (!userConfirmed) return;

      // Status update karo
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ status: 'active' })
        .eq('id', taskId);

      if (updateError) throw updateError;

      // UI se remove karo
      setPendingTasks(prev => prev.filter(t => t.id !== taskId));
      
      alert('✅ Task successfully approved and closed!');

    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleReject = async (taskId, userId, stakeAmount) => {
    try {
      const remaining = stakeAmount - 1;
      const charityAmount = Math.floor(remaining * 0.6);
      const profitAmount = remaining - charityAmount;

      // Status update karo
      await supabase
        .from('tasks')
        .update({ status: 'failed' })
        .eq('id', taskId);

      // Charity log add karo
      await supabase.from('charity_log').insert([{
        task_id: taskId,
        user_id: userId,
        charity_amount: charityAmount,
        platform_profit: profitAmount
      }]);

      // UI se remove karo
      setPendingTasks(prev => prev.filter(t => t.id !== taskId));
      alert('❌ Task Rejected!\n₹' + charityAmount + ' donated to charity.');
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
            className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 font-semibold"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto mt-6 px-4 pb-10">
        <h2 className="text-2xl font-bold mb-6">
          Pending Approvals: <span className="text-blue-600">{pendingTasks.length}</span>
        </h2>

        {loading ? (
          <p className="text-center text-gray-600">Loading...</p>
        ) : pendingTasks.length === 0 ? (
          <p className="text-center text-gray-600 text-lg">✅ No pending tasks for review</p>
        ) : (
          <div className="space-y-4">
            {pendingTasks.map((task) => (
              <div 
                key={task.id} 
                className="bg-white rounded-lg p-6 shadow-lg border-l-4 border-blue-600 hover:shadow-xl transition"
              >
                {/* Task Title */}
                <h3 className="font-bold text-lg mb-4">
                  📝 {task.description}
                </h3>
                
                {/* User Info */}
                <div className="mb-4 pb-4 border-b">
                  <p className="text-gray-700">
                    <span className="font-semibold">👤 User:</span> {task.users?.name || 'Unknown'}
                  </p>
                </div>
                
                {/* Amount Details - HIGHLIGHT */}
                <div className="mb-6 bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-gray-700 mb-3">
                    💰 <span className="font-semibold">Stake Amount:</span> ₹{task.stake_amount}
                  </p>
                  <p className="text-xl font-bold text-green-600">
                    🟢 Refund Amount: <span className="text-2xl">₹{task.stake_amount - 1}</span>
                  </p>
                </div>
                
                {/* Buttons */}
                <div className="flex gap-3">
                  <button 
                    onClick={() => handleApprove(
                      task.id, 
                      task.user_id, 
                      task.stake_amount,
                      task.users?.name || 'User',
                      task.users?.upi_id
                    )} 
                    className="flex-1 bg-green-600 text-white px-4 py-3 rounded hover:bg-green-700 font-semibold transition"
                  >
                    ✅ Approve
                  </button>
                  <button 
                    onClick={() => handleReject(task.id, task.user_id, task.stake_amount)} 
                    className="flex-1 bg-red-600 text-white px-4 py-3 rounded hover:bg-red-700 font-semibold transition"
                  >
                    ❌ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPage;