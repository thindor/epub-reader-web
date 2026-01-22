
import { AppState, Book, Author, Category, Tag, User, Bookmark, ShelfItem, Annotation, SiteSettings } from '../types';

const DB_NAME = 'EReaderProDB';
const DB_VERSION = 5; // Bump version for settings

export const dbService = {
  init: (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('books')) db.createObjectStore('books', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('authors')) db.createObjectStore('authors', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('categories')) db.createObjectStore('categories', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('tags')) db.createObjectStore('tags', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('users')) db.createObjectStore('users', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'id' });
        
        if (!db.objectStoreNames.contains('bookmarks')) {
          const bookmarkStore = db.createObjectStore('bookmarks', { keyPath: 'id' });
          bookmarkStore.createIndex('by-user-book', ['userId', 'bookId'], { unique: false });
        }

        if (!db.objectStoreNames.contains('shelf')) {
          const shelfStore = db.createObjectStore('shelf', { keyPath: 'id' });
          shelfStore.createIndex('userId', 'userId', { unique: false });
        }

        if (!db.objectStoreNames.contains('annotations')) {
          const annotationStore = db.createObjectStore('annotations', { keyPath: 'id' });
          annotationStore.createIndex('by-user-book', ['userId', 'bookId'], { unique: false });
        }
      };
    });
  },

  getAll: async <T>(storeName: string): Promise<T[]> => {
    const db = await dbService.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  get: async <T>(storeName: string, id: string): Promise<T | null> => {
    const db = await dbService.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  },

  put: async (storeName: string, item: any): Promise<void> => {
    const db = await dbService.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  delete: async (storeName: string, id: string): Promise<void> => {
    const db = await dbService.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};
