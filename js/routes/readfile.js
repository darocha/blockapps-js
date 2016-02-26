var fs = require("fs");
var errors = require("../errors.js");
module.exports = streamFile;

function streamFile(name, maybeContents) {
    if (!errors.isString(name)) {
        throw new Error("filename must be a string, not a " +
                        "'" + name.constructor.name + "'");
    }
    switch (typeof maybeContents) {
    case "undefined" :
        return fs.createReadStream(name);
    case "string":
        return {
            value: maybeContents,
            options: {
                filename: path.basename(name, ".sol")
            }
        }
    }
}
