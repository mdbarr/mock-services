const defaults = require('./lib/defaults');
const StyleLintPlugin = require('stylelint-webpack-plugin');

module.exports = {
  configureWebpack: { plugins: [ new StyleLintPlugin({ files: [ 'src/**/*.{vue,css}' ] }) ] },
  devServer: {
    host: '0.0.0.0',
    disableHostCheck: true,
    proxy: { '^/api': { target: `http://localhost:${ defaults.port }` } },
  },
  filenameHashing: process.env.NODE_ENV !== 'production',
  transpileDependencies: [ 'vuetify' ],
};
