var mysql = require('mysql');
var exports = module.exports = {};

var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  database : 'chat'
});

connection.connect();
console.log('Connected to chat...');

exports.handleRequest = function(request, response) {
  var blocker = false;
  var statusCode = 200;

  var getRoom = function(){
    var tempArr = request.url.split('/');
    var room;
    if (tempArr[1] === 'classes' && tempArr[2] === 'room') {
      room = tempArr[3];
    }
    return room;
  };


  var handlePostedMessage = function(JSONdata){
    var blocker = true;
    var data = JSON.parse(JSONdata);
    console.log('data', data);

    isUserInList(data, function(userInList){
      if(userInList){
        isRoomInlist(data, function(roomInList){
          if (roomInList) {
            insertNewMessage(data);
            response.writeHead(statusCode, headers);
            response.end(responseText);
          }
        });
      }
    });
  };

  var responseText = '';
  var room = getRoom();

  if(request.url.match(/\/classes\/messages\??.*/)){
    if(request.method === 'POST'){
      statusCode = 201;
      request.on('data', handlePostedMessage);
    } else {
      blocker = true;
      var result = getAllMessages(function(rows){
        if (rows.length > 0) {
          responseText = JSON.stringify({results: rows});
          response.writeHead(statusCode, headers);
          response.end(responseText);
        }
      });
      console.log('responseText', responseText);
      statusCode = 200;
    }
  } else if (room !== undefined) {
    if(request.method === 'POST') {
      statusCode = 201;
      request.on('data', handlePostedMessage);
    } else {
      // return messages by room;
    }
  } else {
    statusCode = 404;
  }


  var headers = exports.defaultCorsHeaders;
  headers['Content-Type'] = "text/plain";
  if(!blocker){
    response.writeHead(statusCode, headers);
    response.end(responseText);
  }
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

var getAllMessages = function(callback) {
  connection.query('SELECT u.name username, m.text text, m.created_at createdAt, r.name roomname from message m, user u, room r where m.user_id = u.id', function(err, rows) {
    if (err) {
      throw err;
    } else {
      console.log('get all messages success');
      callback(rows);
    }
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
