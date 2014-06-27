// YOUR CODE HERE:
var app = {

  // server: 'http://gregtrowbridgechatclienttest.azurewebsites.net/classes/messages',
  server: 'http://localhost:1337/classes/messages',

  roomnames: {},
  usernames: {},
  friends: {},
  lastObjKey: '',
  messages: [],
  currentRoomname: 'room1'
};

app.init = function() {
  var getString = window.location.search.replace('?', '');
  var getList = getString.split('&');
  var getObject = {};
  for (var i = 0; i < getList.length; i++) {
    var duple = getList[i].split('=');
    var key = duple[0];
    var value = duple[1];
    getObject[key] = value;
  }
  this.username = getObject.username;
  this.roomname = getObject.roomname;
};

app.send = function(message) {
  $.ajax({
    url: this.server,
    type: 'POST',
    data: JSON.stringify(message),
    contentType: 'application/json',
    success: function (data) {
      console.log('chatterbox: Message sent');
    },
    error: function (data) {
      console.error('chatterbox: Failed to send message');
    }
  });
};

//Clears messages from the dom
app.clearMessages = function () {
  $('#chats').empty();
};

app._parseMessages = function(data) {
  app.clearMessages();
  var incomingMessages = data.results;

  for (var i = 0; i < incomingMessages.length; i++){
    var message = incomingMessages[i];
    app.messages.push(message);
    app.addMessage(message);
  }
};

app.fetch = function() {
  $.ajax({
    url: this.server,
    type: 'GET',
    contentType: 'application/json',
    dataType: 'JSON',
    data: {
      order: '-createdAt'
    },
    success: this._parseMessages,
    error: function(data) {
      console.log('err');
    }
  });
};


app._sanitizeMessage = function(message) {
  message.username = this._sanitizeString(message.username);
  message.roomname = this._sanitizeString(message.roomname);
  message.text = this._sanitizeString(message.text);
};

app._sanitizeString = function(s) {
  if (typeof s === 'string') {
    s = s.replace(/&/g, '&amp');
    s = s.replace(/</g, '&lt');
    s = s.replace(/>/g, '&gt');
    s = s.replace(/"/g, '&quot');
    s = s.replace(/'/g, '&#x27');
    s = s.replace(/\//g, '&#x2F');
  } else {
    s = 'undefined';
  }
  return s;
};

app.addMessage = function(message) {
  //sanitize message
  this._sanitizeMessage(message);

  //add message to html
  var $chats = $('#chats');
  var t = _.template('<div class="chats"><span><%= message.username %>: </span><span><%= message.text %></span></div>');
  message['$el'] = $(t({message: message}));
  $chats.prepend(message['$el']);
  if (app.currentRoomname === undefined || message.roomname === app.currentRoomname) {
    message['$el'].show();
  } else {
    message['$el'].hide();
  }
  this.addRoom(message.roomname);
  this.addUser(message.username);
};

app.addRoom = function(roomname) {
  if (!this.roomnames.hasOwnProperty(roomname)) {
    var $roomSelect = $('#roomSelect');
    var t = _.template('<li><%= roomname %></li>');
    $roomSelect.append(t({roomname: roomname}));
    this.roomnames[roomname] = true;
    var app = this;
    $roomSelect.find('li').last().on('click', function(e) {
      app._filterByRoom($(this).text());
    });
  }
};

app._filterByRoom = function(roomname) {
  console.dir(roomname);
  app.currentRoomname = roomname;
  for (var i = 0; i < app.messages.length; i++) {
    var message = app.messages[i];
    if (message.roomname === roomname) {
      message['$el'].show();
    } else {
      message['$el'].hide();
    }
    $('.roomname').text(app.currentRoomname);
  }
};

app.addUser = function(username) {
  if (!this.usernames.hasOwnProperty(username)) {
    var $users = $('#users');
    var t = _.template('<li class="username"><%= username %></li>');
    $users.append(t({username: username}));
    this.usernames[username] = true;
    var $user = $users.children().last();
    var boundAddFriend = this.addFriend.bind(this);
    $user.on('click', function() {
      boundAddFriend(username);
    });
  }
};

app.addFriend = function(username) {
  if (!this.friends[username]) {
    this.friends[username] = true;
    console.log('added a friend: ' + username);
    for (var i = 0; i < app.messages.length; i++) {
      var message = app.messages[i];
      if (this.friends.hasOwnProperty(message.username)) {
        message['$el'].css('font-weight', 'bold');
      } else {
        message['$el'].css('font-weight', 'normal');
      }
    }
  }
};

app.handleSubmit = function() {
  var $text = $('#message');
  var message = {
    username: this.username,
    text: $text.val(),
    roomname: app.currentRoomname
  };
  this.send(message);
  $text.val('');
};

$(document).ready(function() {
  app.init();
  $('#send .submit').on('submit', function(e) {
    e.preventDefault();
    app.handleSubmit();
  });
  app.intervalID = setInterval(app.fetch.bind(app), 1000);
});
