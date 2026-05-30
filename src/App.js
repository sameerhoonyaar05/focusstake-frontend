import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import PaymentPage from './pages/PaymentPage';
import TimerPage from './pages/TimerPage';
import ProofPage from './pages/ProofPage';
import ProfilePage from './pages/ProfilePage';

function App() {
  const [currentPage, setCurrentPage] = useState('login');
  const [user, setUser] = useState(null);
  const [currentTask, setCurrentTask] = useState(null);
  const [theme, setTheme] = useState('light');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (data?.session?.user) {
          setUser(data.session.user);
          setCurrentPage('dashboard');
        } else {
          setCurrentPage('login');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setCurrentPage('login');
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user);
        setCurrentPage('dashboard');
      } else {
        setUser(null);
        setCurrentPage('login');
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-purple-600">
        <p className="text-white text-xl">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      {currentPage === 'login' && (
        <LoginPage setUser={setUser} setCurrentPage={setCurrentPage} />
      )}
      {currentPage === 'dashboard' && user && (
        <DashboardPage 
          user={user} 
          setCurrentPage={setCurrentPage}
          setCurrentTask={setCurrentTask}
          setUser={setUser}
          theme={theme}
          setTheme={setTheme}
        />
      )}
      {currentPage === 'payment' && user && currentTask && (
        <PaymentPage user={user} task={currentTask} setCurrentPage={setCurrentPage} setCurrentTask={setCurrentTask} />
      )}
      {currentPage === 'timer' && user && currentTask && (
        <TimerPage user={user} task={currentTask} setCurrentPage={setCurrentPage} />
      )}
      {currentPage === 'proof' && user && currentTask && (
        <ProofPage user={user} task={currentTask} setCurrentPage={setCurrentPage} />
      )}
      {currentPage === 'admin' && (
        <AdminPage setCurrentPage={setCurrentPage} />
      )}
      {currentPage === 'profile' && user && (
        <ProfilePage user={user} setCurrentPage={setCurrentPage} theme={theme} setTheme={setTheme} />
      )}
    </div>
  );
}

export default App;