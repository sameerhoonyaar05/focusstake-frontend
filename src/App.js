import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';
import PaymentPage from './pages/PaymentPage';
import TimerPage from './pages/TimerPage';
import ProofPage from './pages/ProofPage';

function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('login');
  const [theme, setTheme] = useState('light');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentTask, setCurrentTask] = useState(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUser(user);
        setCurrentPage('dashboard');
        // Check if admin
        checkAdmin(user.id);
      } else {
        setCurrentPage('login');
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAdmin = async (userId) => {
    // For now, you can manually set admin status
    // Later, add admin field to users table
    setIsAdmin(false); // Change to true for testing admin panel
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCurrentPage('login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-600 to-blue-600">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600">
      {/* Navigation */}
      {user && (
        <nav className="bg-gray-900 text-white p-4 flex justify-between items-center shadow-lg">
          <h1 className="text-2xl font-bold">🎯 FocusStake</h1>
          <div className="flex gap-4 items-center">
            <span className="text-sm opacity-75">{user.email}</span>
            {isAdmin && (
              <button 
                onClick={() => setCurrentPage('admin')}
                className="px-4 py-2 bg-red-600 rounded hover:bg-red-700 transition"
              >
                🔧 Admin Panel
              </button>
            )}
            <button 
              onClick={() => setCurrentPage('dashboard')}
              className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition"
            >
              Dashboard
            </button>
            <button 
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 rounded hover:bg-red-600 transition"
            >
              Logout
            </button>
          </div>
        </nav>
      )}

      {/* Pages */}
      <div className="container mx-auto p-4 min-h-[calc(100vh-80px)]">
        {currentPage === 'login' && (
          <LoginPage setUser={setUser} setCurrentPage={setCurrentPage} />
        )}
        
        {currentPage === 'dashboard' && user && (
          <DashboardPage 
            user={user} 
            setCurrentPage={setCurrentPage}
            setCurrentTask={setCurrentTask}
          />
        )}

        {currentPage === 'payment' && user && currentTask && (
          <PaymentPage 
            user={user}
            task={currentTask}
            setCurrentPage={setCurrentPage}
            setCurrentTask={setCurrentTask}
          />
        )}

        {currentPage === 'timer' && user && currentTask && (
          <TimerPage 
            user={user}
            task={currentTask}
            setCurrentPage={setCurrentPage}
          />
        )}

        {currentPage === 'proof' && user && currentTask && (
          <ProofPage 
            user={user}
            task={currentTask}
            setCurrentPage={setCurrentPage}
          />
        )}

        {currentPage === 'admin' && (
  <AdminPage setCurrentPage={setCurrentPage} />
)}  
        {currentPage === 'profile' && (
  <ProfilePage user={user} setCurrentPage={setCurrentPage} theme={theme} setTheme={setTheme} />
)}
      </div>
    </div>
  );
}

export default App;
