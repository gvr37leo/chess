(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
var Utils = require('./utils');
var AABB = (function () {
    function AABB(pos, size) {
        this.pos = pos;
        this.size = size;
    }
    AABB.fromVectors = function (a) {
        var small = a[0];
        var big = a[a.length - 1];
        for (var _i = 0, a_1 = a; _i < a_1.length; _i++) {
            var v = a_1[_i];
            if (v.x < small.x)
                small.x = v.x;
            else if (v.x > big.x)
                big.x = v.x;
            if (v.y < small.y)
                small.y = v.y;
            else if (v.y > big.y)
                big.y = v.y;
        }
        return new AABB(small, big.sub(small));
    };
    AABB.prototype.contains = function (aabb) {
        return Utils.rangeContain(this.pos.x, this.size.x + this.pos.x, aabb.pos.x, aabb.size.x + aabb.pos.x)
            && Utils.rangeContain(this.pos.y, this.size.y + this.pos.y, aabb.pos.y, aabb.size.y + aabb.pos.y);
    };
    AABB.prototype.collide = function (v) {
        return Utils.inRange(this.pos.x, this.size.x + this.pos.x, v.x) && Utils.inRange(this.pos.y, this.size.y + this.pos.y, v.y);
    };
    return AABB;
}());
module.exports = AABB;

},{"./utils":7}],2:[function(require,module,exports){
"use strict";
var Vector = require('./vector');
var Utils = require('./utils');
var ChessPiece = require('./ChessPiece');
var Team;
(function (Team) {
    Team[Team["Black"] = 0] = "Black";
    Team[Team["White"] = 1] = "White";
})(Team || (Team = {}));
var ChessBoard = (function () {
    function ChessBoard() {
        this.size = new Vector(8, 8);
        this.squareSize = new Vector(50, 50);
        this.turn = Team.White;
        this.grid = Utils.create2dArray(this.size, null);
    }
    ChessBoard.prototype.tryFromTo = function (from, to) {
        var fromPiece = this.grid[from.x][from.y]; //could outofrange from badclient
        return fromPiece.tryMove(to);
    };
    ChessBoard.prototype.draw = function (ctxt, offset) {
        var _this = this;
        var legalsSpots;
        if (this.selected)
            legalsSpots = this.selected.posChecker(this.selected, this);
        this.size.loop(function (v) {
            if ((v.x + v.y) % 2 == 0)
                ctxt.fillStyle = "#fff";
            else
                ctxt.fillStyle = "#000";
            if (_this.selected && v.equals(_this.selected.pos))
                ctxt.fillStyle = "#0ff";
            if (_this.selected && legalsSpots[v.x][v.y])
                ctxt.fillStyle = "#f00";
            ctxt.fillRect(v.x * _this.squareSize.x + offset.x, v.y * _this.squareSize.y + offset.y, _this.squareSize.x, _this.squareSize.y);
            if (_this.grid[v.x][v.y]) {
                _this.grid[v.x][v.y].draw(ctxt, _this.squareSize, offset);
            }
        });
    };
    ChessBoard.prototype.vectorToGridPos = function (v) {
        var n = new Vector();
        n.x = Math.floor(v.x / this.squareSize.x);
        n.y = Math.floor(v.y / this.squareSize.y);
        return n;
    };
    ChessBoard.prototype.add = function (c) {
        this.grid[c.pos.x][c.pos.y] = c;
    };
    ChessBoard.prototype.serialize = function () {
        var _this = this;
        var grid = Utils.create2dArray(this.size, null);
        this.size.loop(function (v) {
            if (_this.grid[v.x][v.y])
                grid[v.x][v.y] = _this.grid[v.x][v.y].serialize();
        });
        var selected;
        if (this.selected)
            selected = this.selected.serialize();
        var serialized = {
            size: this.size.serialize(),
            squareSize: this.squareSize.serialize(),
            grid: grid,
            turn: this.turn,
            selected: selected
        };
        return serialized;
    };
    ChessBoard.deserialize = function (object) {
        var chessBoard = new ChessBoard();
        var grid = Utils.create2dArray(chessBoard.size, null);
        chessBoard.size.loop(function (v) {
            if (object.grid[v.x][v.y])
                grid[v.x][v.y] = ChessPiece.deserialize(object.grid[v.x][v.y], chessBoard);
        });
        chessBoard.grid = grid;
        chessBoard.turn = object.turn;
        if (object.selected)
            chessBoard.selected = ChessPiece.deserialize(object.selected, chessBoard);
        return chessBoard;
    };
    return ChessBoard;
}());
module.exports = ChessBoard;

},{"./ChessPiece":3,"./utils":7,"./vector":8}],3:[function(require,module,exports){
"use strict";
var Vector = require('./vector');
var Utils = require('./utils');
var AABB = require('./AABB');
var EventHandler = require('./eventHandler');
var Team;
(function (Team) {
    Team[Team["Black"] = 0] = "Black";
    Team[Team["White"] = 1] = "White";
})(Team || (Team = {}));
var Type;
(function (Type) {
    Type[Type["pawn"] = 0] = "pawn";
    Type[Type["rook"] = 1] = "rook";
    Type[Type["knight"] = 2] = "knight";
    Type[Type["bishop"] = 3] = "bishop";
    Type[Type["queen"] = 4] = "queen";
    Type[Type["king"] = 5] = "king";
})(Type || (Type = {}));
var ChessPiece = (function () {
    function ChessPiece(type, team, pos, chessBoard) {
        this.moved = false;
        if (typeof document != 'undefined') {
            if (team == Team.Black)
                this.image = imageMapB[Type[type]];
            else
                this.image = imageMapW[Type[type]];
        }
        this.pos = pos;
        this.chessBoard = chessBoard;
        this.posChecker = checkMap.get(type);
        this.type = type;
        this.team = team;
    }
    ChessPiece.prototype.draw = function (ctxt, squareSize, offset) {
        // ctxt.textAlign = 'center'
        // ctxt.textBaseline = 'middle'
        // ctxt.strokeStyle = '#000'
        // ctxt.fillStyle = '#fff'
        // if(this.team == Team.Black){
        //     ctxt.strokeStyle = '#fff'
        //     ctxt.fillStyle = '#000'
        // }
        var size = this.chessBoard.squareSize.x;
        var halfsize = size / 2;
        ctxt.drawImage(this.image, offset.x + 0.5 + this.pos.x * squareSize.x + squareSize.x / 2 - halfsize, offset.y + 0.5 + this.pos.y * squareSize.y + squareSize.y / 2 - halfsize, size, size);
        // ctxt.strokeRect(offset.x + 0.5 + this.pos.x * squareSize.x + squareSize.x / 2 - halfsize, offset.y + 0.5 + this.pos.y * squareSize.y + squareSize.y / 2 - halfsize, size, size)
        // ctxt.fillRect(offset.x + 1 + this.pos.x * squareSize.x + squareSize.x / 2 - halfsize, offset.y + 1 + this.pos.y * squareSize.y + squareSize.y / 2 - halfsize, size - 1, size - 1)
        // if(this.team == Team.Black)ctxt.fillStyle = '#fff'
        // else ctxt.fillStyle = '#000'
        // ctxt.fillText(letterMap[this.type],offset.x + this.pos.x * squareSize.x + squareSize.x / 2, offset.y + this.pos.y * squareSize.y + squareSize.y / 2)
    };
    ChessPiece.prototype.tryMove = function (v) {
        if (this.posChecker(this, this.chessBoard)[v.x][v.y]) {
            var piece = this.chessBoard.grid[v.x][v.y];
            if (piece && piece.type == Type.king)
                EventHandler.trigger('gameOver', piece);
            this.chessBoard.grid[v.x][v.y] = this;
            this.chessBoard.grid[this.pos.x][this.pos.y] = null;
            this.pos = v;
            this.moved = true;
            if (this.chessBoard.turn == Team.Black)
                this.chessBoard.turn = Team.White;
            else
                this.chessBoard.turn = Team.Black;
            return true;
        }
        return false;
    };
    ChessPiece.prototype.isLegalMove = function (v) {
        return this.posChecker(this, this.chessBoard)[v.x][v.y];
    };
    ChessPiece.prototype.serialize = function () {
        return {
            type: this.type,
            pos: this.pos.serialize(),
            team: this.team,
            moved: this.moved
        };
    };
    ChessPiece.deserialize = function (object, chessBoard) {
        var c = new ChessPiece(object.type, object.team, Vector.deserialize(object.pos), chessBoard);
        c.moved = object.moved;
        return c;
    };
    return ChessPiece;
}());
var checkMap = new Map();
checkMap.set(Type.pawn, function (c, board) {
    var aabb = new AABB(new Vector(), board.size.c().sub(new Vector(1, 1)));
    var moves = [];
    var facing;
    if (c.team == Team.White)
        facing = new Vector(0, -1);
    else
        facing = new Vector(0, 1);
    var wsfront = c.pos.c().add(facing);
    if (aabb.collide(wsfront) && board.grid[wsfront.x][wsfront.y] == null) {
        moves.push(facing);
        var farFront = facing.c().scale(2);
        var wsFarFront = c.pos.c().add(farFront);
        if (!c.moved && aabb.collide(wsFarFront) && board.grid[wsFarFront.x][wsFarFront.y] == null)
            moves.push(farFront);
    }
    var west = new Vector(1, 0).add(facing);
    var wswest = west.c().add(c.pos);
    if (aabb.collide(wswest) && board.grid[wswest.x][wswest.y] != null && board.grid[wswest.x][wswest.y].team != c.team)
        moves.push(west);
    var east = new Vector(-1, 0).add(facing);
    var wseast = east.c().add(c.pos);
    if (aabb.collide(wseast) && board.grid[wseast.x][wseast.y] != null && board.grid[wseast.x][wseast.y].team != c.team)
        moves.push(east);
    return movesStamp(moves, c);
});
checkMap.set(Type.rook, function (c, grid) {
    var directions = [
        new Vector(1, 0),
        new Vector(-1, 0),
        new Vector(0, 1),
        new Vector(0, -1)
    ];
    return directionStamp(directions, c);
});
checkMap.set(Type.knight, function (c, grid) {
    var moves = [
        new Vector(1, -2),
        new Vector(2, -1),
        new Vector(2, 1),
        new Vector(1, 2),
        new Vector(-1, 2),
        new Vector(-2, 1),
        new Vector(-2, -1),
        new Vector(-1, -2)
    ];
    return movesStamp(moves, c);
});
checkMap.set(Type.bishop, function (c, grid) {
    var directions = [
        new Vector(1, 1),
        new Vector(-1, -1),
        new Vector(1, -1),
        new Vector(-1, 1)
    ];
    return directionStamp(directions, c);
});
checkMap.set(Type.queen, function (c) {
    var directions = [
        new Vector(1, 1),
        new Vector(-1, -1),
        new Vector(1, -1),
        new Vector(-1, 1),
        new Vector(1, 0),
        new Vector(-1, 0),
        new Vector(0, 1),
        new Vector(0, -1)
    ];
    return directionStamp(directions, c);
});
checkMap.set(Type.king, function (c, grid) {
    var moves = [
        new Vector(0, 1),
        new Vector(1, 1),
        new Vector(1, 0),
        new Vector(1, -1),
        new Vector(0, -1),
        new Vector(-1, -1),
        new Vector(-1, 0),
        new Vector(-1, 1),
    ];
    return movesStamp(moves, c);
});
function filterMovesOffBoard(moves, size, pos) {
    var legalMoves = [];
    var aabb = new AABB(new Vector(), size.c().sub(new Vector(1, 1)));
    for (var _i = 0, moves_1 = moves; _i < moves_1.length; _i++) {
        var move = moves_1[_i];
        var ws = move.c().add(pos);
        if (aabb.collide(ws))
            legalMoves.push(move);
    }
    return legalMoves;
}
function directionStamp(directions, c) {
    var aabb = new AABB(new Vector(), c.chessBoard.size.c().sub(new Vector(1, 1)));
    var opens = Utils.create2dArray(c.chessBoard.size, false);
    for (var _i = 0, directions_1 = directions; _i < directions_1.length; _i++) {
        var direction = directions_1[_i];
        var currentCheckingPos = c.pos.c();
        while (true) {
            currentCheckingPos.add(direction);
            if (aabb.collide(currentCheckingPos)) {
                var piece = c.chessBoard.grid[currentCheckingPos.x][currentCheckingPos.y];
                if (piece == null)
                    opens[currentCheckingPos.x][currentCheckingPos.y] = true;
                else {
                    if (piece.team != c.team)
                        opens[currentCheckingPos.x][currentCheckingPos.y] = true;
                    break; //break in both cases (if/else statement both break)
                }
            }
            else
                break;
        }
    }
    return opens;
}
function movesStamp(moves, c) {
    var aabb = new AABB(new Vector(), c.chessBoard.size.c().sub(new Vector(1, 1)));
    var opens = Utils.create2dArray(c.chessBoard.size, false);
    for (var _i = 0, moves_2 = moves; _i < moves_2.length; _i++) {
        var move = moves_2[_i];
        var currentCheckingPos = c.pos.c();
        currentCheckingPos.add(move);
        if (aabb.collide(currentCheckingPos)) {
            var piece = c.chessBoard.grid[currentCheckingPos.x][currentCheckingPos.y];
            if (piece == null || piece.team != c.team)
                opens[currentCheckingPos.x][currentCheckingPos.y] = true;
        }
    }
    return opens;
}
var imageMapB = {};
var imageMapW = {};
if (typeof document != 'undefined') {
    var types = ['pawn', 'rook', 'bishop', 'queen', 'king', 'knight'];
    for (var _i = 0, types_1 = types; _i < types_1.length; _i++) {
        var type = types_1[_i];
        var imageB = new Image();
        var imageW = new Image();
        imageB.src = 'resources/b' + type + '.png';
        imageW.src = 'resources/w' + type + '.png';
        imageB.onload = function () {
            EventHandler.trigger('imageLoaded', {});
        };
        imageW.onload = function () {
            EventHandler.trigger('imageLoaded', {});
        };
        imageMapB[type] = imageB;
        imageMapW[type] = imageW;
    }
}
var letterMap = [];
letterMap[Type.bishop] = 'B';
letterMap[Type.king] = 'K';
letterMap[Type.knight] = 'H';
letterMap[Type.pawn] = 'P';
letterMap[Type.queen] = 'Q';
letterMap[Type.rook] = 'R';
module.exports = ChessPiece;

},{"./AABB":1,"./eventHandler":5,"./utils":7,"./vector":8}],4:[function(require,module,exports){
"use strict";
var WebIOC = (function () {
    function WebIOC(socket) {
        var _this = this;
        this.socket = socket;
        this.routeMap = {};
        this.socket.onmessage = function (event) {
            var data = event.data;
            var parsedData = JSON.parse(data);
            if (_this.routeMap[parsedData.route]) {
                _this.routeMap[parsedData.route](parsedData);
            }
            else {
                console.log('404: ' + parsedData.route);
            }
        };
    }
    WebIOC.prototype.on = function (route, action) {
        this.routeMap[route] = action;
    };
    WebIOC.prototype.send = function (route, value) {
        value.route = route;
        if (this.socket.readyState == 1) {
            this.socket.send(JSON.stringify(value));
        }
    };
    WebIOC.prototype.onclose = function () {
    };
    WebIOC.prototype.close = function () {
        this.socket.close();
    };
    return WebIOC;
}());
module.exports = WebIOC;

},{}],5:[function(require,module,exports){
"use strict";
var EventHandler = (function () {
    function EventHandler() {
    }
    // static getInstance():EventHandler{
    //     if(EventHandler.instance == null){
    //         EventHandler.instance = new EventHandler();
    //     }
    //     return EventHandler.instance;
    // }
    EventHandler.trigger = function (event, data) {
        if (EventHandler.eventMap.get(event) == null)
            return;
        for (var _i = 0, _a = EventHandler.eventMap.get(event); _i < _a.length; _i++) {
            var callback = _a[_i];
            callback(data);
        }
    };
    EventHandler.subscribe = function (event, callback) {
        if (EventHandler.eventMap.get(event) == null)
            EventHandler.eventMap.set(event, []);
        EventHandler.eventMap.get(event).push(callback);
    };
    EventHandler.detach = function (event, callback) {
        var sublist = EventHandler.eventMap.get(event);
        for (var i = 0; i < sublist.length; i++) {
            var callbackInMap = sublist[i];
            if (callbackInMap == callback) {
                sublist.splice(i, 1);
                return;
            }
        }
    };
    EventHandler.eventMap = new Map();
    return EventHandler;
}());
module.exports = EventHandler;

},{}],6:[function(require,module,exports){
"use strict";
var canvas = document.getElementById('canvas');
var ctxt = canvas.getContext('2d');
var lastUpdate = Date.now();
var dt;
var pi = Math.PI;
var resetBtn = document.querySelector('#resetBtn');
var teamLabel = document.querySelector('#teamLabel');
var turnLabel = document.querySelector('#turnLabel');
var Vector = require('./vector');
var Utils = require('./utils');
var EventHandler = require('./eventHandler');
var ChessBoard = require('./ChessBoard');
var AABB = require('./AABB');
var WebIOC = require('./WebIOC');
var socket = new WebSocket("ws://localhost:8000/");
var webIOC = new WebIOC(socket);
var Team;
(function (Team) {
    Team[Team["Black"] = 0] = "Black";
    Team[Team["White"] = 1] = "White";
})(Team || (Team = {}));
var Type;
(function (Type) {
    Type[Type["pawn"] = 0] = "pawn";
    Type[Type["rook"] = 1] = "rook";
    Type[Type["knight"] = 2] = "knight";
    Type[Type["bishop"] = 3] = "bishop";
    Type[Type["queen"] = 4] = "queen";
    Type[Type["king"] = 5] = "king";
})(Type || (Type = {}));
var team;
var canvasContainer = document.querySelector('#canvas-container');
canvas.width = canvasContainer.offsetWidth - 3;
canvas.height = canvasContainer.offsetHeight - 100;
var imageLoadCounter = 0;
EventHandler.subscribe('imageLoaded', function (data) {
    imageLoadCounter++;
    if (imageLoadCounter >= 12) {
        chessBoard.draw(ctxt, offset);
    }
});
var chessBoard = new ChessBoard();
setInterval(function () {
    var now = Date.now();
    dt = (now - lastUpdate) / 1000;
    lastUpdate = now;
    dt = Utils.min(dt, 1);
    update();
    draw();
}, 1000 / 60);
var halfsize = chessBoard.size.x * chessBoard.squareSize.x / 2;
var offset = new Vector(Math.floor(canvas.width / 2 - halfsize), Math.floor(canvas.height / 2 - halfsize));
chessBoard.draw(ctxt, offset);
resetBtn.addEventListener('click', function () {
    webIOC.send('reset', {});
});
webIOC.on('update', function (data) {
    chessBoard = ChessBoard.deserialize(data.chessBoard);
    team = data.team;
    teamLabel.innerHTML = Team[team];
    turnLabel.innerHTML = Team[chessBoard.turn];
    chessBoard.draw(ctxt, offset);
});
document.onmousedown = function (evt) {
    var aabb = new AABB(new Vector(), chessBoard.size.c().sub(new Vector(1, 1)));
    var v = chessBoard.vectorToGridPos(getMousePos(canvas, evt).sub(offset));
    if (!aabb.collide(v)) {
        chessBoard.selected = null;
    }
    else {
        var piece = chessBoard.grid[v.x][v.y];
        if (chessBoard.selected == null) {
            if (piece && piece.team == chessBoard.turn && piece.team == team) {
                chessBoard.selected = piece;
            }
        }
        else {
            if (piece && piece.team == chessBoard.turn)
                chessBoard.selected = piece;
            else {
                if (chessBoard.selected.isLegalMove(v)) {
                    webIOC.send('move', {
                        from: chessBoard.selected.pos.serialize(),
                        to: v.serialize()
                    });
                }
                chessBoard.selected = null;
            }
        }
    }
    chessBoard.draw(ctxt, offset);
};
function update() {
}
function draw() {
    //ctxt.clearRect(0, 0, canvas.width, canvas.height);
}
function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return new Vector(evt.clientX - rect.left, evt.clientY - rect.top);
}

},{"./AABB":1,"./ChessBoard":2,"./WebIOC":4,"./eventHandler":5,"./utils":7,"./vector":8}],7:[function(require,module,exports){
"use strict";
var utils;
(function (utils) {
    function map(val1, start1, stop1, start2, stop2) {
        return start2 + (stop2 - start2) * ((val1 - start1) / (stop1 - start1));
    }
    utils.map = map;
    function inRange(min, max, value) {
        if (min > max) {
            var temp = min;
            min = max;
            max = temp;
        }
        return value <= max && value >= min;
    }
    utils.inRange = inRange;
    function min(a, b) {
        if (a < b)
            return a;
        return b;
    }
    utils.min = min;
    function max(a, b) {
        if (a > b)
            return a;
        return b;
    }
    utils.max = max;
    function clamp(val, min, max) {
        return this.max(this.min(val, max), min);
    }
    utils.clamp = clamp;
    function rangeContain(a1, a2, b1, b2) {
        return max(a1, a2) >= max(b1, b2) && min(a1, a2) <= max(b1, b2);
    }
    utils.rangeContain = rangeContain;
    function create2dArray(v, fill) {
        var rows = new Array(v.x);
        for (var i = 0; i < v.x; i++) {
            rows[i] = new Array(v.y);
            for (var j = 0; j < v.y; j++) {
                rows[i][j] = fill;
            }
        }
        return rows;
    }
    utils.create2dArray = create2dArray;
})(utils || (utils = {}));
module.exports = utils;

},{}],8:[function(require,module,exports){
"use strict";
var Vector = (function () {
    function Vector(x, y) {
        if (x === void 0) { x = 0; }
        if (y === void 0) { y = 0; }
        this.x = x;
        this.y = y;
    }
    Vector.prototype.add = function (vector) {
        this.x += vector.x;
        this.y += vector.y;
        return this;
    };
    Vector.prototype.sub = function (vector) {
        this.x -= vector.x;
        this.y -= vector.y;
        return this;
    };
    Vector.prototype.length = function () {
        return Math.pow(this.x * this.x + this.y * this.y, 0.5);
    };
    Vector.prototype.normalize = function () {
        var length = this.length();
        return this.scale(1 / length);
    };
    Vector.prototype.scale = function (scalar) {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    };
    Vector.prototype.rotate = function (r, origin) {
        if (origin === void 0) { origin = new Vector(); }
        var offset = this.c().sub(origin);
        var x = offset.x * Math.cos(r) - offset.y * Math.sin(r);
        var y = offset.x * Math.sin(r) + offset.y * Math.cos(r);
        offset.x = x;
        offset.y = y;
        var back = offset.add(origin);
        this.x = back.x;
        this.y = back.y;
        return this;
    };
    Vector.prototype.lerp = function (vector, weigth) {
        return this.scale(1 - weigth).add(vector.c().scale(weigth));
    };
    Vector.prototype.c = function () {
        return new Vector(this.x, this.y);
    };
    Vector.prototype.equals = function (v) {
        if (v == null)
            return false;
        return this.x == v.x && this.y == v.y;
    };
    Vector.prototype.set = function (vector) {
        this.x = vector.x;
        this.y = vector.y;
        return this;
    };
    Vector.prototype.perpDot = function (vector) {
        return Math.atan2(this.x * vector.y - this.y * vector.x, this.x * vector.x + this.y * vector.y);
    };
    Vector.prototype.draw = function (ctxt) {
        var width = 10;
        var half = width / 2;
        ctxt.fillRect(this.x - half, this.y - half, width, width);
    };
    Vector.prototype.loop = function (callback) {
        for (var x = 0; x < this.x; x++) {
            for (var y = 0; y < this.y; y++) {
                callback(new Vector(x, y));
            }
        }
    };
    Vector.prototype.serialize = function () {
        return { x: this.x, y: this.y };
    };
    Vector.deserialize = function (object) {
        return new Vector(object.x, object.y);
    };
    return Vector;
}());
module.exports = Vector;

},{}]},{},[6])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL1Byb2dyYW0gRmlsZXMvbm9kZWpzNjMvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJvdXQvQUFCQi5qcyIsIm91dC9DaGVzc0JvYXJkLmpzIiwib3V0L0NoZXNzUGllY2UuanMiLCJvdXQvV2ViSU9DLmpzIiwib3V0L2V2ZW50SGFuZGxlci5qcyIsIm91dC9tYWluLmpzIiwib3V0L3V0aWxzLmpzIiwib3V0L3ZlY3Rvci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDelBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgVXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XHJcbnZhciBBQUJCID0gKGZ1bmN0aW9uICgpIHtcclxuICAgIGZ1bmN0aW9uIEFBQkIocG9zLCBzaXplKSB7XHJcbiAgICAgICAgdGhpcy5wb3MgPSBwb3M7XHJcbiAgICAgICAgdGhpcy5zaXplID0gc2l6ZTtcclxuICAgIH1cclxuICAgIEFBQkIuZnJvbVZlY3RvcnMgPSBmdW5jdGlvbiAoYSkge1xyXG4gICAgICAgIHZhciBzbWFsbCA9IGFbMF07XHJcbiAgICAgICAgdmFyIGJpZyA9IGFbYS5sZW5ndGggLSAxXTtcclxuICAgICAgICBmb3IgKHZhciBfaSA9IDAsIGFfMSA9IGE7IF9pIDwgYV8xLmxlbmd0aDsgX2krKykge1xyXG4gICAgICAgICAgICB2YXIgdiA9IGFfMVtfaV07XHJcbiAgICAgICAgICAgIGlmICh2LnggPCBzbWFsbC54KVxyXG4gICAgICAgICAgICAgICAgc21hbGwueCA9IHYueDtcclxuICAgICAgICAgICAgZWxzZSBpZiAodi54ID4gYmlnLngpXHJcbiAgICAgICAgICAgICAgICBiaWcueCA9IHYueDtcclxuICAgICAgICAgICAgaWYgKHYueSA8IHNtYWxsLnkpXHJcbiAgICAgICAgICAgICAgICBzbWFsbC55ID0gdi55O1xyXG4gICAgICAgICAgICBlbHNlIGlmICh2LnkgPiBiaWcueSlcclxuICAgICAgICAgICAgICAgIGJpZy55ID0gdi55O1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbmV3IEFBQkIoc21hbGwsIGJpZy5zdWIoc21hbGwpKTtcclxuICAgIH07XHJcbiAgICBBQUJCLnByb3RvdHlwZS5jb250YWlucyA9IGZ1bmN0aW9uIChhYWJiKSB7XHJcbiAgICAgICAgcmV0dXJuIFV0aWxzLnJhbmdlQ29udGFpbih0aGlzLnBvcy54LCB0aGlzLnNpemUueCArIHRoaXMucG9zLngsIGFhYmIucG9zLngsIGFhYmIuc2l6ZS54ICsgYWFiYi5wb3MueClcclxuICAgICAgICAgICAgJiYgVXRpbHMucmFuZ2VDb250YWluKHRoaXMucG9zLnksIHRoaXMuc2l6ZS55ICsgdGhpcy5wb3MueSwgYWFiYi5wb3MueSwgYWFiYi5zaXplLnkgKyBhYWJiLnBvcy55KTtcclxuICAgIH07XHJcbiAgICBBQUJCLnByb3RvdHlwZS5jb2xsaWRlID0gZnVuY3Rpb24gKHYpIHtcclxuICAgICAgICByZXR1cm4gVXRpbHMuaW5SYW5nZSh0aGlzLnBvcy54LCB0aGlzLnNpemUueCArIHRoaXMucG9zLngsIHYueCkgJiYgVXRpbHMuaW5SYW5nZSh0aGlzLnBvcy55LCB0aGlzLnNpemUueSArIHRoaXMucG9zLnksIHYueSk7XHJcbiAgICB9O1xyXG4gICAgcmV0dXJuIEFBQkI7XHJcbn0oKSk7XHJcbm1vZHVsZS5leHBvcnRzID0gQUFCQjtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9QUFCQi5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIFZlY3RvciA9IHJlcXVpcmUoJy4vdmVjdG9yJyk7XHJcbnZhciBVdGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcclxudmFyIENoZXNzUGllY2UgPSByZXF1aXJlKCcuL0NoZXNzUGllY2UnKTtcclxudmFyIFRlYW07XHJcbihmdW5jdGlvbiAoVGVhbSkge1xyXG4gICAgVGVhbVtUZWFtW1wiQmxhY2tcIl0gPSAwXSA9IFwiQmxhY2tcIjtcclxuICAgIFRlYW1bVGVhbVtcIldoaXRlXCJdID0gMV0gPSBcIldoaXRlXCI7XHJcbn0pKFRlYW0gfHwgKFRlYW0gPSB7fSkpO1xyXG52YXIgQ2hlc3NCb2FyZCA9IChmdW5jdGlvbiAoKSB7XHJcbiAgICBmdW5jdGlvbiBDaGVzc0JvYXJkKCkge1xyXG4gICAgICAgIHRoaXMuc2l6ZSA9IG5ldyBWZWN0b3IoOCwgOCk7XHJcbiAgICAgICAgdGhpcy5zcXVhcmVTaXplID0gbmV3IFZlY3Rvcig1MCwgNTApO1xyXG4gICAgICAgIHRoaXMudHVybiA9IFRlYW0uV2hpdGU7XHJcbiAgICAgICAgdGhpcy5ncmlkID0gVXRpbHMuY3JlYXRlMmRBcnJheSh0aGlzLnNpemUsIG51bGwpO1xyXG4gICAgfVxyXG4gICAgQ2hlc3NCb2FyZC5wcm90b3R5cGUudHJ5RnJvbVRvID0gZnVuY3Rpb24gKGZyb20sIHRvKSB7XHJcbiAgICAgICAgdmFyIGZyb21QaWVjZSA9IHRoaXMuZ3JpZFtmcm9tLnhdW2Zyb20ueV07IC8vY291bGQgb3V0b2ZyYW5nZSBmcm9tIGJhZGNsaWVudFxyXG4gICAgICAgIHJldHVybiBmcm9tUGllY2UudHJ5TW92ZSh0byk7XHJcbiAgICB9O1xyXG4gICAgQ2hlc3NCb2FyZC5wcm90b3R5cGUuZHJhdyA9IGZ1bmN0aW9uIChjdHh0LCBvZmZzZXQpIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIHZhciBsZWdhbHNTcG90cztcclxuICAgICAgICBpZiAodGhpcy5zZWxlY3RlZClcclxuICAgICAgICAgICAgbGVnYWxzU3BvdHMgPSB0aGlzLnNlbGVjdGVkLnBvc0NoZWNrZXIodGhpcy5zZWxlY3RlZCwgdGhpcyk7XHJcbiAgICAgICAgdGhpcy5zaXplLmxvb3AoZnVuY3Rpb24gKHYpIHtcclxuICAgICAgICAgICAgaWYgKCh2LnggKyB2LnkpICUgMiA9PSAwKVxyXG4gICAgICAgICAgICAgICAgY3R4dC5maWxsU3R5bGUgPSBcIiNmZmZcIjtcclxuICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgY3R4dC5maWxsU3R5bGUgPSBcIiMwMDBcIjtcclxuICAgICAgICAgICAgaWYgKF90aGlzLnNlbGVjdGVkICYmIHYuZXF1YWxzKF90aGlzLnNlbGVjdGVkLnBvcykpXHJcbiAgICAgICAgICAgICAgICBjdHh0LmZpbGxTdHlsZSA9IFwiIzBmZlwiO1xyXG4gICAgICAgICAgICBpZiAoX3RoaXMuc2VsZWN0ZWQgJiYgbGVnYWxzU3BvdHNbdi54XVt2LnldKVxyXG4gICAgICAgICAgICAgICAgY3R4dC5maWxsU3R5bGUgPSBcIiNmMDBcIjtcclxuICAgICAgICAgICAgY3R4dC5maWxsUmVjdCh2LnggKiBfdGhpcy5zcXVhcmVTaXplLnggKyBvZmZzZXQueCwgdi55ICogX3RoaXMuc3F1YXJlU2l6ZS55ICsgb2Zmc2V0LnksIF90aGlzLnNxdWFyZVNpemUueCwgX3RoaXMuc3F1YXJlU2l6ZS55KTtcclxuICAgICAgICAgICAgaWYgKF90aGlzLmdyaWRbdi54XVt2LnldKSB7XHJcbiAgICAgICAgICAgICAgICBfdGhpcy5ncmlkW3YueF1bdi55XS5kcmF3KGN0eHQsIF90aGlzLnNxdWFyZVNpemUsIG9mZnNldCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH07XHJcbiAgICBDaGVzc0JvYXJkLnByb3RvdHlwZS52ZWN0b3JUb0dyaWRQb3MgPSBmdW5jdGlvbiAodikge1xyXG4gICAgICAgIHZhciBuID0gbmV3IFZlY3RvcigpO1xyXG4gICAgICAgIG4ueCA9IE1hdGguZmxvb3Iodi54IC8gdGhpcy5zcXVhcmVTaXplLngpO1xyXG4gICAgICAgIG4ueSA9IE1hdGguZmxvb3Iodi55IC8gdGhpcy5zcXVhcmVTaXplLnkpO1xyXG4gICAgICAgIHJldHVybiBuO1xyXG4gICAgfTtcclxuICAgIENoZXNzQm9hcmQucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIChjKSB7XHJcbiAgICAgICAgdGhpcy5ncmlkW2MucG9zLnhdW2MucG9zLnldID0gYztcclxuICAgIH07XHJcbiAgICBDaGVzc0JvYXJkLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICB2YXIgZ3JpZCA9IFV0aWxzLmNyZWF0ZTJkQXJyYXkodGhpcy5zaXplLCBudWxsKTtcclxuICAgICAgICB0aGlzLnNpemUubG9vcChmdW5jdGlvbiAodikge1xyXG4gICAgICAgICAgICBpZiAoX3RoaXMuZ3JpZFt2LnhdW3YueV0pXHJcbiAgICAgICAgICAgICAgICBncmlkW3YueF1bdi55XSA9IF90aGlzLmdyaWRbdi54XVt2LnldLnNlcmlhbGl6ZSgpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHZhciBzZWxlY3RlZDtcclxuICAgICAgICBpZiAodGhpcy5zZWxlY3RlZClcclxuICAgICAgICAgICAgc2VsZWN0ZWQgPSB0aGlzLnNlbGVjdGVkLnNlcmlhbGl6ZSgpO1xyXG4gICAgICAgIHZhciBzZXJpYWxpemVkID0ge1xyXG4gICAgICAgICAgICBzaXplOiB0aGlzLnNpemUuc2VyaWFsaXplKCksXHJcbiAgICAgICAgICAgIHNxdWFyZVNpemU6IHRoaXMuc3F1YXJlU2l6ZS5zZXJpYWxpemUoKSxcclxuICAgICAgICAgICAgZ3JpZDogZ3JpZCxcclxuICAgICAgICAgICAgdHVybjogdGhpcy50dXJuLFxyXG4gICAgICAgICAgICBzZWxlY3RlZDogc2VsZWN0ZWRcclxuICAgICAgICB9O1xyXG4gICAgICAgIHJldHVybiBzZXJpYWxpemVkO1xyXG4gICAgfTtcclxuICAgIENoZXNzQm9hcmQuZGVzZXJpYWxpemUgPSBmdW5jdGlvbiAob2JqZWN0KSB7XHJcbiAgICAgICAgdmFyIGNoZXNzQm9hcmQgPSBuZXcgQ2hlc3NCb2FyZCgpO1xyXG4gICAgICAgIHZhciBncmlkID0gVXRpbHMuY3JlYXRlMmRBcnJheShjaGVzc0JvYXJkLnNpemUsIG51bGwpO1xyXG4gICAgICAgIGNoZXNzQm9hcmQuc2l6ZS5sb29wKGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgICAgICAgIGlmIChvYmplY3QuZ3JpZFt2LnhdW3YueV0pXHJcbiAgICAgICAgICAgICAgICBncmlkW3YueF1bdi55XSA9IENoZXNzUGllY2UuZGVzZXJpYWxpemUob2JqZWN0LmdyaWRbdi54XVt2LnldLCBjaGVzc0JvYXJkKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBjaGVzc0JvYXJkLmdyaWQgPSBncmlkO1xyXG4gICAgICAgIGNoZXNzQm9hcmQudHVybiA9IG9iamVjdC50dXJuO1xyXG4gICAgICAgIGlmIChvYmplY3Quc2VsZWN0ZWQpXHJcbiAgICAgICAgICAgIGNoZXNzQm9hcmQuc2VsZWN0ZWQgPSBDaGVzc1BpZWNlLmRlc2VyaWFsaXplKG9iamVjdC5zZWxlY3RlZCwgY2hlc3NCb2FyZCk7XHJcbiAgICAgICAgcmV0dXJuIGNoZXNzQm9hcmQ7XHJcbiAgICB9O1xyXG4gICAgcmV0dXJuIENoZXNzQm9hcmQ7XHJcbn0oKSk7XHJcbm1vZHVsZS5leHBvcnRzID0gQ2hlc3NCb2FyZDtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Q2hlc3NCb2FyZC5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIFZlY3RvciA9IHJlcXVpcmUoJy4vdmVjdG9yJyk7XHJcbnZhciBVdGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcclxudmFyIEFBQkIgPSByZXF1aXJlKCcuL0FBQkInKTtcclxudmFyIEV2ZW50SGFuZGxlciA9IHJlcXVpcmUoJy4vZXZlbnRIYW5kbGVyJyk7XHJcbnZhciBUZWFtO1xyXG4oZnVuY3Rpb24gKFRlYW0pIHtcclxuICAgIFRlYW1bVGVhbVtcIkJsYWNrXCJdID0gMF0gPSBcIkJsYWNrXCI7XHJcbiAgICBUZWFtW1RlYW1bXCJXaGl0ZVwiXSA9IDFdID0gXCJXaGl0ZVwiO1xyXG59KShUZWFtIHx8IChUZWFtID0ge30pKTtcclxudmFyIFR5cGU7XHJcbihmdW5jdGlvbiAoVHlwZSkge1xyXG4gICAgVHlwZVtUeXBlW1wicGF3blwiXSA9IDBdID0gXCJwYXduXCI7XHJcbiAgICBUeXBlW1R5cGVbXCJyb29rXCJdID0gMV0gPSBcInJvb2tcIjtcclxuICAgIFR5cGVbVHlwZVtcImtuaWdodFwiXSA9IDJdID0gXCJrbmlnaHRcIjtcclxuICAgIFR5cGVbVHlwZVtcImJpc2hvcFwiXSA9IDNdID0gXCJiaXNob3BcIjtcclxuICAgIFR5cGVbVHlwZVtcInF1ZWVuXCJdID0gNF0gPSBcInF1ZWVuXCI7XHJcbiAgICBUeXBlW1R5cGVbXCJraW5nXCJdID0gNV0gPSBcImtpbmdcIjtcclxufSkoVHlwZSB8fCAoVHlwZSA9IHt9KSk7XHJcbnZhciBDaGVzc1BpZWNlID0gKGZ1bmN0aW9uICgpIHtcclxuICAgIGZ1bmN0aW9uIENoZXNzUGllY2UodHlwZSwgdGVhbSwgcG9zLCBjaGVzc0JvYXJkKSB7XHJcbiAgICAgICAgdGhpcy5tb3ZlZCA9IGZhbHNlO1xyXG4gICAgICAgIGlmICh0eXBlb2YgZG9jdW1lbnQgIT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgICAgICAgICAgaWYgKHRlYW0gPT0gVGVhbS5CbGFjaylcclxuICAgICAgICAgICAgICAgIHRoaXMuaW1hZ2UgPSBpbWFnZU1hcEJbVHlwZVt0eXBlXV07XHJcbiAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgIHRoaXMuaW1hZ2UgPSBpbWFnZU1hcFdbVHlwZVt0eXBlXV07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMucG9zID0gcG9zO1xyXG4gICAgICAgIHRoaXMuY2hlc3NCb2FyZCA9IGNoZXNzQm9hcmQ7XHJcbiAgICAgICAgdGhpcy5wb3NDaGVja2VyID0gY2hlY2tNYXAuZ2V0KHR5cGUpO1xyXG4gICAgICAgIHRoaXMudHlwZSA9IHR5cGU7XHJcbiAgICAgICAgdGhpcy50ZWFtID0gdGVhbTtcclxuICAgIH1cclxuICAgIENoZXNzUGllY2UucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbiAoY3R4dCwgc3F1YXJlU2l6ZSwgb2Zmc2V0KSB7XHJcbiAgICAgICAgLy8gY3R4dC50ZXh0QWxpZ24gPSAnY2VudGVyJ1xyXG4gICAgICAgIC8vIGN0eHQudGV4dEJhc2VsaW5lID0gJ21pZGRsZSdcclxuICAgICAgICAvLyBjdHh0LnN0cm9rZVN0eWxlID0gJyMwMDAnXHJcbiAgICAgICAgLy8gY3R4dC5maWxsU3R5bGUgPSAnI2ZmZidcclxuICAgICAgICAvLyBpZih0aGlzLnRlYW0gPT0gVGVhbS5CbGFjayl7XHJcbiAgICAgICAgLy8gICAgIGN0eHQuc3Ryb2tlU3R5bGUgPSAnI2ZmZidcclxuICAgICAgICAvLyAgICAgY3R4dC5maWxsU3R5bGUgPSAnIzAwMCdcclxuICAgICAgICAvLyB9XHJcbiAgICAgICAgdmFyIHNpemUgPSB0aGlzLmNoZXNzQm9hcmQuc3F1YXJlU2l6ZS54O1xyXG4gICAgICAgIHZhciBoYWxmc2l6ZSA9IHNpemUgLyAyO1xyXG4gICAgICAgIGN0eHQuZHJhd0ltYWdlKHRoaXMuaW1hZ2UsIG9mZnNldC54ICsgMC41ICsgdGhpcy5wb3MueCAqIHNxdWFyZVNpemUueCArIHNxdWFyZVNpemUueCAvIDIgLSBoYWxmc2l6ZSwgb2Zmc2V0LnkgKyAwLjUgKyB0aGlzLnBvcy55ICogc3F1YXJlU2l6ZS55ICsgc3F1YXJlU2l6ZS55IC8gMiAtIGhhbGZzaXplLCBzaXplLCBzaXplKTtcclxuICAgICAgICAvLyBjdHh0LnN0cm9rZVJlY3Qob2Zmc2V0LnggKyAwLjUgKyB0aGlzLnBvcy54ICogc3F1YXJlU2l6ZS54ICsgc3F1YXJlU2l6ZS54IC8gMiAtIGhhbGZzaXplLCBvZmZzZXQueSArIDAuNSArIHRoaXMucG9zLnkgKiBzcXVhcmVTaXplLnkgKyBzcXVhcmVTaXplLnkgLyAyIC0gaGFsZnNpemUsIHNpemUsIHNpemUpXHJcbiAgICAgICAgLy8gY3R4dC5maWxsUmVjdChvZmZzZXQueCArIDEgKyB0aGlzLnBvcy54ICogc3F1YXJlU2l6ZS54ICsgc3F1YXJlU2l6ZS54IC8gMiAtIGhhbGZzaXplLCBvZmZzZXQueSArIDEgKyB0aGlzLnBvcy55ICogc3F1YXJlU2l6ZS55ICsgc3F1YXJlU2l6ZS55IC8gMiAtIGhhbGZzaXplLCBzaXplIC0gMSwgc2l6ZSAtIDEpXHJcbiAgICAgICAgLy8gaWYodGhpcy50ZWFtID09IFRlYW0uQmxhY2spY3R4dC5maWxsU3R5bGUgPSAnI2ZmZidcclxuICAgICAgICAvLyBlbHNlIGN0eHQuZmlsbFN0eWxlID0gJyMwMDAnXHJcbiAgICAgICAgLy8gY3R4dC5maWxsVGV4dChsZXR0ZXJNYXBbdGhpcy50eXBlXSxvZmZzZXQueCArIHRoaXMucG9zLnggKiBzcXVhcmVTaXplLnggKyBzcXVhcmVTaXplLnggLyAyLCBvZmZzZXQueSArIHRoaXMucG9zLnkgKiBzcXVhcmVTaXplLnkgKyBzcXVhcmVTaXplLnkgLyAyKVxyXG4gICAgfTtcclxuICAgIENoZXNzUGllY2UucHJvdG90eXBlLnRyeU1vdmUgPSBmdW5jdGlvbiAodikge1xyXG4gICAgICAgIGlmICh0aGlzLnBvc0NoZWNrZXIodGhpcywgdGhpcy5jaGVzc0JvYXJkKVt2LnhdW3YueV0pIHtcclxuICAgICAgICAgICAgdmFyIHBpZWNlID0gdGhpcy5jaGVzc0JvYXJkLmdyaWRbdi54XVt2LnldO1xyXG4gICAgICAgICAgICBpZiAocGllY2UgJiYgcGllY2UudHlwZSA9PSBUeXBlLmtpbmcpXHJcbiAgICAgICAgICAgICAgICBFdmVudEhhbmRsZXIudHJpZ2dlcignZ2FtZU92ZXInLCBwaWVjZSk7XHJcbiAgICAgICAgICAgIHRoaXMuY2hlc3NCb2FyZC5ncmlkW3YueF1bdi55XSA9IHRoaXM7XHJcbiAgICAgICAgICAgIHRoaXMuY2hlc3NCb2FyZC5ncmlkW3RoaXMucG9zLnhdW3RoaXMucG9zLnldID0gbnVsbDtcclxuICAgICAgICAgICAgdGhpcy5wb3MgPSB2O1xyXG4gICAgICAgICAgICB0aGlzLm1vdmVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY2hlc3NCb2FyZC50dXJuID09IFRlYW0uQmxhY2spXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNoZXNzQm9hcmQudHVybiA9IFRlYW0uV2hpdGU7XHJcbiAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgIHRoaXMuY2hlc3NCb2FyZC50dXJuID0gVGVhbS5CbGFjaztcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH07XHJcbiAgICBDaGVzc1BpZWNlLnByb3RvdHlwZS5pc0xlZ2FsTW92ZSA9IGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMucG9zQ2hlY2tlcih0aGlzLCB0aGlzLmNoZXNzQm9hcmQpW3YueF1bdi55XTtcclxuICAgIH07XHJcbiAgICBDaGVzc1BpZWNlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgdHlwZTogdGhpcy50eXBlLFxyXG4gICAgICAgICAgICBwb3M6IHRoaXMucG9zLnNlcmlhbGl6ZSgpLFxyXG4gICAgICAgICAgICB0ZWFtOiB0aGlzLnRlYW0sXHJcbiAgICAgICAgICAgIG1vdmVkOiB0aGlzLm1vdmVkXHJcbiAgICAgICAgfTtcclxuICAgIH07XHJcbiAgICBDaGVzc1BpZWNlLmRlc2VyaWFsaXplID0gZnVuY3Rpb24gKG9iamVjdCwgY2hlc3NCb2FyZCkge1xyXG4gICAgICAgIHZhciBjID0gbmV3IENoZXNzUGllY2Uob2JqZWN0LnR5cGUsIG9iamVjdC50ZWFtLCBWZWN0b3IuZGVzZXJpYWxpemUob2JqZWN0LnBvcyksIGNoZXNzQm9hcmQpO1xyXG4gICAgICAgIGMubW92ZWQgPSBvYmplY3QubW92ZWQ7XHJcbiAgICAgICAgcmV0dXJuIGM7XHJcbiAgICB9O1xyXG4gICAgcmV0dXJuIENoZXNzUGllY2U7XHJcbn0oKSk7XHJcbnZhciBjaGVja01hcCA9IG5ldyBNYXAoKTtcclxuY2hlY2tNYXAuc2V0KFR5cGUucGF3biwgZnVuY3Rpb24gKGMsIGJvYXJkKSB7XHJcbiAgICB2YXIgYWFiYiA9IG5ldyBBQUJCKG5ldyBWZWN0b3IoKSwgYm9hcmQuc2l6ZS5jKCkuc3ViKG5ldyBWZWN0b3IoMSwgMSkpKTtcclxuICAgIHZhciBtb3ZlcyA9IFtdO1xyXG4gICAgdmFyIGZhY2luZztcclxuICAgIGlmIChjLnRlYW0gPT0gVGVhbS5XaGl0ZSlcclxuICAgICAgICBmYWNpbmcgPSBuZXcgVmVjdG9yKDAsIC0xKTtcclxuICAgIGVsc2VcclxuICAgICAgICBmYWNpbmcgPSBuZXcgVmVjdG9yKDAsIDEpO1xyXG4gICAgdmFyIHdzZnJvbnQgPSBjLnBvcy5jKCkuYWRkKGZhY2luZyk7XHJcbiAgICBpZiAoYWFiYi5jb2xsaWRlKHdzZnJvbnQpICYmIGJvYXJkLmdyaWRbd3Nmcm9udC54XVt3c2Zyb250LnldID09IG51bGwpIHtcclxuICAgICAgICBtb3Zlcy5wdXNoKGZhY2luZyk7XHJcbiAgICAgICAgdmFyIGZhckZyb250ID0gZmFjaW5nLmMoKS5zY2FsZSgyKTtcclxuICAgICAgICB2YXIgd3NGYXJGcm9udCA9IGMucG9zLmMoKS5hZGQoZmFyRnJvbnQpO1xyXG4gICAgICAgIGlmICghYy5tb3ZlZCAmJiBhYWJiLmNvbGxpZGUod3NGYXJGcm9udCkgJiYgYm9hcmQuZ3JpZFt3c0ZhckZyb250LnhdW3dzRmFyRnJvbnQueV0gPT0gbnVsbClcclxuICAgICAgICAgICAgbW92ZXMucHVzaChmYXJGcm9udCk7XHJcbiAgICB9XHJcbiAgICB2YXIgd2VzdCA9IG5ldyBWZWN0b3IoMSwgMCkuYWRkKGZhY2luZyk7XHJcbiAgICB2YXIgd3N3ZXN0ID0gd2VzdC5jKCkuYWRkKGMucG9zKTtcclxuICAgIGlmIChhYWJiLmNvbGxpZGUod3N3ZXN0KSAmJiBib2FyZC5ncmlkW3dzd2VzdC54XVt3c3dlc3QueV0gIT0gbnVsbCAmJiBib2FyZC5ncmlkW3dzd2VzdC54XVt3c3dlc3QueV0udGVhbSAhPSBjLnRlYW0pXHJcbiAgICAgICAgbW92ZXMucHVzaCh3ZXN0KTtcclxuICAgIHZhciBlYXN0ID0gbmV3IFZlY3RvcigtMSwgMCkuYWRkKGZhY2luZyk7XHJcbiAgICB2YXIgd3NlYXN0ID0gZWFzdC5jKCkuYWRkKGMucG9zKTtcclxuICAgIGlmIChhYWJiLmNvbGxpZGUod3NlYXN0KSAmJiBib2FyZC5ncmlkW3dzZWFzdC54XVt3c2Vhc3QueV0gIT0gbnVsbCAmJiBib2FyZC5ncmlkW3dzZWFzdC54XVt3c2Vhc3QueV0udGVhbSAhPSBjLnRlYW0pXHJcbiAgICAgICAgbW92ZXMucHVzaChlYXN0KTtcclxuICAgIHJldHVybiBtb3Zlc1N0YW1wKG1vdmVzLCBjKTtcclxufSk7XHJcbmNoZWNrTWFwLnNldChUeXBlLnJvb2ssIGZ1bmN0aW9uIChjLCBncmlkKSB7XHJcbiAgICB2YXIgZGlyZWN0aW9ucyA9IFtcclxuICAgICAgICBuZXcgVmVjdG9yKDEsIDApLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTEsIDApLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoMCwgMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigwLCAtMSlcclxuICAgIF07XHJcbiAgICByZXR1cm4gZGlyZWN0aW9uU3RhbXAoZGlyZWN0aW9ucywgYyk7XHJcbn0pO1xyXG5jaGVja01hcC5zZXQoVHlwZS5rbmlnaHQsIGZ1bmN0aW9uIChjLCBncmlkKSB7XHJcbiAgICB2YXIgbW92ZXMgPSBbXHJcbiAgICAgICAgbmV3IFZlY3RvcigxLCAtMiksXHJcbiAgICAgICAgbmV3IFZlY3RvcigyLCAtMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigyLCAxKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDEsIDIpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTEsIDIpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTIsIDEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTIsIC0xKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0xLCAtMilcclxuICAgIF07XHJcbiAgICByZXR1cm4gbW92ZXNTdGFtcChtb3ZlcywgYyk7XHJcbn0pO1xyXG5jaGVja01hcC5zZXQoVHlwZS5iaXNob3AsIGZ1bmN0aW9uIChjLCBncmlkKSB7XHJcbiAgICB2YXIgZGlyZWN0aW9ucyA9IFtcclxuICAgICAgICBuZXcgVmVjdG9yKDEsIDEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTEsIC0xKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDEsIC0xKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0xLCAxKVxyXG4gICAgXTtcclxuICAgIHJldHVybiBkaXJlY3Rpb25TdGFtcChkaXJlY3Rpb25zLCBjKTtcclxufSk7XHJcbmNoZWNrTWFwLnNldChUeXBlLnF1ZWVuLCBmdW5jdGlvbiAoYykge1xyXG4gICAgdmFyIGRpcmVjdGlvbnMgPSBbXHJcbiAgICAgICAgbmV3IFZlY3RvcigxLCAxKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0xLCAtMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigxLCAtMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigtMSwgMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigxLCAwKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0xLCAwKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDAsIDEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoMCwgLTEpXHJcbiAgICBdO1xyXG4gICAgcmV0dXJuIGRpcmVjdGlvblN0YW1wKGRpcmVjdGlvbnMsIGMpO1xyXG59KTtcclxuY2hlY2tNYXAuc2V0KFR5cGUua2luZywgZnVuY3Rpb24gKGMsIGdyaWQpIHtcclxuICAgIHZhciBtb3ZlcyA9IFtcclxuICAgICAgICBuZXcgVmVjdG9yKDAsIDEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoMSwgMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigxLCAwKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDEsIC0xKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDAsIC0xKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0xLCAtMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigtMSwgMCksXHJcbiAgICAgICAgbmV3IFZlY3RvcigtMSwgMSksXHJcbiAgICBdO1xyXG4gICAgcmV0dXJuIG1vdmVzU3RhbXAobW92ZXMsIGMpO1xyXG59KTtcclxuZnVuY3Rpb24gZmlsdGVyTW92ZXNPZmZCb2FyZChtb3Zlcywgc2l6ZSwgcG9zKSB7XHJcbiAgICB2YXIgbGVnYWxNb3ZlcyA9IFtdO1xyXG4gICAgdmFyIGFhYmIgPSBuZXcgQUFCQihuZXcgVmVjdG9yKCksIHNpemUuYygpLnN1YihuZXcgVmVjdG9yKDEsIDEpKSk7XHJcbiAgICBmb3IgKHZhciBfaSA9IDAsIG1vdmVzXzEgPSBtb3ZlczsgX2kgPCBtb3Zlc18xLmxlbmd0aDsgX2krKykge1xyXG4gICAgICAgIHZhciBtb3ZlID0gbW92ZXNfMVtfaV07XHJcbiAgICAgICAgdmFyIHdzID0gbW92ZS5jKCkuYWRkKHBvcyk7XHJcbiAgICAgICAgaWYgKGFhYmIuY29sbGlkZSh3cykpXHJcbiAgICAgICAgICAgIGxlZ2FsTW92ZXMucHVzaChtb3ZlKTtcclxuICAgIH1cclxuICAgIHJldHVybiBsZWdhbE1vdmVzO1xyXG59XHJcbmZ1bmN0aW9uIGRpcmVjdGlvblN0YW1wKGRpcmVjdGlvbnMsIGMpIHtcclxuICAgIHZhciBhYWJiID0gbmV3IEFBQkIobmV3IFZlY3RvcigpLCBjLmNoZXNzQm9hcmQuc2l6ZS5jKCkuc3ViKG5ldyBWZWN0b3IoMSwgMSkpKTtcclxuICAgIHZhciBvcGVucyA9IFV0aWxzLmNyZWF0ZTJkQXJyYXkoYy5jaGVzc0JvYXJkLnNpemUsIGZhbHNlKTtcclxuICAgIGZvciAodmFyIF9pID0gMCwgZGlyZWN0aW9uc18xID0gZGlyZWN0aW9uczsgX2kgPCBkaXJlY3Rpb25zXzEubGVuZ3RoOyBfaSsrKSB7XHJcbiAgICAgICAgdmFyIGRpcmVjdGlvbiA9IGRpcmVjdGlvbnNfMVtfaV07XHJcbiAgICAgICAgdmFyIGN1cnJlbnRDaGVja2luZ1BvcyA9IGMucG9zLmMoKTtcclxuICAgICAgICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgICAgICAgICBjdXJyZW50Q2hlY2tpbmdQb3MuYWRkKGRpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIGlmIChhYWJiLmNvbGxpZGUoY3VycmVudENoZWNraW5nUG9zKSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHBpZWNlID0gYy5jaGVzc0JvYXJkLmdyaWRbY3VycmVudENoZWNraW5nUG9zLnhdW2N1cnJlbnRDaGVja2luZ1Bvcy55XTtcclxuICAgICAgICAgICAgICAgIGlmIChwaWVjZSA9PSBudWxsKVxyXG4gICAgICAgICAgICAgICAgICAgIG9wZW5zW2N1cnJlbnRDaGVja2luZ1Bvcy54XVtjdXJyZW50Q2hlY2tpbmdQb3MueV0gPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBpZWNlLnRlYW0gIT0gYy50ZWFtKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBvcGVuc1tjdXJyZW50Q2hlY2tpbmdQb3MueF1bY3VycmVudENoZWNraW5nUG9zLnldID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhazsgLy9icmVhayBpbiBib3RoIGNhc2VzIChpZi9lbHNlIHN0YXRlbWVudCBib3RoIGJyZWFrKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBvcGVucztcclxufVxyXG5mdW5jdGlvbiBtb3Zlc1N0YW1wKG1vdmVzLCBjKSB7XHJcbiAgICB2YXIgYWFiYiA9IG5ldyBBQUJCKG5ldyBWZWN0b3IoKSwgYy5jaGVzc0JvYXJkLnNpemUuYygpLnN1YihuZXcgVmVjdG9yKDEsIDEpKSk7XHJcbiAgICB2YXIgb3BlbnMgPSBVdGlscy5jcmVhdGUyZEFycmF5KGMuY2hlc3NCb2FyZC5zaXplLCBmYWxzZSk7XHJcbiAgICBmb3IgKHZhciBfaSA9IDAsIG1vdmVzXzIgPSBtb3ZlczsgX2kgPCBtb3Zlc18yLmxlbmd0aDsgX2krKykge1xyXG4gICAgICAgIHZhciBtb3ZlID0gbW92ZXNfMltfaV07XHJcbiAgICAgICAgdmFyIGN1cnJlbnRDaGVja2luZ1BvcyA9IGMucG9zLmMoKTtcclxuICAgICAgICBjdXJyZW50Q2hlY2tpbmdQb3MuYWRkKG1vdmUpO1xyXG4gICAgICAgIGlmIChhYWJiLmNvbGxpZGUoY3VycmVudENoZWNraW5nUG9zKSkge1xyXG4gICAgICAgICAgICB2YXIgcGllY2UgPSBjLmNoZXNzQm9hcmQuZ3JpZFtjdXJyZW50Q2hlY2tpbmdQb3MueF1bY3VycmVudENoZWNraW5nUG9zLnldO1xyXG4gICAgICAgICAgICBpZiAocGllY2UgPT0gbnVsbCB8fCBwaWVjZS50ZWFtICE9IGMudGVhbSlcclxuICAgICAgICAgICAgICAgIG9wZW5zW2N1cnJlbnRDaGVja2luZ1Bvcy54XVtjdXJyZW50Q2hlY2tpbmdQb3MueV0gPSB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBvcGVucztcclxufVxyXG52YXIgaW1hZ2VNYXBCID0ge307XHJcbnZhciBpbWFnZU1hcFcgPSB7fTtcclxuaWYgKHR5cGVvZiBkb2N1bWVudCAhPSAndW5kZWZpbmVkJykge1xyXG4gICAgdmFyIHR5cGVzID0gWydwYXduJywgJ3Jvb2snLCAnYmlzaG9wJywgJ3F1ZWVuJywgJ2tpbmcnLCAna25pZ2h0J107XHJcbiAgICBmb3IgKHZhciBfaSA9IDAsIHR5cGVzXzEgPSB0eXBlczsgX2kgPCB0eXBlc18xLmxlbmd0aDsgX2krKykge1xyXG4gICAgICAgIHZhciB0eXBlID0gdHlwZXNfMVtfaV07XHJcbiAgICAgICAgdmFyIGltYWdlQiA9IG5ldyBJbWFnZSgpO1xyXG4gICAgICAgIHZhciBpbWFnZVcgPSBuZXcgSW1hZ2UoKTtcclxuICAgICAgICBpbWFnZUIuc3JjID0gJ3Jlc291cmNlcy9iJyArIHR5cGUgKyAnLnBuZyc7XHJcbiAgICAgICAgaW1hZ2VXLnNyYyA9ICdyZXNvdXJjZXMvdycgKyB0eXBlICsgJy5wbmcnO1xyXG4gICAgICAgIGltYWdlQi5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIEV2ZW50SGFuZGxlci50cmlnZ2VyKCdpbWFnZUxvYWRlZCcsIHt9KTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIGltYWdlVy5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIEV2ZW50SGFuZGxlci50cmlnZ2VyKCdpbWFnZUxvYWRlZCcsIHt9KTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIGltYWdlTWFwQlt0eXBlXSA9IGltYWdlQjtcclxuICAgICAgICBpbWFnZU1hcFdbdHlwZV0gPSBpbWFnZVc7XHJcbiAgICB9XHJcbn1cclxudmFyIGxldHRlck1hcCA9IFtdO1xyXG5sZXR0ZXJNYXBbVHlwZS5iaXNob3BdID0gJ0InO1xyXG5sZXR0ZXJNYXBbVHlwZS5raW5nXSA9ICdLJztcclxubGV0dGVyTWFwW1R5cGUua25pZ2h0XSA9ICdIJztcclxubGV0dGVyTWFwW1R5cGUucGF3bl0gPSAnUCc7XHJcbmxldHRlck1hcFtUeXBlLnF1ZWVuXSA9ICdRJztcclxubGV0dGVyTWFwW1R5cGUucm9va10gPSAnUic7XHJcbm1vZHVsZS5leHBvcnRzID0gQ2hlc3NQaWVjZTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Q2hlc3NQaWVjZS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIFdlYklPQyA9IChmdW5jdGlvbiAoKSB7XHJcbiAgICBmdW5jdGlvbiBXZWJJT0Moc29ja2V0KSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICB0aGlzLnNvY2tldCA9IHNvY2tldDtcclxuICAgICAgICB0aGlzLnJvdXRlTWFwID0ge307XHJcbiAgICAgICAgdGhpcy5zb2NrZXQub25tZXNzYWdlID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICAgICAgICAgIHZhciBkYXRhID0gZXZlbnQuZGF0YTtcclxuICAgICAgICAgICAgdmFyIHBhcnNlZERhdGEgPSBKU09OLnBhcnNlKGRhdGEpO1xyXG4gICAgICAgICAgICBpZiAoX3RoaXMucm91dGVNYXBbcGFyc2VkRGF0YS5yb3V0ZV0pIHtcclxuICAgICAgICAgICAgICAgIF90aGlzLnJvdXRlTWFwW3BhcnNlZERhdGEucm91dGVdKHBhcnNlZERhdGEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJzQwNDogJyArIHBhcnNlZERhdGEucm91dGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuICAgIFdlYklPQy5wcm90b3R5cGUub24gPSBmdW5jdGlvbiAocm91dGUsIGFjdGlvbikge1xyXG4gICAgICAgIHRoaXMucm91dGVNYXBbcm91dGVdID0gYWN0aW9uO1xyXG4gICAgfTtcclxuICAgIFdlYklPQy5wcm90b3R5cGUuc2VuZCA9IGZ1bmN0aW9uIChyb3V0ZSwgdmFsdWUpIHtcclxuICAgICAgICB2YWx1ZS5yb3V0ZSA9IHJvdXRlO1xyXG4gICAgICAgIGlmICh0aGlzLnNvY2tldC5yZWFkeVN0YXRlID09IDEpIHtcclxuICAgICAgICAgICAgdGhpcy5zb2NrZXQuc2VuZChKU09OLnN0cmluZ2lmeSh2YWx1ZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbiAgICBXZWJJT0MucHJvdG90eXBlLm9uY2xvc2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB9O1xyXG4gICAgV2ViSU9DLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLnNvY2tldC5jbG9zZSgpO1xyXG4gICAgfTtcclxuICAgIHJldHVybiBXZWJJT0M7XHJcbn0oKSk7XHJcbm1vZHVsZS5leHBvcnRzID0gV2ViSU9DO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1XZWJJT0MuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBFdmVudEhhbmRsZXIgPSAoZnVuY3Rpb24gKCkge1xyXG4gICAgZnVuY3Rpb24gRXZlbnRIYW5kbGVyKCkge1xyXG4gICAgfVxyXG4gICAgLy8gc3RhdGljIGdldEluc3RhbmNlKCk6RXZlbnRIYW5kbGVye1xyXG4gICAgLy8gICAgIGlmKEV2ZW50SGFuZGxlci5pbnN0YW5jZSA9PSBudWxsKXtcclxuICAgIC8vICAgICAgICAgRXZlbnRIYW5kbGVyLmluc3RhbmNlID0gbmV3IEV2ZW50SGFuZGxlcigpO1xyXG4gICAgLy8gICAgIH1cclxuICAgIC8vICAgICByZXR1cm4gRXZlbnRIYW5kbGVyLmluc3RhbmNlO1xyXG4gICAgLy8gfVxyXG4gICAgRXZlbnRIYW5kbGVyLnRyaWdnZXIgPSBmdW5jdGlvbiAoZXZlbnQsIGRhdGEpIHtcclxuICAgICAgICBpZiAoRXZlbnRIYW5kbGVyLmV2ZW50TWFwLmdldChldmVudCkgPT0gbnVsbClcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIGZvciAodmFyIF9pID0gMCwgX2EgPSBFdmVudEhhbmRsZXIuZXZlbnRNYXAuZ2V0KGV2ZW50KTsgX2kgPCBfYS5sZW5ndGg7IF9pKyspIHtcclxuICAgICAgICAgICAgdmFyIGNhbGxiYWNrID0gX2FbX2ldO1xyXG4gICAgICAgICAgICBjYWxsYmFjayhkYXRhKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgRXZlbnRIYW5kbGVyLnN1YnNjcmliZSA9IGZ1bmN0aW9uIChldmVudCwgY2FsbGJhY2spIHtcclxuICAgICAgICBpZiAoRXZlbnRIYW5kbGVyLmV2ZW50TWFwLmdldChldmVudCkgPT0gbnVsbClcclxuICAgICAgICAgICAgRXZlbnRIYW5kbGVyLmV2ZW50TWFwLnNldChldmVudCwgW10pO1xyXG4gICAgICAgIEV2ZW50SGFuZGxlci5ldmVudE1hcC5nZXQoZXZlbnQpLnB1c2goY2FsbGJhY2spO1xyXG4gICAgfTtcclxuICAgIEV2ZW50SGFuZGxlci5kZXRhY2ggPSBmdW5jdGlvbiAoZXZlbnQsIGNhbGxiYWNrKSB7XHJcbiAgICAgICAgdmFyIHN1Ymxpc3QgPSBFdmVudEhhbmRsZXIuZXZlbnRNYXAuZ2V0KGV2ZW50KTtcclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN1Ymxpc3QubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgdmFyIGNhbGxiYWNrSW5NYXAgPSBzdWJsaXN0W2ldO1xyXG4gICAgICAgICAgICBpZiAoY2FsbGJhY2tJbk1hcCA9PSBjYWxsYmFjaykge1xyXG4gICAgICAgICAgICAgICAgc3VibGlzdC5zcGxpY2UoaSwgMSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgRXZlbnRIYW5kbGVyLmV2ZW50TWFwID0gbmV3IE1hcCgpO1xyXG4gICAgcmV0dXJuIEV2ZW50SGFuZGxlcjtcclxufSgpKTtcclxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEhhbmRsZXI7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWV2ZW50SGFuZGxlci5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYW52YXMnKTtcclxudmFyIGN0eHQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcclxudmFyIGxhc3RVcGRhdGUgPSBEYXRlLm5vdygpO1xyXG52YXIgZHQ7XHJcbnZhciBwaSA9IE1hdGguUEk7XHJcbnZhciByZXNldEJ0biA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNyZXNldEJ0bicpO1xyXG52YXIgdGVhbUxhYmVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3RlYW1MYWJlbCcpO1xyXG52YXIgdHVybkxhYmVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3R1cm5MYWJlbCcpO1xyXG52YXIgVmVjdG9yID0gcmVxdWlyZSgnLi92ZWN0b3InKTtcclxudmFyIFV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xyXG52YXIgRXZlbnRIYW5kbGVyID0gcmVxdWlyZSgnLi9ldmVudEhhbmRsZXInKTtcclxudmFyIENoZXNzQm9hcmQgPSByZXF1aXJlKCcuL0NoZXNzQm9hcmQnKTtcclxudmFyIEFBQkIgPSByZXF1aXJlKCcuL0FBQkInKTtcclxudmFyIFdlYklPQyA9IHJlcXVpcmUoJy4vV2ViSU9DJyk7XHJcbnZhciBzb2NrZXQgPSBuZXcgV2ViU29ja2V0KFwid3M6Ly9sb2NhbGhvc3Q6ODAwMC9cIik7XHJcbnZhciB3ZWJJT0MgPSBuZXcgV2ViSU9DKHNvY2tldCk7XHJcbnZhciBUZWFtO1xyXG4oZnVuY3Rpb24gKFRlYW0pIHtcclxuICAgIFRlYW1bVGVhbVtcIkJsYWNrXCJdID0gMF0gPSBcIkJsYWNrXCI7XHJcbiAgICBUZWFtW1RlYW1bXCJXaGl0ZVwiXSA9IDFdID0gXCJXaGl0ZVwiO1xyXG59KShUZWFtIHx8IChUZWFtID0ge30pKTtcclxudmFyIFR5cGU7XHJcbihmdW5jdGlvbiAoVHlwZSkge1xyXG4gICAgVHlwZVtUeXBlW1wicGF3blwiXSA9IDBdID0gXCJwYXduXCI7XHJcbiAgICBUeXBlW1R5cGVbXCJyb29rXCJdID0gMV0gPSBcInJvb2tcIjtcclxuICAgIFR5cGVbVHlwZVtcImtuaWdodFwiXSA9IDJdID0gXCJrbmlnaHRcIjtcclxuICAgIFR5cGVbVHlwZVtcImJpc2hvcFwiXSA9IDNdID0gXCJiaXNob3BcIjtcclxuICAgIFR5cGVbVHlwZVtcInF1ZWVuXCJdID0gNF0gPSBcInF1ZWVuXCI7XHJcbiAgICBUeXBlW1R5cGVbXCJraW5nXCJdID0gNV0gPSBcImtpbmdcIjtcclxufSkoVHlwZSB8fCAoVHlwZSA9IHt9KSk7XHJcbnZhciB0ZWFtO1xyXG52YXIgY2FudmFzQ29udGFpbmVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2NhbnZhcy1jb250YWluZXInKTtcclxuY2FudmFzLndpZHRoID0gY2FudmFzQ29udGFpbmVyLm9mZnNldFdpZHRoIC0gMztcclxuY2FudmFzLmhlaWdodCA9IGNhbnZhc0NvbnRhaW5lci5vZmZzZXRIZWlnaHQgLSAxMDA7XHJcbnZhciBpbWFnZUxvYWRDb3VudGVyID0gMDtcclxuRXZlbnRIYW5kbGVyLnN1YnNjcmliZSgnaW1hZ2VMb2FkZWQnLCBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgaW1hZ2VMb2FkQ291bnRlcisrO1xyXG4gICAgaWYgKGltYWdlTG9hZENvdW50ZXIgPj0gMTIpIHtcclxuICAgICAgICBjaGVzc0JvYXJkLmRyYXcoY3R4dCwgb2Zmc2V0KTtcclxuICAgIH1cclxufSk7XHJcbnZhciBjaGVzc0JvYXJkID0gbmV3IENoZXNzQm9hcmQoKTtcclxuc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIG5vdyA9IERhdGUubm93KCk7XHJcbiAgICBkdCA9IChub3cgLSBsYXN0VXBkYXRlKSAvIDEwMDA7XHJcbiAgICBsYXN0VXBkYXRlID0gbm93O1xyXG4gICAgZHQgPSBVdGlscy5taW4oZHQsIDEpO1xyXG4gICAgdXBkYXRlKCk7XHJcbiAgICBkcmF3KCk7XHJcbn0sIDEwMDAgLyA2MCk7XHJcbnZhciBoYWxmc2l6ZSA9IGNoZXNzQm9hcmQuc2l6ZS54ICogY2hlc3NCb2FyZC5zcXVhcmVTaXplLnggLyAyO1xyXG52YXIgb2Zmc2V0ID0gbmV3IFZlY3RvcihNYXRoLmZsb29yKGNhbnZhcy53aWR0aCAvIDIgLSBoYWxmc2l6ZSksIE1hdGguZmxvb3IoY2FudmFzLmhlaWdodCAvIDIgLSBoYWxmc2l6ZSkpO1xyXG5jaGVzc0JvYXJkLmRyYXcoY3R4dCwgb2Zmc2V0KTtcclxucmVzZXRCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoKSB7XHJcbiAgICB3ZWJJT0Muc2VuZCgncmVzZXQnLCB7fSk7XHJcbn0pO1xyXG53ZWJJT0Mub24oJ3VwZGF0ZScsIGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICBjaGVzc0JvYXJkID0gQ2hlc3NCb2FyZC5kZXNlcmlhbGl6ZShkYXRhLmNoZXNzQm9hcmQpO1xyXG4gICAgdGVhbSA9IGRhdGEudGVhbTtcclxuICAgIHRlYW1MYWJlbC5pbm5lckhUTUwgPSBUZWFtW3RlYW1dO1xyXG4gICAgdHVybkxhYmVsLmlubmVySFRNTCA9IFRlYW1bY2hlc3NCb2FyZC50dXJuXTtcclxuICAgIGNoZXNzQm9hcmQuZHJhdyhjdHh0LCBvZmZzZXQpO1xyXG59KTtcclxuZG9jdW1lbnQub25tb3VzZWRvd24gPSBmdW5jdGlvbiAoZXZ0KSB7XHJcbiAgICB2YXIgYWFiYiA9IG5ldyBBQUJCKG5ldyBWZWN0b3IoKSwgY2hlc3NCb2FyZC5zaXplLmMoKS5zdWIobmV3IFZlY3RvcigxLCAxKSkpO1xyXG4gICAgdmFyIHYgPSBjaGVzc0JvYXJkLnZlY3RvclRvR3JpZFBvcyhnZXRNb3VzZVBvcyhjYW52YXMsIGV2dCkuc3ViKG9mZnNldCkpO1xyXG4gICAgaWYgKCFhYWJiLmNvbGxpZGUodikpIHtcclxuICAgICAgICBjaGVzc0JvYXJkLnNlbGVjdGVkID0gbnVsbDtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIHZhciBwaWVjZSA9IGNoZXNzQm9hcmQuZ3JpZFt2LnhdW3YueV07XHJcbiAgICAgICAgaWYgKGNoZXNzQm9hcmQuc2VsZWN0ZWQgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICBpZiAocGllY2UgJiYgcGllY2UudGVhbSA9PSBjaGVzc0JvYXJkLnR1cm4gJiYgcGllY2UudGVhbSA9PSB0ZWFtKSB7XHJcbiAgICAgICAgICAgICAgICBjaGVzc0JvYXJkLnNlbGVjdGVkID0gcGllY2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGlmIChwaWVjZSAmJiBwaWVjZS50ZWFtID09IGNoZXNzQm9hcmQudHVybilcclxuICAgICAgICAgICAgICAgIGNoZXNzQm9hcmQuc2VsZWN0ZWQgPSBwaWVjZTtcclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoY2hlc3NCb2FyZC5zZWxlY3RlZC5pc0xlZ2FsTW92ZSh2KSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHdlYklPQy5zZW5kKCdtb3ZlJywge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmcm9tOiBjaGVzc0JvYXJkLnNlbGVjdGVkLnBvcy5zZXJpYWxpemUoKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdG86IHYuc2VyaWFsaXplKClcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNoZXNzQm9hcmQuc2VsZWN0ZWQgPSBudWxsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgY2hlc3NCb2FyZC5kcmF3KGN0eHQsIG9mZnNldCk7XHJcbn07XHJcbmZ1bmN0aW9uIHVwZGF0ZSgpIHtcclxufVxyXG5mdW5jdGlvbiBkcmF3KCkge1xyXG4gICAgLy9jdHh0LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xyXG59XHJcbmZ1bmN0aW9uIGdldE1vdXNlUG9zKGNhbnZhcywgZXZ0KSB7XHJcbiAgICB2YXIgcmVjdCA9IGNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgIHJldHVybiBuZXcgVmVjdG9yKGV2dC5jbGllbnRYIC0gcmVjdC5sZWZ0LCBldnQuY2xpZW50WSAtIHJlY3QudG9wKTtcclxufVxyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1tYWluLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgdXRpbHM7XHJcbihmdW5jdGlvbiAodXRpbHMpIHtcclxuICAgIGZ1bmN0aW9uIG1hcCh2YWwxLCBzdGFydDEsIHN0b3AxLCBzdGFydDIsIHN0b3AyKSB7XHJcbiAgICAgICAgcmV0dXJuIHN0YXJ0MiArIChzdG9wMiAtIHN0YXJ0MikgKiAoKHZhbDEgLSBzdGFydDEpIC8gKHN0b3AxIC0gc3RhcnQxKSk7XHJcbiAgICB9XHJcbiAgICB1dGlscy5tYXAgPSBtYXA7XHJcbiAgICBmdW5jdGlvbiBpblJhbmdlKG1pbiwgbWF4LCB2YWx1ZSkge1xyXG4gICAgICAgIGlmIChtaW4gPiBtYXgpIHtcclxuICAgICAgICAgICAgdmFyIHRlbXAgPSBtaW47XHJcbiAgICAgICAgICAgIG1pbiA9IG1heDtcclxuICAgICAgICAgICAgbWF4ID0gdGVtcDtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHZhbHVlIDw9IG1heCAmJiB2YWx1ZSA+PSBtaW47XHJcbiAgICB9XHJcbiAgICB1dGlscy5pblJhbmdlID0gaW5SYW5nZTtcclxuICAgIGZ1bmN0aW9uIG1pbihhLCBiKSB7XHJcbiAgICAgICAgaWYgKGEgPCBiKVxyXG4gICAgICAgICAgICByZXR1cm4gYTtcclxuICAgICAgICByZXR1cm4gYjtcclxuICAgIH1cclxuICAgIHV0aWxzLm1pbiA9IG1pbjtcclxuICAgIGZ1bmN0aW9uIG1heChhLCBiKSB7XHJcbiAgICAgICAgaWYgKGEgPiBiKVxyXG4gICAgICAgICAgICByZXR1cm4gYTtcclxuICAgICAgICByZXR1cm4gYjtcclxuICAgIH1cclxuICAgIHV0aWxzLm1heCA9IG1heDtcclxuICAgIGZ1bmN0aW9uIGNsYW1wKHZhbCwgbWluLCBtYXgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5tYXgodGhpcy5taW4odmFsLCBtYXgpLCBtaW4pO1xyXG4gICAgfVxyXG4gICAgdXRpbHMuY2xhbXAgPSBjbGFtcDtcclxuICAgIGZ1bmN0aW9uIHJhbmdlQ29udGFpbihhMSwgYTIsIGIxLCBiMikge1xyXG4gICAgICAgIHJldHVybiBtYXgoYTEsIGEyKSA+PSBtYXgoYjEsIGIyKSAmJiBtaW4oYTEsIGEyKSA8PSBtYXgoYjEsIGIyKTtcclxuICAgIH1cclxuICAgIHV0aWxzLnJhbmdlQ29udGFpbiA9IHJhbmdlQ29udGFpbjtcclxuICAgIGZ1bmN0aW9uIGNyZWF0ZTJkQXJyYXkodiwgZmlsbCkge1xyXG4gICAgICAgIHZhciByb3dzID0gbmV3IEFycmF5KHYueCk7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2Lng7IGkrKykge1xyXG4gICAgICAgICAgICByb3dzW2ldID0gbmV3IEFycmF5KHYueSk7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgdi55OyBqKyspIHtcclxuICAgICAgICAgICAgICAgIHJvd3NbaV1bal0gPSBmaWxsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiByb3dzO1xyXG4gICAgfVxyXG4gICAgdXRpbHMuY3JlYXRlMmRBcnJheSA9IGNyZWF0ZTJkQXJyYXk7XHJcbn0pKHV0aWxzIHx8ICh1dGlscyA9IHt9KSk7XHJcbm1vZHVsZS5leHBvcnRzID0gdXRpbHM7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXV0aWxzLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgVmVjdG9yID0gKGZ1bmN0aW9uICgpIHtcclxuICAgIGZ1bmN0aW9uIFZlY3Rvcih4LCB5KSB7XHJcbiAgICAgICAgaWYgKHggPT09IHZvaWQgMCkgeyB4ID0gMDsgfVxyXG4gICAgICAgIGlmICh5ID09PSB2b2lkIDApIHsgeSA9IDA7IH1cclxuICAgICAgICB0aGlzLnggPSB4O1xyXG4gICAgICAgIHRoaXMueSA9IHk7XHJcbiAgICB9XHJcbiAgICBWZWN0b3IucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uICh2ZWN0b3IpIHtcclxuICAgICAgICB0aGlzLnggKz0gdmVjdG9yLng7XHJcbiAgICAgICAgdGhpcy55ICs9IHZlY3Rvci55O1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfTtcclxuICAgIFZlY3Rvci5wcm90b3R5cGUuc3ViID0gZnVuY3Rpb24gKHZlY3Rvcikge1xyXG4gICAgICAgIHRoaXMueCAtPSB2ZWN0b3IueDtcclxuICAgICAgICB0aGlzLnkgLT0gdmVjdG9yLnk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9O1xyXG4gICAgVmVjdG9yLnByb3RvdHlwZS5sZW5ndGggPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIE1hdGgucG93KHRoaXMueCAqIHRoaXMueCArIHRoaXMueSAqIHRoaXMueSwgMC41KTtcclxuICAgIH07XHJcbiAgICBWZWN0b3IucHJvdG90eXBlLm5vcm1hbGl6ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgbGVuZ3RoID0gdGhpcy5sZW5ndGgoKTtcclxuICAgICAgICByZXR1cm4gdGhpcy5zY2FsZSgxIC8gbGVuZ3RoKTtcclxuICAgIH07XHJcbiAgICBWZWN0b3IucHJvdG90eXBlLnNjYWxlID0gZnVuY3Rpb24gKHNjYWxhcikge1xyXG4gICAgICAgIHRoaXMueCAqPSBzY2FsYXI7XHJcbiAgICAgICAgdGhpcy55ICo9IHNjYWxhcjtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH07XHJcbiAgICBWZWN0b3IucHJvdG90eXBlLnJvdGF0ZSA9IGZ1bmN0aW9uIChyLCBvcmlnaW4pIHtcclxuICAgICAgICBpZiAob3JpZ2luID09PSB2b2lkIDApIHsgb3JpZ2luID0gbmV3IFZlY3RvcigpOyB9XHJcbiAgICAgICAgdmFyIG9mZnNldCA9IHRoaXMuYygpLnN1YihvcmlnaW4pO1xyXG4gICAgICAgIHZhciB4ID0gb2Zmc2V0LnggKiBNYXRoLmNvcyhyKSAtIG9mZnNldC55ICogTWF0aC5zaW4ocik7XHJcbiAgICAgICAgdmFyIHkgPSBvZmZzZXQueCAqIE1hdGguc2luKHIpICsgb2Zmc2V0LnkgKiBNYXRoLmNvcyhyKTtcclxuICAgICAgICBvZmZzZXQueCA9IHg7XHJcbiAgICAgICAgb2Zmc2V0LnkgPSB5O1xyXG4gICAgICAgIHZhciBiYWNrID0gb2Zmc2V0LmFkZChvcmlnaW4pO1xyXG4gICAgICAgIHRoaXMueCA9IGJhY2sueDtcclxuICAgICAgICB0aGlzLnkgPSBiYWNrLnk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9O1xyXG4gICAgVmVjdG9yLnByb3RvdHlwZS5sZXJwID0gZnVuY3Rpb24gKHZlY3Rvciwgd2VpZ3RoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc2NhbGUoMSAtIHdlaWd0aCkuYWRkKHZlY3Rvci5jKCkuc2NhbGUod2VpZ3RoKSk7XHJcbiAgICB9O1xyXG4gICAgVmVjdG9yLnByb3RvdHlwZS5jID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjdG9yKHRoaXMueCwgdGhpcy55KTtcclxuICAgIH07XHJcbiAgICBWZWN0b3IucHJvdG90eXBlLmVxdWFscyA9IGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgICAgaWYgKHYgPT0gbnVsbClcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIHJldHVybiB0aGlzLnggPT0gdi54ICYmIHRoaXMueSA9PSB2Lnk7XHJcbiAgICB9O1xyXG4gICAgVmVjdG9yLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAodmVjdG9yKSB7XHJcbiAgICAgICAgdGhpcy54ID0gdmVjdG9yLng7XHJcbiAgICAgICAgdGhpcy55ID0gdmVjdG9yLnk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9O1xyXG4gICAgVmVjdG9yLnByb3RvdHlwZS5wZXJwRG90ID0gZnVuY3Rpb24gKHZlY3Rvcikge1xyXG4gICAgICAgIHJldHVybiBNYXRoLmF0YW4yKHRoaXMueCAqIHZlY3Rvci55IC0gdGhpcy55ICogdmVjdG9yLngsIHRoaXMueCAqIHZlY3Rvci54ICsgdGhpcy55ICogdmVjdG9yLnkpO1xyXG4gICAgfTtcclxuICAgIFZlY3Rvci5wcm90b3R5cGUuZHJhdyA9IGZ1bmN0aW9uIChjdHh0KSB7XHJcbiAgICAgICAgdmFyIHdpZHRoID0gMTA7XHJcbiAgICAgICAgdmFyIGhhbGYgPSB3aWR0aCAvIDI7XHJcbiAgICAgICAgY3R4dC5maWxsUmVjdCh0aGlzLnggLSBoYWxmLCB0aGlzLnkgLSBoYWxmLCB3aWR0aCwgd2lkdGgpO1xyXG4gICAgfTtcclxuICAgIFZlY3Rvci5wcm90b3R5cGUubG9vcCA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xyXG4gICAgICAgIGZvciAodmFyIHggPSAwOyB4IDwgdGhpcy54OyB4KyspIHtcclxuICAgICAgICAgICAgZm9yICh2YXIgeSA9IDA7IHkgPCB0aGlzLnk7IHkrKykge1xyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobmV3IFZlY3Rvcih4LCB5KSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgVmVjdG9yLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHsgeDogdGhpcy54LCB5OiB0aGlzLnkgfTtcclxuICAgIH07XHJcbiAgICBWZWN0b3IuZGVzZXJpYWxpemUgPSBmdW5jdGlvbiAob2JqZWN0KSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWN0b3Iob2JqZWN0LngsIG9iamVjdC55KTtcclxuICAgIH07XHJcbiAgICByZXR1cm4gVmVjdG9yO1xyXG59KCkpO1xyXG5tb2R1bGUuZXhwb3J0cyA9IFZlY3RvcjtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9dmVjdG9yLmpzLm1hcCJdfQ==
