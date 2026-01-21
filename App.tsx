
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import AdminManager from './components/Admin/AdminManager';
import Reader from './components/Reader';
import { dbService } from './services/dbService';
import { Book, Author, Category, Tag, ShelfItem, User } from './types';
import { Book as BookIcon, ChevronRight, Play, Loader2, Settings as SettingsIcon, ShieldCheck, Check } from 'lucide-react';

const HomePage: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      setBooks(await dbService.getAll<Book>('books'));
      setAuthors(await dbService.getAll<Author>('authors'));
      setLoading(false);
    };
    init();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-10 pb-20">
      <section className="relative h-64 md:h-80 rounded-[2.5rem] overflow-hidden group shadow-2xl shadow-blue-50 border border-white">
        <img src="https://picsum.photos/seed/discover/1200/400" className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="Banner" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent flex flex-col justify-center px-10 md:px-16 text-white">
          <span className="bg-blue-600 w-fit px-4 py-1.5 rounded-full text-[10px] font-black mb-6 tracking-widest uppercase shadow-xl shadow-blue-500/30">今日精选推荐</span>
          <h1 className="text-4xl md:text-6xl font-black mb-6 max-w-xl leading-[1.1] tracking-tight">在数字阅读中<br/>重塑你的认知世界</h1>
          <p className="text-gray-200 max-w-sm mb-10 text-base opacity-80 leading-relaxed font-medium">深度解析，精选优质内容，从科幻史诗到文学经典，带你领略思想的魅力。</p>
          <button className="bg-white text-black px-10 py-4 rounded-full font-black text-lg flex items-center gap-3 w-fit hover:bg-gray-100 transition-all shadow-2xl shadow-black/20 active:scale-95">
            立刻开启探索 <Play className="w-5 h-5 fill-current" />
          </button>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">热门书籍</h2>
            <p className="text-gray-400 text-sm mt-1 font-medium">当前社区最受欢迎的书籍排行</p>
          </div>
          <button className="text-sm font-bold text-gray-500 hover:text-blue-600 flex items-center gap-2 transition-all bg-white px-5 py-2.5 rounded-full shadow-sm hover:shadow-md">
            查看全部 <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8 md:gap-10">
          {books.map(book => (
            <Link key={book.id} to={`/book/${book.id}`} className="group relative">
              <div className="aspect-[3/4.2] rounded-2xl overflow-hidden shadow-xl shadow-gray-200/50 group-hover:shadow-2xl group-hover:shadow-blue-200 group-hover:-translate-y-3 transition-all duration-700 relative bg-gray-100">
                <img src={book.cover || 'https://via.placeholder.com/300x400?text=No+Cover'} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={book.title} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-5">
                   <div className="text-white text-sm font-black flex items-center gap-2">立即阅读 <ChevronRight className="w-4 h-4" /></div>
                </div>
              </div>
              <div className="mt-5 space-y-1.5">
                <h3 className="font-black text-gray-900 group-hover:text-blue-600 transition-colors truncate text-base">{book.title}</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{authors.find(a => a.id === book.authorId)?.name || '未知作者'}</p>
              </div>
            </Link>
          ))}
          {books.length === 0 && (
            <div className="col-span-full py-32 text-center border-4 border-dashed border-gray-100 rounded-[3rem] text-gray-300 flex flex-col items-center gap-4 group hover:border-blue-100 transition-all duration-500">
               <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                  <BookIcon className="w-10 h-10" />
               </div>
               <div className="space-y-1">
                 <p className="text-xl font-black">图书馆空空如也</p>
                 <p className="text-sm font-medium">去 <Link to="/admin" className="text-blue-600 font-black hover:underline underline-offset-4 decoration-2">管理后台</Link> 上传并创建你的首本书籍</p>
               </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

const ShelfPage: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('current_user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    const fetchShelf = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }
      const allBooks = await dbService.getAll<Book>('books');
      const shelfItems = await dbService.getAll<ShelfItem>('shelf');
      const userShelfIds = shelfItems
        .filter(item => item.userId === currentUser.id)
        .map(item => item.bookId);
      
      const filteredBooks = allBooks.filter(book => userShelfIds.includes(book.id));
      setBooks(filteredBooks);
      setAuthors(await dbService.getAll<Author>('authors'));
      setLoading(false);
    };
    fetchShelf();
  }, [currentUser]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  if (!currentUser) {
    return (
      <div className="py-32 text-center flex flex-col items-center gap-6">
        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center text-gray-300"><ShieldCheck className="w-10 h-10" /></div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black">请先登录</h2>
          <p className="text-gray-400 font-medium">登录后即可同步查看您的个人书架收藏</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      <div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">我的书架</h1>
        <p className="text-gray-400 font-medium mt-1">您收藏及阅读过的所有书籍资源</p>
      </div>

      {books.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8">
          {books.map(book => (
            <Link key={book.id} to={`/book/${book.id}`} className="group">
              <div className="aspect-[3/4.2] rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all relative">
                 <img src={book.cover} className="w-full h-full object-cover" alt={book.title} />
              </div>
              <div className="mt-4">
                <h3 className="font-bold text-gray-900 truncate">{book.title}</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                  {authors.find(a => a.id === book.authorId)?.name || '未知作者'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="py-32 text-center border-4 border-dashed border-gray-100 rounded-[3rem] text-gray-300 flex flex-col items-center gap-4">
           <BookIcon className="w-12 h-12" />
           <p className="text-xl font-black">书架还是空的</p>
           <Link to="/" className="bg-blue-600 text-white px-8 py-3 rounded-full font-black shadow-lg">去发现新书</Link>
        </div>
      )}
    </div>
  );
};

const BookDetailPage: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [author, setAuthor] = useState<Author | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [inShelf, setInShelf] = useState(false);
  const [currentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('current_user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    const fetch = async () => {
      const allBooks = await dbService.getAll<Book>('books');
      const b = allBooks.find(item => item.id === bookId);
      if (b) {
        setBook(b);
        const allAuthors = await dbService.getAll<Author>('authors');
        setAuthor(allAuthors.find(a => a.id === b.authorId) || null);
        const allCats = await dbService.getAll<Category>('categories');
        setCategory(allCats.find(c => c.id === b.categoryId) || null);

        if (currentUser) {
          const shelfItems = await dbService.getAll<ShelfItem>('shelf');
          setInShelf(shelfItems.some(item => item.userId === currentUser.id && item.bookId === bookId));
        }
      }
      setLoading(false);
    };
    fetch();
  }, [bookId, currentUser]);

  const toggleShelf = async () => {
    if (!currentUser) {
      alert("请先登录再执行此操作");
      return;
    }
    const shelfId = `${currentUser.id}_${bookId}`;
    if (inShelf) {
      await dbService.delete('shelf', shelfId);
      setInShelf(false);
    } else {
      await dbService.put('shelf', {
        id: shelfId,
        userId: currentUser.id,
        bookId: bookId!,
        addedAt: Date.now()
      });
      setInShelf(true);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  if (!book) return <div className="text-center py-20 font-bold text-gray-400">书籍不存在</div>;

  return (
    <div className="max-w-6xl mx-auto py-8 md:py-16 space-y-16">
      <div className="flex flex-col md:flex-row gap-12 md:gap-20 items-start">
        <div className="w-full md:w-96 shrink-0 shadow-[0_30px_70px_rgba(0,0,0,0.2)] rounded-3xl overflow-hidden aspect-[3/4.2] border border-white">
          <img src={book.cover || 'https://via.placeholder.com/300x400?text=No+Cover'} className="w-full h-full object-cover" alt={book.title} />
        </div>
        <div className="flex-1 space-y-10 py-6">
          <div className="space-y-6">
            <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight leading-tight">{book.title}</h1>
            <div className="flex flex-wrap items-center gap-6 text-gray-500 font-bold">
              <span className="text-blue-600 text-2xl font-black tracking-tight">{author?.name || '未知作者'}</span>
              <span className="w-2 h-2 rounded-full bg-gray-200"></span>
              <span className="bg-gray-100 px-4 py-1.5 rounded-full text-sm uppercase tracking-widest">{category?.name || '未分类'}</span>
            </div>
          </div>
          <div className="bg-white/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-gray-100/50 italic text-gray-600 leading-[1.8] text-xl border-l-[6px] border-l-blue-600 shadow-sm">
            {book.description || '暂无详细书籍简介，作者正在努力撰写中...'}
          </div>
          <div className="pt-8 flex flex-wrap gap-6">
             {book.epubUrl ? (
                <Link 
                  to={`/reader/${book.id}`}
                  className="bg-blue-600 text-white px-12 py-5 rounded-full font-black text-xl shadow-2xl shadow-blue-200 hover:bg-blue-700 hover:scale-105 active:scale-[0.98] transition-all flex items-center gap-4 group"
                >
                  <BookIcon className="w-6 h-6 group-hover:rotate-12 transition-transform" /> 立即开启阅读
                </Link>
             ) : (
                <button disabled className="bg-gray-200 text-gray-400 px-12 py-5 rounded-full font-black text-xl cursor-not-allowed border border-gray-300">暂无资源文件</button>
             )}
             <button 
              onClick={toggleShelf}
              className={`px-12 py-5 rounded-full font-black text-xl transition-all active:scale-[0.98] shadow-md border-2 flex items-center gap-3 ${
                inShelf 
                ? 'bg-gray-50 border-blue-200 text-blue-600' 
                : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50 hover:border-blue-100'
              }`}
             >
               {inShelf ? <><Check className="w-6 h-6" /> 已在书架</> : '加入我的书架'}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingsPage: React.FC = () => {
  const [isLoggedIn] = useState<boolean>(() => sessionStorage.getItem('admin_auth') === 'true');

  if (!isLoggedIn) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center">
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl shadow-blue-50 border border-blue-50 space-y-6">
          <div className="w-20 h-20 bg-gray-100 rounded-3xl mx-auto flex items-center justify-center text-gray-400 mb-4">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-gray-900">访问受限</h1>
          <p className="text-gray-500 font-medium leading-relaxed">系统设置区域仅限管理员访问。请先前往管理后台登录后再返回此页面。</p>
          <div className="pt-6">
            <Link to="/admin" className="inline-block bg-blue-600 text-white px-10 py-4 rounded-full font-black text-lg shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95">前往登录</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 space-y-12">
      <div className="space-y-2">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">系统设置</h1>
        <p className="text-gray-400 font-medium">配置网站全局参数与阅读体验</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-50 space-y-6">
          <h3 className="text-xl font-black text-gray-800 flex items-center gap-3">
             <SettingsIcon className="w-5 h-5 text-blue-600" /> 阅读偏好
          </h3>
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <span className="text-gray-600 font-bold">默认翻页模式</span>
                <select className="bg-gray-50 border-none rounded-xl px-4 py-2 font-bold text-sm outline-none"><option>仿真翻页</option><option>上下滚动</option></select>
             </div>
             <div className="flex items-center justify-between">
                <span className="text-gray-600 font-bold">自动保存进度</span>
                <div className="w-12 h-6 bg-blue-600 rounded-full relative cursor-pointer shadow-inner"><div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div></div>
             </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-50 space-y-6">
          <h3 className="text-xl font-black text-gray-800 flex items-center gap-3">
             <ShieldCheck className="w-5 h-5 text-blue-600" /> 安全与存储
          </h3>
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <span className="text-gray-600 font-bold">本地数据同步</span>
                <button className="text-blue-600 font-black text-sm hover:underline">立即同步</button>
             </div>
             <div className="flex items-center justify-between">
                <span className="text-gray-600 font-bold">清除本地缓存</span>
                <button className="text-red-500 font-black text-sm hover:underline">清除空间</button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout><HomePage /></Layout>} />
        <Route path="/shelf" element={<Layout><ShelfPage /></Layout>} />
        <Route path="/book/:bookId" element={<Layout><BookDetailPage /></Layout>} />
        <Route path="/admin" element={<Layout><AdminManager /></Layout>} />
        <Route path="/settings" element={<Layout><SettingsPage /></Layout>} />
        <Route path="/reader/:bookId" element={<Reader />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
