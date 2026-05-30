import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

function DashboardPage({ user, setCurrentPage, setCurrentTask, setUser, theme, setTheme }) {
  const [tasks, setTasks] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [description, setDescription] = useState('');
  const [stakeAmount, setStakeAmount] = useState(15);
  const [loading, setLoading] = useState(false);
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [customHours, setCustomHours] = useState(0);
  const [customMinutes, setCustomMinutes] = useState(30);
  const [customSeconds, setCustomSeconds] = useState(0);
  const [presetDuration, setPresetDuration] = useState(180);
  const [charityDonated, setCharityDonated] = useState(0);
  const [deletingTaskId, setDeletingTaskId] = useState(null);
  const [taskPage, setTaskPage] = useState(1);
  const [longPressTaskId, setLongPressTaskId] = useState(null);
  const longPressTimer = useRef(null);

  const TASKS_PER_PAGE = 30;

  const themes = {
    dark: { bg: 'bg-gray-900', text: 'text-white', card: 'bg-gray-800', border: 'border-gray-700' },
    light: { bg: 'bg-purple-600', text: 'text-gray-900', card: 'bg-white', border: 'border-gray-300' },
    pink: { bg: 'bg-pink-100', text: 'text-pink-900', card: 'bg-pink-50', border: 'border-pink-300' },
    brown: { bg: 'bg-amber-900', text: 'text-amber-50', card: 'bg-amber-800', border: 'border-amber-700' }
  };

  const currentTheme = themes[theme] || themes.light;

  const getTotalDurationSeconds = () => {
    if (useCustomTime) {
      return (customHours * 3600) + (customMinutes * 60) + customSeconds;
    }
    return parseInt(presetDuration) * 60;
  };

  const getTotalDurationMinutes = () => {
    const sec = getTotalDurationSeconds();
    return Math.max(1, Math.ceil(sec / 60));
  };

if (user?.id) {
  fetchTasks();
  fetchCharityDonated();
}

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchCharityDonated = async () => {
    try {
      const { data, error } = await supabase
        .from('charity_log')
        .select('charity_amount')
        .eq('user_id', user.id);
      
      if (error) throw error;
      const total = (data || []).reduce((sum, log) => sum + (log.charity_amount || 0), 0);
      setCharityDonated(total);
    } catch (error) {
      console.error('Error fetching charity:', error);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const durationMinutes = getTotalDurationMinutes();
      const durationSeconds = getTotalDurationSeconds();

      if (durationSeconds < 10) {
        alert('Minimum 10 seconds required!');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          user_id: user.id,
          description: description,
          stake_amount: parseFloat(stakeAmount),
          duration_minutes: durationMinutes,
          duration_seconds: durationSeconds,
          status: 'pending'
        }])
        .select();

      if (error) throw error;

      const newTask = data[0];

      await supabase.from('payments').insert([{
        task_id: newTask.id,
        user_id: user.id,
        status: 'pending'
      }]);

      setTasks([newTask, ...tasks]);
      setDescription('');
      setStakeAmount(15);
      setShowCreateForm(false);
      setCurrentTask(newTask);
      setCurrentPage('payment');
    } catch (error) {
      console.error('Error:', error);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLongPressStart = (taskId) => {
    longPressTimer.current = setTimeout(() => {
      setLongPressTaskId(taskId);
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure? This task will be permanently deleted!')) return;

    setDeletingTaskId(taskId);
    try {
      await supabase.from('tasks').delete().eq('id', taskId);
      setTasks(tasks.filter(t => t.id !== taskId));
      setLongPressTaskId(null);
      alert('Task deleted!');
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Error: ' + error.message);
    } finally {
      setDeletingTaskId(null);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setCurrentPage('login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalPages = Math.ceil(tasks.length / TASKS_PER_PAGE);
  const startIdx = (taskPage - 1) * TASKS_PER_PAGE;
  const paginatedTasks = tasks.slice(startIdx, startIdx + TASKS_PER_PAGE);

  return (
    <div className={`min-h-screen ${currentTheme.bg} ${currentTheme.text}`}>
      <div className={theme === 'light' ? 'bg-gray-900 text-white' : currentTheme.bg}>
        <div className="max-w-4xl mx-auto flex justify-between items-center p-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔥</span>
            <h1 className="text-2xl font-bold">FocusStake</h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setCurrentPage('profile')} className="px-4 py-2 rounded font-bold bg-blue-600 text-white hover:bg-blue-700">👤 Profile</button>
            <button onClick={handleLogout} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 font-bold">Logout</button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto mt-6 px-4 pb-10">
        <div className={`w-32 h-32 rounded-full flex flex-col items-center justify-center mb-8 shadow-lg ${theme === 'light' ? 'bg-green-500 text-white' : 'bg-green-600 text-white'}`}>
          <p className="text-sm opacity-90">Charity Impact</p>
          <p className="text-3xl font-bold">₹{charityDonated}</p>
        </div>

        <div className={`${currentTheme.card} rounded-lg shadow-lg p-8 mb-8`}>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Active Tasks</h1>
            <div className="flex gap-3">
              <button onClick={() => setCurrentPage('admin')} className="bg-red-600 text-white px-6 py-3 rounded hover:bg-red-700 font-bold">Admin</button>
              <button onClick={() => setShowCreateForm(!showCreateForm)} className="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700 font-bold">{showCreateForm ? 'Cancel' : 'New Task'}</button>
            </div>
          </div>

          {showCreateForm && (
            <form onSubmit={handleCreateTask} className={`p-6 rounded-lg mb-6 space-y-4 ${theme === 'light' ? 'bg-purple-100' : 'bg-gray-700'}`}>
              <div>
                <label className="block text-sm font-medium mb-2">Task Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your task" className={`w-full px-4 py-2 border rounded ${theme === 'light' ? 'bg-white text-gray-900' : `${currentTheme.card} ${currentTheme.text}`}`} rows="3" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Stake Amount (₹)</label>
                <input type="number" min="15" value={stakeAmount} onChange={(e) => setStakeAmount(e.target.value)} className={`w-full px-4 py-2 border rounded ${theme === 'light' ? 'bg-white text-gray-900' : `${currentTheme.card} ${currentTheme.text}`}`} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-3">Duration</label>
                <div className="flex gap-3 mb-4">
                  <button type="button" onClick={() => setUseCustomTime(false)} className={`px-4 py-2 rounded font-medium ${!useCustomTime ? 'bg-blue-600 text-white' : theme === 'light' ? 'bg-purple-300' : 'bg-gray-600'}`}>Preset</button>
                  <button type="button" onClick={() => setUseCustomTime(true)} className={`px-4 py-2 rounded font-medium ${useCustomTime ? 'bg-blue-600 text-white' : theme === 'light' ? 'bg-purple-300' : 'bg-gray-600'}`}>Custom</button>
                </div>
                {!useCustomTime && (
                  <select value={presetDuration} onChange={(e) => setPresetDuration(e.target.value)} className={`w-full px-4 py-2 border rounded ${theme === 'light' ? 'bg-white text-gray-900' : `${currentTheme.card} ${currentTheme.text}`}`}>
                    <option value="1">1 Min</option>
                    <option value="60">1 Hour</option>
                    <option value="120">2 Hours</option>
                    <option value="180">3 Hours</option>
                  </select>
                )}
                {useCustomTime && (
                  <div className="flex gap-3">
                    <input type="number" min="0" max="23" value={customHours} onChange={(e) => setCustomHours(parseInt(e.target.value) || 0)} placeholder="Hours" className={`flex-1 px-3 py-2 border rounded text-center ${theme === 'light' ? 'bg-white text-gray-900' : `${currentTheme.card} ${currentTheme.text}`}`} />
                    <input type="number" min="0" max="59" value={customMinutes} onChange={(e) => setCustomMinutes(parseInt(e.target.value) || 0)} placeholder="Minutes" className={`flex-1 px-3 py-2 border rounded text-center ${theme === 'light' ? 'bg-white text-gray-900' : `${currentTheme.card} ${currentTheme.text}`}`} />
                    <input type="number" min="0" max="59" value={customSeconds} onChange={(e) => setCustomSeconds(parseInt(e.target.value) || 0)} placeholder="Seconds" className={`flex-1 px-3 py-2 border rounded text-center ${theme === 'light' ? 'bg-white text-gray-900' : `${currentTheme.card} ${currentTheme.text}`}`} />
                  </div>
                )}
              </div>
              <button type="submit" disabled={loading} className="w-full bg-green-600 text-white py-3 rounded font-bold hover:bg-green-700 disabled:opacity-50">{loading ? 'Creating...' : 'Create Task'}</button>
            </form>
          )}

          {tasks.length === 0 ? (
            <div className="text-center py-12 opacity-70"><p className="text-lg">No tasks yet</p></div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {paginatedTasks.map((task) => (
                  <div key={task.id} onMouseDown={() => handleLongPressStart(task.id)} onMouseUp={handleLongPressEnd} onTouchStart={() => handleLongPressStart(task.id)} onTouchEnd={handleLongPressEnd} className={`border rounded-lg p-4 hover:shadow-lg transition ${currentTheme.border} ${theme === 'light' ? 'bg-white' : ''}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{task.description}</h3>
                        <p className={`text-sm ${theme === 'light' ? 'text-purple-600' : 'opacity-70'}`}>₹{task.stake_amount} • {task.duration_minutes} mins</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(task.status)}`}>{task.status.toUpperCase()}</span>
                    </div>
                    <div className="flex gap-2">
                      {task.status === 'pending' && <button onClick={() => { setCurrentTask(task); setCurrentPage('payment'); }} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">Payment</button>}
                      {task.status === 'active' && <button onClick={() => { setCurrentTask(task); setCurrentPage('timer'); }} className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 text-sm">Timer</button>}
                      {longPressTaskId === task.id && <button onClick={() => handleDeleteTask(task.id)} disabled={deletingTaskId === task.id} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50 text-sm">{deletingTaskId === task.id ? 'Deleting...' : 'Delete'}</button>}
                    </div>
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex justify-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button key={page} onClick={() => setTaskPage(page)} className={`px-4 py-2 rounded ${taskPage === page ? 'bg-blue-600 text-white font-bold' : theme === 'light' ? 'bg-purple-200 text-purple-900' : 'bg-gray-700'}`}>{page}</button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;