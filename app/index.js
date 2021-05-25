const https = require('https');
const fs = require('fs');
const express = require('express');
const {MongoClient} = require('mongodb');
// Never hard-code your credentials, get them from config - in this case, the environment.
const uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASSWORD}@mongo-database/${process.env.DB_NAME}?retryWrites=true&writeConcern=majority`;

const app = express();
// Express by default exposes itself as your backend by sending the X-Powered-By header. Let's disable that, it's good security practice.
app.disable('x-powered-by');

var dbClient = null;
var server = null;

async function initDatabase() {	
    try {
		const client = new MongoClient(uri, {
		  useNewUrlParser: true,
		  useUnifiedTopology: true,
		});

		await client.connect();
		return client;
	} catch (error) {
		console.error(error);
		process.exit(1);
	}
}

async function getPerson(name) {
	console.log("Name: " + name);
	let database = dbClient.db(process.env.DB_NAME);
    let people = database.collection('people');
    let query = { firstName: {$regex : new RegExp(name, "i")} };
    return await people.findOne(query);		
}

function doShutdown() {
	server.close(() => {
		console.log('HTTP server stopped');
		dbClient.close(() => { 
			console.log('Database connection closed');
			console.log('Shutdown OK');
		});
	}); 	
}

process.on('SIGTERM', doShutdown);
process.on('SIGINT', doShutdown);

app.get('/', (req, res) => {	
	getPerson(req.query.name).then(
		(person) => res.send(person)
	);
});

initDatabase().then((client) => {
	console.log('Database initialized');
	dbClient = client;
	server = https.createServer({
		cert: fs.readFileSync('./certs/localhost.crt'),
		key: fs.readFileSync('./certs/localhost.key')
	}, app).listen(
		443, () => console.log('Server listening on https://localhost:443')
	);	
});