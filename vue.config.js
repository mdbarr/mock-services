const defaults = require('./lib/defaults');
const StyleLintPlugin = require('stylelint-webpack-plugin');
const MomentLocalesPlugin = require('moment-locales-webpack-plugin');

module.exports = {
  configureWebpack: {
    plugins: [
      new MomentLocalesPlugin(),
      new StyleLintPlugin({ files: [ 'src/**/*.{vue,css}' ] }),
    ],
  },
  devServer: {
    host: '0.0.0.0',
    disableHostCheck: true,
    proxy: { '^/api': { target: `https://localhost:${ defaults.port }` } },
  },
  filenameHashing: process.env.NODE_ENV !== 'production',
  transpileDependencies: [ 'vuetify' ],
};
