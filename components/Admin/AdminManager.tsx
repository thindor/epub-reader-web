
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Upload, User as UserIcon, Tag as TagIcon, LayoutGrid, Book as BookIcon, CheckCircle2, X, Lock, LogIn, Loader2, Users, Image as ImageIcon, MessageSquare } from 'lucide-react';
import { dbService } from '../../services/dbService';
import { Book, Author, Category, Tag, User, Annotation } from '../../types';

type Tab = 'books' | 'authors' | 'categories' | 'tags' | 'users' | 'annotations';

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
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formData, setFormData] = useState<any>({});
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle');

  const fetchData = async () => {
    try {
      const [allBooks, allAuthors, allCats, allTags, allUsers, allAnns] = await Promise.all([
        dbService.getAll<Book>('books'),
        dbService.getAll<Author>('authors'),
        dbService.getAll<Category>('categories'),
        dbService.getAll<Tag>('tags'),
        dbService.getAll<User>('users'),
        dbService.getAll<Annotation>('annotations')
      ]);
      setBooks(allBooks);
      setAuthors(allAuthors);
      setCategories(allCats);
      setTags(allTags);
      setUsers(allUsers);
      setAnnotations(allAnns.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error("Failed to fetch admin data", error);
    }
  };

  useEffect(() => { 
    if (isLoggedIn) fetchData(); 
  }, [isLoggedIn, activeTab]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      setIsLoggedIn(true);
      sessionStorage.setItem('admin_auth', 'true');
      setLoginError('');
      window.dispatchEvent(new Event('admin-auth-change'));
    } else {
      setLoginError('密码错误，请重试');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    sessionStorage.removeItem('admin_auth');
    window.dispatchEvent(new Event('admin-auth-change'));
  };

  const handleSave = async () => {
    let finalId = formData.id || (activeTab.charAt(0) + Date.now());
    let dataToSave = { ...formData, id: finalId, createdAt: formData.createdAt || Date.now() };

    if (activeTab === 'books') {
      if (!formData.title) return alert("请输入书名");
      const existingAuthor = authors.find(a => a.name.trim() === formData.authorName?.trim());
      let authorId = existingAuthor ? existingAuthor.id : 'a' + Date.now();
      if (!existingAuthor && formData.authorName) {
        await dbService.put('authors', { id: authorId, name: formData.authorName.trim(), description: '系统自动生成' });
      }
      dataToSave.authorId = authorId;
      if (!dataToSave.cover) dataToSave.cover = `https://picsum.photos/seed/${finalId}/300/400`;
      delete dataToSave.authorName;
    }

    await dbService.put(activeTab, dataToSave);
    setIsEditing(false);
    setFormData({});
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (confirm("确定要删除吗？")) {
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
      setFormData({ ...formData, epubUrl: event.target?.result, title: formData.title || file.name.replace('.epub', '') });
      setUploadStatus('success');
    };
    reader.readAsDataURL(file);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white p-10 rounded-[2.5rem] shadow-2xl border border-blue-50">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-6"><Lock className="w-8 h-8" /></div>
            <h2 className="text-2xl font-black text-gray-900">后台管理登录</h2>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <input type="password" placeholder="管理员密码" className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-100 rounded-2xl p-4 outline-none font-bold" value={password} onChange={(e) => setPassword(e.target.value)} />
            {loginError && <p className="text-red-500 text-xs font-bold ml-2">{loginError}</p>}
            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-3"><LogIn className="w-5 h-5" /> 立即登录</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-20">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
          {[
            { id: 'books', label: '书籍', icon: <BookIcon className="w-4 h-4" /> },
            { id: 'annotations', label: '笔记想法', icon: <MessageSquare className="w-4 h-4" /> },
            { id: 'authors', label: '作者', icon: <UserIcon className="w-4 h-4" /> },
            { id: 'users', label: '用户', icon: <Users className="w-4 h-4" /> },
            { id: 'categories', label: '分类', icon: <LayoutGrid className="w-4 h-4" /> }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
        <button onClick={handleLogout} className="text-gray-400 text-sm font-bold hover:text-red-500">退出登录</button>
      </div>

      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-3xl font-black text-gray-900">{activeTab === 'annotations' ? '笔记与想法' : '内容库管理'}</h2>
           <p className="text-gray-400 text-sm mt-1">{activeTab === 'annotations' ? '在这里查看所有用户的划线和评论内容' : '管理您的书籍和作者数据'}</p>
        </div>
        {!isEditing && activeTab !== 'annotations' && (
          <button onClick={() => { setIsEditing(true); setFormData({}); setUploadStatus('idle'); }} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl hover:bg-blue-700 transition-all">
            <Plus className="w-5 h-5" /> 新增记录
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-xl">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-black border-b">
            <tr>
              <th className="px-8 py-5">基本信息</th>
              <th className="px-8 py-5">内容/属性</th>
              <th className="px-8 py-5 text-right">管理</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(activeTab === 'books' ? books : activeTab === 'authors' ? authors : activeTab === 'users' ? users : activeTab === 'categories' ? categories : activeTab === 'annotations' ? annotations : tags).map((item: any) => {
              // 联表查询逻辑
              const userName = activeTab === 'annotations' ? (users.find(u => u.id === item.userId)?.username || '未知用户') : null;
              const bookTitle = activeTab === 'annotations' ? (books.find(b => b.id === item.bookId)?.title || '未知书籍') : null;

              return (
                <tr key={item.id} className="group hover:bg-blue-50/10 transition-all">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-5">
                      {activeTab === 'users' ? (
                        <img src={item.avatar} className="w-12 h-12 rounded-full border shadow-sm" />
                      ) : activeTab === 'annotations' ? (
                        <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500"><MessageSquare className="w-6 h-6" /></div>
                      ) : (
                        <img src={item.cover || `https://picsum.photos/seed/${item.id}/300/400`} className="w-12 h-16 object-cover rounded-lg shadow-md" />
                      )}
                      <div>
                        <div className="font-bold text-gray-900 truncate max-w-[200px]">
                          {activeTab === 'annotations' ? bookTitle : (item.username || item.title || item.name || '无标题')}
                        </div>
                        <div className="text-[10px] font-mono text-gray-300 uppercase">
                          {activeTab === 'annotations' ? `用户: ${userName}` : `ID: ${item.id}`}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-sm text-gray-500">
                    {activeTab === 'annotations' ? (
                      <div className="flex flex-col gap-2 max-w-sm">
                        <div className="text-xs italic text-gray-400 line-clamp-1">"{item.text}"</div>
                        {item.comment && <div className="text-xs font-bold text-gray-700 bg-amber-50 p-2 rounded-lg border border-amber-100">{item.comment}</div>}
                        <div className="text-[9px] text-gray-300 uppercase mt-1">{new Date(item.createdAt).toLocaleString()}</div>
                      </div>
                    ) : (
                      <p className="line-clamp-2 opacity-60 text-xs">{item.description || item.password || '-'}</p>
                    )}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => handleDelete(item.id)} className="p-2.5 text-red-600 hover:bg-white rounded-xl shadow-sm"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(activeTab === 'books' ? books : activeTab === 'annotations' ? annotations : users).length === 0 && (
          <div className="py-32 flex flex-col items-center justify-center text-gray-300 gap-4">
            <BookIcon className="w-12 h-12" />
            <p className="font-black uppercase tracking-widest text-sm">暂无数据</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminManager;
