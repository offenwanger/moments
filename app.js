'use strict';
const express = require('express');

const app = express();

(console).log("************* Starting the server *************")

const port = 8000;

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/local_index.html');
});

// Everything in the local folder can be accessed via /filename
app.use('/', express.static(__dirname + '/'));

// Start the application
app.listen(port);
