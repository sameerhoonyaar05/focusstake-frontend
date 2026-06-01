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
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingTasks(data || []);
    } catch (error) {
      console.error('Error fetching pending tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (taskId, userId, stakeAmount) => {
  try {
    const refundAmount = stakeAmount - 1;

    // Step 1: Task status update karo
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ status: 'complete' })
      .eq('id', taskId);
    if (updateError) throw updateError;

    // Step 2: Payment record insert karo
    const { error: paymentError } = await supabase
      .from('payments')
      .insert([{
        task_id: taskId,
        user_id: userId,
        status: 'refunded',
        amount: refundAmount
      }]);
    if (paymentError) throw paymentError;

    // Step 3: User ka UPI ID fetch karo
    const { data: userData } = await supabase
      .from('users')
      .select('upi_id, name')
      .eq('id', userId)
      .single();

    const upiId = userData?.upi_id;
    const userName = userData?.name;

    // Step 4: UI se hata do
    setPendingTasks(prev => prev.filter(t => t.id !== taskId));

    // Step 5: UPI Payment apps open karo
    if (upiId) {
      const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(userName)}&am=${refundAmount}&cu=INR&tn=FocusStake+Refund`;
      
      // UPI app open karo
      window.location.href = upiUrl;
    } else {
      alert(`Task approved! ✅\nUser ka UPI ID nahi mila.\nManually ₹${refundAmount} bhejo.`);
    }

  } catch (error) {
    console.error('Error approving task:', error);
    alert('Error: ' + error.message);
  }
};

  const handleReject = async (taskId, userId, stakeAmount) => {
    try {
      const remaining = stakeAmount - 1;
      const charityAmount = Math.floor(remaining * 0.6);
      const profitAmount = remaining - charityAmount;

      await supabase
        .from('tasks')
        .update({ status: 'failed' })
        .eq('id', taskId);

      await supabase.from('charity_log').insert([{
        task_id: taskId,
        user_id: userId,
        charity_amount: charityAmount,
        platform_profit: profitAmount
      }]);

      setPendingTasks(pendingTasks.filter(t => t.id !== taskId));
      alert('Task rejected! Charity logged.');
    } catch (error) {
      console.error('Error rejecting task:', error);
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

      <div className="max-w-4xl mx-auto mt-6 px-4">
        <h2 className="text-xl font-bold mb-4">Pending Approvals: {pendingTasks.length}</h2>

        {loading ? (
          <p>Loading...</p>
        ) : pendingTasks.length === 0 ? (
          <p className="text-gray-600">No pending tasks for review</p>
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