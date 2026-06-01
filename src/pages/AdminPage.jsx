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

      // Step 1: Database mein task ko 'approved' mark karo
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ status: 'approved' }) // Yahan status 'approved' set ho raha hai
        .eq('id', taskId);

      if (updateError) throw updateError;

      // Step 2: UI se task ko turant hata do
      setPendingTasks(prev => prev.filter(t => t.id !== taskId));

      // Step 3: User ki UPI detail nikalo
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('upi_id, name')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // Step 4: UPI ID Copy karo aur Alert dikhao
      if (userData?.upi_id) {
        navigator.clipboard.writeText(userData.upi_id)
          .then(() => {
            alert(`✅ Task Approved (Database Updated)!\n\nUPI ID: ${userData.upi_id} copy ho gayi hai.\nAmount: ₹${refundAmount}\n\nKripya apna PhonePe/GPay khol kar manually pay kar dein.`);
          })
          .catch(err => {
            console.error("Copy fail ho gaya:", err);
            alert(`✅ Task Approved (Database Updated)!\n\nUPI ID copy nahi ho payi. Kripya manually type karein: ${userData.upi_id}\nAmount: ₹${refundAmount}`);
          });
      } else {
        alert(`✅ Task Approved!\nLekin is user ki UPI ID database mein nahi mili.`);
      }
      
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