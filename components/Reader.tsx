
import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, List, Moon, Sun, Type, X, Loader2, AlertCircle, Bookmark as BookmarkIcon, Trash2, CheckCircle2 } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { dbService } from '../services/dbService';
import { Book, Bookmark, User, ShelfItem } from '../types';

declare const ePub: any;
declare const JSZip: any;

const Reader: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  
  // 基础状态
  const [bookData, setBookData] = useState<Book | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('current_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  // 阅读器核心引用
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<any>(null);
  const bookInstanceRef = useRef<any>(null);
  
  // UI 状态
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toc, setToc] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [showToc, setShowToc] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'toc' | 'bookmarks'>('toc');
  const [theme, setTheme] = useState<'light' | 'dark' | 'sepia'>('light');
  const [fontSize, setFontSize] = useState(100);
  
  // 书签反馈状态
  const [showToast, setShowToast] = useState(false);
  const [lastLocation, setLastLocation] = useState<string | null>(null);

  // 初始化书籍和书签数据
  useEffect(() => {
    const initData = async () => {
      try {
        const books = await dbService.getAll<Book>('books');
        const found = books.find(b => b.id === bookId);
        if (found) {
          setBookData(found);
          const allBookmarks = await dbService.getAll<Bookmark>('bookmarks');
          const userBookmarks = allBookmarks.filter(bm => bm.bookId === bookId && bm.userId === currentUser?.id);
          setBookmarks(userBookmarks.sort((a, b) => b.createdAt - a.createdAt));
        } else {
          setError("未找到书籍资源");
        }
      } catch (err) {
        setError("加载数据库失败");
      }
    };
    initData();
  }, [bookId, currentUser]);

  // 渲染引擎逻辑
  useEffect(() => {
    if (!bookData || !bookData.epubUrl || !viewerRef.current) return;

    if (typeof window !== 'undefined' && !(window as any).JSZip && (window as any).JSZip !== JSZip) {
      (window as any).JSZip = JSZip;
    }

    let book: any;
    
    const setupReader = async () => {
      try {
        const base64ToArrayBuffer = (base64: string) => {
          const base64String = base64.split(',')[1];
          const binaryString = window.atob(base64String);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          return bytes.buffer;
        };

        const buffer = base64ToArrayBuffer(bookData.epubUrl!);
        book = ePub(buffer);
        bookInstanceRef.current = book;

        const rendition = book.renderTo(viewerRef.current, {
          width: '100%',
          height: '100%',
          flow: 'paginated',
          manager: 'default'
        });
        renditionRef.current = rendition;

        // 注册主题
        const themes = {
          dark: { body: { background: '#121212 !important', color: '#d1d1d1 !important' } },
          sepia: { body: { background: '#f4ecd8 !important', color: '#5b4636 !important' } },
          light: { body: { background: '#ffffff !important', color: '#333333 !important' } }
        };
        rendition.themes.register(themes);
        rendition.themes.select(theme);
        rendition.themes.fontSize(`${fontSize}%`);

        // 核心监听：实时追踪位置
        rendition.on('relocated', (location: any) => {
          setLastLocation(location.start.cfi);
          if (currentUser) {
            localStorage.setItem(`progress_${currentUser.id}_${bookId}`, location.start.cfi);
          }
        });

        await book.ready;
        const nav = await book.loaded.navigation;
        setToc(nav.toc || []);

        const savedProgress = currentUser ? localStorage.getItem(`progress_${currentUser.id}_${bookId}`) : null;
        await rendition.display(savedProgress || undefined);
        
        setIsReady(true);
      } catch (err) {
        console.error(err);
        setError("排版引擎解析失败");
      }
    };

    setupReader();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') renditionRef.current?.prev();
      if (e.key === 'ArrowRight') renditionRef.current?.next();
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      window.removeEventListener('keydown', handleKey);
      if (bookInstanceRef.current) bookInstanceRef.current.destroy();
    };
  }, [bookData]);

  useEffect(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.fontSize(`${fontSize}%`);
    }
  }, [fontSize]);

  useEffect(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.select(theme);
    }
  }, [theme]);

  // 添加书签
  const handleAddBookmark = async () => {
    if (!currentUser) {
      alert("请先登录以保存书签");
      return;
    }
    if (!renditionRef.current || !lastLocation) return;

    const location = renditionRef.current.currentLocation();
    let chapterTitle = "未知章节";
    
    if (location && location.start) {
      const chapter = toc.find(item => {
        const itemHref = item.href.split('#')[0];
        return location.start.href.includes(itemHref);
      });
      if (chapter) chapterTitle = chapter.label.trim();
    }

    const newBookmark: Bookmark = {
      id: 'bm' + Date.now(),
      userId: currentUser.id,
      bookId: bookId!,
      cfi: lastLocation,
      label: chapterTitle,
      createdAt: Date.now()
    };

    try {
      await dbService.put('bookmarks', newBookmark);
      
      // 核心修复：自动加入书架
      const shelfId = `${currentUser.id}_${bookId}`;
      const shelfItems = await dbService.getAll<ShelfItem>('shelf');
      if (!shelfItems.some(item => item.id === shelfId)) {
        await dbService.put('shelf', {
          id: shelfId,
          userId: currentUser.id,
          bookId: bookId!,
          addedAt: Date.now()
        });
      }

      setBookmarks(prev => [newBookmark, ...prev]);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (err) {
      alert("书签保存失败");
    }
  };

  const removeBookmark = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await dbService.delete('bookmarks', id);
      setBookmarks(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      alert("删除失败");
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white p-10 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-6" />
        <h2 className="text-2xl font-black mb-4">阅读器启动失败</h2>
        <p className="text-gray-400 mb-8">{error}</p>
        <button onClick={() => navigate(-1)} className="bg-blue-600 text-white px-10 py-3 rounded-full font-bold shadow-xl">返回重试</button>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-50 flex flex-col transition-colors duration-500 overflow-hidden ${
      theme === 'dark' ? 'bg-[#121212]' : theme === 'sepia' ? 'bg-[#f4ecd8]' : 'bg-white'
    }`}>
      <header className={`h-14 px-4 flex items-center justify-between border-b transition-colors z-30 shadow-sm ${
        theme === 'dark' ? 'border-gray-800 bg-[#121212]' : theme === 'sepia' ? 'border-[#e2d6b5] bg-[#f4ecd8]' : 'border-gray-100 bg-white'
      }`}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-black/5"><X className="w-5 h-5" /></button>
          <span className="font-bold truncate max-w-[120px] md:max-w-sm">{bookData?.title}</span>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={handleAddBookmark} 
            title="添加书签"
            className={`p-2 rounded-xl transition-all ${showToast ? 'text-green-500 scale-125' : 'text-blue-600 hover:bg-black/5'}`}
          >
            {showToast ? <CheckCircle2 className="w-5 h-5" /> : <BookmarkIcon className="w-5 h-5" />}
          </button>
          <button onClick={() => setShowToc(!showToc)} className={`p-2 rounded-xl transition-colors ${showToc ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-black/5'}`}>
            <List className="w-5 h-5" />
          </button>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'sepia' : 'dark')} className="p-2 rounded-xl hover:bg-black/5">
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button onClick={() => setFontSize(s => s >= 180 ? 100 : s + 20)} className="p-2 rounded-xl hover:bg-black/5">
            <Type className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 relative flex justify-center items-stretch overflow-hidden">
        {!isReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-40 bg-inherit">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
            <p className="text-xs font-black tracking-widest uppercase opacity-30">加载内容中...</p>
          </div>
        )}
        
        <div ref={viewerRef} className="w-full h-full max-w-4xl mx-auto" />
        
        <div onClick={() => renditionRef.current?.prev()} className="absolute left-0 top-0 bottom-0 w-[15%] cursor-w-resize z-10" />
        <div onClick={() => renditionRef.current?.next()} className="absolute right-0 top-0 bottom-0 w-[15%] cursor-e-resize z-10" />

        {showToast && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="bg-black/80 text-white px-6 py-3 rounded-full flex items-center gap-3 backdrop-blur-md shadow-2xl">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-sm font-black tracking-wide">书签已保存并同步至书架</span>
            </div>
          </div>
        )}

        {showToc && (
          <>
            <div className="absolute inset-0 bg-black/40 z-40 backdrop-blur-sm animate-in fade-in" onClick={() => setShowToc(false)} />
            <aside className={`absolute inset-y-0 left-0 w-80 shadow-2xl z-50 flex flex-col transform transition-transform animate-in slide-in-from-left duration-500 border-r ${
              theme === 'dark' ? 'bg-[#1a1a1a] border-gray-800 text-gray-400' : 'bg-white border-gray-100 text-gray-600'
            }`}>
              <div className="p-4 flex gap-2 border-b border-gray-50/10 shrink-0">
                <button 
                  onClick={() => setSidebarTab('toc')} 
                  className={`flex-1 py-3 text-xs font-black rounded-xl transition-all uppercase tracking-widest ${sidebarTab === 'toc' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'hover:bg-black/5'}`}
                >
                  目录内容
                </button>
                <button 
                  onClick={() => setSidebarTab('bookmarks')} 
                  className={`flex-1 py-3 text-xs font-black rounded-xl transition-all uppercase tracking-widest ${sidebarTab === 'bookmarks' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'hover:bg-black/5'}`}
                >
                  我的书签 ({bookmarks.length})
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-1 hide-scrollbar">
                {sidebarTab === 'toc' ? (
                  toc.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => { renditionRef.current?.display(item.href); setShowToc(false); }}
                      className={`w-full text-left px-5 py-4 text-sm rounded-2xl transition-all font-bold ${
                        theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-blue-50'
                      } active:scale-95`}
                    >
                      <span className="opacity-20 mr-4 font-mono">{(idx + 1).toString().padStart(2, '0')}</span>
                      {item.label.trim()}
                    </button>
                  ))
                ) : (
                  bookmarks.length > 0 ? (
                    bookmarks.map((bm) => (
                      <div 
                        key={bm.id} 
                        onClick={() => { renditionRef.current?.display(bm.cfi); setShowToc(false); }}
                        className={`group flex items-center justify-between p-4 rounded-2xl mb-2 transition-all cursor-pointer ${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <div className={`font-black text-sm truncate ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>{bm.label}</div>
                          <div className="text-[10px] font-bold opacity-30 mt-1 uppercase tracking-tighter">{new Date(bm.createdAt).toLocaleString()}</div>
                        </div>
                        <button 
                          onClick={(e) => removeBookmark(bm.id, e)}
                          className="p-2 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="py-32 text-center flex flex-col items-center gap-6 opacity-20">
                      <BookmarkIcon className="w-12 h-12" />
                      <p className="text-sm font-black uppercase tracking-[0.2em]">暂无任何书签</p>
                    </div>
                  )
                )}
              </div>
            </aside>
          </>
        )}
      </div>

      <footer className={`h-10 px-6 flex items-center justify-between text-[10px] font-black tracking-widest opacity-20 z-20 shrink-0 ${
         theme === 'dark' ? 'bg-[#121212] text-white' : 'bg-white text-black'
      }`}>
        <button onClick={() => renditionRef.current?.prev()} className="hover:opacity-100 transition-opacity">PREVIOUS</button>
        <div className="hidden sm:block">EPUB ENGINE X PRO / {bookData?.title}</div>
        <button onClick={() => renditionRef.current?.next()} className="hover:opacity-100 transition-opacity">NEXT PAGE</button>
      </footer>
    </div>
  );
};

export default Reader;
