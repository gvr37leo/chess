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
var AABB = require("./AABB");
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
        this.AABB = new AABB(new Vector(), this.size.c().sub(new Vector(1, 1)));
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
},{"./AABB":1,"./ChessPiece":3,"./utils":7,"./vector":8}],3:[function(require,module,exports){
"use strict";
var Vector = require("./vector");
var utils = require("./utils");
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
        this.posChecker = legalMoveMap.get(type);
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
                    this.posChecker = legalMoveMap.get(Type.queen);
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
var legalMoveMap = new Map();
legalMoveMap.set(Type.pawn, function (c, board) {
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
legalMoveMap.set(Type.rook, function (c, grid) {
    var directions = [
        new Vector(1, 0),
        new Vector(-1, 0),
        new Vector(0, 1),
        new Vector(0, -1)
    ];
    return directionStamp(directions, c);
});
legalMoveMap.set(Type.knight, function (c, grid) {
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
legalMoveMap.set(Type.bishop, function (c, grid) {
    var directions = [
        new Vector(1, 1),
        new Vector(-1, -1),
        new Vector(1, -1),
        new Vector(-1, 1)
    ];
    return directionStamp(directions, c);
});
legalMoveMap.set(Type.queen, function (c) {
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
legalMoveMap.set(Type.king, function (c, grid) {
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
        var opens = utils.create2dArray(c.chessBoard.size, false);
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
                if (c.chessBoard.AABB.collide(currentCheckingPos)) {
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
function directionStamp(directions, c) {
    var legalMoves = utils.create2dArray(c.chessBoard.size, false);
    for (var _i = 0, directions_1 = directions; _i < directions_1.length; _i++) {
        var direction = directions_1[_i];
        var ws = c.pos.c();
        ws.add(direction);
        while (isLegal(c, ws)) {
            legalMoves[ws.x][ws.y] = true;
            if (c.chessBoard.grid[ws.x][ws.y])
                break;
            ws.add(direction);
        }
    }
    return legalMoves;
}
function movesStamp(moves, c) {
    var legalMoves = utils.create2dArray(c.chessBoard.size, false);
    for (var _i = 0, moves_1 = moves; _i < moves_1.length; _i++) {
        var move = moves_1[_i];
        var ws = move.c().add(c.pos);
        if (isLegal(c, ws))
            legalMoves[ws.x][ws.y] = true;
    }
    return legalMoves;
}
function isLegal(c, ws) {
    if (c.chessBoard.AABB.collide(ws)) {
        var piece = c.chessBoard.grid[ws.x][ws.y];
        if (piece && piece.team != c.team || !piece) {
            return true;
        }
    }
    return false;
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
var Vector = require("./vector");
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
    function getMousePos(canvas, evt) {
        var rect = canvas.getBoundingClientRect();
        return new Vector(evt.clientX - rect.left, evt.clientY - rect.top);
    }
    utils.getMousePos = getMousePos;
})(utils || (utils = {}));
module.exports = utils;
},{"./vector":8}],8:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL1Byb2dyYW0gRmlsZXMvbm9kZWpzNjMvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvQUFCQi50cyIsInNyYy9DaGVzc0JvYXJkLnRzIiwic3JjL0NoZXNzUGllY2UudHMiLCJzcmMvV2ViSU9DLnRzIiwic3JjL2V2ZW50SGFuZGxlci50cyIsInNyYy9tYWluLnRzIiwic3JjL3V0aWxzLnRzIiwic3JjL3ZlY3Rvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNDQSwrQkFBaUM7QUFDakM7SUFJSSxjQUFZLEdBQVUsRUFBRSxJQUFXO1FBQy9CLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO1FBQ2YsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7SUFDckIsQ0FBQztJQUVNLGdCQUFXLEdBQWxCLFVBQW1CLENBQVU7UUFDekIsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2pCLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQzFCLEdBQUcsQ0FBQSxDQUFVLFVBQUMsRUFBRCxPQUFDLEVBQUQsZUFBQyxFQUFELElBQUM7WUFBVixJQUFJLENBQUMsVUFBQTtZQUNMLEVBQUUsQ0FBQSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQztnQkFBQSxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxDQUFDLEVBQUUsQ0FBQSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFBQSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDaEMsRUFBRSxDQUFBLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUFBLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLENBQUMsRUFBRSxDQUFBLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUFBLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNuQztRQUNELE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQzNDLENBQUM7SUFFRCx1QkFBUSxHQUFSLFVBQVMsSUFBUztRQUNkLE1BQU0sQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2VBQ2xHLEtBQUssQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNyRyxDQUFDO0lBRUQsc0JBQU8sR0FBUCxVQUFRLENBQVE7UUFDWixNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDL0gsQ0FBQztJQUNMLFdBQUM7QUFBRCxDQTdCQSxBQTZCQyxJQUFBO0FBRUQsaUJBQVMsSUFBSSxDQUFBOzs7QUNqQ2IsaUNBQW1DO0FBQ25DLCtCQUFpQztBQUNqQyw2QkFBK0I7QUFDL0IseUNBQTJDO0FBQzNDLElBQUssSUFBa0I7QUFBdkIsV0FBSyxJQUFJO0lBQUMsaUNBQUssQ0FBQTtJQUFFLGlDQUFLLENBQUE7QUFBQSxDQUFDLEVBQWxCLElBQUksS0FBSixJQUFJLFFBQWM7QUFFdkI7SUFVSTtRQUNJLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxNQUFNLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzNCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxNQUFNLEVBQUUsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3ZFLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxNQUFNLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3BDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQTtRQUN0QixJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQWEsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNqRSxDQUFDO0lBRUQsOEJBQVMsR0FBVCxVQUFVLElBQVcsRUFBRSxFQUFTO1FBQzVCLElBQUksU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQSxDQUFBLGlDQUFpQztRQUMxRSxNQUFNLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUNoQyxDQUFDO0lBRUQseUJBQUksR0FBSixVQUFLLElBQTZCLEVBQUUsTUFBYTtRQUFqRCxpQkFpQkM7UUFmRyxJQUFJLFdBQXVCLENBQUM7UUFDNUIsRUFBRSxDQUFBLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQztZQUFBLFdBQVcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzVFLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQUMsQ0FBQztZQUNiLEVBQUUsQ0FBQSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFBQSxJQUFJLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQTtZQUMvQyxJQUFJO2dCQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFBO1lBQzVCLEVBQUUsQ0FBQSxDQUFDLEtBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUFBLElBQUksQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFBO1lBRXZFLEVBQUUsQ0FBQSxDQUFDLEtBQUksQ0FBQyxZQUFZLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBQUEsSUFBSSxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUE7WUFDM0UsRUFBRSxDQUFBLENBQUMsS0FBSSxDQUFDLFVBQVUsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFBQSxJQUFJLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQTtZQUN2RSxFQUFFLENBQUEsQ0FBQyxLQUFJLENBQUMsUUFBUSxJQUFJLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUFBLElBQUksQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFBO1lBQ2pFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsRUFBRSxLQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxLQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzNILEVBQUUsQ0FBQSxDQUFDLEtBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLENBQUM7Z0JBQ3BCLEtBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEtBQUksQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDM0QsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQztJQUVELG9DQUFlLEdBQWYsVUFBZ0IsQ0FBUTtRQUNwQixJQUFJLENBQUMsR0FBRyxJQUFJLE1BQU0sRUFBRSxDQUFDO1FBQ3JCLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDekMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN6QyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ2IsQ0FBQztJQUVELHdCQUFHLEdBQUgsVUFBSSxDQUFZO1FBQ1osSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCw4QkFBUyxHQUFUO1FBQUEsaUJBcUJDO1FBcEJHLElBQUksSUFBSSxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMvQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFDLENBQUM7WUFDYixFQUFFLENBQUEsQ0FBQyxLQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQUEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFBO1FBQzNFLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxRQUFRLENBQUM7UUFDYixFQUFFLENBQUEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO1lBQUEsUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLENBQUE7UUFDckQsSUFBSSxZQUFZLENBQUM7UUFDakIsRUFBRSxDQUFBLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQztZQUFBLFlBQVksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsRUFBRSxDQUFBO1FBQ2pFLElBQUksVUFBVSxDQUFDO1FBQ2YsRUFBRSxDQUFBLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUFBLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxDQUFBO1FBQzNELElBQUksVUFBVSxHQUFHO1lBQ2IsSUFBSSxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFO1lBQzFCLFVBQVUsRUFBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRTtZQUN0QyxJQUFJLEVBQUMsSUFBSTtZQUNULElBQUksRUFBQyxJQUFJLENBQUMsSUFBSTtZQUNkLFFBQVEsRUFBQyxRQUFRO1lBQ2pCLFlBQVksRUFBQyxZQUFZO1lBQ3pCLFVBQVUsRUFBQyxVQUFVO1NBQ3hCLENBQUE7UUFDRCxNQUFNLENBQUMsVUFBVSxDQUFBO0lBQ3JCLENBQUM7SUFFTSxzQkFBVyxHQUFsQixVQUFtQixNQUFNO1FBQ3JCLElBQUksVUFBVSxHQUFHLElBQUksVUFBVSxFQUFFLENBQUE7UUFDakMsSUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBYSxVQUFVLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2pFLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQUMsQ0FBQztZQUNuQixFQUFFLENBQUEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQUEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDdkcsQ0FBQyxDQUFDLENBQUE7UUFDRixVQUFVLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTtRQUN0QixVQUFVLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUE7UUFDN0IsRUFBRSxDQUFBLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztZQUFBLFVBQVUsQ0FBQyxRQUFRLEdBQUcsVUFBVSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQzVGLEVBQUUsQ0FBQSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUM7WUFBQSxVQUFVLENBQUMsWUFBWSxHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQ3hGLEVBQUUsQ0FBQSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7WUFBQSxVQUFVLENBQUMsVUFBVSxHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ2xGLE1BQU0sQ0FBQyxVQUFVLENBQUE7SUFDckIsQ0FBQztJQUNMLGlCQUFDO0FBQUQsQ0EzRkEsQUEyRkMsSUFBQTtBQUVELGlCQUFTLFVBQVUsQ0FBQTs7O0FDbkduQixpQ0FBbUM7QUFDbkMsK0JBQWlDO0FBRWpDLDZCQUErQjtBQUMvQiw2Q0FBK0M7QUFDL0MsSUFBSyxJQUFrQjtBQUF2QixXQUFLLElBQUk7SUFBQyxpQ0FBSyxDQUFBO0lBQUUsaUNBQUssQ0FBQTtBQUFBLENBQUMsRUFBbEIsSUFBSSxLQUFKLElBQUksUUFBYztBQUN2QixJQUFLLElBQTZDO0FBQWxELFdBQUssSUFBSTtJQUFDLCtCQUFJLENBQUE7SUFBRSwrQkFBSSxDQUFBO0lBQUUsbUNBQU0sQ0FBQTtJQUFFLG1DQUFNLENBQUE7SUFBRSxpQ0FBSyxDQUFBO0lBQUUsK0JBQUksQ0FBQTtBQUFBLENBQUMsRUFBN0MsSUFBSSxLQUFKLElBQUksUUFBeUM7QUFRbEQ7SUFTSSxvQkFBWSxJQUFTLEVBQUUsSUFBUyxFQUFFLEdBQVUsRUFBRSxVQUFxQjtRQUpuRSxVQUFLLEdBQVcsS0FBSyxDQUFBO1FBS2pCLEVBQUUsQ0FBQSxDQUFDLE9BQU8sUUFBUSxJQUFJLFdBQVcsQ0FBQyxDQUFBLENBQUM7WUFDL0IsRUFBRSxDQUFBLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUM7Z0JBQUEsSUFBSSxDQUFDLEtBQUssR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7WUFDeEQsSUFBSTtnQkFBQyxJQUFJLENBQUMsS0FBSyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUMzQyxDQUFDO1FBRUQsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUE7UUFDZCxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQTtRQUM1QixJQUFJLENBQUMsVUFBVSxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDeEMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUE7UUFDaEIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUE7SUFFcEIsQ0FBQztJQUVELHlCQUFJLEdBQUosVUFBSyxJQUE2QixFQUFFLFVBQWlCLEVBQUUsTUFBYTtRQUNoRSxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7UUFDdkMsSUFBSSxRQUFRLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQTtRQUN2QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDLENBQUMsR0FBRyxVQUFVLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDLENBQUMsR0FBRyxVQUFVLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxRQUFRLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQzlMLENBQUM7SUFFRCw0QkFBTyxHQUFQLFVBQVEsRUFBUztRQUNiLEVBQUUsQ0FBQSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQztZQUNuRCxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFBO1lBQzNDLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtZQUNuQyxJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNqQyxFQUFFLENBQUEsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLElBQUksTUFBTSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFBLENBQUM7Z0JBQy9DLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQTtnQkFDbEIsSUFBSSxJQUFJLEdBQUcsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7Z0JBQzVFLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQSxDQUFBLHlFQUF5RTtZQUVoSCxDQUFDO1lBRUQsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQSxDQUFBLDRCQUE0QjtZQUN4RSxFQUFFLENBQUEsQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDO2dCQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBRTVFLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7WUFFYixFQUFFLENBQUEsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQSxDQUFDO2dCQUN2QixFQUFFLENBQUEsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUM7dUJBQ25FLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQSxDQUFDO29CQUMzQyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUE7b0JBQ3RCLElBQUksQ0FBQyxVQUFVLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQ2xELENBQUM7WUFDTCxDQUFDO1lBRUQsRUFBRSxDQUFBLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQztnQkFBQSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFBLENBQUEsYUFBYTtZQUNwRixJQUFJO2dCQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUE7WUFDdEMsTUFBTSxDQUFDLElBQUksQ0FBQTtRQUNmLENBQUM7UUFDRCxNQUFNLENBQUMsS0FBSyxDQUFBO0lBQ2hCLENBQUM7SUFFRCx5QkFBSSxHQUFKLFVBQUssRUFBUztRQUNWLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUEsbUNBQW1DO1FBQzNFLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7UUFDcEQsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUM7UUFDZCxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztJQUN0QixDQUFDO0lBRUQsZ0NBQVcsR0FBWCxVQUFZLENBQVE7UUFDaEIsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzNELENBQUM7SUFFRCw4QkFBUyxHQUFUO1FBQ0ksTUFBTSxDQUFDO1lBQ0gsSUFBSSxFQUFDLElBQUksQ0FBQyxJQUFJO1lBQ2QsR0FBRyxFQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFO1lBQ3hCLElBQUksRUFBQyxJQUFJLENBQUMsSUFBSTtZQUNkLEtBQUssRUFBQyxJQUFJLENBQUMsS0FBSztTQUNuQixDQUFBO0lBQ0wsQ0FBQztJQUVNLHNCQUFXLEdBQWxCLFVBQW1CLE1BQVUsRUFBRSxVQUFxQjtRQUNoRCxJQUFJLENBQUMsR0FBRyxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDNUYsQ0FBQyxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFBO1FBQ3RCLE1BQU0sQ0FBQyxDQUFDLENBQUE7SUFDWixDQUFDO0lBQ0wsaUJBQUM7QUFBRCxDQXRGQSxBQXNGQyxJQUFBO0FBRUQsSUFBSSxZQUFZLEdBQUcsSUFBSSxHQUFHLEVBQThELENBQUM7QUFFekYsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFVBQVMsQ0FBWSxFQUFFLEtBQWdCO0lBQy9ELElBQUksSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLElBQUksTUFBTSxFQUFFLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxNQUFNLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUN0RSxJQUFJLEtBQUssR0FBWSxFQUFFLENBQUM7SUFDeEIsSUFBSSxNQUFhLENBQUM7SUFDbEIsRUFBRSxDQUFBLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDO1FBQUEsTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ2xELElBQUk7UUFBQyxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQzlCLElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBRW5DLEVBQUUsQ0FBQSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFBLENBQUM7UUFDbEUsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNsQixJQUFJLFFBQVEsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2xDLElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3hDLEVBQUUsQ0FBQSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUM7WUFBQSxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ2xILENBQUM7SUFFRCxJQUFJLElBQUksR0FBRyxJQUFJLE1BQU0sQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3RDLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ2hDLEVBQUUsQ0FBQSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBRXBJLElBQUksSUFBSSxHQUFHLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUN2QyxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUNoQyxFQUFFLENBQUEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0s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Q0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUN6QyxDQUFDO0lBQ0wsYUFBQztBQUFELENBekZBLEFBeUZDLElBQUE7QUFFRCxpQkFBUyxNQUFNLENBQUMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiaW1wb3J0IFZlY3RvciA9IHJlcXVpcmUoJy4vdmVjdG9yJylcclxuaW1wb3J0IFV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpXHJcbmNsYXNzIEFBQkJ7XHJcbiAgICBwb3M6VmVjdG9yXHJcbiAgICBzaXplOlZlY3RvclxyXG5cclxuICAgIGNvbnN0cnVjdG9yKHBvczpWZWN0b3IsIHNpemU6VmVjdG9yKXtcclxuICAgICAgICB0aGlzLnBvcyA9IHBvcztcclxuICAgICAgICB0aGlzLnNpemUgPSBzaXplO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBmcm9tVmVjdG9ycyhhOlZlY3RvcltdKTpBQUJCe1xyXG4gICAgICAgIHZhciBzbWFsbCA9IGFbMF07XHJcbiAgICAgICAgdmFyIGJpZyA9IGFbYS5sZW5ndGggLSAxXTtcclxuICAgICAgICBmb3IodmFyIHYgb2YgYSl7XHJcbiAgICAgICAgICAgIGlmKHYueCA8IHNtYWxsLngpc21hbGwueCA9IHYueDtcclxuICAgICAgICAgICAgZWxzZSBpZih2LnggPiBiaWcueCliaWcueCA9IHYueDtcclxuICAgICAgICAgICAgaWYodi55IDwgc21hbGwueSlzbWFsbC55ID0gdi55O1xyXG4gICAgICAgICAgICBlbHNlIGlmKHYueSA+IGJpZy55KWJpZy55ID0gdi55O1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbmV3IEFBQkIoc21hbGwsIGJpZy5zdWIoc21hbGwpKTtcclxuICAgIH1cclxuXHJcbiAgICBjb250YWlucyhhYWJiOkFBQkIpe1xyXG4gICAgICAgIHJldHVybiBVdGlscy5yYW5nZUNvbnRhaW4odGhpcy5wb3MueCwgdGhpcy5zaXplLnggKyB0aGlzLnBvcy54LCBhYWJiLnBvcy54LCBhYWJiLnNpemUueCArIGFhYmIucG9zLngpIFxyXG4gICAgICAgICYmIFV0aWxzLnJhbmdlQ29udGFpbih0aGlzLnBvcy55LCB0aGlzLnNpemUueSArIHRoaXMucG9zLnksIGFhYmIucG9zLnksIGFhYmIuc2l6ZS55ICsgYWFiYi5wb3MueSlcclxuICAgIH1cclxuXHJcbiAgICBjb2xsaWRlKHY6VmVjdG9yKTpib29sZWFue1xyXG4gICAgICAgIHJldHVybiBVdGlscy5pblJhbmdlKHRoaXMucG9zLngsIHRoaXMuc2l6ZS54ICsgdGhpcy5wb3MueCwgdi54KSAmJiBVdGlscy5pblJhbmdlKHRoaXMucG9zLnksIHRoaXMuc2l6ZS55ICsgdGhpcy5wb3MueSwgdi55KVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgPSBBQUJCIiwiaW1wb3J0IFZlY3RvciA9IHJlcXVpcmUoJy4vdmVjdG9yJylcclxuaW1wb3J0IFV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpXHJcbmltcG9ydCBBQUJCID0gcmVxdWlyZSgnLi9BQUJCJylcclxuaW1wb3J0IENoZXNzUGllY2UgPSByZXF1aXJlKCcuL0NoZXNzUGllY2UnKVxyXG5lbnVtIFRlYW17QmxhY2ssIFdoaXRlfVxyXG5cclxuY2xhc3MgQ2hlc3NCb2FyZHtcclxuICAgIHNpemU6VmVjdG9yXHJcbiAgICBzcXVhcmVTaXplOlZlY3RvclxyXG4gICAgZ3JpZDpDaGVzc1BpZWNlW11bXVxyXG4gICAgdHVybjpUZWFtXHJcbiAgICBzZWxlY3RlZDpDaGVzc1BpZWNlXHJcbiAgICBsYXN0TW92ZUZyb206VmVjdG9yXHJcbiAgICBsYXN0TW92ZVRvOlZlY3RvclxyXG4gICAgQUFCQjpBQUJCXHJcblxyXG4gICAgY29uc3RydWN0b3IoKXtcclxuICAgICAgICB0aGlzLmxhc3RNb3ZlVG8gPSBudWxsOyBcclxuICAgICAgICB0aGlzLmxhc3RNb3ZlRnJvbSA9IG51bGw7IFxyXG4gICAgICAgIHRoaXMuc2l6ZSA9IG5ldyBWZWN0b3IoOCw4KVxyXG4gICAgICAgIHRoaXMuQUFCQiA9IG5ldyBBQUJCKG5ldyBWZWN0b3IoKSwgdGhpcy5zaXplLmMoKS5zdWIobmV3IFZlY3RvcigxLCAxKSkpXHJcbiAgICAgICAgdGhpcy5zcXVhcmVTaXplID0gbmV3IFZlY3Rvcig1MCwgNTApXHJcbiAgICAgICAgdGhpcy50dXJuID0gVGVhbS5XaGl0ZVxyXG4gICAgICAgIHRoaXMuZ3JpZCA9IFV0aWxzLmNyZWF0ZTJkQXJyYXk8Q2hlc3NQaWVjZT4odGhpcy5zaXplLCBudWxsKTtcclxuICAgIH1cclxuXHJcbiAgICB0cnlGcm9tVG8oZnJvbTpWZWN0b3IsIHRvOlZlY3Rvcik6Ym9vbGVhbntcclxuICAgICAgICB2YXIgZnJvbVBpZWNlID0gdGhpcy5ncmlkW2Zyb20ueF1bZnJvbS55XS8vY291bGQgb3V0b2ZyYW5nZSBmcm9tIGJhZGNsaWVudFxyXG4gICAgICAgIHJldHVybiBmcm9tUGllY2UudHJ5TW92ZSh0bylcclxuICAgIH1cclxuXHJcbiAgICBkcmF3KGN0eHQ6Q2FudmFzUmVuZGVyaW5nQ29udGV4dDJELCBvZmZzZXQ6VmVjdG9yKXtcclxuICAgICAgICBcclxuICAgICAgICB2YXIgbGVnYWxzU3BvdHM6Ym9vbGVhbltdW107XHJcbiAgICAgICAgaWYodGhpcy5zZWxlY3RlZClsZWdhbHNTcG90cyA9IHRoaXMuc2VsZWN0ZWQucG9zQ2hlY2tlcih0aGlzLnNlbGVjdGVkLCB0aGlzKVxyXG4gICAgICAgIHRoaXMuc2l6ZS5sb29wKCh2KSA9PntcclxuICAgICAgICAgICAgaWYoKHYueCArIHYueSkgJSAyID09IDApY3R4dC5maWxsU3R5bGUgPSBcIiNmZmZcIlxyXG4gICAgICAgICAgICBlbHNlIGN0eHQuZmlsbFN0eWxlID0gXCIjMDAwXCJcclxuICAgICAgICAgICAgaWYodGhpcy5zZWxlY3RlZCAmJiB2LmVxdWFscyh0aGlzLnNlbGVjdGVkLnBvcykpY3R4dC5maWxsU3R5bGUgPSBcIiMwZmZcIlxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYodGhpcy5sYXN0TW92ZUZyb20gJiYgdi5lcXVhbHModGhpcy5sYXN0TW92ZUZyb20pKWN0eHQuZmlsbFN0eWxlID0gXCIjNDA0XCIgXHJcbiAgICAgICAgICAgIGlmKHRoaXMubGFzdE1vdmVUbyAmJiB2LmVxdWFscyh0aGlzLmxhc3RNb3ZlVG8pKWN0eHQuZmlsbFN0eWxlID0gXCIjYTBhXCIgXHJcbiAgICAgICAgICAgIGlmKHRoaXMuc2VsZWN0ZWQgJiYgbGVnYWxzU3BvdHNbdi54XVt2LnldKWN0eHQuZmlsbFN0eWxlID0gXCIjZjAwXCJcclxuICAgICAgICAgICAgY3R4dC5maWxsUmVjdCh2LnggKiB0aGlzLnNxdWFyZVNpemUueCArIG9mZnNldC54LCB2LnkgKiB0aGlzLnNxdWFyZVNpemUueSArIG9mZnNldC55LCB0aGlzLnNxdWFyZVNpemUueCwgdGhpcy5zcXVhcmVTaXplLnkpXHJcbiAgICAgICAgICAgIGlmKHRoaXMuZ3JpZFt2LnhdW3YueV0pe1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ncmlkW3YueF1bdi55XS5kcmF3KGN0eHQsIHRoaXMuc3F1YXJlU2l6ZSwgb2Zmc2V0KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICB2ZWN0b3JUb0dyaWRQb3ModjpWZWN0b3IpOlZlY3RvcntcclxuICAgICAgICB2YXIgbiA9IG5ldyBWZWN0b3IoKTtcclxuICAgICAgICBuLnggPSBNYXRoLmZsb29yKHYueCAvIHRoaXMuc3F1YXJlU2l6ZS54KVxyXG4gICAgICAgIG4ueSA9IE1hdGguZmxvb3Iodi55IC8gdGhpcy5zcXVhcmVTaXplLnkpXHJcbiAgICAgICAgcmV0dXJuIG47XHJcbiAgICB9XHJcblxyXG4gICAgYWRkKGM6Q2hlc3NQaWVjZSl7XHJcbiAgICAgICAgdGhpcy5ncmlkW2MucG9zLnhdW2MucG9zLnldID0gYztcclxuICAgIH1cclxuXHJcbiAgICBzZXJpYWxpemUoKTphbnl7XHJcbiAgICAgICAgdmFyIGdyaWQgPSBVdGlscy5jcmVhdGUyZEFycmF5KHRoaXMuc2l6ZSwgbnVsbClcclxuICAgICAgICB0aGlzLnNpemUubG9vcCgodikgPT4ge1xyXG4gICAgICAgICAgICBpZih0aGlzLmdyaWRbdi54XVt2LnldKWdyaWRbdi54XVt2LnldID0gdGhpcy5ncmlkW3YueF1bdi55XS5zZXJpYWxpemUoKVxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgdmFyIHNlbGVjdGVkO1xyXG4gICAgICAgIGlmKHRoaXMuc2VsZWN0ZWQpc2VsZWN0ZWQgPSB0aGlzLnNlbGVjdGVkLnNlcmlhbGl6ZSgpXHJcbiAgICAgICAgdmFyIGxhc3RNb3ZlRnJvbTsgXHJcbiAgICAgICAgaWYodGhpcy5sYXN0TW92ZUZyb20pbGFzdE1vdmVGcm9tID0gdGhpcy5sYXN0TW92ZUZyb20uc2VyaWFsaXplKClcclxuICAgICAgICB2YXIgbGFzdE1vdmVUbzsgXHJcbiAgICAgICAgaWYodGhpcy5sYXN0TW92ZVRvKWxhc3RNb3ZlVG8gPSB0aGlzLmxhc3RNb3ZlVG8uc2VyaWFsaXplKCkgXHJcbiAgICAgICAgdmFyIHNlcmlhbGl6ZWQgPSB7XHJcbiAgICAgICAgICAgIHNpemU6dGhpcy5zaXplLnNlcmlhbGl6ZSgpLFxyXG4gICAgICAgICAgICBzcXVhcmVTaXplOnRoaXMuc3F1YXJlU2l6ZS5zZXJpYWxpemUoKSxcclxuICAgICAgICAgICAgZ3JpZDpncmlkLFxyXG4gICAgICAgICAgICB0dXJuOnRoaXMudHVybixcclxuICAgICAgICAgICAgc2VsZWN0ZWQ6c2VsZWN0ZWQsIFxyXG4gICAgICAgICAgICBsYXN0TW92ZUZyb206bGFzdE1vdmVGcm9tLCBcclxuICAgICAgICAgICAgbGFzdE1vdmVUbzpsYXN0TW92ZVRvIFxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gc2VyaWFsaXplZFxyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBkZXNlcmlhbGl6ZShvYmplY3Qpe1xyXG4gICAgICAgIHZhciBjaGVzc0JvYXJkID0gbmV3IENoZXNzQm9hcmQoKVxyXG4gICAgICAgIHZhciBncmlkID0gVXRpbHMuY3JlYXRlMmRBcnJheTxDaGVzc1BpZWNlPihjaGVzc0JvYXJkLnNpemUsIG51bGwpXHJcbiAgICAgICAgY2hlc3NCb2FyZC5zaXplLmxvb3AoKHYpID0+IHtcclxuICAgICAgICAgICAgaWYob2JqZWN0LmdyaWRbdi54XVt2LnldKWdyaWRbdi54XVt2LnldID0gQ2hlc3NQaWVjZS5kZXNlcmlhbGl6ZShvYmplY3QuZ3JpZFt2LnhdW3YueV0sIGNoZXNzQm9hcmQpXHJcbiAgICAgICAgfSlcclxuICAgICAgICBjaGVzc0JvYXJkLmdyaWQgPSBncmlkXHJcbiAgICAgICAgY2hlc3NCb2FyZC50dXJuID0gb2JqZWN0LnR1cm5cclxuICAgICAgICBpZihvYmplY3Quc2VsZWN0ZWQpY2hlc3NCb2FyZC5zZWxlY3RlZCA9IENoZXNzUGllY2UuZGVzZXJpYWxpemUob2JqZWN0LnNlbGVjdGVkLCBjaGVzc0JvYXJkKVxyXG4gICAgICAgIGlmKG9iamVjdC5sYXN0TW92ZUZyb20pY2hlc3NCb2FyZC5sYXN0TW92ZUZyb20gPSBWZWN0b3IuZGVzZXJpYWxpemUob2JqZWN0Lmxhc3RNb3ZlRnJvbSlcclxuICAgICAgICBpZihvYmplY3QubGFzdE1vdmVUbyljaGVzc0JvYXJkLmxhc3RNb3ZlVG8gPSBWZWN0b3IuZGVzZXJpYWxpemUob2JqZWN0Lmxhc3RNb3ZlVG8pIFxyXG4gICAgICAgIHJldHVybiBjaGVzc0JvYXJkXHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCA9IENoZXNzQm9hcmQiLCJpbXBvcnQgVmVjdG9yID0gcmVxdWlyZSgnLi92ZWN0b3InKVxyXG5pbXBvcnQgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJylcclxuaW1wb3J0IENoZXNzQm9hcmQgPSByZXF1aXJlKCcuL0NoZXNzQm9hcmQnKVxyXG5pbXBvcnQgQUFCQiA9IHJlcXVpcmUoJy4vQUFCQicpXHJcbmltcG9ydCBFdmVudEhhbmRsZXIgPSByZXF1aXJlKCcuL2V2ZW50SGFuZGxlcicpXHJcbmVudW0gVGVhbXtCbGFjaywgV2hpdGV9XHJcbmVudW0gVHlwZXtwYXduLCByb29rLCBrbmlnaHQsIGJpc2hvcCwgcXVlZW4sIGtpbmd9XHJcblxyXG5kZWNsYXJlIGNsYXNzIE1hcDxLLFY+e1xyXG4gICAgY29uc3RydWN0b3IoKVxyXG4gICAgZ2V0KGE6Syk6VlxyXG4gICAgc2V0KGE6SywgYjpWKVxyXG59XHJcblxyXG5jbGFzcyBDaGVzc1BpZWNle1xyXG4gICAgdHlwZTpUeXBlXHJcbiAgICBwb3M6VmVjdG9yXHJcbiAgICB0ZWFtOlRlYW1cclxuICAgIGNoZXNzQm9hcmQ6Q2hlc3NCb2FyZFxyXG4gICAgbW92ZWQ6Ym9vbGVhbiA9IGZhbHNlXHJcbiAgICBpbWFnZTpIVE1MSW1hZ2VFbGVtZW50XHJcbiAgICBwb3NDaGVja2VyOihjOkNoZXNzUGllY2UsIGNoZXNzQm9hcmQ6Q2hlc3NCb2FyZCkgPT4gYm9vbGVhbltdW11cclxuICAgIFxyXG4gICAgY29uc3RydWN0b3IodHlwZTpUeXBlLCB0ZWFtOlRlYW0sIHBvczpWZWN0b3IsIGNoZXNzQm9hcmQ6Q2hlc3NCb2FyZCl7XHJcbiAgICAgICAgaWYodHlwZW9mIGRvY3VtZW50ICE9ICd1bmRlZmluZWQnKXsgXHJcbiAgICAgICAgICAgIGlmKHRlYW0gPT0gVGVhbS5CbGFjayl0aGlzLmltYWdlID0gaW1hZ2VNYXBCW1R5cGVbdHlwZV1dIFxyXG4gICAgICAgICAgICBlbHNlIHRoaXMuaW1hZ2UgPSBpbWFnZU1hcFdbVHlwZVt0eXBlXV0gXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnBvcyA9IHBvc1xyXG4gICAgICAgIHRoaXMuY2hlc3NCb2FyZCA9IGNoZXNzQm9hcmRcclxuICAgICAgICB0aGlzLnBvc0NoZWNrZXIgPSBsZWdhbE1vdmVNYXAuZ2V0KHR5cGUpXHJcbiAgICAgICAgdGhpcy50eXBlID0gdHlwZVxyXG4gICAgICAgIHRoaXMudGVhbSA9IHRlYW1cclxuICAgICAgICBcclxuICAgIH1cclxuXHJcbiAgICBkcmF3KGN0eHQ6Q2FudmFzUmVuZGVyaW5nQ29udGV4dDJELCBzcXVhcmVTaXplOlZlY3Rvciwgb2Zmc2V0OlZlY3Rvcil7XHJcbiAgICAgICAgdmFyIHNpemUgPSB0aGlzLmNoZXNzQm9hcmQuc3F1YXJlU2l6ZS54IFxyXG4gICAgICAgIHZhciBoYWxmc2l6ZSA9IHNpemUgLyAyXHJcbiAgICAgICAgY3R4dC5kcmF3SW1hZ2UodGhpcy5pbWFnZSwgb2Zmc2V0LnggKyAwLjUgKyB0aGlzLnBvcy54ICogc3F1YXJlU2l6ZS54ICsgc3F1YXJlU2l6ZS54IC8gMiAtIGhhbGZzaXplLCBvZmZzZXQueSArIDAuNSArIHRoaXMucG9zLnkgKiBzcXVhcmVTaXplLnkgKyBzcXVhcmVTaXplLnkgLyAyIC0gaGFsZnNpemUsIHNpemUsIHNpemUpIFxyXG4gICAgfVxyXG5cclxuICAgIHRyeU1vdmUodG86VmVjdG9yKTpib29sZWFueyAgICBcclxuICAgICAgICBpZih0aGlzLnBvc0NoZWNrZXIodGhpcywgdGhpcy5jaGVzc0JvYXJkKVt0by54XVt0by55XSl7XHJcbiAgICAgICAgICAgIHRoaXMuY2hlc3NCb2FyZC5sYXN0TW92ZUZyb20gPSB0aGlzLnBvcy5jKClcclxuICAgICAgICAgICAgdGhpcy5jaGVzc0JvYXJkLmxhc3RNb3ZlVG8gPSB0by5jKClcclxuICAgICAgICAgICAgdmFyIGZyb21UTyA9IHRvLmMoKS5zdWIodGhpcy5wb3MpXHJcbiAgICAgICAgICAgIGlmKHRoaXMudHlwZSA9PSBUeXBlLmtpbmcgJiYgZnJvbVRPLmxlbmd0aCgpID09IDIpey8vY2hlY2sgaWYgY2FzdGxpbmcgb2NjdXJlZFxyXG4gICAgICAgICAgICAgICAgZnJvbVRPLm5vcm1hbGl6ZSgpXHJcbiAgICAgICAgICAgICAgICB2YXIgcm9vayA9IGdldFBpZWNlSW5EaXJlY3Rpb24odGhpcy5wb3MsIGZyb21UTywgVHlwZS5yb29rLCB0aGlzLmNoZXNzQm9hcmQpXHJcbiAgICAgICAgICAgICAgICByb29rLm1vdmUodGhpcy5wb3MuYygpLmFkZChmcm9tVE8pKS8vYXNzdW1lcyByb29rIGhhcyBiZWVuIGZvdW5kIGJlY2F1c2UgcG9zQ2hlY2tlciBzYXcgdGhpcyBhcyBhIGxlZ2FsIG1vdmVcclxuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHZhciBwaWVjZSA9IHRoaXMuY2hlc3NCb2FyZC5ncmlkW3RvLnhdW3RvLnldLy9jaGVjayBpZiBoaXQgcGllY2UgaXMga2luZ1xyXG4gICAgICAgICAgICBpZihwaWVjZSAmJiBwaWVjZS50eXBlID09IFR5cGUua2luZykgRXZlbnRIYW5kbGVyLnRyaWdnZXIoJ2dhbWVPdmVyJywgcGllY2UpXHJcblxyXG4gICAgICAgICAgICB0aGlzLm1vdmUodG8pXHJcblxyXG4gICAgICAgICAgICBpZih0aGlzLnR5cGUgPT0gVHlwZS5wYXduKXsvL2NoZWNrIGZvciBwYXduIHByb21vdGlvbiwgYXRtIGFsd2F5cyBwcm9tb3RlcyB0byBxdWVlblxyXG4gICAgICAgICAgICAgICAgaWYodGhpcy50ZWFtID09IFRlYW0uQmxhY2sgJiYgdGhpcy5wb3MueSA9PSB0aGlzLmNoZXNzQm9hcmQuc2l6ZS55IC0gMVxyXG4gICAgICAgICAgICAgICAgfHwgdGhpcy50ZWFtID09IFRlYW0uV2hpdGUgJiYgdGhpcy5wb3MueSA9PSAwKXtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnR5cGUgPSBUeXBlLnF1ZWVuXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wb3NDaGVja2VyID0gbGVnYWxNb3ZlTWFwLmdldChUeXBlLnF1ZWVuKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpZih0aGlzLmNoZXNzQm9hcmQudHVybiA9PSBUZWFtLkJsYWNrKXRoaXMuY2hlc3NCb2FyZC50dXJuID0gVGVhbS5XaGl0ZS8vc3dpdGNoIHR1cm5cclxuICAgICAgICAgICAgZWxzZSB0aGlzLmNoZXNzQm9hcmQudHVybiA9IFRlYW0uQmxhY2tcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgbW92ZSh0bzpWZWN0b3Ipe1xyXG4gICAgICAgIHRoaXMuY2hlc3NCb2FyZC5ncmlkW3RvLnhdW3RvLnldID0gdGhpczsvL21vdmUgdGhpcyBwaWVjZSB0byByZXF1ZXN0ZWQgc3BvdFxyXG4gICAgICAgIHRoaXMuY2hlc3NCb2FyZC5ncmlkW3RoaXMucG9zLnhdW3RoaXMucG9zLnldID0gbnVsbDtcclxuICAgICAgICB0aGlzLnBvcyA9IHRvO1xyXG4gICAgICAgIHRoaXMubW92ZWQgPSB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIGlzTGVnYWxNb3ZlKHY6VmVjdG9yKTpib29sZWFue1xyXG4gICAgICAgIHJldHVybiB0aGlzLnBvc0NoZWNrZXIodGhpcywgdGhpcy5jaGVzc0JvYXJkKVt2LnhdW3YueV1cclxuICAgIH1cclxuXHJcbiAgICBzZXJpYWxpemUoKXtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICB0eXBlOnRoaXMudHlwZSxcclxuICAgICAgICAgICAgcG9zOnRoaXMucG9zLnNlcmlhbGl6ZSgpLFxyXG4gICAgICAgICAgICB0ZWFtOnRoaXMudGVhbSxcclxuICAgICAgICAgICAgbW92ZWQ6dGhpcy5tb3ZlZFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgZGVzZXJpYWxpemUob2JqZWN0OmFueSwgY2hlc3NCb2FyZDpDaGVzc0JvYXJkKTpDaGVzc1BpZWNle1xyXG4gICAgICAgIHZhciBjID0gbmV3IENoZXNzUGllY2Uob2JqZWN0LnR5cGUsIG9iamVjdC50ZWFtLCBWZWN0b3IuZGVzZXJpYWxpemUob2JqZWN0LnBvcyksIGNoZXNzQm9hcmQpXHJcbiAgICAgICAgYy5tb3ZlZCA9IG9iamVjdC5tb3ZlZFxyXG4gICAgICAgIHJldHVybiBjXHJcbiAgICB9XHJcbn1cclxuXHJcbnZhciBsZWdhbE1vdmVNYXAgPSBuZXcgTWFwPFR5cGUsIChjOkNoZXNzUGllY2UsIGNoZXNzQm9hcmQ6Q2hlc3NCb2FyZCkgPT4gYm9vbGVhbltdW10+KCk7XHJcblxyXG5sZWdhbE1vdmVNYXAuc2V0KFR5cGUucGF3biwgZnVuY3Rpb24oYzpDaGVzc1BpZWNlLCBib2FyZDpDaGVzc0JvYXJkKTpib29sZWFuW11bXXtcclxuICAgIHZhciBhYWJiID0gbmV3IEFBQkIobmV3IFZlY3RvcigpLCBib2FyZC5zaXplLmMoKS5zdWIobmV3IFZlY3RvcigxLDEpKSlcclxuICAgIHZhciBtb3ZlczpWZWN0b3JbXSA9IFtdO1xyXG4gICAgdmFyIGZhY2luZzpWZWN0b3I7XHJcbiAgICBpZihjLnRlYW0gPT0gVGVhbS5XaGl0ZSlmYWNpbmcgPSBuZXcgVmVjdG9yKDAsIC0xKVxyXG4gICAgZWxzZSBmYWNpbmcgPSBuZXcgVmVjdG9yKDAsIDEpXHJcbiAgICB2YXIgd3Nmcm9udCA9IGMucG9zLmMoKS5hZGQoZmFjaW5nKVxyXG5cclxuICAgIGlmKGFhYmIuY29sbGlkZSh3c2Zyb250KSAmJiBib2FyZC5ncmlkW3dzZnJvbnQueF1bd3Nmcm9udC55XSA9PSBudWxsKXsgXHJcbiAgICAgICAgbW92ZXMucHVzaChmYWNpbmcpIFxyXG4gICAgICAgIHZhciBmYXJGcm9udCA9IGZhY2luZy5jKCkuc2NhbGUoMikgXHJcbiAgICAgICAgdmFyIHdzRmFyRnJvbnQgPSBjLnBvcy5jKCkuYWRkKGZhckZyb250KSBcclxuICAgICAgICBpZighYy5tb3ZlZCAmJiBhYWJiLmNvbGxpZGUod3NGYXJGcm9udCkgJiYgYm9hcmQuZ3JpZFt3c0ZhckZyb250LnhdW3dzRmFyRnJvbnQueV0gPT0gbnVsbCltb3Zlcy5wdXNoKGZhckZyb250KSBcclxuICAgIH0gXHJcblxyXG4gICAgdmFyIHdlc3QgPSBuZXcgVmVjdG9yKDEsMCkuYWRkKGZhY2luZylcclxuICAgIHZhciB3c3dlc3QgPSB3ZXN0LmMoKS5hZGQoYy5wb3MpXHJcbiAgICBpZihhYWJiLmNvbGxpZGUod3N3ZXN0KSAmJiBib2FyZC5ncmlkW3dzd2VzdC54XVt3c3dlc3QueV0gIT0gbnVsbCAmJiBib2FyZC5ncmlkW3dzd2VzdC54XVt3c3dlc3QueV0udGVhbSAhPSBjLnRlYW0pIG1vdmVzLnB1c2god2VzdClcclxuICAgIFxyXG4gICAgdmFyIGVhc3QgPSBuZXcgVmVjdG9yKC0xLDApLmFkZChmYWNpbmcpXHJcbiAgICB2YXIgd3NlYXN0ID0gZWFzdC5jKCkuYWRkKGMucG9zKVxyXG4gICAgaWYoYWFiYi5jb2xsaWRlKHdzZWFzdCkgJiYgYm9hcmQuZ3JpZFt3c2Vhc3QueF1bd3NlYXN0LnldICE9IG51bGwgJiYgYm9hcmQuZ3JpZFt3c2Vhc3QueF1bd3NlYXN0LnldLnRlYW0gIT0gYy50ZWFtKSBtb3Zlcy5wdXNoKGVhc3QpXHJcblxyXG4gICAgcmV0dXJuIG1vdmVzU3RhbXAobW92ZXMsIGMpO1xyXG59KVxyXG5cclxubGVnYWxNb3ZlTWFwLnNldChUeXBlLnJvb2ssIGZ1bmN0aW9uKGM6Q2hlc3NQaWVjZSwgZ3JpZDpDaGVzc0JvYXJkKTpib29sZWFuW11bXXtcclxuICAgIHZhciBkaXJlY3Rpb25zID0gW1xyXG4gICAgICAgIG5ldyBWZWN0b3IoMSwgMCksXHJcbiAgICAgICAgbmV3IFZlY3RvcigtMSwgMCksXHJcbiAgICAgICAgbmV3IFZlY3RvcigwLCAxKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDAsIC0xKVxyXG4gICAgXVxyXG4gICAgcmV0dXJuIGRpcmVjdGlvblN0YW1wKGRpcmVjdGlvbnMsIGMpO1xyXG59KVxyXG5cclxubGVnYWxNb3ZlTWFwLnNldChUeXBlLmtuaWdodCwgZnVuY3Rpb24oYzpDaGVzc1BpZWNlLCBncmlkOkNoZXNzQm9hcmQpOmJvb2xlYW5bXVtde1xyXG4gICAgdmFyIG1vdmVzID0gW1xyXG4gICAgICAgIG5ldyBWZWN0b3IoMSwgLTIpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoMiwgLTEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoMiwgMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigxLCAyKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0xLCAyKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0yLCAxKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0yLCAtMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigtMSwgLTIpXHJcbiAgICBdXHJcbiAgICByZXR1cm4gbW92ZXNTdGFtcChtb3ZlcywgYyk7XHJcbn0pXHJcblxyXG5sZWdhbE1vdmVNYXAuc2V0KFR5cGUuYmlzaG9wLCBmdW5jdGlvbihjOkNoZXNzUGllY2UsIGdyaWQ6Q2hlc3NCb2FyZCk6Ym9vbGVhbltdW117XHJcbiAgICB2YXIgZGlyZWN0aW9ucyA9IFtcclxuICAgICAgICBuZXcgVmVjdG9yKDEsIDEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTEsIC0xKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDEsIC0xKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0xLCAxKVxyXG4gICAgXVxyXG4gICAgcmV0dXJuIGRpcmVjdGlvblN0YW1wKGRpcmVjdGlvbnMsIGMpO1xyXG59KVxyXG5cclxubGVnYWxNb3ZlTWFwLnNldChUeXBlLnF1ZWVuLCBmdW5jdGlvbihjOkNoZXNzUGllY2UpOmJvb2xlYW5bXVtde1xyXG4gICAgdmFyIGRpcmVjdGlvbnMgPSBbXHJcbiAgICAgICAgbmV3IFZlY3RvcigxLCAxKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0xLCAtMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigxLCAtMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigtMSwgMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigxLCAwKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0xLCAwKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDAsIDEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoMCwgLTEpXHJcbiAgICBdXHJcbiAgICByZXR1cm4gZGlyZWN0aW9uU3RhbXAoZGlyZWN0aW9ucywgYyk7XHJcbn0pXHJcblxyXG5sZWdhbE1vdmVNYXAuc2V0KFR5cGUua2luZywgZnVuY3Rpb24oYzpDaGVzc1BpZWNlLCBncmlkOkNoZXNzQm9hcmQpOmJvb2xlYW5bXVtde1xyXG4gICAgdmFyIG1vdmVzID0gW1xyXG4gICAgICAgIG5ldyBWZWN0b3IoMCwgMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigxLCAxKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDEsIDApLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoMSwgLTEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoMCwgLTEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTEsIC0xKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0xLCAwKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0xLCAxKSxcclxuICAgIF1cclxuICAgIHZhciBsZWdhbE1vdmVzID0gbW92ZXNTdGFtcChtb3ZlcywgYyk7XHJcbiAgICBcclxuICAgIGlmKCFjLm1vdmVkKXsvL2Nhc3RsaW5nXHJcbiAgICAgICAgdmFyIG9wZW5zID0gdXRpbHMuY3JlYXRlMmRBcnJheTxib29sZWFuPihjLmNoZXNzQm9hcmQuc2l6ZSwgZmFsc2UpXHJcbiAgICAgICAgdmFyIHJvb2tEaXJlY3Rpb25zID0gW1xyXG4gICAgICAgICAgICBuZXcgVmVjdG9yKDEsIDApLFxyXG4gICAgICAgICAgICBuZXcgVmVjdG9yKC0xLCAwKSxcclxuICAgICAgICAgICAgbmV3IFZlY3RvcigwLCAxKSxcclxuICAgICAgICAgICAgbmV3IFZlY3RvcigwLCAtMSlcclxuICAgICAgICBdXHJcbiAgICAgICAgZm9yKHZhciBkaXJlY3Rpb24gb2Ygcm9va0RpcmVjdGlvbnMpe1xyXG4gICAgICAgICAgICB2YXIgY3VycmVudENoZWNraW5nUG9zID0gYy5wb3MuYygpO1xyXG4gICAgICAgICAgICB3aGlsZSh0cnVlKXtcclxuICAgICAgICAgICAgICAgIGN1cnJlbnRDaGVja2luZ1Bvcy5hZGQoZGlyZWN0aW9uKVxyXG4gICAgICAgICAgICAgICAgaWYoYy5jaGVzc0JvYXJkLkFBQkIuY29sbGlkZShjdXJyZW50Q2hlY2tpbmdQb3MpKXtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcGllY2UgPSBjLmNoZXNzQm9hcmQuZ3JpZFtjdXJyZW50Q2hlY2tpbmdQb3MueF1bY3VycmVudENoZWNraW5nUG9zLnldXHJcbiAgICAgICAgICAgICAgICAgICAgaWYocGllY2UgPT0gbnVsbCljb250aW51ZVxyXG4gICAgICAgICAgICAgICAgICAgIGVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHBpZWNlLnRlYW0gPT0gYy50ZWFtICYmIHBpZWNlLnR5cGUgPT0gVHlwZS5yb29rICYmICFwaWVjZS5tb3ZlZCl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIganVtcFBvcyA9IGMucG9zLmMoKS5hZGQoZGlyZWN0aW9uLmMoKS5zY2FsZSgyKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxlZ2FsTW92ZXNbanVtcFBvcy54XVtqdW1wUG9zLnldID0gdHJ1ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9ZWxzZSBicmVha1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIH1lbHNlIGJyZWFrXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGxlZ2FsTW92ZXNcclxuICAgIFxyXG59KVxyXG5cclxuZnVuY3Rpb24gZGlyZWN0aW9uU3RhbXAoZGlyZWN0aW9uczpWZWN0b3JbXSwgYzpDaGVzc1BpZWNlKTpib29sZWFuW11bXXtcclxuICAgIHZhciBsZWdhbE1vdmVzID0gdXRpbHMuY3JlYXRlMmRBcnJheShjLmNoZXNzQm9hcmQuc2l6ZSwgZmFsc2UpXHJcbiAgICBmb3IodmFyIGRpcmVjdGlvbiBvZiBkaXJlY3Rpb25zKXtcclxuICAgICAgICB2YXIgd3MgPSBjLnBvcy5jKClcclxuICAgICAgICB3cy5hZGQoZGlyZWN0aW9uKVxyXG4gICAgICAgIHdoaWxlKGlzTGVnYWwoYywgd3MpKXtcclxuICAgICAgICAgICAgbGVnYWxNb3Zlc1t3cy54XVt3cy55XSA9IHRydWVcclxuICAgICAgICAgICAgaWYoYy5jaGVzc0JvYXJkLmdyaWRbd3MueF1bd3MueV0pYnJlYWtcclxuICAgICAgICAgICAgd3MuYWRkKGRpcmVjdGlvbilcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbGVnYWxNb3ZlcztcclxufVxyXG5cclxuZnVuY3Rpb24gbW92ZXNTdGFtcChtb3ZlczpWZWN0b3JbXSwgYzpDaGVzc1BpZWNlKTpib29sZWFuW11bXXtcclxuICAgIHZhciBsZWdhbE1vdmVzID0gdXRpbHMuY3JlYXRlMmRBcnJheShjLmNoZXNzQm9hcmQuc2l6ZSwgZmFsc2UpXHJcbiAgICBmb3IodmFyIG1vdmUgb2YgbW92ZXMpe1xyXG4gICAgICAgIHZhciB3cyA9IG1vdmUuYygpLmFkZChjLnBvcylcclxuICAgICAgICBpZihpc0xlZ2FsKGMsIHdzKSlsZWdhbE1vdmVzW3dzLnhdW3dzLnldID0gdHJ1ZVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGxlZ2FsTW92ZXM7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGlzTGVnYWwoYzpDaGVzc1BpZWNlLCB3czpWZWN0b3Ipe1xyXG4gICAgaWYoYy5jaGVzc0JvYXJkLkFBQkIuY29sbGlkZSh3cykpe1xyXG4gICAgICAgIHZhciBwaWVjZSA9IGMuY2hlc3NCb2FyZC5ncmlkW3dzLnhdW3dzLnldXHJcbiAgICAgICAgaWYocGllY2UgJiYgcGllY2UudGVhbSAhPSBjLnRlYW0gfHwgIXBpZWNlKXtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZmFsc2VcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0UGllY2VJbkRpcmVjdGlvbihmcm9tOlZlY3RvciwgZGlyZWN0aW9uOlZlY3RvciwgdHlwZTpUeXBlLCBjaGVzc0JvYXJkOkNoZXNzQm9hcmQpOkNoZXNzUGllY2V7XHJcbiAgICB2YXIgYWFiYiA9IG5ldyBBQUJCKG5ldyBWZWN0b3IoKSwgY2hlc3NCb2FyZC5zaXplLmMoKS5zdWIobmV3IFZlY3RvcigxLDEpKSlcclxuICAgIHZhciBjdXJyZW50Q2hlY2tpbmdQb3MgPSBmcm9tLmMoKVxyXG4gICAgd2hpbGUodHJ1ZSl7XHJcbiAgICAgICAgY3VycmVudENoZWNraW5nUG9zLmFkZChkaXJlY3Rpb24pXHJcbiAgICAgICAgaWYoYWFiYi5jb2xsaWRlKGN1cnJlbnRDaGVja2luZ1Bvcykpe1xyXG4gICAgICAgICAgICB2YXIgcGllY2UgPSBjaGVzc0JvYXJkLmdyaWRbY3VycmVudENoZWNraW5nUG9zLnhdW2N1cnJlbnRDaGVja2luZ1Bvcy55XVxyXG4gICAgICAgICAgICBpZihwaWVjZSAmJiBwaWVjZS50eXBlID09IHR5cGUpcmV0dXJuIHBpZWNlXHJcbiAgICAgICAgfWVsc2UgYnJlYWtcclxuICAgIH1cclxufVxyXG5cclxudmFyIGltYWdlTWFwQiA9IHt9IFxyXG52YXIgaW1hZ2VNYXBXID0ge30gXHJcbmlmKHR5cGVvZiBkb2N1bWVudCAhPSAndW5kZWZpbmVkJyl7IFxyXG4gICAgdmFyIHR5cGVzID0gWydwYXduJywgJ3Jvb2snLCAnYmlzaG9wJywgJ3F1ZWVuJywgJ2tpbmcnLCAna25pZ2h0J10gXHJcbiAgICBmb3IodmFyIHR5cGUgb2YgdHlwZXMpeyBcclxuICAgICAgICB2YXIgaW1hZ2VCID0gbmV3IEltYWdlKCkgXHJcbiAgICAgICAgdmFyIGltYWdlVyA9IG5ldyBJbWFnZSgpIFxyXG4gICAgICAgIGltYWdlQi5zcmMgPSAncmVzb3VyY2VzL2InICsgdHlwZSArICcucG5nJyBcclxuICAgICAgICBpbWFnZVcuc3JjID0gJ3Jlc291cmNlcy93JyArIHR5cGUgKyAnLnBuZycgXHJcbiAgICAgICAgaW1hZ2VCLm9ubG9hZCA9ICgpID0+IHsgXHJcbiAgICAgICAgICAgIEV2ZW50SGFuZGxlci50cmlnZ2VyKCdpbWFnZUxvYWRlZCcsIHt9KSBcclxuICAgICAgICB9IFxyXG4gICAgICAgIGltYWdlVy5vbmxvYWQgPSAoKSA9PiB7IFxyXG4gICAgICAgICAgICBFdmVudEhhbmRsZXIudHJpZ2dlcignaW1hZ2VMb2FkZWQnLCB7fSkgXHJcbiAgICAgICAgfSBcclxuICAgICAgICBpbWFnZU1hcEJbdHlwZV0gPSBpbWFnZUIgXHJcbiAgICAgICAgaW1hZ2VNYXBXW3R5cGVdID0gaW1hZ2VXIFxyXG4gICAgfSBcclxufSBcclxuXHJcbmV4cG9ydCA9IENoZXNzUGllY2UiLCJjbGFzcyBXZWJJT0N7XHJcbiAgICBzb2NrZXQ6V2ViU29ja2V0XHJcbiAgICByb3V0ZU1hcFxyXG5cclxuICAgIGNvbnN0cnVjdG9yKHNvY2tldDpXZWJTb2NrZXQpe1xyXG4gICAgICAgIHRoaXMuc29ja2V0ID0gc29ja2V0O1xyXG4gICAgICAgIHRoaXMucm91dGVNYXAgPSB7fTtcclxuICAgICAgICB0aGlzLnNvY2tldC5vbm1lc3NhZ2UgPSAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgdmFyIGRhdGEgPSBldmVudC5kYXRhXHJcbiAgICAgICAgICAgIHZhciBwYXJzZWREYXRhID0gSlNPTi5wYXJzZShkYXRhKTtcclxuICAgICAgICAgICAgaWYodGhpcy5yb3V0ZU1hcFtwYXJzZWREYXRhLnJvdXRlXSl7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJvdXRlTWFwW3BhcnNlZERhdGEucm91dGVdKHBhcnNlZERhdGEpO1xyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCc0MDQ6ICcgKyBwYXJzZWREYXRhLnJvdXRlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBvbihyb3V0ZSwgYWN0aW9uKXsvL2FjdGlvbnMgbmVlZCB0byBiZSBwYXNzZWQgdXNpbmcgYW4gYXJyb3cgZnVuY3Rpb24gb3IgZnVuY3Rpb25zIGJpbmRlZCB3aXRoIC5iaW5kKHRoaXMpXHJcbiAgICAgICAgdGhpcy5yb3V0ZU1hcFtyb3V0ZV0gPSBhY3Rpb247XHJcbiAgICB9XHJcblxyXG4gICAgc2VuZChyb3V0ZSwgdmFsdWUpey8vdmFsdWUgaXMgb2JqZWN0IGVuIGdlc2VyaWFsaXplZFxyXG4gICAgICAgIHZhbHVlLnJvdXRlID0gcm91dGU7XHJcbiAgICAgICAgaWYodGhpcy5zb2NrZXQucmVhZHlTdGF0ZT09MSl7XHJcbiAgICAgICAgICB0aGlzLnNvY2tldC5zZW5kKEpTT04uc3RyaW5naWZ5KHZhbHVlKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIG9uY2xvc2UoKXtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgY2xvc2UoKXtcclxuICAgICAgICB0aGlzLnNvY2tldC5jbG9zZSgpO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgPSBXZWJJT0MiLCJkZWNsYXJlIGNsYXNzIE1hcDxLLFY+e1xyXG4gICAgY29uc3RydWN0b3IoKVxyXG4gICAgZ2V0KGE6Syk6VlxyXG4gICAgc2V0KGE6SywgYjpWKVxyXG59XHJcblxyXG5jbGFzcyBFdmVudEhhbmRsZXJ7XHJcblxyXG4gICAgcHJpdmF0ZSBzdGF0aWMgaW5zdGFuY2U6RXZlbnRIYW5kbGVyXHJcbiAgICBwcml2YXRlIHN0YXRpYyBldmVudE1hcDpNYXA8c3RyaW5nLCAoKGFueT8pID0+IGFueSlbXT4gPSBuZXcgTWFwPHN0cmluZywgKChhbnk/KSA9PiBhbnkpW10+KCk7XHJcblxyXG4gICAgXHJcblxyXG4gICAgLy8gc3RhdGljIGdldEluc3RhbmNlKCk6RXZlbnRIYW5kbGVye1xyXG4gICAgLy8gICAgIGlmKEV2ZW50SGFuZGxlci5pbnN0YW5jZSA9PSBudWxsKXtcclxuICAgIC8vICAgICAgICAgRXZlbnRIYW5kbGVyLmluc3RhbmNlID0gbmV3IEV2ZW50SGFuZGxlcigpO1xyXG4gICAgLy8gICAgIH1cclxuICAgICAgICBcclxuICAgIC8vICAgICByZXR1cm4gRXZlbnRIYW5kbGVyLmluc3RhbmNlO1xyXG4gICAgLy8gfVxyXG5cclxuICAgIHN0YXRpYyB0cmlnZ2VyKGV2ZW50OnN0cmluZywgZGF0YT86YW55KXtcclxuICAgICAgICBpZihFdmVudEhhbmRsZXIuZXZlbnRNYXAuZ2V0KGV2ZW50KSA9PSBudWxsKXJldHVyblxyXG4gICAgICAgIGZvcih2YXIgY2FsbGJhY2sgb2YgRXZlbnRIYW5kbGVyLmV2ZW50TWFwLmdldChldmVudCkpY2FsbGJhY2soZGF0YSlcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgc3Vic2NyaWJlKGV2ZW50OnN0cmluZywgY2FsbGJhY2s6KGRhdGE6YW55KSA9PiB2b2lkKXtcclxuICAgICAgICBpZihFdmVudEhhbmRsZXIuZXZlbnRNYXAuZ2V0KGV2ZW50KSA9PSBudWxsKUV2ZW50SGFuZGxlci5ldmVudE1hcC5zZXQoZXZlbnQsIFtdKVxyXG4gICAgICAgIEV2ZW50SGFuZGxlci5ldmVudE1hcC5nZXQoZXZlbnQpLnB1c2goY2FsbGJhY2spXHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGRldGFjaChldmVudDpzdHJpbmcsIGNhbGxiYWNrOigpID0+IHZvaWQpOnZvaWR7XHJcbiAgICAgICAgdmFyIHN1Ymxpc3QgPSBFdmVudEhhbmRsZXIuZXZlbnRNYXAuZ2V0KGV2ZW50KTtcclxuICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgc3VibGlzdC5sZW5ndGg7IGkrKyl7XHJcbiAgICAgICAgICAgIHZhciBjYWxsYmFja0luTWFwID0gc3VibGlzdFtpXTtcclxuICAgICAgICAgICAgaWYoY2FsbGJhY2tJbk1hcCA9PSBjYWxsYmFjayl7XHJcbiAgICAgICAgICAgICAgICBzdWJsaXN0LnNwbGljZShpLDEpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gIFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgPSBFdmVudEhhbmRsZXIiLCJ2YXIgY2FudmFzID0gPEhUTUxDYW52YXNFbGVtZW50PiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzJylcclxudmFyIGN0eHQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKVxyXG52YXIgbGFzdFVwZGF0ZSA9IERhdGUubm93KCk7XHJcbnZhciBkdDpudW1iZXI7XHJcbnZhciBwaSA9IE1hdGguUElcclxudmFyIHJlc2V0QnRuID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3Jlc2V0QnRuJylcclxudmFyIHRlYW1MYWJlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyN0ZWFtTGFiZWwnKVxyXG52YXIgdHVybkxhYmVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3R1cm5MYWJlbCcpXHJcblxyXG5pbXBvcnQgVmVjdG9yID0gcmVxdWlyZSgnLi92ZWN0b3InKVxyXG5pbXBvcnQgVXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJylcclxuaW1wb3J0IEV2ZW50SGFuZGxlciA9IHJlcXVpcmUoJy4vZXZlbnRIYW5kbGVyJylcclxuaW1wb3J0IENoZXNzUGllY2UgPSByZXF1aXJlKCcuL0NoZXNzUGllY2UnKVxyXG5pbXBvcnQgQ2hlc3NCb2FyZCA9IHJlcXVpcmUoJy4vQ2hlc3NCb2FyZCcpXHJcbmltcG9ydCBBQUJCID0gcmVxdWlyZSgnLi9BQUJCJylcclxuaW1wb3J0IFdlYklPQyA9IHJlcXVpcmUoJy4vV2ViSU9DJylcclxuXHJcbnZhciBzb2NrZXRcclxuaWYod2luZG93LmxvY2F0aW9uLmhyZWYgPT0gJ2h0dHA6Ly9sb2NhbGhvc3Q6ODAwMC8nKXNvY2tldCA9IG5ldyBXZWJTb2NrZXQoXCJ3czovL2xvY2FsaG9zdDo4MDAwL1wiKTtcclxuZWxzZSBzb2NrZXQgPSBuZXcgV2ViU29ja2V0KFwid3NzOi8vcGF1bGNoZXNzLmhlcm9rdWFwcC5jb20vXCIpO1xyXG52YXIgd2ViSU9DID0gbmV3IFdlYklPQyhzb2NrZXQpO1xyXG5lbnVtIFRlYW17QmxhY2ssIFdoaXRlfVxyXG5lbnVtIFR5cGV7cGF3biwgcm9vaywga25pZ2h0LCBiaXNob3AsIHF1ZWVuLCBraW5nfVxyXG52YXIgdGVhbTpUZWFtXHJcblxyXG52YXIgY2FudmFzQ29udGFpbmVyOmFueSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNjYW52YXMtY29udGFpbmVyJylcclxuY2FudmFzLndpZHRoID0gY2FudmFzQ29udGFpbmVyLm9mZnNldFdpZHRoIC0gM1xyXG5jYW52YXMuaGVpZ2h0ID0gY2FudmFzQ29udGFpbmVyLm9mZnNldEhlaWdodCAtIDEwMFxyXG5cclxudmFyIGltYWdlTG9hZENvdW50ZXIgPSAwOyBcclxuRXZlbnRIYW5kbGVyLnN1YnNjcmliZSgnaW1hZ2VMb2FkZWQnLCAoZGF0YSkgPT57IFxyXG4gICAgaW1hZ2VMb2FkQ291bnRlcisrOyBcclxuICAgIGlmKGltYWdlTG9hZENvdW50ZXIgPj0gMTIpeyBcclxuICAgICAgICBjaGVzc0JvYXJkLmRyYXcoY3R4dCwgb2Zmc2V0KSBcclxuICAgIH0gXHJcbn0pIFxyXG5cclxudmFyIGNoZXNzQm9hcmQgPSBuZXcgQ2hlc3NCb2FyZCgpO1xyXG5cclxuc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKXtcclxuICAgIHZhciBub3cgPSBEYXRlLm5vdygpO1xyXG4gICAgZHQgPSAobm93IC0gbGFzdFVwZGF0ZSkgLyAxMDAwO1xyXG4gICAgbGFzdFVwZGF0ZSA9IG5vdztcclxuICAgIGR0ID0gVXRpbHMubWluKGR0LCAxKVxyXG4gICAgdXBkYXRlKClcclxuICAgIGRyYXcoKTtcclxuICAgIFxyXG59LCAxMDAwIC8gNjApO1xyXG52YXIgaGFsZnNpemUgPSBjaGVzc0JvYXJkLnNpemUueCAqIGNoZXNzQm9hcmQuc3F1YXJlU2l6ZS54IC8gMlxyXG52YXIgb2Zmc2V0ID0gbmV3IFZlY3RvcihNYXRoLmZsb29yKGNhbnZhcy53aWR0aCAvIDIgLSBoYWxmc2l6ZSksIE1hdGguZmxvb3IoY2FudmFzLmhlaWdodCAvIDIgLSBoYWxmc2l6ZSkpXHJcbmNoZXNzQm9hcmQuZHJhdyhjdHh0LCBvZmZzZXQpXHJcblxyXG5cclxucmVzZXRCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PntcclxuICAgIHdlYklPQy5zZW5kKCdyZXNldCcsIHt9KVxyXG59KVxyXG5cclxud2ViSU9DLm9uKCd1cGRhdGUnLCAoZGF0YSk9PntcclxuICAgIGNoZXNzQm9hcmQgPSBDaGVzc0JvYXJkLmRlc2VyaWFsaXplKGRhdGEuY2hlc3NCb2FyZClcclxuICAgIHRlYW0gPSBkYXRhLnRlYW1cclxuICAgIHRlYW1MYWJlbC5pbm5lckhUTUwgPSBUZWFtW3RlYW1dXHJcbiAgICB0dXJuTGFiZWwuaW5uZXJIVE1MID0gVGVhbVtjaGVzc0JvYXJkLnR1cm5dXHJcbiAgICBjaGVzc0JvYXJkLmRyYXcoY3R4dCwgb2Zmc2V0KVxyXG59KVxyXG5cclxuZG9jdW1lbnQub25tb3VzZWRvd24gPSAoZXZ0KSA9PiB7XHJcbiAgICB2YXIgYWFiYiA9IG5ldyBBQUJCKG5ldyBWZWN0b3IoKSwgY2hlc3NCb2FyZC5zaXplLmMoKS5zdWIobmV3IFZlY3RvcigxLDEpKSlcclxuICAgIHZhciB2ID0gY2hlc3NCb2FyZC52ZWN0b3JUb0dyaWRQb3MoZ2V0TW91c2VQb3MoY2FudmFzLCBldnQpLnN1YihvZmZzZXQpKVxyXG4gICAgXHJcbiAgICBcclxuICAgIGlmKCFhYWJiLmNvbGxpZGUodikpe1xyXG4gICAgICAgIGNoZXNzQm9hcmQuc2VsZWN0ZWQgPSBudWxsO1xyXG4gICAgfWVsc2V7XHJcbiAgICAgICAgdmFyIHBpZWNlID0gY2hlc3NCb2FyZC5ncmlkW3YueF1bdi55XVxyXG5cclxuICAgICAgICBpZihjaGVzc0JvYXJkLnNlbGVjdGVkID09IG51bGwpe1xyXG4gICAgICAgICAgICBpZihwaWVjZSAmJiBwaWVjZS50ZWFtID09IGNoZXNzQm9hcmQudHVybiAmJiBwaWVjZS50ZWFtID09IHRlYW0pe1xyXG4gICAgICAgICAgICAgICAgY2hlc3NCb2FyZC5zZWxlY3RlZCA9IHBpZWNlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgaWYocGllY2UgJiYgcGllY2UudGVhbSA9PSBjaGVzc0JvYXJkLnR1cm4pY2hlc3NCb2FyZC5zZWxlY3RlZCA9IHBpZWNlXHJcbiAgICAgICAgICAgIGVsc2V7XHJcbiAgICAgICAgICAgICAgICBpZihjaGVzc0JvYXJkLnNlbGVjdGVkLmlzTGVnYWxNb3ZlKHYpKXtcclxuICAgICAgICAgICAgICAgICAgICB3ZWJJT0Muc2VuZCgnbW92ZScsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZnJvbTpjaGVzc0JvYXJkLnNlbGVjdGVkLnBvcy5zZXJpYWxpemUoKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdG86di5zZXJpYWxpemUoKVxyXG4gICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjaGVzc0JvYXJkLnNlbGVjdGVkID0gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGNoZXNzQm9hcmQuZHJhdyhjdHh0LCBvZmZzZXQpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZSgpe1xyXG59XHJcblxyXG5mdW5jdGlvbiBkcmF3KCl7XHJcbiAgICAvL2N0eHQuY2xlYXJSZWN0KDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldE1vdXNlUG9zKGNhbnZhcywgZXZ0KTpWZWN0b3Ige1xyXG4gICAgdmFyIHJlY3QgPSBjYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbiAgICByZXR1cm4gbmV3IFZlY3RvcihldnQuY2xpZW50WCAtIHJlY3QubGVmdCwgZXZ0LmNsaWVudFkgLSByZWN0LnRvcClcclxufSIsImltcG9ydCBWZWN0b3IgPSByZXF1aXJlKCcuL3ZlY3RvcicpXHJcblxyXG5uYW1lc3BhY2UgdXRpbHN7XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gbWFwKHZhbDE6bnVtYmVyLCBzdGFydDE6bnVtYmVyLCBzdG9wMTpudW1iZXIsIHN0YXJ0MjpudW1iZXIsIHN0b3AyOm51bWJlcil7XHJcbiAgICAgICAgcmV0dXJuIHN0YXJ0MiArIChzdG9wMiAtIHN0YXJ0MikgKiAoKHZhbDEgLSBzdGFydDEpIC8gKHN0b3AxIC0gc3RhcnQxKSlcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gaW5SYW5nZShtaW46bnVtYmVyICxtYXg6bnVtYmVyICx2YWx1ZTpudW1iZXIpe1xyXG4gICAgICAgIGlmKG1pbiA+IG1heCl7XHJcbiAgICAgICAgICAgIHZhciB0ZW1wID0gbWluO1xyXG4gICAgICAgICAgICBtaW4gPSBtYXg7XHJcbiAgICAgICAgICAgIG1heCA9IHRlbXA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB2YWx1ZSA8PSBtYXggJiYgdmFsdWUgPj0gbWluO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBtaW4oYTpudW1iZXIsIGI6bnVtYmVyKTpudW1iZXJ7XHJcbiAgICAgICAgaWYoYSA8IGIpcmV0dXJuIGE7XHJcbiAgICAgICAgcmV0dXJuIGI7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIG1heChhOm51bWJlciwgYjpudW1iZXIpOm51bWJlcntcclxuICAgICAgICBpZihhID4gYilyZXR1cm4gYTtcclxuICAgICAgICByZXR1cm4gYjtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gY2xhbXAodmFsOm51bWJlciwgbWluOm51bWJlciwgbWF4Om51bWJlcik6bnVtYmVye1xyXG4gICAgICAgIHJldHVybiB0aGlzLm1heCh0aGlzLm1pbih2YWwsIG1heCksIG1pbilcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gcmFuZ2VDb250YWluKGExLGEyLGIxLGIyKXsvL2FzIGluIGRvZXMgYSBlbmNsb3NlIGItLS0tLSBzbyByZXR1cm5zIHRydWUgaWYgYiBpcyBzbWFsbGVyIGluIGFsbCB3YXlzXHJcbiAgICAgICAgcmV0dXJuIG1heChhMSwgYTIpID49IG1heChiMSwgYjIpICYmIG1pbihhMSxhMikgPD0gbWF4KGIxLGIyKTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gY3JlYXRlMmRBcnJheTxUPih2OlZlY3RvciwgZmlsbDpUKTpUW11bXXtcclxuICAgICAgICB2YXIgcm93czpUW11bXSA9IG5ldyBBcnJheSh2LngpXHJcbiAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IHYueDsgaSsrKXtcclxuICAgICAgICAgICAgcm93c1tpXSA9IG5ldyBBcnJheSh2LnkpXHJcbiAgICAgICAgICAgIGZvcih2YXIgaiA9IDA7IGogPCB2Lnk7IGorKyl7XHJcbiAgICAgICAgICAgICAgICByb3dzW2ldW2pdID0gZmlsbFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiByb3dzO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZXRNb3VzZVBvcyhjYW52YXM6SFRNTENhbnZhc0VsZW1lbnQsIGV2dDpNb3VzZUV2ZW50KTpWZWN0b3Ige1xyXG4gICAgICAgIHZhciByZWN0ID0gY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjdG9yKGV2dC5jbGllbnRYIC0gcmVjdC5sZWZ0LCBldnQuY2xpZW50WSAtIHJlY3QudG9wKVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgPSB1dGlsczsiLCJjbGFzcyBWZWN0b3J7XHJcbiAgICB4Om51bWJlcjtcclxuICAgIHk6bnVtYmVyO1xyXG4gICAgXHJcbiAgICBjb25zdHJ1Y3Rvcih4Om51bWJlciA9IDAsIHk6bnVtYmVyID0gMCl7XHJcbiAgICAgICAgdGhpcy54ID0geDtcclxuICAgICAgICB0aGlzLnkgPSB5O1xyXG4gICAgfVxyXG5cclxuICAgIGFkZCh2ZWN0b3I6VmVjdG9yKTpWZWN0b3J7XHJcbiAgICAgICAgdGhpcy54ICs9IHZlY3Rvci54O1xyXG4gICAgICAgIHRoaXMueSArPSB2ZWN0b3IueTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBzdWIodmVjdG9yOlZlY3Rvcik6VmVjdG9ye1xyXG4gICAgICAgIHRoaXMueCAtPSB2ZWN0b3IueDtcclxuICAgICAgICB0aGlzLnkgLT0gdmVjdG9yLnk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXNcclxuICAgIH1cclxuXHJcbiAgICBsZW5ndGgoKXtcclxuICAgICAgICByZXR1cm4gTWF0aC5wb3codGhpcy54ICogdGhpcy54ICsgdGhpcy55ICogdGhpcy55LCAwLjUpO1xyXG4gICAgfVxyXG5cclxuICAgIG5vcm1hbGl6ZSgpe1xyXG4gICAgICAgIHZhciBsZW5ndGggPSB0aGlzLmxlbmd0aCgpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLnNjYWxlKDEgLyBsZW5ndGgpXHJcbiAgICB9XHJcblxyXG4gICAgc2NhbGUoc2NhbGFyOm51bWJlcik6VmVjdG9ye1xyXG4gICAgICAgIHRoaXMueCAqPSBzY2FsYXI7XHJcbiAgICAgICAgdGhpcy55ICo9IHNjYWxhclxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHJvdGF0ZShyOm51bWJlciwgb3JpZ2luOlZlY3RvciA9IG5ldyBWZWN0b3IoKSk6VmVjdG9ye1xyXG4gICAgICAgIHZhciBvZmZzZXQgPSB0aGlzLmMoKS5zdWIob3JpZ2luKVxyXG4gICAgICAgIHZhciB4ID0gb2Zmc2V0LnggKiBNYXRoLmNvcyhyKSAtIG9mZnNldC55ICogTWF0aC5zaW4ocilcclxuICAgICAgICB2YXIgeSA9IG9mZnNldC54ICogTWF0aC5zaW4ocikgKyBvZmZzZXQueSAqIE1hdGguY29zKHIpXHJcbiAgICAgICAgb2Zmc2V0LnggPSB4OyBvZmZzZXQueSA9IHk7XHJcbiAgICAgICAgdmFyIGJhY2sgPSBvZmZzZXQuYWRkKG9yaWdpbilcclxuICAgICAgICB0aGlzLnggPSBiYWNrLng7IHRoaXMueSA9IGJhY2sueTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBsZXJwKHZlY3RvcjpWZWN0b3IsIHdlaWd0aDpudW1iZXIpe1xyXG4gICAgICAgIHJldHVybiB0aGlzLnNjYWxlKDEgLSB3ZWlndGgpLmFkZCh2ZWN0b3IuYygpLnNjYWxlKHdlaWd0aCkpXHJcbiAgICB9XHJcblxyXG4gICAgYygpOlZlY3RvcntcclxuICAgICAgICByZXR1cm4gbmV3IFZlY3Rvcih0aGlzLngsIHRoaXMueSlcclxuICAgIH1cclxuXHJcbiAgICBlcXVhbHModjpWZWN0b3IpOmJvb2xlYW57XHJcbiAgICAgICAgaWYodiA9PSBudWxsKXJldHVybiBmYWxzZVxyXG4gICAgICAgIHJldHVybiB0aGlzLnggPT0gdi54ICYmIHRoaXMueSA9PSB2Lnk7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0KHZlY3RvcjpWZWN0b3IpOlZlY3RvcntcclxuICAgICAgICB0aGlzLnggPSB2ZWN0b3IueDtcclxuICAgICAgICB0aGlzLnkgPSB2ZWN0b3IueTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBwZXJwRG90KHZlY3RvcjpWZWN0b3IpOm51bWJlcntcclxuICAgICAgICByZXR1cm4gTWF0aC5hdGFuMiggdGhpcy54ICogdmVjdG9yLnkgLSB0aGlzLnkgKiB2ZWN0b3IueCwgdGhpcy54ICogdmVjdG9yLnggKyB0aGlzLnkgKiB2ZWN0b3IueSApXHJcbiAgICB9XHJcblxyXG4gICAgZHJhdyhjdHh0OkNhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCl7XHJcbiAgICAgICAgdmFyIHdpZHRoID0gMTA7dmFyIGhhbGYgPSB3aWR0aCAvIDI7XHJcbiAgICAgICAgY3R4dC5maWxsUmVjdCh0aGlzLnggLSBoYWxmLCB0aGlzLnkgLSBoYWxmLCB3aWR0aCwgd2lkdGgpO1xyXG4gICAgfVxyXG5cclxuICAgIGxvb3AoY2FsbGJhY2s6KHY6VmVjdG9yKSA9PiB2b2lkKXtcclxuICAgICAgICBmb3IodmFyIHggPSAwOyB4IDwgdGhpcy54OyB4Kyspe1xyXG4gICAgICAgICAgICBmb3IodmFyIHkgPSAwOyB5IDwgdGhpcy55OyB5Kyspe1xyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobmV3IFZlY3Rvcih4LCB5KSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgc2VyaWFsaXplKCl7XHJcbiAgICAgICAgcmV0dXJuIHt4OnRoaXMueCwgeTp0aGlzLnl9XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGRlc2VyaWFsaXplKG9iamVjdDphbnkpe1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjdG9yKG9iamVjdC54LCBvYmplY3QueSlcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0ID0gVmVjdG9yOyJdfQ==
