"use strict";
const { Controller } = require("egg");
const mongo = require("../utils/mongo");
const OSS = require("../models/OSS");
const { OSS_PROD_BUCKET, OSS_DEV_BUCKET } = require("../../config/db");
const { failed, success } = require("../models/request");

class ProjectController extends Controller {
  async getTemplate() {
    const { ctx } = this;
    const data = await mongo().query("project");
    ctx.body = data;
  }
  async getOssProject() {
    const { ctx } = this;
    let ossProjectType = ctx.query.type;
    const name = ctx.query.name;
    if (!name) {
      ctx.body = failed("项目名称不存在");
      return;
    }
    if (!ossProjectType) {
      ossProjectType = "prod";
    }
    let oss;
    if (ossProjectType === "prod") {
      oss = new OSS(OSS_PROD_BUCKET);
    } else {
      oss = new OSS(OSS_DEV_BUCKET);
    }
    const fileList = await oss.list(name);
    ctx.body = success("获取项目文件成功", fileList);
  }
  async getOssFile() {
    const { ctx } = this;
    const file = ctx.query.file;
    const dir = ctx.query.name;
    let ossProjectType = ctx.query.type;
    if (!file || !dir) {
      ctx.body = failed("请提供OSS文件名称");
    }
    if (!ossProjectType) {
      ossProjectType = "prod";
    }
    let oss;
    if (ossProjectType === "prod") {
      oss = new OSS(OSS_PROD_BUCKET);
    } else {
      oss = new OSS(OSS_DEV_BUCKET);
    }
    if (oss) {
      const fileList = await oss.list(dir);
      const fileName = `${dir}/${file}`;
      const file2 = fileList.find((item) => item.name === fileName);
      ctx.body = success("获取项目文件成功", file2);
    } else {
      ctx.body = failed("获取项目文件失败");
    }
  }
}

module.exports = ProjectController;
