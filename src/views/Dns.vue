<template>
  <v-container>
    <v-card
      v-for="type in constants.dns.types"
      :key="type"
      class="ma-4"
      :max-width="1000"
    >
      <v-card-title class="dns-card-title ma-0 pa-1 pl-2 white--text">
        <span>
          {{ type | uppercase }} Records
        </span>
        <v-spacer />
        <span>
          <v-btn
            v-if="false"
            dark
            icon
            small
            class="mr-2"
          >
            <v-icon small>mdi-plus</v-icon>
          </v-btn>
          <v-btn
            dark
            icon
            small
            class="mr-2"
            @click="refresh(type)"
          >
            <v-icon small>mdi-reload</v-icon>
          </v-btn>
        </span>
      </v-card-title>
      <v-card-text class="ma-0 pa-1">
        <div v-if="records[type] && Object.keys(records[type]).length">
          <div
            v-for="(value, key) in records[type]"
            :key="key"
            class="dns-card-record"
          >
            <span :class="keyClass(key)">{{ key }}</span>
            IN {{ type | uppercase }}
            <span class="purple--text">{{ value | record }}</span>
          </div>
        </div>
        <div
          v-else
          class="dns-card-record-none"
        >
          None.
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script>
import state from '@/state';
import constants from '@/constants';

export default {
  name: 'Dns',
  filters: {
    record (value) {
      if (typeof value === 'string') {
        return value;
      } else if (typeof value === 'object' && value !== null) {
        if (value.preference && value.exchange) {
          return `${ value.preference } ${ value.exchange }`;
        } else if (value.priority && value.weight && value.port && value.target) {
          return `${ value.priority } ${ value.weight } ${ value.port } ${ value.target }`;
        }
      }
      return '';
    },
  },
  data () {
    return {
      state,
      constants,
      records: {},
    };
  },
  mounted () {
    for (const type of constants.dns.types) {
      this.refresh(type);
    }
  },
  methods: {
    keyClass (key) {
      if (key.startsWith('/')) {
        return 'teal--text';
      }
      return 'blue--text';
    },
    refresh (type) {
      this.$api.get(`/api/mock/dns/${ type }`).
        then((response) => {
          this.$set(this.records, type, response.data);
        });
    },
  },
};
</script>

<style>
.dns-card-title {
  background: steelblue;
}

.dns-card-record {
  font-family: 'Roboto Mono', monospace;
  font-weight: bold;
  padding-left: 8px;
}

.dns-card-record-none {
  font-family: 'Roboto Mono', monospace;
  font-style: italic;
  padding-left: 8px;
}
</style>
