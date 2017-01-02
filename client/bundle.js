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
var Vector = require('./Vector');
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

},{"./ChessPiece":3,"./Vector":8,"./utils":7}],3:[function(require,module,exports){
"use strict";
var Vector = require('./Vector');
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
    Type[Type["bisshop"] = 3] = "bisshop";
    Type[Type["queen"] = 4] = "queen";
    Type[Type["king"] = 5] = "king";
})(Type || (Type = {}));
var ChessPiece = (function () {
    function ChessPiece(type, team, pos, chessBoard) {
        this.moved = false;
        this.pos = pos;
        this.chessBoard = chessBoard;
        this.posChecker = checkMap.get(type);
        this.type = type;
        this.team = team;
    }
    ChessPiece.prototype.draw = function (ctxt, squareSize, offset) {
        ctxt.textAlign = 'center';
        ctxt.textBaseline = 'middle';
        ctxt.strokeStyle = '#000';
        ctxt.fillStyle = '#fff';
        if (this.team == Team.Black) {
            ctxt.strokeStyle = '#fff';
            ctxt.fillStyle = '#000';
        }
        var size = 30;
        var halfsize = size / 2;
        ctxt.strokeRect(offset.x + 0.5 + this.pos.x * squareSize.x + squareSize.x / 2 - halfsize, offset.y + 0.5 + this.pos.y * squareSize.y + squareSize.y / 2 - halfsize, size, size);
        ctxt.fillRect(offset.x + 1 + this.pos.x * squareSize.x + squareSize.x / 2 - halfsize, offset.y + 1 + this.pos.y * squareSize.y + squareSize.y / 2 - halfsize, size - 1, size - 1);
        if (this.team == Team.Black)
            ctxt.fillStyle = '#fff';
        else
            ctxt.fillStyle = '#000';
        ctxt.fillText(letterMap[this.type], offset.x + this.pos.x * squareSize.x + squareSize.x / 2, offset.y + this.pos.y * squareSize.y + squareSize.y / 2);
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
    if (aabb.collide(wsfront) && board.grid[wsfront.x][wsfront.y] == null)
        moves.push(facing);
    var farFront = facing.c().scale(2);
    var wsFarFront = c.pos.c().add(farFront);
    if (!c.moved && aabb.collide(wsFarFront) && board.grid[wsFarFront.x][wsFarFront.y] == null)
        moves.push(farFront);
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
checkMap.set(Type.bisshop, function (c, grid) {
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
var letterMap = [];
letterMap[Type.bisshop] = 'B';
letterMap[Type.king] = 'K';
letterMap[Type.knight] = 'H';
letterMap[Type.pawn] = 'P';
letterMap[Type.queen] = 'Q';
letterMap[Type.rook] = 'R';
module.exports = ChessPiece;

},{"./AABB":1,"./Vector":8,"./eventHandler":5,"./utils":7}],4:[function(require,module,exports){
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
var Vector = require('./Vector');
var Utils = require('./utils');
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
    Type[Type["bisshop"] = 3] = "bisshop";
    Type[Type["queen"] = 4] = "queen";
    Type[Type["king"] = 5] = "king";
})(Type || (Type = {}));
var team;
var canvasContainer = document.querySelector('#canvas-container');
canvas.width = canvasContainer.offsetWidth - 3;
canvas.height = canvasContainer.offsetHeight - 100;
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

},{"./AABB":1,"./ChessBoard":2,"./Vector":8,"./WebIOC":4,"./utils":7}],7:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL1Byb2dyYW0gRmlsZXMvbm9kZWpzNjMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIm91dC9BQUJCLmpzIiwib3V0L0NoZXNzQm9hcmQuanMiLCJvdXQvQ2hlc3NQaWVjZS5qcyIsIm91dC9XZWJJT0MuanMiLCJvdXQvZXZlbnRIYW5kbGVyLmpzIiwib3V0L21haW4uanMiLCJvdXQvdXRpbHMuanMiLCJvdXQvdmVjdG9yLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9OQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgVXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XHJcbnZhciBBQUJCID0gKGZ1bmN0aW9uICgpIHtcclxuICAgIGZ1bmN0aW9uIEFBQkIocG9zLCBzaXplKSB7XHJcbiAgICAgICAgdGhpcy5wb3MgPSBwb3M7XHJcbiAgICAgICAgdGhpcy5zaXplID0gc2l6ZTtcclxuICAgIH1cclxuICAgIEFBQkIuZnJvbVZlY3RvcnMgPSBmdW5jdGlvbiAoYSkge1xyXG4gICAgICAgIHZhciBzbWFsbCA9IGFbMF07XHJcbiAgICAgICAgdmFyIGJpZyA9IGFbYS5sZW5ndGggLSAxXTtcclxuICAgICAgICBmb3IgKHZhciBfaSA9IDAsIGFfMSA9IGE7IF9pIDwgYV8xLmxlbmd0aDsgX2krKykge1xyXG4gICAgICAgICAgICB2YXIgdiA9IGFfMVtfaV07XHJcbiAgICAgICAgICAgIGlmICh2LnggPCBzbWFsbC54KVxyXG4gICAgICAgICAgICAgICAgc21hbGwueCA9IHYueDtcclxuICAgICAgICAgICAgZWxzZSBpZiAodi54ID4gYmlnLngpXHJcbiAgICAgICAgICAgICAgICBiaWcueCA9IHYueDtcclxuICAgICAgICAgICAgaWYgKHYueSA8IHNtYWxsLnkpXHJcbiAgICAgICAgICAgICAgICBzbWFsbC55ID0gdi55O1xyXG4gICAgICAgICAgICBlbHNlIGlmICh2LnkgPiBiaWcueSlcclxuICAgICAgICAgICAgICAgIGJpZy55ID0gdi55O1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbmV3IEFBQkIoc21hbGwsIGJpZy5zdWIoc21hbGwpKTtcclxuICAgIH07XHJcbiAgICBBQUJCLnByb3RvdHlwZS5jb250YWlucyA9IGZ1bmN0aW9uIChhYWJiKSB7XHJcbiAgICAgICAgcmV0dXJuIFV0aWxzLnJhbmdlQ29udGFpbih0aGlzLnBvcy54LCB0aGlzLnNpemUueCArIHRoaXMucG9zLngsIGFhYmIucG9zLngsIGFhYmIuc2l6ZS54ICsgYWFiYi5wb3MueClcclxuICAgICAgICAgICAgJiYgVXRpbHMucmFuZ2VDb250YWluKHRoaXMucG9zLnksIHRoaXMuc2l6ZS55ICsgdGhpcy5wb3MueSwgYWFiYi5wb3MueSwgYWFiYi5zaXplLnkgKyBhYWJiLnBvcy55KTtcclxuICAgIH07XHJcbiAgICBBQUJCLnByb3RvdHlwZS5jb2xsaWRlID0gZnVuY3Rpb24gKHYpIHtcclxuICAgICAgICByZXR1cm4gVXRpbHMuaW5SYW5nZSh0aGlzLnBvcy54LCB0aGlzLnNpemUueCArIHRoaXMucG9zLngsIHYueCkgJiYgVXRpbHMuaW5SYW5nZSh0aGlzLnBvcy55LCB0aGlzLnNpemUueSArIHRoaXMucG9zLnksIHYueSk7XHJcbiAgICB9O1xyXG4gICAgcmV0dXJuIEFBQkI7XHJcbn0oKSk7XHJcbm1vZHVsZS5leHBvcnRzID0gQUFCQjtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9QUFCQi5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIFZlY3RvciA9IHJlcXVpcmUoJy4vVmVjdG9yJyk7XHJcbnZhciBVdGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcclxudmFyIENoZXNzUGllY2UgPSByZXF1aXJlKCcuL0NoZXNzUGllY2UnKTtcclxudmFyIFRlYW07XHJcbihmdW5jdGlvbiAoVGVhbSkge1xyXG4gICAgVGVhbVtUZWFtW1wiQmxhY2tcIl0gPSAwXSA9IFwiQmxhY2tcIjtcclxuICAgIFRlYW1bVGVhbVtcIldoaXRlXCJdID0gMV0gPSBcIldoaXRlXCI7XHJcbn0pKFRlYW0gfHwgKFRlYW0gPSB7fSkpO1xyXG52YXIgQ2hlc3NCb2FyZCA9IChmdW5jdGlvbiAoKSB7XHJcbiAgICBmdW5jdGlvbiBDaGVzc0JvYXJkKCkge1xyXG4gICAgICAgIHRoaXMuc2l6ZSA9IG5ldyBWZWN0b3IoOCwgOCk7XHJcbiAgICAgICAgdGhpcy5zcXVhcmVTaXplID0gbmV3IFZlY3Rvcig1MCwgNTApO1xyXG4gICAgICAgIHRoaXMudHVybiA9IFRlYW0uV2hpdGU7XHJcbiAgICAgICAgdGhpcy5ncmlkID0gVXRpbHMuY3JlYXRlMmRBcnJheSh0aGlzLnNpemUsIG51bGwpO1xyXG4gICAgfVxyXG4gICAgQ2hlc3NCb2FyZC5wcm90b3R5cGUudHJ5RnJvbVRvID0gZnVuY3Rpb24gKGZyb20sIHRvKSB7XHJcbiAgICAgICAgdmFyIGZyb21QaWVjZSA9IHRoaXMuZ3JpZFtmcm9tLnhdW2Zyb20ueV07IC8vY291bGQgb3V0b2ZyYW5nZSBmcm9tIGJhZGNsaWVudFxyXG4gICAgICAgIHJldHVybiBmcm9tUGllY2UudHJ5TW92ZSh0byk7XHJcbiAgICB9O1xyXG4gICAgQ2hlc3NCb2FyZC5wcm90b3R5cGUuZHJhdyA9IGZ1bmN0aW9uIChjdHh0LCBvZmZzZXQpIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIHZhciBsZWdhbHNTcG90cztcclxuICAgICAgICBpZiAodGhpcy5zZWxlY3RlZClcclxuICAgICAgICAgICAgbGVnYWxzU3BvdHMgPSB0aGlzLnNlbGVjdGVkLnBvc0NoZWNrZXIodGhpcy5zZWxlY3RlZCwgdGhpcyk7XHJcbiAgICAgICAgdGhpcy5zaXplLmxvb3AoZnVuY3Rpb24gKHYpIHtcclxuICAgICAgICAgICAgaWYgKCh2LnggKyB2LnkpICUgMiA9PSAwKVxyXG4gICAgICAgICAgICAgICAgY3R4dC5maWxsU3R5bGUgPSBcIiNmZmZcIjtcclxuICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgY3R4dC5maWxsU3R5bGUgPSBcIiMwMDBcIjtcclxuICAgICAgICAgICAgaWYgKF90aGlzLnNlbGVjdGVkICYmIHYuZXF1YWxzKF90aGlzLnNlbGVjdGVkLnBvcykpXHJcbiAgICAgICAgICAgICAgICBjdHh0LmZpbGxTdHlsZSA9IFwiIzBmZlwiO1xyXG4gICAgICAgICAgICBpZiAoX3RoaXMuc2VsZWN0ZWQgJiYgbGVnYWxzU3BvdHNbdi54XVt2LnldKVxyXG4gICAgICAgICAgICAgICAgY3R4dC5maWxsU3R5bGUgPSBcIiNmMDBcIjtcclxuICAgICAgICAgICAgY3R4dC5maWxsUmVjdCh2LnggKiBfdGhpcy5zcXVhcmVTaXplLnggKyBvZmZzZXQueCwgdi55ICogX3RoaXMuc3F1YXJlU2l6ZS55ICsgb2Zmc2V0LnksIF90aGlzLnNxdWFyZVNpemUueCwgX3RoaXMuc3F1YXJlU2l6ZS55KTtcclxuICAgICAgICAgICAgaWYgKF90aGlzLmdyaWRbdi54XVt2LnldKSB7XHJcbiAgICAgICAgICAgICAgICBfdGhpcy5ncmlkW3YueF1bdi55XS5kcmF3KGN0eHQsIF90aGlzLnNxdWFyZVNpemUsIG9mZnNldCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH07XHJcbiAgICBDaGVzc0JvYXJkLnByb3RvdHlwZS52ZWN0b3JUb0dyaWRQb3MgPSBmdW5jdGlvbiAodikge1xyXG4gICAgICAgIHZhciBuID0gbmV3IFZlY3RvcigpO1xyXG4gICAgICAgIG4ueCA9IE1hdGguZmxvb3Iodi54IC8gdGhpcy5zcXVhcmVTaXplLngpO1xyXG4gICAgICAgIG4ueSA9IE1hdGguZmxvb3Iodi55IC8gdGhpcy5zcXVhcmVTaXplLnkpO1xyXG4gICAgICAgIHJldHVybiBuO1xyXG4gICAgfTtcclxuICAgIENoZXNzQm9hcmQucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIChjKSB7XHJcbiAgICAgICAgdGhpcy5ncmlkW2MucG9zLnhdW2MucG9zLnldID0gYztcclxuICAgIH07XHJcbiAgICBDaGVzc0JvYXJkLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICB2YXIgZ3JpZCA9IFV0aWxzLmNyZWF0ZTJkQXJyYXkodGhpcy5zaXplLCBudWxsKTtcclxuICAgICAgICB0aGlzLnNpemUubG9vcChmdW5jdGlvbiAodikge1xyXG4gICAgICAgICAgICBpZiAoX3RoaXMuZ3JpZFt2LnhdW3YueV0pXHJcbiAgICAgICAgICAgICAgICBncmlkW3YueF1bdi55XSA9IF90aGlzLmdyaWRbdi54XVt2LnldLnNlcmlhbGl6ZSgpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHZhciBzZWxlY3RlZDtcclxuICAgICAgICBpZiAodGhpcy5zZWxlY3RlZClcclxuICAgICAgICAgICAgc2VsZWN0ZWQgPSB0aGlzLnNlbGVjdGVkLnNlcmlhbGl6ZSgpO1xyXG4gICAgICAgIHZhciBzZXJpYWxpemVkID0ge1xyXG4gICAgICAgICAgICBzaXplOiB0aGlzLnNpemUuc2VyaWFsaXplKCksXHJcbiAgICAgICAgICAgIHNxdWFyZVNpemU6IHRoaXMuc3F1YXJlU2l6ZS5zZXJpYWxpemUoKSxcclxuICAgICAgICAgICAgZ3JpZDogZ3JpZCxcclxuICAgICAgICAgICAgdHVybjogdGhpcy50dXJuLFxyXG4gICAgICAgICAgICBzZWxlY3RlZDogc2VsZWN0ZWRcclxuICAgICAgICB9O1xyXG4gICAgICAgIHJldHVybiBzZXJpYWxpemVkO1xyXG4gICAgfTtcclxuICAgIENoZXNzQm9hcmQuZGVzZXJpYWxpemUgPSBmdW5jdGlvbiAob2JqZWN0KSB7XHJcbiAgICAgICAgdmFyIGNoZXNzQm9hcmQgPSBuZXcgQ2hlc3NCb2FyZCgpO1xyXG4gICAgICAgIHZhciBncmlkID0gVXRpbHMuY3JlYXRlMmRBcnJheShjaGVzc0JvYXJkLnNpemUsIG51bGwpO1xyXG4gICAgICAgIGNoZXNzQm9hcmQuc2l6ZS5sb29wKGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgICAgICAgIGlmIChvYmplY3QuZ3JpZFt2LnhdW3YueV0pXHJcbiAgICAgICAgICAgICAgICBncmlkW3YueF1bdi55XSA9IENoZXNzUGllY2UuZGVzZXJpYWxpemUob2JqZWN0LmdyaWRbdi54XVt2LnldLCBjaGVzc0JvYXJkKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBjaGVzc0JvYXJkLmdyaWQgPSBncmlkO1xyXG4gICAgICAgIGNoZXNzQm9hcmQudHVybiA9IG9iamVjdC50dXJuO1xyXG4gICAgICAgIGlmIChvYmplY3Quc2VsZWN0ZWQpXHJcbiAgICAgICAgICAgIGNoZXNzQm9hcmQuc2VsZWN0ZWQgPSBDaGVzc1BpZWNlLmRlc2VyaWFsaXplKG9iamVjdC5zZWxlY3RlZCwgY2hlc3NCb2FyZCk7XHJcbiAgICAgICAgcmV0dXJuIGNoZXNzQm9hcmQ7XHJcbiAgICB9O1xyXG4gICAgcmV0dXJuIENoZXNzQm9hcmQ7XHJcbn0oKSk7XHJcbm1vZHVsZS5leHBvcnRzID0gQ2hlc3NCb2FyZDtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Q2hlc3NCb2FyZC5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIFZlY3RvciA9IHJlcXVpcmUoJy4vVmVjdG9yJyk7XHJcbnZhciBVdGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcclxudmFyIEFBQkIgPSByZXF1aXJlKCcuL0FBQkInKTtcclxudmFyIEV2ZW50SGFuZGxlciA9IHJlcXVpcmUoJy4vZXZlbnRIYW5kbGVyJyk7XHJcbnZhciBUZWFtO1xyXG4oZnVuY3Rpb24gKFRlYW0pIHtcclxuICAgIFRlYW1bVGVhbVtcIkJsYWNrXCJdID0gMF0gPSBcIkJsYWNrXCI7XHJcbiAgICBUZWFtW1RlYW1bXCJXaGl0ZVwiXSA9IDFdID0gXCJXaGl0ZVwiO1xyXG59KShUZWFtIHx8IChUZWFtID0ge30pKTtcclxudmFyIFR5cGU7XHJcbihmdW5jdGlvbiAoVHlwZSkge1xyXG4gICAgVHlwZVtUeXBlW1wicGF3blwiXSA9IDBdID0gXCJwYXduXCI7XHJcbiAgICBUeXBlW1R5cGVbXCJyb29rXCJdID0gMV0gPSBcInJvb2tcIjtcclxuICAgIFR5cGVbVHlwZVtcImtuaWdodFwiXSA9IDJdID0gXCJrbmlnaHRcIjtcclxuICAgIFR5cGVbVHlwZVtcImJpc3Nob3BcIl0gPSAzXSA9IFwiYmlzc2hvcFwiO1xyXG4gICAgVHlwZVtUeXBlW1wicXVlZW5cIl0gPSA0XSA9IFwicXVlZW5cIjtcclxuICAgIFR5cGVbVHlwZVtcImtpbmdcIl0gPSA1XSA9IFwia2luZ1wiO1xyXG59KShUeXBlIHx8IChUeXBlID0ge30pKTtcclxudmFyIENoZXNzUGllY2UgPSAoZnVuY3Rpb24gKCkge1xyXG4gICAgZnVuY3Rpb24gQ2hlc3NQaWVjZSh0eXBlLCB0ZWFtLCBwb3MsIGNoZXNzQm9hcmQpIHtcclxuICAgICAgICB0aGlzLm1vdmVkID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5wb3MgPSBwb3M7XHJcbiAgICAgICAgdGhpcy5jaGVzc0JvYXJkID0gY2hlc3NCb2FyZDtcclxuICAgICAgICB0aGlzLnBvc0NoZWNrZXIgPSBjaGVja01hcC5nZXQodHlwZSk7XHJcbiAgICAgICAgdGhpcy50eXBlID0gdHlwZTtcclxuICAgICAgICB0aGlzLnRlYW0gPSB0ZWFtO1xyXG4gICAgfVxyXG4gICAgQ2hlc3NQaWVjZS5wcm90b3R5cGUuZHJhdyA9IGZ1bmN0aW9uIChjdHh0LCBzcXVhcmVTaXplLCBvZmZzZXQpIHtcclxuICAgICAgICBjdHh0LnRleHRBbGlnbiA9ICdjZW50ZXInO1xyXG4gICAgICAgIGN0eHQudGV4dEJhc2VsaW5lID0gJ21pZGRsZSc7XHJcbiAgICAgICAgY3R4dC5zdHJva2VTdHlsZSA9ICcjMDAwJztcclxuICAgICAgICBjdHh0LmZpbGxTdHlsZSA9ICcjZmZmJztcclxuICAgICAgICBpZiAodGhpcy50ZWFtID09IFRlYW0uQmxhY2spIHtcclxuICAgICAgICAgICAgY3R4dC5zdHJva2VTdHlsZSA9ICcjZmZmJztcclxuICAgICAgICAgICAgY3R4dC5maWxsU3R5bGUgPSAnIzAwMCc7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBzaXplID0gMzA7XHJcbiAgICAgICAgdmFyIGhhbGZzaXplID0gc2l6ZSAvIDI7XHJcbiAgICAgICAgY3R4dC5zdHJva2VSZWN0KG9mZnNldC54ICsgMC41ICsgdGhpcy5wb3MueCAqIHNxdWFyZVNpemUueCArIHNxdWFyZVNpemUueCAvIDIgLSBoYWxmc2l6ZSwgb2Zmc2V0LnkgKyAwLjUgKyB0aGlzLnBvcy55ICogc3F1YXJlU2l6ZS55ICsgc3F1YXJlU2l6ZS55IC8gMiAtIGhhbGZzaXplLCBzaXplLCBzaXplKTtcclxuICAgICAgICBjdHh0LmZpbGxSZWN0KG9mZnNldC54ICsgMSArIHRoaXMucG9zLnggKiBzcXVhcmVTaXplLnggKyBzcXVhcmVTaXplLnggLyAyIC0gaGFsZnNpemUsIG9mZnNldC55ICsgMSArIHRoaXMucG9zLnkgKiBzcXVhcmVTaXplLnkgKyBzcXVhcmVTaXplLnkgLyAyIC0gaGFsZnNpemUsIHNpemUgLSAxLCBzaXplIC0gMSk7XHJcbiAgICAgICAgaWYgKHRoaXMudGVhbSA9PSBUZWFtLkJsYWNrKVxyXG4gICAgICAgICAgICBjdHh0LmZpbGxTdHlsZSA9ICcjZmZmJztcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIGN0eHQuZmlsbFN0eWxlID0gJyMwMDAnO1xyXG4gICAgICAgIGN0eHQuZmlsbFRleHQobGV0dGVyTWFwW3RoaXMudHlwZV0sIG9mZnNldC54ICsgdGhpcy5wb3MueCAqIHNxdWFyZVNpemUueCArIHNxdWFyZVNpemUueCAvIDIsIG9mZnNldC55ICsgdGhpcy5wb3MueSAqIHNxdWFyZVNpemUueSArIHNxdWFyZVNpemUueSAvIDIpO1xyXG4gICAgfTtcclxuICAgIENoZXNzUGllY2UucHJvdG90eXBlLnRyeU1vdmUgPSBmdW5jdGlvbiAodikge1xyXG4gICAgICAgIGlmICh0aGlzLnBvc0NoZWNrZXIodGhpcywgdGhpcy5jaGVzc0JvYXJkKVt2LnhdW3YueV0pIHtcclxuICAgICAgICAgICAgdmFyIHBpZWNlID0gdGhpcy5jaGVzc0JvYXJkLmdyaWRbdi54XVt2LnldO1xyXG4gICAgICAgICAgICBpZiAocGllY2UgJiYgcGllY2UudHlwZSA9PSBUeXBlLmtpbmcpXHJcbiAgICAgICAgICAgICAgICBFdmVudEhhbmRsZXIudHJpZ2dlcignZ2FtZU92ZXInLCBwaWVjZSk7XHJcbiAgICAgICAgICAgIHRoaXMuY2hlc3NCb2FyZC5ncmlkW3YueF1bdi55XSA9IHRoaXM7XHJcbiAgICAgICAgICAgIHRoaXMuY2hlc3NCb2FyZC5ncmlkW3RoaXMucG9zLnhdW3RoaXMucG9zLnldID0gbnVsbDtcclxuICAgICAgICAgICAgdGhpcy5wb3MgPSB2O1xyXG4gICAgICAgICAgICB0aGlzLm1vdmVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY2hlc3NCb2FyZC50dXJuID09IFRlYW0uQmxhY2spXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNoZXNzQm9hcmQudHVybiA9IFRlYW0uV2hpdGU7XHJcbiAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgIHRoaXMuY2hlc3NCb2FyZC50dXJuID0gVGVhbS5CbGFjaztcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH07XHJcbiAgICBDaGVzc1BpZWNlLnByb3RvdHlwZS5pc0xlZ2FsTW92ZSA9IGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMucG9zQ2hlY2tlcih0aGlzLCB0aGlzLmNoZXNzQm9hcmQpW3YueF1bdi55XTtcclxuICAgIH07XHJcbiAgICBDaGVzc1BpZWNlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgdHlwZTogdGhpcy50eXBlLFxyXG4gICAgICAgICAgICBwb3M6IHRoaXMucG9zLnNlcmlhbGl6ZSgpLFxyXG4gICAgICAgICAgICB0ZWFtOiB0aGlzLnRlYW0sXHJcbiAgICAgICAgICAgIG1vdmVkOiB0aGlzLm1vdmVkXHJcbiAgICAgICAgfTtcclxuICAgIH07XHJcbiAgICBDaGVzc1BpZWNlLmRlc2VyaWFsaXplID0gZnVuY3Rpb24gKG9iamVjdCwgY2hlc3NCb2FyZCkge1xyXG4gICAgICAgIHZhciBjID0gbmV3IENoZXNzUGllY2Uob2JqZWN0LnR5cGUsIG9iamVjdC50ZWFtLCBWZWN0b3IuZGVzZXJpYWxpemUob2JqZWN0LnBvcyksIGNoZXNzQm9hcmQpO1xyXG4gICAgICAgIGMubW92ZWQgPSBvYmplY3QubW92ZWQ7XHJcbiAgICAgICAgcmV0dXJuIGM7XHJcbiAgICB9O1xyXG4gICAgcmV0dXJuIENoZXNzUGllY2U7XHJcbn0oKSk7XHJcbnZhciBjaGVja01hcCA9IG5ldyBNYXAoKTtcclxuY2hlY2tNYXAuc2V0KFR5cGUucGF3biwgZnVuY3Rpb24gKGMsIGJvYXJkKSB7XHJcbiAgICB2YXIgYWFiYiA9IG5ldyBBQUJCKG5ldyBWZWN0b3IoKSwgYm9hcmQuc2l6ZS5jKCkuc3ViKG5ldyBWZWN0b3IoMSwgMSkpKTtcclxuICAgIHZhciBtb3ZlcyA9IFtdO1xyXG4gICAgdmFyIGZhY2luZztcclxuICAgIGlmIChjLnRlYW0gPT0gVGVhbS5XaGl0ZSlcclxuICAgICAgICBmYWNpbmcgPSBuZXcgVmVjdG9yKDAsIC0xKTtcclxuICAgIGVsc2VcclxuICAgICAgICBmYWNpbmcgPSBuZXcgVmVjdG9yKDAsIDEpO1xyXG4gICAgdmFyIHdzZnJvbnQgPSBjLnBvcy5jKCkuYWRkKGZhY2luZyk7XHJcbiAgICBpZiAoYWFiYi5jb2xsaWRlKHdzZnJvbnQpICYmIGJvYXJkLmdyaWRbd3Nmcm9udC54XVt3c2Zyb250LnldID09IG51bGwpXHJcbiAgICAgICAgbW92ZXMucHVzaChmYWNpbmcpO1xyXG4gICAgdmFyIGZhckZyb250ID0gZmFjaW5nLmMoKS5zY2FsZSgyKTtcclxuICAgIHZhciB3c0ZhckZyb250ID0gYy5wb3MuYygpLmFkZChmYXJGcm9udCk7XHJcbiAgICBpZiAoIWMubW92ZWQgJiYgYWFiYi5jb2xsaWRlKHdzRmFyRnJvbnQpICYmIGJvYXJkLmdyaWRbd3NGYXJGcm9udC54XVt3c0ZhckZyb250LnldID09IG51bGwpXHJcbiAgICAgICAgbW92ZXMucHVzaChmYXJGcm9udCk7XHJcbiAgICB2YXIgd2VzdCA9IG5ldyBWZWN0b3IoMSwgMCkuYWRkKGZhY2luZyk7XHJcbiAgICB2YXIgd3N3ZXN0ID0gd2VzdC5jKCkuYWRkKGMucG9zKTtcclxuICAgIGlmIChhYWJiLmNvbGxpZGUod3N3ZXN0KSAmJiBib2FyZC5ncmlkW3dzd2VzdC54XVt3c3dlc3QueV0gIT0gbnVsbCAmJiBib2FyZC5ncmlkW3dzd2VzdC54XVt3c3dlc3QueV0udGVhbSAhPSBjLnRlYW0pXHJcbiAgICAgICAgbW92ZXMucHVzaCh3ZXN0KTtcclxuICAgIHZhciBlYXN0ID0gbmV3IFZlY3RvcigtMSwgMCkuYWRkKGZhY2luZyk7XHJcbiAgICB2YXIgd3NlYXN0ID0gZWFzdC5jKCkuYWRkKGMucG9zKTtcclxuICAgIGlmIChhYWJiLmNvbGxpZGUod3NlYXN0KSAmJiBib2FyZC5ncmlkW3dzZWFzdC54XVt3c2Vhc3QueV0gIT0gbnVsbCAmJiBib2FyZC5ncmlkW3dzZWFzdC54XVt3c2Vhc3QueV0udGVhbSAhPSBjLnRlYW0pXHJcbiAgICAgICAgbW92ZXMucHVzaChlYXN0KTtcclxuICAgIHJldHVybiBtb3Zlc1N0YW1wKG1vdmVzLCBjKTtcclxufSk7XHJcbmNoZWNrTWFwLnNldChUeXBlLnJvb2ssIGZ1bmN0aW9uIChjLCBncmlkKSB7XHJcbiAgICB2YXIgZGlyZWN0aW9ucyA9IFtcclxuICAgICAgICBuZXcgVmVjdG9yKDEsIDApLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTEsIDApLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoMCwgMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigwLCAtMSlcclxuICAgIF07XHJcbiAgICByZXR1cm4gZGlyZWN0aW9uU3RhbXAoZGlyZWN0aW9ucywgYyk7XHJcbn0pO1xyXG5jaGVja01hcC5zZXQoVHlwZS5rbmlnaHQsIGZ1bmN0aW9uIChjLCBncmlkKSB7XHJcbiAgICB2YXIgbW92ZXMgPSBbXHJcbiAgICAgICAgbmV3IFZlY3RvcigxLCAtMiksXHJcbiAgICAgICAgbmV3IFZlY3RvcigyLCAtMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigyLCAxKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDEsIDIpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTEsIDIpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTIsIDEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTIsIC0xKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0xLCAtMilcclxuICAgIF07XHJcbiAgICByZXR1cm4gbW92ZXNTdGFtcChtb3ZlcywgYyk7XHJcbn0pO1xyXG5jaGVja01hcC5zZXQoVHlwZS5iaXNzaG9wLCBmdW5jdGlvbiAoYywgZ3JpZCkge1xyXG4gICAgdmFyIGRpcmVjdGlvbnMgPSBbXHJcbiAgICAgICAgbmV3IFZlY3RvcigxLCAxKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0xLCAtMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigxLCAtMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigtMSwgMSlcclxuICAgIF07XHJcbiAgICByZXR1cm4gZGlyZWN0aW9uU3RhbXAoZGlyZWN0aW9ucywgYyk7XHJcbn0pO1xyXG5jaGVja01hcC5zZXQoVHlwZS5xdWVlbiwgZnVuY3Rpb24gKGMpIHtcclxuICAgIHZhciBkaXJlY3Rpb25zID0gW1xyXG4gICAgICAgIG5ldyBWZWN0b3IoMSwgMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigtMSwgLTEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoMSwgLTEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTEsIDEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoMSwgMCksXHJcbiAgICAgICAgbmV3IFZlY3RvcigtMSwgMCksXHJcbiAgICAgICAgbmV3IFZlY3RvcigwLCAxKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDAsIC0xKVxyXG4gICAgXTtcclxuICAgIHJldHVybiBkaXJlY3Rpb25TdGFtcChkaXJlY3Rpb25zLCBjKTtcclxufSk7XHJcbmNoZWNrTWFwLnNldChUeXBlLmtpbmcsIGZ1bmN0aW9uIChjLCBncmlkKSB7XHJcbiAgICB2YXIgbW92ZXMgPSBbXHJcbiAgICAgICAgbmV3IFZlY3RvcigwLCAxKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDEsIDEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoMSwgMCksXHJcbiAgICAgICAgbmV3IFZlY3RvcigxLCAtMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigwLCAtMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigtMSwgLTEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTEsIDApLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTEsIDEpLFxyXG4gICAgXTtcclxuICAgIHJldHVybiBtb3Zlc1N0YW1wKG1vdmVzLCBjKTtcclxufSk7XHJcbmZ1bmN0aW9uIGZpbHRlck1vdmVzT2ZmQm9hcmQobW92ZXMsIHNpemUsIHBvcykge1xyXG4gICAgdmFyIGxlZ2FsTW92ZXMgPSBbXTtcclxuICAgIHZhciBhYWJiID0gbmV3IEFBQkIobmV3IFZlY3RvcigpLCBzaXplLmMoKS5zdWIobmV3IFZlY3RvcigxLCAxKSkpO1xyXG4gICAgZm9yICh2YXIgX2kgPSAwLCBtb3Zlc18xID0gbW92ZXM7IF9pIDwgbW92ZXNfMS5sZW5ndGg7IF9pKyspIHtcclxuICAgICAgICB2YXIgbW92ZSA9IG1vdmVzXzFbX2ldO1xyXG4gICAgICAgIHZhciB3cyA9IG1vdmUuYygpLmFkZChwb3MpO1xyXG4gICAgICAgIGlmIChhYWJiLmNvbGxpZGUod3MpKVxyXG4gICAgICAgICAgICBsZWdhbE1vdmVzLnB1c2gobW92ZSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbGVnYWxNb3ZlcztcclxufVxyXG5mdW5jdGlvbiBkaXJlY3Rpb25TdGFtcChkaXJlY3Rpb25zLCBjKSB7XHJcbiAgICB2YXIgYWFiYiA9IG5ldyBBQUJCKG5ldyBWZWN0b3IoKSwgYy5jaGVzc0JvYXJkLnNpemUuYygpLnN1YihuZXcgVmVjdG9yKDEsIDEpKSk7XHJcbiAgICB2YXIgb3BlbnMgPSBVdGlscy5jcmVhdGUyZEFycmF5KGMuY2hlc3NCb2FyZC5zaXplLCBmYWxzZSk7XHJcbiAgICBmb3IgKHZhciBfaSA9IDAsIGRpcmVjdGlvbnNfMSA9IGRpcmVjdGlvbnM7IF9pIDwgZGlyZWN0aW9uc18xLmxlbmd0aDsgX2krKykge1xyXG4gICAgICAgIHZhciBkaXJlY3Rpb24gPSBkaXJlY3Rpb25zXzFbX2ldO1xyXG4gICAgICAgIHZhciBjdXJyZW50Q2hlY2tpbmdQb3MgPSBjLnBvcy5jKCk7XHJcbiAgICAgICAgd2hpbGUgKHRydWUpIHtcclxuICAgICAgICAgICAgY3VycmVudENoZWNraW5nUG9zLmFkZChkaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICBpZiAoYWFiYi5jb2xsaWRlKGN1cnJlbnRDaGVja2luZ1BvcykpIHtcclxuICAgICAgICAgICAgICAgIHZhciBwaWVjZSA9IGMuY2hlc3NCb2FyZC5ncmlkW2N1cnJlbnRDaGVja2luZ1Bvcy54XVtjdXJyZW50Q2hlY2tpbmdQb3MueV07XHJcbiAgICAgICAgICAgICAgICBpZiAocGllY2UgPT0gbnVsbClcclxuICAgICAgICAgICAgICAgICAgICBvcGVuc1tjdXJyZW50Q2hlY2tpbmdQb3MueF1bY3VycmVudENoZWNraW5nUG9zLnldID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChwaWVjZS50ZWFtICE9IGMudGVhbSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3BlbnNbY3VycmVudENoZWNraW5nUG9zLnhdW2N1cnJlbnRDaGVja2luZ1Bvcy55XSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7IC8vYnJlYWsgaW4gYm90aCBjYXNlcyAoaWYvZWxzZSBzdGF0ZW1lbnQgYm90aCBicmVhaylcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gb3BlbnM7XHJcbn1cclxuZnVuY3Rpb24gbW92ZXNTdGFtcChtb3ZlcywgYykge1xyXG4gICAgdmFyIGFhYmIgPSBuZXcgQUFCQihuZXcgVmVjdG9yKCksIGMuY2hlc3NCb2FyZC5zaXplLmMoKS5zdWIobmV3IFZlY3RvcigxLCAxKSkpO1xyXG4gICAgdmFyIG9wZW5zID0gVXRpbHMuY3JlYXRlMmRBcnJheShjLmNoZXNzQm9hcmQuc2l6ZSwgZmFsc2UpO1xyXG4gICAgZm9yICh2YXIgX2kgPSAwLCBtb3Zlc18yID0gbW92ZXM7IF9pIDwgbW92ZXNfMi5sZW5ndGg7IF9pKyspIHtcclxuICAgICAgICB2YXIgbW92ZSA9IG1vdmVzXzJbX2ldO1xyXG4gICAgICAgIHZhciBjdXJyZW50Q2hlY2tpbmdQb3MgPSBjLnBvcy5jKCk7XHJcbiAgICAgICAgY3VycmVudENoZWNraW5nUG9zLmFkZChtb3ZlKTtcclxuICAgICAgICBpZiAoYWFiYi5jb2xsaWRlKGN1cnJlbnRDaGVja2luZ1BvcykpIHtcclxuICAgICAgICAgICAgdmFyIHBpZWNlID0gYy5jaGVzc0JvYXJkLmdyaWRbY3VycmVudENoZWNraW5nUG9zLnhdW2N1cnJlbnRDaGVja2luZ1Bvcy55XTtcclxuICAgICAgICAgICAgaWYgKHBpZWNlID09IG51bGwgfHwgcGllY2UudGVhbSAhPSBjLnRlYW0pXHJcbiAgICAgICAgICAgICAgICBvcGVuc1tjdXJyZW50Q2hlY2tpbmdQb3MueF1bY3VycmVudENoZWNraW5nUG9zLnldID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gb3BlbnM7XHJcbn1cclxudmFyIGxldHRlck1hcCA9IFtdO1xyXG5sZXR0ZXJNYXBbVHlwZS5iaXNzaG9wXSA9ICdCJztcclxubGV0dGVyTWFwW1R5cGUua2luZ10gPSAnSyc7XHJcbmxldHRlck1hcFtUeXBlLmtuaWdodF0gPSAnSCc7XHJcbmxldHRlck1hcFtUeXBlLnBhd25dID0gJ1AnO1xyXG5sZXR0ZXJNYXBbVHlwZS5xdWVlbl0gPSAnUSc7XHJcbmxldHRlck1hcFtUeXBlLnJvb2tdID0gJ1InO1xyXG5tb2R1bGUuZXhwb3J0cyA9IENoZXNzUGllY2U7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPUNoZXNzUGllY2UuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBXZWJJT0MgPSAoZnVuY3Rpb24gKCkge1xyXG4gICAgZnVuY3Rpb24gV2ViSU9DKHNvY2tldCkge1xyXG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XHJcbiAgICAgICAgdGhpcy5yb3V0ZU1hcCA9IHt9O1xyXG4gICAgICAgIHRoaXMuc29ja2V0Lm9ubWVzc2FnZSA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgICAgICB2YXIgZGF0YSA9IGV2ZW50LmRhdGE7XHJcbiAgICAgICAgICAgIHZhciBwYXJzZWREYXRhID0gSlNPTi5wYXJzZShkYXRhKTtcclxuICAgICAgICAgICAgaWYgKF90aGlzLnJvdXRlTWFwW3BhcnNlZERhdGEucm91dGVdKSB7XHJcbiAgICAgICAgICAgICAgICBfdGhpcy5yb3V0ZU1hcFtwYXJzZWREYXRhLnJvdXRlXShwYXJzZWREYXRhKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCc0MDQ6ICcgKyBwYXJzZWREYXRhLnJvdXRlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcbiAgICBXZWJJT0MucHJvdG90eXBlLm9uID0gZnVuY3Rpb24gKHJvdXRlLCBhY3Rpb24pIHtcclxuICAgICAgICB0aGlzLnJvdXRlTWFwW3JvdXRlXSA9IGFjdGlvbjtcclxuICAgIH07XHJcbiAgICBXZWJJT0MucHJvdG90eXBlLnNlbmQgPSBmdW5jdGlvbiAocm91dGUsIHZhbHVlKSB7XHJcbiAgICAgICAgdmFsdWUucm91dGUgPSByb3V0ZTtcclxuICAgICAgICBpZiAodGhpcy5zb2NrZXQucmVhZHlTdGF0ZSA9PSAxKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc29ja2V0LnNlbmQoSlNPTi5zdHJpbmdpZnkodmFsdWUpKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgV2ViSU9DLnByb3RvdHlwZS5vbmNsb3NlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgfTtcclxuICAgIFdlYklPQy5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQuY2xvc2UoKTtcclxuICAgIH07XHJcbiAgICByZXR1cm4gV2ViSU9DO1xyXG59KCkpO1xyXG5tb2R1bGUuZXhwb3J0cyA9IFdlYklPQztcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9V2ViSU9DLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgRXZlbnRIYW5kbGVyID0gKGZ1bmN0aW9uICgpIHtcclxuICAgIGZ1bmN0aW9uIEV2ZW50SGFuZGxlcigpIHtcclxuICAgIH1cclxuICAgIC8vIHN0YXRpYyBnZXRJbnN0YW5jZSgpOkV2ZW50SGFuZGxlcntcclxuICAgIC8vICAgICBpZihFdmVudEhhbmRsZXIuaW5zdGFuY2UgPT0gbnVsbCl7XHJcbiAgICAvLyAgICAgICAgIEV2ZW50SGFuZGxlci5pbnN0YW5jZSA9IG5ldyBFdmVudEhhbmRsZXIoKTtcclxuICAgIC8vICAgICB9XHJcbiAgICAvLyAgICAgcmV0dXJuIEV2ZW50SGFuZGxlci5pbnN0YW5jZTtcclxuICAgIC8vIH1cclxuICAgIEV2ZW50SGFuZGxlci50cmlnZ2VyID0gZnVuY3Rpb24gKGV2ZW50LCBkYXRhKSB7XHJcbiAgICAgICAgaWYgKEV2ZW50SGFuZGxlci5ldmVudE1hcC5nZXQoZXZlbnQpID09IG51bGwpXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICBmb3IgKHZhciBfaSA9IDAsIF9hID0gRXZlbnRIYW5kbGVyLmV2ZW50TWFwLmdldChldmVudCk7IF9pIDwgX2EubGVuZ3RoOyBfaSsrKSB7XHJcbiAgICAgICAgICAgIHZhciBjYWxsYmFjayA9IF9hW19pXTtcclxuICAgICAgICAgICAgY2FsbGJhY2soZGF0YSk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIEV2ZW50SGFuZGxlci5zdWJzY3JpYmUgPSBmdW5jdGlvbiAoZXZlbnQsIGNhbGxiYWNrKSB7XHJcbiAgICAgICAgaWYgKEV2ZW50SGFuZGxlci5ldmVudE1hcC5nZXQoZXZlbnQpID09IG51bGwpXHJcbiAgICAgICAgICAgIEV2ZW50SGFuZGxlci5ldmVudE1hcC5zZXQoZXZlbnQsIFtdKTtcclxuICAgICAgICBFdmVudEhhbmRsZXIuZXZlbnRNYXAuZ2V0KGV2ZW50KS5wdXNoKGNhbGxiYWNrKTtcclxuICAgIH07XHJcbiAgICBFdmVudEhhbmRsZXIuZGV0YWNoID0gZnVuY3Rpb24gKGV2ZW50LCBjYWxsYmFjaykge1xyXG4gICAgICAgIHZhciBzdWJsaXN0ID0gRXZlbnRIYW5kbGVyLmV2ZW50TWFwLmdldChldmVudCk7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdWJsaXN0Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIHZhciBjYWxsYmFja0luTWFwID0gc3VibGlzdFtpXTtcclxuICAgICAgICAgICAgaWYgKGNhbGxiYWNrSW5NYXAgPT0gY2FsbGJhY2spIHtcclxuICAgICAgICAgICAgICAgIHN1Ymxpc3Quc3BsaWNlKGksIDEpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIEV2ZW50SGFuZGxlci5ldmVudE1hcCA9IG5ldyBNYXAoKTtcclxuICAgIHJldHVybiBFdmVudEhhbmRsZXI7XHJcbn0oKSk7XHJcbm1vZHVsZS5leHBvcnRzID0gRXZlbnRIYW5kbGVyO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1ldmVudEhhbmRsZXIuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzJyk7XHJcbnZhciBjdHh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XHJcbnZhciBsYXN0VXBkYXRlID0gRGF0ZS5ub3coKTtcclxudmFyIGR0O1xyXG52YXIgcGkgPSBNYXRoLlBJO1xyXG52YXIgcmVzZXRCdG4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcmVzZXRCdG4nKTtcclxudmFyIHRlYW1MYWJlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyN0ZWFtTGFiZWwnKTtcclxudmFyIHR1cm5MYWJlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyN0dXJuTGFiZWwnKTtcclxudmFyIFZlY3RvciA9IHJlcXVpcmUoJy4vVmVjdG9yJyk7XHJcbnZhciBVdGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcclxudmFyIENoZXNzQm9hcmQgPSByZXF1aXJlKCcuL0NoZXNzQm9hcmQnKTtcclxudmFyIEFBQkIgPSByZXF1aXJlKCcuL0FBQkInKTtcclxudmFyIFdlYklPQyA9IHJlcXVpcmUoJy4vV2ViSU9DJyk7XHJcbnZhciBzb2NrZXQgPSBuZXcgV2ViU29ja2V0KFwid3M6Ly9sb2NhbGhvc3Q6ODAwMC9cIik7XHJcbnZhciB3ZWJJT0MgPSBuZXcgV2ViSU9DKHNvY2tldCk7XHJcbnZhciBUZWFtO1xyXG4oZnVuY3Rpb24gKFRlYW0pIHtcclxuICAgIFRlYW1bVGVhbVtcIkJsYWNrXCJdID0gMF0gPSBcIkJsYWNrXCI7XHJcbiAgICBUZWFtW1RlYW1bXCJXaGl0ZVwiXSA9IDFdID0gXCJXaGl0ZVwiO1xyXG59KShUZWFtIHx8IChUZWFtID0ge30pKTtcclxudmFyIFR5cGU7XHJcbihmdW5jdGlvbiAoVHlwZSkge1xyXG4gICAgVHlwZVtUeXBlW1wicGF3blwiXSA9IDBdID0gXCJwYXduXCI7XHJcbiAgICBUeXBlW1R5cGVbXCJyb29rXCJdID0gMV0gPSBcInJvb2tcIjtcclxuICAgIFR5cGVbVHlwZVtcImtuaWdodFwiXSA9IDJdID0gXCJrbmlnaHRcIjtcclxuICAgIFR5cGVbVHlwZVtcImJpc3Nob3BcIl0gPSAzXSA9IFwiYmlzc2hvcFwiO1xyXG4gICAgVHlwZVtUeXBlW1wicXVlZW5cIl0gPSA0XSA9IFwicXVlZW5cIjtcclxuICAgIFR5cGVbVHlwZVtcImtpbmdcIl0gPSA1XSA9IFwia2luZ1wiO1xyXG59KShUeXBlIHx8IChUeXBlID0ge30pKTtcclxudmFyIHRlYW07XHJcbnZhciBjYW52YXNDb250YWluZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjY2FudmFzLWNvbnRhaW5lcicpO1xyXG5jYW52YXMud2lkdGggPSBjYW52YXNDb250YWluZXIub2Zmc2V0V2lkdGggLSAzO1xyXG5jYW52YXMuaGVpZ2h0ID0gY2FudmFzQ29udGFpbmVyLm9mZnNldEhlaWdodCAtIDEwMDtcclxudmFyIGNoZXNzQm9hcmQgPSBuZXcgQ2hlc3NCb2FyZCgpO1xyXG5zZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgbm93ID0gRGF0ZS5ub3coKTtcclxuICAgIGR0ID0gKG5vdyAtIGxhc3RVcGRhdGUpIC8gMTAwMDtcclxuICAgIGxhc3RVcGRhdGUgPSBub3c7XHJcbiAgICBkdCA9IFV0aWxzLm1pbihkdCwgMSk7XHJcbiAgICB1cGRhdGUoKTtcclxuICAgIGRyYXcoKTtcclxufSwgMTAwMCAvIDYwKTtcclxudmFyIGhhbGZzaXplID0gY2hlc3NCb2FyZC5zaXplLnggKiBjaGVzc0JvYXJkLnNxdWFyZVNpemUueCAvIDI7XHJcbnZhciBvZmZzZXQgPSBuZXcgVmVjdG9yKE1hdGguZmxvb3IoY2FudmFzLndpZHRoIC8gMiAtIGhhbGZzaXplKSwgTWF0aC5mbG9vcihjYW52YXMuaGVpZ2h0IC8gMiAtIGhhbGZzaXplKSk7XHJcbmNoZXNzQm9hcmQuZHJhdyhjdHh0LCBvZmZzZXQpO1xyXG5yZXNldEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcclxuICAgIHdlYklPQy5zZW5kKCdyZXNldCcsIHt9KTtcclxufSk7XHJcbndlYklPQy5vbigndXBkYXRlJywgZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgIGNoZXNzQm9hcmQgPSBDaGVzc0JvYXJkLmRlc2VyaWFsaXplKGRhdGEuY2hlc3NCb2FyZCk7XHJcbiAgICB0ZWFtID0gZGF0YS50ZWFtO1xyXG4gICAgdGVhbUxhYmVsLmlubmVySFRNTCA9IFRlYW1bdGVhbV07XHJcbiAgICB0dXJuTGFiZWwuaW5uZXJIVE1MID0gVGVhbVtjaGVzc0JvYXJkLnR1cm5dO1xyXG4gICAgY2hlc3NCb2FyZC5kcmF3KGN0eHQsIG9mZnNldCk7XHJcbn0pO1xyXG5kb2N1bWVudC5vbm1vdXNlZG93biA9IGZ1bmN0aW9uIChldnQpIHtcclxuICAgIHZhciBhYWJiID0gbmV3IEFBQkIobmV3IFZlY3RvcigpLCBjaGVzc0JvYXJkLnNpemUuYygpLnN1YihuZXcgVmVjdG9yKDEsIDEpKSk7XHJcbiAgICB2YXIgdiA9IGNoZXNzQm9hcmQudmVjdG9yVG9HcmlkUG9zKGdldE1vdXNlUG9zKGNhbnZhcywgZXZ0KS5zdWIob2Zmc2V0KSk7XHJcbiAgICBpZiAoIWFhYmIuY29sbGlkZSh2KSkge1xyXG4gICAgICAgIGNoZXNzQm9hcmQuc2VsZWN0ZWQgPSBudWxsO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgdmFyIHBpZWNlID0gY2hlc3NCb2FyZC5ncmlkW3YueF1bdi55XTtcclxuICAgICAgICBpZiAoY2hlc3NCb2FyZC5zZWxlY3RlZCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIGlmIChwaWVjZSAmJiBwaWVjZS50ZWFtID09IGNoZXNzQm9hcmQudHVybiAmJiBwaWVjZS50ZWFtID09IHRlYW0pIHtcclxuICAgICAgICAgICAgICAgIGNoZXNzQm9hcmQuc2VsZWN0ZWQgPSBwaWVjZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgaWYgKHBpZWNlICYmIHBpZWNlLnRlYW0gPT0gY2hlc3NCb2FyZC50dXJuKVxyXG4gICAgICAgICAgICAgICAgY2hlc3NCb2FyZC5zZWxlY3RlZCA9IHBpZWNlO1xyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlmIChjaGVzc0JvYXJkLnNlbGVjdGVkLmlzTGVnYWxNb3ZlKHYpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgd2ViSU9DLnNlbmQoJ21vdmUnLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZyb206IGNoZXNzQm9hcmQuc2VsZWN0ZWQucG9zLnNlcmlhbGl6ZSgpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0bzogdi5zZXJpYWxpemUoKVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY2hlc3NCb2FyZC5zZWxlY3RlZCA9IG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBjaGVzc0JvYXJkLmRyYXcoY3R4dCwgb2Zmc2V0KTtcclxufTtcclxuZnVuY3Rpb24gdXBkYXRlKCkge1xyXG59XHJcbmZ1bmN0aW9uIGRyYXcoKSB7XHJcbiAgICAvL2N0eHQuY2xlYXJSZWN0KDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCk7XHJcbn1cclxuZnVuY3Rpb24gZ2V0TW91c2VQb3MoY2FudmFzLCBldnQpIHtcclxuICAgIHZhciByZWN0ID0gY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gICAgcmV0dXJuIG5ldyBWZWN0b3IoZXZ0LmNsaWVudFggLSByZWN0LmxlZnQsIGV2dC5jbGllbnRZIC0gcmVjdC50b3ApO1xyXG59XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPW1haW4uanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciB1dGlscztcclxuKGZ1bmN0aW9uICh1dGlscykge1xyXG4gICAgZnVuY3Rpb24gbWFwKHZhbDEsIHN0YXJ0MSwgc3RvcDEsIHN0YXJ0Miwgc3RvcDIpIHtcclxuICAgICAgICByZXR1cm4gc3RhcnQyICsgKHN0b3AyIC0gc3RhcnQyKSAqICgodmFsMSAtIHN0YXJ0MSkgLyAoc3RvcDEgLSBzdGFydDEpKTtcclxuICAgIH1cclxuICAgIHV0aWxzLm1hcCA9IG1hcDtcclxuICAgIGZ1bmN0aW9uIGluUmFuZ2UobWluLCBtYXgsIHZhbHVlKSB7XHJcbiAgICAgICAgaWYgKG1pbiA+IG1heCkge1xyXG4gICAgICAgICAgICB2YXIgdGVtcCA9IG1pbjtcclxuICAgICAgICAgICAgbWluID0gbWF4O1xyXG4gICAgICAgICAgICBtYXggPSB0ZW1wO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdmFsdWUgPD0gbWF4ICYmIHZhbHVlID49IG1pbjtcclxuICAgIH1cclxuICAgIHV0aWxzLmluUmFuZ2UgPSBpblJhbmdlO1xyXG4gICAgZnVuY3Rpb24gbWluKGEsIGIpIHtcclxuICAgICAgICBpZiAoYSA8IGIpXHJcbiAgICAgICAgICAgIHJldHVybiBhO1xyXG4gICAgICAgIHJldHVybiBiO1xyXG4gICAgfVxyXG4gICAgdXRpbHMubWluID0gbWluO1xyXG4gICAgZnVuY3Rpb24gbWF4KGEsIGIpIHtcclxuICAgICAgICBpZiAoYSA+IGIpXHJcbiAgICAgICAgICAgIHJldHVybiBhO1xyXG4gICAgICAgIHJldHVybiBiO1xyXG4gICAgfVxyXG4gICAgdXRpbHMubWF4ID0gbWF4O1xyXG4gICAgZnVuY3Rpb24gY2xhbXAodmFsLCBtaW4sIG1heCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLm1heCh0aGlzLm1pbih2YWwsIG1heCksIG1pbik7XHJcbiAgICB9XHJcbiAgICB1dGlscy5jbGFtcCA9IGNsYW1wO1xyXG4gICAgZnVuY3Rpb24gcmFuZ2VDb250YWluKGExLCBhMiwgYjEsIGIyKSB7XHJcbiAgICAgICAgcmV0dXJuIG1heChhMSwgYTIpID49IG1heChiMSwgYjIpICYmIG1pbihhMSwgYTIpIDw9IG1heChiMSwgYjIpO1xyXG4gICAgfVxyXG4gICAgdXRpbHMucmFuZ2VDb250YWluID0gcmFuZ2VDb250YWluO1xyXG4gICAgZnVuY3Rpb24gY3JlYXRlMmRBcnJheSh2LCBmaWxsKSB7XHJcbiAgICAgICAgdmFyIHJvd3MgPSBuZXcgQXJyYXkodi54KTtcclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHYueDsgaSsrKSB7XHJcbiAgICAgICAgICAgIHJvd3NbaV0gPSBuZXcgQXJyYXkodi55KTtcclxuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCB2Lnk7IGorKykge1xyXG4gICAgICAgICAgICAgICAgcm93c1tpXVtqXSA9IGZpbGw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHJvd3M7XHJcbiAgICB9XHJcbiAgICB1dGlscy5jcmVhdGUyZEFycmF5ID0gY3JlYXRlMmRBcnJheTtcclxufSkodXRpbHMgfHwgKHV0aWxzID0ge30pKTtcclxubW9kdWxlLmV4cG9ydHMgPSB1dGlscztcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9dXRpbHMuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBWZWN0b3IgPSAoZnVuY3Rpb24gKCkge1xyXG4gICAgZnVuY3Rpb24gVmVjdG9yKHgsIHkpIHtcclxuICAgICAgICBpZiAoeCA9PT0gdm9pZCAwKSB7IHggPSAwOyB9XHJcbiAgICAgICAgaWYgKHkgPT09IHZvaWQgMCkgeyB5ID0gMDsgfVxyXG4gICAgICAgIHRoaXMueCA9IHg7XHJcbiAgICAgICAgdGhpcy55ID0geTtcclxuICAgIH1cclxuICAgIFZlY3Rvci5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gKHZlY3Rvcikge1xyXG4gICAgICAgIHRoaXMueCArPSB2ZWN0b3IueDtcclxuICAgICAgICB0aGlzLnkgKz0gdmVjdG9yLnk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9O1xyXG4gICAgVmVjdG9yLnByb3RvdHlwZS5zdWIgPSBmdW5jdGlvbiAodmVjdG9yKSB7XHJcbiAgICAgICAgdGhpcy54IC09IHZlY3Rvci54O1xyXG4gICAgICAgIHRoaXMueSAtPSB2ZWN0b3IueTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH07XHJcbiAgICBWZWN0b3IucHJvdG90eXBlLmxlbmd0aCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gTWF0aC5wb3codGhpcy54ICogdGhpcy54ICsgdGhpcy55ICogdGhpcy55LCAwLjUpO1xyXG4gICAgfTtcclxuICAgIFZlY3Rvci5wcm90b3R5cGUubm9ybWFsaXplID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBsZW5ndGggPSB0aGlzLmxlbmd0aCgpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLnNjYWxlKDEgLyBsZW5ndGgpO1xyXG4gICAgfTtcclxuICAgIFZlY3Rvci5wcm90b3R5cGUuc2NhbGUgPSBmdW5jdGlvbiAoc2NhbGFyKSB7XHJcbiAgICAgICAgdGhpcy54ICo9IHNjYWxhcjtcclxuICAgICAgICB0aGlzLnkgKj0gc2NhbGFyO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfTtcclxuICAgIFZlY3Rvci5wcm90b3R5cGUucm90YXRlID0gZnVuY3Rpb24gKHIsIG9yaWdpbikge1xyXG4gICAgICAgIGlmIChvcmlnaW4gPT09IHZvaWQgMCkgeyBvcmlnaW4gPSBuZXcgVmVjdG9yKCk7IH1cclxuICAgICAgICB2YXIgb2Zmc2V0ID0gdGhpcy5jKCkuc3ViKG9yaWdpbik7XHJcbiAgICAgICAgdmFyIHggPSBvZmZzZXQueCAqIE1hdGguY29zKHIpIC0gb2Zmc2V0LnkgKiBNYXRoLnNpbihyKTtcclxuICAgICAgICB2YXIgeSA9IG9mZnNldC54ICogTWF0aC5zaW4ocikgKyBvZmZzZXQueSAqIE1hdGguY29zKHIpO1xyXG4gICAgICAgIG9mZnNldC54ID0geDtcclxuICAgICAgICBvZmZzZXQueSA9IHk7XHJcbiAgICAgICAgdmFyIGJhY2sgPSBvZmZzZXQuYWRkKG9yaWdpbik7XHJcbiAgICAgICAgdGhpcy54ID0gYmFjay54O1xyXG4gICAgICAgIHRoaXMueSA9IGJhY2sueTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH07XHJcbiAgICBWZWN0b3IucHJvdG90eXBlLmxlcnAgPSBmdW5jdGlvbiAodmVjdG9yLCB3ZWlndGgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5zY2FsZSgxIC0gd2VpZ3RoKS5hZGQodmVjdG9yLmMoKS5zY2FsZSh3ZWlndGgpKTtcclxuICAgIH07XHJcbiAgICBWZWN0b3IucHJvdG90eXBlLmMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWN0b3IodGhpcy54LCB0aGlzLnkpO1xyXG4gICAgfTtcclxuICAgIFZlY3Rvci5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24gKHYpIHtcclxuICAgICAgICBpZiAodiA9PSBudWxsKVxyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMueCA9PSB2LnggJiYgdGhpcy55ID09IHYueTtcclxuICAgIH07XHJcbiAgICBWZWN0b3IucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uICh2ZWN0b3IpIHtcclxuICAgICAgICB0aGlzLnggPSB2ZWN0b3IueDtcclxuICAgICAgICB0aGlzLnkgPSB2ZWN0b3IueTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH07XHJcbiAgICBWZWN0b3IucHJvdG90eXBlLnBlcnBEb3QgPSBmdW5jdGlvbiAodmVjdG9yKSB7XHJcbiAgICAgICAgcmV0dXJuIE1hdGguYXRhbjIodGhpcy54ICogdmVjdG9yLnkgLSB0aGlzLnkgKiB2ZWN0b3IueCwgdGhpcy54ICogdmVjdG9yLnggKyB0aGlzLnkgKiB2ZWN0b3IueSk7XHJcbiAgICB9O1xyXG4gICAgVmVjdG9yLnByb3RvdHlwZS5kcmF3ID0gZnVuY3Rpb24gKGN0eHQpIHtcclxuICAgICAgICB2YXIgd2lkdGggPSAxMDtcclxuICAgICAgICB2YXIgaGFsZiA9IHdpZHRoIC8gMjtcclxuICAgICAgICBjdHh0LmZpbGxSZWN0KHRoaXMueCAtIGhhbGYsIHRoaXMueSAtIGhhbGYsIHdpZHRoLCB3aWR0aCk7XHJcbiAgICB9O1xyXG4gICAgVmVjdG9yLnByb3RvdHlwZS5sb29wID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XHJcbiAgICAgICAgZm9yICh2YXIgeCA9IDA7IHggPCB0aGlzLng7IHgrKykge1xyXG4gICAgICAgICAgICBmb3IgKHZhciB5ID0gMDsgeSA8IHRoaXMueTsgeSsrKSB7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhuZXcgVmVjdG9yKHgsIHkpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH07XHJcbiAgICBWZWN0b3IucHJvdG90eXBlLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4geyB4OiB0aGlzLngsIHk6IHRoaXMueSB9O1xyXG4gICAgfTtcclxuICAgIFZlY3Rvci5kZXNlcmlhbGl6ZSA9IGZ1bmN0aW9uIChvYmplY3QpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlY3RvcihvYmplY3QueCwgb2JqZWN0LnkpO1xyXG4gICAgfTtcclxuICAgIHJldHVybiBWZWN0b3I7XHJcbn0oKSk7XHJcbm1vZHVsZS5leHBvcnRzID0gVmVjdG9yO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD12ZWN0b3IuanMubWFwIl19
