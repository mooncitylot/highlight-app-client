import webpack from "webpack";
import HtmlWebpackPlugin from "html-webpack-plugin";
import { CleanWebpackPlugin } from "clean-webpack-plugin";
import path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function setEnvDefaults({ mode }) {
  const DEV_PORT = 8000;
  const defaults = {
    DEV_PORT,
    API_URL: process.env.API_URL || "http://localhost:8080",
    APP_URL: process.env.APP_URL || `https://localhost:${DEV_PORT}`,
    BUILD_MODE: mode || "production",
  };

  Object.keys(defaults).forEach((key) => {
    if (!process.env[key]) {
      process.env[key] = defaults[key];
    }
  });

  return process.env;
}

export default (env, { mode }) => {
  setEnvDefaults({ mode });

  const publicPath = "/";

  console.log(`
    ***********************
    
    APP_URL: ${process.env.APP_URL}
    API_URL: ${process.env.API_URL}
    publicPath: ${publicPath}
    
    ***********************
  `);

  return {
    entry: path.resolve(__dirname, "./src/app-enter.js"),
    output: {
      filename: "[name].[chunkhash].js",
      path: path.resolve(__dirname, "dist"),
      publicPath,
    },
    devServer: {
      https: true,
      historyApiFallback: true,
      port: process.env.DEV_PORT,
      allowedHosts: "all",
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods":
          "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers":
          "X-Requested-With, content-type, Authorization",
      },
    },
    devtool: "source-map",
    plugins: [
      new CleanWebpackPlugin({
        cleanOnceBeforeBuildPatterns: [path.join(__dirname, "dist/**/*")],
      }),
      new webpack.DefinePlugin({
        "process.env.API_URL": JSON.stringify(process.env.API_URL),
        "process.env.APP_URL": JSON.stringify(process.env.APP_URL),
        "process.env.DEV_PORT": JSON.stringify(process.env.DEV_PORT),
      }),
      new HtmlWebpackPlugin({
        template: "index.html",
      }),
    ],
  };
};
