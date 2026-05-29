import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function AdminPage({ setCurrentPage }) {
  const [pendingTasks, setPendingTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedProofs, setSelectedProofs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewingTaskId, setReviewingTaskId] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  useEffect(() => {
    fetchPendingTasks();
  }, []);

  const fetchPendingTasks = async () => {
    try {
      setLoading(true);

      // Fetch tasks with completed status (awaiting admin review)
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      // Fetch user details and proofs for each task
      const tasksWithDetails = await Promise.all(
        (tasks || []).map(async (task) => {
          // Fetch user info
          const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('id', task.user_id)
            .single();

          // Fetch proofs
          const { data: proofs } = await supabase
            .from('proofs')
            .select('*')
            .eq('task_id', task.id);

          return {
            ...task,
            user,
            proofs: proofs || [],
          };
        })
      );

      setPendingTasks(tasksWithDetails);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      alert('Error loading pending tasks: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTask = (task) => {
    setSelectedTask(task);
    setSelectedProofs(task.proofs || []);
    setReviewingTaskId(task.id);
  };

  const handleApprove = async () => {
    if (!selectedTask) return;

    setActionInProgress(true);

    try {
      // Update task status to approved
      await supabase
        .from('tasks')
        .update({ status: 'approved' })
        .eq('id', selectedTask.id);

      // Calculate refund (stake - ₹1 platform fee)
      const refundAmount = selectedTask.stake_amount - 1;

      // Create payment log
      await supabase
        .from('payments')
        .update({
          status: 'refunded',
          refund_amount: refundAmount,
          refund_date: new Date().toISOString(),
        })
        .eq('task_id', selectedTask.id);

      // Log admin action
      await supabase
        .from('admin_actions')
        .insert([{
          admin_id: 'system', // In production, use actual admin user ID
          task_id: selectedTask.id,
          action: 'approved',
          notes: `Task approved. Refund: ₹${refundAmount}`,
          created_at: new Date().toISOString(),
        }]);

      // Send refund notification email
      await sendRefundEmail(selectedTask.user.email, refundAmount);

      alert(`✅ Task Approved!\n₹${refundAmount} refund initiated to ${selectedTask.user.upi_id}`);

      // Refresh and close
      setSelectedTask(null);
      setReviewingTaskId(null);
      fetchPendingTasks();
    } catch (error) {
      console.error('Error approving task:', error);
      alert('Error: ' + error.message);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleReject = async () => {
    if (!selectedTask || !window.confirm('❌ Reject this task and forfeit ₹' + selectedTask.stake_amount + '?')) return;

    setActionInProgress(true);

    try {
      // Update task status to rejected
      await supabase
        .from('tasks')
        .update({ status: 'failed' })
        .eq('id', selectedTask.id);

      // Calculate charity and profit
      const remaining = selectedTask.stake_amount - 1; // Minus ₹1 platform fee
      const charityAmount = Math.floor(remaining * 0.6);
      const profitAmount = remaining - charityAmount;

      // Log charity transaction
      await supabase
        .from('charity_log')
        .insert([{
          task_id: selectedTask.id,
          user_id: selectedTask.user_id,
          forfeited_amount: selectedTask.stake_amount,
          charity_amount: charityAmount,
          platform_profit: profitAmount,
          charity_date: new Date().toISOString(),
        }]);

      // Log admin action
      await supabase
        .from('admin_actions')
        .insert([{
          admin_id: 'system',
          task_id: selectedTask.id,
          action: 'rejected',
          notes: `Task rejected. Charity: ₹${charityAmount}, Profit: ₹${profitAmount}`,
          created_at: new Date().toISOString(),
        }]);

      alert(`❌ Task Rejected!\n💰 Charity: ₹${charityAmount}\n📊 Platform: ₹${profitAmount}`);

      // Refresh and close
      setSelectedTask(null);
      setReviewingTaskId(null);
      fetchPendingTasks();
    } catch (error) {
      console.error('Error rejecting task:', error);
      alert('Error: ' + error.message);
    } finally {
      setActionInProgress(false);
    }
  };

  const sendRefundEmail = async (userEmail, amount) => {
    try {
      // This would call your backend API to send email
      // For now, just log it
      console.log(`Refund email sent to ${userEmail} for ₹${amount}`);
    } catch (error) {
      console.error('Error sending email:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto mt-8 text-center">
        <p className="text-xl">⏳ Loading pending tasks...</p>
      </div>
    );
  }

  if (selectedTask) {
    return (
      <div className="max-w-4xl mx-auto mt-6">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <button
            onClick={() => { setSelectedTask(null); setReviewingTaskId(null); }}
            className="mb-6 text-blue-600 hover:text-blue-800 font-bold"
          >
            ← Back to List
          </button>

          {/* Task & User Info */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-bold text-lg mb-2">📋 Task Details</h3>
              <p><strong>Description:</strong> {selectedTask.description}</p>
              <p><strong>Stake:</strong> ₹{selectedTask.stake_amount}</p>
              <p><strong>Duration:</strong> {selectedTask.duration_minutes} minutes</p>
              <p><strong>Created:</strong> {formatDate(selectedTask.created_at)}</p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-bold text-lg mb-2">👤 User Details</h3>
              <p><strong>Name:</strong> {selectedTask.user.name || 'N/A'}</p>
              <p><strong>Email:</strong> {selectedTask.user.email}</p>
              <p><strong>UPI ID:</strong> {selectedTask.user.upi_id}</p>
              <p><strong>Total Tasks:</strong> {selectedTask.user.total_tasks || 0}</p>
            </div>
          </div>

          {/* Proofs Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">📸 Submitted Proofs</h2>

            {selectedProofs.length === 0 ? (
              <p className="text-gray-500">No proofs submitted</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedProofs.map((proof) => (
                  <div key={proof.id} className="border rounded-lg p-4 bg-gray-50">
                    <p className="font-bold mb-2">
                      {proof.checkpoint === 'final' ? '🎥 Final Video' : `📸 Checkpoint ${proof.checkpoint}`}
                    </p>

                    {proof.proof_type === 'video' ? (
                      <video
                        src={proof.proof_url}
                        controls
                        className="w-full h-64 bg-black rounded mb-2"
                      />
                    ) : (
                      <img
                        src={proof.proof_url}
                        alt={`Checkpoint ${proof.checkpoint}`}
                        className="w-full h-64 object-cover rounded mb-2"
                      />
                    )}

                    <p className="text-sm text-gray-600">
                      Submitted: {formatDate(proof.created_at)}
                    </p>
                    <p className={`text-xs font-bold mt-1 ${proof.status === 'pending' ? 'text-yellow-600' : 'text-green-600'}`}>
                      Status: {proof.status.toUpperCase()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Decision Section */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="font-bold text-lg mb-4">🎯 Admin Decision</h3>

            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded mb-4">
              <p className="text-sm text-yellow-700 mb-2">
                <strong>If Approved:</strong> User gets ₹{selectedTask.stake_amount - 1} refund
              </p>
              <p className="text-sm text-yellow-700">
                <strong>If Rejected:</strong> Charity: ₹{Math.floor((selectedTask.stake_amount - 1) * 0.6)} | Platform: ₹{Math.floor((selectedTask.stake_amount - 1) * 0.4)}
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleApprove}
                disabled={actionInProgress}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition disabled:opacity-50"
              >
                {actionInProgress ? '⏳ Processing...' : '✅ Approve Task'}
              </button>
              <button
                onClick={handleReject}
                disabled={actionInProgress}
                className="flex-1 bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition disabled:opacity-50"
              >
                {actionInProgress ? '⏳ Processing...' : '❌ Reject Task'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="max-w-4xl mx-auto mt-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">🛡️ Admin Panel</h1>
          <button
            onClick={() => setCurrentPage('dashboard')}
            className="text-blue-600 hover:text-blue-800 font-bold"
          >
            ← Back to Dashboard
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
          <p className="text-blue-800 font-bold">
            📊 Pending Reviews: {pendingTasks.length}
          </p>
        </div>

        {pendingTasks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-2xl mb-2">✅</p>
            <p className="text-gray-500 text-lg">Sab kaam ho gaya! Koi pending task nahi hai.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingTasks.map((task) => (
              <div key={task.id} className="border rounded-lg p-4 hover:shadow-lg transition">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{task.description}</h3>
                    <p className="text-sm text-gray-600">
                      User: <strong>{task.user.email}</strong> | Stake: <strong>₹{task.stake_amount}</strong>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Submitted: {formatDate(task.created_at)} | Proofs: {task.proofs.length}
                    </p>
                  </div>
                  <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">
                    ⏳ PENDING
                  </span>
                </div>

                <button
                  onClick={() => handleSelectTask(task)}
                  className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 transition"
                >
                  🔍 Review & Decide
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPage;
