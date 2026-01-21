
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Upload, User as UserIcon, Tag as TagIcon, LayoutGrid, Book as BookIcon, CheckCircle2, X, Lock, LogIn, Loader2, Users } from 'lucide-react';
import { dbService } from '../../services/dbService';
import { Book, Author, Category, Tag, User } from '../../types';

type Tab = 'books' | 'authors' | 'categories' | 'tags' | 'users';

const AdminManager: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => sessionStorage.getItem('admin_auth') === 'true');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [activeTab, setActiveTab] = useState<Tab>('books');
  const [books, setBooks] = useState<Book[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formData, setFormData] = useState<any>({});
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle');

  const fetchData = async () => {
    setBooks(await dbService.getAll<Book>('books'));
    setAuthors(await dbService.getAll<Author>('authors'));
    setCategories(await dbService.getAll<Category>('categories'));
    setTags(await dbService.getAll<Tag>('tags'));
    setUsers(await dbService.getAll<User>('users'));
  };

  useEffect(() => { 
    if (isLoggedIn) fetchData(); 
  }, [isLoggedIn]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') { // Simple demo password
      setIsLoggedIn(true);
      sessionStorage.setItem('admin_auth', 'true');
      setLoginError('');
    } else {
      setLoginError('密码错误，请重试');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    sessionStorage.removeItem('admin_auth');
  };

  const handleSave = async () => {
    let finalId = formData.id || (activeTab.charAt(0) + Date.now());
    let dataToSave = { ...formData, id: finalId, createdAt: formData.createdAt || Date.now() };

    if (activeTab === 'books') {
      if (!formData.title) return alert("请输入书名");
      if (!formData.authorName) return alert("请输入作者名称");
      
      const existingAuthor = authors.find(a => a.name.trim() === formData.authorName.trim());
      let authorId = '';
      
      if (existingAuthor) {
        authorId = existingAuthor.id;
      } else {
        authorId = 'a' + Date.now();
        const newAuthor: Author = {
          id: authorId,
          name: formData.authorName.trim(),
          description: '系统自动生成的作者信息'
        };
        await dbService.put('authors', newAuthor);
        const updatedAuthors = await dbService.getAll<Author>('authors');
        setAuthors(updatedAuthors);
      }
      
      dataToSave.authorId = authorId;
      if (!dataToSave.cover) dataToSave.cover = `https://picsum.photos/seed/${finalId}/300/400`;
      delete dataToSave.authorName;
    }

    if (activeTab === 'users') {
      if (!formData.username) return alert("请输入用户名");
      if (!formData.avatar) dataToSave.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.username}`;
    }

    await dbService.put(activeTab, dataToSave);
    setIsEditing(false);
    setFormData({});
    setUploadStatus('idle');
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (confirm("确定要删除吗？这将永久移除此项数据。")) {
      await dbService.delete(activeTab, id);
      fetchData();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadStatus('uploading');
    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData({ 
        ...formData, 
        epubUrl: event.target?.result, 
        title: file.name.replace('.epub', ''),
        description: formData.description || `一本关于 ${file.name.replace('.epub', '')} 的好书。`
      });
      setUploadStatus('success');
    };
    reader.onerror = () => {
      alert("文件读取失败");
      setUploadStatus('idle');
    };
    reader.readAsDataURL(file);
  };

  const renderForm = () => {
    switch (activeTab) {
      case 'books':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">书名 *</label>
                <input placeholder="书名" className="w-full border p-3 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">作者名称 *</label>
                <input 
                  placeholder="输入作者姓名" 
                  className="w-full border p-3 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium" 
                  value={formData.authorName || (formData.authorId ? authors.find(a => a.id === formData.authorId)?.name : '') || ''} 
                  onChange={e => setFormData({ ...formData, authorName: e.target.value })} 
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">分类</label>
                <select className="w-full border p-3 rounded-xl bg-gray-50 outline-none font-medium" value={formData.categoryId || ''} onChange={e => setFormData({ ...formData, categoryId: e.target.value })}>
                  <option value="">选择分类</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">封面图片 URL</label>
                <input placeholder="https://..." className="w-full border p-3 rounded-xl bg-gray-50 outline-none" value={formData.cover || ''} onChange={e => setFormData({ ...formData, cover: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">EPUB 文件</label>
                <div className={`relative border-2 border-dashed rounded-xl p-4 transition-all ${uploadStatus === 'success' ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-blue-300'}`}>
                   <input type="file" accept=".epub" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} />
                   <div className="flex flex-col items-center justify-center gap-2 py-2">
                     {uploadStatus === 'success' ? (
                       <>
                         <CheckCircle2 className="text-green-500 w-8 h-8" />
                         <span className="text-sm font-medium text-green-700">解析成功：{formData.title}</span>
                       </>
                     ) : (
                       <>
                         <Upload className="text-gray-400 w-8 h-8" />
                         <span className="text-sm font-medium text-gray-500">{uploadStatus === 'uploading' ? '正在解析...' : '点击或拖拽 EPUB 文件'}</span>
                       </>
                     )}
                   </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'authors':
        return (
          <div className="grid grid-cols-1 gap-4">
            <input placeholder="作者姓名" className="border p-3 rounded-xl bg-gray-50 font-medium" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            <textarea placeholder="作者简介" className="border p-3 rounded-xl bg-gray-50 h-32 font-medium" value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} />
          </div>
        );
      case 'users':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">用户名 *</label>
                <input placeholder="用户名" className="w-full border p-3 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none font-medium" value={formData.username || ''} onChange={e => setFormData({ ...formData, username: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">密码</label>
                <input type="text" placeholder="设置密码" className="w-full border p-3 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none font-medium" value={formData.password || ''} onChange={e => setFormData({ ...formData, password: e.target.value })} />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">头像 URL</label>
                <input placeholder="https://..." className="w-full border p-3 rounded-xl bg-gray-50 outline-none" value={formData.avatar || ''} onChange={e => setFormData({ ...formData, avatar: e.target.value })} />
                <p className="text-[10px] text-gray-400 mt-2">留空将自动生成 DiceBear 风格头像</p>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <input placeholder="名称" className="border p-3 rounded-xl bg-gray-50 w-full font-medium" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} />
        );
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <div className="w-full max-md bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-blue-100 border border-blue-50">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200 mb-6">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">后台管理登录</h2>
            <p className="text-gray-400 text-sm mt-2">请输入管理员密码访问 (默认: admin123)</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <input type="password" placeholder="管理员密码" className={`w-full bg-gray-50 border-2 rounded-2xl p-4 outline-none transition-all font-medium ${loginError ? 'border-red-100 focus:border-red-300' : 'border-gray-50 focus:border-blue-300'}`} value={password} onChange={(e) => setPassword(e.target.value)} />
            {loginError && <p className="text-red-500 text-xs mt-2 ml-2 font-bold">{loginError}</p>}
            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3">
              <LogIn className="w-5 h-5" /> 立即登录
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-20">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-gray-100 w-fit shadow-sm">
          {[
            { id: 'books', label: '书籍', icon: <BookIcon className="w-4 h-4" /> },
            { id: 'authors', label: '作者', icon: <UserIcon className="w-4 h-4" /> },
            { id: 'users', label: '用户', icon: <Users className="w-4 h-4" /> },
            { id: 'categories', label: '分类', icon: <LayoutGrid className="w-4 h-4" /> },
            { id: 'tags', label: '标签', icon: <TagIcon className="w-4 h-4" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as Tab); setIsEditing(false); setFormData({}); setUploadStatus('idle'); }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
        <button onClick={handleLogout} className="text-gray-400 text-sm font-bold hover:text-red-500 transition-colors">退出登录</button>
      </div>

      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-3xl font-black text-gray-900">
             {activeTab === 'books' ? '书籍管理' : activeTab === 'authors' ? '作者管理' : activeTab === 'users' ? '注册用户管理' : '内容库'}
           </h2>
           <p className="text-gray-400 text-sm mt-1">
             {activeTab === 'users' ? '管理已注册的用户，可修改信息或重置权限' : '管理你的本地阅读库资源，支持自动关联/创建作者'}
           </p>
        </div>
        {!isEditing && (
          <button onClick={() => { setIsEditing(true); setFormData({}); setUploadStatus('idle'); }} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all">
            <Plus className="w-5 h-5" /> 新增记录
          </button>
        )}
      </div>

      {isEditing && (
        <div className="bg-white p-8 rounded-3xl border border-blue-100 shadow-2xl shadow-blue-50/50 space-y-6 animate-in fade-in zoom-in duration-300">
          <div className="flex items-center justify-between border-b border-gray-50 pb-4">
            <h3 className="text-xl font-bold text-gray-800">编辑 {activeTab === 'users' ? '用户' : '记录'} 详情</h3>
            <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="w-6 h-6" /></button>
          </div>
          {renderForm()}
          <div className="flex gap-3 justify-end pt-4">
            <button onClick={() => setIsEditing(false)} className="px-6 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-2xl transition-all">取消</button>
            <button onClick={handleSave} className="bg-blue-600 text-white px-10 py-3 rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">保存更改</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-xl shadow-gray-200/20">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-black tracking-widest border-b border-gray-100">
            <tr>
              <th className="px-8 py-5">核心信息</th>
              <th className="px-8 py-5">附加属性</th>
              <th className="px-8 py-5 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(activeTab === 'books' ? books : activeTab === 'authors' ? authors : activeTab === 'users' ? users : activeTab === 'categories' ? categories : tags).map((item: any) => (
              <tr key={item.id} className="group hover:bg-blue-50/10 transition-all">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-5">
                    {activeTab === 'users' ? (
                      <img src={item.avatar} className="w-12 h-12 rounded-full border-2 border-white shadow-md group-hover:scale-110 transition-transform" />
                    ) : item.cover ? (
                      <img src={item.cover} className="w-12 h-16 object-cover rounded-lg shadow-md group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-12 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-gray-300"><BookIcon className="w-6 h-6" /></div>
                    )}
                    <div>
                      <div className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{item.username || item.title || item.name}</div>
                      <div className="text-[10px] font-mono text-gray-300 mt-1 uppercase">ID: {item.id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6 text-sm text-gray-500 max-w-xs">
                  {activeTab === 'books' ? (
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-gray-800">{authors.find(a => a.id === item.authorId)?.name || '未知作者'}</span>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-md w-fit font-semibold text-gray-500">{categories.find(c => c.id === item.categoryId)?.name || '未分类'}</span>
                    </div>
                  ) : activeTab === 'users' ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-400">密码: <span className="font-mono">{item.password ? '已设置' : '未设置'}</span></span>
                      <span className="text-[10px] text-blue-500 font-black tracking-widest uppercase">REGULAR USER</span>
                    </div>
                  ) : (
                    <p className="line-clamp-2 opacity-60 text-xs leading-relaxed">{item.description || '暂无详细描述'}</p>
                  )}
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                    <button onClick={() => { 
                      const baseData = { ...item };
                      if (activeTab === 'books') {
                         baseData.authorName = authors.find(a => a.id === item.authorId)?.name || '';
                      }
                      setFormData(baseData); 
                      setIsEditing(true); 
                    }} className="p-3 text-blue-600 hover:bg-white hover:shadow-md rounded-xl transition-all"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-3 text-red-600 hover:bg-white hover:shadow-md rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(activeTab === 'books' ? books : activeTab === 'authors' ? authors : activeTab === 'users' ? users : activeTab === 'categories' ? categories : tags).length === 0 && (
          <div className="py-32 flex flex-col items-center justify-center text-gray-300 gap-4">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
              <BookIcon className="w-10 h-10" />
            </div>
            <p className="font-medium">暂无数据内容，点击右上方“新增”开始构建</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminManager;
