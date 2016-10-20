var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();

var lib = require("..");
lib.setProfile("strato-dev", "https://ryan-build.blockapps.net/strato-api");

function compileFile(filename, imports) {
  var srcSpec = {main: {}};
  srcSpec.main[filename] = undefined;
  if (imports) {
    srcSpec.imports = {};
    function addImport(file) {
      srcSpec.imports[file] = undefined;
    }

    if (imports.forEach) {
      imports.forEach(addImport);
    }
    else addImport(imports);

  }
  return lib.Solidity(srcSpec).get(filename);
}

describe("contract imports", function() {
  before("change to contracts directory", function() {
    process.chdir("test/contracts/imports");
  });
  after("return to base directory", function() {
    process.chdir("../../..");
  })
  it("should import all contracts via 'import \"filename\";'", function() {
    return compileFile("BasicMain.sol", "Imported.sol").should.eventually.have.all.keys("C", "D");
  });
  it("should qualify imported contracts via 'import \"filename\" as qualifier;'", function() {
    return compileFile("QualifiedBasicMain.sol", "Imported.sol").should.eventually.have.all.keys("C", "Imported.D");
  });
// Apparently this one isn't correct Solidity
//  it("should import all contracts via 'import * from \"filename\";'", function() {
//    return compileFile("BasicStarMain.sol", "Imported.sol").should.eventually.have.all.keys("C", "D");
//  });
  it("should qualify imported contracts via 'import * as qualifier from \"filename\";'", function() {
    return compileFile("QualifiedBasicStarMain.sol", "Imported.sol").should.eventually.have.all.keys("C", "Imported.D");
  });
  it("should import selected contracts via 'import {name} from \"filename\";'", function() {
    return compileFile("ES6Main.sol", "Imported.sol").should.eventually.have.all.keys("C", "D");
  });
  it("should rename selected imports via 'import {name as alias} from \"filename\";'", function() {
    return compileFile("ES6AliasMain.sol", "Imported.sol").should.eventually.have.all.keys("C", "E");
  });
  it("should automatically resolve missing imports", function() {
    return compileFile("BasicMain.sol").should.eventually.be.ok;
  });
  it("should automatically resolve transitive imports", function() { 
    return compileFile("TransitiveMain.sol").should.eventually.be.ok;
  });
  it("should correctly handle diamond imports", function() {
    return compileFile("DiamondMain.sol").should.eventually.have.all.keys("B", "C", "D", "E", "Imported.D");
  });
  it("should produce an error for import cycles", function() {
    return compileFile("CycleA.sol").should.eventually.not.be.ok;
  });
  it("should correctly inherit from an aliased imported contract", function() {
    return compileFile("ImportInheritance.sol").should.eventually.have.property("C").that.not.has.deep.property("xabi.vars.x");
  });
})
