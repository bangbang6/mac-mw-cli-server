"use strict";

const {
  OSS_ACCESS_KEY,
  OSS_ACCESS_SECRET,
  OSS_REGION,
} = require("../../config/db");

class OSS {
  constructor(bucket) {
    this.oss = require("ali-oss")({
      accessKeyId: OSS_ACCESS_KEY,
      accessKeySecret: OSS_ACCESS_SECRET,
      bucket,
      regin: OSS_REGION,
    });
  }
  async put(object, localPath, options = {}) {
    await this.oss.put(object, localPath, options);
  }
  async list(prefix) {
    const ossFileList = await this.oss.list({
      prefix,
    });
    if (ossFileList && ossFileList.objects) {
      return ossFileList.objects;
    }
    return [];
  }
}
module.exports = OSS;
