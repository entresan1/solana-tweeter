// CSS.
import 'solana-wallets-vue/styles.css';
import './main.css';

// Routing.
import router from './router';

// Create the app.
import { createApp } from 'vue';
import App from './App.vue';

const app = createApp(App);

// Global error handlers for debugging
app.config.errorHandler = (err, instance, info) => {
  console.error('[vue-error]', err, info, instance);
};

router.onError((err) => {
  console.error('[router-error]', err);
});

app.config.warnHandler = (msg, instance, trace) => {
  if (String(msg).includes('Invalid route') || String(msg).includes('props default')) {
    console.warn('[vue-warn]', msg, trace);
  }
};

app.use(router).mount('#app');
