const Path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

// webpack-bundle-analyzer can be run after compilation.
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

// webpack-monitor is noisy so disabled by default (uses a deprecated API).
const WebpackMonitor = !!JSON.parse(process.env["WEBPACK_MONITOR"] || "false")
      ? new (require('webpack-monitor'))({
        capture: true,
        target: 'browser/webpack-monitor.json',
        launch: true
      })
      : []

module.exports = {
  entry: {
    "ods-shex-validator-bundle"    : "./index.js",
    "ods-shex-validator-bundle.min"    : "./index.js"
  },
  output: {
    filename: "[name].js",
    path: Path.resolve(__dirname, 'build', ),
    library: "ods_semantic_validator",
    libraryTarget: 'umd',
    globalObject: 'this'
    // publicPath: WebPacksDir,
    // libraryExport: 'ShExWebApp',
    // umdNamedDefine: true,
    // // globalObject: 'this'
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({
      terserOptions: {
        "keep_classnames": true
      },
      include: /\.min\.js$/
    })]
  },
  resolve: {
  fallback: {
    fs: false,
    url: false,
    buffer: false
    }
  },
  plugins: [
    // new BundleAnalyzerPlugin(/*{analyzerMode: 'json'}*/)
  ].concat(WebpackMonitor),
  module: {
  rules: [
    {
      test: /\.js$/,
      exclude: /[\\/]node_modules[\\/](?!(@shexjs|n3|queue-microtask|hierarchy-closure)[\\/])/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env']
        }
      }
    }
  ]
}
};
