
export interface Author {
  id: string;
  name: string;
  description: string;
  avatar?: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Tag {
  id: string;
  name: string;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  order: number;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  avatar?: string;
}

export interface Bookmark {
  id: string;
  userId: string;
  bookId: string;
  cfi: string;
  label: string;
  createdAt: number;
}

export interface Annotation {
  id: string;
  userId: string;
  bookId: string;
  cfiRange: string;
  text: string;
  type: 'highlight' | 'underline';
  color: string;
  comment?: string;
  createdAt: number;
}

export interface ShelfItem {
  id: string; // userId + "_" + bookId
  userId: string;
  bookId: string;
  addedAt: number;
}

export interface Book {
  id: string;
  title: string;
  authorId: string;
  categoryId: string;
  tags: string[];
  cover: string;
  description: string;
  epubUrl?: string;
  chapters: Chapter[];
  createdAt: number;
}

export type Language = 'zh' | 'en';

export interface AppState {
  books: Book[];
  authors: Author[];
  categories: Category[];
  tags: Tag[];
}
