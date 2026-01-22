
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, BookOpen, Settings, LayoutDashboard, Search, User as UserIcon, Globe, LogOut } from 'lucide-react';
import AuthModal from './Auth/AuthModal';
import { User } from '../types';
import { useTranslation } from '../translations';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const isAdmin = location.pathname.startsWith('/admin');
  const isSettings = location.pathname === '/settings';
  
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('current_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const navItems = [
    { icon: <Home className="w-5 h-5" />, label: t('home'), path: '/' },
    { icon: <BookOpen className="w-5 h-5" />, label: t('shelf'), path: '/shelf' },
    { icon: <LayoutDashboard className="w-5 h-5" />, label: t('admin'), path: '/admin' },
  ];

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('current_user', JSON.stringify(user));
    window.location.reload();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('current_user');
    setShowUserMenu(false);
    navigate('/');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/discover?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-[#f8fafc]">
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onSuccess={handleAuthSuccess} 
      />

      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-72 border-r border-gray-100 bg-white">
        <div className="p-8">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-xl shadow-blue-100 group-hover:rotate-6 transition-transform">W</div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tighter text-gray-900 leading-none">微信读书</span>
              <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest mt-1">E-Reader Pro</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-6 space-y-2 mt-8">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 ${
                location.pathname === item.path || (item.path === '/admin' && isAdmin)
                  ? 'bg-blue-600 text-white font-black shadow-xl shadow-blue-100 translate-x-1'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-bold'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-6 border-t border-gray-50">
          <Link 
            to="/settings" 
            className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 ${
              isSettings ? 'bg-gray-900 text-white font-black shadow-xl shadow-gray-200' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-bold'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span>{t('settings')}</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-20 border-b border-gray-100 bg-white/70 backdrop-blur-xl flex items-center justify-between px-6 md:px-12 shrink-0 z-10">
          <div className="flex items-center gap-6 flex-1">
            <div className="md:hidden"><Link to="/" className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg">W</Link></div>
            <form onSubmit={handleSearch} className="relative w-full max-w-lg group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-100 rounded-2xl py-3.5 pl-12 pr-6 text-sm font-bold focus:bg-white outline-none transition-all shadow-sm group-hover:shadow-md"
              />
            </form>
          </div>
          
          <div className="flex items-center gap-6">
            {currentUser ? (
              <div className="relative">
                <button onClick={() => setShowUserMenu(!showUserMenu)} className="w-11 h-11 rounded-2xl border-2 border-white shadow-lg overflow-hidden cursor-pointer hover:scale-105 transition-all">
                  <img src={currentUser.avatar} alt={currentUser.username} className="w-full h-full object-cover" />
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-4 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-4 py-3 border-b border-gray-50">
                      <div className="font-black text-gray-900 truncate">{currentUser.username}</div>
                    </div>
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors mt-1">
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => setIsAuthModalOpen(true)} className="bg-blue-600 text-white px-6 py-2.5 rounded-full font-black text-sm shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2">
                <UserIcon className="w-4 h-4" /> {t('loginNow')}
              </button>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-6 md:p-12 hide-scrollbar">{children}</div>
      </main>
    </div>
  );
};
export default Layout;
