"use strict";

const { createCloudBuildTask } = require("../../models/CloudBuildTask");

const REDIS_PREFIX = "cloudbuild";
module.exports = () => {
  return async (ctx, next) => {
    const { socket, helper, app } = ctx;
    const { redis } = app;
    const query = ctx.handshake.query;
    const { id } = socket;
    try {
      setTimeout(() => {
        socket.emit(
          id,
          helper.parseMsg("connect", {
            type: "connect",
            message: "云构建服务链接成功",
          })
        );
      }, 60);
      let hasTask = await redis.get(`${REDIS_PREFIX}:${id}`);
      if (!hasTask) {
        await redis.set(`${REDIS_PREFIX}:${id}`, JSON.stringify(query));
      }
      hasTask = await redis.get(`${REDIS_PREFIX}:${id}`);
      await next();
      // 清楚缓存文件
      const cloudBuildTask = await createCloudBuildTask(ctx, app);
      await cloudBuildTask.clear();
      console.log("disconnect");
    } catch (e) {
      console.log("build error");
      const cloudBuildTask = await createCloudBuildTask(ctx, app);
      await cloudBuildTask.clear();
    }
  };
};
