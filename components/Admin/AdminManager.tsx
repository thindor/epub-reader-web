
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Upload, User as UserIcon, LayoutGrid, Book as BookIcon, CheckCircle2, X, Lock, Loader2, Users, MessageSquare, Save, ListTree, Image as ImageIcon, FileText } from 'lucide-react';
import { dbService } from '../../services/dbService';
import { Book, Author, Category, User, Annotation } from '../../types';

declare const ePub: any;

type Tab = 'books' | 'categories' | 'annotations' | 'authors' | 'users';

const AdminManager: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => sessionStorage.getItem('admin_auth') === 'true');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('books');
  const [books, setBooks] = useState<Book[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formData, setFormData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [epubLoading, setEpubLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [allBooks, allAuthors, allCats, allUsers, allAnns] = await Promise.all([
        dbService.getAll<Book>('books'),
        dbService.getAll<Author>('authors'),
        dbService.getAll<Category>('categories'),
        dbService.getAll<User>('users'),
        dbService.getAll<Annotation>('annotations')
      ]);
      setBooks(allBooks);
      setAuthors(allAuthors);
      setCategories(allCats);
      setUsers(allUsers);
      setAnnotations(allAnns);
    } catch (error) {}
  };

  useEffect(() => { if (isLoggedIn) fetchData(); }, [isLoggedIn, activeTab]);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const finalId = formData.id || (activeTab.charAt(0) + Date.now());
      let dataToSave = { ...formData, id: finalId, createdAt: formData.createdAt || Date.now() };

      if (activeTab === 'books') {
        if (!formData.title) throw new Error("书名必填");
        const authorName = formData.authorName || '佚名';
        let author = authors.find(a => a.name === authorName);
        if (!author) {
          author = { id: 'a' + Date.now(), name: authorName, description: '自动生成' };
          await dbService.put('authors', author);
        }
        dataToSave.authorId = author.id;
        delete dataToSave.authorName;
      }

      await dbService.put(activeTab, dataToSave);
      setIsEditing(false);
      setFormData({});
      await fetchData();
    } catch (e: any) { alert(e.message); }
    finally { setIsSaving(false); }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>, field: 'epubUrl' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (field === 'epubUrl') setEpubLoading(true);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const result = ev.target?.result as string;
      
      if (field === 'epubUrl' && file.name.endsWith('.epub')) {
        try {
          const base64 = result.split(',')[1];
          const binary = window.atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          
          const book = ePub(bytes.buffer);
          const meta = await book.loaded.metadata;
          
          setFormData(prev => ({
            ...prev,
            epubUrl: result,
            title: prev.title || meta.title || file.name.replace('.epub', ''),
            description: prev.description || meta.description || '',
            authorName: prev.authorName || meta.creator || ''
          }));
        } catch (err) {
          console.error("EPUB 解析失败", err);
          setFormData(prev => ({ ...prev, epubUrl: result, title: prev.title || file.name.replace('.epub', '') }));
        } finally {
          setEpubLoading(false);
        }
      } else {
        setFormData(prev => ({ ...prev, [field]: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      setIsLoggedIn(true);
      sessionStorage.setItem('admin_auth', 'true');
      window.dispatchEvent(new Event('admin-auth-change'));
    } else alert('密码错误');
  };

  if (!isLoggedIn) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-blue-50 w-full max-w-sm">
        <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-blue-100"><Lock /></div>
        <h2 className="text-2xl font-black mb-8">管理员登录</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="password" placeholder="密码 (admin123)" className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold outline-none ring-2 ring-transparent focus:ring-blue-100 transition-all" value={password} onChange={e => setPassword(e.target.value)} />
          <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl hover:bg-blue-700 transition-all">进入系统</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm gap-1">
          {[
            { id: 'books', label: '书籍', icon: <BookIcon className="w-4 h-4" /> },
            { id: 'categories', label: '分类', icon: <ListTree className="w-4 h-4" /> },
            { id: 'annotations', label: '想法笔记', icon: <MessageSquare className="w-4 h-4" /> },
            { id: 'authors', label: '作者', icon: <UserIcon className="w-4 h-4" /> },
            { id: 'users', label: '用户', icon: <Users className="w-4 h-4" /> }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
        <button onClick={() => { setFormData({}); setIsEditing(true); }} className={`bg-blue-600 text-white px-8 py-3 rounded-2xl font-black shadow-xl flex items-center gap-2 hover:bg-blue-700 transition-all ${activeTab === 'annotations' ? 'hidden' : 'flex'}`}>
          <Plus className="w-5 h-5" /> 新增内容
        </button>
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 overflow-y-auto max-h-[90vh] hide-scrollbar relative">
            <button onClick={() => setIsEditing(false)} className="absolute right-8 top-8 p-2 hover:bg-gray-100 rounded-full transition-colors"><X /></button>
            <div className="mb-8">
              <h3 className="text-3xl font-black">
                {formData.id ? '编辑' : '添加'}{activeTab === 'books' ? '书籍' : '内容'}
              </h3>
            </div>
            
            <div className="space-y-6">
              {activeTab === 'books' ? (
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-2 block">上传 EPUB 文件 (自动填充信息)</label>
                    <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-3xl p-8 cursor-pointer transition-all ${formData.epubUrl ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200 hover:border-blue-200 hover:bg-blue-50'}`}>
                      {epubLoading ? <Loader2 className="w-8 h-8 animate-spin text-blue-400" /> : formData.epubUrl ? <CheckCircle2 className="w-8 h-8 text-green-500" /> : <Upload className="w-8 h-8 text-gray-300" />}
                      <span className="text-xs font-black text-gray-500 mt-3">{epubLoading ? '正在解析元数据...' : formData.epubUrl ? 'EPUB 已解析，信息已同步' : '点击上传 .epub 文件'}</span>
                      <input type="file" accept=".epub" className="hidden" onChange={e => handleFile(e, 'epubUrl')} />
                    </label>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">书籍名称 *</label>
                    <input className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-blue-100" value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">作者</label>
                    <input className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" value={formData.authorName || (formData.authorId ? authors.find(a => a.id === formData.authorId)?.name : '') || ''} onChange={e => setFormData({...formData, authorName: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">分类</label>
                    <select className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" value={formData.categoryId || ''} onChange={e => setFormData({...formData, categoryId: e.target.value})}>
                      <option value="">选择分类</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">书籍简介</label>
                    <textarea className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none h-32 resize-none" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">书籍封面</label>
                    <label className="flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl p-10 cursor-pointer overflow-hidden relative group aspect-[16/6]">
                      {formData.cover ? <img src={formData.cover} className="absolute inset-0 w-full h-full object-cover" /> : <ImageIcon className="w-10 h-10 text-gray-300" />}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-sm font-black transition-opacity">上传封面图片</div>
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleFile(e, 'cover')} />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <input className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" placeholder="名称" value={formData.name || formData.username || ''} onChange={e => setFormData({...formData, name: e.target.value, username: e.target.value})} />
                  <textarea className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none h-32" placeholder="详情" value={formData.description || formData.password || ''} onChange={e => setFormData({...formData, description: e.target.value, password: e.target.value})} />
                </div>
              )}
              
              <div className="flex gap-4 pt-6">
                <button onClick={() => setIsEditing(false)} className="flex-1 py-4 font-black text-gray-400">取消</button>
                <button disabled={isSaving || epubLoading} onClick={handleSave} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-100 flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-all">
                  {isSaving ? <Loader2 className="animate-spin" /> : <Save className="w-5 h-5" />} 保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden min-h-[500px]">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 text-[10px] font-black uppercase text-gray-400 border-b">
            <tr>
              <th className="px-10 py-6">名称信息</th>
              <th className="px-10 py-6">详情</th>
              <th className="px-10 py-6 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(activeTab === 'books' ? books : activeTab === 'categories' ? categories : activeTab === 'annotations' ? annotations : activeTab === 'users' ? users : authors).map((item: any) => (
              <tr key={item.id} className="group hover:bg-blue-50/10 transition-colors">
                <td className="px-10 py-6">
                  <div className="flex items-center gap-5">
                    {activeTab === 'books' ? (
                      <img src={item.cover || 'https://picsum.photos/seed/default/300/400'} className="w-10 h-14 object-cover rounded-lg shadow-sm" />
                    ) : (
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500"><LayoutGrid className="w-4 h-4" /></div>
                    )}
                    <div className="min-w-0">
                      <div className="font-black text-gray-900 truncate max-w-[200px]">{item.title || item.name || item.username}</div>
                    </div>
                  </div>
                </td>
                <td className="px-10 py-6 text-xs text-gray-400 line-clamp-2 max-w-md">
                   {item.description || item.text || item.password || '-'}
                </td>
                <td className="px-10 py-6 text-right">
                  <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all">
                    {activeTab !== 'annotations' && <button onClick={() => { setFormData(item); setIsEditing(true); }} className="p-3 text-blue-500 hover:bg-blue-50 rounded-xl"><Edit className="w-4 h-4" /></button>}
                    <button onClick={async () => { if(confirm('确认删除？')) { await dbService.delete(activeTab, item.id); fetchData(); } }} className="p-3 text-red-500 hover:bg-red-50 rounded-xl"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default AdminManager;
