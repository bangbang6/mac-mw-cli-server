/* eslint valid-jsdoc: "off" */

/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
"use strict";
const REDIS_PORT = 6379;
const REDIS_HOST = "127.0.0.1";
const REDIS_PWD = "";
module.exports = (appInfo) => {
  /**
   * built-in config
   * @type {Egg.EggAppConfig}
   **/
  const config = (exports = {});

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + "_1718356848361_797";

  // add your middleware config here
  config.middleware = [];

  // add your user config here
  const userConfig = {
    // myAppName: 'egg',
  };
  // add websocket server
  config.io = {
    init: {
      wsEngine: "ws",
    },
    namespace: {
      "/": {
        connectionMiddleware: ["auth"],
        packetMiddleware: [],
      },
    },

    // redis: {
    //   host: REDIS_HOST,
    //   port: REDIS_PORT,
    //   password: REDIS_PWD,
    //   db: 0,
    // },
  };
  config.redis = {
    client: {
      port: REDIS_PORT,
      host: REDIS_HOST,
      password: REDIS_PWD,
      db: 0,
    },
  };

  return {
    ...config,
    ...userConfig,
  };
};
