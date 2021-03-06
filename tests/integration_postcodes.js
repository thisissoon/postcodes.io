var path = require("path"),
		app = require(path.join(__dirname, "../server")),
		request = require("supertest"),
		assert = require("chai").assert,
		helper = require(__dirname + "/helper")
		async = require("async");

describe("Postcodes routes", function () {
	var testPostcode;

	before(function (done) {
		this.timeout(0);
		helper.connectToDb();
		helper.clearPostcodeDb(function (error, result) {
			if (error) throw error;
			helper.seedPostcodeDb(function (error, result) {
				if (error) throw error;
				done();
			});
		});
	});

	beforeEach(function (done) {
		helper.lookupRandomPostcode(function (result) {
			testPostcode = result.postcode;
			testOutcode = result.outcode;
			done();	
		});
	});

	after(function (done) {
		helper.clearPostcodeDb(done);
	});

	describe("GET /postcodes", function () {
		var uri, limit;

		it ("should return a list of matching postcode objects", function (done) {
			uri = encodeURI("/postcodes?q=" + testPostcode.replace(" ", "").slice(0, 2));
			request(app)
			.get(uri)
			.expect("Content-Type", /json/)
			.expect(helper.allowsCORS)
			.expect(200)
			.end(function (error, response) {
				if (error) throw error;
				assert.isArray(response.body.result);
				assert.equal(response.body.result.length, 10);
				response.body.result.forEach(function (postcode) {
					helper.isPostcodeObject(postcode);
				});
				done();
			});
		});
		it ("should be insensitive to case", function (done) {
			uri = encodeURI("/postcodes?q=" + testPostcode.slice(0, 2).toLowerCase());
			request(app)
			.get(uri)
			.expect("Content-Type", /json/)
			.expect(helper.allowsCORS)
			.expect(200)
			.end(function (error, response) {
				if (error) throw error;
				assert.isArray(response.body.result);
				assert.equal(response.body.result.length, 10);
				response.body.result.forEach(function (postcode) {
					helper.isPostcodeObject(postcode);
				});
				done();
			});
		});
		it ("should be insensitive to space", function (done) {
			uri = encodeURI("/postcodes?q=" + testPostcode.slice(0, 2).split("").join(" "));
			request(app)
			.get(uri)
			.expect("Content-Type", /json/)
			.expect(helper.allowsCORS)
			.expect(200)
			.end(function (error, response) {
				if (error) throw error;
				assert.isArray(response.body.result);
				assert.equal(response.body.result.length, 10);
				response.body.result.forEach(function (postcode) {
					helper.isPostcodeObject(postcode);
				});
				done();
			});
		});
		it ("should be sensitive to limit", function (done) {
			limit = 11;
			uri = encodeURI("/postcodes?q=" + testPostcode.slice(0, 2).split("").join(" ") + "&limit=" + limit);
			request(app)
			.get(uri)
			.expect("Content-Type", /json/)
			.expect(helper.allowsCORS)
			.expect(200)
			.end(function (error, response) {
				if (error) throw error;
				assert.isArray(response.body.result);
				assert.equal(response.body.result.length, 11);
				response.body.result.forEach(function (postcode) {
					helper.isPostcodeObject(postcode);
				});
				done();
			});
		});
		it ("should max out limit at 100", function (done) {
			limit = 101;
			uri = encodeURI("/postcodes?q=" + testPostcode.slice(0, 2).split("").join(" ") + "&limit=" + limit);
			request(app)
			.get(uri)
			.expect("Content-Type", /json/)
			.expect(helper.allowsCORS)
			.expect(200)
			.end(function (error, response) {
				if (error) throw error;
				assert.isArray(response.body.result);
				assert.equal(response.body.result.length, 100);
				response.body.result.forEach(function (postcode) {
					helper.isPostcodeObject(postcode);
				});
				done();
			});
		});
		it ("should set limit to 10 if invalid", function (done) {
			limit = "BOGUS";
			uri = encodeURI("/postcodes?q=" + testPostcode.slice(0, 2).split("").join(" ") + "&limit=" + limit);
			request(app)
			.get(uri)
			.expect("Content-Type", /json/)
			.expect(helper.allowsCORS)
			.expect(200)
			.end(function (error, response) {
				if (error) throw error;
				assert.isArray(response.body.result);
				assert.equal(response.body.result.length, 10);
				response.body.result.forEach(function (postcode) {
					helper.isPostcodeObject(postcode);
				});
				done();
			});
		});
		it ("should return 400 if no postcode submitted", function (done) {
			uri = encodeURI("/postcodes?q=");
			request(app)
			.get(uri)
			.expect("Content-Type", /json/)
			.expect(helper.allowsCORS)
			.expect(400)
			.end(function (error, response) {
				if (error) throw error;
				assert.equal(response.body.status, 400);
				done();
			});
		});
		it ("should respond to options", function (done) {
			request(app)
			.options("/postcodes")
			.expect(204)
			.end(function (error, response) {
				if (error) done(error);
				helper.validCorsOptions(response);
				done();
			});
		});
	});

	describe("Post /", function () {
		var bulkLength = 10,
				testPostcodes, testLocations;

		describe("Bulk geocoding", function () {
			beforeEach(function (done) {
				async.times(bulkLength, function (n, next) {
					helper.randomLocation(next);
				}, function (error, locations) {
					if (error) throw error;
					testLocations = locations;
					done();
				});				
			});

			it ("should return postcodes for specified geolocations", function (done) {
				request(app)
				.post("/postcodes")
				.send({geolocations: testLocations})
				.expect("Content-Type", /json/)
				.expect(helper.allowsCORS)
				.expect(200)
				.end(function (error, response) {
					if (error) throw error;
					assert.isArray(response.body.result);
					assert.equal(response.body.result.length, bulkLength);
					response.body.result.forEach(function (lookup) {
						assert.property(lookup, "query");
						assert.property(lookup, "result");
						assert.isArray(lookup.result);
						lookup.result.forEach(function (result) {
							helper.isPostcodeObject(result);
						});
					});
					done();
				});
			});
			it ("should return null if no nearby postcode", function (done) {
				request(app)
				.post("/postcodes")
				.send({geolocations: [{
					longitude: 0,
					latitude: 0
				}]})
				.expect("Content-Type", /json/)
				.expect(helper.allowsCORS)
				.expect(200)
				.end(function (error, response) {
					if (error) throw error;
					assert.equal(response.body.result.length, 1);
					assert.isNull(response.body.result[0].result);
					done();
				});
			});
			it ("should refuse request if lookups number over 100", function (done) {
				testLocations = [];
				for (var i = 0; i < 101; i++) {
					testLocations.push("bogus")
				}
				request(app)
				.post("/postcodes")
				.send({geolocations: testLocations})
				.expect("Content-Type", /json/)
				.expect(helper.allowsCORS)
				.expect(400)
				.end(function (error, response) {
					if (error) throw error;
					assert.match(response.body.error, /too many locations submitted/i);
					done();
				});
			});
			it ("should return 404 if invalid geolocations object", function (done) {
				request(app)
				.post("/postcodes")
				.send({geolocations: "Bogus"})
				.expect("Content-Type", /json/)
				.expect(helper.allowsCORS)
				.expect(400)
				.end(function (error, response) {
					if (error) throw error;
					assert.match(response.body.error, /Invalid data submitted/i);
					done();
				});
			});
			it ("should be sensitive to limit", function (done) {
				var testLocation = testLocations[0];
				testLocation.limit = 1;
				request(app)
				.post("/postcodes")
				.send({geolocations: [testLocation]})
				.expect("Content-Type", /json/)
				.expect(helper.allowsCORS)
				.expect(200)
				.end(function (error, response) {
					if (error) throw error;
					assert.equal(response.body.result.length, 1);
					assert.equal(response.body.result[0].result.length, 1);
					helper.isPostcodeObject(response.body.result[0].result[0]);
					done();
				});
			});
		});

		describe("Bulk postcode lookup", function () {
			beforeEach(function (done) {
				async.times(bulkLength, function (n, next) {
					helper.randomPostcode(next);
				}, function (error, postcodes) {
					if (error) throw error;
					testPostcodes = postcodes;
					done();
				});				
			});

			it ("should return addresses for postcodes", function (done) {
				request(app)
				.post("/postcodes")
				.send({postcodes: testPostcodes})
				.expect('Content-Type', /json/)
				.expect(200)
				.end(function (error, response) {
					if (error) throw error;
					assert.isArray(response.body.result);
					assert.equal(response.body.result.length, bulkLength);
					response.body.result.forEach(function (lookup) {
						assert.property(lookup, "query");
						assert.property(lookup, "result");
						helper.isPostcodeObject(lookup.result);
					});
					done();
				});
			});
			it ("should return an empty result for non string queries", function (done) {
				request(app)
				.post("/postcodes")
				.send({postcodes: [null]})
				.expect('Content-Type', /json/)
				.expect(200)
				.end(function (error, response) {
					if (error) throw error;
					assert.isArray(response.body.result);
					assert.equal(response.body.result.length, 1);
					assert.isNull(response.body.result[0].query);
					assert.isNull(response.body.result[0].result);
					done();
				});
			});
			it ("should return a null if postcode not found", function (done) {
				testPostcodes.push("B0GUS");
				request(app)
				.post("/postcodes")
				.send({postcodes: testPostcodes})
				.expect('Content-Type', /json/)
				.expect(200)
				.end(function (error, response) {
					if (error) throw error;
					assert.equal(response.body.result.length, bulkLength + 1);
					var hasNull = response.body.result.some(function (lookup) {
						return lookup.result === null;
					});
					assert.isTrue(hasNull);
					done();
				});
			});
			it ("should refuse requests if lookups number over 100", function (done) {
				testPostcodes = [];
				for (var i = 0; i < 101; i++) {
					testPostcodes.push("bogus");
				}
				request(app)
				.post("/postcodes")
				.send(testPostcodes)
				.expect('Content-Type', /json/)
				.expect(400)
				.end(function (error, response) {
					if (error) throw error;
					done();
				});
			});	
		});
		
		it ("should return a 400 error if array not submitted", function (done) {
			request(app)
			.post("/postcodes")
			.send({"wrong" : "dataType"})
			.expect('Content-Type', /json/)
			.expect(400)
			.end(function (error, response) {
				if (error) throw error;
				done();
			});
		});
	});

	describe("/:postcode", function () {
		it ("should return 200 if postcode found", function (done) {
			var path = ["/postcodes/", encodeURI(testPostcode)].join("");
			request(app)
			.get(path)
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (error, response) {
				if (error) throw error;
				assert.equal(response.body.status, 200);
				assert.equal(response.body.result.postcode, testPostcode);
				helper.isPostcodeObject(response.body.result);
				done();
			});
		});
		it ("should return 404 if not found", function (done) {
			testPostcode = "ID11QE";
			var path = ["/postcodes/", encodeURI(testPostcode)].join("");
			request(app)
			.get(path)
			.expect('Content-Type', /json/)
			.expect(404)
			.end(function (error, response) {
				if (error) throw error;
				assert.equal(response.body.status, 404);
				assert.property(response.body, "error");
				done();
			});
		});
		it ("should respond to options", function (done) {
			var path = ["/postcodes/", encodeURI(testPostcode)].join("");
			request(app)
			.options(path)
			.expect(204)
			.end(function (error, response) {
				if (error) done(error);
				helper.validCorsOptions(response);
				done();
			});
		});
	});

	describe("/outcodes/:outcode", function (done) {
		it ("should return correct geolocation data for a given outcode", function (done) {
			var path = ["/outcodes/", encodeURI(testOutcode)].join("");
			request(app)
			.get(path)
			.expect("Content-Type", /json/)
			.expect(helper.allowsCORS)
			.expect(200)
			.end(function (error, response) {
				if (error) throw error;
				assert.equal(response.body.status, 200);
				assert.equal(response.body.result.outcode, testOutcode);
				assert.property(response.body.result, "longitude");
				assert.property(response.body.result, "latitude");
				assert.property(response.body.result, "northings");
				assert.property(response.body.result, "eastings");
				done();
			});
		});
		it ("should be case insensitive", function (done) {
			var path = ["/outcodes/", encodeURI(testOutcode.toLowerCase())].join("");
			request(app)
			.get(path)
			.expect("Content-Type", /json/)
			.expect(helper.allowsCORS)
			.expect(200)
			.end(function (error, response) {
				if (error) throw error;
				assert.equal(response.body.status, 200);
				assert.equal(response.body.result.outcode, testOutcode);
				assert.property(response.body.result, "longitude");
				assert.property(response.body.result, "latitude");
				assert.property(response.body.result, "northings");
				assert.property(response.body.result, "eastings");
				done();
			});
		});
		it ("should be space insensitive", function (done) {
			var path = ["/outcodes/", encodeURI(testOutcode+"   ")].join("");
			request(app)
			.get(path)
			.expect("Content-Type", /json/)
			.expect(helper.allowsCORS)
			.expect(200)
			.end(function (error, response) {
				if (error) throw error;
				assert.equal(response.body.status, 200);
				assert.equal(response.body.result.outcode, testOutcode);
				assert.property(response.body.result, "longitude");
				assert.property(response.body.result, "latitude");
				assert.property(response.body.result, "northings");
				assert.property(response.body.result, "eastings");
				done();
			});
		});
		it ("should return 404 for an outcode which does not exist", function (done) {
			var path = ["/outcodes/", encodeURI("DEFINITELYBOGUS")].join("");
			request(app)
			.get(path)
			.expect("Content-Type", /json/)
			.expect(helper.allowsCORS)
			.expect(404)
			.end(function (error, response) {
				if (error) throw error;
				assert.equal(response.body.status, 404);
				assert.isNull(response.body.result);
				done();
			});
		});
		it ("should respond to options", function (done) {
			var path = ["/outcodes/", encodeURI(testOutcode)].join("");
			request(app)
			.options(path)
			.expect(204)
			.end(function (error, response) {
				if (error) done(error);
				helper.validCorsOptions(response);
				done();
			});
		});
	});

	describe("/:postcode/validate", function () {
		it ("should return true if postcode found", function (done) {
			var path = ["/postcodes/", encodeURI(testPostcode), "/validate"].join("");
			request(app)
			.get(path)
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (error, response) {
				if (error) throw error;
				assert.equal(response.body.status, 200);
				assert.isTrue(response.body.result);
				done();
			});
		});
		it ("should return false if postcode not found", function (done) {
			testPostcode = "ID11QE";
			var path = ["/postcodes/", encodeURI(testPostcode), "/validate"].join("");
			request(app)
			.get(path)
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (error, response) {
				if (error) throw error;
				assert.equal(response.body.status, 200);
				assert.isFalse(response.body.result);
				done();
			});
		});
		it ("should respond to options", function (done) {
			var path = ["/postcodes/", encodeURI(testPostcode), "/validate"].join("");
			request(app)
			.options(path)
			.expect(204)
			.end(function (error, response) {
				if (error) done(error);
				helper.validCorsOptions(response);
				done();
			});
		});
	});

	describe("/random/postcode", function () {
		it ("should return a random postcode", function (done) {
			var path = "/random/postcodes";
			request(app)
			.get(path)
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (error, response) {
				if (error) throw error;
				assert.property(response.body.result, "postcode");
				helper.isPostcodeObject(response.body.result);
				done();
			});
		});
		it ("should respond to options", function (done) {
			var path = "/random/postcodes";
			request(app)
			.options(path)
			.expect(204)
			.end(function (error, response) {
				if (error) done(error);
				helper.validCorsOptions(response);
				done();
			});
		});
	});

	describe("/:postcode/autocomplete", function () {
		var uri, limit;

		it ("should return a list of matching postcodes only", function (done) {
			uri = encodeURI("/postcodes/" + testPostcode.slice(0, 2) + "/autocomplete");

			request(app)
			.get(uri)
			.expect("Content-Type", /json/)
			.expect(helper.allowsCORS)
			.expect(200)
			.end(function (error, response) {
				if (error) throw error;
				assert.isArray(response.body.result);
				assert.equal(response.body.result.length, 10);
				response.body.result.forEach(function (postcode) {
					assert.isString(postcode);
				});
				done();
			});
		});
		it ("should be insensitive to case", function (done) {
			uri = encodeURI("/postcodes/" + testPostcode.slice(0, 2).toLowerCase() + "/autocomplete");

			request(app)
			.get(uri)
			.expect("Content-Type", /json/)
			.expect(helper.allowsCORS)
			.expect(200)
			.end(function (error, response) {
				if (error) throw error;
				assert.isArray(response.body.result);
				assert.equal(response.body.result.length, 10);
				response.body.result.forEach(function (postcode) {
					assert.isString(postcode);
				});
				done();
			});
		});
		it ("should be insensitive to space", function (done) {
			uri = encodeURI("/postcodes/" + testPostcode.slice(0, 2).split("").join(" ") + "/autocomplete");

			request(app)
			.get(uri)
			.expect("Content-Type", /json/)
			.expect(helper.allowsCORS)
			.expect(200)
			.end(function (error, response) {
				if (error) throw error;
				assert.isArray(response.body.result);
				assert.equal(response.body.result.length, 10);
				response.body.result.forEach(function (postcode) {
					assert.isString(postcode);
				});
				done();
			});
		});
		it("should be sensitive to limit", function (done) {
			limit = 11;
			uri = encodeURI("/postcodes/" + testPostcode.slice(0, 2).split("").join(" ") + "/autocomplete" + "?limit=" + limit);

			request(app)
			.get(uri)
			.expect("Content-Type", /json/)
			.expect(helper.allowsCORS)
			.expect(200)
			.end(function (error, response) {
				if (error) throw error;
				assert.isArray(response.body.result);
				assert.equal(response.body.result.length, limit);
				response.body.result.forEach(function (postcode) {
					assert.isString(postcode);
				});
				done();
			});
		});
		it("should max limit out at 100", function (done) {
			limit = 101;
			uri = encodeURI("/postcodes/" + testPostcode.slice(0, 2).split("").join(" ") + "/autocomplete" + "?limit=" + limit);

			request(app)
			.get(uri)
			.expect("Content-Type", /json/)
			.expect(helper.allowsCORS)
			.expect(200)
			.end(function (error, response) {
				if (error) throw error;
				assert.isArray(response.body.result);
				assert.equal(response.body.result.length, 100);
				response.body.result.forEach(function (postcode) {
					assert.isString(postcode);
				});
				done();
			});
		});
		it("should set limit to 10 if invalid", function (done) {
			limit = "BOGUS";
			uri = encodeURI("/postcodes/" + testPostcode.slice(0, 2).split("").join(" ") + "/autocomplete" + "?limit=" + limit);

			request(app)
			.get(uri)
			.expect("Content-Type", /json/)
			.expect(helper.allowsCORS)
			.expect(200)
			.end(function (error, response) {
				if (error) throw error;
				assert.isArray(response.body.result);
				assert.equal(response.body.result.length, 10);
				response.body.result.forEach(function (postcode) {
					assert.isString(postcode);
				});
				done();
			});
		});
		it ("should respond to options", function (done) {
			uri = encodeURI("/postcodes/" + testPostcode.slice(0, 2) + "/autocomplete");
			request(app)
			.options(uri)
			.expect(204)
			.end(function (error, response) {
				if (error) done(error);
				helper.validCorsOptions(response);
				done();
			});
		});
	});

	describe("#/lon/:longitude/lat/latitude", function () {
		var loc;

		beforeEach(function (done) {
			helper.locationWithNearbyPostcodes(function (error, postcode) {
				if (error) return done(error);
				loc = postcode;
				done();
			});
		});

		it ("should return a list of nearby postcodes", function (done) {
			// loc = helper.locationWithNearbyPostcodes;
			// console.log(loc);
			var uri = encodeURI("/postcodes/lon/" + loc.longitude + "/lat/" + loc.latitude);

			request(app)
			.get(uri)
			.expect("Content-Type", /json/)
			.expect(helper.allowsCORS)
			.expect(200)
			.end(function (error, response) {
				if (error) throw error;
				assert.isArray(response.body.result);
				assert.isTrue(response.body.result.length > 0);
				response.body.result.forEach(function (postcode) {
					helper.isPostcodeObject(postcode);
				});
				assert.isTrue(response.body.result.some(function (elem) {
					return elem.postcode === loc.postcode;
				}));
				done();
			});
		});
		it ("should be sensitive to distance query", function (done) {
			var uri = encodeURI("/postcodes/lon/" + loc.longitude + "/lat/" + loc.latitude);

			request(app)
			.get(uri)
			.expect(200)
			.end(function (error, firstResponse) {
				if (error) throw error;
				request(app)
				.get(uri + encodeURI("?radius=2000"))
				.expect(200)
				.end(function (error, secondResponse) {
					if (error) throw error;
					assert.isTrue(secondResponse.body.result.length >= firstResponse.body.result.length);
					done();
				});
			});
		});
		it ("should be sensitive to limit query", function (done) {
			var uri = encodeURI("/postcodes/lon/" + loc.longitude + "/lat/" + loc.latitude + "?limit=1");
			request(app)
			.get(uri)
			.expect(200)
			.end(function (error, response) {
				if (error) throw error;
				assert.equal(response.body.result.length, 1);
				done();
			});
		});
		it ("should throw a 400 error if invalid longitude", function (done) {
			var uri = encodeURI("/postcodes/lon/" + "BOGUS" + "/lat/" + loc.latitude + "?limit=1");
			request(app)
			.get(uri)
			.expect(400)
			.end(function (error, response) {
				if (error) throw error;
				done();
			});
		});
		it ("should throw a 400 error if invalid latitude", function (done) {
			var uri = encodeURI("/postcodes/lon/" + loc.longitude + "/lat/" + "BOGUS");
			request(app)
			.get(uri)
			.expect(400)
			.end(function (error, response) {
				if (error) throw error;
				done();
			});
		});
		it ("should throw a 400 error if invalid limit", function (done) {
			var uri = encodeURI("/postcodes/lon/" + loc.longitude + "/lat/" + loc.latitude + "?limit=bogus");
			request(app)
			.get(uri)
			.expect(400)
			.end(function (error, response) {
				if (error) throw error;
				done();
			});
		});
		it ("should throw a 400 error if invalid distance", function (done) {
			var uri = encodeURI("/postcodes/lon/" + loc.longitude + "/lat/" + loc.latitude + "?radius=bogus");
			request(app)
			.get(uri)
			.expect(400)
			.end(function (error, response) {
				if (error) throw error;
				done();
			});
		});
		it ("should respond to options", function (done) {
			var uri = encodeURI("/postcodes/lon/" + loc.longitude + "/lat/" + loc.latitude);
			request(app)
			.options(uri)
			.expect(204)
			.end(function (error, response) {
				if (error) done(error);
				helper.validCorsOptions(response);
				done();
			});
		});
	});
});