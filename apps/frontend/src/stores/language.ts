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
      // 从 localStorage 中获取用户偏好语言
      const savedLang = localStorage.getItem('preferred-language') as 'zh' | 'en' | null;

      if (savedLang && (savedLang === 'zh' || savedLang === 'en')) {
        this.currentLanguage = savedLang;
      } else {
        // 如果没有保存的语言偏好，则使用默认值（zh）
        this.currentLanguage = 'zh';
      }
    }
  },

  getters: {
    getCurrentLanguage: (state) => state.currentLanguage,
    isChinese: (state) => state.currentLanguage === 'zh',
    isEnglish: (state) => state.currentLanguage === 'en',
  }
})