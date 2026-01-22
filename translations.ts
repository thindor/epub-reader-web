
import { useMemo } from 'react';

export const translations = {
  zh: {
    home: '发现内容',
    shelf: '我的书架',
    admin: '后台管理',
    settings: '系统设置',
    discover: '发现无限可能，阅读成就非凡',
    bannerSub: '我们精选全球优质数字读物，让阅读成为一种生活方式。',
    startReading: '立即开启探索',
    popular: '热门书籍',
    viewAll: '查看全部',
    noBooks: '目前图书馆还是空的',
    searchPlaceholder: '搜索感兴趣的书籍、作者、内容',
    shelfTitle: '我的书架',
    shelfSub: '您收藏及阅读过的所有书籍资源',
    notLoggedIn: '请先登录',
    loginToShelf: '登录后即可同步查看您的个人书架收藏',
    loginNow: '立即登录',
    readerFail: '阅读器启动失败',
    prev: '上一页',
    next: '下一页',
    toc: '目录内容',
    bookmarks: '我的书签',
    noBookmarks: '暂无任何书签',
    bookmarkSaved: '书签已保存并同步至书架',
    addBookmark: '添加书签',
    language: '语言设置',
    appearance: '外观偏好',
    security: '安全与存储',
    clearCache: '清除本地缓存',
    autoSave: '自动保存进度',
    annotations: '笔记与划线',
    addComment: '添加评论',
    saveComment: '保存评论',
    colorYellow: '金黄',
    colorGreen: '清新绿',
    colorBlue: '天空蓝',
    colorPink: '亮粉',
    underline: '下划线',
    removeAnnotation: '删除笔记'
  },
  en: {
    home: 'Home',
    shelf: 'My Shelf',
    admin: 'Admin',
    settings: 'Settings',
    discover: 'Explore infinite possibilities through reading',
    bannerSub: 'We select global premium digital readings to make reading a lifestyle.',
    startReading: 'Start Reading',
    popular: 'Popular Books',
    viewAll: 'View All',
    noBooks: 'The library is currently empty',
    searchPlaceholder: 'Search for books, authors, or content',
    shelfTitle: 'My Shelf',
    shelfSub: 'All books you have collected or read',
    notLoggedIn: 'Not Logged In',
    loginToShelf: 'Login to sync and view your personal book shelf',
    loginNow: 'Login Now',
    readerFail: 'Reader failed to start',
    prev: 'PREVIOUS',
    next: 'NEXT',
    toc: 'Table of Contents',
    bookmarks: 'Bookmarks',
    noBookmarks: 'No bookmarks yet',
    bookmarkSaved: 'Bookmark saved and synced to shelf',
    addBookmark: 'Add Bookmark',
    language: 'Language Settings',
    appearance: 'Appearance',
    security: 'Security & Storage',
    clearCache: 'Clear Cache',
    autoSave: 'Auto Save Progress',
    annotations: 'Annotations',
    addComment: 'Add Comment',
    saveComment: 'Save',
    colorYellow: 'Yellow',
    colorGreen: 'Green',
    colorBlue: 'Blue',
    colorPink: 'Pink',
    underline: 'Underline',
    removeAnnotation: 'Remove'
  }
};

export type TranslationKey = keyof typeof translations.zh;

export const useTranslation = () => {
  const savedLang = localStorage.getItem('app_lang');
  const lang = (savedLang === 'en' || savedLang === 'zh') ? savedLang : 'zh';

  const t = useMemo(() => {
    return (key: TranslationKey) => {
      const group = translations[lang as keyof typeof translations];
      return (group as any)[key] || key;
    };
  }, [lang]);

  return { t, lang };
};
