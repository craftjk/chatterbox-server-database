/* You should implement your request handler function in this file.
 * And hey! This is already getting passed to http.createServer()
 * in basic-server.js. But it won't work as is.
 * You'll have to figure out a way to export this function from
 * this file and include it in basic-server.js so that it actually works.
 * *Hint* Check out the node module documentation at http://nodejs.org/api/modules.html. */
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
  var handlePostedMessage = function(data){
    var message = JSON.parse(data);

    message.createdAt = new Date();
    message.objectId = lastId;
    lastId++;
    var room = JSON.stringify(message.roomname);
    if(!storageByRoom.hasOwnProperty(room)){
      storageByRoom[room] = [];
    }
    var roomOverride = getRoom();
    if(roomOverride !== undefined){
      room = roomOverride;
      message.roomname = room;
    }
    storageByRoom[room].push(message);
    storage.push(message);

    //Save storage and storageByRoom to text file
    fs.writeFile("./storage.json", JSON.stringify(storage));
    fs.writeFile("./storageByRoom.json", JSON.stringify(storageByRoom));

  };

  var responseText = '';
  var room = getRoom();

  console.log("Serving request type " + request.method + " for url " + request.url);

  var statusCode = 200;

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
  console.log('status code: ' + statusCode);
  response.writeHead(statusCode, headers);

  /* Make sure to always call response.end() - Node will not send
   * anything back to the client until you do. The string you pass to
   * response.end() will be the body of the response - i.e. what shows
   * up in the browser.*/

  response.end(responseText);
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
