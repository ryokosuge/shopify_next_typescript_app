/** @type {import('next').NextConfig} */

const { parsed: localEnv } = require("dotenv").config();

const webpack = require("webpack");
const apiKey = JSON.stringify(process.env.SHOPIFY_API_KEY);

module.exports = {
  reactStrictMode: true,
  webpack: (config) => {
    const env = { SHOPIFY_API_KEY: apiKey };
    config.plugins.push(new webpack.DefinePlugin(env));
    return config;
  }
}
