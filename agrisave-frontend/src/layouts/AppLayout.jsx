/**
 * AGRISAVE.IO - App Layout (Sidebar + Topbar)
 */
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Icons, RoleBadge } from '../utils/ui';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/dashboard',     icon: Icons.LayoutDashboard, label: 'Dashboard',   roles: ['SUPER_ADMIN','ADMIN','OPERATOR','VIEWER'] },
  { to: '/transactions',  icon: Icons.FileText,        label: 'Transaksi',   roles: ['SUPER_ADMIN','ADMIN','OPERATOR','VIEWER'] },
  { to: '/audit',         icon: Icons.Activity,        label: 'Audit Log',   roles: ['SUPER_ADMIN','ADMIN'] },
  { to: '/admin/users',   icon: Icons.Users,           label: 'User Mgmt',   roles: ['SUPER_ADMIN'] },
  { to: '/crypto-flow',   icon: Icons.Cpu,             label: 'Crypto Flow', roles: ['SUPER_ADMIN','ADMIN','OPERATOR','VIEWER'] },
];

export default function AppLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success('Logout berhasil.');
    navigate('/login');
  };

  const visibleNav = navItems.filter((n) => n.roles.includes(user?.role));

  return (
    <div className="min-h-screen flex bg-[#05070a]">
      {/* ─── Sidebar ─── */}
      <aside className={`${collapsed ? 'w-16' : 'w-60'} flex-shrink-0 flex flex-col bg-[#0a0c10] border-r border-white/[0.06] transition-all duration-300 fixed h-full z-30`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/[0.06]">
          <div className="w-9 h-9 bg-lime-400 rounded-xl flex items-center justify-center flex-shrink-0 glow-lime">
            <Icons.Shield className="text-black" width={18} height={18} />
          </div>
          {!collapsed && (
            <div>
              <span className="font-black text-white text-sm tracking-tight">AGRISAVE<span className="text-lime-400">.IO</span></span>
              <p className="text-[9px] text-gray-600 uppercase tracking-widest font-bold">Secure Vault v2</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visibleNav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`
              }
              title={collapsed ? label : undefined}
            >
              <Icon width={18} height={18} className="flex-shrink-0" />
              {!collapsed && <span className="text-xs">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-white/[0.06]">
          {!collapsed ? (
            <div className="bg-white/[0.04] rounded-2xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-lime-400 flex items-center justify-center text-black font-black text-sm flex-shrink-0">
                  {user?.username?.[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-white truncate">{user?.username}</p>
                  <RoleBadge role={user?.role} />
                </div>
              </div>
              <button onClick={handleLogout} className="w-full flex items-center gap-2 text-[10px] text-gray-500 hover:text-red-400 transition-colors font-bold uppercase tracking-widest">
                <Icons.LogOut width={12} height={12} /> Logout
              </button>
            </div>
          ) : (
            <button onClick={handleLogout} className="w-full flex justify-center p-2 text-gray-500 hover:text-red-400 transition-colors">
              <Icons.LogOut width={16} height={16} />
            </button>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#0a0c10] border border-white/10 rounded-full flex items-center justify-center text-gray-500 hover:text-white transition-colors z-40"
        >
          <Icons.ChevronDown width={12} height={12} className={`transition-transform ${collapsed ? '-rotate-90' : 'rotate-90'}`} />
        </button>
      </aside>

      {/* ─── Main Content ─── */}
      <main className={`flex-1 min-h-screen transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-60'}`}>
        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-[#05070a]/80 backdrop-blur-xl border-b border-white/[0.04] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse shadow-[0_0_8px_#bef264]" />
            <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">System Secure · AES-256-GCM Active</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-gray-600 font-mono hidden md:block">
              {new Date().toLocaleDateString('id-ID', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })}
            </span>
            <div className="badge-lime text-[9px]">{user?.role?.replace('_',' ')}</div>
          </div>
        </header>

        {/* Page */}
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
