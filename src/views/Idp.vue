<template>
  <div class="pa-3">
    <div>
      <v-btn
        href="/idp/metadata?download"
        color="#0073b1"
      >
        <v-icon class="icon-medium pr-2">
          mdi-file-code-outline
        </v-icon>
        Download Metadata
      </v-btn>
    </div>
    <div>
      <pre class="idp-metadata">{{ metadata }}</pre>
    </div>
  </div>
</template>

<script>
import state from '@/state';

export default {
  name: 'Idp',
  data () {
    return {
      state,
      metadata: '',
    };
  },
  async mounted () {
    const response = await this.$api.get('/idp/metadata');
    this.metadata = response.data;
  },
};
</script>

<style>
.idp-metadata {
  border: 1px solid #333;
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  margin: 16px 0;
  overflow-wrap: anywhere;
  padding: 4px;
  text-wrap: wrap;
  word-break: break-all;
};
</style>
