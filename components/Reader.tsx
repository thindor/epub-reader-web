
import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, List, Moon, Sun, Type, X, Loader2, AlertCircle, Bookmark as BookmarkIcon, Trash2, CheckCircle2, MessageSquare, Highlighter, Palette, Underline, Save, Trash, Edit3, MoreHorizontal } from 'lucide-react';
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

  // 悬浮菜单状态
  const [selection, setSelection] = useState<{ cfiRange: string, text: string, rect: DOMRect } | null>(null);
  const [activeAnnotationMenu, setActiveAnnotationMenu] = useState<{ ann: Annotation, rect: DOMRect } | null>(null);
  const [activeComment, setActiveComment] = useState<{ cfiRange: string, text: string, existingAnn?: Annotation } | null>(null);
  const [commentValue, setCommentValue] = useState('');

  // 1. 数据初始化
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
          setError("No Book Found");
        }
      } catch (err) {
        setError("Database error");
      }
    };
    initData();
  }, [bookId, currentUser?.id]);

  // 2. 阅读引擎核心逻辑
  useEffect(() => {
    if (!bookData || !bookData.epubUrl || !viewerRef.current) return;
    if (typeof window !== 'undefined' && !(window as any).JSZip) (window as any).JSZip = JSZip;

    const setupReader = async () => {
      try {
        const base64Parts = bookData.epubUrl!.split(',');
        const base64Data = base64Parts.length > 1 ? base64Parts[1] : base64Parts[0];
        const binaryString = window.atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const book = ePub(bytes.buffer);
        bookInstanceRef.current = book;
        const rendition = book.renderTo(viewerRef.current, { 
          width: '100%', 
          height: '100%', 
          flow: 'paginated', 
          manager: 'default' 
        });
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
          setSelection(null);
          setActiveAnnotationMenu(null);
        });

        rendition.on('selected', (cfiRange: string, contents: any) => {
          const range = contents.window.getSelection().getRangeAt(0);
          const rect = range.getBoundingClientRect();
          book.getRange(cfiRange).then((rangeObj: any) => {
            setSelection({ cfiRange, text: rangeObj.toString(), rect });
            setActiveAnnotationMenu(null);
          });
        });

        // 处理标注点击
        rendition.on('click', (e: any) => {
          setSelection(null);
          setActiveAnnotationMenu(null);
        });

        await book.ready;
        const nav = await book.loaded.navigation;
        setToc(nav.toc || []);
        
        // 渲染已有的标注
        annotations.forEach(ann => {
          rendition.annotations.add(ann.type, ann.cfiRange, {}, (e: any) => {
            // 这里可以处理标注点击，但 ePub.js 的事件冒泡有时不稳定
          }, 'ann-class', { 
            fill: ann.color, 
            'fill-opacity': ann.type === 'highlight' ? '0.35' : '1',
            stroke: ann.type === 'underline' ? ann.color : 'none',
            'stroke-width': '2px'
          });
        });

        const savedProgress = currentUser ? localStorage.getItem(`progress_${currentUser.id}_${bookId}`) : null;
        await rendition.display(savedProgress || undefined);
        setIsReady(true);
      } catch (err) {
        console.error("Reader setup error:", err);
        setError("Render failed");
      }
    };

    setupReader();
    return () => { if (bookInstanceRef.current) bookInstanceRef.current.destroy(); };
  }, [bookData?.id, theme, fontSize]);

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
    renditionRef.current.annotations.add(type, selection.cfiRange, {}, null, 'ann-class', { 
      fill: color, 
      'fill-opacity': type === 'highlight' ? '0.35' : '1',
      stroke: type === 'underline' ? color : 'none',
      'stroke-width': '2px'
    });
    setSelection(null);
  };

  const removeAnnotation = async (id: string, cfiRange: string, type: string) => {
    await dbService.delete('annotations', id);
    setAnnotations(prev => prev.filter(a => a.id !== id));
    renditionRef.current?.annotations.remove(cfiRange, type);
    setActiveAnnotationMenu(null);
  };

  const handleSaveComment = async () => {
    if (!currentUser) { alert(t('notLoggedIn')); return; }
    if (!activeComment) return;
    
    // 如果是编辑已有评论
    if (activeComment.existingAnn) {
      const updatedAnn = { ...activeComment.existingAnn, comment: commentValue };
      await dbService.put('annotations', updatedAnn);
      setAnnotations(prev => prev.map(a => a.id === updatedAnn.id ? updatedAnn : a));
    } else {
      const newAnn: Annotation = {
        id: 'ann' + Date.now(),
        userId: currentUser.id,
        bookId: bookId!,
        cfiRange: activeComment.cfiRange,
        text: activeComment.text,
        type: 'highlight',
        color: '#fbbf24', // 默认评论颜色为明亮的黄色
        comment: commentValue,
        createdAt: Date.now()
      };
      await dbService.put('annotations', newAnn);
      setAnnotations(prev => [...prev, newAnn]);
      renditionRef.current.annotations.add('highlight', activeComment.cfiRange, {}, null, 'ann-class', { fill: '#fbbf24', 'fill-opacity': '0.35' });
    }
    
    setActiveComment(null);
    setCommentValue('');
    setSelection(null);
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

  const colors = [
    { name: 'yellow', value: '#fbbf24', bg: 'bg-[#fbbf24]' },
    { name: 'green', value: '#4ade80', bg: 'bg-[#4ade80]' },
    { name: 'blue', value: '#60a5fa', bg: 'bg-[#60a5fa]' },
    { name: 'pink', value: '#f472b6', bg: 'bg-[#f472b6]' },
  ];

  return (
    <div className={`fixed inset-0 z-50 flex flex-col transition-colors duration-500 overflow-hidden ${theme === 'dark' ? 'bg-[#121212]' : theme === 'sepia' ? 'bg-[#f4ecd8]' : 'bg-[#f8fafc]'}`}>
      <header className={`h-14 px-4 flex items-center justify-between border-b transition-colors z-30 shadow-sm ${theme === 'dark' ? 'border-gray-800 bg-[#121212]' : theme === 'sepia' ? 'border-[#e2d6b5] bg-[#f4ecd8]' : 'border-gray-100 bg-white'}`}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-black/5 transition-colors"><X className="w-5 h-5" /></button>
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
          <button onClick={() => setFontSize(s => s >= 180 ? 100 : s + 20)} className="p-2 rounded-xl hover:bg-black/5 font-black text-xs">A<span className="text-[10px] ml-0.5">A</span></button>
        </div>
      </header>

      <div className="flex-1 relative flex justify-center items-stretch overflow-hidden">
        {!isReady && <div className="absolute inset-0 flex items-center justify-center bg-inherit z-40"><Loader2 className="animate-spin text-blue-600 w-10 h-10" /></div>}
        
        {/* 阅读器容器 */}
        <div 
          ref={viewerRef} 
          className="w-full h-full max-w-4xl mx-auto px-4 md:px-0"
          onClick={() => {
            setSelection(null);
            setActiveAnnotationMenu(null);
          }}
        />
        
        {/* 选中文字后的悬浮工具栏 */}
        {selection && (
          <div 
            className="fixed z-[60] bg-white/90 backdrop-blur-md border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-full px-2 py-1.5 flex items-center gap-1 animate-in fade-in slide-in-from-bottom-2 duration-200"
            style={{ 
              top: Math.max(10, selection.rect.top - 60), 
              left: Math.max(10, Math.min(window.innerWidth - 240, selection.rect.left + selection.rect.width/2 - 120))
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* 颜色涂色选择 */}
            <div className="flex items-center gap-1.5 px-2">
              {colors.map((color) => (
                <button 
                  key={color.name} 
                  onClick={() => addAnnotation('highlight', color.value)} 
                  className={`w-6 h-6 rounded-full ${color.bg} shadow-inner hover:scale-125 transition-transform active:scale-95`}
                  title={t('colorYellow')}
                />
              ))}
            </div>
            
            <div className="w-px h-6 bg-gray-100 mx-1" />
            
            {/* 功能按钮 */}
            <button 
              onClick={() => addAnnotation('underline', '#3b82f6')} 
              className="p-2 hover:bg-blue-50 text-blue-600 rounded-full transition-all group"
              title={t('underline')}
            >
              <Underline className="w-5 h-5 group-hover:scale-110" />
            </button>
            
            <button 
              onClick={() => { setActiveComment({ cfiRange: selection.cfiRange, text: selection.text }); setSelection(null); }} 
              className="p-2 hover:bg-amber-50 text-amber-500 rounded-full transition-all group"
              title={t('addComment')}
            >
              <MessageSquare className="w-5 h-5 group-hover:scale-110" />
            </button>
            
            <div className="w-px h-6 bg-gray-100 mx-1" />
            
            <button 
              onClick={() => setSelection(null)} 
              className="p-2 text-gray-300 hover:text-gray-500 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 评论弹窗 */}
        {activeComment && (
          <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setActiveComment(null)}>
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-gray-900 text-xl">{activeComment.existingAnn ? '修改评论' : t('addComment')}</h3>
                <button onClick={() => setActiveComment(null)} className="p-2 hover:bg-gray-50 rounded-full transition-colors text-gray-400"><X className="w-5 h-5" /></button>
              </div>
              <div className="bg-gray-50 p-5 rounded-3xl mb-6 border-l-4 border-blue-500 italic text-gray-600 text-sm line-clamp-4 leading-relaxed relative">
                <div className="absolute top-2 right-4 opacity-10"><MessageSquare className="w-10 h-10" /></div>
                "{activeComment.text}"
              </div>
              <textarea 
                autoFocus
                className="w-full bg-gray-50 border-none rounded-2xl p-4 outline-none font-bold h-32 focus:ring-4 focus:ring-blue-100 transition-all text-gray-800"
                placeholder="写下这一刻的想法..."
                value={commentValue}
                onChange={e => setCommentValue(e.target.value)}
              />
              <button onClick={handleSaveComment} className="w-full mt-6 bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-100 flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-[0.98] transition-all">
                <Save className="w-5 h-5" /> {activeComment.existingAnn ? '更新评论' : t('saveComment')}
              </button>
            </div>
          </div>
        )}

        {/* 侧边栏：目录/书签/笔记 */}
        {showToc && (
          <>
            <div className="absolute inset-0 bg-black/40 z-40 backdrop-blur-sm animate-in fade-in" onClick={() => setShowToc(false)} />
            <aside className={`absolute inset-y-0 left-0 w-80 shadow-2xl z-50 flex flex-col transform transition-transform animate-in slide-in-from-left duration-500 border-r ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-800 text-gray-400' : 'bg-white border-gray-100 text-gray-600'}`}>
              <div className="p-4 flex gap-1 border-b border-gray-50/10 shrink-0">
                {['toc', 'bookmarks', 'annotations'].map(tab => (
                  <button key={tab} onClick={() => setSidebarTab(tab as any)} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all uppercase tracking-tighter ${sidebarTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-black/5 text-gray-400'}`}>
                    {t(tab as any)}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto p-4 hide-scrollbar">
                {sidebarTab === 'toc' ? toc.map((item, idx) => (
                  <button key={idx} onClick={() => { renditionRef.current?.display(item.href); setShowToc(false); }} className={`w-full text-left px-5 py-4 text-sm rounded-2xl hover:bg-black/5 transition-all font-bold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className="opacity-20 mr-4 font-mono">{(idx + 1).toString().padStart(2, '0')}</span>{item.label.trim()}
                  </button>
                )) : sidebarTab === 'bookmarks' ? (
                  bookmarks.length > 0 ? bookmarks.map(bm => (
                    <div key={bm.id} onClick={() => { renditionRef.current?.display(bm.cfi); setShowToc(false); }} className="p-5 rounded-2xl mb-3 bg-black/5 hover:bg-black/10 cursor-pointer group flex justify-between items-center transition-all">
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="font-black text-sm truncate">{bm.label}</div>
                        <div className="text-[10px] opacity-30 uppercase mt-1 tracking-widest">{new Date(bm.createdAt).toLocaleDateString()}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:translate-x-1 transition-transform" />
                    </div>
                  )) : <div className="py-20 text-center text-xs font-black opacity-20 uppercase tracking-widest">{t('noBookmarks')}</div>
                ) : (
                  annotations.length > 0 ? annotations.map(ann => (
                    <div key={ann.id} onClick={() => { renditionRef.current?.display(ann.cfiRange); setShowToc(false); }} className="p-5 rounded-3xl mb-4 border border-gray-100 hover:border-blue-100 transition-all cursor-pointer group relative bg-white shadow-sm hover:shadow-md">
                      <div className="flex items-start gap-4">
                         <div className="w-1 h-6 rounded-full shrink-0 mt-0.5" style={{ background: ann.color }} />
                         <div className="flex-1 min-w-0">
                            <p className="text-xs italic text-gray-400 line-clamp-3 leading-relaxed">"{ann.text}"</p>
                            {ann.comment && (
                              <div className="mt-3 text-sm font-bold text-gray-800 bg-amber-50/50 p-4 rounded-2xl border border-amber-100/50 flex flex-col gap-2">
                                <span className="flex items-center gap-1.5 text-[10px] text-amber-600 uppercase tracking-widest"><MessageSquare className="w-3 h-3" /> 想法</span>
                                {ann.comment}
                              </div>
                            )}
                         </div>
                      </div>
                      <div className="absolute -top-3 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                         <button 
                          onClick={(e) => { e.stopPropagation(); setActiveComment({ cfiRange: ann.cfiRange, text: ann.text, existingAnn: ann }); setCommentValue(ann.comment || ''); }}
                          className="p-2.5 bg-white text-blue-500 rounded-full shadow-xl border border-blue-50 hover:bg-blue-600 hover:text-white transition-all"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeAnnotation(ann.id, ann.cfiRange, ann.type); }} 
                          className="p-2.5 bg-white text-red-500 rounded-full shadow-xl border border-red-50 hover:bg-red-600 hover:text-white transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )) : <div className="py-20 text-center text-xs font-black opacity-20 uppercase tracking-widest">暂无笔记或划线</div>
                )}
              </div>
            </aside>
          </>
        )}
      </div>

      <footer className={`h-12 px-6 flex items-center justify-between text-[10px] font-black tracking-widest z-20 transition-colors ${theme === 'dark' ? 'bg-[#121212] text-white/20' : 'bg-white text-black/20'}`}>
        <button onClick={() => renditionRef.current?.prev()} className="hover:text-blue-600 transition-colors">{t('prev')}</button>
        <div className="hidden sm:block uppercase">E-READER PRO ENGINE • {bookData?.title}</div>
        <button onClick={() => renditionRef.current?.next()} className="hover:text-blue-600 transition-colors">{t('next')}</button>
      </footer>
    </div>
  );
};
export default Reader;
