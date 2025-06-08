/**
 * @param {Egg.Application} app - egg application
 */
"use strict";

module.exports = (app) => {
  const { router, controller, io } = app;
  router.get("/project/template", controller.project.getTemplate);
  router.get("/project/oss", controller.project.getOssProject);
  router.get("/oss/get", controller.project.getOssFile);
  // socket
  io.of("/").route("build", io.controller.build.index); // 发起build命令到nsp.build这个controller处理
};
