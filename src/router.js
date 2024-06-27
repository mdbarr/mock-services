import Vue from 'vue';
import VueRouter from 'vue-router';

import state from '@/state';
import Home from '@/views/Home';
import Dns from '@/views/Dns';
import Sendgrid from '@/views/Sendgrid';
import Stripe from '@/views/Stripe';
import Logs from '@/views/Logs';
import Idp from '@/views/Idp';

Vue.use(VueRouter);

const routes = [
  {
    name: 'home',
    path: '/',
    meta: { title: '' },
    component: Home,
  }, {
    name: 'dns',
    path: '/dns',
    meta: { title: ' / DNS' },
    component: Dns,
  }, {
    name: 'sendgrid',
    path: '/sendgrid',
    meta: { title: ' /  SendGrid' },
    component: Sendgrid,
  }, {
    name: 'stripe',
    path: '/stripe',
    meta: { title: ' / Stripe' },
    component: Stripe,
  }, {
    name: 'logs',
    path: '/logs',
    meta: { title: ' / Logs' },
    component: Logs,
  }, {
    name: 'idp',
    path: '/idp',
    meta: { title: ' / IDP SAML' },
    component: Idp,
  },
];

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes,
  scrollBehavior (to, from, savedPosition) {
    let interval;

    return new Promise((resolve, reject) => {
      interval = setInterval(() => {
        if (!state.loading) {
          clearInterval(interval);
          resolve(to);
        }
      }, 250);
    });
  },
});

router.beforeEach((to, from, next) => next());

export default router;
