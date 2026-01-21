
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Upload, Book as BookIcon } from 'lucide-react';
import { dbService } from '../../services/dbService';
import { Book, AppState, Author, Category, Tag } from '../../types';

const BookManager: React.FC = () => {
  // Initialize with empty state instead of calling non-existent dbService.getState()
  const [state, setState] = useState<AppState>({
    books: [],
    authors: [],
    categories: [],
    tags: []
  });
  const [isAdding, setIsAdding] = useState(false);
  const [newBook, setNewBook] = useState<Partial<Book>>({
    title: '',
    authorId: '',
    categoryId: '',
    description: '',
    cover: 'https://picsum.photos/seed/newbook/300/400',
    tags: []
  });
  const [uploading, setUploading] = useState(false);

  // Added useEffect to fetch initial data asynchronously
  useEffect(() => {
    const loadData = async () => {
      const [books, authors, categories, tags] = await Promise.all([
        dbService.getAll<Book>('books'),
        dbService.getAll<Author>('authors'),
        dbService.getAll<Category>('categories'),
        dbService.getAll<Tag>('tags'),
      ]);
      setState({ books, authors, categories, tags });
    };
    loadData();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    // Simulate parsing or just convert to Blob URL for local use
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setNewBook(prev => ({ ...prev, epubUrl: result }));
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  // Changed to async to support dbService.put
  const handleAddBook = async () => {
    if (!newBook.title || !newBook.authorId) {
      alert("请填写必填项");
      return;
    }

    const bookToAdd: Book = {
      id: 'b' + Date.now(),
      title: newBook.title!,
      authorId: newBook.authorId!,
      categoryId: newBook.categoryId || state.categories[0]?.id || '',
      tags: newBook.tags || [],
      cover: newBook.cover || 'https://picsum.photos/seed/default/300/400',
      description: newBook.description || '',
      chapters: [],
      createdAt: Date.now(),
      epubUrl: newBook.epubUrl
    };

    // Use dbService.put instead of non-existent addBook
    await dbService.put('books', bookToAdd);
    const updatedBooks = await dbService.getAll<Book>('books');
    setState(prev => ({ ...prev, books: updatedBooks }));
    setIsAdding(false);
    setNewBook({ title: '', authorId: '', categoryId: '', description: '', cover: 'https://picsum.photos/seed/new/300/400', tags: [] });
  };

  // Changed to async to support dbService.delete
  const handleDelete = async (id: string) => {
    if (confirm("确定删除吗？")) {
      // Use dbService.delete instead of non-existent deleteBook
      await dbService.delete('books', id);
      const updatedBooks = await dbService.getAll<Book>('books');
      setState(prev => ({ ...prev, books: updatedBooks }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">书籍管理</h2>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          {isAdding ? '取消' : '新增书籍'}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4 animate-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">书名 *</label>
              <input
                type="text"
                value={newBook.title}
                onChange={e => setNewBook(p => ({ ...p, title: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="书名"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">作者 *</label>
              <select
                value={newBook.authorId}
                onChange={e => setNewBook(p => ({ ...p, authorId: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none"
              >
                <option value="">选择作者</option>
                {state.authors.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">分类</label>
              <select
                value={newBook.categoryId}
                onChange={e => setNewBook(p => ({ ...p, categoryId: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none"
              >
                <option value="">选择分类</option>
                {state.categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">封面图片 URL</label>
              <input
                type="text"
                value={newBook.cover}
                onChange={e => setNewBook(p => ({ ...p, cover: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none"
                placeholder="https://..."
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-gray-700">简介</label>
              <textarea
                value={newBook.description}
                onChange={e => setNewBook(p => ({ ...p, description: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 h-24 outline-none"
                placeholder="书籍简介..."
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-gray-700">上传 EPUB 文件</label>
              <div className="flex items-center gap-4">
                 <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all flex-1">
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {uploading ? '解析中...' : newBook.epubUrl ? '已选择 EPUB' : '点击上传 EPUB'}
                  </span>
                  <input type="file" accept=".epub" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>
          </div>
          <button
            onClick={handleAddBook}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            确认添加
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-sm">
            <tr>
              <th className="px-6 py-4 font-medium">书籍信息</th>
              <th className="px-6 py-4 font-medium">作者</th>
              <th className="px-6 py-4 font-medium">分类</th>
              <th className="px-6 py-4 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {state.books.map(book => {
              const author = state.authors.find(a => a.id === book.authorId);
              const category = state.categories.find(c => c.id === book.categoryId);
              return (
                <tr key={book.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={book.cover} className="w-10 h-14 object-cover rounded shadow-sm" alt="" />
                      <div>
                        <div className="font-semibold text-gray-900">{book.title}</div>
                        <div className="text-xs text-gray-400">{book.epubUrl ? '含 EPUB 文件' : '文本模式'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{author?.name}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                      {category?.name}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(book.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BookManager;
