import { defineStore } from 'pinia'

export const useLanguageStore = defineStore('language', {
  state: () => ({
    currentLanguage: 'zh' as 'zh' | 'en',
  }),

  actions: {
    setLanguage(lang: 'zh' | 'en') {
      this.currentLanguage = lang;

      // 将语言选择保存到 localStorage，以便下次访问时记住用户偏好
      localStorage.setItem('preferred-language', lang);
    },

    initLanguage() {
      // 1. 优先从 localStorage 获取用户手动设置的偏好
      const savedLang = localStorage.getItem('preferred-language') as 'zh' | 'en' | null;

      if (savedLang && (savedLang === 'zh' || savedLang === 'en')) {
        this.currentLanguage = savedLang;
        return;
      }

      // 2. 如果没有保存的偏好，则检测浏览器语言
      const browserLang = navigator.language.toLowerCase();
      
      // 检查是否为中文 (zh, zh-CN, zh-TW, etc.)
      if (browserLang.startsWith('zh')) {
        this.currentLanguage = 'zh';
      } else {
        // 其他所有语言默认使用英语
        this.currentLanguage = 'en';
      }
    }
  },

  getters: {
    getCurrentLanguage: (state) => state.currentLanguage,
    isChinese: (state) => state.currentLanguage === 'zh',
    isEnglish: (state) => state.currentLanguage === 'en',
  }
})