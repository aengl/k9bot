module.exports = {
  entry: ['babel-polyfill', './index.js'],
  output: {
    filename: 'bundle.js',
  },
  target: 'node',
  externals: { googleapis: 'require("googleapis")' },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['env'],
          },
        },
      },
    ],
  },
};
