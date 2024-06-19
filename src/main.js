import Vue from 'vue';
import App from '@/App.vue';
import router from '@/router';
import vuetify from '@/plugins/vuetify';
import moment from 'moment';
import highlight from '@/plugins/highlight';
import hyperingenuity from '@hyperingenuity/vue-plugin';

Vue.use(highlight);
Vue.use(hyperingenuity);

Vue.config.productionTip = false;

Vue.filter('calendar', (value = 0) => moment(value).calendar());

new Vue({
  router,
  vuetify,
  render: h => h(App),
}).$mount('#app');
