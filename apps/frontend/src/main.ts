import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { i18n } from './lib/i18n'
import './style.css'
import 'vue-sonner/style.css'
import App from './App.vue'
import { useLanguageStore } from './stores/language'

// 创建 Pinia 实例
const pinia = createPinia()

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

