var path = require("path"),
		bsyslog = require("bunyan-syslog"),
		rootPath = path.join(__dirname, '../');

var config = {

	/*
	* Development Environment (Default) Configuration Object ($ node server.js)
	* 
	* This is the default environment. i.e. it's the environment config when the
	* server is booted up with `$ node server.js`
	*
	* The only action you need to take here is to add your Postgres credentials.
	* You also need to create the database yourself and pass in the database name.
	* Note that the specified user needs to be a superuser for the import process
	* (`$ importons`). You may reduce user privileges after you've imported 
	* postcode data
	*
	*/ 

	development : {
		env : "development",
		root: rootPath,
		postgres: {
			user: "postgres",
			password: "",
			database: "postcodeio",	// Database name
			host: "localhost",
			port: 5432
		},
		log : {
			name : "postcodes.io",
			streams: [{
				path : path.join(rootPath, "/logs/development.log")	
			}, {
				stream: process.stdout
			}]
		}
	},

	/*
	* Test Environment (Optional, if you want to npm test)
	* 
	* Do not use the same Postgres credentials for the test database as your production
	* or development environments as this environment needs to reset the postcode table
	*
	*/ 

	test: {
		env : "test",
		root: rootPath,
		postgres: {
			user: "postgres",
			password: "",
			database: "postcodeio_test",
			host: "localhost",
			port: 5432
		},
		log: {
			name : "postcodes.io",
			streams: [{
				path : path.join(rootPath, "/logs/test.log")	
			}]
		}
	},

	docker : {
		env : "docker",
		root: rootPath,
		postgres: {
			user: process.env.POSTGRES_ENV_POSTGRESQL_USER || "docker",
			password: process.env.POSTGRES_ENV_POSTGRESQL_PASS || "docker",
			database: process.env.POSTGRES_ENV_POSTGRESQL_DB || "postcodeio",	// Database name
			host: process.env.POSTGRES_PORT_5432_TCP_ADDR || "localhost",
			port: process.env.POSTGRES_PORT_5432_TCP_PORT || 5432
		},
		log : {
			name : "postcodes.io",
			streams: [{
				path : path.join(rootPath, "/logs/production.log")	
			}]
		}
	},
	/*
	* Production Environment Configuration Object
	* 
	* This is the production environment. `$ NODE_ENV=production node server.js`
	*
	*/ 

	production : {
		env : "production",
		root: rootPath,
		postgres: {
			user: "docker",
			password: "docker",
			database: "postcodesio",
			host: "localhost",
			port: 5432
		},
		log : {
			name : "postcodes.io",
			streams: [{
				path : path.join(rootPath, "/logs/production.log")	
			}]
		}
	}
};

module.exports = function (environment) {
	return config[environment];
};
