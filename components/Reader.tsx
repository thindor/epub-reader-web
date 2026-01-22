
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { List, Moon, Sun, X, Loader2, AlertCircle, Bookmark as BookmarkIcon, Trash2, CheckCircle2, MessageSquare, Underline, Save, Edit3, ChevronRight } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { dbService } from '../services/dbService';
import { Book, Bookmark, User, Annotation } from '../types';
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
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [annotationsState, setAnnotationsState] = useState<Annotation[]>([]);
  const [showToc, setShowToc] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'toc' | 'bookmarks' | 'annotations'>('toc');
  const [theme, setTheme] = useState<'light' | 'dark' | 'sepia'>('light');
  const [fontSize, setFontSize] = useState(100);
  
  const [showToast, setShowToast] = useState(false);
  const [lastLocation, setLastLocation] = useState<string | null>(null);

  const [selection, setSelection] = useState<{ cfiRange: string, text: string, rect: DOMRect } | null>(null);
  const [activeComment, setActiveComment] = useState<{ cfiRange: string, text: string, existingAnn?: Annotation } | null>(null);
  const [commentValue, setCommentValue] = useState('');
  
  const isSelectingRef = useRef(false);

  const updateAnnotations = useCallback((newAnns: Annotation[]) => {
    annotationsRef.current = newAnns;
    setAnnotationsState(newAnns);
  }, []);

  useEffect(() => {
    const initData = async () => {
      try {
        const books = await dbService.getAll<Book>('books');
        const found = books.find(b => b.id === bookId);
        if (found) {
          setBookData(found);
          const [allBookmarks, allAnns] = await Promise.all([
            dbService.getAll<Bookmark>('bookmarks'),
            dbService.getAll<Annotation>('annotations')
          ]);
          setBookmarks(allBookmarks.filter(bm => bm.bookId === bookId && bm.userId === currentUser?.id).sort((a, b) => b.createdAt - a.createdAt));
          updateAnnotations(allAnns.filter(a => a.bookId === bookId && a.userId === currentUser?.id));
        } else {
          setError("Book not found");
        }
      } catch (err) {
        setError("Database error");
      }
    };
    initData();
  }, [bookId, currentUser?.id, updateAnnotations]);

  const drawAnnotations = useCallback(() => {
    if (!renditionRef.current) return;
    const rendition = renditionRef.current;
    
    annotationsRef.current.forEach(ann => {
      try {
        rendition.annotations.remove(ann.cfiRange, ann.type);
        rendition.annotations.add(ann.type, ann.cfiRange, {}, null, 'hl-class', {
          fill: ann.color,
          'fill-opacity': ann.type === 'highlight' ? '0.35' : '1',
          stroke: ann.type === 'underline' ? ann.color : 'none',
          'stroke-width': '2.5px'
        });
      } catch (e) {}
    });
  }, []);

  useEffect(() => {
    if (!bookData || !bookData.epubUrl || !viewerRef.current) return;
    if (typeof window !== 'undefined' && !(window as any).JSZip) (window as any).JSZip = JSZip;

    const setupReader = async () => {
      try {
        const base64Parts = bookData.epubUrl!.split(',');
        const binaryString = window.atob(base64Parts.length > 1 ? base64Parts[1] : base64Parts[0]);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        
        const book = ePub(bytes.buffer);
        bookInstanceRef.current = book;
        const rendition = book.renderTo(viewerRef.current, { width: '100%', height: '100%', flow: 'paginated', manager: 'default' });
        renditionRef.current = rendition;

        rendition.themes.default({
          '.hl-class': { 'mix-blend-mode': 'multiply', 'cursor': 'pointer !important' },
          '::selection': { 'background': 'rgba(59, 130, 246, 0.2) !important' }
        });

        rendition.themes.register({
          dark: { body: { background: '#121212 !important', color: '#d1d1d1 !important' } },
          sepia: { body: { background: '#f4ecd8 !important', color: '#5b4636 !important' } },
          light: { body: { background: '#ffffff !important', color: '#333333 !important' } }
        });
        rendition.themes.select(theme);
        rendition.themes.fontSize(`${fontSize}%`);

        rendition.on('rendered', () => { drawAnnotations(); });

        rendition.on('relocated', (location: any) => {
          setLastLocation(location.start.cfi);
          if (currentUser) localStorage.setItem(`progress_${currentUser.id}_${bookId}`, location.start.cfi);
          setSelection(null);
        });

        rendition.on('selected', (cfiRange: string, contents: any) => {
          isSelectingRef.current = true;
          const sel = contents.window.getSelection();
          if (!sel || sel.rangeCount === 0) return;
          
          const rect = sel.getRangeAt(0).getBoundingClientRect();
          const iframeRect = viewerRef.current?.getBoundingClientRect();
          
          const adjustedRect = {
            ...rect,
            top: rect.top + (iframeRect?.top || 0),
            left: rect.left + (iframeRect?.left || 0)
          } as DOMRect;

          book.getRange(cfiRange).then((rangeObj: any) => {
            setSelection({ cfiRange, text: rangeObj.toString(), rect: adjustedRect });
            setTimeout(() => { isSelectingRef.current = false; }, 300);
          });
        });

        rendition.on('click', (e: any) => {
          if (isSelectingRef.current) return;
          if (selection) { setSelection(null); return; }
          const x = e.clientX;
          const w = window.innerWidth;
          if (x < w * 0.3) rendition.prev();
          else if (x > w * 0.7) rendition.next();
        });

        await book.ready;
        const nav = await book.loaded.navigation;
        setToc(nav.toc || []);
        
        const savedProgress = currentUser ? localStorage.getItem(`progress_${currentUser.id}_${bookId}`) : null;
        await rendition.display(savedProgress || undefined);
        setIsReady(true);
      } catch (err) {
        setError("Reader setup failed");
      }
    };

    setupReader();
    return () => { if (bookInstanceRef.current) bookInstanceRef.current.destroy(); };
  }, [bookData?.id]);

  useEffect(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.select(theme);
      renditionRef.current.themes.fontSize(`${fontSize}%`);
    }
  }, [theme, fontSize]);

  const addAnnotation = async (type: 'highlight' | 'underline', color: string) => {
    if (!currentUser || !selection) return;

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
    
    try {
      await dbService.put('annotations', newAnn);
      updateAnnotations([...annotationsRef.current, newAnn]);
      
      renditionRef.current.annotations.add(type, selection.cfiRange, {}, null, 'hl-class', { 
        fill: color, 'fill-opacity': type === 'highlight' ? '0.35' : '1',
        stroke: type === 'underline' ? color : 'none', 'stroke-width': '2.5px'
      });
      
      setSelection(null);
      renditionRef.current?.getContents()?.forEach((c: any) => c.window.getSelection().removeAllRanges());
    } catch (e) {
      alert("标注失败，请重试");
    }
  };

  const handleSaveComment = async () => {
    if (!currentUser || !activeComment) return;
    
    const annId = activeComment.existingAnn?.id || 'ann' + Date.now();
    const newAnn: Annotation = {
      id: annId,
      userId: currentUser.id,
      bookId: bookId!,
      cfiRange: activeComment.cfiRange,
      text: activeComment.text,
      type: 'highlight',
      color: '#fbbf24',
      comment: commentValue,
      createdAt: activeComment.existingAnn?.createdAt || Date.now()
    };

    try {
      await dbService.put('annotations', newAnn);
      
      if (activeComment.existingAnn) {
        updateAnnotations(annotationsRef.current.map(a => a.id === annId ? newAnn : a));
      } else {
        updateAnnotations([...annotationsRef.current, newAnn]);
        // 先移除可能存在的同位置标注，再重新添加带有想法的高亮
        renditionRef.current.annotations.remove(activeComment.cfiRange, 'highlight');
        renditionRef.current.annotations.add('highlight', activeComment.cfiRange, {}, null, 'hl-class', { 
          fill: '#fbbf24', 'fill-opacity': '0.35' 
        });
      }
      
      setActiveComment(null);
      setCommentValue('');
      setSelection(null);
      renditionRef.current?.getContents()?.forEach((c: any) => c.window.getSelection().removeAllRanges());
      
      // 保存成功提示
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (e) {
      alert("评论保存失败，请刷新页面重试");
    }
  };

  const removeAnnotation = async (id: string, cfiRange: string, type: string) => {
    await dbService.delete('annotations', id);
    updateAnnotations(annotationsRef.current.filter(a => a.id !== id));
    renditionRef.current?.annotations.remove(cfiRange, type);
  };

  const colors = [
    { name: 'yellow', value: '#fbbf24', bg: 'bg-[#fbbf24]' },
    { name: 'green', value: '#4ade80', bg: 'bg-[#4ade80]' },
    { name: 'blue', value: '#60a5fa', bg: 'bg-[#60a5fa]' },
    { name: 'pink', value: '#f472b6', bg: 'bg-[#f472b6]' },
  ];

  if (error) return (
    <div className="flex flex-col items-center justify-center h-screen bg-white p-10">
      <AlertCircle className="w-16 h-16 text-red-500 mb-6" />
      <h2 className="text-2xl font-black mb-4">阅读器加载失败</h2>
      <button onClick={() => navigate(-1)} className="bg-blue-600 text-white px-10 py-3 rounded-full font-bold">返回书架</button>
    </div>
  );

  return (
    <div className={`fixed inset-0 z-50 flex flex-col overflow-hidden ${theme === 'dark' ? 'bg-[#121212]' : theme === 'sepia' ? 'bg-[#f4ecd8]' : 'bg-[#f8fafc]'}`}>
      <header className={`h-14 px-4 flex items-center justify-between border-b shadow-sm ${theme === 'dark' ? 'border-gray-800 bg-[#121212]' : theme === 'sepia' ? 'border-[#e2d6b5] bg-[#f4ecd8]' : 'border-gray-100 bg-white'}`}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-black/5"><X className="w-5 h-5" /></button>
          <span className="font-bold truncate max-w-sm">{bookData?.title}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowToc(!showToc)} className={`p-2 rounded-xl transition-colors ${showToc ? 'bg-blue-600 text-white' : 'hover:bg-black/5'}`}><List className="w-5 h-5" /></button>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'sepia' : 'dark')} className="p-2 rounded-xl hover:bg-black/5">{theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}</button>
          <button onClick={() => setFontSize(s => s >= 180 ? 100 : s + 20)} className="p-2 rounded-xl hover:bg-black/5 font-black text-xs">A<span className="text-[10px]">A</span></button>
        </div>
      </header>

      <div className="flex-1 relative flex justify-center items-stretch overflow-hidden">
        {(!isReady || showToast) && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[110] bg-green-500 text-white px-8 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-4 duration-300">
            {isReady ? <><CheckCircle2 className="w-5 h-5" /> 笔记保存成功</> : <><Loader2 className="animate-spin w-5 h-5" /> 阅读器启动中</>}
          </div>
        )}
        <div ref={viewerRef} className="w-full h-full max-w-4xl mx-auto px-4" />
        
        {selection && (
          <div 
            className="fixed z-[60] bg-white border border-gray-100 shadow-2xl rounded-full px-3 py-2 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
            style={{ top: Math.max(70, selection.rect.top - 75), left: Math.max(10, Math.min(window.innerWidth - 250, selection.rect.left + selection.rect.width/2 - 125)) }}
            onMouseDown={e => e.preventDefault()}
          >
            <div className="flex items-center gap-2 px-1">
              {colors.map(c => <button key={c.name} onClick={() => addAnnotation('highlight', c.value)} className={`w-7 h-7 rounded-full ${c.bg} shadow-inner hover:scale-125 transition-transform`} />)}
            </div>
            <div className="w-px h-6 bg-gray-100 mx-1" />
            <button onClick={() => addAnnotation('underline', '#3b82f6')} className="p-2.5 hover:bg-blue-50 text-blue-600 rounded-full"><Underline className="w-5 h-5" /></button>
            <button onClick={() => { setActiveComment({ cfiRange: selection.cfiRange, text: selection.text }); setSelection(null); }} className="p-2.5 hover:bg-amber-50 text-amber-500 rounded-full"><MessageSquare className="w-5 h-5" /></button>
            <div className="w-px h-6 bg-gray-100 mx-1" />
            <button onClick={() => setSelection(null)} className="p-2 text-gray-300 hover:text-gray-900"><X className="w-4 h-4" /></button>
          </div>
        )}

        {activeComment && (
          <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setActiveComment(null)}>
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-gray-900 text-xl">{activeComment.existingAnn ? '修改想法' : '添加评论'}</h3>
                <button onClick={() => setActiveComment(null)} className="p-2 text-gray-400 hover:text-gray-900"><X className="w-5 h-5" /></button>
              </div>
              <div className="bg-gray-50 p-5 rounded-3xl mb-6 border-l-4 border-blue-500 italic text-gray-600 text-sm line-clamp-3">"{activeComment.text}"</div>
              <textarea 
                autoFocus className="w-full bg-gray-50 border-none rounded-2xl p-4 outline-none font-bold h-32 focus:ring-4 focus:ring-blue-100 text-gray-800"
                placeholder="这一刻的想法..." value={commentValue} onChange={e => setCommentValue(e.target.value)}
              />
              <button onClick={handleSaveComment} className="w-full mt-6 bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                <Save className="w-5 h-5" /> 保存并同步至云端
              </button>
            </div>
          </div>
        )}

        {showToc && (
          <>
            <div className="absolute inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={() => setShowToc(false)} />
            <aside className={`absolute inset-y-0 left-0 w-80 shadow-2xl z-50 flex flex-col border-r ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-800 text-gray-400' : 'bg-white border-gray-100 text-gray-600'}`}>
              <div className="p-4 flex gap-1 border-b shrink-0">
                {['toc', 'bookmarks', 'annotations'].map(tab => (
                  <button key={tab} onClick={() => setSidebarTab(tab as any)} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all uppercase ${sidebarTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-black/5 text-gray-400'}`}>{t(tab as any)}</button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {sidebarTab === 'toc' ? toc.map((item, idx) => (
                  <button key={idx} onClick={() => { renditionRef.current?.display(item.href); setShowToc(false); }} className="w-full text-left px-5 py-4 text-sm rounded-2xl hover:bg-black/5 transition-all font-bold">
                    <span className="opacity-20 mr-4 font-mono">{(idx + 1).toString().padStart(2, '0')}</span>{item.label.trim()}
                  </button>
                )) : sidebarTab === 'bookmarks' ? (
                  bookmarks.length > 0 ? bookmarks.map(bm => (
                    <div key={bm.id} onClick={() => { renditionRef.current?.display(bm.cfi); setShowToc(false); }} className="p-5 rounded-2xl mb-3 bg-black/5 hover:bg-black/10 cursor-pointer flex justify-between items-center transition-all">
                      <div className="flex-1 min-w-0 pr-4"><div className="font-black text-sm truncate">{bm.label}</div><div className="text-[10px] opacity-30 mt-1 uppercase">{new Date(bm.createdAt).toLocaleDateString()}</div></div>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  )) : <div className="py-20 text-center text-xs font-black opacity-20 uppercase tracking-widest">{t('noBookmarks')}</div>
                ) : (
                  annotationsState.length > 0 ? annotationsState.map(ann => (
                    <div key={ann.id} onClick={() => { renditionRef.current?.display(ann.cfiRange); setShowToc(false); }} className="p-5 rounded-3xl mb-4 border border-gray-100 hover:border-blue-100 transition-all cursor-pointer relative bg-white shadow-sm group">
                      <div className="flex items-start gap-4">
                         <div className="w-1.5 h-6 rounded-full shrink-0 mt-0.5" style={{ background: ann.color }} />
                         <div className="flex-1 min-w-0">
                            <p className="text-xs italic text-gray-400 line-clamp-3 leading-relaxed">"{ann.text}"</p>
                            {ann.comment && <div className="mt-3 text-sm font-bold text-gray-800 bg-amber-50/50 p-4 rounded-2xl border border-amber-100/50">{ann.comment}</div>}
                         </div>
                      </div>
                      <div className="absolute -top-3 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                         <button onClick={(e) => { e.stopPropagation(); setActiveComment({ cfiRange: ann.cfiRange, text: ann.text, existingAnn: ann }); setCommentValue(ann.comment || ''); }} className="p-2.5 bg-white text-blue-500 rounded-full shadow-xl border border-blue-50 hover:bg-blue-600 hover:text-white"><Edit3 className="w-3.5 h-3.5" /></button>
                         <button onClick={(e) => { e.stopPropagation(); removeAnnotation(ann.id, ann.cfiRange, ann.type); }} className="p-2.5 bg-white text-red-500 rounded-full shadow-xl border border-red-50 hover:bg-red-600 hover:text-white"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  )) : <div className="py-20 text-center text-xs font-black opacity-20 uppercase tracking-widest">暂无笔记</div>
                )}
              </div>
            </aside>
          </>
        )}
      </div>

      <footer className={`h-12 px-6 flex items-center justify-between text-[10px] font-black z-20 ${theme === 'dark' ? 'bg-[#121212] text-white/20' : 'bg-white text-black/20'}`}>
        <button onClick={() => renditionRef.current?.prev()} className="hover:text-blue-600 transition-colors uppercase tracking-widest">上一页</button>
        <div className="hidden sm:block uppercase tracking-[0.2em]">E-READER PRO • CLOUD SYNCED</div>
        <button onClick={() => renditionRef.current?.next()} className="hover:text-blue-600 transition-colors uppercase tracking-widest">下一页</button>
      </footer>
    </div>
  );
};
export default Reader;
