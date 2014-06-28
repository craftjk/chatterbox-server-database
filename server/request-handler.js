var mysql = require('mysql');

var exports = module.exports = {};
var lastId = 0;
var fs = require('fs');
var storage = fs.readFileSync('./storage.json');
storage = JSON.parse(storage);
if(!Array.isArray(storage)){
  storage = [];
}

var storageByRoom = fs.readFileSync('./storageByRoom.json');
storageByRoom = JSON.parse(storageByRoom);
if(!storageByRoom instanceof Object){
  storageByRoom = {};
}

var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  database : 'chat'
});

connection.connect();
console.log('Connected to chat...');

exports.handleRequest = function(request, response) {
  /* the 'request' argument comes from nodes http module. It includes info about the
  request - such as what URL the browser is requesting. */

  /* Documentation for both request and response can be found at
   * http://nodemanual.org/0.8.14/nodejs_ref_guide/http.html */
  var getRoom = function(){
    var tempArr = request.url.split('/');
    var room = undefined;
    if (tempArr[1] === 'classes' && tempArr[2] === 'room') {
      room = tempArr[3];
    }
    return room;
  };


  var handlePostedMessage = function(JSONdata){
    var data = JSON.parse(JSONdata);
    console.log('data', data);

    isUserInList(data, function(userInList){
      if(userInList){
        isRoomInlist(data, function(roomInList){
          if (roomInList) {
            insertNewMessage(data);
          }
        });
      }
    });

  };

  var responseText = '';
  var room = getRoom();

  // console.log("Serving request type " + request.method + " for url " + request.url);

  // var statusCode = 200;

  if(request.url.match(/\/classes\/messages\??.*/)){
    if(request.method === 'POST'){
      statusCode = 201;
      request.on('data', handlePostedMessage);
    } else {
      responseText = JSON.stringify({results:storage});
      statusCode = 200;
    }
  } else if (room !== undefined) {
    if(request.method === 'POST') {
      statusCode = 201;
      request.on('data', handlePostedMessage);
    } else {
      if (storageByRoom[room] === undefined) {
        storageByRoom[room] =[];
      }
      responseText = JSON.stringify({results:storageByRoom[room]});
      statusCode = 200;
    }
  } else {
    statusCode = 404;
  }


  /* Without this line, this server wouldn't work. See the note
   * below about CORS. */
  var headers = exports.defaultCorsHeaders;

  headers['Content-Type'] = "text/plain";

  /* .writeHead() tells our server what HTTP status code to send back */
  // console.log('status code: ' + statusCode);
  response.writeHead(statusCode, headers);

  /* Make sure to always call response.end() - Node will not send
   * anything back to the client until you do. The string you pass to
   * response.end() will be the body of the response - i.e. what shows
   * up in the browser.*/

  response.end(responseText);
};

var isUserInList = function(data, callback) {
  connection.query('SELECT * FROM user WHERE name =?', [data.username], function(err, rows){
    if (err) throw err;
    if (rows.length > 0) {
      callback(true);
    } else {
      insertUsernameIntoDB(data, callback);
    }
  });
};

var insertUsernameIntoDB = function(data, callback) {
  connection.query('INSERT INTO user (name) VALUES (?)', [data.username], function(err, rows) {
    if (err) {
      callback(false);
    } else {
      callback(true);
    }
  });
};

var isRoomInlist = function(data, callback) {
  connection.query('SELECT * FROM room WHERE name =?', [data.roomname], function(err, rows){
    if (err) throw err;
    if (rows.length > 0) {
      callback(true);
    } else {
      insertRoomIntoDB(data, callback);
    }
  });
};

var insertRoomIntoDB = function(data, callback) {
  connection.query('INSERT INTO room (name) VALUES (?)', [data.roomname], function(err, result) {
    if (err) {
      throw err;
      callback(false);
    } else {
      callback(true);
    }
  });
};

var insertNewMessage = function(data) {
  connection.query('INSERT INTO message (text, user_id, room_id)' +
                   'VALUES (?, (SELECT id FROM user WHERE name = ?), (SELECT id FROM room WHERE name = ?))',
                   [data.text, data.username, data.roomname], function(err, result) {
                     if (err) throw err;
                   });
};



/* These headers will allow Cross-Origin Resource Sharing (CORS).
 * This CRUCIAL code allows this server to talk to websites that
 * are on different domains. (Your chat client is running from a url
 * like file://your/chat/client/index.html, which is considered a
 * different domain.) */
exports.defaultCorsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
  "access-control-allow-headers": "content-type, accept",
  "access-control-max-age": 10 // Seconds.
};
