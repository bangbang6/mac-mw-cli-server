"use strict";
const path = require("path");
const userHome = require("user-home");
const fse = require("fs-extra");
const fs = require("fs");
const { default: simpleGit } = require("simple-git");
const { SUCCESS, FAILED } = require("../const");
const OSS = require("./OSS");
const glob = require("glob");
const { OSS_PROD_BUCKET, OSS_DEV_BUCKET } = require("../../config/db");
const helper = require("../extend/helper");
const REDIS_PREFIX = "cloudbuild";

const exec = (command, args, options) => {
  const win32 = process.platform === "win32";
  const cmd = win32 ? "cmd" : command; // windows 下 cmd才是可执行文件
  const cmdArgs = win32 ? ["/c"].concat(command, args) : args; //// windows 下 /c表示 静莫执行
  return require("child_process").spawn(cmd, cmdArgs, options || {});
};
function checkCommand(command) {
  if (command) {
    const commands = command.split(" ");
    if (
      commands.length === 0 ||
      ["npm", "cnpm", "yarn"].indexOf(commands[0]) === -1
    ) {
      return false;
    }
    return true;
  }
  return false;
}

class CloudBuildTask {
  constructor(props, ctx, app) {
    this._name = props.name;
    this._version = props.version;
    this._ctx = ctx;
    this._logger = this._ctx.logger;
    this._repo = props.repo;
    this._branch = props.branch;
    this._buildCmd = props.buildCmd;
    this._prod = props.prod === "true";
    this._app = app;
    this._dir = path.resolve(
      userHome,
      ".mac-mw-cli-dev",
      "cloudbuild",
      `${this._name}@${this._version}`
    );
    this.sourceCodeDir = path.resolve(this._dir, this._name); // 缓存目录
  }
  async prepare() {
    fse.ensureDirSync(this._dir);
    fse.emptyDirSync(this._dir);
    this._git = new simpleGit(this._dir);
    if (this._prod) {
      this.oss = new OSS(OSS_PROD_BUCKET);
    } else {
      this.oss = new OSS(OSS_DEV_BUCKET);
    }
    return this.success();
  }
  async download() {
    await this._git.clone(this._repo);
    this._git = new simpleGit(this.sourceCodeDir);
    await this._git.checkout(["-b", this._branch, `origin/${this._branch}`]);
    return fse.existsSync(this.sourceCodeDir) ? this.success() : this.failed();
  }
  async install() {
    let res = true;
    res && (res = await this.execCommand("npm install"));
    return res ? this.success() : this.failed();
  }
  async build() {
    let res = true;
    if (checkCommand(this._buildCmd)) {
      res = await this.execCommand(this._buildCmd);
    } else {
      res = false;
    }
    return res ? this.success() : this.failed();
  }

  async prePublish() {
    // 获取构建结果
    const buildPath = this.findBuildPath();
    // 检查构建结果
    if (!buildPath) {
      return this.failed("未找到构建结果,请检查");
    }
    this._buildPath = buildPath;
    return this.success();
  }
  async publish() {
    return new Promise((resolve, reject) => {
      glob(
        "**",
        {
          cwd: this._buildPath,
          nodir: true,
          ignore: "**/node_modules/**",
        },
        (err, files) => {
          if (err) {
            resolve(false);
          } else {
            Promise.all(
              files.map(async (file) => {
                const filePath = path.resolve(this._buildPath, file);
                const uploadOSSRes = await this.oss.put(
                  `${this._name}/${file}`,
                  filePath
                );
                return uploadOSSRes;
              })
            )
              .then(() => {
                resolve(true);
              })
              .catch((err) => {
                this._logger.error(err);
                resolve(false);
              });
          }
        }
      );
    });
  }
  findBuildPath() {
    const buildDir = ["dist", "build"];
    const buildPath = buildDir.find((dir) =>
      fs.existsSync(path.resolve(this.sourceCodeDir, dir))
    );
    this._ctx.logger.info("buildPath", buildPath);
    if (buildPath) {
      return path.resolve(this.sourceCodeDir, buildPath);
    }
    return null;
  }
  execCommand(command) {
    // npm install
    const commands = command.split(" ");
    if (commands.length === 0) {
      return null;
    }
    const firstCommand = commands[0];
    const leftCommand = commands.slice(1) || [];
    return new Promise((resolve) => {
      const p = exec(
        firstCommand,
        leftCommand,
        {
          cwd: this.sourceCodeDir,
        },
        { stdio: "pipe" }
      );
      p.on("error", (e) => {
        this._ctx.logger.error("build error", e);
        resolve(false);
      });
      p.on("exit", (c) => {
        this._ctx.logger.info("build exit", c);
        resolve(true);
      });
      p.stdout.on("data", (data) => {
        this._ctx.emit("building", data.toString());
      });
      p.stderr.on("data", (data) => {
        this._ctx.emit("building", data.toString());
      });
    });
  }
  success(message, data) {
    return this.response(SUCCESS, message, data);
  }
  failed(message, data) {
    return this.response(FAILED, message, data);
  }
  response(code, message, data) {
    return {
      code,
      message,
      data,
    };
  }
  async clear() {
    if (fs.existsSync(this._dir)) {
      fse.removeSync(this._dir);
    }
    const { socket } = this._ctx;

    const clinet = socket.id;
    await this._app.del(`${REDIS_PREFIX}:${clinet}`);
  }
  isProdFun() {
    return this._prod;
  }
}
async function createCloudBuildTask(ctx, app) {
  const { socket } = ctx;
  const clinet = socket.id;
  const redisKey = `${REDIS_PREFIX}:${clinet}`;

  const redisTask = await app.redis.get(redisKey);
  const task = JSON.parse(redisTask);
  socket.emit(
    "build",
    helper.parseMsg("create Task", { message: "创建云构建任务成功" })
  );

  return new CloudBuildTask(
    {
      repo: task.repo,
      name: task.name,
      version: task.version,
      branch: task.branch,
      buildCmd: task.buildCmd,
      prod: task.prod,
    },
    ctx,
    app
  );
}
module.exports = { CloudBuildTask, createCloudBuildTask };
