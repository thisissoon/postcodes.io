var logger = require("commonlog-bunyan"),
		async = require("async"),
		S = require("string"),
		Postcode = require("../models/postcode");

exports.show = function (request, response, next) {
	var postcode = request.params.postcode;

	Postcode.find(postcode, function (error, address) {
		if (error) {
			return next(error);
		}
		if (address) {
			response.jsonApiResponse = {
				status: 200,
				result: Postcode.toJson(address)
			};
			return next();		
		} else {
			response.jsonApiResponse = {
				status: 404,
				error: "Postcode not found"
			};
			return next();
		}
	});
	
}

exports.valid = function (request, response, next) {
	var postcode = request.params.postcode;
	
	Postcode.find(postcode, function (error, address) {
		if (error) {
			return next(error);
		}

		if (address) {
			response.jsonApiResponse = {
				status: 200,
				result: true
			};		
			return next();
		} else {
			response.jsonApiResponse = {
				status: 200,
				result: false
			};
			return next();		
		}
	});	
}

exports.random = function (request, response, next) {
	Postcode.random(function (error, address) {
		if (error) {
			return next(error);
		}

		response.jsonApiResponse = {
			status: 200,
			result: Postcode.toJson(address)
		};
		return next();
	});
}

exports.bulk = function (request, response, next) {
	if (request.body.postcodes) {
		return bulkLookupPostcodes(request, response, next);
	} else if (request.body.geolocations) {
		return bulkGeocode(request, response, next);
	} else {
		response.jsonApiResponse = {
			status: 400,
			error: "Invalid JSON submitted. You need to submit a JSON object with an array of postcodes or geolocation objects"
		};
		return next();
	}
}

function bulkGeocode (request, response, next) {
	var geolocations = request.body.geolocations;

	if (!Array.isArray(geolocations)) {
		response.jsonApiResponse = {
			status: 400,
			error: "Invalid data submitted. You need to provide a JSON array"
		};
		return next();
	}

	if (geolocations.length > 100) {
		response.jsonApiResponse = {
			status: 400,
			error: "Too many locations submitted. Up to 100 locations can be bulk requested at a time"
		};
		return next();
	}

	var result = [],
			execution = [];

	geolocations.forEach(function (location) {
		execution.push(function (callback) {
			var params = location;

			Postcode.nearestPostcodes(params, function (error, postcodes) {
				if (error || !postcodes) {
					result.push({
						query: location,
						result: null
					});
				} else {
					result.push({
						query: location,
						result: postcodes.map(function (postcode) {
							return Postcode.toJson(postcode)
						})
					});
				}
				callback();
			});

		});
	});

	var onComplete = function () {
		response.jsonApiResponse = {
			status: 200,
			result: result
		};
		return next();
	}

	async.parallel(execution, onComplete);
}

function bulkLookupPostcodes (request, response, next) {
	var postcodes = request.body.postcodes;

	if (!Array.isArray(postcodes)) {
		response.jsonApiResponse = {
			status: 400,
			error: "Invalid data submitted. You need to provide a JSON array"
		};
		return next();
	}

	if (postcodes.length > 100) {
		response.jsonApiResponse = {
			status: 400,
			error: "Too many postcodes submitted. Up to 100 postcodes can be bulk requested at a time"
		};
		return next();
	}

	var result = [],
			execution = [];

	postcodes.forEach(function (postcode) {
		execution.push(function (callback) {
			Postcode.find(postcode, function (error, postcodeInfo) {
				if (error || !postcodeInfo) {
					result.push({
						query: postcode,
						result: null
					});
				} else {
					result.push({
						query: postcode,
						result: Postcode.toJson(postcodeInfo)
					});
				}
				callback();
			});
		});
	});

	async.parallel(execution, function () {
		response.jsonApiResponse = {
			status: 200,
			result: result
		};
		return next();
	});
}

exports.query = function (request, response, next) {
	var searchTerm = request.query.q || request.query.query,
			limit = request.query.limit;

	if (S(searchTerm).isEmpty()) {
		response.jsonApiResponse = {
			status: 400,
			error: "No postcode query submitted. Remember to include query parameter"
		};
		return next();
	}

	Postcode.search(searchTerm, {limit: limit}, function (error, results) {
		if (error) return next(error);
		if (!results) {
			response.jsonApiResponse = {
				status: 200,
				result: null
			};
			return next();
		} else {
			response.jsonApiResponse = {
				status: 200,
				result: results.map(function (elem) {
					return Postcode.toJson(elem);
				})
			};
			return next();
		}
	});
}

exports.autocomplete = function (request, response, next) {
	var searchTerm = request.params.postcode,
			limit = request.query.limit;

	Postcode.search(searchTerm, {limit: limit}, function (error, results) {
		if (error) return next(error);
		if (!results) {
			response.jsonApiResponse = {
				status: 200,
				result: null
			};
			return next();
		} else {
			response.jsonApiResponse = {
				status: 200,
				result: results.map(function (elem) {
					return elem.postcode;
				})
			};
			return next();
		}
	});
}

exports.lonlat = function (request, response, next) {
	var longitude = parseFloat(request.params.longitude),
			latitude = parseFloat(request.params.latitude),
			limit, radius, params = {};

	if (isNaN(longitude) || isNaN(latitude)) {
		response.jsonApiResponse = {
			status: 400,
			error: "Invalid longitude/latitude submitted"
		};
		return next();
	} else {
		params.longitude = longitude;
		params.latitude = latitude;
	}

	
	if (request.query.limit) {
		limit = parseInt(request.query.limit, 10);
		if (isNaN(limit)) {
			response.jsonApiResponse = {
				status: 400,
				error: "Invalid result limit submitted"
			};
			return next();
		} else {
			params.limit = limit;
		}
	}

	if (request.query.radius) {
		radius = parseFloat(request.query.radius);
		if (isNaN(radius)) {
			response.jsonApiResponse = {
				status: 400,
				error: "Invalid lookups radius submitted"
			};
			return next();
		} else {
			params.radius = radius;
		}
	}

	Postcode.nearestPostcodes(params, function (error, results) {
		if (error) return next(error);
		if (!results) {
			response.jsonApiResponse = {
				status: 200,
				result: null
			};
			return next();
		} else {
			response.jsonApiResponse = {
				status: 200,
				result: results.map(function (postcode) {
					return Postcode.toJson(postcode);
				})
			};
			return next();
		}
	});
}

exports.showOutcode = function (request, response, next) {
	var outcode = request.params.outcode;

	Postcode.findOutcode(outcode, function (error, result) {
		if (error) return next(error);
		if (!result) {
			response.jsonApiResponse = {
				status: 404,
				result: null
			};
			return next();
		} else {
			response.jsonApiResponse = {
				status: 200,
				result: result
			};
			return next();
		}
	});
}

