
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, List, Moon, Sun, Type, X, Loader2, AlertCircle, Bookmark as BookmarkIcon, Trash2, CheckCircle2, MessageSquare, Highlighter, Palette, Underline, Save } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { dbService } from '../services/dbService';
import { Book, Bookmark, User, ShelfItem, Annotation } from '../types';
import { useTranslation } from '../translations';

declare const ePub: any;
declare const JSZip: any;

const Reader: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [bookData, setBookData] = useState<Book | null>(null);
  const [currentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('current_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<any>(null);
  const bookInstanceRef = useRef<any>(null);
  
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toc, setToc] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [showToc, setShowToc] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'toc' | 'bookmarks' | 'annotations'>('toc');
  const [theme, setTheme] = useState<'light' | 'dark' | 'sepia'>('light');
  const [fontSize, setFontSize] = useState(100);
  
  const [showToast, setShowToast] = useState(false);
  const [lastLocation, setLastLocation] = useState<string | null>(null);

  const [selection, setSelection] = useState<{ cfiRange: string, text: string, rect: DOMRect } | null>(null);
  const [activeComment, setActiveComment] = useState<{ cfiRange: string, text: string } | null>(null);
  const [commentValue, setCommentValue] = useState('');

  // 1. 初始化数据
  useEffect(() => {
    const initData = async () => {
      try {
        const books = await dbService.getAll<Book>('books');
        const found = books.find(b => b.id === bookId);
        if (found) {
          setBookData(found);
          const allBookmarks = await dbService.getAll<Bookmark>('bookmarks');
          setBookmarks(allBookmarks.filter(bm => bm.bookId === bookId && bm.userId === currentUser?.id).sort((a, b) => b.createdAt - a.createdAt));
          
          const allAnns = await dbService.getAll<Annotation>('annotations');
          setAnnotations(allAnns.filter(a => a.bookId === bookId && a.userId === currentUser?.id));
        } else {
          setError(t('readerFail'));
        }
      } catch (err) {
        setError("Database error");
      }
    };
    initData();
  }, [bookId, currentUser?.id, t]);

  // 2. 渲染引擎逻辑
  useEffect(() => {
    if (!bookData || !bookData.epubUrl || !viewerRef.current) return;
    if (typeof window !== 'undefined' && !(window as any).JSZip) (window as any).JSZip = JSZip;

    const setupReader = async () => {
      try {
        // 使用更稳健的 Base64 转换
        const base64Data = bookData.epubUrl!.split(',')[1];
        const binaryString = window.atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const book = ePub(bytes.buffer);
        bookInstanceRef.current = book;
        const rendition = book.renderTo(viewerRef.current, { width: '100%', height: '100%', flow: 'paginated', manager: 'default' });
        renditionRef.current = rendition;

        rendition.themes.register({
          dark: { body: { background: '#121212 !important', color: '#d1d1d1 !important' } },
          sepia: { body: { background: '#f4ecd8 !important', color: '#5b4636 !important' } },
          light: { body: { background: '#ffffff !important', color: '#333333 !important' } }
        });
        rendition.themes.select(theme);
        rendition.themes.fontSize(`${fontSize}%`);

        rendition.on('relocated', (location: any) => {
          setLastLocation(location.start.cfi);
          if (currentUser) localStorage.setItem(`progress_${currentUser.id}_${bookId}`, location.start.cfi);
        });

        rendition.on('selected', (cfiRange: string, contents: any) => {
          const range = contents.window.getSelection().getRangeAt(0);
          const rect = range.getBoundingClientRect();
          book.getRange(cfiRange).then((rangeObj: any) => {
            setSelection({ cfiRange, text: rangeObj.toString(), rect });
          });
          // 选中后不立即清除，等待用户操作工具栏
        });

        await book.ready;
        const nav = await book.loaded.navigation;
        setToc(nav.toc || []);
        
        // 渲染已有的高亮
        annotations.forEach(ann => {
          rendition.annotations.add(ann.type, ann.cfiRange, {}, null, 'ann-class', { fill: ann.color, 'fill-opacity': ann.type === 'highlight' ? '0.3' : '1' });
        });

        const savedProgress = currentUser ? localStorage.getItem(`progress_${currentUser.id}_${bookId}`) : null;
        await rendition.display(savedProgress || undefined);
        setIsReady(true);
      } catch (err) {
        console.error(err);
        setError(t('readerFail'));
      }
    };

    setupReader();
    return () => { if (bookInstanceRef.current) bookInstanceRef.current.destroy(); };
  }, [bookData?.id, theme, fontSize]); // 减少不必要的依赖，避免切换语言导致重载

  const addAnnotation = async (type: 'highlight' | 'underline', color: string) => {
    if (!currentUser) { alert(t('notLoggedIn')); return; }
    if (!selection) return;

    const newAnn: Annotation = {
      id: 'ann' + Date.now(),
      userId: currentUser.id,
      bookId: bookId!,
      cfiRange: selection.cfiRange,
      text: selection.text,
      type,
      color,
      createdAt: Date.now()
    };
    
    await dbService.put('annotations', newAnn);
    setAnnotations(prev => [...prev, newAnn]);
    renditionRef.current.annotations.add(type, selection.cfiRange, {}, null, 'ann-class', { fill: color, 'fill-opacity': type === 'highlight' ? '0.3' : '1' });
    setSelection(null);
  };

  const removeAnnotation = async (id: string, cfiRange: string, type: string) => {
    if (confirm(t('removeAnnotation') + "?")) {
      await dbService.delete('annotations', id);
      setAnnotations(prev => prev.filter(a => a.id !== id));
      renditionRef.current?.annotations.remove(cfiRange, type);
    }
  };

  const handleSaveComment = async () => {
    if (!currentUser) { alert(t('notLoggedIn')); return; }
    if (!activeComment) return;
    
    const newAnn: Annotation = {
      id: 'ann' + Date.now(),
      userId: currentUser.id,
      bookId: bookId!,
      cfiRange: activeComment.cfiRange,
      text: activeComment.text,
      type: 'highlight',
      color: '#fbbf24',
      comment: commentValue,
      createdAt: Date.now()
    };
    await dbService.put('annotations', newAnn);
    setAnnotations(prev => [...prev, newAnn]);
    renditionRef.current.annotations.add('highlight', activeComment.cfiRange, {}, null, 'ann-class', { fill: '#fbbf24', 'fill-opacity': '0.3' });
    setActiveComment(null);
    setCommentValue('');
  };

  const handleAddBookmark = async () => {
    if (!currentUser) { alert(t('notLoggedIn')); return; }
    if (!renditionRef.current || !lastLocation) return;
    const location = renditionRef.current.currentLocation();
    let chapterTitle = "Unknown";
    if (location?.start) {
      const chapter = toc.find(item => location.start.href.includes(item.href.split('#')[0]));
      if (chapter) chapterTitle = chapter.label.trim();
    }
    const newBookmark: Bookmark = { id: 'bm' + Date.now(), userId: currentUser.id, bookId: bookId!, cfi: lastLocation, label: chapterTitle, createdAt: Date.now() };
    await dbService.put('bookmarks', newBookmark);
    setBookmarks(prev => [newBookmark, ...prev]);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  if (error) return (
    <div className="flex flex-col items-center justify-center h-screen bg-white p-10 text-center">
      <AlertCircle className="w-16 h-16 text-red-500 mb-6" />
      <h2 className="text-2xl font-black mb-4">{t('readerFail')}</h2>
      <button onClick={() => navigate(-1)} className="bg-blue-600 text-white px-10 py-3 rounded-full font-bold shadow-xl">Back</button>
    </div>
  );

  return (
    <div className={`fixed inset-0 z-50 flex flex-col transition-colors duration-500 overflow-hidden ${theme === 'dark' ? 'bg-[#121212]' : theme === 'sepia' ? 'bg-[#f4ecd8]' : 'bg-white'}`}>
      <header className={`h-14 px-4 flex items-center justify-between border-b transition-colors z-30 shadow-sm ${theme === 'dark' ? 'border-gray-800 bg-[#121212]' : theme === 'sepia' ? 'border-[#e2d6b5] bg-[#f4ecd8]' : 'border-gray-100 bg-white'}`}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-black/5"><X className="w-5 h-5" /></button>
          <span className="font-bold truncate max-w-[120px] md:max-w-sm">{bookData?.title}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleAddBookmark} className={`p-2 rounded-xl transition-all ${showToast ? 'text-green-500 scale-125' : 'text-blue-600 hover:bg-black/5'}`}>
            {showToast ? <CheckCircle2 className="w-5 h-5" /> : <BookmarkIcon className="w-5 h-5" />}
          </button>
          <button onClick={() => setShowToc(!showToc)} className={`p-2 rounded-xl transition-colors ${showToc ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-black/5'}`}>
            <List className="w-5 h-5" />
          </button>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'sepia' : 'dark')} className="p-2 rounded-xl hover:bg-black/5">
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button onClick={() => setFontSize(s => s >= 180 ? 100 : s + 20)} className="p-2 rounded-xl hover:bg-black/5"><Type className="w-5 h-5" /></button>
        </div>
      </header>

      <div className="flex-1 relative flex justify-center items-stretch overflow-hidden">
        {!isReady && <div className="absolute inset-0 flex items-center justify-center bg-inherit z-40"><Loader2 className="animate-spin text-blue-600 w-10 h-10" /></div>}
        <div ref={viewerRef} className="w-full h-full max-w-4xl mx-auto" />
        
        {selection && (
          <div 
            className="absolute z-50 bg-white border border-gray-100 shadow-2xl rounded-2xl p-2 flex items-center gap-1 animate-in fade-in zoom-in-95"
            style={{ 
              top: Math.max(10, selection.rect.top - 65), 
              left: Math.max(10, selection.rect.left + selection.rect.width/2 - 110)
            }}
          >
            {[
              { color: '#fbbf24', icon: <Highlighter className="w-4 h-4 text-yellow-600" /> },
              { color: '#4ade80', icon: <Highlighter className="w-4 h-4 text-green-600" /> },
              { color: '#60a5fa', icon: <Highlighter className="w-4 h-4 text-blue-600" /> },
              { color: '#f472b6', icon: <Underline className="w-4 h-4 text-pink-600" /> }
            ].map((tool, idx) => (
              <button key={idx} onClick={() => addAnnotation(idx === 3 ? 'underline' : 'highlight', tool.color)} className="p-2.5 hover:bg-gray-50 rounded-xl transition-colors">{tool.icon}</button>
            ))}
            <div className="w-px h-6 bg-gray-100 mx-1" />
            <button onClick={() => { setActiveComment({ cfiRange: selection.cfiRange, text: selection.text }); setSelection(null); }} className="p-2.5 hover:bg-gray-50 rounded-xl transition-colors">
              <MessageSquare className="w-4 h-4 text-gray-400" />
            </button>
            <button onClick={() => setSelection(null)} className="p-2.5 text-gray-300 hover:text-gray-500 rounded-xl"><X className="w-4 h-4" /></button>
          </div>
        )}

        {activeComment && (
          <div className="absolute inset-0 z-[60] bg-black/20 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setActiveComment(null)}>
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-gray-900 text-xl">{t('addComment')}</h3>
                <button onClick={() => setActiveComment(null)} className="p-2 hover:bg-gray-50 rounded-full"><X className="w-5 h-5" /></button>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl mb-6 border-l-4 border-blue-500 italic text-gray-500 text-sm line-clamp-3">"{activeComment.text}"</div>
              <textarea 
                autoFocus
                className="w-full bg-gray-50 border-none rounded-2xl p-4 outline-none font-bold h-32 focus:ring-2 focus:ring-blue-100 transition-all text-gray-800"
                placeholder="..."
                value={commentValue}
                onChange={e => setCommentValue(e.target.value)}
              />
              <button onClick={handleSaveComment} className="w-full mt-6 bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-100 flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-95 transition-all">
                <Save className="w-5 h-5" /> {t('saveComment')}
              </button>
            </div>
          </div>
        )}

        {showToc && (
          <>
            <div className="absolute inset-0 bg-black/40 z-40 backdrop-blur-sm animate-in fade-in" onClick={() => setShowToc(false)} />
            <aside className={`absolute inset-y-0 left-0 w-80 shadow-2xl z-50 flex flex-col transform transition-transform animate-in slide-in-from-left duration-500 border-r ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-800 text-gray-400' : 'bg-white border-gray-100 text-gray-600'}`}>
              <div className="p-4 flex gap-1 border-b border-gray-50/10 shrink-0">
                {['toc', 'bookmarks', 'annotations'].map(tab => (
                  <button key={tab} onClick={() => setSidebarTab(tab as any)} className={`flex-1 py-2.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-tighter ${sidebarTab === tab ? 'bg-blue-600 text-white' : 'hover:bg-black/5'}`}>
                    {t(tab as any)}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto p-4 hide-scrollbar">
                {sidebarTab === 'toc' ? toc.map((item, idx) => (
                  <button key={idx} onClick={() => { renditionRef.current?.display(item.href); setShowToc(false); }} className="w-full text-left px-5 py-4 text-sm rounded-2xl hover:bg-black/5 transition-all font-bold">
                    <span className="opacity-20 mr-4 font-mono">{(idx + 1).toString().padStart(2, '0')}</span>{item.label.trim()}
                  </button>
                )) : sidebarTab === 'bookmarks' ? bookmarks.map(bm => (
                  <div key={bm.id} onClick={() => { renditionRef.current?.display(bm.cfi); setShowToc(false); }} className="p-4 rounded-2xl mb-2 hover:bg-black/5 cursor-pointer group flex justify-between items-center">
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="font-black text-sm truncate">{bm.label}</div>
                      <div className="text-[10px] opacity-30 uppercase">{new Date(bm.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                )) : (
                  annotations.length > 0 ? annotations.map(ann => (
                    <div key={ann.id} onClick={() => { renditionRef.current?.display(ann.cfiRange); setShowToc(false); }} className="p-4 rounded-2xl mb-4 border border-gray-100 hover:border-blue-100 transition-all cursor-pointer group relative">
                      <div className="flex items-start gap-3">
                         <div className="w-1 h-5 rounded-full shrink-0 mt-0.5" style={{ background: ann.color }} />
                         <div className="flex-1 min-w-0">
                            <p className="text-xs italic text-gray-400 line-clamp-3">"{ann.text}"</p>
                            {ann.comment && <div className="mt-2 text-sm font-black text-gray-900 bg-gray-50 p-3 rounded-xl border border-gray-100">{ann.comment}</div>}
                         </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); removeAnnotation(ann.id, ann.cfiRange, ann.type); }} className="absolute -top-2 -right-2 p-2 bg-white text-red-400 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:text-red-600 border border-red-50">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )) : <div className="py-20 text-center text-xs font-black opacity-20 uppercase tracking-widest">{t('noBookmarks')}</div>
                )}
              </div>
            </aside>
          </>
        )}
      </div>
      <footer className={`h-10 px-6 flex items-center justify-between text-[10px] font-black tracking-widest opacity-20 z-20 ${theme === 'dark' ? 'bg-[#121212] text-white' : 'bg-white text-black'}`}>
        <button onClick={() => renditionRef.current?.prev()}>{t('prev')}</button>
        <div className="hidden sm:block">EPUB ENGINE X PRO / {bookData?.title}</div>
        <button onClick={() => renditionRef.current?.next()}>{t('next')}</button>
      </footer>
    </div>
  );
};
export default Reader;
