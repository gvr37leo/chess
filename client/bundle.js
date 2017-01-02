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
        this.lastMoveTo = null;
        this.lastMoveFrom = null;
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
            if (_this.lastMoveFrom && v.equals(_this.lastMoveFrom))
                ctxt.fillStyle = "#404";
            if (_this.lastMoveTo && v.equals(_this.lastMoveTo))
                ctxt.fillStyle = "#a0a";
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
        var lastMoveFrom;
        if (this.lastMoveFrom)
            lastMoveFrom = this.lastMoveFrom.serialize();
        var lastMoveTo;
        if (this.lastMoveTo)
            lastMoveTo = this.lastMoveTo.serialize();
        var serialized = {
            size: this.size.serialize(),
            squareSize: this.squareSize.serialize(),
            grid: grid,
            turn: this.turn,
            selected: selected,
            lastMoveFrom: lastMoveFrom,
            lastMoveTo: lastMoveTo
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
        if (object.lastMoveFrom)
            chessBoard.lastMoveFrom = Vector.deserialize(object.lastMoveFrom);
        if (object.lastMoveTo)
            chessBoard.lastMoveTo = Vector.deserialize(object.lastMoveTo);
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
        var size = this.chessBoard.squareSize.x;
        var halfsize = size / 2;
        ctxt.drawImage(this.image, offset.x + 0.5 + this.pos.x * squareSize.x + squareSize.x / 2 - halfsize, offset.y + 0.5 + this.pos.y * squareSize.y + squareSize.y / 2 - halfsize, size, size);
    };
    ChessPiece.prototype.tryMove = function (to) {
        if (this.posChecker(this, this.chessBoard)[to.x][to.y]) {
            this.chessBoard.lastMoveFrom = this.pos.c();
            this.chessBoard.lastMoveTo = to.c();
            var fromTO = to.c().sub(this.pos);
            if (this.type == Type.king && fromTO.length() == 2) {
                fromTO.normalize();
                var rook = getPieceInDirection(this.pos, fromTO, Type.rook, this.chessBoard);
                rook.move(this.pos.c().add(fromTO)); //assumes rook has been found because posChecker saw this as a legal move
            }
            var piece = this.chessBoard.grid[to.x][to.y]; //check if hit piece is king
            if (piece && piece.type == Type.king)
                EventHandler.trigger('gameOver', piece);
            this.move(to);
            if (this.type == Type.pawn) {
                if (this.team == Team.Black && this.pos.y == this.chessBoard.size.y - 1
                    || this.team == Team.White && this.pos.y == 0) {
                    this.type = Type.queen;
                    this.posChecker = checkMap.get(Type.queen);
                }
            }
            if (this.chessBoard.turn == Team.Black)
                this.chessBoard.turn = Team.White; //switch turn
            else
                this.chessBoard.turn = Team.Black;
            return true;
        }
        return false;
    };
    ChessPiece.prototype.move = function (to) {
        this.chessBoard.grid[to.x][to.y] = this; //move this piece to requested spot
        this.chessBoard.grid[this.pos.x][this.pos.y] = null;
        this.pos = to;
        this.moved = true;
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
    var legalMoves = movesStamp(moves, c);
    if (!c.moved) {
        var aabb = new AABB(new Vector(), c.chessBoard.size.c().sub(new Vector(1, 1)));
        var opens = Utils.create2dArray(c.chessBoard.size, false);
        var rookDirections = [
            new Vector(1, 0),
            new Vector(-1, 0),
            new Vector(0, 1),
            new Vector(0, -1)
        ];
        for (var _i = 0, rookDirections_1 = rookDirections; _i < rookDirections_1.length; _i++) {
            var direction = rookDirections_1[_i];
            var currentCheckingPos = c.pos.c();
            while (true) {
                currentCheckingPos.add(direction);
                if (aabb.collide(currentCheckingPos)) {
                    var piece = c.chessBoard.grid[currentCheckingPos.x][currentCheckingPos.y];
                    if (piece == null)
                        continue;
                    else {
                        if (piece.team == c.team && piece.type == Type.rook && !piece.moved) {
                            var jumpPos = c.pos.c().add(direction.c().scale(2));
                            legalMoves[jumpPos.x][jumpPos.y] = true;
                        }
                        else
                            break;
                    }
                }
                else
                    break;
            }
        }
    }
    return legalMoves;
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
function getPieceInDirection(from, direction, type, chessBoard) {
    var aabb = new AABB(new Vector(), chessBoard.size.c().sub(new Vector(1, 1)));
    var currentCheckingPos = from.c();
    while (true) {
        currentCheckingPos.add(direction);
        if (aabb.collide(currentCheckingPos)) {
            var piece = chessBoard.grid[currentCheckingPos.x][currentCheckingPos.y];
            if (piece && piece.type == type)
                return piece;
        }
        else
            break;
    }
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
var socket;
if (window.location.href == 'http://localhost:8000/')
    socket = new WebSocket("ws://localhost:8000/");
else
    socket = new WebSocket("wss://paulchess.herokuapp.com/");
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL1Byb2dyYW0gRmlsZXMvbm9kZWpzNjMvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJvdXQvQUFCQi5qcyIsIm91dC9DaGVzc0JvYXJkLmpzIiwib3V0L0NoZXNzUGllY2UuanMiLCJvdXQvV2ViSU9DLmpzIiwib3V0L2V2ZW50SGFuZGxlci5qcyIsIm91dC9tYWluLmpzIiwib3V0L3V0aWxzLmpzIiwib3V0L3ZlY3Rvci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIFV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xyXG52YXIgQUFCQiA9IChmdW5jdGlvbiAoKSB7XHJcbiAgICBmdW5jdGlvbiBBQUJCKHBvcywgc2l6ZSkge1xyXG4gICAgICAgIHRoaXMucG9zID0gcG9zO1xyXG4gICAgICAgIHRoaXMuc2l6ZSA9IHNpemU7XHJcbiAgICB9XHJcbiAgICBBQUJCLmZyb21WZWN0b3JzID0gZnVuY3Rpb24gKGEpIHtcclxuICAgICAgICB2YXIgc21hbGwgPSBhWzBdO1xyXG4gICAgICAgIHZhciBiaWcgPSBhW2EubGVuZ3RoIC0gMV07XHJcbiAgICAgICAgZm9yICh2YXIgX2kgPSAwLCBhXzEgPSBhOyBfaSA8IGFfMS5sZW5ndGg7IF9pKyspIHtcclxuICAgICAgICAgICAgdmFyIHYgPSBhXzFbX2ldO1xyXG4gICAgICAgICAgICBpZiAodi54IDwgc21hbGwueClcclxuICAgICAgICAgICAgICAgIHNtYWxsLnggPSB2Lng7XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKHYueCA+IGJpZy54KVxyXG4gICAgICAgICAgICAgICAgYmlnLnggPSB2Lng7XHJcbiAgICAgICAgICAgIGlmICh2LnkgPCBzbWFsbC55KVxyXG4gICAgICAgICAgICAgICAgc21hbGwueSA9IHYueTtcclxuICAgICAgICAgICAgZWxzZSBpZiAodi55ID4gYmlnLnkpXHJcbiAgICAgICAgICAgICAgICBiaWcueSA9IHYueTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG5ldyBBQUJCKHNtYWxsLCBiaWcuc3ViKHNtYWxsKSk7XHJcbiAgICB9O1xyXG4gICAgQUFCQi5wcm90b3R5cGUuY29udGFpbnMgPSBmdW5jdGlvbiAoYWFiYikge1xyXG4gICAgICAgIHJldHVybiBVdGlscy5yYW5nZUNvbnRhaW4odGhpcy5wb3MueCwgdGhpcy5zaXplLnggKyB0aGlzLnBvcy54LCBhYWJiLnBvcy54LCBhYWJiLnNpemUueCArIGFhYmIucG9zLngpXHJcbiAgICAgICAgICAgICYmIFV0aWxzLnJhbmdlQ29udGFpbih0aGlzLnBvcy55LCB0aGlzLnNpemUueSArIHRoaXMucG9zLnksIGFhYmIucG9zLnksIGFhYmIuc2l6ZS55ICsgYWFiYi5wb3MueSk7XHJcbiAgICB9O1xyXG4gICAgQUFCQi5wcm90b3R5cGUuY29sbGlkZSA9IGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgICAgcmV0dXJuIFV0aWxzLmluUmFuZ2UodGhpcy5wb3MueCwgdGhpcy5zaXplLnggKyB0aGlzLnBvcy54LCB2LngpICYmIFV0aWxzLmluUmFuZ2UodGhpcy5wb3MueSwgdGhpcy5zaXplLnkgKyB0aGlzLnBvcy55LCB2LnkpO1xyXG4gICAgfTtcclxuICAgIHJldHVybiBBQUJCO1xyXG59KCkpO1xyXG5tb2R1bGUuZXhwb3J0cyA9IEFBQkI7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPUFBQkIuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBWZWN0b3IgPSByZXF1aXJlKCcuL3ZlY3RvcicpO1xyXG52YXIgVXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XHJcbnZhciBDaGVzc1BpZWNlID0gcmVxdWlyZSgnLi9DaGVzc1BpZWNlJyk7XHJcbnZhciBUZWFtO1xyXG4oZnVuY3Rpb24gKFRlYW0pIHtcclxuICAgIFRlYW1bVGVhbVtcIkJsYWNrXCJdID0gMF0gPSBcIkJsYWNrXCI7XHJcbiAgICBUZWFtW1RlYW1bXCJXaGl0ZVwiXSA9IDFdID0gXCJXaGl0ZVwiO1xyXG59KShUZWFtIHx8IChUZWFtID0ge30pKTtcclxudmFyIENoZXNzQm9hcmQgPSAoZnVuY3Rpb24gKCkge1xyXG4gICAgZnVuY3Rpb24gQ2hlc3NCb2FyZCgpIHtcclxuICAgICAgICB0aGlzLmxhc3RNb3ZlVG8gPSBudWxsO1xyXG4gICAgICAgIHRoaXMubGFzdE1vdmVGcm9tID0gbnVsbDtcclxuICAgICAgICB0aGlzLnNpemUgPSBuZXcgVmVjdG9yKDgsIDgpO1xyXG4gICAgICAgIHRoaXMuc3F1YXJlU2l6ZSA9IG5ldyBWZWN0b3IoNTAsIDUwKTtcclxuICAgICAgICB0aGlzLnR1cm4gPSBUZWFtLldoaXRlO1xyXG4gICAgICAgIHRoaXMuZ3JpZCA9IFV0aWxzLmNyZWF0ZTJkQXJyYXkodGhpcy5zaXplLCBudWxsKTtcclxuICAgIH1cclxuICAgIENoZXNzQm9hcmQucHJvdG90eXBlLnRyeUZyb21UbyA9IGZ1bmN0aW9uIChmcm9tLCB0bykge1xyXG4gICAgICAgIHZhciBmcm9tUGllY2UgPSB0aGlzLmdyaWRbZnJvbS54XVtmcm9tLnldOyAvL2NvdWxkIG91dG9mcmFuZ2UgZnJvbSBiYWRjbGllbnRcclxuICAgICAgICByZXR1cm4gZnJvbVBpZWNlLnRyeU1vdmUodG8pO1xyXG4gICAgfTtcclxuICAgIENoZXNzQm9hcmQucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbiAoY3R4dCwgb2Zmc2V0KSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICB2YXIgbGVnYWxzU3BvdHM7XHJcbiAgICAgICAgaWYgKHRoaXMuc2VsZWN0ZWQpXHJcbiAgICAgICAgICAgIGxlZ2Fsc1Nwb3RzID0gdGhpcy5zZWxlY3RlZC5wb3NDaGVja2VyKHRoaXMuc2VsZWN0ZWQsIHRoaXMpO1xyXG4gICAgICAgIHRoaXMuc2l6ZS5sb29wKGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgICAgICAgIGlmICgodi54ICsgdi55KSAlIDIgPT0gMClcclxuICAgICAgICAgICAgICAgIGN0eHQuZmlsbFN0eWxlID0gXCIjZmZmXCI7XHJcbiAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgIGN0eHQuZmlsbFN0eWxlID0gXCIjMDAwXCI7XHJcbiAgICAgICAgICAgIGlmIChfdGhpcy5zZWxlY3RlZCAmJiB2LmVxdWFscyhfdGhpcy5zZWxlY3RlZC5wb3MpKVxyXG4gICAgICAgICAgICAgICAgY3R4dC5maWxsU3R5bGUgPSBcIiMwZmZcIjtcclxuICAgICAgICAgICAgaWYgKF90aGlzLmxhc3RNb3ZlRnJvbSAmJiB2LmVxdWFscyhfdGhpcy5sYXN0TW92ZUZyb20pKVxyXG4gICAgICAgICAgICAgICAgY3R4dC5maWxsU3R5bGUgPSBcIiM0MDRcIjtcclxuICAgICAgICAgICAgaWYgKF90aGlzLmxhc3RNb3ZlVG8gJiYgdi5lcXVhbHMoX3RoaXMubGFzdE1vdmVUbykpXHJcbiAgICAgICAgICAgICAgICBjdHh0LmZpbGxTdHlsZSA9IFwiI2EwYVwiO1xyXG4gICAgICAgICAgICBpZiAoX3RoaXMuc2VsZWN0ZWQgJiYgbGVnYWxzU3BvdHNbdi54XVt2LnldKVxyXG4gICAgICAgICAgICAgICAgY3R4dC5maWxsU3R5bGUgPSBcIiNmMDBcIjtcclxuICAgICAgICAgICAgY3R4dC5maWxsUmVjdCh2LnggKiBfdGhpcy5zcXVhcmVTaXplLnggKyBvZmZzZXQueCwgdi55ICogX3RoaXMuc3F1YXJlU2l6ZS55ICsgb2Zmc2V0LnksIF90aGlzLnNxdWFyZVNpemUueCwgX3RoaXMuc3F1YXJlU2l6ZS55KTtcclxuICAgICAgICAgICAgaWYgKF90aGlzLmdyaWRbdi54XVt2LnldKSB7XHJcbiAgICAgICAgICAgICAgICBfdGhpcy5ncmlkW3YueF1bdi55XS5kcmF3KGN0eHQsIF90aGlzLnNxdWFyZVNpemUsIG9mZnNldCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH07XHJcbiAgICBDaGVzc0JvYXJkLnByb3RvdHlwZS52ZWN0b3JUb0dyaWRQb3MgPSBmdW5jdGlvbiAodikge1xyXG4gICAgICAgIHZhciBuID0gbmV3IFZlY3RvcigpO1xyXG4gICAgICAgIG4ueCA9IE1hdGguZmxvb3Iodi54IC8gdGhpcy5zcXVhcmVTaXplLngpO1xyXG4gICAgICAgIG4ueSA9IE1hdGguZmxvb3Iodi55IC8gdGhpcy5zcXVhcmVTaXplLnkpO1xyXG4gICAgICAgIHJldHVybiBuO1xyXG4gICAgfTtcclxuICAgIENoZXNzQm9hcmQucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIChjKSB7XHJcbiAgICAgICAgdGhpcy5ncmlkW2MucG9zLnhdW2MucG9zLnldID0gYztcclxuICAgIH07XHJcbiAgICBDaGVzc0JvYXJkLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICB2YXIgZ3JpZCA9IFV0aWxzLmNyZWF0ZTJkQXJyYXkodGhpcy5zaXplLCBudWxsKTtcclxuICAgICAgICB0aGlzLnNpemUubG9vcChmdW5jdGlvbiAodikge1xyXG4gICAgICAgICAgICBpZiAoX3RoaXMuZ3JpZFt2LnhdW3YueV0pXHJcbiAgICAgICAgICAgICAgICBncmlkW3YueF1bdi55XSA9IF90aGlzLmdyaWRbdi54XVt2LnldLnNlcmlhbGl6ZSgpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHZhciBzZWxlY3RlZDtcclxuICAgICAgICBpZiAodGhpcy5zZWxlY3RlZClcclxuICAgICAgICAgICAgc2VsZWN0ZWQgPSB0aGlzLnNlbGVjdGVkLnNlcmlhbGl6ZSgpO1xyXG4gICAgICAgIHZhciBsYXN0TW92ZUZyb207XHJcbiAgICAgICAgaWYgKHRoaXMubGFzdE1vdmVGcm9tKVxyXG4gICAgICAgICAgICBsYXN0TW92ZUZyb20gPSB0aGlzLmxhc3RNb3ZlRnJvbS5zZXJpYWxpemUoKTtcclxuICAgICAgICB2YXIgbGFzdE1vdmVUbztcclxuICAgICAgICBpZiAodGhpcy5sYXN0TW92ZVRvKVxyXG4gICAgICAgICAgICBsYXN0TW92ZVRvID0gdGhpcy5sYXN0TW92ZVRvLnNlcmlhbGl6ZSgpO1xyXG4gICAgICAgIHZhciBzZXJpYWxpemVkID0ge1xyXG4gICAgICAgICAgICBzaXplOiB0aGlzLnNpemUuc2VyaWFsaXplKCksXHJcbiAgICAgICAgICAgIHNxdWFyZVNpemU6IHRoaXMuc3F1YXJlU2l6ZS5zZXJpYWxpemUoKSxcclxuICAgICAgICAgICAgZ3JpZDogZ3JpZCxcclxuICAgICAgICAgICAgdHVybjogdGhpcy50dXJuLFxyXG4gICAgICAgICAgICBzZWxlY3RlZDogc2VsZWN0ZWQsXHJcbiAgICAgICAgICAgIGxhc3RNb3ZlRnJvbTogbGFzdE1vdmVGcm9tLFxyXG4gICAgICAgICAgICBsYXN0TW92ZVRvOiBsYXN0TW92ZVRvXHJcbiAgICAgICAgfTtcclxuICAgICAgICByZXR1cm4gc2VyaWFsaXplZDtcclxuICAgIH07XHJcbiAgICBDaGVzc0JvYXJkLmRlc2VyaWFsaXplID0gZnVuY3Rpb24gKG9iamVjdCkge1xyXG4gICAgICAgIHZhciBjaGVzc0JvYXJkID0gbmV3IENoZXNzQm9hcmQoKTtcclxuICAgICAgICB2YXIgZ3JpZCA9IFV0aWxzLmNyZWF0ZTJkQXJyYXkoY2hlc3NCb2FyZC5zaXplLCBudWxsKTtcclxuICAgICAgICBjaGVzc0JvYXJkLnNpemUubG9vcChmdW5jdGlvbiAodikge1xyXG4gICAgICAgICAgICBpZiAob2JqZWN0LmdyaWRbdi54XVt2LnldKVxyXG4gICAgICAgICAgICAgICAgZ3JpZFt2LnhdW3YueV0gPSBDaGVzc1BpZWNlLmRlc2VyaWFsaXplKG9iamVjdC5ncmlkW3YueF1bdi55XSwgY2hlc3NCb2FyZCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgY2hlc3NCb2FyZC5ncmlkID0gZ3JpZDtcclxuICAgICAgICBjaGVzc0JvYXJkLnR1cm4gPSBvYmplY3QudHVybjtcclxuICAgICAgICBpZiAob2JqZWN0LnNlbGVjdGVkKVxyXG4gICAgICAgICAgICBjaGVzc0JvYXJkLnNlbGVjdGVkID0gQ2hlc3NQaWVjZS5kZXNlcmlhbGl6ZShvYmplY3Quc2VsZWN0ZWQsIGNoZXNzQm9hcmQpO1xyXG4gICAgICAgIGlmIChvYmplY3QubGFzdE1vdmVGcm9tKVxyXG4gICAgICAgICAgICBjaGVzc0JvYXJkLmxhc3RNb3ZlRnJvbSA9IFZlY3Rvci5kZXNlcmlhbGl6ZShvYmplY3QubGFzdE1vdmVGcm9tKTtcclxuICAgICAgICBpZiAob2JqZWN0Lmxhc3RNb3ZlVG8pXHJcbiAgICAgICAgICAgIGNoZXNzQm9hcmQubGFzdE1vdmVUbyA9IFZlY3Rvci5kZXNlcmlhbGl6ZShvYmplY3QubGFzdE1vdmVUbyk7XHJcbiAgICAgICAgcmV0dXJuIGNoZXNzQm9hcmQ7XHJcbiAgICB9O1xyXG4gICAgcmV0dXJuIENoZXNzQm9hcmQ7XHJcbn0oKSk7XHJcbm1vZHVsZS5leHBvcnRzID0gQ2hlc3NCb2FyZDtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Q2hlc3NCb2FyZC5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIFZlY3RvciA9IHJlcXVpcmUoJy4vdmVjdG9yJyk7XHJcbnZhciBVdGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcclxudmFyIEFBQkIgPSByZXF1aXJlKCcuL0FBQkInKTtcclxudmFyIEV2ZW50SGFuZGxlciA9IHJlcXVpcmUoJy4vZXZlbnRIYW5kbGVyJyk7XHJcbnZhciBUZWFtO1xyXG4oZnVuY3Rpb24gKFRlYW0pIHtcclxuICAgIFRlYW1bVGVhbVtcIkJsYWNrXCJdID0gMF0gPSBcIkJsYWNrXCI7XHJcbiAgICBUZWFtW1RlYW1bXCJXaGl0ZVwiXSA9IDFdID0gXCJXaGl0ZVwiO1xyXG59KShUZWFtIHx8IChUZWFtID0ge30pKTtcclxudmFyIFR5cGU7XHJcbihmdW5jdGlvbiAoVHlwZSkge1xyXG4gICAgVHlwZVtUeXBlW1wicGF3blwiXSA9IDBdID0gXCJwYXduXCI7XHJcbiAgICBUeXBlW1R5cGVbXCJyb29rXCJdID0gMV0gPSBcInJvb2tcIjtcclxuICAgIFR5cGVbVHlwZVtcImtuaWdodFwiXSA9IDJdID0gXCJrbmlnaHRcIjtcclxuICAgIFR5cGVbVHlwZVtcImJpc2hvcFwiXSA9IDNdID0gXCJiaXNob3BcIjtcclxuICAgIFR5cGVbVHlwZVtcInF1ZWVuXCJdID0gNF0gPSBcInF1ZWVuXCI7XHJcbiAgICBUeXBlW1R5cGVbXCJraW5nXCJdID0gNV0gPSBcImtpbmdcIjtcclxufSkoVHlwZSB8fCAoVHlwZSA9IHt9KSk7XHJcbnZhciBDaGVzc1BpZWNlID0gKGZ1bmN0aW9uICgpIHtcclxuICAgIGZ1bmN0aW9uIENoZXNzUGllY2UodHlwZSwgdGVhbSwgcG9zLCBjaGVzc0JvYXJkKSB7XHJcbiAgICAgICAgdGhpcy5tb3ZlZCA9IGZhbHNlO1xyXG4gICAgICAgIGlmICh0eXBlb2YgZG9jdW1lbnQgIT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgICAgICAgICAgaWYgKHRlYW0gPT0gVGVhbS5CbGFjaylcclxuICAgICAgICAgICAgICAgIHRoaXMuaW1hZ2UgPSBpbWFnZU1hcEJbVHlwZVt0eXBlXV07XHJcbiAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgIHRoaXMuaW1hZ2UgPSBpbWFnZU1hcFdbVHlwZVt0eXBlXV07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMucG9zID0gcG9zO1xyXG4gICAgICAgIHRoaXMuY2hlc3NCb2FyZCA9IGNoZXNzQm9hcmQ7XHJcbiAgICAgICAgdGhpcy5wb3NDaGVja2VyID0gY2hlY2tNYXAuZ2V0KHR5cGUpO1xyXG4gICAgICAgIHRoaXMudHlwZSA9IHR5cGU7XHJcbiAgICAgICAgdGhpcy50ZWFtID0gdGVhbTtcclxuICAgIH1cclxuICAgIENoZXNzUGllY2UucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbiAoY3R4dCwgc3F1YXJlU2l6ZSwgb2Zmc2V0KSB7XHJcbiAgICAgICAgdmFyIHNpemUgPSB0aGlzLmNoZXNzQm9hcmQuc3F1YXJlU2l6ZS54O1xyXG4gICAgICAgIHZhciBoYWxmc2l6ZSA9IHNpemUgLyAyO1xyXG4gICAgICAgIGN0eHQuZHJhd0ltYWdlKHRoaXMuaW1hZ2UsIG9mZnNldC54ICsgMC41ICsgdGhpcy5wb3MueCAqIHNxdWFyZVNpemUueCArIHNxdWFyZVNpemUueCAvIDIgLSBoYWxmc2l6ZSwgb2Zmc2V0LnkgKyAwLjUgKyB0aGlzLnBvcy55ICogc3F1YXJlU2l6ZS55ICsgc3F1YXJlU2l6ZS55IC8gMiAtIGhhbGZzaXplLCBzaXplLCBzaXplKTtcclxuICAgIH07XHJcbiAgICBDaGVzc1BpZWNlLnByb3RvdHlwZS50cnlNb3ZlID0gZnVuY3Rpb24gKHRvKSB7XHJcbiAgICAgICAgaWYgKHRoaXMucG9zQ2hlY2tlcih0aGlzLCB0aGlzLmNoZXNzQm9hcmQpW3RvLnhdW3RvLnldKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY2hlc3NCb2FyZC5sYXN0TW92ZUZyb20gPSB0aGlzLnBvcy5jKCk7XHJcbiAgICAgICAgICAgIHRoaXMuY2hlc3NCb2FyZC5sYXN0TW92ZVRvID0gdG8uYygpO1xyXG4gICAgICAgICAgICB2YXIgZnJvbVRPID0gdG8uYygpLnN1Yih0aGlzLnBvcyk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnR5cGUgPT0gVHlwZS5raW5nICYmIGZyb21UTy5sZW5ndGgoKSA9PSAyKSB7XHJcbiAgICAgICAgICAgICAgICBmcm9tVE8ubm9ybWFsaXplKCk7XHJcbiAgICAgICAgICAgICAgICB2YXIgcm9vayA9IGdldFBpZWNlSW5EaXJlY3Rpb24odGhpcy5wb3MsIGZyb21UTywgVHlwZS5yb29rLCB0aGlzLmNoZXNzQm9hcmQpO1xyXG4gICAgICAgICAgICAgICAgcm9vay5tb3ZlKHRoaXMucG9zLmMoKS5hZGQoZnJvbVRPKSk7IC8vYXNzdW1lcyByb29rIGhhcyBiZWVuIGZvdW5kIGJlY2F1c2UgcG9zQ2hlY2tlciBzYXcgdGhpcyBhcyBhIGxlZ2FsIG1vdmVcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB2YXIgcGllY2UgPSB0aGlzLmNoZXNzQm9hcmQuZ3JpZFt0by54XVt0by55XTsgLy9jaGVjayBpZiBoaXQgcGllY2UgaXMga2luZ1xyXG4gICAgICAgICAgICBpZiAocGllY2UgJiYgcGllY2UudHlwZSA9PSBUeXBlLmtpbmcpXHJcbiAgICAgICAgICAgICAgICBFdmVudEhhbmRsZXIudHJpZ2dlcignZ2FtZU92ZXInLCBwaWVjZSk7XHJcbiAgICAgICAgICAgIHRoaXMubW92ZSh0byk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnR5cGUgPT0gVHlwZS5wYXduKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50ZWFtID09IFRlYW0uQmxhY2sgJiYgdGhpcy5wb3MueSA9PSB0aGlzLmNoZXNzQm9hcmQuc2l6ZS55IC0gMVxyXG4gICAgICAgICAgICAgICAgICAgIHx8IHRoaXMudGVhbSA9PSBUZWFtLldoaXRlICYmIHRoaXMucG9zLnkgPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudHlwZSA9IFR5cGUucXVlZW47XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wb3NDaGVja2VyID0gY2hlY2tNYXAuZ2V0KFR5cGUucXVlZW4pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmNoZXNzQm9hcmQudHVybiA9PSBUZWFtLkJsYWNrKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5jaGVzc0JvYXJkLnR1cm4gPSBUZWFtLldoaXRlOyAvL3N3aXRjaCB0dXJuXHJcbiAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgIHRoaXMuY2hlc3NCb2FyZC50dXJuID0gVGVhbS5CbGFjaztcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH07XHJcbiAgICBDaGVzc1BpZWNlLnByb3RvdHlwZS5tb3ZlID0gZnVuY3Rpb24gKHRvKSB7XHJcbiAgICAgICAgdGhpcy5jaGVzc0JvYXJkLmdyaWRbdG8ueF1bdG8ueV0gPSB0aGlzOyAvL21vdmUgdGhpcyBwaWVjZSB0byByZXF1ZXN0ZWQgc3BvdFxyXG4gICAgICAgIHRoaXMuY2hlc3NCb2FyZC5ncmlkW3RoaXMucG9zLnhdW3RoaXMucG9zLnldID0gbnVsbDtcclxuICAgICAgICB0aGlzLnBvcyA9IHRvO1xyXG4gICAgICAgIHRoaXMubW92ZWQgPSB0cnVlO1xyXG4gICAgfTtcclxuICAgIENoZXNzUGllY2UucHJvdG90eXBlLmlzTGVnYWxNb3ZlID0gZnVuY3Rpb24gKHYpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5wb3NDaGVja2VyKHRoaXMsIHRoaXMuY2hlc3NCb2FyZClbdi54XVt2LnldO1xyXG4gICAgfTtcclxuICAgIENoZXNzUGllY2UucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICB0eXBlOiB0aGlzLnR5cGUsXHJcbiAgICAgICAgICAgIHBvczogdGhpcy5wb3Muc2VyaWFsaXplKCksXHJcbiAgICAgICAgICAgIHRlYW06IHRoaXMudGVhbSxcclxuICAgICAgICAgICAgbW92ZWQ6IHRoaXMubW92ZWRcclxuICAgICAgICB9O1xyXG4gICAgfTtcclxuICAgIENoZXNzUGllY2UuZGVzZXJpYWxpemUgPSBmdW5jdGlvbiAob2JqZWN0LCBjaGVzc0JvYXJkKSB7XHJcbiAgICAgICAgdmFyIGMgPSBuZXcgQ2hlc3NQaWVjZShvYmplY3QudHlwZSwgb2JqZWN0LnRlYW0sIFZlY3Rvci5kZXNlcmlhbGl6ZShvYmplY3QucG9zKSwgY2hlc3NCb2FyZCk7XHJcbiAgICAgICAgYy5tb3ZlZCA9IG9iamVjdC5tb3ZlZDtcclxuICAgICAgICByZXR1cm4gYztcclxuICAgIH07XHJcbiAgICByZXR1cm4gQ2hlc3NQaWVjZTtcclxufSgpKTtcclxudmFyIGNoZWNrTWFwID0gbmV3IE1hcCgpO1xyXG5jaGVja01hcC5zZXQoVHlwZS5wYXduLCBmdW5jdGlvbiAoYywgYm9hcmQpIHtcclxuICAgIHZhciBhYWJiID0gbmV3IEFBQkIobmV3IFZlY3RvcigpLCBib2FyZC5zaXplLmMoKS5zdWIobmV3IFZlY3RvcigxLCAxKSkpO1xyXG4gICAgdmFyIG1vdmVzID0gW107XHJcbiAgICB2YXIgZmFjaW5nO1xyXG4gICAgaWYgKGMudGVhbSA9PSBUZWFtLldoaXRlKVxyXG4gICAgICAgIGZhY2luZyA9IG5ldyBWZWN0b3IoMCwgLTEpO1xyXG4gICAgZWxzZVxyXG4gICAgICAgIGZhY2luZyA9IG5ldyBWZWN0b3IoMCwgMSk7XHJcbiAgICB2YXIgd3Nmcm9udCA9IGMucG9zLmMoKS5hZGQoZmFjaW5nKTtcclxuICAgIGlmIChhYWJiLmNvbGxpZGUod3Nmcm9udCkgJiYgYm9hcmQuZ3JpZFt3c2Zyb250LnhdW3dzZnJvbnQueV0gPT0gbnVsbCkge1xyXG4gICAgICAgIG1vdmVzLnB1c2goZmFjaW5nKTtcclxuICAgICAgICB2YXIgZmFyRnJvbnQgPSBmYWNpbmcuYygpLnNjYWxlKDIpO1xyXG4gICAgICAgIHZhciB3c0ZhckZyb250ID0gYy5wb3MuYygpLmFkZChmYXJGcm9udCk7XHJcbiAgICAgICAgaWYgKCFjLm1vdmVkICYmIGFhYmIuY29sbGlkZSh3c0ZhckZyb250KSAmJiBib2FyZC5ncmlkW3dzRmFyRnJvbnQueF1bd3NGYXJGcm9udC55XSA9PSBudWxsKVxyXG4gICAgICAgICAgICBtb3Zlcy5wdXNoKGZhckZyb250KTtcclxuICAgIH1cclxuICAgIHZhciB3ZXN0ID0gbmV3IFZlY3RvcigxLCAwKS5hZGQoZmFjaW5nKTtcclxuICAgIHZhciB3c3dlc3QgPSB3ZXN0LmMoKS5hZGQoYy5wb3MpO1xyXG4gICAgaWYgKGFhYmIuY29sbGlkZSh3c3dlc3QpICYmIGJvYXJkLmdyaWRbd3N3ZXN0LnhdW3dzd2VzdC55XSAhPSBudWxsICYmIGJvYXJkLmdyaWRbd3N3ZXN0LnhdW3dzd2VzdC55XS50ZWFtICE9IGMudGVhbSlcclxuICAgICAgICBtb3Zlcy5wdXNoKHdlc3QpO1xyXG4gICAgdmFyIGVhc3QgPSBuZXcgVmVjdG9yKC0xLCAwKS5hZGQoZmFjaW5nKTtcclxuICAgIHZhciB3c2Vhc3QgPSBlYXN0LmMoKS5hZGQoYy5wb3MpO1xyXG4gICAgaWYgKGFhYmIuY29sbGlkZSh3c2Vhc3QpICYmIGJvYXJkLmdyaWRbd3NlYXN0LnhdW3dzZWFzdC55XSAhPSBudWxsICYmIGJvYXJkLmdyaWRbd3NlYXN0LnhdW3dzZWFzdC55XS50ZWFtICE9IGMudGVhbSlcclxuICAgICAgICBtb3Zlcy5wdXNoKGVhc3QpO1xyXG4gICAgcmV0dXJuIG1vdmVzU3RhbXAobW92ZXMsIGMpO1xyXG59KTtcclxuY2hlY2tNYXAuc2V0KFR5cGUucm9vaywgZnVuY3Rpb24gKGMsIGdyaWQpIHtcclxuICAgIHZhciBkaXJlY3Rpb25zID0gW1xyXG4gICAgICAgIG5ldyBWZWN0b3IoMSwgMCksXHJcbiAgICAgICAgbmV3IFZlY3RvcigtMSwgMCksXHJcbiAgICAgICAgbmV3IFZlY3RvcigwLCAxKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDAsIC0xKVxyXG4gICAgXTtcclxuICAgIHJldHVybiBkaXJlY3Rpb25TdGFtcChkaXJlY3Rpb25zLCBjKTtcclxufSk7XHJcbmNoZWNrTWFwLnNldChUeXBlLmtuaWdodCwgZnVuY3Rpb24gKGMsIGdyaWQpIHtcclxuICAgIHZhciBtb3ZlcyA9IFtcclxuICAgICAgICBuZXcgVmVjdG9yKDEsIC0yKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDIsIC0xKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDIsIDEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoMSwgMiksXHJcbiAgICAgICAgbmV3IFZlY3RvcigtMSwgMiksXHJcbiAgICAgICAgbmV3IFZlY3RvcigtMiwgMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigtMiwgLTEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTEsIC0yKVxyXG4gICAgXTtcclxuICAgIHJldHVybiBtb3Zlc1N0YW1wKG1vdmVzLCBjKTtcclxufSk7XHJcbmNoZWNrTWFwLnNldChUeXBlLmJpc2hvcCwgZnVuY3Rpb24gKGMsIGdyaWQpIHtcclxuICAgIHZhciBkaXJlY3Rpb25zID0gW1xyXG4gICAgICAgIG5ldyBWZWN0b3IoMSwgMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigtMSwgLTEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoMSwgLTEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTEsIDEpXHJcbiAgICBdO1xyXG4gICAgcmV0dXJuIGRpcmVjdGlvblN0YW1wKGRpcmVjdGlvbnMsIGMpO1xyXG59KTtcclxuY2hlY2tNYXAuc2V0KFR5cGUucXVlZW4sIGZ1bmN0aW9uIChjKSB7XHJcbiAgICB2YXIgZGlyZWN0aW9ucyA9IFtcclxuICAgICAgICBuZXcgVmVjdG9yKDEsIDEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTEsIC0xKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDEsIC0xKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0xLCAxKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDEsIDApLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTEsIDApLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoMCwgMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigwLCAtMSlcclxuICAgIF07XHJcbiAgICByZXR1cm4gZGlyZWN0aW9uU3RhbXAoZGlyZWN0aW9ucywgYyk7XHJcbn0pO1xyXG5jaGVja01hcC5zZXQoVHlwZS5raW5nLCBmdW5jdGlvbiAoYywgZ3JpZCkge1xyXG4gICAgdmFyIG1vdmVzID0gW1xyXG4gICAgICAgIG5ldyBWZWN0b3IoMCwgMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigxLCAxKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDEsIDApLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoMSwgLTEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoMCwgLTEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTEsIC0xKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0xLCAwKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0xLCAxKSxcclxuICAgIF07XHJcbiAgICB2YXIgbGVnYWxNb3ZlcyA9IG1vdmVzU3RhbXAobW92ZXMsIGMpO1xyXG4gICAgaWYgKCFjLm1vdmVkKSB7XHJcbiAgICAgICAgdmFyIGFhYmIgPSBuZXcgQUFCQihuZXcgVmVjdG9yKCksIGMuY2hlc3NCb2FyZC5zaXplLmMoKS5zdWIobmV3IFZlY3RvcigxLCAxKSkpO1xyXG4gICAgICAgIHZhciBvcGVucyA9IFV0aWxzLmNyZWF0ZTJkQXJyYXkoYy5jaGVzc0JvYXJkLnNpemUsIGZhbHNlKTtcclxuICAgICAgICB2YXIgcm9va0RpcmVjdGlvbnMgPSBbXHJcbiAgICAgICAgICAgIG5ldyBWZWN0b3IoMSwgMCksXHJcbiAgICAgICAgICAgIG5ldyBWZWN0b3IoLTEsIDApLFxyXG4gICAgICAgICAgICBuZXcgVmVjdG9yKDAsIDEpLFxyXG4gICAgICAgICAgICBuZXcgVmVjdG9yKDAsIC0xKVxyXG4gICAgICAgIF07XHJcbiAgICAgICAgZm9yICh2YXIgX2kgPSAwLCByb29rRGlyZWN0aW9uc18xID0gcm9va0RpcmVjdGlvbnM7IF9pIDwgcm9va0RpcmVjdGlvbnNfMS5sZW5ndGg7IF9pKyspIHtcclxuICAgICAgICAgICAgdmFyIGRpcmVjdGlvbiA9IHJvb2tEaXJlY3Rpb25zXzFbX2ldO1xyXG4gICAgICAgICAgICB2YXIgY3VycmVudENoZWNraW5nUG9zID0gYy5wb3MuYygpO1xyXG4gICAgICAgICAgICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgICAgICAgICAgICAgY3VycmVudENoZWNraW5nUG9zLmFkZChkaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICAgICAgaWYgKGFhYmIuY29sbGlkZShjdXJyZW50Q2hlY2tpbmdQb3MpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBpZWNlID0gYy5jaGVzc0JvYXJkLmdyaWRbY3VycmVudENoZWNraW5nUG9zLnhdW2N1cnJlbnRDaGVja2luZ1Bvcy55XTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocGllY2UgPT0gbnVsbClcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwaWVjZS50ZWFtID09IGMudGVhbSAmJiBwaWVjZS50eXBlID09IFR5cGUucm9vayAmJiAhcGllY2UubW92ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBqdW1wUG9zID0gYy5wb3MuYygpLmFkZChkaXJlY3Rpb24uYygpLnNjYWxlKDIpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxlZ2FsTW92ZXNbanVtcFBvcy54XVtqdW1wUG9zLnldID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbGVnYWxNb3ZlcztcclxufSk7XHJcbmZ1bmN0aW9uIGZpbHRlck1vdmVzT2ZmQm9hcmQobW92ZXMsIHNpemUsIHBvcykge1xyXG4gICAgdmFyIGxlZ2FsTW92ZXMgPSBbXTtcclxuICAgIHZhciBhYWJiID0gbmV3IEFBQkIobmV3IFZlY3RvcigpLCBzaXplLmMoKS5zdWIobmV3IFZlY3RvcigxLCAxKSkpO1xyXG4gICAgZm9yICh2YXIgX2kgPSAwLCBtb3Zlc18xID0gbW92ZXM7IF9pIDwgbW92ZXNfMS5sZW5ndGg7IF9pKyspIHtcclxuICAgICAgICB2YXIgbW92ZSA9IG1vdmVzXzFbX2ldO1xyXG4gICAgICAgIHZhciB3cyA9IG1vdmUuYygpLmFkZChwb3MpO1xyXG4gICAgICAgIGlmIChhYWJiLmNvbGxpZGUod3MpKVxyXG4gICAgICAgICAgICBsZWdhbE1vdmVzLnB1c2gobW92ZSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbGVnYWxNb3ZlcztcclxufVxyXG5mdW5jdGlvbiBkaXJlY3Rpb25TdGFtcChkaXJlY3Rpb25zLCBjKSB7XHJcbiAgICB2YXIgYWFiYiA9IG5ldyBBQUJCKG5ldyBWZWN0b3IoKSwgYy5jaGVzc0JvYXJkLnNpemUuYygpLnN1YihuZXcgVmVjdG9yKDEsIDEpKSk7XHJcbiAgICB2YXIgb3BlbnMgPSBVdGlscy5jcmVhdGUyZEFycmF5KGMuY2hlc3NCb2FyZC5zaXplLCBmYWxzZSk7XHJcbiAgICBmb3IgKHZhciBfaSA9IDAsIGRpcmVjdGlvbnNfMSA9IGRpcmVjdGlvbnM7IF9pIDwgZGlyZWN0aW9uc18xLmxlbmd0aDsgX2krKykge1xyXG4gICAgICAgIHZhciBkaXJlY3Rpb24gPSBkaXJlY3Rpb25zXzFbX2ldO1xyXG4gICAgICAgIHZhciBjdXJyZW50Q2hlY2tpbmdQb3MgPSBjLnBvcy5jKCk7XHJcbiAgICAgICAgd2hpbGUgKHRydWUpIHtcclxuICAgICAgICAgICAgY3VycmVudENoZWNraW5nUG9zLmFkZChkaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICBpZiAoYWFiYi5jb2xsaWRlKGN1cnJlbnRDaGVja2luZ1BvcykpIHtcclxuICAgICAgICAgICAgICAgIHZhciBwaWVjZSA9IGMuY2hlc3NCb2FyZC5ncmlkW2N1cnJlbnRDaGVja2luZ1Bvcy54XVtjdXJyZW50Q2hlY2tpbmdQb3MueV07XHJcbiAgICAgICAgICAgICAgICBpZiAocGllY2UgPT0gbnVsbClcclxuICAgICAgICAgICAgICAgICAgICBvcGVuc1tjdXJyZW50Q2hlY2tpbmdQb3MueF1bY3VycmVudENoZWNraW5nUG9zLnldID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChwaWVjZS50ZWFtICE9IGMudGVhbSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3BlbnNbY3VycmVudENoZWNraW5nUG9zLnhdW2N1cnJlbnRDaGVja2luZ1Bvcy55XSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7IC8vYnJlYWsgaW4gYm90aCBjYXNlcyAoaWYvZWxzZSBzdGF0ZW1lbnQgYm90aCBicmVhaylcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gb3BlbnM7XHJcbn1cclxuZnVuY3Rpb24gbW92ZXNTdGFtcChtb3ZlcywgYykge1xyXG4gICAgdmFyIGFhYmIgPSBuZXcgQUFCQihuZXcgVmVjdG9yKCksIGMuY2hlc3NCb2FyZC5zaXplLmMoKS5zdWIobmV3IFZlY3RvcigxLCAxKSkpO1xyXG4gICAgdmFyIG9wZW5zID0gVXRpbHMuY3JlYXRlMmRBcnJheShjLmNoZXNzQm9hcmQuc2l6ZSwgZmFsc2UpO1xyXG4gICAgZm9yICh2YXIgX2kgPSAwLCBtb3Zlc18yID0gbW92ZXM7IF9pIDwgbW92ZXNfMi5sZW5ndGg7IF9pKyspIHtcclxuICAgICAgICB2YXIgbW92ZSA9IG1vdmVzXzJbX2ldO1xyXG4gICAgICAgIHZhciBjdXJyZW50Q2hlY2tpbmdQb3MgPSBjLnBvcy5jKCk7XHJcbiAgICAgICAgY3VycmVudENoZWNraW5nUG9zLmFkZChtb3ZlKTtcclxuICAgICAgICBpZiAoYWFiYi5jb2xsaWRlKGN1cnJlbnRDaGVja2luZ1BvcykpIHtcclxuICAgICAgICAgICAgdmFyIHBpZWNlID0gYy5jaGVzc0JvYXJkLmdyaWRbY3VycmVudENoZWNraW5nUG9zLnhdW2N1cnJlbnRDaGVja2luZ1Bvcy55XTtcclxuICAgICAgICAgICAgaWYgKHBpZWNlID09IG51bGwgfHwgcGllY2UudGVhbSAhPSBjLnRlYW0pXHJcbiAgICAgICAgICAgICAgICBvcGVuc1tjdXJyZW50Q2hlY2tpbmdQb3MueF1bY3VycmVudENoZWNraW5nUG9zLnldID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gb3BlbnM7XHJcbn1cclxuZnVuY3Rpb24gZ2V0UGllY2VJbkRpcmVjdGlvbihmcm9tLCBkaXJlY3Rpb24sIHR5cGUsIGNoZXNzQm9hcmQpIHtcclxuICAgIHZhciBhYWJiID0gbmV3IEFBQkIobmV3IFZlY3RvcigpLCBjaGVzc0JvYXJkLnNpemUuYygpLnN1YihuZXcgVmVjdG9yKDEsIDEpKSk7XHJcbiAgICB2YXIgY3VycmVudENoZWNraW5nUG9zID0gZnJvbS5jKCk7XHJcbiAgICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgICAgIGN1cnJlbnRDaGVja2luZ1Bvcy5hZGQoZGlyZWN0aW9uKTtcclxuICAgICAgICBpZiAoYWFiYi5jb2xsaWRlKGN1cnJlbnRDaGVja2luZ1BvcykpIHtcclxuICAgICAgICAgICAgdmFyIHBpZWNlID0gY2hlc3NCb2FyZC5ncmlkW2N1cnJlbnRDaGVja2luZ1Bvcy54XVtjdXJyZW50Q2hlY2tpbmdQb3MueV07XHJcbiAgICAgICAgICAgIGlmIChwaWVjZSAmJiBwaWVjZS50eXBlID09IHR5cGUpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcGllY2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbn1cclxudmFyIGltYWdlTWFwQiA9IHt9O1xyXG52YXIgaW1hZ2VNYXBXID0ge307XHJcbmlmICh0eXBlb2YgZG9jdW1lbnQgIT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgIHZhciB0eXBlcyA9IFsncGF3bicsICdyb29rJywgJ2Jpc2hvcCcsICdxdWVlbicsICdraW5nJywgJ2tuaWdodCddO1xyXG4gICAgZm9yICh2YXIgX2kgPSAwLCB0eXBlc18xID0gdHlwZXM7IF9pIDwgdHlwZXNfMS5sZW5ndGg7IF9pKyspIHtcclxuICAgICAgICB2YXIgdHlwZSA9IHR5cGVzXzFbX2ldO1xyXG4gICAgICAgIHZhciBpbWFnZUIgPSBuZXcgSW1hZ2UoKTtcclxuICAgICAgICB2YXIgaW1hZ2VXID0gbmV3IEltYWdlKCk7XHJcbiAgICAgICAgaW1hZ2VCLnNyYyA9ICdyZXNvdXJjZXMvYicgKyB0eXBlICsgJy5wbmcnO1xyXG4gICAgICAgIGltYWdlVy5zcmMgPSAncmVzb3VyY2VzL3cnICsgdHlwZSArICcucG5nJztcclxuICAgICAgICBpbWFnZUIub25sb2FkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBFdmVudEhhbmRsZXIudHJpZ2dlcignaW1hZ2VMb2FkZWQnLCB7fSk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBpbWFnZVcub25sb2FkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBFdmVudEhhbmRsZXIudHJpZ2dlcignaW1hZ2VMb2FkZWQnLCB7fSk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBpbWFnZU1hcEJbdHlwZV0gPSBpbWFnZUI7XHJcbiAgICAgICAgaW1hZ2VNYXBXW3R5cGVdID0gaW1hZ2VXO1xyXG4gICAgfVxyXG59XHJcbnZhciBsZXR0ZXJNYXAgPSBbXTtcclxubGV0dGVyTWFwW1R5cGUuYmlzaG9wXSA9ICdCJztcclxubGV0dGVyTWFwW1R5cGUua2luZ10gPSAnSyc7XHJcbmxldHRlck1hcFtUeXBlLmtuaWdodF0gPSAnSCc7XHJcbmxldHRlck1hcFtUeXBlLnBhd25dID0gJ1AnO1xyXG5sZXR0ZXJNYXBbVHlwZS5xdWVlbl0gPSAnUSc7XHJcbmxldHRlck1hcFtUeXBlLnJvb2tdID0gJ1InO1xyXG5tb2R1bGUuZXhwb3J0cyA9IENoZXNzUGllY2U7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPUNoZXNzUGllY2UuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBXZWJJT0MgPSAoZnVuY3Rpb24gKCkge1xyXG4gICAgZnVuY3Rpb24gV2ViSU9DKHNvY2tldCkge1xyXG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XHJcbiAgICAgICAgdGhpcy5yb3V0ZU1hcCA9IHt9O1xyXG4gICAgICAgIHRoaXMuc29ja2V0Lm9ubWVzc2FnZSA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICB2YXIgZGF0YSA9IGV2ZW50LmRhdGE7XHJcbiAgICAgICAgICAgIHZhciBwYXJzZWREYXRhID0gSlNPTi5wYXJzZShkYXRhKTtcclxuICAgICAgICAgICAgaWYgKF90aGlzLnJvdXRlTWFwW3BhcnNlZERhdGEucm91dGVdKSB7XHJcbiAgICAgICAgICAgICAgICBfdGhpcy5yb3V0ZU1hcFtwYXJzZWREYXRhLnJvdXRlXShwYXJzZWREYXRhKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCc0MDQ6ICcgKyBwYXJzZWREYXRhLnJvdXRlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcbiAgICBXZWJJT0MucHJvdG90eXBlLm9uID0gZnVuY3Rpb24gKHJvdXRlLCBhY3Rpb24pIHtcclxuICAgICAgICB0aGlzLnJvdXRlTWFwW3JvdXRlXSA9IGFjdGlvbjtcclxuICAgIH07XHJcbiAgICBXZWJJT0MucHJvdG90eXBlLnNlbmQgPSBmdW5jdGlvbiAocm91dGUsIHZhbHVlKSB7XHJcbiAgICAgICAgdmFsdWUucm91dGUgPSByb3V0ZTtcclxuICAgICAgICBpZiAodGhpcy5zb2NrZXQucmVhZHlTdGF0ZSA9PSAxKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc29ja2V0LnNlbmQoSlNPTi5zdHJpbmdpZnkodmFsdWUpKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgV2ViSU9DLnByb3RvdHlwZS5vbmNsb3NlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgfTtcclxuICAgIFdlYklPQy5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQuY2xvc2UoKTtcclxuICAgIH07XHJcbiAgICByZXR1cm4gV2ViSU9DO1xyXG59KCkpO1xyXG5tb2R1bGUuZXhwb3J0cyA9IFdlYklPQztcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9V2ViSU9DLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgRXZlbnRIYW5kbGVyID0gKGZ1bmN0aW9uICgpIHtcclxuICAgIGZ1bmN0aW9uIEV2ZW50SGFuZGxlcigpIHtcclxuICAgIH1cclxuICAgIC8vIHN0YXRpYyBnZXRJbnN0YW5jZSgpOkV2ZW50SGFuZGxlcntcclxuICAgIC8vICAgICBpZihFdmVudEhhbmRsZXIuaW5zdGFuY2UgPT0gbnVsbCl7XHJcbiAgICAvLyAgICAgICAgIEV2ZW50SGFuZGxlci5pbnN0YW5jZSA9IG5ldyBFdmVudEhhbmRsZXIoKTtcclxuICAgIC8vICAgICB9XHJcbiAgICAvLyAgICAgcmV0dXJuIEV2ZW50SGFuZGxlci5pbnN0YW5jZTtcclxuICAgIC8vIH1cclxuICAgIEV2ZW50SGFuZGxlci50cmlnZ2VyID0gZnVuY3Rpb24gKGV2ZW50LCBkYXRhKSB7XHJcbiAgICAgICAgaWYgKEV2ZW50SGFuZGxlci5ldmVudE1hcC5nZXQoZXZlbnQpID09IG51bGwpXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICBmb3IgKHZhciBfaSA9IDAsIF9hID0gRXZlbnRIYW5kbGVyLmV2ZW50TWFwLmdldChldmVudCk7IF9pIDwgX2EubGVuZ3RoOyBfaSsrKSB7XHJcbiAgICAgICAgICAgIHZhciBjYWxsYmFjayA9IF9hW19pXTtcclxuICAgICAgICAgICAgY2FsbGJhY2soZGF0YSk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIEV2ZW50SGFuZGxlci5zdWJzY3JpYmUgPSBmdW5jdGlvbiAoZXZlbnQsIGNhbGxiYWNrKSB7XHJcbiAgICAgICAgaWYgKEV2ZW50SGFuZGxlci5ldmVudE1hcC5nZXQoZXZlbnQpID09IG51bGwpXHJcbiAgICAgICAgICAgIEV2ZW50SGFuZGxlci5ldmVudE1hcC5zZXQoZXZlbnQsIFtdKTtcclxuICAgICAgICBFdmVudEhhbmRsZXIuZXZlbnRNYXAuZ2V0KGV2ZW50KS5wdXNoKGNhbGxiYWNrKTtcclxuICAgIH07XHJcbiAgICBFdmVudEhhbmRsZXIuZGV0YWNoID0gZnVuY3Rpb24gKGV2ZW50LCBjYWxsYmFjaykge1xyXG4gICAgICAgIHZhciBzdWJsaXN0ID0gRXZlbnRIYW5kbGVyLmV2ZW50TWFwLmdldChldmVudCk7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdWJsaXN0Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIHZhciBjYWxsYmFja0luTWFwID0gc3VibGlzdFtpXTtcclxuICAgICAgICAgICAgaWYgKGNhbGxiYWNrSW5NYXAgPT0gY2FsbGJhY2spIHtcclxuICAgICAgICAgICAgICAgIHN1Ymxpc3Quc3BsaWNlKGksIDEpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIEV2ZW50SGFuZGxlci5ldmVudE1hcCA9IG5ldyBNYXAoKTtcclxuICAgIHJldHVybiBFdmVudEhhbmRsZXI7XHJcbn0oKSk7XHJcbm1vZHVsZS5leHBvcnRzID0gRXZlbnRIYW5kbGVyO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1ldmVudEhhbmRsZXIuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzJyk7XHJcbnZhciBjdHh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XHJcbnZhciBsYXN0VXBkYXRlID0gRGF0ZS5ub3coKTtcclxudmFyIGR0O1xyXG52YXIgcGkgPSBNYXRoLlBJO1xyXG52YXIgcmVzZXRCdG4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcmVzZXRCdG4nKTtcclxudmFyIHRlYW1MYWJlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyN0ZWFtTGFiZWwnKTtcclxudmFyIHR1cm5MYWJlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyN0dXJuTGFiZWwnKTtcclxudmFyIFZlY3RvciA9IHJlcXVpcmUoJy4vdmVjdG9yJyk7XHJcbnZhciBVdGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcclxudmFyIEV2ZW50SGFuZGxlciA9IHJlcXVpcmUoJy4vZXZlbnRIYW5kbGVyJyk7XHJcbnZhciBDaGVzc0JvYXJkID0gcmVxdWlyZSgnLi9DaGVzc0JvYXJkJyk7XHJcbnZhciBBQUJCID0gcmVxdWlyZSgnLi9BQUJCJyk7XHJcbnZhciBXZWJJT0MgPSByZXF1aXJlKCcuL1dlYklPQycpO1xyXG52YXIgc29ja2V0O1xyXG5pZiAod2luZG93LmxvY2F0aW9uLmhyZWYgPT0gJ2h0dHA6Ly9sb2NhbGhvc3Q6ODAwMC8nKVxyXG4gICAgc29ja2V0ID0gbmV3IFdlYlNvY2tldChcIndzOi8vbG9jYWxob3N0OjgwMDAvXCIpO1xyXG5lbHNlXHJcbiAgICBzb2NrZXQgPSBuZXcgV2ViU29ja2V0KFwid3NzOi8vcGF1bGNoZXNzLmhlcm9rdWFwcC5jb20vXCIpO1xyXG52YXIgd2ViSU9DID0gbmV3IFdlYklPQyhzb2NrZXQpO1xyXG52YXIgVGVhbTtcclxuKGZ1bmN0aW9uIChUZWFtKSB7XHJcbiAgICBUZWFtW1RlYW1bXCJCbGFja1wiXSA9IDBdID0gXCJCbGFja1wiO1xyXG4gICAgVGVhbVtUZWFtW1wiV2hpdGVcIl0gPSAxXSA9IFwiV2hpdGVcIjtcclxufSkoVGVhbSB8fCAoVGVhbSA9IHt9KSk7XHJcbnZhciBUeXBlO1xyXG4oZnVuY3Rpb24gKFR5cGUpIHtcclxuICAgIFR5cGVbVHlwZVtcInBhd25cIl0gPSAwXSA9IFwicGF3blwiO1xyXG4gICAgVHlwZVtUeXBlW1wicm9va1wiXSA9IDFdID0gXCJyb29rXCI7XHJcbiAgICBUeXBlW1R5cGVbXCJrbmlnaHRcIl0gPSAyXSA9IFwia25pZ2h0XCI7XHJcbiAgICBUeXBlW1R5cGVbXCJiaXNob3BcIl0gPSAzXSA9IFwiYmlzaG9wXCI7XHJcbiAgICBUeXBlW1R5cGVbXCJxdWVlblwiXSA9IDRdID0gXCJxdWVlblwiO1xyXG4gICAgVHlwZVtUeXBlW1wia2luZ1wiXSA9IDVdID0gXCJraW5nXCI7XHJcbn0pKFR5cGUgfHwgKFR5cGUgPSB7fSkpO1xyXG52YXIgdGVhbTtcclxudmFyIGNhbnZhc0NvbnRhaW5lciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNjYW52YXMtY29udGFpbmVyJyk7XHJcbmNhbnZhcy53aWR0aCA9IGNhbnZhc0NvbnRhaW5lci5vZmZzZXRXaWR0aCAtIDM7XHJcbmNhbnZhcy5oZWlnaHQgPSBjYW52YXNDb250YWluZXIub2Zmc2V0SGVpZ2h0IC0gMTAwO1xyXG52YXIgaW1hZ2VMb2FkQ291bnRlciA9IDA7XHJcbkV2ZW50SGFuZGxlci5zdWJzY3JpYmUoJ2ltYWdlTG9hZGVkJywgZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgIGltYWdlTG9hZENvdW50ZXIrKztcclxuICAgIGlmIChpbWFnZUxvYWRDb3VudGVyID49IDEyKSB7XHJcbiAgICAgICAgY2hlc3NCb2FyZC5kcmF3KGN0eHQsIG9mZnNldCk7XHJcbiAgICB9XHJcbn0pO1xyXG52YXIgY2hlc3NCb2FyZCA9IG5ldyBDaGVzc0JvYXJkKCk7XHJcbnNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBub3cgPSBEYXRlLm5vdygpO1xyXG4gICAgZHQgPSAobm93IC0gbGFzdFVwZGF0ZSkgLyAxMDAwO1xyXG4gICAgbGFzdFVwZGF0ZSA9IG5vdztcclxuICAgIGR0ID0gVXRpbHMubWluKGR0LCAxKTtcclxuICAgIHVwZGF0ZSgpO1xyXG4gICAgZHJhdygpO1xyXG59LCAxMDAwIC8gNjApO1xyXG52YXIgaGFsZnNpemUgPSBjaGVzc0JvYXJkLnNpemUueCAqIGNoZXNzQm9hcmQuc3F1YXJlU2l6ZS54IC8gMjtcclxudmFyIG9mZnNldCA9IG5ldyBWZWN0b3IoTWF0aC5mbG9vcihjYW52YXMud2lkdGggLyAyIC0gaGFsZnNpemUpLCBNYXRoLmZsb29yKGNhbnZhcy5oZWlnaHQgLyAyIC0gaGFsZnNpemUpKTtcclxuY2hlc3NCb2FyZC5kcmF3KGN0eHQsIG9mZnNldCk7XHJcbnJlc2V0QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xyXG4gICAgd2ViSU9DLnNlbmQoJ3Jlc2V0Jywge30pO1xyXG59KTtcclxud2ViSU9DLm9uKCd1cGRhdGUnLCBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgY2hlc3NCb2FyZCA9IENoZXNzQm9hcmQuZGVzZXJpYWxpemUoZGF0YS5jaGVzc0JvYXJkKTtcclxuICAgIHRlYW0gPSBkYXRhLnRlYW07XHJcbiAgICB0ZWFtTGFiZWwuaW5uZXJIVE1MID0gVGVhbVt0ZWFtXTtcclxuICAgIHR1cm5MYWJlbC5pbm5lckhUTUwgPSBUZWFtW2NoZXNzQm9hcmQudHVybl07XHJcbiAgICBjaGVzc0JvYXJkLmRyYXcoY3R4dCwgb2Zmc2V0KTtcclxufSk7XHJcbmRvY3VtZW50Lm9ubW91c2Vkb3duID0gZnVuY3Rpb24gKGV2dCkge1xyXG4gICAgdmFyIGFhYmIgPSBuZXcgQUFCQihuZXcgVmVjdG9yKCksIGNoZXNzQm9hcmQuc2l6ZS5jKCkuc3ViKG5ldyBWZWN0b3IoMSwgMSkpKTtcclxuICAgIHZhciB2ID0gY2hlc3NCb2FyZC52ZWN0b3JUb0dyaWRQb3MoZ2V0TW91c2VQb3MoY2FudmFzLCBldnQpLnN1YihvZmZzZXQpKTtcclxuICAgIGlmICghYWFiYi5jb2xsaWRlKHYpKSB7XHJcbiAgICAgICAgY2hlc3NCb2FyZC5zZWxlY3RlZCA9IG51bGw7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICB2YXIgcGllY2UgPSBjaGVzc0JvYXJkLmdyaWRbdi54XVt2LnldO1xyXG4gICAgICAgIGlmIChjaGVzc0JvYXJkLnNlbGVjdGVkID09IG51bGwpIHtcclxuICAgICAgICAgICAgaWYgKHBpZWNlICYmIHBpZWNlLnRlYW0gPT0gY2hlc3NCb2FyZC50dXJuICYmIHBpZWNlLnRlYW0gPT0gdGVhbSkge1xyXG4gICAgICAgICAgICAgICAgY2hlc3NCb2FyZC5zZWxlY3RlZCA9IHBpZWNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBpZiAocGllY2UgJiYgcGllY2UudGVhbSA9PSBjaGVzc0JvYXJkLnR1cm4pXHJcbiAgICAgICAgICAgICAgICBjaGVzc0JvYXJkLnNlbGVjdGVkID0gcGllY2U7XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaWYgKGNoZXNzQm9hcmQuc2VsZWN0ZWQuaXNMZWdhbE1vdmUodikpIHtcclxuICAgICAgICAgICAgICAgICAgICB3ZWJJT0Muc2VuZCgnbW92ZScsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZnJvbTogY2hlc3NCb2FyZC5zZWxlY3RlZC5wb3Muc2VyaWFsaXplKCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvOiB2LnNlcmlhbGl6ZSgpXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjaGVzc0JvYXJkLnNlbGVjdGVkID0gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGNoZXNzQm9hcmQuZHJhdyhjdHh0LCBvZmZzZXQpO1xyXG59O1xyXG5mdW5jdGlvbiB1cGRhdGUoKSB7XHJcbn1cclxuZnVuY3Rpb24gZHJhdygpIHtcclxuICAgIC8vY3R4dC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcclxufVxyXG5mdW5jdGlvbiBnZXRNb3VzZVBvcyhjYW52YXMsIGV2dCkge1xyXG4gICAgdmFyIHJlY3QgPSBjYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbiAgICByZXR1cm4gbmV3IFZlY3RvcihldnQuY2xpZW50WCAtIHJlY3QubGVmdCwgZXZ0LmNsaWVudFkgLSByZWN0LnRvcCk7XHJcbn1cclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bWFpbi5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIHV0aWxzO1xyXG4oZnVuY3Rpb24gKHV0aWxzKSB7XHJcbiAgICBmdW5jdGlvbiBtYXAodmFsMSwgc3RhcnQxLCBzdG9wMSwgc3RhcnQyLCBzdG9wMikge1xyXG4gICAgICAgIHJldHVybiBzdGFydDIgKyAoc3RvcDIgLSBzdGFydDIpICogKCh2YWwxIC0gc3RhcnQxKSAvIChzdG9wMSAtIHN0YXJ0MSkpO1xyXG4gICAgfVxyXG4gICAgdXRpbHMubWFwID0gbWFwO1xyXG4gICAgZnVuY3Rpb24gaW5SYW5nZShtaW4sIG1heCwgdmFsdWUpIHtcclxuICAgICAgICBpZiAobWluID4gbWF4KSB7XHJcbiAgICAgICAgICAgIHZhciB0ZW1wID0gbWluO1xyXG4gICAgICAgICAgICBtaW4gPSBtYXg7XHJcbiAgICAgICAgICAgIG1heCA9IHRlbXA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB2YWx1ZSA8PSBtYXggJiYgdmFsdWUgPj0gbWluO1xyXG4gICAgfVxyXG4gICAgdXRpbHMuaW5SYW5nZSA9IGluUmFuZ2U7XHJcbiAgICBmdW5jdGlvbiBtaW4oYSwgYikge1xyXG4gICAgICAgIGlmIChhIDwgYilcclxuICAgICAgICAgICAgcmV0dXJuIGE7XHJcbiAgICAgICAgcmV0dXJuIGI7XHJcbiAgICB9XHJcbiAgICB1dGlscy5taW4gPSBtaW47XHJcbiAgICBmdW5jdGlvbiBtYXgoYSwgYikge1xyXG4gICAgICAgIGlmIChhID4gYilcclxuICAgICAgICAgICAgcmV0dXJuIGE7XHJcbiAgICAgICAgcmV0dXJuIGI7XHJcbiAgICB9XHJcbiAgICB1dGlscy5tYXggPSBtYXg7XHJcbiAgICBmdW5jdGlvbiBjbGFtcCh2YWwsIG1pbiwgbWF4KSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubWF4KHRoaXMubWluKHZhbCwgbWF4KSwgbWluKTtcclxuICAgIH1cclxuICAgIHV0aWxzLmNsYW1wID0gY2xhbXA7XHJcbiAgICBmdW5jdGlvbiByYW5nZUNvbnRhaW4oYTEsIGEyLCBiMSwgYjIpIHtcclxuICAgICAgICByZXR1cm4gbWF4KGExLCBhMikgPj0gbWF4KGIxLCBiMikgJiYgbWluKGExLCBhMikgPD0gbWF4KGIxLCBiMik7XHJcbiAgICB9XHJcbiAgICB1dGlscy5yYW5nZUNvbnRhaW4gPSByYW5nZUNvbnRhaW47XHJcbiAgICBmdW5jdGlvbiBjcmVhdGUyZEFycmF5KHYsIGZpbGwpIHtcclxuICAgICAgICB2YXIgcm93cyA9IG5ldyBBcnJheSh2LngpO1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdi54OyBpKyspIHtcclxuICAgICAgICAgICAgcm93c1tpXSA9IG5ldyBBcnJheSh2LnkpO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IHYueTsgaisrKSB7XHJcbiAgICAgICAgICAgICAgICByb3dzW2ldW2pdID0gZmlsbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcm93cztcclxuICAgIH1cclxuICAgIHV0aWxzLmNyZWF0ZTJkQXJyYXkgPSBjcmVhdGUyZEFycmF5O1xyXG59KSh1dGlscyB8fCAodXRpbHMgPSB7fSkpO1xyXG5tb2R1bGUuZXhwb3J0cyA9IHV0aWxzO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD11dGlscy5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIFZlY3RvciA9IChmdW5jdGlvbiAoKSB7XHJcbiAgICBmdW5jdGlvbiBWZWN0b3IoeCwgeSkge1xyXG4gICAgICAgIGlmICh4ID09PSB2b2lkIDApIHsgeCA9IDA7IH1cclxuICAgICAgICBpZiAoeSA9PT0gdm9pZCAwKSB7IHkgPSAwOyB9XHJcbiAgICAgICAgdGhpcy54ID0geDtcclxuICAgICAgICB0aGlzLnkgPSB5O1xyXG4gICAgfVxyXG4gICAgVmVjdG9yLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiAodmVjdG9yKSB7XHJcbiAgICAgICAgdGhpcy54ICs9IHZlY3Rvci54O1xyXG4gICAgICAgIHRoaXMueSArPSB2ZWN0b3IueTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH07XHJcbiAgICBWZWN0b3IucHJvdG90eXBlLnN1YiA9IGZ1bmN0aW9uICh2ZWN0b3IpIHtcclxuICAgICAgICB0aGlzLnggLT0gdmVjdG9yLng7XHJcbiAgICAgICAgdGhpcy55IC09IHZlY3Rvci55O1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfTtcclxuICAgIFZlY3Rvci5wcm90b3R5cGUubGVuZ3RoID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiBNYXRoLnBvdyh0aGlzLnggKiB0aGlzLnggKyB0aGlzLnkgKiB0aGlzLnksIDAuNSk7XHJcbiAgICB9O1xyXG4gICAgVmVjdG9yLnByb3RvdHlwZS5ub3JtYWxpemUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIGxlbmd0aCA9IHRoaXMubGVuZ3RoKCk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc2NhbGUoMSAvIGxlbmd0aCk7XHJcbiAgICB9O1xyXG4gICAgVmVjdG9yLnByb3RvdHlwZS5zY2FsZSA9IGZ1bmN0aW9uIChzY2FsYXIpIHtcclxuICAgICAgICB0aGlzLnggKj0gc2NhbGFyO1xyXG4gICAgICAgIHRoaXMueSAqPSBzY2FsYXI7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9O1xyXG4gICAgVmVjdG9yLnByb3RvdHlwZS5yb3RhdGUgPSBmdW5jdGlvbiAociwgb3JpZ2luKSB7XHJcbiAgICAgICAgaWYgKG9yaWdpbiA9PT0gdm9pZCAwKSB7IG9yaWdpbiA9IG5ldyBWZWN0b3IoKTsgfVxyXG4gICAgICAgIHZhciBvZmZzZXQgPSB0aGlzLmMoKS5zdWIob3JpZ2luKTtcclxuICAgICAgICB2YXIgeCA9IG9mZnNldC54ICogTWF0aC5jb3MocikgLSBvZmZzZXQueSAqIE1hdGguc2luKHIpO1xyXG4gICAgICAgIHZhciB5ID0gb2Zmc2V0LnggKiBNYXRoLnNpbihyKSArIG9mZnNldC55ICogTWF0aC5jb3Mocik7XHJcbiAgICAgICAgb2Zmc2V0LnggPSB4O1xyXG4gICAgICAgIG9mZnNldC55ID0geTtcclxuICAgICAgICB2YXIgYmFjayA9IG9mZnNldC5hZGQob3JpZ2luKTtcclxuICAgICAgICB0aGlzLnggPSBiYWNrLng7XHJcbiAgICAgICAgdGhpcy55ID0gYmFjay55O1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfTtcclxuICAgIFZlY3Rvci5wcm90b3R5cGUubGVycCA9IGZ1bmN0aW9uICh2ZWN0b3IsIHdlaWd0aCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnNjYWxlKDEgLSB3ZWlndGgpLmFkZCh2ZWN0b3IuYygpLnNjYWxlKHdlaWd0aCkpO1xyXG4gICAgfTtcclxuICAgIFZlY3Rvci5wcm90b3R5cGUuYyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlY3Rvcih0aGlzLngsIHRoaXMueSk7XHJcbiAgICB9O1xyXG4gICAgVmVjdG9yLnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiAodikge1xyXG4gICAgICAgIGlmICh2ID09IG51bGwpXHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICByZXR1cm4gdGhpcy54ID09IHYueCAmJiB0aGlzLnkgPT0gdi55O1xyXG4gICAgfTtcclxuICAgIFZlY3Rvci5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKHZlY3Rvcikge1xyXG4gICAgICAgIHRoaXMueCA9IHZlY3Rvci54O1xyXG4gICAgICAgIHRoaXMueSA9IHZlY3Rvci55O1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfTtcclxuICAgIFZlY3Rvci5wcm90b3R5cGUucGVycERvdCA9IGZ1bmN0aW9uICh2ZWN0b3IpIHtcclxuICAgICAgICByZXR1cm4gTWF0aC5hdGFuMih0aGlzLnggKiB2ZWN0b3IueSAtIHRoaXMueSAqIHZlY3Rvci54LCB0aGlzLnggKiB2ZWN0b3IueCArIHRoaXMueSAqIHZlY3Rvci55KTtcclxuICAgIH07XHJcbiAgICBWZWN0b3IucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbiAoY3R4dCkge1xyXG4gICAgICAgIHZhciB3aWR0aCA9IDEwO1xyXG4gICAgICAgIHZhciBoYWxmID0gd2lkdGggLyAyO1xyXG4gICAgICAgIGN0eHQuZmlsbFJlY3QodGhpcy54IC0gaGFsZiwgdGhpcy55IC0gaGFsZiwgd2lkdGgsIHdpZHRoKTtcclxuICAgIH07XHJcbiAgICBWZWN0b3IucHJvdG90eXBlLmxvb3AgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcclxuICAgICAgICBmb3IgKHZhciB4ID0gMDsgeCA8IHRoaXMueDsgeCsrKSB7XHJcbiAgICAgICAgICAgIGZvciAodmFyIHkgPSAwOyB5IDwgdGhpcy55OyB5KyspIHtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG5ldyBWZWN0b3IoeCwgeSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIFZlY3Rvci5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiB7IHg6IHRoaXMueCwgeTogdGhpcy55IH07XHJcbiAgICB9O1xyXG4gICAgVmVjdG9yLmRlc2VyaWFsaXplID0gZnVuY3Rpb24gKG9iamVjdCkge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjdG9yKG9iamVjdC54LCBvYmplY3QueSk7XHJcbiAgICB9O1xyXG4gICAgcmV0dXJuIFZlY3RvcjtcclxufSgpKTtcclxubW9kdWxlLmV4cG9ydHMgPSBWZWN0b3I7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXZlY3Rvci5qcy5tYXAiXX0=
