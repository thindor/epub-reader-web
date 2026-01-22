
import React, { useState } from 'react';
import { X, User, Lock, Mail, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dbService } from '../../services/dbService';
import { User as UserType } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserType) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const users = await dbService.getAll<UserType>('users');
      
      if (isLogin) {
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
          onSuccess(user);
          onClose();
        } else {
          setError('用户名或密码错误');
        }
      } else {
        if (users.find(u => u.username === username)) {
          setError('该用户名已被注册');
        } else {
          const newUser: UserType = {
            id: 'u' + Date.now(),
            username,
            password,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
          };
          await dbService.put('users', newUser);
          onSuccess(newUser);
          onClose();
        }
      }
    } catch (err) {
      setError('操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminEntry = () => {
    onClose();
    navigate('/admin');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="relative p-10">
          <button onClick={onClose} className="absolute right-8 top-8 text-gray-400 hover:text-gray-900 transition-colors">
            <X className="w-6 h-6" />
          </button>
          
          <div className="mb-10">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">
              {isLogin ? '欢迎回来' : '开启阅读之旅'}
            </h2>
            <p className="text-gray-400 font-medium mt-2">
              {isLogin ? '立即登录您的专属阅读库' : '创建一个账号来同步您的书签与偏好'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-blue-600 transition-colors" />
                <input
                  type="text"
                  required
                  placeholder="用户名"
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-100 rounded-2xl py-4 pl-12 pr-6 outline-none font-bold transition-all"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-blue-600 transition-colors" />
                <input
                  type="password"
                  required
                  placeholder="密码"
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-100 rounded-2xl py-4 pl-12 pr-6 outline-none font-bold transition-all"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-sm font-bold ml-2">{error}</p>}

            <button
              disabled={loading}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:bg-gray-200"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                <>
                  {isLogin ? '登录' : '立即注册'} <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 flex flex-col items-center gap-4">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm font-bold text-gray-400 hover:text-blue-600 transition-colors"
            >
              {isLogin ? '还没有账号？去注册' : '已有账号？去登录'}
            </button>
            
            <div className="w-full pt-6 border-t border-gray-50">
              <button 
                onClick={handleAdminEntry}
                className="flex items-center justify-center gap-2 w-full text-[10px] font-black uppercase tracking-widest text-gray-300 hover:text-blue-400 transition-colors group"
              >
                <ShieldCheck className="w-3 h-3 group-hover:scale-110 transition-transform" /> 
                管理员入口
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
