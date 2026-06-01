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
        .select('*')
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

  const handleApprove = async (taskId, userId, stakeAmount) => {
    try {
      const refundAmount = stakeAmount - 1;

      // Step 1: Pehle User ki UPI detail nikalo (Abhi database update nahi karenge!)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('upi_id, name')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      if (!userData?.upi_id) {
        alert(`❌ Is user ki UPI ID database mein nahi mili!`);
        return;
      }

      // Step 2: UPI ID ko background mein copy kar lo
      await navigator.clipboard.writeText(userData.upi_id);

      // Step 3: Admin se Confirmation lo (Jab tak aap OK nahi karoge, task list se nahi hatega)
      const userConfirmed = window.confirm(
        `📋 UPI ID Copy Ho Gayi Hai!\n\n` +
        `User Name: ${userData.name}\n` +
        `UPI ID: ${userData.upi_id}\n` +
        `Refund Amount: ₹${refundAmount}\n\n` +
        `👉 Pehle apne PhonePe/GPay mein jaakar manually ₹${refundAmount} pay kar lijiye.\n` +
        `👉 Successfull payment karne ke baad hi yahan 'OK' dabayein taaki task approve ho sake.`
      );

      // Agar aapne 'Cancel' dabaya ya abhi pay nahi kiya, toh code yahi ruk jayega (Task safe rahega)
      if (!userConfirmed) return;

      // Step 4: Ab jab aapne manually pay kar diya hai, tab Database mein status badlo
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ status: 'active' })
        .eq('id', taskId);

      if (updateError) throw updateError;

      // Step 5: Sab kuch successfully hone ke baad ab UI se task ko hatao
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

      // Update status to failed
      await supabase
        .from('tasks')
        .update({ status: 'failed' })
        .eq('id', taskId);

      // Add charity log
      await supabase.from('charity_log').insert([{
        task_id: taskId,
        user_id: userId,
        charity_amount: charityAmount,
        platform_profit: profitAmount
      }]);

      setPendingTasks(prev => prev.filter(t => t.id !== taskId));
      alert('❌ Task Rejected!\n₹' + charityAmount + ' donated to charity.');
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-gray-900 text-white p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <button onClick={() => setCurrentPage('dashboard')} className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700">Back to Dashboard</button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto mt-6 px-4 pb-10">
        <h2 className="text-xl font-bold mb-4">Pending Approvals: {pendingTasks.length}</h2>

        {loading ? (
          <p>Loading...</p>
        ) : pendingTasks.length === 0 ? (
          <p className="text-gray-600">No pending tasks</p>
        ) : (
          <div className="space-y-4">
            {pendingTasks.map((task) => (
              <div key={task.id} className="bg-white rounded-lg p-6 shadow">
                <h3 className="font-bold text-lg mb-2">{task.description}</h3>
                <p className="text-gray-600 mb-4">Stake: ₹{task.stake_amount}</p>
                <div className="flex gap-2">
                  <button onClick={() => handleApprove(task.id, task.user_id, task.stake_amount)} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Approve</button>
                  <button onClick={() => handleReject(task.id, task.user_id, task.stake_amount)} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">Reject</button>
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