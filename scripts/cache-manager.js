const app = require("electron").app || require("electron").remote.app;
const fs = require("fs");
const async_fs = fs.promises;
const RequestManager = require("./request-manager");

class CacheManager {
    static cachePath = app.getPath("userData")+"\\Cache\\images\\";

    static exists(fileName) {
        return fs.existsSync(this.cachePath+fileName);
    }

    static async add(fileName, icon64) {
        if (!fs.existsSync(this.cachePath)) fs.mkdirSync(this.cachePath, { recursive: true });
        async_fs.writeFile(this.cachePath+fileName, icon64, "base64");
    }

    static async get(fileName, requestString, credentials) {
        if (fs.existsSync(this.cachePath+fileName)) return fs.readFileSync(this.cachePath+fileName, "base64");
        else {
            RequestManager.init(credentials);
            return RequestManager.tryRequestImage(requestString).then(icon64 => {
                this.add(fileName, icon64);
                return icon64;
            });
        }
    }

    static clearCache() {
        fs.rmdirSync(this.cachePath, { recursive: true });
    }
}

module.exports = CacheManager;