<template>
  <div class="pa-3">
    <div>
      <v-btn
        href="/idp/metadata?download"
        color="#4682B4"
        class="mr-4"
      >
        <v-icon class="icon-medium pr-2">
          mdi-file-code-outline
        </v-icon>
        Download Metadata
      </v-btn>
      <v-btn
        href="/idp/certificate?download"
        color="#4682B4"
      >
        <v-icon class="icon-medium pr-2">
          mdi-file-certificate-outline
        </v-icon>
        Download x509 Certificate
      </v-btn>
    </div>
    <div v-if="metadata">
      <highlightjs
        class="idp-metadata"
        autodetect
        :code="metadata"
      />
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
    this.$set(this, 'metadata', response.data);
    // this.metadata = response.data;
  },
};
</script>

<style>
.idp-metadata code {
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
