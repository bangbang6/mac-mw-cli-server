"use strict";

const { FAILED } = require("../../const");
const { createCloudBuildTask } = require("../../models/CloudBuildTask");

const Controller = require("egg").Controller;

async function prepare(cloudBuildTask, socket, helper) {
  socket.emit(
    "build",
    helper.parseMsg("prepare", {
      message: "开始执行构建前准备工作",
    })
  );
  const prepareRes = await cloudBuildTask.prepare();
  if (!prepareRes || prepareRes.code === FAILED) {
    socket.emit(
      "build",
      helper.parseMsg("prepare failed", {
        message: "开始执行构建前准备工作失败",
      })
    );
    return;
  }
  socket.emit(
    "build",
    helper.parseMsg("prepare", {
      message: "构建前准备工作成功",
    })
  );
}
async function download(cloudBuildTask, socket, helper) {
  socket.emit(
    "build",
    helper.parseMsg("download repo", {
      message: "开始下载源码",
    })
  );
  const downloadRes = await cloudBuildTask.download();
  if (!downloadRes || downloadRes.code === FAILED) {
    socket.emit(
      "build",
      helper.parseMsg("download failed", {
        message: "源码下载失败",
      })
    );
    return;
  }
  socket.emit(
    "build",
    helper.parseMsg("download repo", {
      message: "源码下载成功",
    })
  );
}
async function install(cloudBuildTask, socket, helper) {
  socket.emit(
    "build",
    helper.parseMsg("install repo", {
      message: "开始安装依赖",
    })
  );
  const installRes = await cloudBuildTask.install();
  if (!installRes || installRes.code === FAILED) {
    socket.emit(
      "build",
      helper.parseMsg("install failed", {
        message: "源码安装依赖失败",
      })
    );
    return;
  }
  socket.emit(
    "build",
    helper.parseMsg("install repo", {
      message: "源码安装依赖成功",
    })
  );
}

async function build(cloudBuildTask, socket, helper) {
  socket.emit(
    "build",
    helper.parseMsg("build ", {
      message: "开始启动云构建",
    })
  );
  const buildRes = await cloudBuildTask.build();
  if (!buildRes || buildRes.code === FAILED) {
    socket.emit(
      "build",
      helper.parseMsg("build failed", {
        message: "云构建失败",
      })
    );
    return;
  }
  socket.emit(
    "build",
    helper.parseMsg("build", {
      message: "云构建成功",
    })
  );
}
async function prePublish(cloudBuildTask, socket, helper) {
  socket.emit(
    "build",
    helper.parseMsg("pre-publish", {
      message: "开始启动云发布校验",
    })
  );
  const prePublishRes = await cloudBuildTask.prePublish();
  if (!prePublishRes || prePublishRes.code === FAILED) {
    socket.emit(
      "build",
      helper.parseMsg("pre-publish failed", {
        message: "云发布校验失败",
      })
    );
    throw new Error("发布终止");
  }
  socket.emit(
    "build",
    helper.parseMsg("pre-publish", {
      message: "云发布校验成功",
    })
  );
}
async function publish(cloudBuildTask, socket, helper) {
  socket.emit(
    "build",
    helper.parseMsg("publish ", {
      message: "开始启动云发布",
    })
  );
  const publishRes = await cloudBuildTask.publish();
  if (!publishRes) {
    socket.emit(
      "build",
      helper.parseMsg("publish failed", {
        message: "云发布失败",
      })
    );
    return;
  }
  socket.emit(
    "build",
    helper.parseMsg("publish", {
      message: "云发布成功",
    })
  );
}
class NspController extends Controller {
  async index() {
    const { ctx, app } = this;
    const { socket, helper } = ctx;
    const cloudBuildTask = await createCloudBuildTask(ctx, app);
    try {
      await prepare(cloudBuildTask, socket, helper);
      await download(cloudBuildTask, socket, helper);
      await install(cloudBuildTask, socket, helper);
      await build(cloudBuildTask, socket, helper);
      await prePublish(cloudBuildTask, socket, helper);
      await publish(cloudBuildTask, socket, helper);
      socket.emit(
        "build",
        helper.parseMsg("build success", {
          message: `云构建成功,访问链接:${
            cloudBuildTask.isProdFun()
              ? "https://mac-mw-cli.oss-cn-hangzhou.aliyuncs.com/"
              : "https://mac-mw-cli-dev.oss-cn-hangzhou.aliyuncs.com/" +
                cloudBuildTask._name +
                "/index.html"
          }`,
        })
      );
      socket.disconnect();
    } catch (err) {
      socket.emit(
        "build",
        helper.parseMsg("error", {
          message: `云构建失败,失败原因` + err.message,
        })
      );
      await socket.disconnect();
    }
  }
}

module.exports = NspController;
