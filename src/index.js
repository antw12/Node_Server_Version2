import 'babel-polyfill';
import 'source-map-support/register';
import fs from 'fs';
import express from 'express';
import bodyParser from 'body-parser';
import MongoClient from 'mongodb';
import assert from 'assert';
import log4js from 'log4js';

const app = express();
let dbobject;
const MAX_RETIRES = 3;

log4js.configure(); //configure the log4js log
log4js.loadAppender('file');
log4js.addAppender(log4js.appenders.file('logfile.log'));

const logger = log4js.getLogger(); // initialize the var to use.
const url = 'mongodb://localhost:27017/testnode'; // Connection URL

// Use connect method to connect to the Server
MongoClient.connect(url, (err, db) => {
	logger.debug('Connected to the database');
	dbobject = db;
	if (err) {
		logger.error(`Failed to connect to db: ${err.message}`);
		process.exit(1);
	}
	// listen to local host 127.0.0.1 8080
	app.listen(8080, () => logger.debug('listening to port 8080'));
	logger.debug('Server is now running');
});

app.use(bodyParser.urlencoded({ extended: false }));

/*
	This is where the post method will post the url parameters
	ready to post to a json to a mongo db
*/
app.post('/valuekey', (req, resp) => {
	const userinputValue = req.param('value');
	const userinputKey = req.param('key');
	logger.debug(userinputKey);
	logger.debug(userinputValue);
	const userInput = `value input is: ${userinputValue} key entry: ${userinputKey}`;
	if (typeof userinputValue === 'undefined' || typeof userinputKey === 'undefined') {
		logger.debug('Input was not defined');
		return resp.status(400).send('User is missing Key or Value');
	}

    // Max retries 
	let retries = MAX_RETIRES;

    // 
	const go = () => {
		return new Promise((resolve, reject) => {
			if (retries-- === 0) {
				return reject();
			}
			dbobject
				.collection('testnode')
				.updateOne(
					{ key: userinputKey },
					{ key: userinputKey, value: userinputValue },
					{ upsert: true }, // this option will allow you to insert if the key is not found
					(err, result) => {
						if (err) {
							go().then(resolve).catch(errTwo => reject(errTwo || err));
						} else {
							// return the result in the resolved to change the promise state to resolved
							// allowing the next promise to complete/ happen
							resolve(result);
						}
					}
				);
		});
	};

    // new Promise(resolve => resolve())   
	Promise
		.resolve() 
		.then(go)
		.then(result => {
			logger.debug(JSON.stringify(result));
			resp.end('Post call was successfull, values where posted to database' + '\n');
		})
		.catch(err => {
			console.log(JSON.stringify(err));
			resp.status(500).send('Post call was unsucessfull, values were not added');
		});
});

/* 
this like post above does a simlar job in the way it perceives values from the URL parameters 
the difference being that it cant get encoded data 
get will get the url as a string 
post will post the information ready to use in a database ect
*/
app.get('/valuekey', (req, resp) => {
    // check entry if there 
    // if not defined or not found deal with that
	var inputKey = req.param('key');
	if (typeof inputKey === 'undefined') {
		logger.error('The key value was not entered');
		return resp.status(400).send('The key value was not entered');
	}
	logger.debug(inputKey);
    //this function will be used to replace the custom find function using yield key word to allow cleaner code and not call back  
	try {
		const result = dbobject
			.collection('testnode')
			.find(
				{ key: inputKey },
				{ 'value': 1 }).toArray();
		logger.debug(JSON.stringify(result)); // output all records
		resp.end(`Get call was successfull retrieved a value from given key is: ${result[0].value}` + '\n');
	} catch (err) {
		console.log(err.message);
		resp.status(500).send('Get call was unsucessfull, values were not found');
	}
});
