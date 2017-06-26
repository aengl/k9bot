module.exports = {
  entry: ['babel-polyfill', './index.js'],
  output: {
    filename: 'bundle.js',
  },
  target: 'node',
  externals: [
    function(context, request, cb) {
      if (/^[a-z\-0-9]+$/.test(request)) {
        cb(null, 'commonjs ' + request);
        return;
      }
      cb();
    },
  ],
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
