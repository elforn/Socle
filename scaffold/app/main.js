import '../_lib/core/router/app-router.js';
import './pages/home-page.js';
import './pages/not-found-page.js';

console.log('%%APP_NAME%%', __APP_VERSION__);

const router = document.querySelector('app-router');
router.routes = [
  { path: '/', component: 'home-page' },
  { path: '*', component: 'not-found-page' },
];
