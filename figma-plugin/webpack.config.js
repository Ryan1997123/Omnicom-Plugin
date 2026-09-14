const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const HtmlInlineScriptPlugin = require("html-inline-script-webpack-plugin");

module.exports = (env, argv) => {
  const isProd = argv.mode === "production";

  return [
    // Plugin controller — runs in Figma's sandboxed main thread.
    {
      mode: argv.mode || "development",
      devtool: isProd ? false : "inline-source-map",
      entry: { code: "./src/code.js" },
      output: {
        filename: "[name].js",
        path: path.resolve(__dirname, "dist"),
      },
      module: {
        rules: [{ test: /\.js$/, use: "babel-loader", exclude: /node_modules/ }],
      },
    },
    // Plugin UI — bundled React app, inlined into a single ui.html (required by Figma).
    {
      mode: argv.mode || "development",
      devtool: isProd ? false : "inline-source-map",
      entry: { ui: "./src/ui.jsx" },
      output: {
        filename: "[name].js",
        path: path.resolve(__dirname, "dist"),
      },
      module: {
        rules: [
          { test: /\.jsx?$/, use: "babel-loader", exclude: /node_modules/ },
          { test: /\.css$/, use: ["style-loader", "css-loader"] },
        ],
      },
      resolve: { extensions: [".js", ".jsx"] },
      plugins: [
        new HtmlWebpackPlugin({
          filename: "ui.html",
          template: "./src/ui.html",
          inject: "body",
          chunks: ["ui"],
        }),
        new HtmlInlineScriptPlugin(),
      ],
    },
  ];
};
