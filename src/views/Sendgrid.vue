<template>
  <div class="full-height">
    <v-toolbar
      dense
    >
      <span
        class="subtitle-2 blue--text sendgrid-clickable"
        @click="getUsers"
      >
        Users
      </span>
      <span
        v-if="user"
        class="title pl-2 pr-2 grey--text"
      >/</span>
      <span
        v-if="user"
        class="subtitle-2 sendgrid-clickable"
        @click="getMessages"
      >
        {{ user }}
      </span>
    </v-toolbar>
    <div v-if="user === null">
      <v-data-table
        :headers="userHeaders"
        :items="users"
        disable-pagination
        hide-default-footer
        class="font-weight-bold"
        @click:row="clickedUser"
      />
    </div>
    <div
      v-else-if="user && message === null"
      class="full-height"
    >
      <v-data-table
        :headers="messageHeaders"
        :items="messages"
        :item-class="messageClass"
        disable-pagination
        hide-default-footer
        single-select
        @click:row="clickedMessage"
      >
        <template
          #item.timestamp="{ item }"
        >
          {{ (item.timestamp * 1000) | calendar }}
        </template>
      </v-data-table>
    </div>
    <div
      v-else-if="message !== null"
      class="full-height"
    >
      <div class="title pl-3 pt-2 pb-1">
        {{ message.subject }}
      </div>
      <div class="subtitle-2 pl-2 pb-1">
        <v-avatar
          color="grey lighten-2"
          size="32"
        >
          <v-icon color="grey darken-1">
            mdi-account
          </v-icon>
        </v-avatar>
        <span class="pl-2">{{ message.fromName }} &lt;{{ message.from }}&gt;</span>
        <span
          class="pl-2 pr-3"
          style="float: right;"
        >{{ (message.timestamp * 1000) | calendar }}</span>
      </div>
      <iframe
        ref="iframe"
        width="100%"
        height="100%"
        sandbox="allow-top-navigation allow-scripts allow-forms"
        style="border: none;"
      />
    </div>
  </div>
</template>

<script>
import state from '@/state';

export default {
  name: 'Sendgrid',
  data () {
    return {
      state,
      user: null,
      users: [],
      userHeaders: [
        {
          text: 'User', value: 'to',
        }, {
          text: 'Messages', value: 'messages',
        },
      ],
      message: null,
      messages: [],
      messageHeaders: [
        {
          text: 'From', value: 'fromName',
        }, {
          text: 'Subject', value: 'subject',
        }, {
          text: 'Sent', value: 'timestamp',
        },
      ],
    };
  },
  mounted () {
    this.view = 0;
    this.getUsers();
  },
  methods: {
    clickedUser (item) {
      this.user = item.to;
      this.getMessages();
    },
    clickedMessage (message) {
      this.message = message;
      this.$nextTick(() => {
        this.$refs.iframe.src = `/api/mock/sendgrid/raw/${ message.id }`;
      });
    },
    async getMessages () {
      this.message = null;

      const response = await this.$api.get(`/api/mock/sendgrid/messages/${ this.user }?all=true`);
      console.log(response.data.items);

      this.messages.splice(0, this.messages.length, ...response.data.items);
    },
    async getUsers () {
      this.user = this.message = null;
      const response = await this.$api.get('/api/mock/sendgrid/users');
      console.log(response.data.items);

      this.users.splice(0, this.users.length, ...response.data.items);
    },
    messageClass (item) {
      if (item.read) {
        return 'sendgrid-message-read';
      }
      return 'sendgrid-message-unread';
    },
  },
};
</script>

<style>
.sendgrid-message-read {
  font-weight: normal;
}

.sendgrid-message-unread {
  font-weight: bold;
}

.sendgrid-clickable {
  cursor: pointer;
}
</style>
