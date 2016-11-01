var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();

var lib = require("../index.js");
var apiURL = "https://tester8.blockapps.net/strato-api"

lib.setProfile("ethereum-frontier", apiURL);
lib.handlers.enable = true;

describe("transaction list:", function() {
    describe("standalone list tests", function() {
        describe("standalone list tests", function() {
		describe("many sends", function() { 
			it("updates balances correctly", function() {		
			        true.should.equal(false);
			    });
              describe("nonce updates", function() { 
				it("orders nonces correctly before dispatch", function() { 
					true.should.equal(false);
				    });
				it("orders transaction list correctly in the block", function() { 
					true.should.equal(false);
				    });
				it("end nonce is incremented by the number of transactions", function() { 
					true.should.equal(false);
				    });
			    });

			it("supports two phase return", function() {
				true.should.equal(false);
			    });
		    });

		describe("contract upload", function () { 
			it("uploads the expected number of contract", function() { 
				true.should.equal(false);                               
			    });

            it("end nonce is as expected", function() { 
				true.should.equal(false);
			    });

			it("constructors work as expected", function() {
				true.should.equal(false);
			    });

			it("takes load", function() { 
				true.should.equal(false);
			    });

			it("handles two phase return", function() { 
				true.should.equal(false);
			    });
		    });

		describe("contract invocation", function () {
			it("uploads the expected number of contracts", function() { 
				true.should.equal(false);
			    });

                        it("function call returns as expected", function() { 
				true.should.equal(false);				
			    });

                        it("state variables change in order of transaction dispatch", function() { 
				true.should.equal(false);
			    });

                        it("end nonce is as expected", function() { 
				true.should.equal(false);
			    });

			it("constructors work as expected", function() {
				true.should.equal(false);
			    });

			it("takes load", function() { 
				true.should.equal(false);
			    });

			it("handles two phase return", function() { 
				true.should.equal(false);
			    });
		    });
	    });
	});

    describe("test parity with single transaction interface", function () { 
	    it("single send matches", function () { 
		    true.should.equal(false);
		});

	    it("contract upload matches", function () { 
		    true.should.equal(false);
		});
	    
	    it("contract invocation matches", function () {
		    true.should.equal(false);
		});

	    it("two phase promise return matches, upload & invoke", function () { 
		    true.should.equal(false);
		});
	    
	});

    describe("test parity with blockapps-js partial transaction batching", function () { 
	    it("multiple send matches", function () { 
		    true.should.equal(false);
		});

	    it("multiple contract upload matches", function () { 
		    true.should.equal(false);
		});
	    
	    it("multiple contract invocation matches", function () {
		    true.should.equal(false);
		});

	    it("multiple contract upload & invocation matches", function () {
		    true.should.equal(false);
		});

	    it("two phase promise return matches, multiple upload & invoke", function () { 
		    true.should.equal(false);
		});

	});
    });