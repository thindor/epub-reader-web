
import { AppState, Book, Author, Category, Tag, User, Bookmark, ShelfItem, Annotation, SiteSettings } from '../types';

const DB_NAME = 'EReaderProDB_Final'; 
const DB_VERSION = 2;

export const dbService = {
  init: (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        
        // 核心表
        const stores = ['books', 'authors', 'categories', 'tags', 'users', 'settings', 'bookmarks', 'shelf', 'annotations'];
        stores.forEach(s => {
          if (!db.objectStoreNames.contains(s)) {
            const store = db.createObjectStore(s, { keyPath: 'id' });
            if (s === 'annotations' || s === 'bookmarks') {
              store.createIndex('userId', 'userId', { unique: false });
              store.createIndex('bookId', 'bookId', { unique: false });
            }
          }
        });
      };
    });
  },

  getAll: async <T>(storeName: string): Promise<T[]> => {
    try {
      const db = await dbService.init();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      return [];
    }
  },

  put: async (storeName: string, item: any): Promise<void> => {
    const db = await dbService.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  },

  delete: async (storeName: string, id: string): Promise<void> => {
    const db = await dbService.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  },

  get: async <T>(storeName: string, id: string): Promise<T | null> => {
    try {
      const db = await dbService.init();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      return null;
    }
  }
};
