
import React from 'react';
import { Book, Author, Category, Tag } from './types';

export const INITIAL_AUTHORS: Author[] = [
  { id: 'a1', name: '刘慈欣', description: '中国著名科幻作家', avatar: 'https://picsum.photos/seed/liu/100/100' },
  { id: 'a2', name: '余华', description: '当代著名作家', avatar: 'https://picsum.photos/seed/yuhua/100/100' },
];

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'c1', name: '科幻' },
  { id: 'c2', name: '文学' },
  { id: 'c3', name: '历史' },
];

export const INITIAL_TAGS: Tag[] = [
  { id: 't1', name: '硬核科幻' },
  { id: 't2', name: '经典' },
  { id: 't3', name: '必读' },
];

export const INITIAL_BOOKS: Book[] = [
  {
    id: 'b1',
    title: '三体',
    authorId: 'a1',
    categoryId: 'c1',
    tags: ['t1', 't3'],
    cover: 'https://picsum.photos/seed/3body/300/400',
    description: '文化大革命如火如荼进行之际。军方探寻外星文明的绝秘计划“红岸工程”取得了突破性进展。但在按下发射键的那一刻，历经劫难的叶文洁没有意识到，她彻底改变了人类的命运。',
    chapters: [
      { id: 'ch1', title: '第一章 科学边界', content: '...', order: 1 },
      { id: 'ch2', title: '第二章 台球', content: '...', order: 2 },
    ],
    createdAt: Date.now(),
  },
  {
    id: 'b2',
    title: '活着',
    authorId: 'a2',
    categoryId: 'c2',
    tags: ['t2', 't3'],
    cover: 'https://picsum.photos/seed/alive/300/400',
    description: '《活着》讲述了农村人福贵悲惨的人生遭遇。福贵本是个阔少爷，可他嗜赌如命，输光了家产，父亲被他活活气死...',
    chapters: [],
    createdAt: Date.now() - 86400000,
  }
];
