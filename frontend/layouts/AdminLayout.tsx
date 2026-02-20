import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { AdminTopbar } from '../components/admin/AdminTopbar';
import { authApi } from '../apiClient';

interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  role: string;
}

const AdminLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch current user
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/');
          return;
        }
        const res = await authApi.getMe();
        const userData = res.data as any;
        
        // Check if user is admin
        if (userData.role !== 'admin' && userData.role !== 'super_admin') {
          navigate('/');
          return;
        }
        
        setUser({
          id: userData.id,
          email: userData.email,
          full_name: userData.full_name || userData.email.split('@')[0],
          role: userData.role,
        });
      } catch (error) {
        console.error('Failed to fetch user:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="animate-spin">⏳</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors">
      <AdminSidebar
        collapsed={sidebarCollapsed}
        onLogout={handleLogout}
        userName={user.full_name}
      />
      <div
        className="transition-all duration-300"
        style={{ marginLeft: sidebarCollapsed ? 72 : 256 }}
      >
        <AdminTopbar
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
          userName={user.full_name}
          userEmail={user.email}
        />
        <main className="p-4 lg:p-6">
          <Outlet context={{ user }} />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
