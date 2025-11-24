import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import './style.css'
import 'vue-sonner/style.css'
import App from './App.vue'
import { useLanguageStore } from './stores/language'

// 引入语言文件
import en from './locales/en.json'
import zh from './locales/zh.json'

// 创建 Pinia 实例
const pinia = createPinia()

// 创建 Vue I18n 实例
const i18n = createI18n({
  legacy: false, // 使用 Composition API 模式
  locale: 'zh', // 设置默认语言为中文（稍后会被用户偏好覆盖）
  fallbackLocale: 'en', // 设置备用语言为英文
  messages: {
    en,
    zh
  }
})

const app = createApp(App)

app.use(pinia)
app.use(i18n)

// 初始化语言设置
const languageStore = useLanguageStore(pinia);
languageStore.initLanguage();

// 同步语言到 i18n
i18n.global.locale.value = languageStore.currentLanguage;

// 监听语言变化并更新i18n实例
languageStore.$subscribe((_mutation, state) => {
  i18n.global.locale.value = state.currentLanguage;
});

app.mount('#app')

