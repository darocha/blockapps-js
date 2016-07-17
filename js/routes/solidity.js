var HTTPQuery = require("../HTTPQuery.js");
var Promise = require('bluebird');
var path = require("path");
var streamFile = require("./readfile.js");
var fs = require('fs');
var errors = require("../errors.js");

function prepPostData (dataObj) {
    var postDataObj = {};

    dataObjOpts = dataObj.options;
    for (opt in dataObjOpts) {
        postDataObj[opt] = dataObjOpts[opt];
    }
    delete dataObj.options;
    for (name in dataObj) {
        postDataNameArr = [];
        dataObjName = dataObj[name];
        for (fname in dataObjName) {
          postDataNameArr.push(streamFile(fname, dataObjName[fname]));
        }
        postDataObj[name] = postDataNameArr;
    }

    var result = {}
    result[Object.keys(dataObj).length ? "postData" : "post"] = postDataObj;
    return result;
}

function solcCommon(tag, code, dataObj) {
    try {
        if (!dataObj) {
            dataObj = {};
        }
        if (!("options" in dataObj)) {
            dataObj.options = {};
        }
        dataObj.options.src = code;
        var route = "/" + tag;
        var postData = prepPostData(dataObj);
    }
    catch(e) {
        errors.pushTag(tag)(e);
    }
    console.log(postData);

    return HTTPQuery(route, postData).tagExcepts(tag)
    .then(function(resp){
      console.log('HTTPQuery Response: =============',resp);
      if(resp.hasOwnProperty("missingImport")){
        if(!dataObj.hasOwnProperty("import")){
          dataObj.import = {};
        }
        dataObj.import[resp["missingImport"]] = undefined;
        postData = prepPostData(dataObj);
        return HTTPQuery(route, postData).tagExcepts(tag);
      }
      else {
        return resp;
      }
    });
}

// solc(code :: string, {
//   main : { <name> : (undefined | code :: string) ...},
//   import : { <name> : (undefined | code :: string) ...},
//   options : {
//     optimize, add-std, link: flags for "solc" executable
//     optimize-runs, libraries: options with arguments for "solc" executable
//   }
// }) = {
//   <contract name> : {
//     abi : <solidity contract abi>,
//     bin : <hex string>
//   } ...
// }

// extabi(code :: string, {
//   main : { <name> : (undefined | code :: string) ...},
//   import : { <name> : (undefined | code :: string) ...}
// }) = {
//   <contract name> : <solidity-abi response> ...
// }

module.exports = {
    solc: solcCommon.bind(null, "solc"),
    extabi: solcCommon.bind(null, "extabi")
};
