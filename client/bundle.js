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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL1Byb2dyYW0gRmlsZXMvbm9kZWpzNjMvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJvdXQvQUFCQi5qcyIsIm91dC9DaGVzc0JvYXJkLmpzIiwib3V0L0NoZXNzUGllY2UuanMiLCJvdXQvV2ViSU9DLmpzIiwib3V0L2V2ZW50SGFuZGxlci5qcyIsIm91dC9tYWluLmpzIiwib3V0L3V0aWxzLmpzIiwib3V0L3ZlY3Rvci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBVdGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcclxudmFyIEFBQkIgPSAoZnVuY3Rpb24gKCkge1xyXG4gICAgZnVuY3Rpb24gQUFCQihwb3MsIHNpemUpIHtcclxuICAgICAgICB0aGlzLnBvcyA9IHBvcztcclxuICAgICAgICB0aGlzLnNpemUgPSBzaXplO1xyXG4gICAgfVxyXG4gICAgQUFCQi5mcm9tVmVjdG9ycyA9IGZ1bmN0aW9uIChhKSB7XHJcbiAgICAgICAgdmFyIHNtYWxsID0gYVswXTtcclxuICAgICAgICB2YXIgYmlnID0gYVthLmxlbmd0aCAtIDFdO1xyXG4gICAgICAgIGZvciAodmFyIF9pID0gMCwgYV8xID0gYTsgX2kgPCBhXzEubGVuZ3RoOyBfaSsrKSB7XHJcbiAgICAgICAgICAgIHZhciB2ID0gYV8xW19pXTtcclxuICAgICAgICAgICAgaWYgKHYueCA8IHNtYWxsLngpXHJcbiAgICAgICAgICAgICAgICBzbWFsbC54ID0gdi54O1xyXG4gICAgICAgICAgICBlbHNlIGlmICh2LnggPiBiaWcueClcclxuICAgICAgICAgICAgICAgIGJpZy54ID0gdi54O1xyXG4gICAgICAgICAgICBpZiAodi55IDwgc21hbGwueSlcclxuICAgICAgICAgICAgICAgIHNtYWxsLnkgPSB2Lnk7XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKHYueSA+IGJpZy55KVxyXG4gICAgICAgICAgICAgICAgYmlnLnkgPSB2Lnk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBuZXcgQUFCQihzbWFsbCwgYmlnLnN1YihzbWFsbCkpO1xyXG4gICAgfTtcclxuICAgIEFBQkIucHJvdG90eXBlLmNvbnRhaW5zID0gZnVuY3Rpb24gKGFhYmIpIHtcclxuICAgICAgICByZXR1cm4gVXRpbHMucmFuZ2VDb250YWluKHRoaXMucG9zLngsIHRoaXMuc2l6ZS54ICsgdGhpcy5wb3MueCwgYWFiYi5wb3MueCwgYWFiYi5zaXplLnggKyBhYWJiLnBvcy54KVxyXG4gICAgICAgICAgICAmJiBVdGlscy5yYW5nZUNvbnRhaW4odGhpcy5wb3MueSwgdGhpcy5zaXplLnkgKyB0aGlzLnBvcy55LCBhYWJiLnBvcy55LCBhYWJiLnNpemUueSArIGFhYmIucG9zLnkpO1xyXG4gICAgfTtcclxuICAgIEFBQkIucHJvdG90eXBlLmNvbGxpZGUgPSBmdW5jdGlvbiAodikge1xyXG4gICAgICAgIHJldHVybiBVdGlscy5pblJhbmdlKHRoaXMucG9zLngsIHRoaXMuc2l6ZS54ICsgdGhpcy5wb3MueCwgdi54KSAmJiBVdGlscy5pblJhbmdlKHRoaXMucG9zLnksIHRoaXMuc2l6ZS55ICsgdGhpcy5wb3MueSwgdi55KTtcclxuICAgIH07XHJcbiAgICByZXR1cm4gQUFCQjtcclxufSgpKTtcclxubW9kdWxlLmV4cG9ydHMgPSBBQUJCO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1BQUJCLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgVmVjdG9yID0gcmVxdWlyZSgnLi92ZWN0b3InKTtcclxudmFyIFV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xyXG52YXIgQ2hlc3NQaWVjZSA9IHJlcXVpcmUoJy4vQ2hlc3NQaWVjZScpO1xyXG52YXIgVGVhbTtcclxuKGZ1bmN0aW9uIChUZWFtKSB7XHJcbiAgICBUZWFtW1RlYW1bXCJCbGFja1wiXSA9IDBdID0gXCJCbGFja1wiO1xyXG4gICAgVGVhbVtUZWFtW1wiV2hpdGVcIl0gPSAxXSA9IFwiV2hpdGVcIjtcclxufSkoVGVhbSB8fCAoVGVhbSA9IHt9KSk7XHJcbnZhciBDaGVzc0JvYXJkID0gKGZ1bmN0aW9uICgpIHtcclxuICAgIGZ1bmN0aW9uIENoZXNzQm9hcmQoKSB7XHJcbiAgICAgICAgdGhpcy5sYXN0TW92ZVRvID0gbnVsbDtcclxuICAgICAgICB0aGlzLmxhc3RNb3ZlRnJvbSA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5zaXplID0gbmV3IFZlY3Rvcig4LCA4KTtcclxuICAgICAgICB0aGlzLnNxdWFyZVNpemUgPSBuZXcgVmVjdG9yKDUwLCA1MCk7XHJcbiAgICAgICAgdGhpcy50dXJuID0gVGVhbS5XaGl0ZTtcclxuICAgICAgICB0aGlzLmdyaWQgPSBVdGlscy5jcmVhdGUyZEFycmF5KHRoaXMuc2l6ZSwgbnVsbCk7XHJcbiAgICB9XHJcbiAgICBDaGVzc0JvYXJkLnByb3RvdHlwZS50cnlGcm9tVG8gPSBmdW5jdGlvbiAoZnJvbSwgdG8pIHtcclxuICAgICAgICB2YXIgZnJvbVBpZWNlID0gdGhpcy5ncmlkW2Zyb20ueF1bZnJvbS55XTsgLy9jb3VsZCBvdXRvZnJhbmdlIGZyb20gYmFkY2xpZW50XHJcbiAgICAgICAgcmV0dXJuIGZyb21QaWVjZS50cnlNb3ZlKHRvKTtcclxuICAgIH07XHJcbiAgICBDaGVzc0JvYXJkLnByb3RvdHlwZS5kcmF3ID0gZnVuY3Rpb24gKGN0eHQsIG9mZnNldCkge1xyXG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICAgICAgdmFyIGxlZ2Fsc1Nwb3RzO1xyXG4gICAgICAgIGlmICh0aGlzLnNlbGVjdGVkKVxyXG4gICAgICAgICAgICBsZWdhbHNTcG90cyA9IHRoaXMuc2VsZWN0ZWQucG9zQ2hlY2tlcih0aGlzLnNlbGVjdGVkLCB0aGlzKTtcclxuICAgICAgICB0aGlzLnNpemUubG9vcChmdW5jdGlvbiAodikge1xyXG4gICAgICAgICAgICBpZiAoKHYueCArIHYueSkgJSAyID09IDApXHJcbiAgICAgICAgICAgICAgICBjdHh0LmZpbGxTdHlsZSA9IFwiI2ZmZlwiO1xyXG4gICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICBjdHh0LmZpbGxTdHlsZSA9IFwiIzAwMFwiO1xyXG4gICAgICAgICAgICBpZiAoX3RoaXMuc2VsZWN0ZWQgJiYgdi5lcXVhbHMoX3RoaXMuc2VsZWN0ZWQucG9zKSlcclxuICAgICAgICAgICAgICAgIGN0eHQuZmlsbFN0eWxlID0gXCIjMGZmXCI7XHJcbiAgICAgICAgICAgIGlmIChfdGhpcy5sYXN0TW92ZUZyb20gJiYgdi5lcXVhbHMoX3RoaXMubGFzdE1vdmVGcm9tKSlcclxuICAgICAgICAgICAgICAgIGN0eHQuZmlsbFN0eWxlID0gXCIjNDA0XCI7XHJcbiAgICAgICAgICAgIGlmIChfdGhpcy5sYXN0TW92ZVRvICYmIHYuZXF1YWxzKF90aGlzLmxhc3RNb3ZlVG8pKVxyXG4gICAgICAgICAgICAgICAgY3R4dC5maWxsU3R5bGUgPSBcIiNhMGFcIjtcclxuICAgICAgICAgICAgaWYgKF90aGlzLnNlbGVjdGVkICYmIGxlZ2Fsc1Nwb3RzW3YueF1bdi55XSlcclxuICAgICAgICAgICAgICAgIGN0eHQuZmlsbFN0eWxlID0gXCIjZjAwXCI7XHJcbiAgICAgICAgICAgIGN0eHQuZmlsbFJlY3Qodi54ICogX3RoaXMuc3F1YXJlU2l6ZS54ICsgb2Zmc2V0LngsIHYueSAqIF90aGlzLnNxdWFyZVNpemUueSArIG9mZnNldC55LCBfdGhpcy5zcXVhcmVTaXplLngsIF90aGlzLnNxdWFyZVNpemUueSk7XHJcbiAgICAgICAgICAgIGlmIChfdGhpcy5ncmlkW3YueF1bdi55XSkge1xyXG4gICAgICAgICAgICAgICAgX3RoaXMuZ3JpZFt2LnhdW3YueV0uZHJhdyhjdHh0LCBfdGhpcy5zcXVhcmVTaXplLCBvZmZzZXQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9O1xyXG4gICAgQ2hlc3NCb2FyZC5wcm90b3R5cGUudmVjdG9yVG9HcmlkUG9zID0gZnVuY3Rpb24gKHYpIHtcclxuICAgICAgICB2YXIgbiA9IG5ldyBWZWN0b3IoKTtcclxuICAgICAgICBuLnggPSBNYXRoLmZsb29yKHYueCAvIHRoaXMuc3F1YXJlU2l6ZS54KTtcclxuICAgICAgICBuLnkgPSBNYXRoLmZsb29yKHYueSAvIHRoaXMuc3F1YXJlU2l6ZS55KTtcclxuICAgICAgICByZXR1cm4gbjtcclxuICAgIH07XHJcbiAgICBDaGVzc0JvYXJkLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiAoYykge1xyXG4gICAgICAgIHRoaXMuZ3JpZFtjLnBvcy54XVtjLnBvcy55XSA9IGM7XHJcbiAgICB9O1xyXG4gICAgQ2hlc3NCb2FyZC5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICAgICAgdmFyIGdyaWQgPSBVdGlscy5jcmVhdGUyZEFycmF5KHRoaXMuc2l6ZSwgbnVsbCk7XHJcbiAgICAgICAgdGhpcy5zaXplLmxvb3AoZnVuY3Rpb24gKHYpIHtcclxuICAgICAgICAgICAgaWYgKF90aGlzLmdyaWRbdi54XVt2LnldKVxyXG4gICAgICAgICAgICAgICAgZ3JpZFt2LnhdW3YueV0gPSBfdGhpcy5ncmlkW3YueF1bdi55XS5zZXJpYWxpemUoKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICB2YXIgc2VsZWN0ZWQ7XHJcbiAgICAgICAgaWYgKHRoaXMuc2VsZWN0ZWQpXHJcbiAgICAgICAgICAgIHNlbGVjdGVkID0gdGhpcy5zZWxlY3RlZC5zZXJpYWxpemUoKTtcclxuICAgICAgICB2YXIgbGFzdE1vdmVGcm9tO1xyXG4gICAgICAgIGlmICh0aGlzLmxhc3RNb3ZlRnJvbSlcclxuICAgICAgICAgICAgbGFzdE1vdmVGcm9tID0gdGhpcy5sYXN0TW92ZUZyb20uc2VyaWFsaXplKCk7XHJcbiAgICAgICAgdmFyIGxhc3RNb3ZlVG87XHJcbiAgICAgICAgaWYgKHRoaXMubGFzdE1vdmVUbylcclxuICAgICAgICAgICAgbGFzdE1vdmVUbyA9IHRoaXMubGFzdE1vdmVUby5zZXJpYWxpemUoKTtcclxuICAgICAgICB2YXIgc2VyaWFsaXplZCA9IHtcclxuICAgICAgICAgICAgc2l6ZTogdGhpcy5zaXplLnNlcmlhbGl6ZSgpLFxyXG4gICAgICAgICAgICBzcXVhcmVTaXplOiB0aGlzLnNxdWFyZVNpemUuc2VyaWFsaXplKCksXHJcbiAgICAgICAgICAgIGdyaWQ6IGdyaWQsXHJcbiAgICAgICAgICAgIHR1cm46IHRoaXMudHVybixcclxuICAgICAgICAgICAgc2VsZWN0ZWQ6IHNlbGVjdGVkLFxyXG4gICAgICAgICAgICBsYXN0TW92ZUZyb206IGxhc3RNb3ZlRnJvbSxcclxuICAgICAgICAgICAgbGFzdE1vdmVUbzogbGFzdE1vdmVUb1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgcmV0dXJuIHNlcmlhbGl6ZWQ7XHJcbiAgICB9O1xyXG4gICAgQ2hlc3NCb2FyZC5kZXNlcmlhbGl6ZSA9IGZ1bmN0aW9uIChvYmplY3QpIHtcclxuICAgICAgICB2YXIgY2hlc3NCb2FyZCA9IG5ldyBDaGVzc0JvYXJkKCk7XHJcbiAgICAgICAgdmFyIGdyaWQgPSBVdGlscy5jcmVhdGUyZEFycmF5KGNoZXNzQm9hcmQuc2l6ZSwgbnVsbCk7XHJcbiAgICAgICAgY2hlc3NCb2FyZC5zaXplLmxvb3AoZnVuY3Rpb24gKHYpIHtcclxuICAgICAgICAgICAgaWYgKG9iamVjdC5ncmlkW3YueF1bdi55XSlcclxuICAgICAgICAgICAgICAgIGdyaWRbdi54XVt2LnldID0gQ2hlc3NQaWVjZS5kZXNlcmlhbGl6ZShvYmplY3QuZ3JpZFt2LnhdW3YueV0sIGNoZXNzQm9hcmQpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGNoZXNzQm9hcmQuZ3JpZCA9IGdyaWQ7XHJcbiAgICAgICAgY2hlc3NCb2FyZC50dXJuID0gb2JqZWN0LnR1cm47XHJcbiAgICAgICAgaWYgKG9iamVjdC5zZWxlY3RlZClcclxuICAgICAgICAgICAgY2hlc3NCb2FyZC5zZWxlY3RlZCA9IENoZXNzUGllY2UuZGVzZXJpYWxpemUob2JqZWN0LnNlbGVjdGVkLCBjaGVzc0JvYXJkKTtcclxuICAgICAgICBpZiAob2JqZWN0Lmxhc3RNb3ZlRnJvbSlcclxuICAgICAgICAgICAgY2hlc3NCb2FyZC5sYXN0TW92ZUZyb20gPSBWZWN0b3IuZGVzZXJpYWxpemUob2JqZWN0Lmxhc3RNb3ZlRnJvbSk7XHJcbiAgICAgICAgaWYgKG9iamVjdC5sYXN0TW92ZVRvKVxyXG4gICAgICAgICAgICBjaGVzc0JvYXJkLmxhc3RNb3ZlVG8gPSBWZWN0b3IuZGVzZXJpYWxpemUob2JqZWN0Lmxhc3RNb3ZlVG8pO1xyXG4gICAgICAgIHJldHVybiBjaGVzc0JvYXJkO1xyXG4gICAgfTtcclxuICAgIHJldHVybiBDaGVzc0JvYXJkO1xyXG59KCkpO1xyXG5tb2R1bGUuZXhwb3J0cyA9IENoZXNzQm9hcmQ7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPUNoZXNzQm9hcmQuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBWZWN0b3IgPSByZXF1aXJlKCcuL3ZlY3RvcicpO1xyXG52YXIgVXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XHJcbnZhciBBQUJCID0gcmVxdWlyZSgnLi9BQUJCJyk7XHJcbnZhciBFdmVudEhhbmRsZXIgPSByZXF1aXJlKCcuL2V2ZW50SGFuZGxlcicpO1xyXG52YXIgVGVhbTtcclxuKGZ1bmN0aW9uIChUZWFtKSB7XHJcbiAgICBUZWFtW1RlYW1bXCJCbGFja1wiXSA9IDBdID0gXCJCbGFja1wiO1xyXG4gICAgVGVhbVtUZWFtW1wiV2hpdGVcIl0gPSAxXSA9IFwiV2hpdGVcIjtcclxufSkoVGVhbSB8fCAoVGVhbSA9IHt9KSk7XHJcbnZhciBUeXBlO1xyXG4oZnVuY3Rpb24gKFR5cGUpIHtcclxuICAgIFR5cGVbVHlwZVtcInBhd25cIl0gPSAwXSA9IFwicGF3blwiO1xyXG4gICAgVHlwZVtUeXBlW1wicm9va1wiXSA9IDFdID0gXCJyb29rXCI7XHJcbiAgICBUeXBlW1R5cGVbXCJrbmlnaHRcIl0gPSAyXSA9IFwia25pZ2h0XCI7XHJcbiAgICBUeXBlW1R5cGVbXCJiaXNob3BcIl0gPSAzXSA9IFwiYmlzaG9wXCI7XHJcbiAgICBUeXBlW1R5cGVbXCJxdWVlblwiXSA9IDRdID0gXCJxdWVlblwiO1xyXG4gICAgVHlwZVtUeXBlW1wia2luZ1wiXSA9IDVdID0gXCJraW5nXCI7XHJcbn0pKFR5cGUgfHwgKFR5cGUgPSB7fSkpO1xyXG52YXIgQ2hlc3NQaWVjZSA9IChmdW5jdGlvbiAoKSB7XHJcbiAgICBmdW5jdGlvbiBDaGVzc1BpZWNlKHR5cGUsIHRlYW0sIHBvcywgY2hlc3NCb2FyZCkge1xyXG4gICAgICAgIHRoaXMubW92ZWQgPSBmYWxzZTtcclxuICAgICAgICBpZiAodHlwZW9mIGRvY3VtZW50ICE9ICd1bmRlZmluZWQnKSB7XHJcbiAgICAgICAgICAgIGlmICh0ZWFtID09IFRlYW0uQmxhY2spXHJcbiAgICAgICAgICAgICAgICB0aGlzLmltYWdlID0gaW1hZ2VNYXBCW1R5cGVbdHlwZV1dO1xyXG4gICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICB0aGlzLmltYWdlID0gaW1hZ2VNYXBXW1R5cGVbdHlwZV1dO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLnBvcyA9IHBvcztcclxuICAgICAgICB0aGlzLmNoZXNzQm9hcmQgPSBjaGVzc0JvYXJkO1xyXG4gICAgICAgIHRoaXMucG9zQ2hlY2tlciA9IGNoZWNrTWFwLmdldCh0eXBlKTtcclxuICAgICAgICB0aGlzLnR5cGUgPSB0eXBlO1xyXG4gICAgICAgIHRoaXMudGVhbSA9IHRlYW07XHJcbiAgICB9XHJcbiAgICBDaGVzc1BpZWNlLnByb3RvdHlwZS5kcmF3ID0gZnVuY3Rpb24gKGN0eHQsIHNxdWFyZVNpemUsIG9mZnNldCkge1xyXG4gICAgICAgIHZhciBzaXplID0gdGhpcy5jaGVzc0JvYXJkLnNxdWFyZVNpemUueDtcclxuICAgICAgICB2YXIgaGFsZnNpemUgPSBzaXplIC8gMjtcclxuICAgICAgICBjdHh0LmRyYXdJbWFnZSh0aGlzLmltYWdlLCBvZmZzZXQueCArIDAuNSArIHRoaXMucG9zLnggKiBzcXVhcmVTaXplLnggKyBzcXVhcmVTaXplLnggLyAyIC0gaGFsZnNpemUsIG9mZnNldC55ICsgMC41ICsgdGhpcy5wb3MueSAqIHNxdWFyZVNpemUueSArIHNxdWFyZVNpemUueSAvIDIgLSBoYWxmc2l6ZSwgc2l6ZSwgc2l6ZSk7XHJcbiAgICB9O1xyXG4gICAgQ2hlc3NQaWVjZS5wcm90b3R5cGUudHJ5TW92ZSA9IGZ1bmN0aW9uICh0bykge1xyXG4gICAgICAgIGlmICh0aGlzLnBvc0NoZWNrZXIodGhpcywgdGhpcy5jaGVzc0JvYXJkKVt0by54XVt0by55XSkge1xyXG4gICAgICAgICAgICB0aGlzLmNoZXNzQm9hcmQubGFzdE1vdmVGcm9tID0gdGhpcy5wb3MuYygpO1xyXG4gICAgICAgICAgICB0aGlzLmNoZXNzQm9hcmQubGFzdE1vdmVUbyA9IHRvLmMoKTtcclxuICAgICAgICAgICAgdmFyIGZyb21UTyA9IHRvLmMoKS5zdWIodGhpcy5wb3MpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy50eXBlID09IFR5cGUua2luZyAmJiBmcm9tVE8ubGVuZ3RoKCkgPT0gMikge1xyXG4gICAgICAgICAgICAgICAgZnJvbVRPLm5vcm1hbGl6ZSgpO1xyXG4gICAgICAgICAgICAgICAgdmFyIHJvb2sgPSBnZXRQaWVjZUluRGlyZWN0aW9uKHRoaXMucG9zLCBmcm9tVE8sIFR5cGUucm9vaywgdGhpcy5jaGVzc0JvYXJkKTtcclxuICAgICAgICAgICAgICAgIHJvb2subW92ZSh0aGlzLnBvcy5jKCkuYWRkKGZyb21UTykpOyAvL2Fzc3VtZXMgcm9vayBoYXMgYmVlbiBmb3VuZCBiZWNhdXNlIHBvc0NoZWNrZXIgc2F3IHRoaXMgYXMgYSBsZWdhbCBtb3ZlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdmFyIHBpZWNlID0gdGhpcy5jaGVzc0JvYXJkLmdyaWRbdG8ueF1bdG8ueV07IC8vY2hlY2sgaWYgaGl0IHBpZWNlIGlzIGtpbmdcclxuICAgICAgICAgICAgaWYgKHBpZWNlICYmIHBpZWNlLnR5cGUgPT0gVHlwZS5raW5nKVxyXG4gICAgICAgICAgICAgICAgRXZlbnRIYW5kbGVyLnRyaWdnZXIoJ2dhbWVPdmVyJywgcGllY2UpO1xyXG4gICAgICAgICAgICB0aGlzLm1vdmUodG8pO1xyXG4gICAgICAgICAgICBpZiAodGhpcy50eXBlID09IFR5cGUucGF3bikge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudGVhbSA9PSBUZWFtLkJsYWNrICYmIHRoaXMucG9zLnkgPT0gdGhpcy5jaGVzc0JvYXJkLnNpemUueSAtIDFcclxuICAgICAgICAgICAgICAgICAgICB8fCB0aGlzLnRlYW0gPT0gVGVhbS5XaGl0ZSAmJiB0aGlzLnBvcy55ID09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnR5cGUgPSBUeXBlLnF1ZWVuO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucG9zQ2hlY2tlciA9IGNoZWNrTWFwLmdldChUeXBlLnF1ZWVuKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodGhpcy5jaGVzc0JvYXJkLnR1cm4gPT0gVGVhbS5CbGFjaylcclxuICAgICAgICAgICAgICAgIHRoaXMuY2hlc3NCb2FyZC50dXJuID0gVGVhbS5XaGl0ZTsgLy9zd2l0Y2ggdHVyblxyXG4gICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNoZXNzQm9hcmQudHVybiA9IFRlYW0uQmxhY2s7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9O1xyXG4gICAgQ2hlc3NQaWVjZS5wcm90b3R5cGUubW92ZSA9IGZ1bmN0aW9uICh0bykge1xyXG4gICAgICAgIHRoaXMuY2hlc3NCb2FyZC5ncmlkW3RvLnhdW3RvLnldID0gdGhpczsgLy9tb3ZlIHRoaXMgcGllY2UgdG8gcmVxdWVzdGVkIHNwb3RcclxuICAgICAgICB0aGlzLmNoZXNzQm9hcmQuZ3JpZFt0aGlzLnBvcy54XVt0aGlzLnBvcy55XSA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5wb3MgPSB0bztcclxuICAgICAgICB0aGlzLm1vdmVkID0gdHJ1ZTtcclxuICAgIH07XHJcbiAgICBDaGVzc1BpZWNlLnByb3RvdHlwZS5pc0xlZ2FsTW92ZSA9IGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMucG9zQ2hlY2tlcih0aGlzLCB0aGlzLmNoZXNzQm9hcmQpW3YueF1bdi55XTtcclxuICAgIH07XHJcbiAgICBDaGVzc1BpZWNlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgdHlwZTogdGhpcy50eXBlLFxyXG4gICAgICAgICAgICBwb3M6IHRoaXMucG9zLnNlcmlhbGl6ZSgpLFxyXG4gICAgICAgICAgICB0ZWFtOiB0aGlzLnRlYW0sXHJcbiAgICAgICAgICAgIG1vdmVkOiB0aGlzLm1vdmVkXHJcbiAgICAgICAgfTtcclxuICAgIH07XHJcbiAgICBDaGVzc1BpZWNlLmRlc2VyaWFsaXplID0gZnVuY3Rpb24gKG9iamVjdCwgY2hlc3NCb2FyZCkge1xyXG4gICAgICAgIHZhciBjID0gbmV3IENoZXNzUGllY2Uob2JqZWN0LnR5cGUsIG9iamVjdC50ZWFtLCBWZWN0b3IuZGVzZXJpYWxpemUob2JqZWN0LnBvcyksIGNoZXNzQm9hcmQpO1xyXG4gICAgICAgIGMubW92ZWQgPSBvYmplY3QubW92ZWQ7XHJcbiAgICAgICAgcmV0dXJuIGM7XHJcbiAgICB9O1xyXG4gICAgcmV0dXJuIENoZXNzUGllY2U7XHJcbn0oKSk7XHJcbnZhciBjaGVja01hcCA9IG5ldyBNYXAoKTtcclxuY2hlY2tNYXAuc2V0KFR5cGUucGF3biwgZnVuY3Rpb24gKGMsIGJvYXJkKSB7XHJcbiAgICB2YXIgYWFiYiA9IG5ldyBBQUJCKG5ldyBWZWN0b3IoKSwgYm9hcmQuc2l6ZS5jKCkuc3ViKG5ldyBWZWN0b3IoMSwgMSkpKTtcclxuICAgIHZhciBtb3ZlcyA9IFtdO1xyXG4gICAgdmFyIGZhY2luZztcclxuICAgIGlmIChjLnRlYW0gPT0gVGVhbS5XaGl0ZSlcclxuICAgICAgICBmYWNpbmcgPSBuZXcgVmVjdG9yKDAsIC0xKTtcclxuICAgIGVsc2VcclxuICAgICAgICBmYWNpbmcgPSBuZXcgVmVjdG9yKDAsIDEpO1xyXG4gICAgdmFyIHdzZnJvbnQgPSBjLnBvcy5jKCkuYWRkKGZhY2luZyk7XHJcbiAgICBpZiAoYWFiYi5jb2xsaWRlKHdzZnJvbnQpICYmIGJvYXJkLmdyaWRbd3Nmcm9udC54XVt3c2Zyb250LnldID09IG51bGwpIHtcclxuICAgICAgICBtb3Zlcy5wdXNoKGZhY2luZyk7XHJcbiAgICAgICAgdmFyIGZhckZyb250ID0gZmFjaW5nLmMoKS5zY2FsZSgyKTtcclxuICAgICAgICB2YXIgd3NGYXJGcm9udCA9IGMucG9zLmMoKS5hZGQoZmFyRnJvbnQpO1xyXG4gICAgICAgIGlmICghYy5tb3ZlZCAmJiBhYWJiLmNvbGxpZGUod3NGYXJGcm9udCkgJiYgYm9hcmQuZ3JpZFt3c0ZhckZyb250LnhdW3dzRmFyRnJvbnQueV0gPT0gbnVsbClcclxuICAgICAgICAgICAgbW92ZXMucHVzaChmYXJGcm9udCk7XHJcbiAgICB9XHJcbiAgICB2YXIgd2VzdCA9IG5ldyBWZWN0b3IoMSwgMCkuYWRkKGZhY2luZyk7XHJcbiAgICB2YXIgd3N3ZXN0ID0gd2VzdC5jKCkuYWRkKGMucG9zKTtcclxuICAgIGlmIChhYWJiLmNvbGxpZGUod3N3ZXN0KSAmJiBib2FyZC5ncmlkW3dzd2VzdC54XVt3c3dlc3QueV0gIT0gbnVsbCAmJiBib2FyZC5ncmlkW3dzd2VzdC54XVt3c3dlc3QueV0udGVhbSAhPSBjLnRlYW0pXHJcbiAgICAgICAgbW92ZXMucHVzaCh3ZXN0KTtcclxuICAgIHZhciBlYXN0ID0gbmV3IFZlY3RvcigtMSwgMCkuYWRkKGZhY2luZyk7XHJcbiAgICB2YXIgd3NlYXN0ID0gZWFzdC5jKCkuYWRkKGMucG9zKTtcclxuICAgIGlmIChhYWJiLmNvbGxpZGUod3NlYXN0KSAmJiBib2FyZC5ncmlkW3dzZWFzdC54XVt3c2Vhc3QueV0gIT0gbnVsbCAmJiBib2FyZC5ncmlkW3dzZWFzdC54XVt3c2Vhc3QueV0udGVhbSAhPSBjLnRlYW0pXHJcbiAgICAgICAgbW92ZXMucHVzaChlYXN0KTtcclxuICAgIHJldHVybiBtb3Zlc1N0YW1wKG1vdmVzLCBjKTtcclxufSk7XHJcbmNoZWNrTWFwLnNldChUeXBlLnJvb2ssIGZ1bmN0aW9uIChjLCBncmlkKSB7XHJcbiAgICB2YXIgZGlyZWN0aW9ucyA9IFtcclxuICAgICAgICBuZXcgVmVjdG9yKDEsIDApLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTEsIDApLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoMCwgMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigwLCAtMSlcclxuICAgIF07XHJcbiAgICByZXR1cm4gZGlyZWN0aW9uU3RhbXAoZGlyZWN0aW9ucywgYyk7XHJcbn0pO1xyXG5jaGVja01hcC5zZXQoVHlwZS5rbmlnaHQsIGZ1bmN0aW9uIChjLCBncmlkKSB7XHJcbiAgICB2YXIgbW92ZXMgPSBbXHJcbiAgICAgICAgbmV3IFZlY3RvcigxLCAtMiksXHJcbiAgICAgICAgbmV3IFZlY3RvcigyLCAtMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigyLCAxKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDEsIDIpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTEsIDIpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTIsIDEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTIsIC0xKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0xLCAtMilcclxuICAgIF07XHJcbiAgICByZXR1cm4gbW92ZXNTdGFtcChtb3ZlcywgYyk7XHJcbn0pO1xyXG5jaGVja01hcC5zZXQoVHlwZS5iaXNob3AsIGZ1bmN0aW9uIChjLCBncmlkKSB7XHJcbiAgICB2YXIgZGlyZWN0aW9ucyA9IFtcclxuICAgICAgICBuZXcgVmVjdG9yKDEsIDEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTEsIC0xKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDEsIC0xKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0xLCAxKVxyXG4gICAgXTtcclxuICAgIHJldHVybiBkaXJlY3Rpb25TdGFtcChkaXJlY3Rpb25zLCBjKTtcclxufSk7XHJcbmNoZWNrTWFwLnNldChUeXBlLnF1ZWVuLCBmdW5jdGlvbiAoYykge1xyXG4gICAgdmFyIGRpcmVjdGlvbnMgPSBbXHJcbiAgICAgICAgbmV3IFZlY3RvcigxLCAxKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0xLCAtMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigxLCAtMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigtMSwgMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigxLCAwKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0xLCAwKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDAsIDEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoMCwgLTEpXHJcbiAgICBdO1xyXG4gICAgcmV0dXJuIGRpcmVjdGlvblN0YW1wKGRpcmVjdGlvbnMsIGMpO1xyXG59KTtcclxuY2hlY2tNYXAuc2V0KFR5cGUua2luZywgZnVuY3Rpb24gKGMsIGdyaWQpIHtcclxuICAgIHZhciBtb3ZlcyA9IFtcclxuICAgICAgICBuZXcgVmVjdG9yKDAsIDEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoMSwgMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigxLCAwKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDEsIC0xKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDAsIC0xKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0xLCAtMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigtMSwgMCksXHJcbiAgICAgICAgbmV3IFZlY3RvcigtMSwgMSksXHJcbiAgICBdO1xyXG4gICAgdmFyIGxlZ2FsTW92ZXMgPSBtb3Zlc1N0YW1wKG1vdmVzLCBjKTtcclxuICAgIGlmICghYy5tb3ZlZCkge1xyXG4gICAgICAgIHZhciBhYWJiID0gbmV3IEFBQkIobmV3IFZlY3RvcigpLCBjLmNoZXNzQm9hcmQuc2l6ZS5jKCkuc3ViKG5ldyBWZWN0b3IoMSwgMSkpKTtcclxuICAgICAgICB2YXIgb3BlbnMgPSBVdGlscy5jcmVhdGUyZEFycmF5KGMuY2hlc3NCb2FyZC5zaXplLCBmYWxzZSk7XHJcbiAgICAgICAgdmFyIHJvb2tEaXJlY3Rpb25zID0gW1xyXG4gICAgICAgICAgICBuZXcgVmVjdG9yKDEsIDApLFxyXG4gICAgICAgICAgICBuZXcgVmVjdG9yKC0xLCAwKSxcclxuICAgICAgICAgICAgbmV3IFZlY3RvcigwLCAxKSxcclxuICAgICAgICAgICAgbmV3IFZlY3RvcigwLCAtMSlcclxuICAgICAgICBdO1xyXG4gICAgICAgIGZvciAodmFyIF9pID0gMCwgcm9va0RpcmVjdGlvbnNfMSA9IHJvb2tEaXJlY3Rpb25zOyBfaSA8IHJvb2tEaXJlY3Rpb25zXzEubGVuZ3RoOyBfaSsrKSB7XHJcbiAgICAgICAgICAgIHZhciBkaXJlY3Rpb24gPSByb29rRGlyZWN0aW9uc18xW19pXTtcclxuICAgICAgICAgICAgdmFyIGN1cnJlbnRDaGVja2luZ1BvcyA9IGMucG9zLmMoKTtcclxuICAgICAgICAgICAgd2hpbGUgKHRydWUpIHtcclxuICAgICAgICAgICAgICAgIGN1cnJlbnRDaGVja2luZ1Bvcy5hZGQoZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgICAgIGlmIChhYWJiLmNvbGxpZGUoY3VycmVudENoZWNraW5nUG9zKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBwaWVjZSA9IGMuY2hlc3NCb2FyZC5ncmlkW2N1cnJlbnRDaGVja2luZ1Bvcy54XVtjdXJyZW50Q2hlY2tpbmdQb3MueV07XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBpZWNlID09IG51bGwpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocGllY2UudGVhbSA9PSBjLnRlYW0gJiYgcGllY2UudHlwZSA9PSBUeXBlLnJvb2sgJiYgIXBpZWNlLm1vdmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIganVtcFBvcyA9IGMucG9zLmMoKS5hZGQoZGlyZWN0aW9uLmMoKS5zY2FsZSgyKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZWdhbE1vdmVzW2p1bXBQb3MueF1banVtcFBvcy55XSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGxlZ2FsTW92ZXM7XHJcbn0pO1xyXG5mdW5jdGlvbiBmaWx0ZXJNb3Zlc09mZkJvYXJkKG1vdmVzLCBzaXplLCBwb3MpIHtcclxuICAgIHZhciBsZWdhbE1vdmVzID0gW107XHJcbiAgICB2YXIgYWFiYiA9IG5ldyBBQUJCKG5ldyBWZWN0b3IoKSwgc2l6ZS5jKCkuc3ViKG5ldyBWZWN0b3IoMSwgMSkpKTtcclxuICAgIGZvciAodmFyIF9pID0gMCwgbW92ZXNfMSA9IG1vdmVzOyBfaSA8IG1vdmVzXzEubGVuZ3RoOyBfaSsrKSB7XHJcbiAgICAgICAgdmFyIG1vdmUgPSBtb3Zlc18xW19pXTtcclxuICAgICAgICB2YXIgd3MgPSBtb3ZlLmMoKS5hZGQocG9zKTtcclxuICAgICAgICBpZiAoYWFiYi5jb2xsaWRlKHdzKSlcclxuICAgICAgICAgICAgbGVnYWxNb3Zlcy5wdXNoKG1vdmUpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGxlZ2FsTW92ZXM7XHJcbn1cclxuZnVuY3Rpb24gZGlyZWN0aW9uU3RhbXAoZGlyZWN0aW9ucywgYykge1xyXG4gICAgdmFyIGFhYmIgPSBuZXcgQUFCQihuZXcgVmVjdG9yKCksIGMuY2hlc3NCb2FyZC5zaXplLmMoKS5zdWIobmV3IFZlY3RvcigxLCAxKSkpO1xyXG4gICAgdmFyIG9wZW5zID0gVXRpbHMuY3JlYXRlMmRBcnJheShjLmNoZXNzQm9hcmQuc2l6ZSwgZmFsc2UpO1xyXG4gICAgZm9yICh2YXIgX2kgPSAwLCBkaXJlY3Rpb25zXzEgPSBkaXJlY3Rpb25zOyBfaSA8IGRpcmVjdGlvbnNfMS5sZW5ndGg7IF9pKyspIHtcclxuICAgICAgICB2YXIgZGlyZWN0aW9uID0gZGlyZWN0aW9uc18xW19pXTtcclxuICAgICAgICB2YXIgY3VycmVudENoZWNraW5nUG9zID0gYy5wb3MuYygpO1xyXG4gICAgICAgIHdoaWxlICh0cnVlKSB7XHJcbiAgICAgICAgICAgIGN1cnJlbnRDaGVja2luZ1Bvcy5hZGQoZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgaWYgKGFhYmIuY29sbGlkZShjdXJyZW50Q2hlY2tpbmdQb3MpKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcGllY2UgPSBjLmNoZXNzQm9hcmQuZ3JpZFtjdXJyZW50Q2hlY2tpbmdQb3MueF1bY3VycmVudENoZWNraW5nUG9zLnldO1xyXG4gICAgICAgICAgICAgICAgaWYgKHBpZWNlID09IG51bGwpXHJcbiAgICAgICAgICAgICAgICAgICAgb3BlbnNbY3VycmVudENoZWNraW5nUG9zLnhdW2N1cnJlbnRDaGVja2luZ1Bvcy55XSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocGllY2UudGVhbSAhPSBjLnRlYW0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5zW2N1cnJlbnRDaGVja2luZ1Bvcy54XVtjdXJyZW50Q2hlY2tpbmdQb3MueV0gPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrOyAvL2JyZWFrIGluIGJvdGggY2FzZXMgKGlmL2Vsc2Ugc3RhdGVtZW50IGJvdGggYnJlYWspXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG9wZW5zO1xyXG59XHJcbmZ1bmN0aW9uIG1vdmVzU3RhbXAobW92ZXMsIGMpIHtcclxuICAgIHZhciBhYWJiID0gbmV3IEFBQkIobmV3IFZlY3RvcigpLCBjLmNoZXNzQm9hcmQuc2l6ZS5jKCkuc3ViKG5ldyBWZWN0b3IoMSwgMSkpKTtcclxuICAgIHZhciBvcGVucyA9IFV0aWxzLmNyZWF0ZTJkQXJyYXkoYy5jaGVzc0JvYXJkLnNpemUsIGZhbHNlKTtcclxuICAgIGZvciAodmFyIF9pID0gMCwgbW92ZXNfMiA9IG1vdmVzOyBfaSA8IG1vdmVzXzIubGVuZ3RoOyBfaSsrKSB7XHJcbiAgICAgICAgdmFyIG1vdmUgPSBtb3Zlc18yW19pXTtcclxuICAgICAgICB2YXIgY3VycmVudENoZWNraW5nUG9zID0gYy5wb3MuYygpO1xyXG4gICAgICAgIGN1cnJlbnRDaGVja2luZ1Bvcy5hZGQobW92ZSk7XHJcbiAgICAgICAgaWYgKGFhYmIuY29sbGlkZShjdXJyZW50Q2hlY2tpbmdQb3MpKSB7XHJcbiAgICAgICAgICAgIHZhciBwaWVjZSA9IGMuY2hlc3NCb2FyZC5ncmlkW2N1cnJlbnRDaGVja2luZ1Bvcy54XVtjdXJyZW50Q2hlY2tpbmdQb3MueV07XHJcbiAgICAgICAgICAgIGlmIChwaWVjZSA9PSBudWxsIHx8IHBpZWNlLnRlYW0gIT0gYy50ZWFtKVxyXG4gICAgICAgICAgICAgICAgb3BlbnNbY3VycmVudENoZWNraW5nUG9zLnhdW2N1cnJlbnRDaGVja2luZ1Bvcy55XSA9IHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG9wZW5zO1xyXG59XHJcbmZ1bmN0aW9uIGdldFBpZWNlSW5EaXJlY3Rpb24oZnJvbSwgZGlyZWN0aW9uLCB0eXBlLCBjaGVzc0JvYXJkKSB7XHJcbiAgICB2YXIgYWFiYiA9IG5ldyBBQUJCKG5ldyBWZWN0b3IoKSwgY2hlc3NCb2FyZC5zaXplLmMoKS5zdWIobmV3IFZlY3RvcigxLCAxKSkpO1xyXG4gICAgdmFyIGN1cnJlbnRDaGVja2luZ1BvcyA9IGZyb20uYygpO1xyXG4gICAgd2hpbGUgKHRydWUpIHtcclxuICAgICAgICBjdXJyZW50Q2hlY2tpbmdQb3MuYWRkKGRpcmVjdGlvbik7XHJcbiAgICAgICAgaWYgKGFhYmIuY29sbGlkZShjdXJyZW50Q2hlY2tpbmdQb3MpKSB7XHJcbiAgICAgICAgICAgIHZhciBwaWVjZSA9IGNoZXNzQm9hcmQuZ3JpZFtjdXJyZW50Q2hlY2tpbmdQb3MueF1bY3VycmVudENoZWNraW5nUG9zLnldO1xyXG4gICAgICAgICAgICBpZiAocGllY2UgJiYgcGllY2UudHlwZSA9PSB0eXBlKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHBpZWNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG59XHJcbnZhciBpbWFnZU1hcEIgPSB7fTtcclxudmFyIGltYWdlTWFwVyA9IHt9O1xyXG5pZiAodHlwZW9mIGRvY3VtZW50ICE9ICd1bmRlZmluZWQnKSB7XHJcbiAgICB2YXIgdHlwZXMgPSBbJ3Bhd24nLCAncm9vaycsICdiaXNob3AnLCAncXVlZW4nLCAna2luZycsICdrbmlnaHQnXTtcclxuICAgIGZvciAodmFyIF9pID0gMCwgdHlwZXNfMSA9IHR5cGVzOyBfaSA8IHR5cGVzXzEubGVuZ3RoOyBfaSsrKSB7XHJcbiAgICAgICAgdmFyIHR5cGUgPSB0eXBlc18xW19pXTtcclxuICAgICAgICB2YXIgaW1hZ2VCID0gbmV3IEltYWdlKCk7XHJcbiAgICAgICAgdmFyIGltYWdlVyA9IG5ldyBJbWFnZSgpO1xyXG4gICAgICAgIGltYWdlQi5zcmMgPSAncmVzb3VyY2VzL2InICsgdHlwZSArICcucG5nJztcclxuICAgICAgICBpbWFnZVcuc3JjID0gJ3Jlc291cmNlcy93JyArIHR5cGUgKyAnLnBuZyc7XHJcbiAgICAgICAgaW1hZ2VCLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgRXZlbnRIYW5kbGVyLnRyaWdnZXIoJ2ltYWdlTG9hZGVkJywge30pO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgaW1hZ2VXLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgRXZlbnRIYW5kbGVyLnRyaWdnZXIoJ2ltYWdlTG9hZGVkJywge30pO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgaW1hZ2VNYXBCW3R5cGVdID0gaW1hZ2VCO1xyXG4gICAgICAgIGltYWdlTWFwV1t0eXBlXSA9IGltYWdlVztcclxuICAgIH1cclxufVxyXG52YXIgbGV0dGVyTWFwID0gW107XHJcbmxldHRlck1hcFtUeXBlLmJpc2hvcF0gPSAnQic7XHJcbmxldHRlck1hcFtUeXBlLmtpbmddID0gJ0snO1xyXG5sZXR0ZXJNYXBbVHlwZS5rbmlnaHRdID0gJ0gnO1xyXG5sZXR0ZXJNYXBbVHlwZS5wYXduXSA9ICdQJztcclxubGV0dGVyTWFwW1R5cGUucXVlZW5dID0gJ1EnO1xyXG5sZXR0ZXJNYXBbVHlwZS5yb29rXSA9ICdSJztcclxubW9kdWxlLmV4cG9ydHMgPSBDaGVzc1BpZWNlO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1DaGVzc1BpZWNlLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgV2ViSU9DID0gKGZ1bmN0aW9uICgpIHtcclxuICAgIGZ1bmN0aW9uIFdlYklPQyhzb2NrZXQpIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIHRoaXMuc29ja2V0ID0gc29ja2V0O1xyXG4gICAgICAgIHRoaXMucm91dGVNYXAgPSB7fTtcclxuICAgICAgICB0aGlzLnNvY2tldC5vbm1lc3NhZ2UgPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICAgICAgdmFyIGRhdGEgPSBldmVudC5kYXRhO1xyXG4gICAgICAgICAgICB2YXIgcGFyc2VkRGF0YSA9IEpTT04ucGFyc2UoZGF0YSk7XHJcbiAgICAgICAgICAgIGlmIChfdGhpcy5yb3V0ZU1hcFtwYXJzZWREYXRhLnJvdXRlXSkge1xyXG4gICAgICAgICAgICAgICAgX3RoaXMucm91dGVNYXBbcGFyc2VkRGF0YS5yb3V0ZV0ocGFyc2VkRGF0YSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnNDA0OiAnICsgcGFyc2VkRGF0YS5yb3V0ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfVxyXG4gICAgV2ViSU9DLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uIChyb3V0ZSwgYWN0aW9uKSB7XHJcbiAgICAgICAgdGhpcy5yb3V0ZU1hcFtyb3V0ZV0gPSBhY3Rpb247XHJcbiAgICB9O1xyXG4gICAgV2ViSU9DLnByb3RvdHlwZS5zZW5kID0gZnVuY3Rpb24gKHJvdXRlLCB2YWx1ZSkge1xyXG4gICAgICAgIHZhbHVlLnJvdXRlID0gcm91dGU7XHJcbiAgICAgICAgaWYgKHRoaXMuc29ja2V0LnJlYWR5U3RhdGUgPT0gMSkge1xyXG4gICAgICAgICAgICB0aGlzLnNvY2tldC5zZW5kKEpTT04uc3RyaW5naWZ5KHZhbHVlKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIFdlYklPQy5wcm90b3R5cGUub25jbG9zZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIH07XHJcbiAgICBXZWJJT0MucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuc29ja2V0LmNsb3NlKCk7XHJcbiAgICB9O1xyXG4gICAgcmV0dXJuIFdlYklPQztcclxufSgpKTtcclxubW9kdWxlLmV4cG9ydHMgPSBXZWJJT0M7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPVdlYklPQy5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIEV2ZW50SGFuZGxlciA9IChmdW5jdGlvbiAoKSB7XHJcbiAgICBmdW5jdGlvbiBFdmVudEhhbmRsZXIoKSB7XHJcbiAgICB9XHJcbiAgICAvLyBzdGF0aWMgZ2V0SW5zdGFuY2UoKTpFdmVudEhhbmRsZXJ7XHJcbiAgICAvLyAgICAgaWYoRXZlbnRIYW5kbGVyLmluc3RhbmNlID09IG51bGwpe1xyXG4gICAgLy8gICAgICAgICBFdmVudEhhbmRsZXIuaW5zdGFuY2UgPSBuZXcgRXZlbnRIYW5kbGVyKCk7XHJcbiAgICAvLyAgICAgfVxyXG4gICAgLy8gICAgIHJldHVybiBFdmVudEhhbmRsZXIuaW5zdGFuY2U7XHJcbiAgICAvLyB9XHJcbiAgICBFdmVudEhhbmRsZXIudHJpZ2dlciA9IGZ1bmN0aW9uIChldmVudCwgZGF0YSkge1xyXG4gICAgICAgIGlmIChFdmVudEhhbmRsZXIuZXZlbnRNYXAuZ2V0KGV2ZW50KSA9PSBudWxsKVxyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgZm9yICh2YXIgX2kgPSAwLCBfYSA9IEV2ZW50SGFuZGxlci5ldmVudE1hcC5nZXQoZXZlbnQpOyBfaSA8IF9hLmxlbmd0aDsgX2krKykge1xyXG4gICAgICAgICAgICB2YXIgY2FsbGJhY2sgPSBfYVtfaV07XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKGRhdGEpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbiAgICBFdmVudEhhbmRsZXIuc3Vic2NyaWJlID0gZnVuY3Rpb24gKGV2ZW50LCBjYWxsYmFjaykge1xyXG4gICAgICAgIGlmIChFdmVudEhhbmRsZXIuZXZlbnRNYXAuZ2V0KGV2ZW50KSA9PSBudWxsKVxyXG4gICAgICAgICAgICBFdmVudEhhbmRsZXIuZXZlbnRNYXAuc2V0KGV2ZW50LCBbXSk7XHJcbiAgICAgICAgRXZlbnRIYW5kbGVyLmV2ZW50TWFwLmdldChldmVudCkucHVzaChjYWxsYmFjayk7XHJcbiAgICB9O1xyXG4gICAgRXZlbnRIYW5kbGVyLmRldGFjaCA9IGZ1bmN0aW9uIChldmVudCwgY2FsbGJhY2spIHtcclxuICAgICAgICB2YXIgc3VibGlzdCA9IEV2ZW50SGFuZGxlci5ldmVudE1hcC5nZXQoZXZlbnQpO1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3VibGlzdC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICB2YXIgY2FsbGJhY2tJbk1hcCA9IHN1Ymxpc3RbaV07XHJcbiAgICAgICAgICAgIGlmIChjYWxsYmFja0luTWFwID09IGNhbGxiYWNrKSB7XHJcbiAgICAgICAgICAgICAgICBzdWJsaXN0LnNwbGljZShpLCAxKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH07XHJcbiAgICBFdmVudEhhbmRsZXIuZXZlbnRNYXAgPSBuZXcgTWFwKCk7XHJcbiAgICByZXR1cm4gRXZlbnRIYW5kbGVyO1xyXG59KCkpO1xyXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50SGFuZGxlcjtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZXZlbnRIYW5kbGVyLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbnZhcycpO1xyXG52YXIgY3R4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xyXG52YXIgbGFzdFVwZGF0ZSA9IERhdGUubm93KCk7XHJcbnZhciBkdDtcclxudmFyIHBpID0gTWF0aC5QSTtcclxudmFyIHJlc2V0QnRuID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3Jlc2V0QnRuJyk7XHJcbnZhciB0ZWFtTGFiZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjdGVhbUxhYmVsJyk7XHJcbnZhciB0dXJuTGFiZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjdHVybkxhYmVsJyk7XHJcbnZhciBWZWN0b3IgPSByZXF1aXJlKCcuL3ZlY3RvcicpO1xyXG52YXIgVXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XHJcbnZhciBFdmVudEhhbmRsZXIgPSByZXF1aXJlKCcuL2V2ZW50SGFuZGxlcicpO1xyXG52YXIgQ2hlc3NCb2FyZCA9IHJlcXVpcmUoJy4vQ2hlc3NCb2FyZCcpO1xyXG52YXIgQUFCQiA9IHJlcXVpcmUoJy4vQUFCQicpO1xyXG52YXIgV2ViSU9DID0gcmVxdWlyZSgnLi9XZWJJT0MnKTtcclxudmFyIHNvY2tldCA9IG5ldyBXZWJTb2NrZXQoXCJ3czovL2xvY2FsaG9zdDo4MDAwL1wiKTtcclxudmFyIHdlYklPQyA9IG5ldyBXZWJJT0Moc29ja2V0KTtcclxudmFyIFRlYW07XHJcbihmdW5jdGlvbiAoVGVhbSkge1xyXG4gICAgVGVhbVtUZWFtW1wiQmxhY2tcIl0gPSAwXSA9IFwiQmxhY2tcIjtcclxuICAgIFRlYW1bVGVhbVtcIldoaXRlXCJdID0gMV0gPSBcIldoaXRlXCI7XHJcbn0pKFRlYW0gfHwgKFRlYW0gPSB7fSkpO1xyXG52YXIgVHlwZTtcclxuKGZ1bmN0aW9uIChUeXBlKSB7XHJcbiAgICBUeXBlW1R5cGVbXCJwYXduXCJdID0gMF0gPSBcInBhd25cIjtcclxuICAgIFR5cGVbVHlwZVtcInJvb2tcIl0gPSAxXSA9IFwicm9va1wiO1xyXG4gICAgVHlwZVtUeXBlW1wia25pZ2h0XCJdID0gMl0gPSBcImtuaWdodFwiO1xyXG4gICAgVHlwZVtUeXBlW1wiYmlzaG9wXCJdID0gM10gPSBcImJpc2hvcFwiO1xyXG4gICAgVHlwZVtUeXBlW1wicXVlZW5cIl0gPSA0XSA9IFwicXVlZW5cIjtcclxuICAgIFR5cGVbVHlwZVtcImtpbmdcIl0gPSA1XSA9IFwia2luZ1wiO1xyXG59KShUeXBlIHx8IChUeXBlID0ge30pKTtcclxudmFyIHRlYW07XHJcbnZhciBjYW52YXNDb250YWluZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjY2FudmFzLWNvbnRhaW5lcicpO1xyXG5jYW52YXMud2lkdGggPSBjYW52YXNDb250YWluZXIub2Zmc2V0V2lkdGggLSAzO1xyXG5jYW52YXMuaGVpZ2h0ID0gY2FudmFzQ29udGFpbmVyLm9mZnNldEhlaWdodCAtIDEwMDtcclxudmFyIGltYWdlTG9hZENvdW50ZXIgPSAwO1xyXG5FdmVudEhhbmRsZXIuc3Vic2NyaWJlKCdpbWFnZUxvYWRlZCcsIGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICBpbWFnZUxvYWRDb3VudGVyKys7XHJcbiAgICBpZiAoaW1hZ2VMb2FkQ291bnRlciA+PSAxMikge1xyXG4gICAgICAgIGNoZXNzQm9hcmQuZHJhdyhjdHh0LCBvZmZzZXQpO1xyXG4gICAgfVxyXG59KTtcclxudmFyIGNoZXNzQm9hcmQgPSBuZXcgQ2hlc3NCb2FyZCgpO1xyXG5zZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgbm93ID0gRGF0ZS5ub3coKTtcclxuICAgIGR0ID0gKG5vdyAtIGxhc3RVcGRhdGUpIC8gMTAwMDtcclxuICAgIGxhc3RVcGRhdGUgPSBub3c7XHJcbiAgICBkdCA9IFV0aWxzLm1pbihkdCwgMSk7XHJcbiAgICB1cGRhdGUoKTtcclxuICAgIGRyYXcoKTtcclxufSwgMTAwMCAvIDYwKTtcclxudmFyIGhhbGZzaXplID0gY2hlc3NCb2FyZC5zaXplLnggKiBjaGVzc0JvYXJkLnNxdWFyZVNpemUueCAvIDI7XHJcbnZhciBvZmZzZXQgPSBuZXcgVmVjdG9yKE1hdGguZmxvb3IoY2FudmFzLndpZHRoIC8gMiAtIGhhbGZzaXplKSwgTWF0aC5mbG9vcihjYW52YXMuaGVpZ2h0IC8gMiAtIGhhbGZzaXplKSk7XHJcbmNoZXNzQm9hcmQuZHJhdyhjdHh0LCBvZmZzZXQpO1xyXG5yZXNldEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcclxuICAgIHdlYklPQy5zZW5kKCdyZXNldCcsIHt9KTtcclxufSk7XHJcbndlYklPQy5vbigndXBkYXRlJywgZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgIGNoZXNzQm9hcmQgPSBDaGVzc0JvYXJkLmRlc2VyaWFsaXplKGRhdGEuY2hlc3NCb2FyZCk7XHJcbiAgICB0ZWFtID0gZGF0YS50ZWFtO1xyXG4gICAgdGVhbUxhYmVsLmlubmVySFRNTCA9IFRlYW1bdGVhbV07XHJcbiAgICB0dXJuTGFiZWwuaW5uZXJIVE1MID0gVGVhbVtjaGVzc0JvYXJkLnR1cm5dO1xyXG4gICAgY2hlc3NCb2FyZC5kcmF3KGN0eHQsIG9mZnNldCk7XHJcbn0pO1xyXG5kb2N1bWVudC5vbm1vdXNlZG93biA9IGZ1bmN0aW9uIChldnQpIHtcclxuICAgIHZhciBhYWJiID0gbmV3IEFBQkIobmV3IFZlY3RvcigpLCBjaGVzc0JvYXJkLnNpemUuYygpLnN1YihuZXcgVmVjdG9yKDEsIDEpKSk7XHJcbiAgICB2YXIgdiA9IGNoZXNzQm9hcmQudmVjdG9yVG9HcmlkUG9zKGdldE1vdXNlUG9zKGNhbnZhcywgZXZ0KS5zdWIob2Zmc2V0KSk7XHJcbiAgICBpZiAoIWFhYmIuY29sbGlkZSh2KSkge1xyXG4gICAgICAgIGNoZXNzQm9hcmQuc2VsZWN0ZWQgPSBudWxsO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgdmFyIHBpZWNlID0gY2hlc3NCb2FyZC5ncmlkW3YueF1bdi55XTtcclxuICAgICAgICBpZiAoY2hlc3NCb2FyZC5zZWxlY3RlZCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIGlmIChwaWVjZSAmJiBwaWVjZS50ZWFtID09IGNoZXNzQm9hcmQudHVybiAmJiBwaWVjZS50ZWFtID09IHRlYW0pIHtcclxuICAgICAgICAgICAgICAgIGNoZXNzQm9hcmQuc2VsZWN0ZWQgPSBwaWVjZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgaWYgKHBpZWNlICYmIHBpZWNlLnRlYW0gPT0gY2hlc3NCb2FyZC50dXJuKVxyXG4gICAgICAgICAgICAgICAgY2hlc3NCb2FyZC5zZWxlY3RlZCA9IHBpZWNlO1xyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlmIChjaGVzc0JvYXJkLnNlbGVjdGVkLmlzTGVnYWxNb3ZlKHYpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgd2ViSU9DLnNlbmQoJ21vdmUnLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZyb206IGNoZXNzQm9hcmQuc2VsZWN0ZWQucG9zLnNlcmlhbGl6ZSgpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0bzogdi5zZXJpYWxpemUoKVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY2hlc3NCb2FyZC5zZWxlY3RlZCA9IG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBjaGVzc0JvYXJkLmRyYXcoY3R4dCwgb2Zmc2V0KTtcclxufTtcclxuZnVuY3Rpb24gdXBkYXRlKCkge1xyXG59XHJcbmZ1bmN0aW9uIGRyYXcoKSB7XHJcbiAgICAvL2N0eHQuY2xlYXJSZWN0KDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCk7XHJcbn1cclxuZnVuY3Rpb24gZ2V0TW91c2VQb3MoY2FudmFzLCBldnQpIHtcclxuICAgIHZhciByZWN0ID0gY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gICAgcmV0dXJuIG5ldyBWZWN0b3IoZXZ0LmNsaWVudFggLSByZWN0LmxlZnQsIGV2dC5jbGllbnRZIC0gcmVjdC50b3ApO1xyXG59XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPW1haW4uanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciB1dGlscztcclxuKGZ1bmN0aW9uICh1dGlscykge1xyXG4gICAgZnVuY3Rpb24gbWFwKHZhbDEsIHN0YXJ0MSwgc3RvcDEsIHN0YXJ0Miwgc3RvcDIpIHtcclxuICAgICAgICByZXR1cm4gc3RhcnQyICsgKHN0b3AyIC0gc3RhcnQyKSAqICgodmFsMSAtIHN0YXJ0MSkgLyAoc3RvcDEgLSBzdGFydDEpKTtcclxuICAgIH1cclxuICAgIHV0aWxzLm1hcCA9IG1hcDtcclxuICAgIGZ1bmN0aW9uIGluUmFuZ2UobWluLCBtYXgsIHZhbHVlKSB7XHJcbiAgICAgICAgaWYgKG1pbiA+IG1heCkge1xyXG4gICAgICAgICAgICB2YXIgdGVtcCA9IG1pbjtcclxuICAgICAgICAgICAgbWluID0gbWF4O1xyXG4gICAgICAgICAgICBtYXggPSB0ZW1wO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdmFsdWUgPD0gbWF4ICYmIHZhbHVlID49IG1pbjtcclxuICAgIH1cclxuICAgIHV0aWxzLmluUmFuZ2UgPSBpblJhbmdlO1xyXG4gICAgZnVuY3Rpb24gbWluKGEsIGIpIHtcclxuICAgICAgICBpZiAoYSA8IGIpXHJcbiAgICAgICAgICAgIHJldHVybiBhO1xyXG4gICAgICAgIHJldHVybiBiO1xyXG4gICAgfVxyXG4gICAgdXRpbHMubWluID0gbWluO1xyXG4gICAgZnVuY3Rpb24gbWF4KGEsIGIpIHtcclxuICAgICAgICBpZiAoYSA+IGIpXHJcbiAgICAgICAgICAgIHJldHVybiBhO1xyXG4gICAgICAgIHJldHVybiBiO1xyXG4gICAgfVxyXG4gICAgdXRpbHMubWF4ID0gbWF4O1xyXG4gICAgZnVuY3Rpb24gY2xhbXAodmFsLCBtaW4sIG1heCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLm1heCh0aGlzLm1pbih2YWwsIG1heCksIG1pbik7XHJcbiAgICB9XHJcbiAgICB1dGlscy5jbGFtcCA9IGNsYW1wO1xyXG4gICAgZnVuY3Rpb24gcmFuZ2VDb250YWluKGExLCBhMiwgYjEsIGIyKSB7XHJcbiAgICAgICAgcmV0dXJuIG1heChhMSwgYTIpID49IG1heChiMSwgYjIpICYmIG1pbihhMSwgYTIpIDw9IG1heChiMSwgYjIpO1xyXG4gICAgfVxyXG4gICAgdXRpbHMucmFuZ2VDb250YWluID0gcmFuZ2VDb250YWluO1xyXG4gICAgZnVuY3Rpb24gY3JlYXRlMmRBcnJheSh2LCBmaWxsKSB7XHJcbiAgICAgICAgdmFyIHJvd3MgPSBuZXcgQXJyYXkodi54KTtcclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHYueDsgaSsrKSB7XHJcbiAgICAgICAgICAgIHJvd3NbaV0gPSBuZXcgQXJyYXkodi55KTtcclxuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCB2Lnk7IGorKykge1xyXG4gICAgICAgICAgICAgICAgcm93c1tpXVtqXSA9IGZpbGw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHJvd3M7XHJcbiAgICB9XHJcbiAgICB1dGlscy5jcmVhdGUyZEFycmF5ID0gY3JlYXRlMmRBcnJheTtcclxufSkodXRpbHMgfHwgKHV0aWxzID0ge30pKTtcclxubW9kdWxlLmV4cG9ydHMgPSB1dGlscztcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9dXRpbHMuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBWZWN0b3IgPSAoZnVuY3Rpb24gKCkge1xyXG4gICAgZnVuY3Rpb24gVmVjdG9yKHgsIHkpIHtcclxuICAgICAgICBpZiAoeCA9PT0gdm9pZCAwKSB7IHggPSAwOyB9XHJcbiAgICAgICAgaWYgKHkgPT09IHZvaWQgMCkgeyB5ID0gMDsgfVxyXG4gICAgICAgIHRoaXMueCA9IHg7XHJcbiAgICAgICAgdGhpcy55ID0geTtcclxuICAgIH1cclxuICAgIFZlY3Rvci5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gKHZlY3Rvcikge1xyXG4gICAgICAgIHRoaXMueCArPSB2ZWN0b3IueDtcclxuICAgICAgICB0aGlzLnkgKz0gdmVjdG9yLnk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9O1xyXG4gICAgVmVjdG9yLnByb3RvdHlwZS5zdWIgPSBmdW5jdGlvbiAodmVjdG9yKSB7XHJcbiAgICAgICAgdGhpcy54IC09IHZlY3Rvci54O1xyXG4gICAgICAgIHRoaXMueSAtPSB2ZWN0b3IueTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH07XHJcbiAgICBWZWN0b3IucHJvdG90eXBlLmxlbmd0aCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gTWF0aC5wb3codGhpcy54ICogdGhpcy54ICsgdGhpcy55ICogdGhpcy55LCAwLjUpO1xyXG4gICAgfTtcclxuICAgIFZlY3Rvci5wcm90b3R5cGUubm9ybWFsaXplID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBsZW5ndGggPSB0aGlzLmxlbmd0aCgpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLnNjYWxlKDEgLyBsZW5ndGgpO1xyXG4gICAgfTtcclxuICAgIFZlY3Rvci5wcm90b3R5cGUuc2NhbGUgPSBmdW5jdGlvbiAoc2NhbGFyKSB7XHJcbiAgICAgICAgdGhpcy54ICo9IHNjYWxhcjtcclxuICAgICAgICB0aGlzLnkgKj0gc2NhbGFyO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfTtcclxuICAgIFZlY3Rvci5wcm90b3R5cGUucm90YXRlID0gZnVuY3Rpb24gKHIsIG9yaWdpbikge1xyXG4gICAgICAgIGlmIChvcmlnaW4gPT09IHZvaWQgMCkgeyBvcmlnaW4gPSBuZXcgVmVjdG9yKCk7IH1cclxuICAgICAgICB2YXIgb2Zmc2V0ID0gdGhpcy5jKCkuc3ViKG9yaWdpbik7XHJcbiAgICAgICAgdmFyIHggPSBvZmZzZXQueCAqIE1hdGguY29zKHIpIC0gb2Zmc2V0LnkgKiBNYXRoLnNpbihyKTtcclxuICAgICAgICB2YXIgeSA9IG9mZnNldC54ICogTWF0aC5zaW4ocikgKyBvZmZzZXQueSAqIE1hdGguY29zKHIpO1xyXG4gICAgICAgIG9mZnNldC54ID0geDtcclxuICAgICAgICBvZmZzZXQueSA9IHk7XHJcbiAgICAgICAgdmFyIGJhY2sgPSBvZmZzZXQuYWRkKG9yaWdpbik7XHJcbiAgICAgICAgdGhpcy54ID0gYmFjay54O1xyXG4gICAgICAgIHRoaXMueSA9IGJhY2sueTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH07XHJcbiAgICBWZWN0b3IucHJvdG90eXBlLmxlcnAgPSBmdW5jdGlvbiAodmVjdG9yLCB3ZWlndGgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5zY2FsZSgxIC0gd2VpZ3RoKS5hZGQodmVjdG9yLmMoKS5zY2FsZSh3ZWlndGgpKTtcclxuICAgIH07XHJcbiAgICBWZWN0b3IucHJvdG90eXBlLmMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWN0b3IodGhpcy54LCB0aGlzLnkpO1xyXG4gICAgfTtcclxuICAgIFZlY3Rvci5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24gKHYpIHtcclxuICAgICAgICBpZiAodiA9PSBudWxsKVxyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMueCA9PSB2LnggJiYgdGhpcy55ID09IHYueTtcclxuICAgIH07XHJcbiAgICBWZWN0b3IucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uICh2ZWN0b3IpIHtcclxuICAgICAgICB0aGlzLnggPSB2ZWN0b3IueDtcclxuICAgICAgICB0aGlzLnkgPSB2ZWN0b3IueTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH07XHJcbiAgICBWZWN0b3IucHJvdG90eXBlLnBlcnBEb3QgPSBmdW5jdGlvbiAodmVjdG9yKSB7XHJcbiAgICAgICAgcmV0dXJuIE1hdGguYXRhbjIodGhpcy54ICogdmVjdG9yLnkgLSB0aGlzLnkgKiB2ZWN0b3IueCwgdGhpcy54ICogdmVjdG9yLnggKyB0aGlzLnkgKiB2ZWN0b3IueSk7XHJcbiAgICB9O1xyXG4gICAgVmVjdG9yLnByb3RvdHlwZS5kcmF3ID0gZnVuY3Rpb24gKGN0eHQpIHtcclxuICAgICAgICB2YXIgd2lkdGggPSAxMDtcclxuICAgICAgICB2YXIgaGFsZiA9IHdpZHRoIC8gMjtcclxuICAgICAgICBjdHh0LmZpbGxSZWN0KHRoaXMueCAtIGhhbGYsIHRoaXMueSAtIGhhbGYsIHdpZHRoLCB3aWR0aCk7XHJcbiAgICB9O1xyXG4gICAgVmVjdG9yLnByb3RvdHlwZS5sb29wID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XHJcbiAgICAgICAgZm9yICh2YXIgeCA9IDA7IHggPCB0aGlzLng7IHgrKykge1xyXG4gICAgICAgICAgICBmb3IgKHZhciB5ID0gMDsgeSA8IHRoaXMueTsgeSsrKSB7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhuZXcgVmVjdG9yKHgsIHkpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH07XHJcbiAgICBWZWN0b3IucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4geyB4OiB0aGlzLngsIHk6IHRoaXMueSB9O1xyXG4gICAgfTtcclxuICAgIFZlY3Rvci5kZXNlcmlhbGl6ZSA9IGZ1bmN0aW9uIChvYmplY3QpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlY3RvcihvYmplY3QueCwgb2JqZWN0LnkpO1xyXG4gICAgfTtcclxuICAgIHJldHVybiBWZWN0b3I7XHJcbn0oKSk7XHJcbm1vZHVsZS5leHBvcnRzID0gVmVjdG9yO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD12ZWN0b3IuanMubWFwIl19
