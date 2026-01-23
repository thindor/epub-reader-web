
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Layout from './components/Layout';
import AdminManager from './components/Admin/AdminManager';
import Reader from './components/Reader';
import { dbService } from './services/dbService';
import { Book, Author, Category, Tag, ShelfItem, User, SiteSettings } from './types';
import { Book as BookIcon, ChevronRight, Play, Loader2, Settings as SettingsIcon, ShieldCheck, Check, Filter, Search, Globe, LayoutDashboard, Image as ImageIcon, Save } from 'lucide-react';
import { useTranslation, LanguageProvider } from './translations';

const HomePage: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    const init = async () => {
      const allBooks = await dbService.getAll<Book>('books');
      setBooks(allBooks.slice(0, 12));
      setAuthors(await dbService.getAll<Author>('authors'));
      setLoading(false);
    };
    init();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-12 pb-20 max-w-[1400px] mx-auto">
      <section className="relative h-[400px] md:h-[450px] rounded-[3rem] overflow-hidden group shadow-2xl shadow-blue-100/50 border border-white">
        <img src="https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=1200" className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="Banner" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent flex flex-col justify-center px-8 md:px-20 text-white">
          <h1 className="text-4xl md:text-7xl font-black mb-6 max-w-2xl leading-[1.05] tracking-tight">{t('discover')}</h1>
          <p className="text-gray-300 max-w-md mb-10 text-lg opacity-90 leading-relaxed font-medium">{t('bannerSub')}</p>
          <Link to="/discover" className="bg-white text-black px-10 py-4 rounded-full font-black text-lg flex items-center gap-3 w-fit hover:bg-blue-600 hover:text-white transition-all shadow-xl active:scale-95">
            {t('startReading')} <Play className="w-4 h-4 fill-current" />
          </Link>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between mb-10">
          <div className="space-y-1"><h2 className="text-4xl font-black text-gray-900 tracking-tighter">{t('popular')}</h2><div className="h-1.5 w-12 bg-blue-600 rounded-full"></div></div>
          <Link to="/discover" className="group flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-blue-600 transition-all bg-white px-6 py-3 rounded-2xl shadow-sm border border-gray-50">
            {t('viewAll')} <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-8 gap-y-12">
          {books.map(book => (
            <Link key={book.id} to={`/book/${book.id}`} className="group block">
              <div className="relative aspect-[3/4.2] rounded-3xl overflow-hidden shadow-lg group-hover:shadow-2xl group-hover:-translate-y-4 transition-all duration-500 bg-white border border-gray-50">
                <img src={book.cover} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={book.title} />
              </div>
              <div className="mt-6 space-y-1">
                <h3 className="font-black text-gray-900 group-hover:text-blue-600 transition-colors truncate text-lg">{book.title}</h3>
                <p className="text-xs text-gray-400 font-black uppercase tracking-widest">{authors.find(a => a.id === book.authorId)?.name || 'Unknown'}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

const DiscoverPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || '';
  const { t } = useTranslation();
  
  const [books, setBooks] = useState<Book[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [loading, setLoading] = useState(true);

  useEffect(() => setSearchQuery(urlQuery), [urlQuery]);

  useEffect(() => {
    const fetchData = async () => {
      const allBooks = await dbService.getAll<Book>('books');
      const allAuthors = await dbService.getAll<Author>('authors');
      const allCats = await dbService.getAll<Category>('categories');
      setBooks(allBooks);
      setAuthors(allAuthors);
      setCategories(allCats);
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    let result = books;
    if (selectedCat !== 'all') result = result.filter(b => b.categoryId === selectedCat);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b => {
        const authorName = authors.find(a => a.id === b.authorId)?.name.toLowerCase() || '';
        return b.title.toLowerCase().includes(q) || 
               b.description.toLowerCase().includes(q) ||
               authorName.includes(q);
      });
    }
    setFilteredBooks(result);
  }, [selectedCat, searchQuery, books, authors]);

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <h1 className="text-5xl font-black text-gray-900 tracking-tighter">{searchQuery ? `${t('searchPlaceholder')}: ${searchQuery}` : t('viewAll')}</h1>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder={t('searchPlaceholder')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-white border border-gray-100 rounded-2xl py-3 pl-10 pr-6 outline-none shadow-sm w-full sm:w-64 font-bold text-sm" />
          </div>
          <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto hide-scrollbar">
            <button onClick={() => setSelectedCat('all')} className={`px-6 py-2.5 rounded-xl text-xs font-black ${selectedCat === 'all' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-500 hover:bg-gray-50'}`}>All</button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCat(cat.id)} className={`px-6 py-2.5 rounded-xl text-xs font-black whitespace-nowrap ${selectedCat === cat.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-500 hover:bg-gray-50'}`}>{cat.name}</button>
            ))}
          </div>
        </div>
      </div>
      {filteredBooks.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8">
          {filteredBooks.map(book => (
            <Link key={book.id} to={`/book/${book.id}`} className="group">
              <div className="aspect-[3/4.2] rounded-3xl overflow-hidden shadow-md group-hover:shadow-2xl transition-all border border-gray-50">
                 <img src={book.cover} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt={book.title} />
              </div>
              <div className="mt-4">
                <h3 className="font-bold text-gray-900 truncate text-sm">{book.title}</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{authors.find(a => a.id === book.authorId)?.name}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="py-40 text-center flex flex-col items-center gap-6 opacity-20">
          <Search className="w-16 h-16" />
          <p className="text-xl font-black uppercase tracking-widest">No books found</p>
        </div>
      )}
    </div>
  );
};

const ShelfPage: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const { t } = useTranslation();
  const [currentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('current_user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    const fetchShelf = async () => {
      if (!currentUser) return;
      const allBooks = await dbService.getAll<Book>('books');
      const shelfItems = await dbService.getAll<ShelfItem>('shelf');
      const userShelfIds = shelfItems.filter(item => item.userId === currentUser.id).map(item => item.bookId);
      setBooks(allBooks.filter(book => userShelfIds.includes(book.id)));
    };
    fetchShelf();
  }, [currentUser]);

  if (!currentUser) return (
    <div className="py-32 text-center flex flex-col items-center gap-6">
      <ShieldCheck className="w-16 h-16 text-gray-200" /><h2 className="text-2xl font-black">{t('notLoggedIn')}</h2><p className="text-gray-400">{t('loginToShelf')}</p>
    </div>
  );

  return (
    <div className="space-y-12 pb-20">
      <h1 className="text-4xl font-black text-gray-900 tracking-tight">{t('shelfTitle')}</h1>
      {books.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8">
          {books.map(book => (
            <Link key={book.id} to={`/book/${book.id}`} className="group">
              <div className="aspect-[3/4.2] rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all border border-gray-50"><img src={book.cover} className="w-full h-full object-cover" alt={book.title} /></div>
              <div className="mt-4"><h3 className="font-bold text-gray-900 truncate">{book.title}</h3></div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="py-32 text-center border-4 border-dashed border-gray-100 rounded-[3rem] text-gray-300 flex flex-col items-center gap-4">
           <BookIcon className="w-12 h-12" /><p className="text-xl font-black">Shelf Empty</p>
        </div>
      )}
    </div>
  );
};

const BookDetailPage: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [inShelf, setInShelf] = useState(false);
  const { t } = useTranslation();
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
        if (currentUser) {
          const shelfItems = await dbService.getAll<ShelfItem>('shelf');
          setInShelf(shelfItems.some(item => item.userId === currentUser.id && item.bookId === bookId));
        }
      }
    };
    fetch();
  }, [bookId, currentUser]);

  const toggleShelf = async () => {
    if (!currentUser) return alert(t('notLoggedIn'));
    const shelfId = `${currentUser.id}_${bookId}`;
    if (inShelf) { await dbService.delete('shelf', shelfId); setInShelf(false); }
    else { await dbService.put('shelf', { id: shelfId, userId: currentUser.id, bookId: bookId!, addedAt: Date.now() }); setInShelf(true); }
  };

  if (!book) return null;

  return (
    <div className="max-w-6xl mx-auto py-16">
      <div className="flex flex-col md:flex-row gap-20 items-start">
        <div className="w-full md:w-96 shrink-0 shadow-2xl rounded-[3rem] overflow-hidden aspect-[3/4.2] border border-white">
          <img src={book.cover} className="w-full h-full object-cover" alt={book.title} />
        </div>
        <div className="flex-1 space-y-10">
          <h1 className="text-6xl font-black text-gray-900 tracking-tight leading-tight">{book.title}</h1>
          <div className="bg-white/40 p-8 rounded-[2.5rem] italic text-gray-600 text-xl border-l-[6px] border-l-blue-600 shadow-sm">{book.description}</div>
          <div className="flex flex-wrap gap-6 pt-8">
             <Link to={`/reader/${book.id}`} className="bg-blue-600 text-white px-12 py-5 rounded-full font-black text-xl shadow-2xl shadow-blue-200 hover:scale-105 active:scale-95 transition-all">Start Reading</Link>
             <button onClick={toggleShelf} className={`bg-white border-2 px-12 py-5 rounded-full font-black text-xl hover:bg-gray-50 transition-all ${inShelf ? 'border-blue-200 text-blue-600' : 'border-gray-100 text-gray-600'}`}>
               {inShelf ? 'In Shelf' : 'Add to Shelf'}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingsPage: React.FC = () => {
  const { t, lang, setLang } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    id: 'global',
    siteName: '微信读书',
  });
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => sessionStorage.getItem('admin_auth') === 'true');

  useEffect(() => {
    const fetchSettings = async () => {
      const settings = await dbService.get<SiteSettings>('settings', 'global');
      if (settings) setSiteSettings(settings);
    };
    fetchSettings();

    const handleAuthChange = () => {
      setIsAdminLoggedIn(sessionStorage.getItem('admin_auth') === 'true');
    };
    window.addEventListener('admin-auth-change', handleAuthChange);
    return () => window.removeEventListener('admin-auth-change', handleAuthChange);
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setSiteSettings(prev => ({ ...prev, logoUrl: event.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const saveGlobalSettings = async () => {
    setIsSaving(true);
    try {
      await dbService.put('settings', siteSettings);
      // 派发全局同步事件
      window.dispatchEvent(new Event('site-settings-update'));
      alert("配置已成功保存并同步");
    } catch (e) {
      alert("保存配置失败，请重试");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 space-y-12">
      <div className="space-y-2"><h1 className="text-4xl font-black text-gray-900 tracking-tight">{t('settings')}</h1></div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-50 space-y-6">
          <h3 className="text-xl font-black text-gray-800 flex items-center gap-3"><Globe className="w-5 h-5 text-blue-600" /> {t('language')}</h3>
          <div className="flex gap-4">
            <button onClick={() => setLang('zh')} className={`flex-1 py-4 rounded-2xl font-black transition-all shadow-sm ${lang === 'zh' ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>中文</button>
            <button onClick={() => setLang('en')} className={`flex-1 py-4 rounded-2xl font-black transition-all shadow-sm ${lang === 'en' ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>English</button>
          </div>
        </div>

        {isAdminLoggedIn ? (
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-50 space-y-6">
            <h3 className="text-xl font-black text-gray-800 flex items-center gap-3"><LayoutDashboard className="w-5 h-5 text-blue-600" /> {t('siteConfig')}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-500 mb-1">{t('siteName')}</label>
                <input 
                  type="text" 
                  value={siteSettings.siteName} 
                  onChange={e => setSiteSettings(prev => ({ ...prev, siteName: e.target.value }))}
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-sm outline-none ring-2 ring-transparent focus:ring-blue-100 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-500 mb-1">{t('siteLogo')}</label>
                <div className="flex items-center gap-4">
                  {siteSettings.logoUrl && (
                    <img src={siteSettings.logoUrl} className="w-12 h-12 rounded-xl object-cover border" alt="Logo" />
                  )}
                  <label className="flex-1 cursor-pointer bg-gray-50 hover:bg-gray-100 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-gray-600 transition-colors">
                    <ImageIcon className="w-4 h-4" /> {t('uploadLogo')}
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                </div>
              </div>
              <button 
                onClick={saveGlobalSettings}
                disabled={isSaving}
                className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-black shadow-lg shadow-blue-100 flex items-center justify-center gap-2 hover:bg-blue-700 disabled:bg-gray-200 transition-all"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {t('saveSettings')}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50/50 p-8 rounded-[2rem] border border-blue-100/50 flex flex-col items-center justify-center text-center gap-4">
             <ShieldCheck className="w-10 h-10 text-blue-200" />
             <p className="text-xs font-black text-blue-400 uppercase tracking-widest leading-relaxed">请前往后台登录以修改<br/>站点全局配置</p>
             <Link to="/admin" className="text-blue-600 font-black text-sm hover:underline">去登录</Link>
          </div>
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
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
    </LanguageProvider>
  );
};
export default App;
