const defaults = require('./lib/defaults');
const { execSync } = require('child_process');
const StyleLintPlugin = require('stylelint-webpack-plugin');
const MomentLocalesPlugin = require('moment-locales-webpack-plugin');

process.env.VUE_APP_GIT_HASH = execSync('git log --format="%h" -n 1').toString().
  trim();

module.exports = {
  configureWebpack: {
    plugins: [
      new MomentLocalesPlugin(),
      new StyleLintPlugin({ files: [ 'src/**/*.{vue,css}' ] }),
    ],
  },
  devServer: {
    host: '0.0.0.0',
    proxy: {
      '^/api': { target: `http://localhost.mock-services.io:${ defaults.port }` },
      '^/idp/': { target: `http://localhost.mock-services.io:${ defaults.port }` },
    },
  },
  filenameHashing: process.env.NODE_ENV !== 'production',
  transpileDependencies: [ 'vuetify' ],
};
