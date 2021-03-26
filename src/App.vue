<template>
  <v-app>
    <v-navigation-drawer
      app
      mini-variant
      dark
      clipped
      color="#1e1e1e"
    >
      <v-tabs
        optional
        slider-color="#4682B4"
        slider-size="3"
        vertical
      >
        <v-tab to="dns">
          <v-icon left>
            mdi-dns
          </v-icon>
        </v-tab>
        <v-tab to="sendgrid">
          <v-icon left>
            mdi-email
          </v-icon>
        </v-tab>
        <v-tab to="stripe">
          <v-icon left>
            mdi-credit-card
          </v-icon>
        </v-tab>
        <v-tab to="logs">
          <v-icon left>
            mdi-file-document-outline
          </v-icon>
        </v-tab>
      </v-tabs>
    </v-navigation-drawer>

    <v-app-bar
      app
      clipped-left
      color="#4682B4"
      dark
      dense
    >
      <v-icon class="pr-5">
        mdi-application-cog
      </v-icon>

      <v-toolbar-title class="mock-services-title font-weight-bold">
        MOCK SERVICES {{ title }}
      </v-toolbar-title>
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>
    <v-footer
      app
      dark
      dense
    >
      <v-spacer />
      <v-btn
        icon
        small
        @click="$theme.toggle()"
      >
        <v-icon small>
          mdi-theme-light-dark
        </v-icon>
      </v-btn>
    </v-footer>
  </v-app>
</template>

<script>
import state from '@/state';

export default {
  name: 'App',
  data () {
    return { state };
  },
  computed: {
    title () {
      return this.$route.meta.title;
    },
  },
  created () {
    this.$theme.init(this);
  },
};
</script>

<style>
.v-tab {
  justify-content: unset !important;
}

.mock-services-title {
  font-family: 'Roboto Mono', monospace;
  letter-spacing: 2px;
}
</style>
