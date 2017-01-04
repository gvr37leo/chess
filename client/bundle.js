(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
var Utils = require("./utils");
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
var Vector = require("./vector");
var Utils = require("./utils");
var ChessPiece = require("./ChessPiece");
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
var Vector = require("./vector");
var Utils = require("./utils");
var AABB = require("./AABB");
var EventHandler = require("./eventHandler");
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
    return EventHandler;
}());
EventHandler.eventMap = new Map();
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
var Vector = require("./vector");
var Utils = require("./utils");
var EventHandler = require("./eventHandler");
var ChessBoard = require("./ChessBoard");
var AABB = require("./AABB");
var WebIOC = require("./WebIOC");
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL1Byb2dyYW0gRmlsZXMvbm9kZWpzNjMvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvQUFCQi50cyIsInNyYy9DaGVzc0JvYXJkLnRzIiwic3JjL0NoZXNzUGllY2UudHMiLCJzcmMvV2ViSU9DLnRzIiwic3JjL2V2ZW50SGFuZGxlci50cyIsInNyYy9tYWluLnRzIiwic3JjL3V0aWxzLnRzIiwic3JjL3ZlY3Rvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNDQSwrQkFBaUM7QUFDakM7SUFJSSxjQUFZLEdBQVUsRUFBRSxJQUFXO1FBQy9CLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO1FBQ2YsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7SUFDckIsQ0FBQztJQUVNLGdCQUFXLEdBQWxCLFVBQW1CLENBQVU7UUFDekIsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2pCLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQzFCLEdBQUcsQ0FBQSxDQUFVLFVBQUMsRUFBRCxPQUFDLEVBQUQsZUFBQyxFQUFELElBQUM7WUFBVixJQUFJLENBQUMsVUFBQTtZQUNMLEVBQUUsQ0FBQSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQztnQkFBQSxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxDQUFDLEVBQUUsQ0FBQSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFBQSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDaEMsRUFBRSxDQUFBLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUFBLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLENBQUMsRUFBRSxDQUFBLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUFBLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNuQztRQUNELE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQzNDLENBQUM7SUFFRCx1QkFBUSxHQUFSLFVBQVMsSUFBUztRQUNkLE1BQU0sQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2VBQ2xHLEtBQUssQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNyRyxDQUFDO0lBRUQsc0JBQU8sR0FBUCxVQUFRLENBQVE7UUFDWixNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENB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Q0FBQyxJQUFJLElBQUksQ0FBQztZQUFBLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDbEgsQ0FBQztJQUVELElBQUksSUFBSSxHQUFHLElBQUksTUFBTSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDdEMsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDaEMsRUFBRSxDQUFBLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQztRQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7SUFFcEksSUFBSSxJQUFJLEdBQUcsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3ZDLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ2hDLEVBQUUsQ0FBQSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBRXBJLE1BQU0sQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ2hDLENBQUMsQ0FBQyxDQUFBO0FBRUYsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFVBQVMsQ0FBWSxFQUFFLElBQWU7SUFDMUQsSUFBSSxVQUFVLEdBQUc7UUFDYixJQUFJLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2hCLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNqQixJQUFJLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2hCLElBQUksTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztLQUNwQixDQUFBO0lBQ0QsTUFBTSxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDekMsQ0FBQyxDQUFDLENBQUE7QUFFRixRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsVUFBUyxDQUFZLEVBQUUsSUFBZTtJQUM1RCxJQUFJLEtBQUssR0FBRztRQUNSLElBQUksTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNqQixJQUFJLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDakIsSUFBSSxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNoQixJQUFJLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2hCLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNqQixJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDakIsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbEIsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7S0FDckIsQ0FBQTtJQUNELE1BQU0sQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ2hDLENBQUMsQ0FBQyxDQUFBO0FBRUYsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLFVBQVMsQ0FBWSxFQUFFLElBQWU7SUFDNUQsSUFBSSxVQUFVLEdBQUc7UUFDYixJQUFJLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2hCLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xCLElBQUksTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNqQixJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7S0FDcEIsQ0FBQTtJQUNELE1BQU0sQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3pDLENBQUMsQ0FBQyxDQUFBO0FBRUYsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLFVBQVMsQ0FBWTtJQUMxQyxJQUFJLFVBQVUsR0FBRztRQUNiLElBQUksTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDaEIsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbEIsSUFBSSxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2pCLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNqQixJQUFJLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2hCLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNqQixJQUFJLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2hCLElBQUksTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztLQUNwQixDQUFBO0lBQ0QsTUFBTSxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDekMsQ0FBQyxDQUFDLENBQUE7QUFFRixRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsVUFBUyxDQUFZLEVBQUUsSUFBZTtJQUMxRCxJQUFJLEtBQUssR0FBRztRQUNSLElBQUksTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDaEIsSUFBSSxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNoQixJQUFJLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2hCLElBQUksTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNqQixJQUFJLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDakIsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbEIsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2pCLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztLQUNwQixDQUFBO0lBQ0QsSUFBSSxVQUFVLEdBQUcsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztJQUV0QyxFQUFFLENBQUEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQSxDQUFDO1FBQ1QsSUFBSSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxNQUFNLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM3RSxJQUFJLEtBQUssR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFVLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2xFLElBQUksY0FBYyxHQUFHO1lBQ2pCLElBQUksTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDaEIsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2pCLElBQUksTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDaEIsSUFBSSxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQ3BCLENBQUE7UUFDRCxHQUFHLENBQUEsQ0FBa0IsVUFBYyxFQUFkLGlDQUFjLEVBQWQsNEJBQWMsRUFBZCxJQUFjO1lBQS9CLElBQUksU0FBUyx1QkFBQTtZQUNiLElBQUksa0JBQWtCLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNuQyxPQUFNLElBQUksRUFBQyxDQUFDO2dCQUNSLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtnQkFDakMsRUFBRSxDQUFBLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUEsQ0FBQztvQkFDakMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUE7b0JBQ3pFLEVBQUUsQ0FBQSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUM7d0JBQUEsUUFBUSxDQUFBO29CQUN6QixJQUFJLENBQUEsQ0FBQzt3QkFDRCxFQUFFLENBQUEsQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBLENBQUM7NEJBQ2hFLElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTs0QkFDbkQsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFBO3dCQUMzQyxDQUFDO3dCQUFBLElBQUk7NEJBQUMsS0FBSyxDQUFBO29CQUNmLENBQUM7Z0JBRUwsQ0FBQztnQkFBQSxJQUFJO29CQUFDLEtBQUssQ0FBQTtZQUNmLENBQUM7U0FDSjtJQUNMLENBQUM7SUFFRCxNQUFNLENBQUMsVUFBVSxDQUFBO0FBRXJCLENBQUMsQ0FBQyxDQUFBO0FBRUYsNkJBQTZCLEtBQWMsRUFBRSxJQUFXLEVBQUUsR0FBVTtJQUNoRSxJQUFJLFVBQVUsR0FBWSxFQUFFLENBQUM7SUFDN0IsSUFBSSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxNQUFNLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFakUsR0FBRyxDQUFBLENBQWEsVUFBSyxFQUFMLGVBQUssRUFBTCxtQkFBSyxFQUFMLElBQUs7UUFBakIsSUFBSSxJQUFJLGNBQUE7UUFDUixJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQzFCLEVBQUUsQ0FBQSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7WUFBQSxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO0tBQzVDO0lBRUQsTUFBTSxDQUFDLFVBQVUsQ0FBQztBQUN0QixDQUFDO0FBRUQsd0JBQXdCLFVBQW1CLEVBQUUsQ0FBWTtJQUNyRCxJQUFJLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzdFLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQVUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDbEUsR0FBRyxDQUFBLENBQWtCLFVBQVUsRUFBVix5QkFBVSxFQUFWLHdCQUFVLEVBQVYsSUFBVTtRQUEzQixJQUFJLFNBQVMsbUJBQUE7UUFDYixJQUFJLGtCQUFrQixHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDbkMsT0FBTSxJQUFJLEVBQUMsQ0FBQztZQUNSLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUNqQyxFQUFFLENBQUEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQSxDQUFDO2dCQUNqQyxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDekUsRUFBRSxDQUFBLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQztvQkFBQSxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFBO2dCQUN6RSxJQUFJLENBQUEsQ0FBQztvQkFDRCxFQUFFLENBQUEsQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUM7d0JBQUEsS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQTtvQkFDaEYsS0FBSyxDQUFBLENBQUEsb0RBQW9EO2dCQUM3RCxDQUFDO1lBQ0wsQ0FBQztZQUFBLElBQUk7Z0JBQUMsS0FBSyxDQUFBO1FBQ2YsQ0FBQztLQUNKO0lBQ0QsTUFBTSxDQUFDLEtBQUssQ0FBQztBQUNqQixDQUFDO0FBRUQsb0JBQW9CLEtBQWMsRUFBRSxDQUFZO0lBQzVDLElBQUksSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDN0UsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBVSxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUNsRSxHQUFHLENBQUEsQ0FBYSxVQUFLLEVBQUwsZUFBSyxFQUFMLG1CQUFLLEVBQUwsSUFBSztRQUFqQixJQUFJLElBQUksY0FBQTtRQUNSLElBQUksa0JBQWtCLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNuQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFNUIsRUFBRSxDQUFBLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUEsQ0FBQztZQUNqQyxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN6RSxFQUFFLENBQUEsQ0FBQyxLQUFLLElBQUksSUFBSSxJQUFJLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFBQSxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFBO1FBQ3JHLENBQUM7S0FDSjtJQUNELE1BQU0sQ0FBQyxLQUFLLENBQUE7QUFDaEIsQ0FBQztBQUVELDZCQUE2QixJQUFXLEVBQUUsU0FBZ0IsRUFBRSxJQUFTLEVBQUUsVUFBcUI7SUFDeEYsSUFBSSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxNQUFNLEVBQUUsRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzNFLElBQUksa0JBQWtCLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFBO0lBQ2pDLE9BQU0sSUFBSSxFQUFDLENBQUM7UUFDUixrQkFBa0IsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDakMsRUFBRSxDQUFBLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUEsQ0FBQztZQUNqQyxJQUFJLEtBQUssR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3ZFLEVBQUUsQ0FBQSxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQztnQkFBQSxNQUFNLENBQUMsS0FBSyxDQUFBO1FBQy9DLENBQUM7UUFBQSxJQUFJO1lBQUMsS0FBSyxDQUFBO0lBQ2YsQ0FBQztBQUNMLENBQUM7QUFFRCxJQUFJLFNBQVMsR0FBRyxFQUFFLENBQUE7QUFDbEIsSUFBSSxTQUFTLEdBQUcsRUFBRSxDQUFBO0FBQ2xCLEVBQUUsQ0FBQSxDQUFDLE9BQU8sUUFBUSxJQUFJLFdBQVcsQ0FBQyxDQUFBLENBQUM7SUFDL0IsSUFBSSxLQUFLLEdBQUcsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ2pFLEdBQUcsQ0FBQSxDQUFhLFVBQUssRUFBTCxlQUFLLEVBQUwsbUJBQUssRUFBTCxJQUFLO1FBQWpCLElBQUksSUFBSSxjQUFBO1FBQ1IsSUFBSSxNQUFNLEdBQUcsSUFBSSxLQUFLLEVBQUUsQ0FBQTtRQUN4QixJQUFJLE1BQU0sR0FBRyxJQUFJLEtBQUssRUFBRSxDQUFBO1FBQ3hCLE1BQU0sQ0FBQyxHQUFHLEdBQUcsYUFBYSxHQUFHLElBQUksR0FBRyxNQUFNLENBQUE7UUFDMUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxhQUFhLEdBQUcsSUFBSSxHQUFHLE1BQU0sQ0FBQTtRQUMxQyxNQUFNLENBQUMsTUFBTSxHQUFHO1lBQ1osWUFBWSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDM0MsQ0FBQyxDQUFBO1FBQ0QsTUFBTSxDQUFDLE1BQU0sR0FBRztZQUNaLFlBQVksQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzNDLENBQUMsQ0FBQTtRQUNELFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUE7UUFDeEIsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQTtLQUMzQjtBQUNMLENBQUM7QUFFRCxJQUFJLFNBQVMsR0FBRyxFQUFFLENBQUE7QUFDbEIsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUE7QUFDNUIsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUE7QUFDMUIsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUE7QUFDNUIsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUE7QUFDMUIsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLENBQUE7QUFDM0IsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUE7QUFFMUIsaUJBQVMsVUFBVSxDQUFBOzs7QUN0VG5CO0lBSUksZ0JBQVksTUFBZ0I7UUFBNUIsaUJBWUM7UUFYRyxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixJQUFJLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQztRQUNuQixJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsR0FBRyxVQUFDLEtBQUs7WUFDMUIsSUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtZQUNyQixJQUFJLFVBQVUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2xDLEVBQUUsQ0FBQSxDQUFDLEtBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUEsQ0FBQztnQkFDaEMsS0FBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDaEQsQ0FBQztZQUFBLElBQUksQ0FBQSxDQUFDO2dCQUNGLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM1QyxDQUFDO1FBQ0wsQ0FBQyxDQUFBO0lBQ0wsQ0FBQztJQUVELG1CQUFFLEdBQUYsVUFBRyxLQUFLLEVBQUUsTUFBTTtRQUNaLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsTUFBTSxDQUFDO0lBQ2xDLENBQUM7SUFFRCxxQkFBSSxHQUFKLFVBQUssS0FBSyxFQUFFLEtBQUs7UUFDYixLQUFLLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztRQUNwQixFQUFFLENBQUEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsSUFBRSxDQUFDLENBQUMsQ0FBQSxDQUFDO1lBQzVCLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUMxQyxDQUFDO0lBQ0wsQ0FBQztJQUVELHdCQUFPLEdBQVA7SUFFQSxDQUFDO0lBRUQsc0JBQUssR0FBTDtRQUNJLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDeEIsQ0FBQztJQUNMLGFBQUM7QUFBRCxDQXBDQSxBQW9DQyxJQUFBO0FBRUQsaUJBQVMsTUFBTSxDQUFBOzs7QUNoQ2Y7SUFBQTtJQW1DQSxDQUFDO0lBNUJHLHFDQUFxQztJQUNyQyx5Q0FBeUM7SUFDekMsc0RBQXNEO0lBQ3RELFFBQVE7SUFFUixvQ0FBb0M7SUFDcEMsSUFBSTtJQUVHLG9CQUFPLEdBQWQsVUFBZSxLQUFZLEVBQUUsSUFBUztRQUNsQyxFQUFFLENBQUEsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUM7WUFBQSxNQUFNLENBQUE7UUFDbEQsR0FBRyxDQUFBLENBQWlCLFVBQWdDLEVBQWhDLEtBQUEsWUFBWSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQWhDLGNBQWdDLEVBQWhDLElBQWdDO1lBQWhELElBQUksUUFBUSxTQUFBO1lBQXFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtTQUFBO0lBQ3ZFLENBQUM7SUFFTSxzQkFBUyxHQUFoQixVQUFpQixLQUFZLEVBQUUsUUFBMkI7UUFDdEQsRUFBRSxDQUFBLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDO1lBQUEsWUFBWSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ2hGLFlBQVksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUNuRCxDQUFDO0lBRU0sbUJBQU0sR0FBYixVQUFjLEtBQVksRUFBRSxRQUFtQjtRQUMzQyxJQUFJLE9BQU8sR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMvQyxHQUFHLENBQUEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUMsQ0FBQztZQUNwQyxJQUFJLGFBQWEsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0IsRUFBRSxDQUFBLENBQUMsYUFBYSxJQUFJLFFBQVEsQ0FBQyxDQUFBLENBQUM7Z0JBQzFCLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNuQixNQUFNLENBQUE7WUFDVixDQUFDO1FBQ0wsQ0FBQztJQUNMLENBQUM7SUFDTCxtQkFBQztBQUFELENBbkNBLEFBbUNDO0FBaENrQixxQkFBUSxHQUFrQyxJQUFJLEdBQUcsRUFBNkIsQ0FBQztBQWtDbEcsaUJBQVMsWUFBWSxDQUFBOzs7QUMzQ3JCLElBQUksTUFBTSxHQUF1QixRQUFRLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFBO0FBQ2xFLElBQUksSUFBSSxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUE7QUFDbEMsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQzVCLElBQUksRUFBUyxDQUFDO0FBQ2QsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQTtBQUNoQixJQUFJLFFBQVEsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxDQUFBO0FBQ2xELElBQUksU0FBUyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLENBQUE7QUFDcEQsSUFBSSxTQUFTLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsQ0FBQTtBQUVwRCxpQ0FBbUM7QUFDbkMsK0JBQWlDO0FBQ2pDLDZDQUErQztBQUUvQyx5Q0FBMkM7QUFDM0MsNkJBQStCO0FBQy9CLGlDQUFtQztBQUVuQyxJQUFJLE1BQU0sQ0FBQTtBQUNWLEVBQUUsQ0FBQSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxJQUFJLHdCQUF3QixDQUFDO0lBQUEsTUFBTSxHQUFHLElBQUksU0FBUyxDQUFDLHNCQUFzQixDQUFDLENBQUM7QUFDbkcsSUFBSTtJQUFDLE1BQU0sR0FBRyxJQUFJLFNBQVMsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO0FBQzlELElBQUksTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ2hDLElBQUssSUFBa0I7QUFBdkIsV0FBSyxJQUFJO0lBQUMsaUNBQUssQ0FBQTtJQUFFLGlDQUFLLENBQUE7QUFBQSxDQUFDLEVBQWxCLElBQUksS0FBSixJQUFJLFFBQWM7QUFDdkIsSUFBSyxJQUE2QztBQUFsRCxXQUFLLElBQUk7SUFBQywrQkFBSSxDQUFBO0lBQUUsK0JBQUksQ0FBQTtJQUFFLG1DQUFNLENBQUE7SUFBRSxtQ0FBTSxDQUFBO0lBQUUsaUNBQUssQ0FBQTtJQUFFLCtCQUFJLENBQUE7QUFBQSxDQUFDLEVBQTdDLElBQUksS0FBSixJQUFJLFFBQXlDO0FBQ2xELElBQUksSUFBUyxDQUFBO0FBRWIsSUFBSSxlQUFlLEdBQU8sUUFBUSxDQUFDLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO0FBQ3JFLE1BQU0sQ0FBQyxLQUFLLEdBQUcsZUFBZSxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUE7QUFDOUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxlQUFlLENBQUMsWUFBWSxHQUFHLEdBQUcsQ0FBQTtBQUVsRCxJQUFJLGdCQUFnQixHQUFHLENBQUMsQ0FBQztBQUN6QixZQUFZLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRSxVQUFDLElBQUk7SUFDdkMsZ0JBQWdCLEVBQUUsQ0FBQztJQUNuQixFQUFFLENBQUEsQ0FBQyxnQkFBZ0IsSUFBSSxFQUFFLENBQUMsQ0FBQSxDQUFDO1FBQ3ZCLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQ2pDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQTtBQUVGLElBQUksVUFBVSxHQUFHLElBQUksVUFBVSxFQUFFLENBQUM7QUFFbEMsV0FBVyxDQUFDO0lBQ1IsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQ3JCLEVBQUUsR0FBRyxDQUFDLEdBQUcsR0FBRyxVQUFVLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDL0IsVUFBVSxHQUFHLEdBQUcsQ0FBQztJQUNqQixFQUFFLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDckIsTUFBTSxFQUFFLENBQUE7SUFDUixJQUFJLEVBQUUsQ0FBQztBQUVYLENBQUMsRUFBRSxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUM7QUFDZCxJQUFJLFFBQVEsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7QUFDOUQsSUFBSSxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsR0FBRyxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUE7QUFDMUcsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUE7QUFHN0IsUUFBUSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRTtJQUMvQixNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQTtBQUM1QixDQUFDLENBQUMsQ0FBQTtBQUVGLE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLFVBQUMsSUFBSTtJQUNyQixVQUFVLEdBQUcsVUFBVSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDcEQsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUE7SUFDaEIsU0FBUyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDaEMsU0FBUyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzNDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFBO0FBQ2pDLENBQUMsQ0FBQyxDQUFBO0FBRUYsUUFBUSxDQUFDLFdBQVcsR0FBRyxVQUFDLEdBQUc7SUFDdkIsSUFBSSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxNQUFNLEVBQUUsRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzNFLElBQUksQ0FBQyxHQUFHLFVBQVUsQ0FBQyxlQUFlLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtJQUd4RSxFQUFFLENBQUEsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxDQUFDO1FBQ2pCLFVBQVUsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO0lBQy9CLENBQUM7SUFBQSxJQUFJLENBQUEsQ0FBQztRQUNGLElBQUksS0FBSyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUVyQyxFQUFFLENBQUEsQ0FBQyxVQUFVLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxDQUFBLENBQUM7WUFDNUIsRUFBRSxDQUFBLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQyxJQUFJLElBQUksVUFBVSxDQUFDLElBQUksSUFBSSxLQUFLLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFBLENBQUM7Z0JBQzdELFVBQVUsQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFBO1lBQy9CLENBQUM7UUFDTCxDQUFDO1FBQUEsSUFBSSxDQUFBLENBQUM7WUFDRixFQUFFLENBQUEsQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDO2dCQUFBLFVBQVUsQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFBO1lBQ3JFLElBQUksQ0FBQSxDQUFDO2dCQUNELEVBQUUsQ0FBQSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQztvQkFDbkMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7d0JBQ2hCLElBQUksRUFBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUU7d0JBQ3hDLEVBQUUsRUFBQyxDQUFDLENBQUMsU0FBUyxFQUFFO3FCQUNuQixDQUFDLENBQUE7Z0JBQ04sQ0FBQztnQkFDRCxVQUFVLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztZQUMvQixDQUFDO1FBQ0wsQ0FBQztJQUNMLENBQUM7SUFDRCxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQTtBQUNqQyxDQUFDLENBQUE7QUFFRDtBQUNBLENBQUM7QUFFRDtJQUNJLG9EQUFvRDtBQUN4RCxDQUFDO0FBRUQscUJBQXFCLE1BQU0sRUFBRSxHQUFHO0lBQzVCLElBQUksSUFBSSxHQUFHLE1BQU0sQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO0lBQzFDLE1BQU0sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7QUFDdEUsQ0FBQzs7O0FDdkdELElBQVUsS0FBSyxDQTRDZDtBQTVDRCxXQUFVLEtBQUs7SUFDWCxhQUFvQixJQUFXLEVBQUUsTUFBYSxFQUFFLEtBQVksRUFBRSxNQUFhLEVBQUUsS0FBWTtRQUNyRixNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQTtJQUMzRSxDQUFDO0lBRmUsU0FBRyxNQUVsQixDQUFBO0lBRUQsaUJBQXdCLEdBQVUsRUFBRSxHQUFVLEVBQUUsS0FBWTtRQUN4RCxFQUFFLENBQUEsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUEsQ0FBQztZQUNWLElBQUksSUFBSSxHQUFHLEdBQUcsQ0FBQztZQUNmLEdBQUcsR0FBRyxHQUFHLENBQUM7WUFDVixHQUFHLEdBQUcsSUFBSSxDQUFDO1FBQ2YsQ0FBQztRQUNELE1BQU0sQ0FBQyxLQUFLLElBQUksR0FBRyxJQUFJLEtBQUssSUFBSSxHQUFHLENBQUM7SUFDeEMsQ0FBQztJQVBlLGFBQU8sVUFPdEIsQ0FBQTtJQUVELGFBQW9CLENBQVEsRUFBRSxDQUFRO1FBQ2xDLEVBQUUsQ0FBQSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7WUFBQSxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ2xCLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDYixDQUFDO0lBSGUsU0FBRyxNQUdsQixDQUFBO0lBRUQsYUFBb0IsQ0FBUSxFQUFFLENBQVE7UUFDbEMsRUFBRSxDQUFBLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUFBLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDbEIsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUNiLENBQUM7SUFIZSxTQUFHLE1BR2xCLENBQUE7SUFFRCxlQUFzQixHQUFVLEVBQUUsR0FBVSxFQUFFLEdBQVU7UUFDcEQsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFDNUMsQ0FBQztJQUZlLFdBQUssUUFFcEIsQ0FBQTtJQUVELHNCQUE2QixFQUFFLEVBQUMsRUFBRSxFQUFDLEVBQUUsRUFBQyxFQUFFO1FBQ3BDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLElBQUksR0FBRyxDQUFDLEVBQUUsRUFBQyxFQUFFLENBQUMsSUFBSSxHQUFHLENBQUMsRUFBRSxFQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ2xFLENBQUM7SUFGZSxrQkFBWSxlQUUzQixDQUFBO0lBRUQsdUJBQWlDLENBQVEsRUFBRSxJQUFNO1FBQzdDLElBQUksSUFBSSxHQUFTLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMvQixHQUFHLENBQUEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUMsQ0FBQztZQUN6QixJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3hCLEdBQUcsQ0FBQSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBQyxDQUFDO2dCQUN6QixJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFBO1lBQ3JCLENBQUM7UUFDTCxDQUFDO1FBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQztJQUNoQixDQUFDO0lBVGUsbUJBQWEsZ0JBUzVCLENBQUE7QUFHTCxDQUFDLEVBNUNTLEtBQUssS0FBTCxLQUFLLFFBNENkO0FBRUQsaUJBQVMsS0FBSyxDQUFDOzs7QUNoRGY7SUFJSSxnQkFBWSxDQUFZLEVBQUUsQ0FBWTtRQUExQixrQkFBQSxFQUFBLEtBQVk7UUFBRSxrQkFBQSxFQUFBLEtBQVk7UUFDbEMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDWCxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNmLENBQUM7SUFFRCxvQkFBRyxHQUFILFVBQUksTUFBYTtRQUNiLElBQUksQ0FBQyxDQUFDLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNuQixJQUFJLENBQUMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDbkIsTUFBTSxDQUFDLElBQUksQ0FBQztJQUNoQixDQUFDO0lBRUQsb0JBQUcsR0FBSCxVQUFJLE1BQWE7UUFDYixJQUFJLENBQUMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDbkIsSUFBSSxDQUFDLENBQUMsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ25CLE1BQU0sQ0FBQyxJQUFJLENBQUE7SUFDZixDQUFDO0lBRUQsdUJBQU0sR0FBTjtRQUNJLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDNUQsQ0FBQztJQUVELDBCQUFTLEdBQVQ7UUFDSSxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDM0IsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFBO0lBQ2pDLENBQUM7SUFFRCxzQkFBSyxHQUFMLFVBQU0sTUFBYTtRQUNmLElBQUksQ0FBQyxDQUFDLElBQUksTUFBTSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxDQUFDLElBQUksTUFBTSxDQUFBO1FBQ2hCLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDaEIsQ0FBQztJQUVELHVCQUFNLEdBQU4sVUFBTyxDQUFRLEVBQUUsTUFBNEI7UUFBNUIsdUJBQUEsRUFBQSxhQUFvQixNQUFNLEVBQUU7UUFDekMsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNqQyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3ZELElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdkQsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7UUFBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMzQixJQUFJLElBQUksR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzdCLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNqQyxNQUFNLENBQUMsSUFBSSxDQUFDO0lBQ2hCLENBQUM7SUFFRCxxQkFBSSxHQUFKLFVBQUssTUFBYSxFQUFFLE1BQWE7UUFDN0IsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7SUFDL0QsQ0FBQztJQUVELGtCQUFDLEdBQUQ7UUFDSSxNQUFNLENBQUMsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDckMsQ0FBQztJQUVELHVCQUFNLEdBQU4sVUFBTyxDQUFRO1FBQ1gsRUFBRSxDQUFBLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQztZQUFBLE1BQU0sQ0FBQyxLQUFLLENBQUE7UUFDekIsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUVELG9CQUFHLEdBQUgsVUFBSSxNQUFhO1FBQ2IsSUFBSSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ2xCLElBQUksQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNsQixNQUFNLENBQUMsSUFBSSxDQUFDO0lBQ2hCLENBQUM7SUFFRCx3QkFBTyxHQUFQLFVBQVEsTUFBYTtRQUNqQixNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUUsQ0FBQTtJQUNyRyxDQUFDO0lBRUQscUJBQUksR0FBSixVQUFLLElBQTZCO1FBQzlCLElBQUksS0FBSyxHQUFHLEVBQUUsQ0FBQztRQUFBLElBQUksSUFBSSxHQUFHLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDcEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDOUQsQ0FBQztJQUVELHFCQUFJLEdBQUosVUFBSyxRQUEyQjtRQUM1QixHQUFHLENBQUEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUMsQ0FBQztZQUM1QixHQUFHLENBQUEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUMsQ0FBQztnQkFDNUIsUUFBUSxDQUFDLElBQUksTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQy9CLENBQUM7UUFDTCxDQUFDO0lBQ0wsQ0FBQztJQUVELDBCQUFTLEdBQVQ7UUFDSSxNQUFNLENBQUMsRUFBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFBO0lBQy9CLENBQUM7SUFFTSxrQkFBVyxHQUFsQixVQUFtQixNQUFVO1FBQ3pCLE1BQU0sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUN6QyxDQUFDO0lBQ0wsYUFBQztBQUFELENBekZBLEFBeUZDLElBQUE7QUFFRCxpQkFBUyxNQUFNLENBQUMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiaW1wb3J0IFZlY3RvciA9IHJlcXVpcmUoJy4vdmVjdG9yJylcclxuaW1wb3J0IFV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpXHJcbmNsYXNzIEFBQkJ7XHJcbiAgICBwb3M6VmVjdG9yXHJcbiAgICBzaXplOlZlY3RvclxyXG5cclxuICAgIGNvbnN0cnVjdG9yKHBvczpWZWN0b3IsIHNpemU6VmVjdG9yKXtcclxuICAgICAgICB0aGlzLnBvcyA9IHBvcztcclxuICAgICAgICB0aGlzLnNpemUgPSBzaXplO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBmcm9tVmVjdG9ycyhhOlZlY3RvcltdKTpBQUJCe1xyXG4gICAgICAgIHZhciBzbWFsbCA9IGFbMF07XHJcbiAgICAgICAgdmFyIGJpZyA9IGFbYS5sZW5ndGggLSAxXTtcclxuICAgICAgICBmb3IodmFyIHYgb2YgYSl7XHJcbiAgICAgICAgICAgIGlmKHYueCA8IHNtYWxsLngpc21hbGwueCA9IHYueDtcclxuICAgICAgICAgICAgZWxzZSBpZih2LnggPiBiaWcueCliaWcueCA9IHYueDtcclxuICAgICAgICAgICAgaWYodi55IDwgc21hbGwueSlzbWFsbC55ID0gdi55O1xyXG4gICAgICAgICAgICBlbHNlIGlmKHYueSA+IGJpZy55KWJpZy55ID0gdi55O1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbmV3IEFBQkIoc21hbGwsIGJpZy5zdWIoc21hbGwpKTtcclxuICAgIH1cclxuXHJcbiAgICBjb250YWlucyhhYWJiOkFBQkIpe1xyXG4gICAgICAgIHJldHVybiBVdGlscy5yYW5nZUNvbnRhaW4odGhpcy5wb3MueCwgdGhpcy5zaXplLnggKyB0aGlzLnBvcy54LCBhYWJiLnBvcy54LCBhYWJiLnNpemUueCArIGFhYmIucG9zLngpIFxyXG4gICAgICAgICYmIFV0aWxzLnJhbmdlQ29udGFpbih0aGlzLnBvcy55LCB0aGlzLnNpemUueSArIHRoaXMucG9zLnksIGFhYmIucG9zLnksIGFhYmIuc2l6ZS55ICsgYWFiYi5wb3MueSlcclxuICAgIH1cclxuXHJcbiAgICBjb2xsaWRlKHY6VmVjdG9yKTpib29sZWFue1xyXG4gICAgICAgIHJldHVybiBVdGlscy5pblJhbmdlKHRoaXMucG9zLngsIHRoaXMuc2l6ZS54ICsgdGhpcy5wb3MueCwgdi54KSAmJiBVdGlscy5pblJhbmdlKHRoaXMucG9zLnksIHRoaXMuc2l6ZS55ICsgdGhpcy5wb3MueSwgdi55KVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgPSBBQUJCIiwiaW1wb3J0IFZlY3RvciA9IHJlcXVpcmUoJy4vdmVjdG9yJylcclxuaW1wb3J0IFV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpXHJcbmltcG9ydCBBQUJCID0gcmVxdWlyZSgnLi9BQUJCJylcclxuaW1wb3J0IENoZXNzUGllY2UgPSByZXF1aXJlKCcuL0NoZXNzUGllY2UnKVxyXG5lbnVtIFRlYW17QmxhY2ssIFdoaXRlfVxyXG5cclxuY2xhc3MgQ2hlc3NCb2FyZHtcclxuICAgIHNpemU6VmVjdG9yXHJcbiAgICBzcXVhcmVTaXplOlZlY3RvclxyXG4gICAgZ3JpZDpDaGVzc1BpZWNlW11bXVxyXG4gICAgdHVybjpUZWFtXHJcbiAgICBzZWxlY3RlZDpDaGVzc1BpZWNlXHJcbiAgICBsYXN0TW92ZUZyb206VmVjdG9yXHJcbiAgICBsYXN0TW92ZVRvOlZlY3RvclxyXG5cclxuICAgIGNvbnN0cnVjdG9yKCl7XHJcbiAgICAgICAgdGhpcy5sYXN0TW92ZVRvID0gbnVsbDsgXHJcbiAgICAgICAgdGhpcy5sYXN0TW92ZUZyb20gPSBudWxsOyBcclxuICAgICAgICB0aGlzLnNpemUgPSBuZXcgVmVjdG9yKDgsOClcclxuICAgICAgICB0aGlzLnNxdWFyZVNpemUgPSBuZXcgVmVjdG9yKDUwLCA1MClcclxuICAgICAgICB0aGlzLnR1cm4gPSBUZWFtLldoaXRlXHJcbiAgICAgICAgdGhpcy5ncmlkID0gVXRpbHMuY3JlYXRlMmRBcnJheTxDaGVzc1BpZWNlPih0aGlzLnNpemUsIG51bGwpO1xyXG4gICAgfVxyXG5cclxuICAgIHRyeUZyb21Ubyhmcm9tOlZlY3RvciwgdG86VmVjdG9yKTpib29sZWFue1xyXG4gICAgICAgIHZhciBmcm9tUGllY2UgPSB0aGlzLmdyaWRbZnJvbS54XVtmcm9tLnldLy9jb3VsZCBvdXRvZnJhbmdlIGZyb20gYmFkY2xpZW50XHJcbiAgICAgICAgcmV0dXJuIGZyb21QaWVjZS50cnlNb3ZlKHRvKVxyXG4gICAgfVxyXG5cclxuICAgIGRyYXcoY3R4dDpDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQsIG9mZnNldDpWZWN0b3Ipe1xyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciBsZWdhbHNTcG90czpib29sZWFuW11bXTtcclxuICAgICAgICBpZih0aGlzLnNlbGVjdGVkKWxlZ2Fsc1Nwb3RzID0gdGhpcy5zZWxlY3RlZC5wb3NDaGVja2VyKHRoaXMuc2VsZWN0ZWQsIHRoaXMpXHJcbiAgICAgICAgdGhpcy5zaXplLmxvb3AoKHYpID0+e1xyXG4gICAgICAgICAgICBpZigodi54ICsgdi55KSAlIDIgPT0gMCljdHh0LmZpbGxTdHlsZSA9IFwiI2ZmZlwiXHJcbiAgICAgICAgICAgIGVsc2UgY3R4dC5maWxsU3R5bGUgPSBcIiMwMDBcIlxyXG4gICAgICAgICAgICBpZih0aGlzLnNlbGVjdGVkICYmIHYuZXF1YWxzKHRoaXMuc2VsZWN0ZWQucG9zKSljdHh0LmZpbGxTdHlsZSA9IFwiIzBmZlwiXHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpZih0aGlzLmxhc3RNb3ZlRnJvbSAmJiB2LmVxdWFscyh0aGlzLmxhc3RNb3ZlRnJvbSkpY3R4dC5maWxsU3R5bGUgPSBcIiM0MDRcIiBcclxuICAgICAgICAgICAgaWYodGhpcy5sYXN0TW92ZVRvICYmIHYuZXF1YWxzKHRoaXMubGFzdE1vdmVUbykpY3R4dC5maWxsU3R5bGUgPSBcIiNhMGFcIiBcclxuICAgICAgICAgICAgaWYodGhpcy5zZWxlY3RlZCAmJiBsZWdhbHNTcG90c1t2LnhdW3YueV0pY3R4dC5maWxsU3R5bGUgPSBcIiNmMDBcIlxyXG4gICAgICAgICAgICBjdHh0LmZpbGxSZWN0KHYueCAqIHRoaXMuc3F1YXJlU2l6ZS54ICsgb2Zmc2V0LngsIHYueSAqIHRoaXMuc3F1YXJlU2l6ZS55ICsgb2Zmc2V0LnksIHRoaXMuc3F1YXJlU2l6ZS54LCB0aGlzLnNxdWFyZVNpemUueSlcclxuICAgICAgICAgICAgaWYodGhpcy5ncmlkW3YueF1bdi55XSl7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmdyaWRbdi54XVt2LnldLmRyYXcoY3R4dCwgdGhpcy5zcXVhcmVTaXplLCBvZmZzZXQpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIHZlY3RvclRvR3JpZFBvcyh2OlZlY3Rvcik6VmVjdG9ye1xyXG4gICAgICAgIHZhciBuID0gbmV3IFZlY3RvcigpO1xyXG4gICAgICAgIG4ueCA9IE1hdGguZmxvb3Iodi54IC8gdGhpcy5zcXVhcmVTaXplLngpXHJcbiAgICAgICAgbi55ID0gTWF0aC5mbG9vcih2LnkgLyB0aGlzLnNxdWFyZVNpemUueSlcclxuICAgICAgICByZXR1cm4gbjtcclxuICAgIH1cclxuXHJcbiAgICBhZGQoYzpDaGVzc1BpZWNlKXtcclxuICAgICAgICB0aGlzLmdyaWRbYy5wb3MueF1bYy5wb3MueV0gPSBjO1xyXG4gICAgfVxyXG5cclxuICAgIHNlcmlhbGl6ZSgpOmFueXtcclxuICAgICAgICB2YXIgZ3JpZCA9IFV0aWxzLmNyZWF0ZTJkQXJyYXkodGhpcy5zaXplLCBudWxsKVxyXG4gICAgICAgIHRoaXMuc2l6ZS5sb29wKCh2KSA9PiB7XHJcbiAgICAgICAgICAgIGlmKHRoaXMuZ3JpZFt2LnhdW3YueV0pZ3JpZFt2LnhdW3YueV0gPSB0aGlzLmdyaWRbdi54XVt2LnldLnNlcmlhbGl6ZSgpXHJcbiAgICAgICAgfSlcclxuICAgICAgICB2YXIgc2VsZWN0ZWQ7XHJcbiAgICAgICAgaWYodGhpcy5zZWxlY3RlZClzZWxlY3RlZCA9IHRoaXMuc2VsZWN0ZWQuc2VyaWFsaXplKClcclxuICAgICAgICB2YXIgbGFzdE1vdmVGcm9tOyBcclxuICAgICAgICBpZih0aGlzLmxhc3RNb3ZlRnJvbSlsYXN0TW92ZUZyb20gPSB0aGlzLmxhc3RNb3ZlRnJvbS5zZXJpYWxpemUoKVxyXG4gICAgICAgIHZhciBsYXN0TW92ZVRvOyBcclxuICAgICAgICBpZih0aGlzLmxhc3RNb3ZlVG8pbGFzdE1vdmVUbyA9IHRoaXMubGFzdE1vdmVUby5zZXJpYWxpemUoKSBcclxuICAgICAgICB2YXIgc2VyaWFsaXplZCA9IHtcclxuICAgICAgICAgICAgc2l6ZTp0aGlzLnNpemUuc2VyaWFsaXplKCksXHJcbiAgICAgICAgICAgIHNxdWFyZVNpemU6dGhpcy5zcXVhcmVTaXplLnNlcmlhbGl6ZSgpLFxyXG4gICAgICAgICAgICBncmlkOmdyaWQsXHJcbiAgICAgICAgICAgIHR1cm46dGhpcy50dXJuLFxyXG4gICAgICAgICAgICBzZWxlY3RlZDpzZWxlY3RlZCwgXHJcbiAgICAgICAgICAgIGxhc3RNb3ZlRnJvbTpsYXN0TW92ZUZyb20sIFxyXG4gICAgICAgICAgICBsYXN0TW92ZVRvOmxhc3RNb3ZlVG8gXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBzZXJpYWxpemVkXHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGRlc2VyaWFsaXplKG9iamVjdCl7XHJcbiAgICAgICAgdmFyIGNoZXNzQm9hcmQgPSBuZXcgQ2hlc3NCb2FyZCgpXHJcbiAgICAgICAgdmFyIGdyaWQgPSBVdGlscy5jcmVhdGUyZEFycmF5PENoZXNzUGllY2U+KGNoZXNzQm9hcmQuc2l6ZSwgbnVsbClcclxuICAgICAgICBjaGVzc0JvYXJkLnNpemUubG9vcCgodikgPT4ge1xyXG4gICAgICAgICAgICBpZihvYmplY3QuZ3JpZFt2LnhdW3YueV0pZ3JpZFt2LnhdW3YueV0gPSBDaGVzc1BpZWNlLmRlc2VyaWFsaXplKG9iamVjdC5ncmlkW3YueF1bdi55XSwgY2hlc3NCb2FyZClcclxuICAgICAgICB9KVxyXG4gICAgICAgIGNoZXNzQm9hcmQuZ3JpZCA9IGdyaWRcclxuICAgICAgICBjaGVzc0JvYXJkLnR1cm4gPSBvYmplY3QudHVyblxyXG4gICAgICAgIGlmKG9iamVjdC5zZWxlY3RlZCljaGVzc0JvYXJkLnNlbGVjdGVkID0gQ2hlc3NQaWVjZS5kZXNlcmlhbGl6ZShvYmplY3Quc2VsZWN0ZWQsIGNoZXNzQm9hcmQpXHJcbiAgICAgICAgaWYob2JqZWN0Lmxhc3RNb3ZlRnJvbSljaGVzc0JvYXJkLmxhc3RNb3ZlRnJvbSA9IFZlY3Rvci5kZXNlcmlhbGl6ZShvYmplY3QubGFzdE1vdmVGcm9tKVxyXG4gICAgICAgIGlmKG9iamVjdC5sYXN0TW92ZVRvKWNoZXNzQm9hcmQubGFzdE1vdmVUbyA9IFZlY3Rvci5kZXNlcmlhbGl6ZShvYmplY3QubGFzdE1vdmVUbykgXHJcbiAgICAgICAgcmV0dXJuIGNoZXNzQm9hcmRcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0ID0gQ2hlc3NCb2FyZCIsImltcG9ydCBWZWN0b3IgPSByZXF1aXJlKCcuL3ZlY3RvcicpXHJcbmltcG9ydCBVdGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKVxyXG5pbXBvcnQgQ2hlc3NCb2FyZCA9IHJlcXVpcmUoJy4vQ2hlc3NCb2FyZCcpXHJcbmltcG9ydCBBQUJCID0gcmVxdWlyZSgnLi9BQUJCJylcclxuaW1wb3J0IEV2ZW50SGFuZGxlciA9IHJlcXVpcmUoJy4vZXZlbnRIYW5kbGVyJylcclxuZW51bSBUZWFte0JsYWNrLCBXaGl0ZX1cclxuZW51bSBUeXBle3Bhd24sIHJvb2ssIGtuaWdodCwgYmlzaG9wLCBxdWVlbiwga2luZ31cclxuXHJcbmRlY2xhcmUgY2xhc3MgTWFwPEssVj57XHJcbiAgICBjb25zdHJ1Y3RvcigpXHJcbiAgICBnZXQoYTpLKTpWXHJcbiAgICBzZXQoYTpLLCBiOlYpXHJcbn1cclxuXHJcbmNsYXNzIENoZXNzUGllY2V7XHJcbiAgICB0eXBlOlR5cGVcclxuICAgIHBvczpWZWN0b3JcclxuICAgIHRlYW06VGVhbVxyXG4gICAgY2hlc3NCb2FyZDpDaGVzc0JvYXJkXHJcbiAgICBtb3ZlZDpib29sZWFuID0gZmFsc2VcclxuICAgIGltYWdlOkhUTUxJbWFnZUVsZW1lbnRcclxuICAgIHBvc0NoZWNrZXI6KGM6Q2hlc3NQaWVjZSwgY2hlc3NCb2FyZDpDaGVzc0JvYXJkKSA9PiBib29sZWFuW11bXVxyXG4gICAgXHJcbiAgICBjb25zdHJ1Y3Rvcih0eXBlOlR5cGUsIHRlYW06VGVhbSwgcG9zOlZlY3RvciwgY2hlc3NCb2FyZDpDaGVzc0JvYXJkKXtcclxuICAgICAgICBpZih0eXBlb2YgZG9jdW1lbnQgIT0gJ3VuZGVmaW5lZCcpeyBcclxuICAgICAgICAgICAgaWYodGVhbSA9PSBUZWFtLkJsYWNrKXRoaXMuaW1hZ2UgPSBpbWFnZU1hcEJbVHlwZVt0eXBlXV0gXHJcbiAgICAgICAgICAgIGVsc2UgdGhpcy5pbWFnZSA9IGltYWdlTWFwV1tUeXBlW3R5cGVdXSBcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucG9zID0gcG9zXHJcbiAgICAgICAgdGhpcy5jaGVzc0JvYXJkID0gY2hlc3NCb2FyZFxyXG4gICAgICAgIHRoaXMucG9zQ2hlY2tlciA9IGNoZWNrTWFwLmdldCh0eXBlKVxyXG4gICAgICAgIHRoaXMudHlwZSA9IHR5cGVcclxuICAgICAgICB0aGlzLnRlYW0gPSB0ZWFtXHJcbiAgICAgICAgXHJcbiAgICB9XHJcblxyXG4gICAgZHJhdyhjdHh0OkNhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCwgc3F1YXJlU2l6ZTpWZWN0b3IsIG9mZnNldDpWZWN0b3Ipe1xyXG4gICAgICAgIHZhciBzaXplID0gdGhpcy5jaGVzc0JvYXJkLnNxdWFyZVNpemUueCBcclxuICAgICAgICB2YXIgaGFsZnNpemUgPSBzaXplIC8gMlxyXG4gICAgICAgIGN0eHQuZHJhd0ltYWdlKHRoaXMuaW1hZ2UsIG9mZnNldC54ICsgMC41ICsgdGhpcy5wb3MueCAqIHNxdWFyZVNpemUueCArIHNxdWFyZVNpemUueCAvIDIgLSBoYWxmc2l6ZSwgb2Zmc2V0LnkgKyAwLjUgKyB0aGlzLnBvcy55ICogc3F1YXJlU2l6ZS55ICsgc3F1YXJlU2l6ZS55IC8gMiAtIGhhbGZzaXplLCBzaXplLCBzaXplKSBcclxuICAgIH1cclxuXHJcbiAgICB0cnlNb3ZlKHRvOlZlY3Rvcik6Ym9vbGVhbnsgICAgXHJcbiAgICAgICAgaWYodGhpcy5wb3NDaGVja2VyKHRoaXMsIHRoaXMuY2hlc3NCb2FyZClbdG8ueF1bdG8ueV0pe1xyXG4gICAgICAgICAgICB0aGlzLmNoZXNzQm9hcmQubGFzdE1vdmVGcm9tID0gdGhpcy5wb3MuYygpXHJcbiAgICAgICAgICAgIHRoaXMuY2hlc3NCb2FyZC5sYXN0TW92ZVRvID0gdG8uYygpXHJcbiAgICAgICAgICAgIHZhciBmcm9tVE8gPSB0by5jKCkuc3ViKHRoaXMucG9zKVxyXG4gICAgICAgICAgICBpZih0aGlzLnR5cGUgPT0gVHlwZS5raW5nICYmIGZyb21UTy5sZW5ndGgoKSA9PSAyKXsvL2NoZWNrIGlmIGNhc3RsaW5nIG9jY3VyZWRcclxuICAgICAgICAgICAgICAgIGZyb21UTy5ub3JtYWxpemUoKVxyXG4gICAgICAgICAgICAgICAgdmFyIHJvb2sgPSBnZXRQaWVjZUluRGlyZWN0aW9uKHRoaXMucG9zLCBmcm9tVE8sIFR5cGUucm9vaywgdGhpcy5jaGVzc0JvYXJkKVxyXG4gICAgICAgICAgICAgICAgcm9vay5tb3ZlKHRoaXMucG9zLmMoKS5hZGQoZnJvbVRPKSkvL2Fzc3VtZXMgcm9vayBoYXMgYmVlbiBmb3VuZCBiZWNhdXNlIHBvc0NoZWNrZXIgc2F3IHRoaXMgYXMgYSBsZWdhbCBtb3ZlXHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB2YXIgcGllY2UgPSB0aGlzLmNoZXNzQm9hcmQuZ3JpZFt0by54XVt0by55XS8vY2hlY2sgaWYgaGl0IHBpZWNlIGlzIGtpbmdcclxuICAgICAgICAgICAgaWYocGllY2UgJiYgcGllY2UudHlwZSA9PSBUeXBlLmtpbmcpIEV2ZW50SGFuZGxlci50cmlnZ2VyKCdnYW1lT3ZlcicsIHBpZWNlKVxyXG5cclxuICAgICAgICAgICAgdGhpcy5tb3ZlKHRvKVxyXG5cclxuICAgICAgICAgICAgaWYodGhpcy50eXBlID09IFR5cGUucGF3bil7Ly9jaGVjayBmb3IgcGF3biBwcm9tb3Rpb24sIGF0bSBhbHdheXMgcHJvbW90ZXMgdG8gcXVlZW5cclxuICAgICAgICAgICAgICAgIGlmKHRoaXMudGVhbSA9PSBUZWFtLkJsYWNrICYmIHRoaXMucG9zLnkgPT0gdGhpcy5jaGVzc0JvYXJkLnNpemUueSAtIDFcclxuICAgICAgICAgICAgICAgIHx8IHRoaXMudGVhbSA9PSBUZWFtLldoaXRlICYmIHRoaXMucG9zLnkgPT0gMCl7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50eXBlID0gVHlwZS5xdWVlblxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucG9zQ2hlY2tlciA9IGNoZWNrTWFwLmdldChUeXBlLnF1ZWVuKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpZih0aGlzLmNoZXNzQm9hcmQudHVybiA9PSBUZWFtLkJsYWNrKXRoaXMuY2hlc3NCb2FyZC50dXJuID0gVGVhbS5XaGl0ZS8vc3dpdGNoIHR1cm5cclxuICAgICAgICAgICAgZWxzZSB0aGlzLmNoZXNzQm9hcmQudHVybiA9IFRlYW0uQmxhY2tcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgbW92ZSh0bzpWZWN0b3Ipe1xyXG4gICAgICAgIHRoaXMuY2hlc3NCb2FyZC5ncmlkW3RvLnhdW3RvLnldID0gdGhpczsvL21vdmUgdGhpcyBwaWVjZSB0byByZXF1ZXN0ZWQgc3BvdFxyXG4gICAgICAgIHRoaXMuY2hlc3NCb2FyZC5ncmlkW3RoaXMucG9zLnhdW3RoaXMucG9zLnldID0gbnVsbDtcclxuICAgICAgICB0aGlzLnBvcyA9IHRvO1xyXG4gICAgICAgIHRoaXMubW92ZWQgPSB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIGlzTGVnYWxNb3ZlKHY6VmVjdG9yKTpib29sZWFue1xyXG4gICAgICAgIHJldHVybiB0aGlzLnBvc0NoZWNrZXIodGhpcywgdGhpcy5jaGVzc0JvYXJkKVt2LnhdW3YueV1cclxuICAgIH1cclxuXHJcbiAgICBzZXJpYWxpemUoKXtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICB0eXBlOnRoaXMudHlwZSxcclxuICAgICAgICAgICAgcG9zOnRoaXMucG9zLnNlcmlhbGl6ZSgpLFxyXG4gICAgICAgICAgICB0ZWFtOnRoaXMudGVhbSxcclxuICAgICAgICAgICAgbW92ZWQ6dGhpcy5tb3ZlZFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgZGVzZXJpYWxpemUob2JqZWN0OmFueSwgY2hlc3NCb2FyZDpDaGVzc0JvYXJkKTpDaGVzc1BpZWNle1xyXG4gICAgICAgIHZhciBjID0gbmV3IENoZXNzUGllY2Uob2JqZWN0LnR5cGUsIG9iamVjdC50ZWFtLCBWZWN0b3IuZGVzZXJpYWxpemUob2JqZWN0LnBvcyksIGNoZXNzQm9hcmQpXHJcbiAgICAgICAgYy5tb3ZlZCA9IG9iamVjdC5tb3ZlZFxyXG4gICAgICAgIHJldHVybiBjXHJcbiAgICB9XHJcbn1cclxuXHJcbnZhciBjaGVja01hcCA9IG5ldyBNYXA8VHlwZSwgKGM6Q2hlc3NQaWVjZSwgY2hlc3NCb2FyZDpDaGVzc0JvYXJkKSA9PiBib29sZWFuW11bXT4oKTtcclxuXHJcbmNoZWNrTWFwLnNldChUeXBlLnBhd24sIGZ1bmN0aW9uKGM6Q2hlc3NQaWVjZSwgYm9hcmQ6Q2hlc3NCb2FyZCk6Ym9vbGVhbltdW117XHJcbiAgICB2YXIgYWFiYiA9IG5ldyBBQUJCKG5ldyBWZWN0b3IoKSwgYm9hcmQuc2l6ZS5jKCkuc3ViKG5ldyBWZWN0b3IoMSwxKSkpXHJcbiAgICB2YXIgbW92ZXM6VmVjdG9yW10gPSBbXTtcclxuICAgIHZhciBmYWNpbmc6VmVjdG9yO1xyXG4gICAgaWYoYy50ZWFtID09IFRlYW0uV2hpdGUpZmFjaW5nID0gbmV3IFZlY3RvcigwLCAtMSlcclxuICAgIGVsc2UgZmFjaW5nID0gbmV3IFZlY3RvcigwLCAxKVxyXG4gICAgdmFyIHdzZnJvbnQgPSBjLnBvcy5jKCkuYWRkKGZhY2luZylcclxuXHJcbiAgICBpZihhYWJiLmNvbGxpZGUod3Nmcm9udCkgJiYgYm9hcmQuZ3JpZFt3c2Zyb250LnhdW3dzZnJvbnQueV0gPT0gbnVsbCl7IFxyXG4gICAgICAgIG1vdmVzLnB1c2goZmFjaW5nKSBcclxuICAgICAgICB2YXIgZmFyRnJvbnQgPSBmYWNpbmcuYygpLnNjYWxlKDIpIFxyXG4gICAgICAgIHZhciB3c0ZhckZyb250ID0gYy5wb3MuYygpLmFkZChmYXJGcm9udCkgXHJcbiAgICAgICAgaWYoIWMubW92ZWQgJiYgYWFiYi5jb2xsaWRlKHdzRmFyRnJvbnQpICYmIGJvYXJkLmdyaWRbd3NGYXJGcm9udC54XVt3c0ZhckZyb250LnldID09IG51bGwpbW92ZXMucHVzaChmYXJGcm9udCkgXHJcbiAgICB9IFxyXG5cclxuICAgIHZhciB3ZXN0ID0gbmV3IFZlY3RvcigxLDApLmFkZChmYWNpbmcpXHJcbiAgICB2YXIgd3N3ZXN0ID0gd2VzdC5jKCkuYWRkKGMucG9zKVxyXG4gICAgaWYoYWFiYi5jb2xsaWRlKHdzd2VzdCkgJiYgYm9hcmQuZ3JpZFt3c3dlc3QueF1bd3N3ZXN0LnldICE9IG51bGwgJiYgYm9hcmQuZ3JpZFt3c3dlc3QueF1bd3N3ZXN0LnldLnRlYW0gIT0gYy50ZWFtKSBtb3Zlcy5wdXNoKHdlc3QpXHJcbiAgICBcclxuICAgIHZhciBlYXN0ID0gbmV3IFZlY3RvcigtMSwwKS5hZGQoZmFjaW5nKVxyXG4gICAgdmFyIHdzZWFzdCA9IGVhc3QuYygpLmFkZChjLnBvcylcclxuICAgIGlmKGFhYmIuY29sbGlkZSh3c2Vhc3QpICYmIGJvYXJkLmdyaWRbd3NlYXN0LnhdW3dzZWFzdC55XSAhPSBudWxsICYmIGJvYXJkLmdyaWRbd3NlYXN0LnhdW3dzZWFzdC55XS50ZWFtICE9IGMudGVhbSkgbW92ZXMucHVzaChlYXN0KVxyXG5cclxuICAgIHJldHVybiBtb3Zlc1N0YW1wKG1vdmVzLCBjKTtcclxufSlcclxuXHJcbmNoZWNrTWFwLnNldChUeXBlLnJvb2ssIGZ1bmN0aW9uKGM6Q2hlc3NQaWVjZSwgZ3JpZDpDaGVzc0JvYXJkKTpib29sZWFuW11bXXtcclxuICAgIHZhciBkaXJlY3Rpb25zID0gW1xyXG4gICAgICAgIG5ldyBWZWN0b3IoMSwgMCksXHJcbiAgICAgICAgbmV3IFZlY3RvcigtMSwgMCksXHJcbiAgICAgICAgbmV3IFZlY3RvcigwLCAxKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDAsIC0xKVxyXG4gICAgXVxyXG4gICAgcmV0dXJuIGRpcmVjdGlvblN0YW1wKGRpcmVjdGlvbnMsIGMpO1xyXG59KVxyXG5cclxuY2hlY2tNYXAuc2V0KFR5cGUua25pZ2h0LCBmdW5jdGlvbihjOkNoZXNzUGllY2UsIGdyaWQ6Q2hlc3NCb2FyZCk6Ym9vbGVhbltdW117XHJcbiAgICB2YXIgbW92ZXMgPSBbXHJcbiAgICAgICAgbmV3IFZlY3RvcigxLCAtMiksXHJcbiAgICAgICAgbmV3IFZlY3RvcigyLCAtMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigyLCAxKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDEsIDIpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTEsIDIpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTIsIDEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTIsIC0xKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0xLCAtMilcclxuICAgIF1cclxuICAgIHJldHVybiBtb3Zlc1N0YW1wKG1vdmVzLCBjKTtcclxufSlcclxuXHJcbmNoZWNrTWFwLnNldChUeXBlLmJpc2hvcCwgZnVuY3Rpb24oYzpDaGVzc1BpZWNlLCBncmlkOkNoZXNzQm9hcmQpOmJvb2xlYW5bXVtde1xyXG4gICAgdmFyIGRpcmVjdGlvbnMgPSBbXHJcbiAgICAgICAgbmV3IFZlY3RvcigxLCAxKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0xLCAtMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigxLCAtMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigtMSwgMSlcclxuICAgIF1cclxuICAgIHJldHVybiBkaXJlY3Rpb25TdGFtcChkaXJlY3Rpb25zLCBjKTtcclxufSlcclxuXHJcbmNoZWNrTWFwLnNldChUeXBlLnF1ZWVuLCBmdW5jdGlvbihjOkNoZXNzUGllY2UpOmJvb2xlYW5bXVtde1xyXG4gICAgdmFyIGRpcmVjdGlvbnMgPSBbXHJcbiAgICAgICAgbmV3IFZlY3RvcigxLCAxKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0xLCAtMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigxLCAtMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigtMSwgMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigxLCAwKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0xLCAwKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDAsIDEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoMCwgLTEpXHJcbiAgICBdXHJcbiAgICByZXR1cm4gZGlyZWN0aW9uU3RhbXAoZGlyZWN0aW9ucywgYyk7XHJcbn0pXHJcblxyXG5jaGVja01hcC5zZXQoVHlwZS5raW5nLCBmdW5jdGlvbihjOkNoZXNzUGllY2UsIGdyaWQ6Q2hlc3NCb2FyZCk6Ym9vbGVhbltdW117XHJcbiAgICB2YXIgbW92ZXMgPSBbXHJcbiAgICAgICAgbmV3IFZlY3RvcigwLCAxKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDEsIDEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoMSwgMCksXHJcbiAgICAgICAgbmV3IFZlY3RvcigxLCAtMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigwLCAtMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigtMSwgLTEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTEsIDApLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTEsIDEpLFxyXG4gICAgXVxyXG4gICAgdmFyIGxlZ2FsTW92ZXMgPSBtb3Zlc1N0YW1wKG1vdmVzLCBjKTtcclxuICAgIFxyXG4gICAgaWYoIWMubW92ZWQpey8vY2FzdGxpbmdcclxuICAgICAgICB2YXIgYWFiYiA9IG5ldyBBQUJCKG5ldyBWZWN0b3IoKSwgYy5jaGVzc0JvYXJkLnNpemUuYygpLnN1YihuZXcgVmVjdG9yKDEsMSkpKVxyXG4gICAgICAgIHZhciBvcGVucyA9IFV0aWxzLmNyZWF0ZTJkQXJyYXk8Ym9vbGVhbj4oYy5jaGVzc0JvYXJkLnNpemUsIGZhbHNlKVxyXG4gICAgICAgIHZhciByb29rRGlyZWN0aW9ucyA9IFtcclxuICAgICAgICAgICAgbmV3IFZlY3RvcigxLCAwKSxcclxuICAgICAgICAgICAgbmV3IFZlY3RvcigtMSwgMCksXHJcbiAgICAgICAgICAgIG5ldyBWZWN0b3IoMCwgMSksXHJcbiAgICAgICAgICAgIG5ldyBWZWN0b3IoMCwgLTEpXHJcbiAgICAgICAgXVxyXG4gICAgICAgIGZvcih2YXIgZGlyZWN0aW9uIG9mIHJvb2tEaXJlY3Rpb25zKXtcclxuICAgICAgICAgICAgdmFyIGN1cnJlbnRDaGVja2luZ1BvcyA9IGMucG9zLmMoKTtcclxuICAgICAgICAgICAgd2hpbGUodHJ1ZSl7XHJcbiAgICAgICAgICAgICAgICBjdXJyZW50Q2hlY2tpbmdQb3MuYWRkKGRpcmVjdGlvbilcclxuICAgICAgICAgICAgICAgIGlmKGFhYmIuY29sbGlkZShjdXJyZW50Q2hlY2tpbmdQb3MpKXtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcGllY2UgPSBjLmNoZXNzQm9hcmQuZ3JpZFtjdXJyZW50Q2hlY2tpbmdQb3MueF1bY3VycmVudENoZWNraW5nUG9zLnldXHJcbiAgICAgICAgICAgICAgICAgICAgaWYocGllY2UgPT0gbnVsbCljb250aW51ZVxyXG4gICAgICAgICAgICAgICAgICAgIGVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHBpZWNlLnRlYW0gPT0gYy50ZWFtICYmIHBpZWNlLnR5cGUgPT0gVHlwZS5yb29rICYmICFwaWVjZS5tb3ZlZCl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIganVtcFBvcyA9IGMucG9zLmMoKS5hZGQoZGlyZWN0aW9uLmMoKS5zY2FsZSgyKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxlZ2FsTW92ZXNbanVtcFBvcy54XVtqdW1wUG9zLnldID0gdHJ1ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9ZWxzZSBicmVha1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIH1lbHNlIGJyZWFrXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGxlZ2FsTW92ZXNcclxuICAgIFxyXG59KVxyXG5cclxuZnVuY3Rpb24gZmlsdGVyTW92ZXNPZmZCb2FyZChtb3ZlczpWZWN0b3JbXSwgc2l6ZTpWZWN0b3IsIHBvczpWZWN0b3IpOlZlY3Rvcltde1xyXG4gICAgdmFyIGxlZ2FsTW92ZXM6VmVjdG9yW10gPSBbXTtcclxuICAgIHZhciBhYWJiID0gbmV3IEFBQkIobmV3IFZlY3RvcigpLCBzaXplLmMoKS5zdWIobmV3IFZlY3RvcigxLCAxKSkpXHJcblxyXG4gICAgZm9yKHZhciBtb3ZlIG9mIG1vdmVzKXtcclxuICAgICAgICB2YXIgd3MgPSBtb3ZlLmMoKS5hZGQocG9zKVxyXG4gICAgICAgIGlmKGFhYmIuY29sbGlkZSh3cykpbGVnYWxNb3Zlcy5wdXNoKG1vdmUpXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGxlZ2FsTW92ZXM7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRpcmVjdGlvblN0YW1wKGRpcmVjdGlvbnM6VmVjdG9yW10sIGM6Q2hlc3NQaWVjZSk6Ym9vbGVhbltdW117XHJcbiAgICB2YXIgYWFiYiA9IG5ldyBBQUJCKG5ldyBWZWN0b3IoKSwgYy5jaGVzc0JvYXJkLnNpemUuYygpLnN1YihuZXcgVmVjdG9yKDEsMSkpKVxyXG4gICAgdmFyIG9wZW5zID0gVXRpbHMuY3JlYXRlMmRBcnJheTxib29sZWFuPihjLmNoZXNzQm9hcmQuc2l6ZSwgZmFsc2UpXHJcbiAgICBmb3IodmFyIGRpcmVjdGlvbiBvZiBkaXJlY3Rpb25zKXtcclxuICAgICAgICB2YXIgY3VycmVudENoZWNraW5nUG9zID0gYy5wb3MuYygpO1xyXG4gICAgICAgIHdoaWxlKHRydWUpe1xyXG4gICAgICAgICAgICBjdXJyZW50Q2hlY2tpbmdQb3MuYWRkKGRpcmVjdGlvbilcclxuICAgICAgICAgICAgaWYoYWFiYi5jb2xsaWRlKGN1cnJlbnRDaGVja2luZ1Bvcykpe1xyXG4gICAgICAgICAgICAgICAgdmFyIHBpZWNlID0gYy5jaGVzc0JvYXJkLmdyaWRbY3VycmVudENoZWNraW5nUG9zLnhdW2N1cnJlbnRDaGVja2luZ1Bvcy55XVxyXG4gICAgICAgICAgICAgICAgaWYocGllY2UgPT0gbnVsbClvcGVuc1tjdXJyZW50Q2hlY2tpbmdQb3MueF1bY3VycmVudENoZWNraW5nUG9zLnldID0gdHJ1ZVxyXG4gICAgICAgICAgICAgICAgZWxzZXtcclxuICAgICAgICAgICAgICAgICAgICBpZihwaWVjZS50ZWFtICE9IGMudGVhbSlvcGVuc1tjdXJyZW50Q2hlY2tpbmdQb3MueF1bY3VycmVudENoZWNraW5nUG9zLnldID0gdHJ1ZVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrLy9icmVhayBpbiBib3RoIGNhc2VzIChpZi9lbHNlIHN0YXRlbWVudCBib3RoIGJyZWFrKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9ZWxzZSBicmVha1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBvcGVucztcclxufVxyXG5cclxuZnVuY3Rpb24gbW92ZXNTdGFtcChtb3ZlczpWZWN0b3JbXSwgYzpDaGVzc1BpZWNlKTpib29sZWFuW11bXXtcclxuICAgIHZhciBhYWJiID0gbmV3IEFBQkIobmV3IFZlY3RvcigpLCBjLmNoZXNzQm9hcmQuc2l6ZS5jKCkuc3ViKG5ldyBWZWN0b3IoMSwxKSkpXHJcbiAgICB2YXIgb3BlbnMgPSBVdGlscy5jcmVhdGUyZEFycmF5PGJvb2xlYW4+KGMuY2hlc3NCb2FyZC5zaXplLCBmYWxzZSlcclxuICAgIGZvcih2YXIgbW92ZSBvZiBtb3Zlcyl7XHJcbiAgICAgICAgdmFyIGN1cnJlbnRDaGVja2luZ1BvcyA9IGMucG9zLmMoKTtcclxuICAgICAgICBjdXJyZW50Q2hlY2tpbmdQb3MuYWRkKG1vdmUpXHJcblxyXG4gICAgICAgIGlmKGFhYmIuY29sbGlkZShjdXJyZW50Q2hlY2tpbmdQb3MpKXtcclxuICAgICAgICAgICAgdmFyIHBpZWNlID0gYy5jaGVzc0JvYXJkLmdyaWRbY3VycmVudENoZWNraW5nUG9zLnhdW2N1cnJlbnRDaGVja2luZ1Bvcy55XVxyXG4gICAgICAgICAgICBpZihwaWVjZSA9PSBudWxsIHx8IHBpZWNlLnRlYW0gIT0gYy50ZWFtKW9wZW5zW2N1cnJlbnRDaGVja2luZ1Bvcy54XVtjdXJyZW50Q2hlY2tpbmdQb3MueV0gPSB0cnVlXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG9wZW5zXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFBpZWNlSW5EaXJlY3Rpb24oZnJvbTpWZWN0b3IsIGRpcmVjdGlvbjpWZWN0b3IsIHR5cGU6VHlwZSwgY2hlc3NCb2FyZDpDaGVzc0JvYXJkKTpDaGVzc1BpZWNle1xyXG4gICAgdmFyIGFhYmIgPSBuZXcgQUFCQihuZXcgVmVjdG9yKCksIGNoZXNzQm9hcmQuc2l6ZS5jKCkuc3ViKG5ldyBWZWN0b3IoMSwxKSkpXHJcbiAgICB2YXIgY3VycmVudENoZWNraW5nUG9zID0gZnJvbS5jKClcclxuICAgIHdoaWxlKHRydWUpe1xyXG4gICAgICAgIGN1cnJlbnRDaGVja2luZ1Bvcy5hZGQoZGlyZWN0aW9uKVxyXG4gICAgICAgIGlmKGFhYmIuY29sbGlkZShjdXJyZW50Q2hlY2tpbmdQb3MpKXtcclxuICAgICAgICAgICAgdmFyIHBpZWNlID0gY2hlc3NCb2FyZC5ncmlkW2N1cnJlbnRDaGVja2luZ1Bvcy54XVtjdXJyZW50Q2hlY2tpbmdQb3MueV1cclxuICAgICAgICAgICAgaWYocGllY2UgJiYgcGllY2UudHlwZSA9PSB0eXBlKXJldHVybiBwaWVjZVxyXG4gICAgICAgIH1lbHNlIGJyZWFrXHJcbiAgICB9XHJcbn1cclxuXHJcbnZhciBpbWFnZU1hcEIgPSB7fSBcclxudmFyIGltYWdlTWFwVyA9IHt9IFxyXG5pZih0eXBlb2YgZG9jdW1lbnQgIT0gJ3VuZGVmaW5lZCcpeyBcclxuICAgIHZhciB0eXBlcyA9IFsncGF3bicsICdyb29rJywgJ2Jpc2hvcCcsICdxdWVlbicsICdraW5nJywgJ2tuaWdodCddIFxyXG4gICAgZm9yKHZhciB0eXBlIG9mIHR5cGVzKXsgXHJcbiAgICAgICAgdmFyIGltYWdlQiA9IG5ldyBJbWFnZSgpIFxyXG4gICAgICAgIHZhciBpbWFnZVcgPSBuZXcgSW1hZ2UoKSBcclxuICAgICAgICBpbWFnZUIuc3JjID0gJ3Jlc291cmNlcy9iJyArIHR5cGUgKyAnLnBuZycgXHJcbiAgICAgICAgaW1hZ2VXLnNyYyA9ICdyZXNvdXJjZXMvdycgKyB0eXBlICsgJy5wbmcnIFxyXG4gICAgICAgIGltYWdlQi5vbmxvYWQgPSAoKSA9PiB7IFxyXG4gICAgICAgICAgICBFdmVudEhhbmRsZXIudHJpZ2dlcignaW1hZ2VMb2FkZWQnLCB7fSkgXHJcbiAgICAgICAgfSBcclxuICAgICAgICBpbWFnZVcub25sb2FkID0gKCkgPT4geyBcclxuICAgICAgICAgICAgRXZlbnRIYW5kbGVyLnRyaWdnZXIoJ2ltYWdlTG9hZGVkJywge30pIFxyXG4gICAgICAgIH0gXHJcbiAgICAgICAgaW1hZ2VNYXBCW3R5cGVdID0gaW1hZ2VCIFxyXG4gICAgICAgIGltYWdlTWFwV1t0eXBlXSA9IGltYWdlVyBcclxuICAgIH0gXHJcbn0gXHJcblxyXG52YXIgbGV0dGVyTWFwID0gW11cclxubGV0dGVyTWFwW1R5cGUuYmlzaG9wXSA9ICdCJ1xyXG5sZXR0ZXJNYXBbVHlwZS5raW5nXSA9ICdLJ1xyXG5sZXR0ZXJNYXBbVHlwZS5rbmlnaHRdID0gJ0gnXHJcbmxldHRlck1hcFtUeXBlLnBhd25dID0gJ1AnXHJcbmxldHRlck1hcFtUeXBlLnF1ZWVuXSA9ICdRJ1xyXG5sZXR0ZXJNYXBbVHlwZS5yb29rXSA9ICdSJ1xyXG5cclxuZXhwb3J0ID0gQ2hlc3NQaWVjZSIsImNsYXNzIFdlYklPQ3tcclxuICAgIHNvY2tldDpXZWJTb2NrZXRcclxuICAgIHJvdXRlTWFwXHJcblxyXG4gICAgY29uc3RydWN0b3Ioc29ja2V0OldlYlNvY2tldCl7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XHJcbiAgICAgICAgdGhpcy5yb3V0ZU1hcCA9IHt9O1xyXG4gICAgICAgIHRoaXMuc29ja2V0Lm9ubWVzc2FnZSA9IChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICB2YXIgZGF0YSA9IGV2ZW50LmRhdGFcclxuICAgICAgICAgICAgdmFyIHBhcnNlZERhdGEgPSBKU09OLnBhcnNlKGRhdGEpO1xyXG4gICAgICAgICAgICBpZih0aGlzLnJvdXRlTWFwW3BhcnNlZERhdGEucm91dGVdKXtcclxuICAgICAgICAgICAgICAgIHRoaXMucm91dGVNYXBbcGFyc2VkRGF0YS5yb3V0ZV0ocGFyc2VkRGF0YSk7XHJcbiAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJzQwNDogJyArIHBhcnNlZERhdGEucm91dGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIG9uKHJvdXRlLCBhY3Rpb24pey8vYWN0aW9ucyBuZWVkIHRvIGJlIHBhc3NlZCB1c2luZyBhbiBhcnJvdyBmdW5jdGlvbiBvciBmdW5jdGlvbnMgYmluZGVkIHdpdGggLmJpbmQodGhpcylcclxuICAgICAgICB0aGlzLnJvdXRlTWFwW3JvdXRlXSA9IGFjdGlvbjtcclxuICAgIH1cclxuXHJcbiAgICBzZW5kKHJvdXRlLCB2YWx1ZSl7Ly92YWx1ZSBpcyBvYmplY3QgZW4gZ2VzZXJpYWxpemVkXHJcbiAgICAgICAgdmFsdWUucm91dGUgPSByb3V0ZTtcclxuICAgICAgICBpZih0aGlzLnNvY2tldC5yZWFkeVN0YXRlPT0xKXtcclxuICAgICAgICAgIHRoaXMuc29ja2V0LnNlbmQoSlNPTi5zdHJpbmdpZnkodmFsdWUpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgb25jbG9zZSgpe1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBjbG9zZSgpe1xyXG4gICAgICAgIHRoaXMuc29ja2V0LmNsb3NlKCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCA9IFdlYklPQyIsImRlY2xhcmUgY2xhc3MgTWFwPEssVj57XHJcbiAgICBjb25zdHJ1Y3RvcigpXHJcbiAgICBnZXQoYTpLKTpWXHJcbiAgICBzZXQoYTpLLCBiOlYpXHJcbn1cclxuXHJcbmNsYXNzIEV2ZW50SGFuZGxlcntcclxuXHJcbiAgICBwcml2YXRlIHN0YXRpYyBpbnN0YW5jZTpFdmVudEhhbmRsZXJcclxuICAgIHByaXZhdGUgc3RhdGljIGV2ZW50TWFwOk1hcDxzdHJpbmcsICgoYW55PykgPT4gYW55KVtdPiA9IG5ldyBNYXA8c3RyaW5nLCAoKGFueT8pID0+IGFueSlbXT4oKTtcclxuXHJcbiAgICBcclxuXHJcbiAgICAvLyBzdGF0aWMgZ2V0SW5zdGFuY2UoKTpFdmVudEhhbmRsZXJ7XHJcbiAgICAvLyAgICAgaWYoRXZlbnRIYW5kbGVyLmluc3RhbmNlID09IG51bGwpe1xyXG4gICAgLy8gICAgICAgICBFdmVudEhhbmRsZXIuaW5zdGFuY2UgPSBuZXcgRXZlbnRIYW5kbGVyKCk7XHJcbiAgICAvLyAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgLy8gICAgIHJldHVybiBFdmVudEhhbmRsZXIuaW5zdGFuY2U7XHJcbiAgICAvLyB9XHJcblxyXG4gICAgc3RhdGljIHRyaWdnZXIoZXZlbnQ6c3RyaW5nLCBkYXRhPzphbnkpe1xyXG4gICAgICAgIGlmKEV2ZW50SGFuZGxlci5ldmVudE1hcC5nZXQoZXZlbnQpID09IG51bGwpcmV0dXJuXHJcbiAgICAgICAgZm9yKHZhciBjYWxsYmFjayBvZiBFdmVudEhhbmRsZXIuZXZlbnRNYXAuZ2V0KGV2ZW50KSljYWxsYmFjayhkYXRhKVxyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBzdWJzY3JpYmUoZXZlbnQ6c3RyaW5nLCBjYWxsYmFjazooZGF0YTphbnkpID0+IHZvaWQpe1xyXG4gICAgICAgIGlmKEV2ZW50SGFuZGxlci5ldmVudE1hcC5nZXQoZXZlbnQpID09IG51bGwpRXZlbnRIYW5kbGVyLmV2ZW50TWFwLnNldChldmVudCwgW10pXHJcbiAgICAgICAgRXZlbnRIYW5kbGVyLmV2ZW50TWFwLmdldChldmVudCkucHVzaChjYWxsYmFjaylcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgZGV0YWNoKGV2ZW50OnN0cmluZywgY2FsbGJhY2s6KCkgPT4gdm9pZCk6dm9pZHtcclxuICAgICAgICB2YXIgc3VibGlzdCA9IEV2ZW50SGFuZGxlci5ldmVudE1hcC5nZXQoZXZlbnQpO1xyXG4gICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBzdWJsaXN0Lmxlbmd0aDsgaSsrKXtcclxuICAgICAgICAgICAgdmFyIGNhbGxiYWNrSW5NYXAgPSBzdWJsaXN0W2ldO1xyXG4gICAgICAgICAgICBpZihjYWxsYmFja0luTWFwID09IGNhbGxiYWNrKXtcclxuICAgICAgICAgICAgICAgIHN1Ymxpc3Quc3BsaWNlKGksMSlcclxuICAgICAgICAgICAgICAgIHJldHVybiAgXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCA9IEV2ZW50SGFuZGxlciIsInZhciBjYW52YXMgPSA8SFRNTENhbnZhc0VsZW1lbnQ+IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYW52YXMnKVxyXG52YXIgY3R4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpXHJcbnZhciBsYXN0VXBkYXRlID0gRGF0ZS5ub3coKTtcclxudmFyIGR0Om51bWJlcjtcclxudmFyIHBpID0gTWF0aC5QSVxyXG52YXIgcmVzZXRCdG4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcmVzZXRCdG4nKVxyXG52YXIgdGVhbUxhYmVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3RlYW1MYWJlbCcpXHJcbnZhciB0dXJuTGFiZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjdHVybkxhYmVsJylcclxuXHJcbmltcG9ydCBWZWN0b3IgPSByZXF1aXJlKCcuL3ZlY3RvcicpXHJcbmltcG9ydCBVdGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKVxyXG5pbXBvcnQgRXZlbnRIYW5kbGVyID0gcmVxdWlyZSgnLi9ldmVudEhhbmRsZXInKVxyXG5pbXBvcnQgQ2hlc3NQaWVjZSA9IHJlcXVpcmUoJy4vQ2hlc3NQaWVjZScpXHJcbmltcG9ydCBDaGVzc0JvYXJkID0gcmVxdWlyZSgnLi9DaGVzc0JvYXJkJylcclxuaW1wb3J0IEFBQkIgPSByZXF1aXJlKCcuL0FBQkInKVxyXG5pbXBvcnQgV2ViSU9DID0gcmVxdWlyZSgnLi9XZWJJT0MnKVxyXG5cclxudmFyIHNvY2tldFxyXG5pZih3aW5kb3cubG9jYXRpb24uaHJlZiA9PSAnaHR0cDovL2xvY2FsaG9zdDo4MDAwLycpc29ja2V0ID0gbmV3IFdlYlNvY2tldChcIndzOi8vbG9jYWxob3N0OjgwMDAvXCIpO1xyXG5lbHNlIHNvY2tldCA9IG5ldyBXZWJTb2NrZXQoXCJ3c3M6Ly9wYXVsY2hlc3MuaGVyb2t1YXBwLmNvbS9cIik7XHJcbnZhciB3ZWJJT0MgPSBuZXcgV2ViSU9DKHNvY2tldCk7XHJcbmVudW0gVGVhbXtCbGFjaywgV2hpdGV9XHJcbmVudW0gVHlwZXtwYXduLCByb29rLCBrbmlnaHQsIGJpc2hvcCwgcXVlZW4sIGtpbmd9XHJcbnZhciB0ZWFtOlRlYW1cclxuXHJcbnZhciBjYW52YXNDb250YWluZXI6YW55ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2NhbnZhcy1jb250YWluZXInKVxyXG5jYW52YXMud2lkdGggPSBjYW52YXNDb250YWluZXIub2Zmc2V0V2lkdGggLSAzXHJcbmNhbnZhcy5oZWlnaHQgPSBjYW52YXNDb250YWluZXIub2Zmc2V0SGVpZ2h0IC0gMTAwXHJcblxyXG52YXIgaW1hZ2VMb2FkQ291bnRlciA9IDA7IFxyXG5FdmVudEhhbmRsZXIuc3Vic2NyaWJlKCdpbWFnZUxvYWRlZCcsIChkYXRhKSA9PnsgXHJcbiAgICBpbWFnZUxvYWRDb3VudGVyKys7IFxyXG4gICAgaWYoaW1hZ2VMb2FkQ291bnRlciA+PSAxMil7IFxyXG4gICAgICAgIGNoZXNzQm9hcmQuZHJhdyhjdHh0LCBvZmZzZXQpIFxyXG4gICAgfSBcclxufSkgXHJcblxyXG52YXIgY2hlc3NCb2FyZCA9IG5ldyBDaGVzc0JvYXJkKCk7XHJcblxyXG5zZXRJbnRlcnZhbChmdW5jdGlvbigpe1xyXG4gICAgdmFyIG5vdyA9IERhdGUubm93KCk7XHJcbiAgICBkdCA9IChub3cgLSBsYXN0VXBkYXRlKSAvIDEwMDA7XHJcbiAgICBsYXN0VXBkYXRlID0gbm93O1xyXG4gICAgZHQgPSBVdGlscy5taW4oZHQsIDEpXHJcbiAgICB1cGRhdGUoKVxyXG4gICAgZHJhdygpO1xyXG4gICAgXHJcbn0sIDEwMDAgLyA2MCk7XHJcbnZhciBoYWxmc2l6ZSA9IGNoZXNzQm9hcmQuc2l6ZS54ICogY2hlc3NCb2FyZC5zcXVhcmVTaXplLnggLyAyXHJcbnZhciBvZmZzZXQgPSBuZXcgVmVjdG9yKE1hdGguZmxvb3IoY2FudmFzLndpZHRoIC8gMiAtIGhhbGZzaXplKSwgTWF0aC5mbG9vcihjYW52YXMuaGVpZ2h0IC8gMiAtIGhhbGZzaXplKSlcclxuY2hlc3NCb2FyZC5kcmF3KGN0eHQsIG9mZnNldClcclxuXHJcblxyXG5yZXNldEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+e1xyXG4gICAgd2ViSU9DLnNlbmQoJ3Jlc2V0Jywge30pXHJcbn0pXHJcblxyXG53ZWJJT0Mub24oJ3VwZGF0ZScsIChkYXRhKT0+e1xyXG4gICAgY2hlc3NCb2FyZCA9IENoZXNzQm9hcmQuZGVzZXJpYWxpemUoZGF0YS5jaGVzc0JvYXJkKVxyXG4gICAgdGVhbSA9IGRhdGEudGVhbVxyXG4gICAgdGVhbUxhYmVsLmlubmVySFRNTCA9IFRlYW1bdGVhbV1cclxuICAgIHR1cm5MYWJlbC5pbm5lckhUTUwgPSBUZWFtW2NoZXNzQm9hcmQudHVybl1cclxuICAgIGNoZXNzQm9hcmQuZHJhdyhjdHh0LCBvZmZzZXQpXHJcbn0pXHJcblxyXG5kb2N1bWVudC5vbm1vdXNlZG93biA9IChldnQpID0+IHtcclxuICAgIHZhciBhYWJiID0gbmV3IEFBQkIobmV3IFZlY3RvcigpLCBjaGVzc0JvYXJkLnNpemUuYygpLnN1YihuZXcgVmVjdG9yKDEsMSkpKVxyXG4gICAgdmFyIHYgPSBjaGVzc0JvYXJkLnZlY3RvclRvR3JpZFBvcyhnZXRNb3VzZVBvcyhjYW52YXMsIGV2dCkuc3ViKG9mZnNldCkpXHJcbiAgICBcclxuICAgIFxyXG4gICAgaWYoIWFhYmIuY29sbGlkZSh2KSl7XHJcbiAgICAgICAgY2hlc3NCb2FyZC5zZWxlY3RlZCA9IG51bGw7XHJcbiAgICB9ZWxzZXtcclxuICAgICAgICB2YXIgcGllY2UgPSBjaGVzc0JvYXJkLmdyaWRbdi54XVt2LnldXHJcblxyXG4gICAgICAgIGlmKGNoZXNzQm9hcmQuc2VsZWN0ZWQgPT0gbnVsbCl7XHJcbiAgICAgICAgICAgIGlmKHBpZWNlICYmIHBpZWNlLnRlYW0gPT0gY2hlc3NCb2FyZC50dXJuICYmIHBpZWNlLnRlYW0gPT0gdGVhbSl7XHJcbiAgICAgICAgICAgICAgICBjaGVzc0JvYXJkLnNlbGVjdGVkID0gcGllY2VcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICBpZihwaWVjZSAmJiBwaWVjZS50ZWFtID09IGNoZXNzQm9hcmQudHVybiljaGVzc0JvYXJkLnNlbGVjdGVkID0gcGllY2VcclxuICAgICAgICAgICAgZWxzZXtcclxuICAgICAgICAgICAgICAgIGlmKGNoZXNzQm9hcmQuc2VsZWN0ZWQuaXNMZWdhbE1vdmUodikpe1xyXG4gICAgICAgICAgICAgICAgICAgIHdlYklPQy5zZW5kKCdtb3ZlJywge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmcm9tOmNoZXNzQm9hcmQuc2VsZWN0ZWQucG9zLnNlcmlhbGl6ZSgpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0bzp2LnNlcmlhbGl6ZSgpXHJcbiAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNoZXNzQm9hcmQuc2VsZWN0ZWQgPSBudWxsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgY2hlc3NCb2FyZC5kcmF3KGN0eHQsIG9mZnNldClcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlKCl7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyYXcoKXtcclxuICAgIC8vY3R4dC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0TW91c2VQb3MoY2FudmFzLCBldnQpOlZlY3RvciB7XHJcbiAgICB2YXIgcmVjdCA9IGNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgIHJldHVybiBuZXcgVmVjdG9yKGV2dC5jbGllbnRYIC0gcmVjdC5sZWZ0LCBldnQuY2xpZW50WSAtIHJlY3QudG9wKVxyXG59IiwiaW1wb3J0IFZlY3RvciA9IHJlcXVpcmUoJy4vdmVjdG9yJylcclxuXHJcbm5hbWVzcGFjZSB1dGlsc3tcclxuICAgIGV4cG9ydCBmdW5jdGlvbiBtYXAodmFsMTpudW1iZXIsIHN0YXJ0MTpudW1iZXIsIHN0b3AxOm51bWJlciwgc3RhcnQyOm51bWJlciwgc3RvcDI6bnVtYmVyKXtcclxuICAgICAgICByZXR1cm4gc3RhcnQyICsgKHN0b3AyIC0gc3RhcnQyKSAqICgodmFsMSAtIHN0YXJ0MSkgLyAoc3RvcDEgLSBzdGFydDEpKVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBpblJhbmdlKG1pbjpudW1iZXIgLG1heDpudW1iZXIgLHZhbHVlOm51bWJlcil7XHJcbiAgICAgICAgaWYobWluID4gbWF4KXtcclxuICAgICAgICAgICAgdmFyIHRlbXAgPSBtaW47XHJcbiAgICAgICAgICAgIG1pbiA9IG1heDtcclxuICAgICAgICAgICAgbWF4ID0gdGVtcDtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHZhbHVlIDw9IG1heCAmJiB2YWx1ZSA+PSBtaW47XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIG1pbihhOm51bWJlciwgYjpudW1iZXIpOm51bWJlcntcclxuICAgICAgICBpZihhIDwgYilyZXR1cm4gYTtcclxuICAgICAgICByZXR1cm4gYjtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gbWF4KGE6bnVtYmVyLCBiOm51bWJlcik6bnVtYmVye1xyXG4gICAgICAgIGlmKGEgPiBiKXJldHVybiBhO1xyXG4gICAgICAgIHJldHVybiBiO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBjbGFtcCh2YWw6bnVtYmVyLCBtaW46bnVtYmVyLCBtYXg6bnVtYmVyKTpudW1iZXJ7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubWF4KHRoaXMubWluKHZhbCwgbWF4KSwgbWluKVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiByYW5nZUNvbnRhaW4oYTEsYTIsYjEsYjIpey8vYXMgaW4gZG9lcyBhIGVuY2xvc2UgYi0tLS0tIHNvIHJldHVybnMgdHJ1ZSBpZiBiIGlzIHNtYWxsZXIgaW4gYWxsIHdheXNcclxuICAgICAgICByZXR1cm4gbWF4KGExLCBhMikgPj0gbWF4KGIxLCBiMikgJiYgbWluKGExLGEyKSA8PSBtYXgoYjEsYjIpO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBjcmVhdGUyZEFycmF5PFQ+KHY6VmVjdG9yLCBmaWxsOlQpOlRbXVtde1xyXG4gICAgICAgIHZhciByb3dzOlRbXVtdID0gbmV3IEFycmF5KHYueClcclxuICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgdi54OyBpKyspe1xyXG4gICAgICAgICAgICByb3dzW2ldID0gbmV3IEFycmF5KHYueSlcclxuICAgICAgICAgICAgZm9yKHZhciBqID0gMDsgaiA8IHYueTsgaisrKXtcclxuICAgICAgICAgICAgICAgIHJvd3NbaV1bal0gPSBmaWxsXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHJvd3M7XHJcbiAgICB9XHJcblxyXG4gICAgXHJcbn1cclxuXHJcbmV4cG9ydCA9IHV0aWxzOyIsImNsYXNzIFZlY3RvcntcclxuICAgIHg6bnVtYmVyO1xyXG4gICAgeTpudW1iZXI7XHJcbiAgICBcclxuICAgIGNvbnN0cnVjdG9yKHg6bnVtYmVyID0gMCwgeTpudW1iZXIgPSAwKXtcclxuICAgICAgICB0aGlzLnggPSB4O1xyXG4gICAgICAgIHRoaXMueSA9IHk7XHJcbiAgICB9XHJcblxyXG4gICAgYWRkKHZlY3RvcjpWZWN0b3IpOlZlY3RvcntcclxuICAgICAgICB0aGlzLnggKz0gdmVjdG9yLng7XHJcbiAgICAgICAgdGhpcy55ICs9IHZlY3Rvci55O1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHN1Yih2ZWN0b3I6VmVjdG9yKTpWZWN0b3J7XHJcbiAgICAgICAgdGhpcy54IC09IHZlY3Rvci54O1xyXG4gICAgICAgIHRoaXMueSAtPSB2ZWN0b3IueTtcclxuICAgICAgICByZXR1cm4gdGhpc1xyXG4gICAgfVxyXG5cclxuICAgIGxlbmd0aCgpe1xyXG4gICAgICAgIHJldHVybiBNYXRoLnBvdyh0aGlzLnggKiB0aGlzLnggKyB0aGlzLnkgKiB0aGlzLnksIDAuNSk7XHJcbiAgICB9XHJcblxyXG4gICAgbm9ybWFsaXplKCl7XHJcbiAgICAgICAgdmFyIGxlbmd0aCA9IHRoaXMubGVuZ3RoKCk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc2NhbGUoMSAvIGxlbmd0aClcclxuICAgIH1cclxuXHJcbiAgICBzY2FsZShzY2FsYXI6bnVtYmVyKTpWZWN0b3J7XHJcbiAgICAgICAgdGhpcy54ICo9IHNjYWxhcjtcclxuICAgICAgICB0aGlzLnkgKj0gc2NhbGFyXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgcm90YXRlKHI6bnVtYmVyLCBvcmlnaW46VmVjdG9yID0gbmV3IFZlY3RvcigpKTpWZWN0b3J7XHJcbiAgICAgICAgdmFyIG9mZnNldCA9IHRoaXMuYygpLnN1YihvcmlnaW4pXHJcbiAgICAgICAgdmFyIHggPSBvZmZzZXQueCAqIE1hdGguY29zKHIpIC0gb2Zmc2V0LnkgKiBNYXRoLnNpbihyKVxyXG4gICAgICAgIHZhciB5ID0gb2Zmc2V0LnggKiBNYXRoLnNpbihyKSArIG9mZnNldC55ICogTWF0aC5jb3MocilcclxuICAgICAgICBvZmZzZXQueCA9IHg7IG9mZnNldC55ID0geTtcclxuICAgICAgICB2YXIgYmFjayA9IG9mZnNldC5hZGQob3JpZ2luKVxyXG4gICAgICAgIHRoaXMueCA9IGJhY2sueDsgdGhpcy55ID0gYmFjay55O1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIGxlcnAodmVjdG9yOlZlY3Rvciwgd2VpZ3RoOm51bWJlcil7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc2NhbGUoMSAtIHdlaWd0aCkuYWRkKHZlY3Rvci5jKCkuc2NhbGUod2VpZ3RoKSlcclxuICAgIH1cclxuXHJcbiAgICBjKCk6VmVjdG9ye1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjdG9yKHRoaXMueCwgdGhpcy55KVxyXG4gICAgfVxyXG5cclxuICAgIGVxdWFscyh2OlZlY3Rvcik6Ym9vbGVhbntcclxuICAgICAgICBpZih2ID09IG51bGwpcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgcmV0dXJuIHRoaXMueCA9PSB2LnggJiYgdGhpcy55ID09IHYueTtcclxuICAgIH1cclxuXHJcbiAgICBzZXQodmVjdG9yOlZlY3Rvcik6VmVjdG9ye1xyXG4gICAgICAgIHRoaXMueCA9IHZlY3Rvci54O1xyXG4gICAgICAgIHRoaXMueSA9IHZlY3Rvci55O1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHBlcnBEb3QodmVjdG9yOlZlY3Rvcik6bnVtYmVye1xyXG4gICAgICAgIHJldHVybiBNYXRoLmF0YW4yKCB0aGlzLnggKiB2ZWN0b3IueSAtIHRoaXMueSAqIHZlY3Rvci54LCB0aGlzLnggKiB2ZWN0b3IueCArIHRoaXMueSAqIHZlY3Rvci55IClcclxuICAgIH1cclxuXHJcbiAgICBkcmF3KGN0eHQ6Q2FudmFzUmVuZGVyaW5nQ29udGV4dDJEKXtcclxuICAgICAgICB2YXIgd2lkdGggPSAxMDt2YXIgaGFsZiA9IHdpZHRoIC8gMjtcclxuICAgICAgICBjdHh0LmZpbGxSZWN0KHRoaXMueCAtIGhhbGYsIHRoaXMueSAtIGhhbGYsIHdpZHRoLCB3aWR0aCk7XHJcbiAgICB9XHJcblxyXG4gICAgbG9vcChjYWxsYmFjazoodjpWZWN0b3IpID0+IHZvaWQpe1xyXG4gICAgICAgIGZvcih2YXIgeCA9IDA7IHggPCB0aGlzLng7IHgrKyl7XHJcbiAgICAgICAgICAgIGZvcih2YXIgeSA9IDA7IHkgPCB0aGlzLnk7IHkrKyl7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhuZXcgVmVjdG9yKHgsIHkpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBzZXJpYWxpemUoKXtcclxuICAgICAgICByZXR1cm4ge3g6dGhpcy54LCB5OnRoaXMueX1cclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgZGVzZXJpYWxpemUob2JqZWN0OmFueSl7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWN0b3Iob2JqZWN0LngsIG9iamVjdC55KVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgPSBWZWN0b3I7Il19
