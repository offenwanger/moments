'use strict';
const express = require('express');

const app = express();

(console).log("************* Starting the server *************")

const port = 8000;

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/local/app.html');
});

// Everything in the local folder can be accessed via /filename
app.use('/', express.static(__dirname + '/local'));
app.use('/module', express.static(__dirname + '/node_modules'));

// Start the application
app.listen(port);
