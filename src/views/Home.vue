<template>
  <v-row class="ma-2">
    <v-card
      width="325"
      class="ma-4"
      to="dns"
      color="blue"
      dark
    >
      <v-card-text class="home-card">
        <v-icon class="pr-3">
          mdi-dns
        </v-icon>
        Domain Name Server
      </v-card-text>
    </v-card>
    <v-card
      width="325"
      class="ma-4"
      to="sendgrid"
      color="teal"
      dark
    >
      <v-card-text class="home-card">
        <v-icon class="pr-3">
          mdi-email
        </v-icon>
        Mock SendGrid
      </v-card-text>
    </v-card>
    <v-card
      width="325"
      class="ma-4"
      to="stripe"
      color="deep-purple"
      dark
    >
      <v-card-text class="home-card">
        <v-icon class="pr-3">
          mdi-credit-card
        </v-icon>
        Mock Stripe
      </v-card-text>
    </v-card>
    <v-card
      width="325"
      class="ma-4"
      to="logs"
      color="cyan"
      dark
    >
      <v-card-text class="home-card">
        <v-icon class="pr-3">
          mdi-file-document-outline
        </v-icon>
        Logs
      </v-card-text>
    </v-card>
  </v-row>
</template>

<script>
import state from '@/state';

export default {
  name: 'Home',
  data () {
    return { state };
  },
};
</script>

<style>
.home-card {
  color: white !important;
  font-family: 'Roboto Mono', monospace;
  font-size: 18px !important;
  font-weight: bold !important;
}
</style>
