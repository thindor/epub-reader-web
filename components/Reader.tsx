
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { List, Moon, Sun, X, Loader2, Bookmark, CheckCircle2, MessageSquare, Underline, Save, Edit3, ChevronRight, ChevronLeft, Type, AlignJustify } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { dbService } from '../services/dbService';
import { Book, User, Annotation, Bookmark as BookmarkType } from '../types';
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
  const annotationsRef = useRef<Annotation[]>([]);
  
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toc, setToc] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [annotationsState, setAnnotationsState] = useState<Annotation[]>([]);
  
  const [showToc, setShowToc] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'toc' | 'annotations' | 'bookmarks'>('toc');
  
  const [theme, setTheme] = useState<'light' | 'dark' | 'sepia'>(() => (localStorage.getItem('reader_theme') as any) || 'light');
  const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem('reader_fontsize')) || 100);
  const [lineHeight, setLineHeight] = useState(() => Number(localStorage.getItem('reader_lineheight')) || 1.5);
  const [showToast, setShowToast] = useState(false);

  const [selection, setSelection] = useState<{ cfiRange: string, text: string, rect: DOMRect } | null>(null);
  const [activeComment, setActiveComment] = useState<{ cfiRange: string, text: string, existingAnn?: Annotation } | null>(null);
  const [commentValue, setCommentValue] = useState('');
  const isSelectingRef = useRef(false);

  // 绘制标注
  const drawAnnotations = useCallback(() => {
    if (!renditionRef.current) return;
    const rendition = renditionRef.current;
    annotationsRef.current.forEach(ann => {
      try {
        rendition.annotations.remove(ann.cfiRange, ann.type);
        rendition.annotations.add(ann.type, ann.cfiRange, {}, (e: any) => {}, 'hl-class', {
          fill: ann.color,
          'fill-opacity': ann.type === 'highlight' ? '0.35' : '1',
          stroke: ann.type === 'underline' ? ann.color : 'none',
          'stroke-width': '2px'
        });
      } catch (e) {}
    });
  }, []);

  // 加载书籍基础数据
  useEffect(() => {
    const initData = async () => {
      const allBooks = await dbService.getAll<Book>('books');
      const found = allBooks.find(b => b.id === bookId);
      if (found) {
        setBookData(found);
        const allAnns = await dbService.getAll<Annotation>('annotations');
        const userAnns = allAnns.filter(a => a.bookId === bookId && a.userId === currentUser?.id);
        annotationsRef.current = userAnns;
        setAnnotationsState(userAnns);
        
        const allBookmarks = await dbService.getAll<BookmarkType>('bookmarks');
        setBookmarks(allBookmarks.filter(b => b.bookId === bookId && b.userId === currentUser?.id));
      }
    };
    initData();
  }, [bookId, currentUser?.id]);

  // 初始化阅读器引擎 (仅在书籍 ID 变化时执行)
  useEffect(() => {
    if (!bookData?.epubUrl || !viewerRef.current) return;
    (window as any).JSZip = JSZip;

    const setup = async () => {
      try {
        const base64 = bookData.epubUrl!.split(',')[1] || bookData.epubUrl!;
        const binary = window.atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        
        const book = ePub(bytes.buffer);
        bookInstanceRef.current = book;
        const rendition = book.renderTo(viewerRef.current, { width: '100%', height: '100%', flow: 'paginated' });
        renditionRef.current = rendition;

        // 绑定渲染后的重绘
        rendition.on('rendered', () => {
          drawAnnotations();
        });

        rendition.on('relocated', (location: any) => {
          drawAnnotations();
          setSelection(null);
          if (currentUser) localStorage.setItem(`prog_${currentUser.id}_${bookId}`, location.start.cfi);
        });

        rendition.on('selected', (cfiRange: string, contents: any) => {
          isSelectingRef.current = true;
          const sel = contents.window.getSelection();
          if (!sel || sel.rangeCount === 0) return;
          const range = sel.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          const iframe = viewerRef.current?.getBoundingClientRect();
          
          setSelection({ 
            cfiRange, 
            text: sel.toString(), 
            rect: { 
              ...rect, 
              top: rect.top + (iframe?.top || 0), 
              left: rect.left + (iframe?.left || 0) 
            } as DOMRect 
          });
          setTimeout(() => isSelectingRef.current = false, 300);
        });

        // 左右点击翻页逻辑
        rendition.on('click', (e: any) => {
          // 如果正在选择或菜单已弹出，不触发翻页
          if (isSelectingRef.current || selection) { 
            setSelection(null); 
            return; 
          }
          
          const x = e.clientX;
          const width = window.innerWidth;
          // 点击左侧 30% 翻上一页，右侧 70% 以后翻下一页
          if (x < width * 0.3) {
            rendition.prev();
          } else if (x > width * 0.7) {
            rendition.next();
          }
        });

        await book.ready;
        const nav = await book.loaded.navigation;
        setToc(nav.toc || []);
        
        const progress = currentUser ? localStorage.getItem(`prog_${currentUser.id}_${bookId}`) : null;
        await rendition.display(progress || undefined);
        setIsReady(true);
      } catch (err) { 
        setError("EPUB 加载失败"); 
      }
    };

    setup();
    return () => {
      if (bookInstanceRef.current) {
        bookInstanceRef.current.destroy();
      }
    };
  }, [bookData?.id]);

  // 独立更新样式，不重新加载书籍
  useEffect(() => {
    if (!renditionRef.current) return;
    const rendition = renditionRef.current;
    
    rendition.themes.register({
      dark: { body: { background: '#121212 !important', color: '#ccc !important', 'line-height': `${lineHeight} !important` } },
      sepia: { body: { background: '#f4ecd8 !important', color: '#5b4636 !important', 'line-height': `${lineHeight} !important` } },
      light: { body: { background: '#ffffff !important', color: '#333 !important', 'line-height': `${lineHeight} !important` } }
    });
    
    rendition.themes.select(theme);
    rendition.themes.fontSize(`${fontSize}%`);
  }, [theme, fontSize, lineHeight]);

  const addAnn = async (type: 'highlight' | 'underline', color: string) => {
    if (!currentUser || !selection) return;
    const ann: Annotation = {
      id: 'ann' + Date.now(), userId: currentUser.id, bookId: bookId!,
      cfiRange: selection.cfiRange, text: selection.text, type, color, createdAt: Date.now()
    };
    await dbService.put('annotations', ann);
    annotationsRef.current = [...annotationsRef.current, ann];
    setAnnotationsState([...annotationsRef.current]);
    drawAnnotations();
    setSelection(null);
  };

  const saveComment = async () => {
    if (!currentUser || !activeComment) return;
    const ann: Annotation = {
      id: activeComment.existingAnn?.id || 'ann' + Date.now(), userId: currentUser.id, bookId: bookId!,
      cfiRange: activeComment.cfiRange, text: activeComment.text, type: 'highlight', color: '#fbbf24', 
      comment: commentValue, createdAt: Date.now()
    };
    await dbService.put('annotations', ann);
    const updated = activeComment.existingAnn ? annotationsRef.current.map(a => a.id === ann.id ? ann : a) : [...annotationsRef.current, ann];
    annotationsRef.current = updated;
    setAnnotationsState(updated);
    drawAnnotations();
    setActiveComment(null);
    setCommentValue('');
  };

  const toggleBookmark = async () => {
    if (!currentUser || !renditionRef.current) return;
    const cfi = renditionRef.current.currentLocation().start.cfi;
    const existing = bookmarks.find(b => b.cfi === cfi);
    if (existing) {
      await dbService.delete('bookmarks', existing.id);
      setBookmarks(bookmarks.filter(b => b.id !== existing.id));
    } else {
      const b: BookmarkType = { id: 'bm' + Date.now(), userId: currentUser.id, bookId: bookId!, cfi, label: `书签 ${new Date().toLocaleTimeString()}`, createdAt: Date.now() };
      await dbService.put('bookmarks', b);
      setBookmarks([...bookmarks, b]);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${theme === 'dark' ? 'bg-[#121212] text-gray-400' : theme === 'sepia' ? 'bg-[#f4ecd8] text-[#5b4636]' : 'bg-[#f8fafc] text-gray-900'}`}>
      <header className={`h-14 px-6 flex items-center justify-between border-b ${theme === 'dark' ? 'border-white/5' : 'border-black/5'}`}>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-black/5 rounded-full transition-colors"><X className="w-5 h-5" /></button>
          <span className="font-bold truncate max-w-[200px] text-sm uppercase tracking-tight">{bookData?.title}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowToc(!showToc)} className="p-2 hover:bg-black/5 rounded-xl transition-all"><List className="w-5 h-5" /></button>
          <button onClick={toggleBookmark} className={`p-2 hover:bg-black/5 rounded-xl transition-all ${bookmarks.some(b => b.cfi === renditionRef.current?.currentLocation()?.start?.cfi) ? 'text-blue-500' : ''}`}><Bookmark className="w-5 h-5" /></button>
          <button onClick={() => setShowSettings(!showSettings)} className="p-2 hover:bg-black/5 rounded-xl transition-all"><Type className="w-5 h-5" /></button>
          <button onClick={() => {
            const nextTheme = theme === 'dark' ? 'light' : theme === 'light' ? 'sepia' : 'dark';
            setTheme(nextTheme);
            localStorage.setItem('reader_theme', nextTheme);
          }} className="p-2 hover:bg-black/5 rounded-xl transition-all">{theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}</button>
        </div>
      </header>

      <div className="flex-1 relative overflow-hidden flex justify-center">
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-inherit z-50">
            <Loader2 className="animate-spin w-10 h-10 text-blue-500" />
          </div>
        )}
        <div ref={viewerRef} className="w-full max-w-4xl h-full px-4" />

        {/* 设置菜单 */}
        {showSettings && (
          <div className="absolute right-6 top-4 z-[100] bg-white rounded-3xl p-6 shadow-2xl border border-gray-100 w-72 animate-in slide-in-from-top-4 text-gray-900">
            <div className="flex items-center justify-between mb-6">
              <h4 className="font-black text-xs uppercase tracking-widest text-gray-400">阅读设置</h4>
              <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-gray-50 rounded-full"><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-black uppercase"><span>字号</span><span>{fontSize}%</span></div>
                <div className="flex gap-2">
                  <button onClick={() => { setFontSize(f => Math.max(80, f - 10)); localStorage.setItem('reader_fontsize', String(Math.max(80, fontSize - 10))); }} className="flex-1 bg-gray-50 py-3 rounded-xl font-black hover:bg-gray-100 transition-colors">A-</button>
                  <button onClick={() => { setFontSize(f => Math.min(200, f + 10)); localStorage.setItem('reader_fontsize', String(Math.min(200, fontSize + 10))); }} className="flex-1 bg-gray-50 py-3 rounded-xl font-black hover:bg-gray-100 transition-colors">A+</button>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-black uppercase"><span>行间距</span><span>{lineHeight}</span></div>
                <div className="flex gap-2">
                  {[1.2, 1.5, 1.8, 2.0].map(l => (
                    <button key={l} onClick={() => { setLineHeight(l); localStorage.setItem('reader_lineheight', String(l)); }} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${lineHeight === l ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>{l}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 选中文字菜单 */}
        {selection && (
          <div className="fixed z-[200] bg-white rounded-full p-2 shadow-2xl border border-gray-100 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2" 
               style={{ 
                 top: Math.max(70, selection.rect.top - 80), 
                 left: Math.max(20, Math.min(window.innerWidth - 240, selection.rect.left)) 
               }}>
            {['#fbbf24', '#4ade80', '#60a5fa', '#f472b6'].map(c => (
              <button key={c} onClick={() => addAnn('highlight', c)} className="w-7 h-7 rounded-full shadow-inner hover:scale-110 transition-transform" style={{ background: c }} />
            ))}
            <div className="w-px h-6 bg-gray-100 mx-1" />
            <button onClick={() => addAnn('underline', '#3b82f6')} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"><Underline className="w-5 h-5" /></button>
            <button onClick={() => { setActiveComment({ cfiRange: selection.cfiRange, text: selection.text }); setSelection(null); }} className="p-2 text-amber-500 hover:bg-amber-50 rounded-full transition-colors"><MessageSquare className="w-5 h-5" /></button>
            <button onClick={() => setSelection(null)} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* 想法弹窗 */}
        {activeComment && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setActiveComment(null)} />
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative animate-in zoom-in-95 text-gray-900">
              <button onClick={() => setActiveComment(null)} className="absolute right-8 top-8 p-2 text-gray-400 hover:bg-gray-50 rounded-full transition-all"><X className="w-5 h-5" /></button>
              <h3 className="text-xl font-black mb-6">记录这一刻的思考</h3>
              <div className="bg-gray-50 p-5 rounded-3xl mb-6 text-xs italic text-gray-400 border-l-4 border-blue-500 line-clamp-3 leading-relaxed">"{activeComment.text}"</div>
              <textarea autoFocus className="w-full bg-gray-50 rounded-2xl p-4 outline-none font-bold h-36 focus:ring-4 focus:ring-blue-100 transition-all text-gray-900 border-none" placeholder="思考内容..." value={commentValue} onChange={e => setCommentValue(e.target.value)} />
              <button onClick={saveComment} className="w-full mt-6 bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all">保存想法</button>
            </div>
          </div>
        )}

        {/* 侧边栏 */}
        {showToc && (
          <>
            <div className="absolute inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={() => setShowToc(false)} />
            <aside className={`absolute inset-y-0 left-0 w-80 z-50 flex flex-col border-r animate-in slide-in-from-left duration-300 ${theme === 'dark' ? 'bg-[#1a1a1a] border-white/5' : 'bg-white border-gray-100'}`}>
              <div className="p-6 flex gap-1 border-b border-gray-50">
                {['toc', 'annotations', 'bookmarks'].map(t => (
                  <button key={t} onClick={() => setSidebarTab(t as any)} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${sidebarTab === t ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-400 hover:bg-gray-50'}`}>{t.toUpperCase()}</button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto p-4 hide-scrollbar">
                {sidebarTab === 'toc' ? toc.map((item, i) => (
                  <button key={i} onClick={() => { renditionRef.current?.display(item.href); setShowToc(false); }} className="w-full text-left p-4 text-sm font-bold hover:bg-blue-50 hover:text-blue-600 rounded-2xl transition-all mb-1">{item.label}</button>
                )) : sidebarTab === 'bookmarks' ? bookmarks.map(bm => (
                  <div key={bm.id} onClick={() => { renditionRef.current?.display(bm.cfi); setShowToc(false); }} className="p-5 bg-gray-50 rounded-2xl mb-2 cursor-pointer group hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-blue-50">
                    <div className="text-xs font-black text-gray-900">{bm.label}</div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-wider">{new Date(bm.createdAt).toLocaleDateString()}</div>
                  </div>
                )) : annotationsState.map(ann => (
                  <div key={ann.id} onClick={() => { renditionRef.current?.display(ann.cfiRange); setShowToc(false); }} className="p-5 bg-gray-50 rounded-2xl mb-4 group cursor-pointer hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-blue-50">
                    <div className="flex items-start gap-3">
                      <div className="w-1.5 h-6 rounded-full shrink-0" style={{ background: ann.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] italic text-gray-400 line-clamp-2 leading-relaxed">"{ann.text}"</p>
                        {ann.comment && <div className="mt-3 text-xs font-bold text-gray-800 leading-relaxed bg-white p-3 rounded-xl shadow-sm border border-gray-100">{ann.comment}</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </>
        )}
      </div>

      <footer className={`h-10 px-10 flex items-center justify-between text-[10px] font-black tracking-widest transition-colors ${theme === 'dark' ? 'bg-[#121212] border-t border-white/5 text-white/20' : 'bg-white border-t border-gray-50 text-gray-300'}`}>
        <button onClick={() => renditionRef.current?.prev()} className="hover:text-blue-600 flex items-center gap-2 transition-colors"><ChevronLeft className="w-3 h-3" /> PREV</button>
        <div className="uppercase">PRO READER ENGINE V2.1</div>
        <button onClick={() => renditionRef.current?.next()} className="hover:text-blue-600 flex items-center gap-2 transition-colors">NEXT <ChevronRight className="w-3 h-3" /></button>
      </footer>
    </div>
  );
};
export default Reader;
