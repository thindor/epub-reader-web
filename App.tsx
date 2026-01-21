
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import AdminManager from './components/Admin/AdminManager';
import Reader from './components/Reader';
import { dbService } from './services/dbService';
import { Book, Author, Category, Tag, ShelfItem, User } from './types';
import { Book as BookIcon, ChevronRight, Play, Loader2, Settings as SettingsIcon, ShieldCheck, Check, Filter, Search } from 'lucide-react';

const HomePage: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const allBooks = await dbService.getAll<Book>('books');
      setBooks(allBooks.slice(0, 12)); // 首页仅展示前12本热门
      setAuthors(await dbService.getAll<Author>('authors'));
      setLoading(false);
    };
    init();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-12 pb-20 max-w-[1400px] mx-auto">
      {/* 优化后的横幅 */}
      <section className="relative h-[400px] md:h-[450px] rounded-[3rem] overflow-hidden group shadow-2xl shadow-blue-100/50 border border-white">
        <img src="https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=1200" className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="Banner" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent flex flex-col justify-center px-8 md:px-20 text-white">
          <div className="bg-blue-600/20 backdrop-blur-md border border-blue-400/30 w-fit px-4 py-1.5 rounded-full text-[10px] font-black mb-6 tracking-widest uppercase">
            Exclusive Selection
          </div>
          <h1 className="text-4xl md:text-7xl font-black mb-6 max-w-2xl leading-[1.05] tracking-tight">
            探索无限可能<br/>阅读成就非凡
          </h1>
          <p className="text-gray-300 max-w-md mb-10 text-lg opacity-90 leading-relaxed font-medium">
            我们精选全球优质数字读物，涵盖文学、科技、历史与想象，让阅读成为一种生活方式。
          </p>
          <div className="flex items-center gap-4">
            <Link to="/discover" className="bg-white text-black px-10 py-4 rounded-full font-black text-lg flex items-center gap-3 w-fit hover:bg-blue-600 hover:text-white transition-all shadow-xl active:scale-95">
              立即开启探索 <Play className="w-4 h-4 fill-current" />
            </Link>
          </div>
        </div>
      </section>

      {/* 热门书籍板块 */}
      <section>
        <div className="flex items-end justify-between mb-10">
          <div className="space-y-1">
            <h2 className="text-4xl font-black text-gray-900 tracking-tighter">热门书籍</h2>
            <div className="h-1.5 w-12 bg-blue-600 rounded-full"></div>
          </div>
          <Link to="/discover" className="group flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-blue-600 transition-all bg-white px-6 py-3 rounded-2xl shadow-sm hover:shadow-md border border-gray-50">
            查看全部 <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-8 gap-y-12">
          {books.map(book => (
            <Link key={book.id} to={`/book/${book.id}`} className="group block">
              <div className="relative aspect-[3/4.2] rounded-3xl overflow-hidden shadow-lg group-hover:shadow-2xl group-hover:-translate-y-4 transition-all duration-500 bg-white border border-gray-50">
                <img src={book.cover} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={book.title} />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/30 text-white font-black text-xs">详情</div>
                </div>
              </div>
              <div className="mt-6 space-y-1">
                <h3 className="font-black text-gray-900 group-hover:text-blue-600 transition-colors truncate text-lg">{book.title}</h3>
                <p className="text-xs text-gray-400 font-black uppercase tracking-widest">{authors.find(a => a.id === book.authorId)?.name || '未知作者'}</p>
              </div>
            </Link>
          ))}
        </div>

        {books.length === 0 && (
          <div className="py-32 text-center bg-white rounded-[3rem] border border-gray-100 shadow-sm text-gray-300 flex flex-col items-center gap-6">
             <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-200">
                <BookIcon className="w-10 h-10" />
             </div>
             <div className="space-y-1">
               <p className="text-xl font-black text-gray-400">目前图书馆还是空的</p>
               <p className="text-sm font-medium">请前往 <Link to="/admin" className="text-blue-600 font-black hover:underline underline-offset-4">管理后台</Link> 上传书籍</p>
             </div>
          </div>
        )}
      </section>
    </div>
  );
};

const DiscoverPage: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const allBooks = await dbService.getAll<Book>('books');
      const allCats = await dbService.getAll<Category>('categories');
      setBooks(allBooks);
      setFilteredBooks(allBooks);
      setCategories(allCats);
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    let result = books;
    if (selectedCat !== 'all') {
      result = result.filter(b => b.categoryId === selectedCat);
    }
    if (searchQuery) {
      result = result.filter(b => b.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    setFilteredBooks(result);
  }, [selectedCat, searchQuery, books]);

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-2">
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter">全部书籍</h1>
          <p className="text-gray-400 font-medium text-lg">浏览我们的完整书库资源</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
            <input 
              type="text" 
              placeholder="搜索书名..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-white border border-gray-100 rounded-2xl py-3 pl-10 pr-6 outline-none shadow-sm focus:ring-2 focus:ring-blue-100 w-full sm:w-64 font-bold text-sm"
            />
          </div>
          <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto hide-scrollbar">
            <button 
              onClick={() => setSelectedCat('all')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${selectedCat === 'all' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              全部
            </button>
            {categories.map(cat => (
              <button 
                key={cat.id}
                onClick={() => setSelectedCat(cat.id)}
                className={`px-6 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all ${selectedCat === cat.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredBooks.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8">
          {filteredBooks.map(book => (
            <Link key={book.id} to={`/book/${book.id}`} className="group">
              <div className="aspect-[3/4.2] rounded-3xl overflow-hidden shadow-md group-hover:shadow-2xl transition-all relative border border-gray-50">
                 <img src={book.cover} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt={book.title} />
              </div>
              <div className="mt-4">
                <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate text-sm">{book.title}</h3>
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mt-1">
                  ID: {book.id.slice(0, 8)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="py-40 text-center flex flex-col items-center gap-6 opacity-30">
          <Search className="w-16 h-16" />
          <p className="text-xl font-black uppercase tracking-widest">未找到匹配书籍</p>
          <button onClick={() => { setSelectedCat('all'); setSearchQuery(''); }} className="text-blue-600 font-black hover:underline">重置搜索条件</button>
        </div>
      )}
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
      <div className="space-y-1">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">我的书架</h1>
        <p className="text-gray-400 font-medium mt-1">您收藏及阅读过的所有书籍资源</p>
      </div>

      {books.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8">
          {books.map(book => (
            <Link key={book.id} to={`/book/${book.id}`} className="group">
              <div className="aspect-[3/4.2] rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all relative border border-gray-50">
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
        <div className="w-full md:w-96 shrink-0 shadow-[0_30px_70px_rgba(0,0,0,0.2)] rounded-[3rem] overflow-hidden aspect-[3/4.2] border border-white">
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
        <Route path="/discover" element={<Layout><DiscoverPage /></Layout>} />
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
