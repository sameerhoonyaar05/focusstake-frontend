import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function ProfilePage({ user, setCurrentPage, theme, setTheme }) {
  const [taskHistory, setTaskHistory] = useState([]);
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(user?.user_metadata?.display_name || 'User');
  const [loading, setLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  const themes = [
    { name: 'Dark Black', value: 'dark', bg: 'bg-gray-900', text: 'text-white' },
    { name: 'White', value: 'light', bg: 'bg-white', text: 'text-gray-900' },
    { name: 'Baby Pink', value: 'pink', bg: 'bg-pink-100', text: 'text-pink-900' },
    { name: 'Dark Brown', value: 'brown', bg: 'bg-amber-900', text: 'text-amber-50' }
  ];

  useEffect(() => {
    if (user?.id) {
      fetchTaskHistory();
    }
  }, [user?.id]);

  const fetchTaskHistory = async () => {
    try {
      setLoading(true);
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', oneYearAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTaskHistory(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateDisplayName = async () => {
    try {
      await supabase.auth.updateUser({
        data: { display_name: displayName }
      });
      setEditingName(false);
      alert('Name updated!');
    } catch (error) {
      console.error('Error updating name:', error);
      alert('Error: ' + error.message);
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

  const getCurrentTheme = () => themes.find(t => t.value === theme);
  const current = getCurrentTheme();

  return (
    <div className={`min-h-screen ${current?.bg} ${current?.text}`}>
      <div className={`${current?.value === 'light' ? 'bg-gray-900 text-white' : current?.bg} p-4`}>
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <button onClick={() => setCurrentPage('dashboard')} className="text-lg font-bold hover:opacity-70">Back</button>
          <h1 className="text-2xl font-bold">Profile</h1>
          <div className="w-20"></div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <div className={`rounded-lg p-8 mb-6 ${current?.value === 'light' ? 'bg-gray-50' : current?.value === 'dark' ? 'bg-gray-800' : ''}`}>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm opacity-70 mb-2">Display Name</p>
              {editingName ? (
                <div className="flex gap-2">
                  <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={`flex-1 px-3 py-2 rounded border ${current?.value === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`} />
                  <button onClick={updateDisplayName} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-bold">Save</button>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <p className="text-2xl font-bold">{displayName}</p>
                  <button onClick={() => setEditingName(true)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Edit</button>
                </div>
              )}
            </div>
            <div>
              <p className="text-sm opacity-70 mb-2">Email</p>
              <p className="text-2xl font-bold break-all">{user?.email}</p>
            </div>
          </div>
        </div>

        <div className={`rounded-lg p-6 mb-6 ${current?.value === 'light' ? 'bg-gray-50' : current?.value === 'dark' ? 'bg-gray-800' : ''}`}>
          <h2 className="text-xl font-bold mb-4">Theme Selection</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {themes.map((t) => (
              <button key={t.value} onClick={() => setTheme(t.value)} className={`p-4 rounded-lg border-2 transition ${theme === t.value ? 'border-blue-600 shadow-lg' : `border-gray-300 ${current?.value === 'dark' ? 'border-gray-600' : ''}`}`}>
                <div className={`h-16 rounded mb-2 ${t.bg}`}></div>
                <p className="font-bold text-sm">{t.name}</p>
                {theme === t.value && <p className="text-xs text-blue-600 mt-1">Active</p>}
              </button>
            ))}
          </div>
        </div>

        <div className={`rounded-lg p-6 mb-6 ${current?.value === 'light' ? 'bg-blue-50 border-l-4 border-blue-500' : current?.value === 'dark' ? 'bg-blue-900 border-l-4 border-blue-400' : ''}`}>
          <h2 className="text-xl font-bold mb-4">Help & Support</h2>
          <button onClick={() => setShowHelp(!showHelp)} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-bold">{showHelp ? 'Hide' : 'Show'} Refund Policy</button>
          {showHelp && (
            <div className={`mt-4 p-4 rounded ${current?.value === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
              <p className="font-bold mb-2">Refund Policy</p>
              <p className="mb-3">Task approved in 24 hours! Refund: Stake - 1 rupee</p>
              <p className="font-bold mb-2">Questions?</p>
              <p>Email: <strong>sameerhoonyaar05@gmail.com</strong></p>
            </div>
          )}
        </div>

        <div className={`rounded-lg p-6 ${current?.value === 'light' ? 'bg-gray-50' : current?.value === 'dark' ? 'bg-gray-800' : ''}`}>
          <h2 className="text-xl font-bold mb-4">Task History (Last 1 Year)</h2>
          {loading ? (
            <p className="opacity-70">Loading...</p>
          ) : taskHistory.length === 0 ? (
            <p className="opacity-70">No task history</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {taskHistory.map((task) => (
                <div key={task.id} className={`p-4 rounded border ${current?.value === 'dark' ? 'border-gray-700 bg-gray-700' : 'border-gray-300 bg-white'}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-bold">{task.description}</p>
                      <p className="text-sm opacity-70">₹{task.stake_amount} • {task.duration_minutes} mins</p>
                    </div>
                    <span className={`px-3 py-1 rounded text-xs font-bold ${getStatusColor(task.status)}`}>{task.status.toUpperCase()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;