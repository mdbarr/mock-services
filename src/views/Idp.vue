<template>
  <div class="pa-3">
    <div
      v-if="info"
      class="idp-info"
    >
      <div class="caption font-weight-bold pb-2">
        SSO URL
      </div>
      <div><span class="idp-info-url">{{ info.sso }}</span></div>
      <div class="caption font-weight-bold pt-3 pb-2">
        Entity ID
      </div>
      <div><span class="idp-info-url">{{ info.entity }}</span></div>
      <div class="caption font-weight-bold pt-3 pb-2">
        Metadata URL
      </div>
      <div><span class="idp-info-url">{{ info.metadata }}</span></div>
    </div>
    <div class="pt-4">
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
  </div>
</template>

<script>
import state from '@/state';

export default {
  name: 'Idp',
  data () {
    return {
      state,
      info: null,
      metadata: '',
    };
  },
  async mounted () {
    const info = await this.$api.get('/idp/info');
    this.info = info.data;
    const metadata = await this.$api.get('/idp/metadata');
    this.metadata = metadata.data;
  },
};
</script>

<style>
.idp-info {
  font-family: 'Fira Code', monospace;
  font-size: 12px;
}

.theme--dark .idp-info-url {
  background-color: #313131;
  border-radius: 3px;
  color: white;
  font-size: 13px;
  padding: 4px 8px;
}

.theme--light .idp-info-url {
  background-color: #F4F4F4;
  border-radius: 3px;
  color: black;
  font-size: 13px;
  padding: 4px 8px;
}

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
