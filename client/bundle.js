(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Vector = require('./vector')
var Utils = require('./utils')
class AABB{
    constructor(pos, size){
        this.pos = pos;
        this.size = size;
    }

    static fromVectors(a){
        var small = a[0];
        var big = a[a.length - 1];
        for(var v of a){
            if(v.x < small.x)small.x = v.x;
            else if(v.x > big.x)big.x = v.x;
            if(v.y < small.y)small.y = v.y;
            else if(v.y > big.y)big.y = v.y;
        }
        return new AABB(small, big.sub(small));
    }

    contains(aabb){
        return Utils.rangeContain(this.pos.x, this.size.x + this.pos.x, aabb.pos.x, aabb.size.x + aabb.pos.x) 
        && Utils.rangeContain(this.pos.y, this.size.y + this.pos.y, aabb.pos.y, aabb.size.y + aabb.pos.y)
    }

    collide(v){
        return Utils.inRange(this.pos.x, this.size.x + this.pos.x, v.x) && Utils.inRange(this.pos.y, this.size.y + this.pos.y, v.y)
    }
}

module.exports = AABB
},{"./utils":7,"./vector":8}],2:[function(require,module,exports){
var Vector = require('./vector')
var Utils = require('./utils')
var AABB = require('./AABB')
var ChessPiece = require('./ChessPiece')
var Team = ChessPiece.Team

class ChessBoard{

    constructor(){
        this.lastMove = null;
        this.lastMoveTo = null;
        this.size = new Vector(8,8)
        this.squareSize = new Vector(50, 50)
        this.turn = Team.White
        this.grid = Utils.create2dArray(this.size, null);
    }

    tryFromTo(from, to){
        var fromPiece = this.grid[from.x][from.y]//could outofrange from badclient
        return fromPiece.tryMove(to)
    }

    draw(ctxt, offset){
        
        var legalsSpots;
        if(this.selected)legalsSpots = this.selected.posChecker(this.selected, this)
        this.size.loop((v) =>{
            if((v.x + v.y) % 2 == 0)ctxt.fillStyle = "#fff"
            else ctxt.fillStyle = "#000"
            if(this.selected && v.equals(this.selected.pos))ctxt.fillStyle = "#0ff"
            
            if(this.lastMove && v.equals(this.lastMove)){
                ctxt.fillStyle = "#404"
            }
            if(this.lastMoveTo && v.equals(this.lastMoveTo)){
                ctxt.fillStyle = "#a0a"
            }
            if(this.selected && legalsSpots[v.x][v.y])ctxt.fillStyle = "#f00"
            ctxt.fillRect(v.x * this.squareSize.x + offset.x, v.y * this.squareSize.y + offset.y, this.squareSize.x, this.squareSize.y)
            if(this.grid[v.x][v.y]){
                this.grid[v.x][v.y].draw(ctxt, this.squareSize, offset)
            }
        })
    }

    vectorToGridPos(v){
        var n = new Vector();
        n.x = Math.floor(v.x / this.squareSize.x)
        n.y = Math.floor(v.y / this.squareSize.y)
        return n;
    }

    add(c){
        this.grid[c.pos.x][c.pos.y] = c;
    }

    serialize(){
        var grid = Utils.create2dArray(this.size, null)
        this.size.loop((v) => {
            if(this.grid[v.x][v.y])grid[v.x][v.y] = this.grid[v.x][v.y].serialize()
        })
        var selected;
        if(this.selected)selected = this.selected.serialize()
        var lastMove;
        if(this.lastMove)lastMove = this.lastMove.serialize()
        var lastMoveTo;
        if(this.lastMoveTo)lastMoveTo = this.lastMoveTo.serialize()
        var serialized = {
            size:this.size.serialize(),
            squareSize:this.squareSize.serialize(),
            grid:grid,
            turn:this.turn,
            selected:selected,
            lastMove:lastMove,
            lastMoveTo:lastMoveTo
        }
        return serialized
    }

    static deserialize(object){
        var chessBoard = new ChessBoard()
        var grid = Utils.create2dArray(chessBoard.size, null)
        chessBoard.size.loop((v) => {
            if(object.grid[v.x][v.y])grid[v.x][v.y] = ChessPiece.deserialize(object.grid[v.x][v.y], chessBoard)
        })
        chessBoard.grid = grid
        chessBoard.turn = object.turn
        if(object.lastMove)chessBoard.lastMove = Vector.deserialize(object.lastMove)
        if(object.lastMoveTo)chessBoard.lastMoveTo = Vector.deserialize(object.lastMoveTo)
        if(object.selected)chessBoard.selected = ChessPiece.deserialize(object.selected, chessBoard)
        return chessBoard
    }
}

module.exports = ChessBoard
},{"./AABB":1,"./ChessPiece":3,"./utils":7,"./vector":8}],3:[function(require,module,exports){
var Vector = require('./vector')
var Utils = require('./utils')
var AABB = require('./AABB')
var EventHandler = require('./eventHandler')

var Team = {}
Team[Team["Black"] = 0] = "Black"; 
Team[Team["White"] = 1] = "White"; 

var Type = {}
Type[Type["pawn"] = 0] = "pawn"; 
Type[Type["rook"] = 1] = "rook"; 
Type[Type["knight"] = 2] = "knight"; 
Type[Type["bisshop"] = 3] = "bisshop"; 
Type[Type["queen"] = 4] = "queen"; 
Type[Type["king"] = 5] = "king"; 

class ChessPiece{
    
    constructor(type, team, pos, chessBoard){
        this.moved = false
        this.pos = pos
        this.chessBoard = chessBoard
        this.posChecker = checkMap.get(type)
        this.type = type
        this.team = team
        
    }

    draw(ctxt, squareSize, offset){
        ctxt.textAlign = 'center'
        ctxt.textBaseline = 'middle'
        ctxt.strokeStyle = '#000'
        ctxt.fillStyle = '#fff'
        if(this.team == Team.Black){
            ctxt.strokeStyle = '#fff'
            ctxt.fillStyle = '#000'
        }
        var size = 30
        var halfsize = size / 2
        ctxt.strokeRect(offset.x + 0.5 + this.pos.x * squareSize.x + squareSize.x / 2 - halfsize, offset.y + 0.5 + this.pos.y * squareSize.y + squareSize.y / 2 - halfsize, size, size)
        ctxt.fillRect(offset.x + 1 + this.pos.x * squareSize.x + squareSize.x / 2 - halfsize, offset.y + 1 + this.pos.y * squareSize.y + squareSize.y / 2 - halfsize, size - 1, size - 1)
        if(this.team == Team.Black)ctxt.fillStyle = '#fff'
        else ctxt.fillStyle = '#000'
        
        ctxt.fillText(letterMap[this.type],offset.x + this.pos.x * squareSize.x + squareSize.x / 2, offset.y + this.pos.y * squareSize.y + squareSize.y / 2)
    }

    tryMove(v){    
        if(this.posChecker(this, this.chessBoard)[v.x][v.y]){
            this.chessBoard.lastMove = this.pos.c()
            var piece = this.chessBoard.grid[v.x][v.y]
            if(piece && piece.type == Type.king) EventHandler.trigger('gameOver', piece)
            this.chessBoard.grid[v.x][v.y] = this;
            this.chessBoard.grid[this.pos.x][this.pos.y] = null;
            this.chessBoard.lastMoveTo = v.c()
            this.pos = v;
            this.moved = true;
            
            
            if(this.chessBoard.turn == Team.Black)this.chessBoard.turn = Team.White
            else this.chessBoard.turn = Team.Black
            return true
        }
        return false
    }

    isLegalMove(v){
        return this.posChecker(this, this.chessBoard)[v.x][v.y]
    }

    serialize(){
        return {
            type:this.type,
            pos:this.pos.serialize(),
            team:this.team,
            moved:this.moved
        }
    }

    static deserialize(object, chessBoard){
        var c = new ChessPiece(object.type, object.team, Vector.deserialize(object.pos), chessBoard)
        c.moved = object.moved
        return c
    }
}

var checkMap = new Map();

checkMap.set(Type.pawn, function(c, board){
    var aabb = new AABB(new Vector(), board.size.c().sub(new Vector(1,1)))
    var moves = [];
    var facing;
    if(c.team == Team.White)facing = new Vector(0, -1)
    else facing = new Vector(0, 1)
    var wsfront = c.pos.c().add(facing)
    if(aabb.collide(wsfront) && board.grid[wsfront.x][wsfront.y] == null)moves.push(facing)

    var farFront = facing.c().scale(2)
    var wsFarFront = c.pos.c().add(farFront)
    if(!c.moved && aabb.collide(wsFarFront) && board.grid[wsFarFront.x][wsFarFront.y] == null)moves.push(farFront)

    var west = new Vector(1,0).add(facing)
    var wswest = west.c().add(c.pos)
    if(aabb.collide(wswest) && board.grid[wswest.x][wswest.y] != null && board.grid[wswest.x][wswest.y].team != c.team) moves.push(west)
    
    var east = new Vector(-1,0).add(facing)
    var wseast = east.c().add(c.pos)
    if(aabb.collide(wseast) && board.grid[wseast.x][wseast.y] != null && board.grid[wseast.x][wseast.y].team != c.team) moves.push(east)

    return movesStamp(moves, c);
})

checkMap.set(Type.rook, function(c, grid){
    var directions = [
        new Vector(1, 0),
        new Vector(-1, 0),
        new Vector(0, 1),
        new Vector(0, -1)
    ]
    return directionStamp(directions, c);
})

checkMap.set(Type.knight, function(c, grid){
    var moves = [
        new Vector(1, -2),
        new Vector(2, -1),
        new Vector(2, 1),
        new Vector(1, 2),
        new Vector(-1, 2),
        new Vector(-2, 1),
        new Vector(-2, -1),
        new Vector(-1, -2)
    ]
    return movesStamp(moves, c);
})

checkMap.set(Type.bisshop, function(c, grid){
    var directions = [
        new Vector(1, 1),
        new Vector(-1, -1),
        new Vector(1, -1),
        new Vector(-1, 1)
    ]
    return directionStamp(directions, c);
})

checkMap.set(Type.queen, function(c){
    var directions = [
        new Vector(1, 1),
        new Vector(-1, -1),
        new Vector(1, -1),
        new Vector(-1, 1),
        new Vector(1, 0),
        new Vector(-1, 0),
        new Vector(0, 1),
        new Vector(0, -1)
    ]
    return directionStamp(directions, c);
})

checkMap.set(Type.king, function(c, grid){
    var moves = [
        new Vector(0, 1),
        new Vector(1, 1),
        new Vector(1, 0),
        new Vector(1, -1),
        new Vector(0, -1),
        new Vector(-1, -1),
        new Vector(-1, 0),
        new Vector(-1, 1),
    ]
    return movesStamp(moves, c);
})

function filterMovesOffBoard(moves, size, pos){
    var legalMoves = [];
    var aabb = new AABB(new Vector(), size.c().sub(new Vector(1, 1)))

    for(var move of moves){
        var ws = move.c().add(pos)
        if(aabb.collide(ws))legalMoves.push(move)
    }

    return legalMoves;
}

function directionStamp(directions, c){
    var aabb = new AABB(new Vector(), c.chessBoard.size.c().sub(new Vector(1,1)))
    var opens = Utils.create2dArray(c.chessBoard.size, false)
    for(var direction of directions){
        var currentCheckingPos = c.pos.c();
        while(true){
            currentCheckingPos.add(direction)
            if(aabb.collide(currentCheckingPos)){
                var piece = c.chessBoard.grid[currentCheckingPos.x][currentCheckingPos.y]
                if(piece == null)opens[currentCheckingPos.x][currentCheckingPos.y] = true
                else{
                    if(piece.team != c.team)opens[currentCheckingPos.x][currentCheckingPos.y] = true
                    break//break in both cases (if/else statement both break)
                }
            }else break
        }
    }
    return opens;
}

function movesStamp(moves, c){
    var aabb = new AABB(new Vector(), c.chessBoard.size.c().sub(new Vector(1,1)))
    var opens = Utils.create2dArray(c.chessBoard.size, false)
    for(var move of moves){
        var currentCheckingPos = c.pos.c();
        currentCheckingPos.add(move)

        if(aabb.collide(currentCheckingPos)){
            var piece = c.chessBoard.grid[currentCheckingPos.x][currentCheckingPos.y]
            if(piece == null || piece.team != c.team)opens[currentCheckingPos.x][currentCheckingPos.y] = true
        }
    }
    return opens
}

var letterMap = []
letterMap[Type.bisshop] = 'B'
letterMap[Type.king] = 'K'
letterMap[Type.knight] = 'H'
letterMap[Type.pawn] = 'P'
letterMap[Type.queen] = 'Q'
letterMap[Type.rook] = 'R'

ChessPiece.Type = Type
ChessPiece.Team = Team
module.exports = ChessPiece
},{"./AABB":1,"./eventHandler":5,"./utils":7,"./vector":8}],4:[function(require,module,exports){
class WebIOC{
    constructor(socket){
        this.socket = socket;
        this.routeMap = {};
        this.socket.onmessage = (event) => {
            var data = event.data
            var parsedData = JSON.parse(data);
            if(this.routeMap[parsedData.route]){
                this.routeMap[parsedData.route](parsedData);
            }else{
                console.log('404: ' + parsedData.route);
            }
        }
    }

    on(route, action){//actions need to be passed using an arrow function or functions binded with .bind(this)
        this.routeMap[route] = action;
    }

    send(route, value){//value is object en geserialized
        value.route = route;
        if(this.socket.readyState==1){
          this.socket.send(JSON.stringify(value));
        }
    }

    onclose(){

    }

    close(){
        this.socket.close();
    }
}

module.exports = WebIOC
},{}],5:[function(require,module,exports){
class EventHandler{
    

    static trigger(event, data){
        if(EventHandler.eventMap.get(event) == null)return
        for(var callback of EventHandler.eventMap.get(event))callback(data)
    }

    static subscribe(event, callback){
        if(EventHandler.eventMap.get(event) == null)EventHandler.eventMap.set(event, [])
        EventHandler.eventMap.get(event).push(callback)
    }

    static detach(event, callback){
        var sublist = EventHandler.eventMap.get(event);
        for(var i = 0; i < sublist.length; i++){
            var callbackInMap = sublist[i];
            if(callbackInMap == callback){
                sublist.splice(i,1)
                return  
            }
        }
    }
}
EventHandler.eventMap = new Map();
module.exports = EventHandler
},{}],6:[function(require,module,exports){
var canvas = document.getElementById('canvas')
var ctxt = canvas.getContext('2d')
var lastUpdate = Date.now();
var dt;
var pi = Math.PI
var resetBtn = document.querySelector('#resetBtn')
var teamLabel = document.querySelector('#teamLabel')
var turnLabel = document.querySelector('#turnLabel')

var Vector = require('./Vector')
var Utils = require('./utils')
var EventHandler = require('./eventHandler')
var ChessPiece = require('./ChessPiece')
var ChessBoard = require('./ChessBoard')
var AABB = require('./AABB')
var WebIOC = require('./WebIOC')

var socket
if(window.location.href == 'http://localhost:8000/')socket = new WebSocket("ws://localhost:8000/");
else socket = new WebSocket("wss://paulchess.herokuapp.com/");
var webIOC = new WebIOC(socket);
var Team = ChessPiece.Team
var Type = ChessPiece.Type
var team
var canvasContainer = document.querySelector('#canvas-container')
canvas.width = canvasContainer.offsetWidth - 3
canvas.height = canvasContainer.offsetHeight - 100

var chessBoard = new ChessBoard();

setInterval(function(){
    var now = Date.now();
    dt = (now - lastUpdate) / 1000;
    lastUpdate = now;
    dt = Utils.min(dt, 1)
    update()
    draw();
    
}, 1000 / 60);
var halfsize = chessBoard.size.x * chessBoard.squareSize.x / 2
var offset = new Vector(Math.floor(canvas.width / 2 - halfsize), Math.floor(canvas.height / 2 - halfsize))
chessBoard.draw(ctxt, offset)


resetBtn.addEventListener('click', () =>{
    webIOC.send('reset', {})
})

webIOC.on('update', (data)=>{
    chessBoard = ChessBoard.deserialize(data.chessBoard)
    team = data.team
    teamLabel.innerHTML = Team[team]
    turnLabel.innerHTML = Team[chessBoard.turn]
    chessBoard.draw(ctxt, offset)
})

document.onmousedown = (evt) => {
    var aabb = new AABB(new Vector(), chessBoard.size.c().sub(new Vector(1,1)))
    var v = chessBoard.vectorToGridPos(getMousePos(canvas, evt).sub(offset))
    
    
    if(!aabb.collide(v)){
        chessBoard.selected = null;
    }else{
        var piece = chessBoard.grid[v.x][v.y]

        if(chessBoard.selected == null){
            if(piece && piece.team == chessBoard.turn && piece.team == team){
                chessBoard.selected = piece
            }
        }else{
            if(piece && piece.team == chessBoard.turn)chessBoard.selected = piece
            else{
                if(chessBoard.selected.isLegalMove(v)){
                    webIOC.send('move', {
                        from:chessBoard.selected.pos.serialize(),
                        to:v.serialize()
                    })
                }
                chessBoard.selected = null;
            }
        }
    }
    chessBoard.draw(ctxt, offset)
}

function update(){
}

function draw(){
    //ctxt.clearRect(0, 0, canvas.width, canvas.height);
}

function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return new Vector(evt.clientX - rect.left, evt.clientY - rect.top)
}
},{"./AABB":1,"./ChessBoard":2,"./ChessPiece":3,"./Vector":8,"./WebIOC":4,"./eventHandler":5,"./utils":7}],7:[function(require,module,exports){
var Vector = require('./vector')

class Utils{
    static map(val1, start1, stop1, start2, stop2){
        return start2 + (stop2 - start2) * ((val1 - start1) / (stop1 - start1))
    }

    static inRange(min ,max ,value){
        if(min > max){
            var temp = min;
            min = max;
            max = temp;
        }
        return value <= max && value >= min;
    }

    static min(a, b){
        if(a < b)return a;
        return b;
    }

    static max(a, b){
        if(a > b)return a;
        return b;
    }

    static clamp(val, min, max){
        return this.max(this.min(val, max), min)
    }

    static rangeContain(a1,a2,b1,b2){//as in does a enclose b----- so returns true if b is smaller in all ways
        return max(a1, a2) >= max(b1, b2) && min(a1,a2) <= max(b1,b2);
    }

    static create2dArray(v, fill){
        var rows = new Array(v.x)
        for(var i = 0; i < v.x; i++){
            rows[i] = new Array(v.y)
            for(var j = 0; j < v.y; j++){
                rows[i][j] = fill
            }
        }
        return rows;
    }

    
}

module.exports = Utils;
},{"./vector":8}],8:[function(require,module,exports){
class Vector{
    
    constructor(x = 0, y = 0){
        this.x = x;
        this.y = y;
    }

    add(vector){
        this.x += vector.x;
        this.y += vector.y;
        return this;
    }

    sub(vector){
        this.x -= vector.x;
        this.y -= vector.y;
        return this
    }

    length(){
        return Math.pow(this.x * this.x + this.y * this.y, 0.5);
    }

    normalize(){
        var length = this.length();
        return this.scale(1 / length)
    }

    scale(scalar){
        this.x *= scalar;
        this.y *= scalar
        return this;
    }

    rotate(r, origin = new Vector()){
        var offset = this.c().sub(origin)
        var x = offset.x * Math.cos(r) - offset.y * Math.sin(r)
        var y = offset.x * Math.sin(r) + offset.y * Math.cos(r)
        offset.x = x; offset.y = y;
        var back = offset.add(origin)
        this.x = back.x; this.y = back.y;
        return this;
    }

    lerp(vector, weigth){
        return this.scale(1 - weigth).add(vector.c().scale(weigth))
    }

    c(){
        return new Vector(this.x, this.y)
    }

    equals(v){
        if(v == null)return false
        return this.x == v.x && this.y == v.y;
    }

    set(vector){
        this.x = vector.x;
        this.y = vector.y;
        return this;
    }

    perpDot(vector){
        return Math.atan2( this.x * vector.y - this.y * vector.x, this.x * vector.x + this.y * vector.y )
    }

    draw(ctxt){
        var width = 10;var half = width / 2;
        ctxt.fillRect(this.x - half, this.y - half, width, width);
    }

    loop(callback){
        for(var x = 0; x < this.x; x++){
            for(var y = 0; y < this.y; y++){
                callback(new Vector(x, y));
            }
        }
    }

    serialize(){
        return {x:this.x, y:this.y}
    }

    static deserialize(object){
        return new Vector(object.x, object.y)
    }
}

module.exports = Vector;
},{}]},{},[6])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL1Byb2dyYW0gRmlsZXMvbm9kZWpzNjMvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjbGllbnQvanMvQUFCQi5qcyIsImNsaWVudC9qcy9DaGVzc0JvYXJkLmpzIiwiY2xpZW50L2pzL0NoZXNzUGllY2UuanMiLCJjbGllbnQvanMvV2ViSU9DLmpzIiwiY2xpZW50L2pzL2V2ZW50SGFuZGxlci5qcyIsImNsaWVudC9qcy9tYWluLmpzIiwiY2xpZW50L2pzL3V0aWxzLmpzIiwiY2xpZW50L2pzL3ZlY3Rvci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBWZWN0b3IgPSByZXF1aXJlKCcuL3ZlY3RvcicpXHJcbnZhciBVdGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKVxyXG5jbGFzcyBBQUJCe1xyXG4gICAgY29uc3RydWN0b3IocG9zLCBzaXplKXtcclxuICAgICAgICB0aGlzLnBvcyA9IHBvcztcclxuICAgICAgICB0aGlzLnNpemUgPSBzaXplO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBmcm9tVmVjdG9ycyhhKXtcclxuICAgICAgICB2YXIgc21hbGwgPSBhWzBdO1xyXG4gICAgICAgIHZhciBiaWcgPSBhW2EubGVuZ3RoIC0gMV07XHJcbiAgICAgICAgZm9yKHZhciB2IG9mIGEpe1xyXG4gICAgICAgICAgICBpZih2LnggPCBzbWFsbC54KXNtYWxsLnggPSB2Lng7XHJcbiAgICAgICAgICAgIGVsc2UgaWYodi54ID4gYmlnLngpYmlnLnggPSB2Lng7XHJcbiAgICAgICAgICAgIGlmKHYueSA8IHNtYWxsLnkpc21hbGwueSA9IHYueTtcclxuICAgICAgICAgICAgZWxzZSBpZih2LnkgPiBiaWcueSliaWcueSA9IHYueTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG5ldyBBQUJCKHNtYWxsLCBiaWcuc3ViKHNtYWxsKSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29udGFpbnMoYWFiYil7XHJcbiAgICAgICAgcmV0dXJuIFV0aWxzLnJhbmdlQ29udGFpbih0aGlzLnBvcy54LCB0aGlzLnNpemUueCArIHRoaXMucG9zLngsIGFhYmIucG9zLngsIGFhYmIuc2l6ZS54ICsgYWFiYi5wb3MueCkgXHJcbiAgICAgICAgJiYgVXRpbHMucmFuZ2VDb250YWluKHRoaXMucG9zLnksIHRoaXMuc2l6ZS55ICsgdGhpcy5wb3MueSwgYWFiYi5wb3MueSwgYWFiYi5zaXplLnkgKyBhYWJiLnBvcy55KVxyXG4gICAgfVxyXG5cclxuICAgIGNvbGxpZGUodil7XHJcbiAgICAgICAgcmV0dXJuIFV0aWxzLmluUmFuZ2UodGhpcy5wb3MueCwgdGhpcy5zaXplLnggKyB0aGlzLnBvcy54LCB2LngpICYmIFV0aWxzLmluUmFuZ2UodGhpcy5wb3MueSwgdGhpcy5zaXplLnkgKyB0aGlzLnBvcy55LCB2LnkpXHJcbiAgICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQUFCQiIsInZhciBWZWN0b3IgPSByZXF1aXJlKCcuL3ZlY3RvcicpXHJcbnZhciBVdGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKVxyXG52YXIgQUFCQiA9IHJlcXVpcmUoJy4vQUFCQicpXHJcbnZhciBDaGVzc1BpZWNlID0gcmVxdWlyZSgnLi9DaGVzc1BpZWNlJylcclxudmFyIFRlYW0gPSBDaGVzc1BpZWNlLlRlYW1cclxuXHJcbmNsYXNzIENoZXNzQm9hcmR7XHJcblxyXG4gICAgY29uc3RydWN0b3IoKXtcclxuICAgICAgICB0aGlzLmxhc3RNb3ZlID0gbnVsbDtcclxuICAgICAgICB0aGlzLmxhc3RNb3ZlVG8gPSBudWxsO1xyXG4gICAgICAgIHRoaXMuc2l6ZSA9IG5ldyBWZWN0b3IoOCw4KVxyXG4gICAgICAgIHRoaXMuc3F1YXJlU2l6ZSA9IG5ldyBWZWN0b3IoNTAsIDUwKVxyXG4gICAgICAgIHRoaXMudHVybiA9IFRlYW0uV2hpdGVcclxuICAgICAgICB0aGlzLmdyaWQgPSBVdGlscy5jcmVhdGUyZEFycmF5KHRoaXMuc2l6ZSwgbnVsbCk7XHJcbiAgICB9XHJcblxyXG4gICAgdHJ5RnJvbVRvKGZyb20sIHRvKXtcclxuICAgICAgICB2YXIgZnJvbVBpZWNlID0gdGhpcy5ncmlkW2Zyb20ueF1bZnJvbS55XS8vY291bGQgb3V0b2ZyYW5nZSBmcm9tIGJhZGNsaWVudFxyXG4gICAgICAgIHJldHVybiBmcm9tUGllY2UudHJ5TW92ZSh0bylcclxuICAgIH1cclxuXHJcbiAgICBkcmF3KGN0eHQsIG9mZnNldCl7XHJcbiAgICAgICAgXHJcbiAgICAgICAgdmFyIGxlZ2Fsc1Nwb3RzO1xyXG4gICAgICAgIGlmKHRoaXMuc2VsZWN0ZWQpbGVnYWxzU3BvdHMgPSB0aGlzLnNlbGVjdGVkLnBvc0NoZWNrZXIodGhpcy5zZWxlY3RlZCwgdGhpcylcclxuICAgICAgICB0aGlzLnNpemUubG9vcCgodikgPT57XHJcbiAgICAgICAgICAgIGlmKCh2LnggKyB2LnkpICUgMiA9PSAwKWN0eHQuZmlsbFN0eWxlID0gXCIjZmZmXCJcclxuICAgICAgICAgICAgZWxzZSBjdHh0LmZpbGxTdHlsZSA9IFwiIzAwMFwiXHJcbiAgICAgICAgICAgIGlmKHRoaXMuc2VsZWN0ZWQgJiYgdi5lcXVhbHModGhpcy5zZWxlY3RlZC5wb3MpKWN0eHQuZmlsbFN0eWxlID0gXCIjMGZmXCJcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGlmKHRoaXMubGFzdE1vdmUgJiYgdi5lcXVhbHModGhpcy5sYXN0TW92ZSkpe1xyXG4gICAgICAgICAgICAgICAgY3R4dC5maWxsU3R5bGUgPSBcIiM0MDRcIlxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmKHRoaXMubGFzdE1vdmVUbyAmJiB2LmVxdWFscyh0aGlzLmxhc3RNb3ZlVG8pKXtcclxuICAgICAgICAgICAgICAgIGN0eHQuZmlsbFN0eWxlID0gXCIjYTBhXCJcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZih0aGlzLnNlbGVjdGVkICYmIGxlZ2Fsc1Nwb3RzW3YueF1bdi55XSljdHh0LmZpbGxTdHlsZSA9IFwiI2YwMFwiXHJcbiAgICAgICAgICAgIGN0eHQuZmlsbFJlY3Qodi54ICogdGhpcy5zcXVhcmVTaXplLnggKyBvZmZzZXQueCwgdi55ICogdGhpcy5zcXVhcmVTaXplLnkgKyBvZmZzZXQueSwgdGhpcy5zcXVhcmVTaXplLngsIHRoaXMuc3F1YXJlU2l6ZS55KVxyXG4gICAgICAgICAgICBpZih0aGlzLmdyaWRbdi54XVt2LnldKXtcclxuICAgICAgICAgICAgICAgIHRoaXMuZ3JpZFt2LnhdW3YueV0uZHJhdyhjdHh0LCB0aGlzLnNxdWFyZVNpemUsIG9mZnNldClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgdmVjdG9yVG9HcmlkUG9zKHYpe1xyXG4gICAgICAgIHZhciBuID0gbmV3IFZlY3RvcigpO1xyXG4gICAgICAgIG4ueCA9IE1hdGguZmxvb3Iodi54IC8gdGhpcy5zcXVhcmVTaXplLngpXHJcbiAgICAgICAgbi55ID0gTWF0aC5mbG9vcih2LnkgLyB0aGlzLnNxdWFyZVNpemUueSlcclxuICAgICAgICByZXR1cm4gbjtcclxuICAgIH1cclxuXHJcbiAgICBhZGQoYyl7XHJcbiAgICAgICAgdGhpcy5ncmlkW2MucG9zLnhdW2MucG9zLnldID0gYztcclxuICAgIH1cclxuXHJcbiAgICBzZXJpYWxpemUoKXtcclxuICAgICAgICB2YXIgZ3JpZCA9IFV0aWxzLmNyZWF0ZTJkQXJyYXkodGhpcy5zaXplLCBudWxsKVxyXG4gICAgICAgIHRoaXMuc2l6ZS5sb29wKCh2KSA9PiB7XHJcbiAgICAgICAgICAgIGlmKHRoaXMuZ3JpZFt2LnhdW3YueV0pZ3JpZFt2LnhdW3YueV0gPSB0aGlzLmdyaWRbdi54XVt2LnldLnNlcmlhbGl6ZSgpXHJcbiAgICAgICAgfSlcclxuICAgICAgICB2YXIgc2VsZWN0ZWQ7XHJcbiAgICAgICAgaWYodGhpcy5zZWxlY3RlZClzZWxlY3RlZCA9IHRoaXMuc2VsZWN0ZWQuc2VyaWFsaXplKClcclxuICAgICAgICB2YXIgbGFzdE1vdmU7XHJcbiAgICAgICAgaWYodGhpcy5sYXN0TW92ZSlsYXN0TW92ZSA9IHRoaXMubGFzdE1vdmUuc2VyaWFsaXplKClcclxuICAgICAgICB2YXIgbGFzdE1vdmVUbztcclxuICAgICAgICBpZih0aGlzLmxhc3RNb3ZlVG8pbGFzdE1vdmVUbyA9IHRoaXMubGFzdE1vdmVUby5zZXJpYWxpemUoKVxyXG4gICAgICAgIHZhciBzZXJpYWxpemVkID0ge1xyXG4gICAgICAgICAgICBzaXplOnRoaXMuc2l6ZS5zZXJpYWxpemUoKSxcclxuICAgICAgICAgICAgc3F1YXJlU2l6ZTp0aGlzLnNxdWFyZVNpemUuc2VyaWFsaXplKCksXHJcbiAgICAgICAgICAgIGdyaWQ6Z3JpZCxcclxuICAgICAgICAgICAgdHVybjp0aGlzLnR1cm4sXHJcbiAgICAgICAgICAgIHNlbGVjdGVkOnNlbGVjdGVkLFxyXG4gICAgICAgICAgICBsYXN0TW92ZTpsYXN0TW92ZSxcclxuICAgICAgICAgICAgbGFzdE1vdmVUbzpsYXN0TW92ZVRvXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBzZXJpYWxpemVkXHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGRlc2VyaWFsaXplKG9iamVjdCl7XHJcbiAgICAgICAgdmFyIGNoZXNzQm9hcmQgPSBuZXcgQ2hlc3NCb2FyZCgpXHJcbiAgICAgICAgdmFyIGdyaWQgPSBVdGlscy5jcmVhdGUyZEFycmF5KGNoZXNzQm9hcmQuc2l6ZSwgbnVsbClcclxuICAgICAgICBjaGVzc0JvYXJkLnNpemUubG9vcCgodikgPT4ge1xyXG4gICAgICAgICAgICBpZihvYmplY3QuZ3JpZFt2LnhdW3YueV0pZ3JpZFt2LnhdW3YueV0gPSBDaGVzc1BpZWNlLmRlc2VyaWFsaXplKG9iamVjdC5ncmlkW3YueF1bdi55XSwgY2hlc3NCb2FyZClcclxuICAgICAgICB9KVxyXG4gICAgICAgIGNoZXNzQm9hcmQuZ3JpZCA9IGdyaWRcclxuICAgICAgICBjaGVzc0JvYXJkLnR1cm4gPSBvYmplY3QudHVyblxyXG4gICAgICAgIGlmKG9iamVjdC5sYXN0TW92ZSljaGVzc0JvYXJkLmxhc3RNb3ZlID0gVmVjdG9yLmRlc2VyaWFsaXplKG9iamVjdC5sYXN0TW92ZSlcclxuICAgICAgICBpZihvYmplY3QubGFzdE1vdmVUbyljaGVzc0JvYXJkLmxhc3RNb3ZlVG8gPSBWZWN0b3IuZGVzZXJpYWxpemUob2JqZWN0Lmxhc3RNb3ZlVG8pXHJcbiAgICAgICAgaWYob2JqZWN0LnNlbGVjdGVkKWNoZXNzQm9hcmQuc2VsZWN0ZWQgPSBDaGVzc1BpZWNlLmRlc2VyaWFsaXplKG9iamVjdC5zZWxlY3RlZCwgY2hlc3NCb2FyZClcclxuICAgICAgICByZXR1cm4gY2hlc3NCb2FyZFxyXG4gICAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENoZXNzQm9hcmQiLCJ2YXIgVmVjdG9yID0gcmVxdWlyZSgnLi92ZWN0b3InKVxyXG52YXIgVXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJylcclxudmFyIEFBQkIgPSByZXF1aXJlKCcuL0FBQkInKVxyXG52YXIgRXZlbnRIYW5kbGVyID0gcmVxdWlyZSgnLi9ldmVudEhhbmRsZXInKVxyXG5cclxudmFyIFRlYW0gPSB7fVxyXG5UZWFtW1RlYW1bXCJCbGFja1wiXSA9IDBdID0gXCJCbGFja1wiOyBcclxuVGVhbVtUZWFtW1wiV2hpdGVcIl0gPSAxXSA9IFwiV2hpdGVcIjsgXHJcblxyXG52YXIgVHlwZSA9IHt9XHJcblR5cGVbVHlwZVtcInBhd25cIl0gPSAwXSA9IFwicGF3blwiOyBcclxuVHlwZVtUeXBlW1wicm9va1wiXSA9IDFdID0gXCJyb29rXCI7IFxyXG5UeXBlW1R5cGVbXCJrbmlnaHRcIl0gPSAyXSA9IFwia25pZ2h0XCI7IFxyXG5UeXBlW1R5cGVbXCJiaXNzaG9wXCJdID0gM10gPSBcImJpc3Nob3BcIjsgXHJcblR5cGVbVHlwZVtcInF1ZWVuXCJdID0gNF0gPSBcInF1ZWVuXCI7IFxyXG5UeXBlW1R5cGVbXCJraW5nXCJdID0gNV0gPSBcImtpbmdcIjsgXHJcblxyXG5jbGFzcyBDaGVzc1BpZWNle1xyXG4gICAgXHJcbiAgICBjb25zdHJ1Y3Rvcih0eXBlLCB0ZWFtLCBwb3MsIGNoZXNzQm9hcmQpe1xyXG4gICAgICAgIHRoaXMubW92ZWQgPSBmYWxzZVxyXG4gICAgICAgIHRoaXMucG9zID0gcG9zXHJcbiAgICAgICAgdGhpcy5jaGVzc0JvYXJkID0gY2hlc3NCb2FyZFxyXG4gICAgICAgIHRoaXMucG9zQ2hlY2tlciA9IGNoZWNrTWFwLmdldCh0eXBlKVxyXG4gICAgICAgIHRoaXMudHlwZSA9IHR5cGVcclxuICAgICAgICB0aGlzLnRlYW0gPSB0ZWFtXHJcbiAgICAgICAgXHJcbiAgICB9XHJcblxyXG4gICAgZHJhdyhjdHh0LCBzcXVhcmVTaXplLCBvZmZzZXQpe1xyXG4gICAgICAgIGN0eHQudGV4dEFsaWduID0gJ2NlbnRlcidcclxuICAgICAgICBjdHh0LnRleHRCYXNlbGluZSA9ICdtaWRkbGUnXHJcbiAgICAgICAgY3R4dC5zdHJva2VTdHlsZSA9ICcjMDAwJ1xyXG4gICAgICAgIGN0eHQuZmlsbFN0eWxlID0gJyNmZmYnXHJcbiAgICAgICAgaWYodGhpcy50ZWFtID09IFRlYW0uQmxhY2spe1xyXG4gICAgICAgICAgICBjdHh0LnN0cm9rZVN0eWxlID0gJyNmZmYnXHJcbiAgICAgICAgICAgIGN0eHQuZmlsbFN0eWxlID0gJyMwMDAnXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBzaXplID0gMzBcclxuICAgICAgICB2YXIgaGFsZnNpemUgPSBzaXplIC8gMlxyXG4gICAgICAgIGN0eHQuc3Ryb2tlUmVjdChvZmZzZXQueCArIDAuNSArIHRoaXMucG9zLnggKiBzcXVhcmVTaXplLnggKyBzcXVhcmVTaXplLnggLyAyIC0gaGFsZnNpemUsIG9mZnNldC55ICsgMC41ICsgdGhpcy5wb3MueSAqIHNxdWFyZVNpemUueSArIHNxdWFyZVNpemUueSAvIDIgLSBoYWxmc2l6ZSwgc2l6ZSwgc2l6ZSlcclxuICAgICAgICBjdHh0LmZpbGxSZWN0KG9mZnNldC54ICsgMSArIHRoaXMucG9zLnggKiBzcXVhcmVTaXplLnggKyBzcXVhcmVTaXplLnggLyAyIC0gaGFsZnNpemUsIG9mZnNldC55ICsgMSArIHRoaXMucG9zLnkgKiBzcXVhcmVTaXplLnkgKyBzcXVhcmVTaXplLnkgLyAyIC0gaGFsZnNpemUsIHNpemUgLSAxLCBzaXplIC0gMSlcclxuICAgICAgICBpZih0aGlzLnRlYW0gPT0gVGVhbS5CbGFjayljdHh0LmZpbGxTdHlsZSA9ICcjZmZmJ1xyXG4gICAgICAgIGVsc2UgY3R4dC5maWxsU3R5bGUgPSAnIzAwMCdcclxuICAgICAgICBcclxuICAgICAgICBjdHh0LmZpbGxUZXh0KGxldHRlck1hcFt0aGlzLnR5cGVdLG9mZnNldC54ICsgdGhpcy5wb3MueCAqIHNxdWFyZVNpemUueCArIHNxdWFyZVNpemUueCAvIDIsIG9mZnNldC55ICsgdGhpcy5wb3MueSAqIHNxdWFyZVNpemUueSArIHNxdWFyZVNpemUueSAvIDIpXHJcbiAgICB9XHJcblxyXG4gICAgdHJ5TW92ZSh2KXsgICAgXHJcbiAgICAgICAgaWYodGhpcy5wb3NDaGVja2VyKHRoaXMsIHRoaXMuY2hlc3NCb2FyZClbdi54XVt2LnldKXtcclxuICAgICAgICAgICAgdGhpcy5jaGVzc0JvYXJkLmxhc3RNb3ZlID0gdGhpcy5wb3MuYygpXHJcbiAgICAgICAgICAgIHZhciBwaWVjZSA9IHRoaXMuY2hlc3NCb2FyZC5ncmlkW3YueF1bdi55XVxyXG4gICAgICAgICAgICBpZihwaWVjZSAmJiBwaWVjZS50eXBlID09IFR5cGUua2luZykgRXZlbnRIYW5kbGVyLnRyaWdnZXIoJ2dhbWVPdmVyJywgcGllY2UpXHJcbiAgICAgICAgICAgIHRoaXMuY2hlc3NCb2FyZC5ncmlkW3YueF1bdi55XSA9IHRoaXM7XHJcbiAgICAgICAgICAgIHRoaXMuY2hlc3NCb2FyZC5ncmlkW3RoaXMucG9zLnhdW3RoaXMucG9zLnldID0gbnVsbDtcclxuICAgICAgICAgICAgdGhpcy5jaGVzc0JvYXJkLmxhc3RNb3ZlVG8gPSB2LmMoKVxyXG4gICAgICAgICAgICB0aGlzLnBvcyA9IHY7XHJcbiAgICAgICAgICAgIHRoaXMubW92ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGlmKHRoaXMuY2hlc3NCb2FyZC50dXJuID09IFRlYW0uQmxhY2spdGhpcy5jaGVzc0JvYXJkLnR1cm4gPSBUZWFtLldoaXRlXHJcbiAgICAgICAgICAgIGVsc2UgdGhpcy5jaGVzc0JvYXJkLnR1cm4gPSBUZWFtLkJsYWNrXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgfVxyXG5cclxuICAgIGlzTGVnYWxNb3ZlKHYpe1xyXG4gICAgICAgIHJldHVybiB0aGlzLnBvc0NoZWNrZXIodGhpcywgdGhpcy5jaGVzc0JvYXJkKVt2LnhdW3YueV1cclxuICAgIH1cclxuXHJcbiAgICBzZXJpYWxpemUoKXtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICB0eXBlOnRoaXMudHlwZSxcclxuICAgICAgICAgICAgcG9zOnRoaXMucG9zLnNlcmlhbGl6ZSgpLFxyXG4gICAgICAgICAgICB0ZWFtOnRoaXMudGVhbSxcclxuICAgICAgICAgICAgbW92ZWQ6dGhpcy5tb3ZlZFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgZGVzZXJpYWxpemUob2JqZWN0LCBjaGVzc0JvYXJkKXtcclxuICAgICAgICB2YXIgYyA9IG5ldyBDaGVzc1BpZWNlKG9iamVjdC50eXBlLCBvYmplY3QudGVhbSwgVmVjdG9yLmRlc2VyaWFsaXplKG9iamVjdC5wb3MpLCBjaGVzc0JvYXJkKVxyXG4gICAgICAgIGMubW92ZWQgPSBvYmplY3QubW92ZWRcclxuICAgICAgICByZXR1cm4gY1xyXG4gICAgfVxyXG59XHJcblxyXG52YXIgY2hlY2tNYXAgPSBuZXcgTWFwKCk7XHJcblxyXG5jaGVja01hcC5zZXQoVHlwZS5wYXduLCBmdW5jdGlvbihjLCBib2FyZCl7XHJcbiAgICB2YXIgYWFiYiA9IG5ldyBBQUJCKG5ldyBWZWN0b3IoKSwgYm9hcmQuc2l6ZS5jKCkuc3ViKG5ldyBWZWN0b3IoMSwxKSkpXHJcbiAgICB2YXIgbW92ZXMgPSBbXTtcclxuICAgIHZhciBmYWNpbmc7XHJcbiAgICBpZihjLnRlYW0gPT0gVGVhbS5XaGl0ZSlmYWNpbmcgPSBuZXcgVmVjdG9yKDAsIC0xKVxyXG4gICAgZWxzZSBmYWNpbmcgPSBuZXcgVmVjdG9yKDAsIDEpXHJcbiAgICB2YXIgd3Nmcm9udCA9IGMucG9zLmMoKS5hZGQoZmFjaW5nKVxyXG4gICAgaWYoYWFiYi5jb2xsaWRlKHdzZnJvbnQpICYmIGJvYXJkLmdyaWRbd3Nmcm9udC54XVt3c2Zyb250LnldID09IG51bGwpbW92ZXMucHVzaChmYWNpbmcpXHJcblxyXG4gICAgdmFyIGZhckZyb250ID0gZmFjaW5nLmMoKS5zY2FsZSgyKVxyXG4gICAgdmFyIHdzRmFyRnJvbnQgPSBjLnBvcy5jKCkuYWRkKGZhckZyb250KVxyXG4gICAgaWYoIWMubW92ZWQgJiYgYWFiYi5jb2xsaWRlKHdzRmFyRnJvbnQpICYmIGJvYXJkLmdyaWRbd3NGYXJGcm9udC54XVt3c0ZhckZyb250LnldID09IG51bGwpbW92ZXMucHVzaChmYXJGcm9udClcclxuXHJcbiAgICB2YXIgd2VzdCA9IG5ldyBWZWN0b3IoMSwwKS5hZGQoZmFjaW5nKVxyXG4gICAgdmFyIHdzd2VzdCA9IHdlc3QuYygpLmFkZChjLnBvcylcclxuICAgIGlmKGFhYmIuY29sbGlkZSh3c3dlc3QpICYmIGJvYXJkLmdyaWRbd3N3ZXN0LnhdW3dzd2VzdC55XSAhPSBudWxsICYmIGJvYXJkLmdyaWRbd3N3ZXN0LnhdW3dzd2VzdC55XS50ZWFtICE9IGMudGVhbSkgbW92ZXMucHVzaCh3ZXN0KVxyXG4gICAgXHJcbiAgICB2YXIgZWFzdCA9IG5ldyBWZWN0b3IoLTEsMCkuYWRkKGZhY2luZylcclxuICAgIHZhciB3c2Vhc3QgPSBlYXN0LmMoKS5hZGQoYy5wb3MpXHJcbiAgICBpZihhYWJiLmNvbGxpZGUod3NlYXN0KSAmJiBib2FyZC5ncmlkW3dzZWFzdC54XVt3c2Vhc3QueV0gIT0gbnVsbCAmJiBib2FyZC5ncmlkW3dzZWFzdC54XVt3c2Vhc3QueV0udGVhbSAhPSBjLnRlYW0pIG1vdmVzLnB1c2goZWFzdClcclxuXHJcbiAgICByZXR1cm4gbW92ZXNTdGFtcChtb3ZlcywgYyk7XHJcbn0pXHJcblxyXG5jaGVja01hcC5zZXQoVHlwZS5yb29rLCBmdW5jdGlvbihjLCBncmlkKXtcclxuICAgIHZhciBkaXJlY3Rpb25zID0gW1xyXG4gICAgICAgIG5ldyBWZWN0b3IoMSwgMCksXHJcbiAgICAgICAgbmV3IFZlY3RvcigtMSwgMCksXHJcbiAgICAgICAgbmV3IFZlY3RvcigwLCAxKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDAsIC0xKVxyXG4gICAgXVxyXG4gICAgcmV0dXJuIGRpcmVjdGlvblN0YW1wKGRpcmVjdGlvbnMsIGMpO1xyXG59KVxyXG5cclxuY2hlY2tNYXAuc2V0KFR5cGUua25pZ2h0LCBmdW5jdGlvbihjLCBncmlkKXtcclxuICAgIHZhciBtb3ZlcyA9IFtcclxuICAgICAgICBuZXcgVmVjdG9yKDEsIC0yKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDIsIC0xKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDIsIDEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoMSwgMiksXHJcbiAgICAgICAgbmV3IFZlY3RvcigtMSwgMiksXHJcbiAgICAgICAgbmV3IFZlY3RvcigtMiwgMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigtMiwgLTEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTEsIC0yKVxyXG4gICAgXVxyXG4gICAgcmV0dXJuIG1vdmVzU3RhbXAobW92ZXMsIGMpO1xyXG59KVxyXG5cclxuY2hlY2tNYXAuc2V0KFR5cGUuYmlzc2hvcCwgZnVuY3Rpb24oYywgZ3JpZCl7XHJcbiAgICB2YXIgZGlyZWN0aW9ucyA9IFtcclxuICAgICAgICBuZXcgVmVjdG9yKDEsIDEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTEsIC0xKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDEsIC0xKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0xLCAxKVxyXG4gICAgXVxyXG4gICAgcmV0dXJuIGRpcmVjdGlvblN0YW1wKGRpcmVjdGlvbnMsIGMpO1xyXG59KVxyXG5cclxuY2hlY2tNYXAuc2V0KFR5cGUucXVlZW4sIGZ1bmN0aW9uKGMpe1xyXG4gICAgdmFyIGRpcmVjdGlvbnMgPSBbXHJcbiAgICAgICAgbmV3IFZlY3RvcigxLCAxKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0xLCAtMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigxLCAtMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigtMSwgMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigxLCAwKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0xLCAwKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDAsIDEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoMCwgLTEpXHJcbiAgICBdXHJcbiAgICByZXR1cm4gZGlyZWN0aW9uU3RhbXAoZGlyZWN0aW9ucywgYyk7XHJcbn0pXHJcblxyXG5jaGVja01hcC5zZXQoVHlwZS5raW5nLCBmdW5jdGlvbihjLCBncmlkKXtcclxuICAgIHZhciBtb3ZlcyA9IFtcclxuICAgICAgICBuZXcgVmVjdG9yKDAsIDEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoMSwgMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigxLCAwKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDEsIC0xKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDAsIC0xKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0xLCAtMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigtMSwgMCksXHJcbiAgICAgICAgbmV3IFZlY3RvcigtMSwgMSksXHJcbiAgICBdXHJcbiAgICByZXR1cm4gbW92ZXNTdGFtcChtb3ZlcywgYyk7XHJcbn0pXHJcblxyXG5mdW5jdGlvbiBmaWx0ZXJNb3Zlc09mZkJvYXJkKG1vdmVzLCBzaXplLCBwb3Mpe1xyXG4gICAgdmFyIGxlZ2FsTW92ZXMgPSBbXTtcclxuICAgIHZhciBhYWJiID0gbmV3IEFBQkIobmV3IFZlY3RvcigpLCBzaXplLmMoKS5zdWIobmV3IFZlY3RvcigxLCAxKSkpXHJcblxyXG4gICAgZm9yKHZhciBtb3ZlIG9mIG1vdmVzKXtcclxuICAgICAgICB2YXIgd3MgPSBtb3ZlLmMoKS5hZGQocG9zKVxyXG4gICAgICAgIGlmKGFhYmIuY29sbGlkZSh3cykpbGVnYWxNb3Zlcy5wdXNoKG1vdmUpXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGxlZ2FsTW92ZXM7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRpcmVjdGlvblN0YW1wKGRpcmVjdGlvbnMsIGMpe1xyXG4gICAgdmFyIGFhYmIgPSBuZXcgQUFCQihuZXcgVmVjdG9yKCksIGMuY2hlc3NCb2FyZC5zaXplLmMoKS5zdWIobmV3IFZlY3RvcigxLDEpKSlcclxuICAgIHZhciBvcGVucyA9IFV0aWxzLmNyZWF0ZTJkQXJyYXkoYy5jaGVzc0JvYXJkLnNpemUsIGZhbHNlKVxyXG4gICAgZm9yKHZhciBkaXJlY3Rpb24gb2YgZGlyZWN0aW9ucyl7XHJcbiAgICAgICAgdmFyIGN1cnJlbnRDaGVja2luZ1BvcyA9IGMucG9zLmMoKTtcclxuICAgICAgICB3aGlsZSh0cnVlKXtcclxuICAgICAgICAgICAgY3VycmVudENoZWNraW5nUG9zLmFkZChkaXJlY3Rpb24pXHJcbiAgICAgICAgICAgIGlmKGFhYmIuY29sbGlkZShjdXJyZW50Q2hlY2tpbmdQb3MpKXtcclxuICAgICAgICAgICAgICAgIHZhciBwaWVjZSA9IGMuY2hlc3NCb2FyZC5ncmlkW2N1cnJlbnRDaGVja2luZ1Bvcy54XVtjdXJyZW50Q2hlY2tpbmdQb3MueV1cclxuICAgICAgICAgICAgICAgIGlmKHBpZWNlID09IG51bGwpb3BlbnNbY3VycmVudENoZWNraW5nUG9zLnhdW2N1cnJlbnRDaGVja2luZ1Bvcy55XSA9IHRydWVcclxuICAgICAgICAgICAgICAgIGVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYocGllY2UudGVhbSAhPSBjLnRlYW0pb3BlbnNbY3VycmVudENoZWNraW5nUG9zLnhdW2N1cnJlbnRDaGVja2luZ1Bvcy55XSA9IHRydWVcclxuICAgICAgICAgICAgICAgICAgICBicmVhay8vYnJlYWsgaW4gYm90aCBjYXNlcyAoaWYvZWxzZSBzdGF0ZW1lbnQgYm90aCBicmVhaylcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfWVsc2UgYnJlYWtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gb3BlbnM7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG1vdmVzU3RhbXAobW92ZXMsIGMpe1xyXG4gICAgdmFyIGFhYmIgPSBuZXcgQUFCQihuZXcgVmVjdG9yKCksIGMuY2hlc3NCb2FyZC5zaXplLmMoKS5zdWIobmV3IFZlY3RvcigxLDEpKSlcclxuICAgIHZhciBvcGVucyA9IFV0aWxzLmNyZWF0ZTJkQXJyYXkoYy5jaGVzc0JvYXJkLnNpemUsIGZhbHNlKVxyXG4gICAgZm9yKHZhciBtb3ZlIG9mIG1vdmVzKXtcclxuICAgICAgICB2YXIgY3VycmVudENoZWNraW5nUG9zID0gYy5wb3MuYygpO1xyXG4gICAgICAgIGN1cnJlbnRDaGVja2luZ1Bvcy5hZGQobW92ZSlcclxuXHJcbiAgICAgICAgaWYoYWFiYi5jb2xsaWRlKGN1cnJlbnRDaGVja2luZ1Bvcykpe1xyXG4gICAgICAgICAgICB2YXIgcGllY2UgPSBjLmNoZXNzQm9hcmQuZ3JpZFtjdXJyZW50Q2hlY2tpbmdQb3MueF1bY3VycmVudENoZWNraW5nUG9zLnldXHJcbiAgICAgICAgICAgIGlmKHBpZWNlID09IG51bGwgfHwgcGllY2UudGVhbSAhPSBjLnRlYW0pb3BlbnNbY3VycmVudENoZWNraW5nUG9zLnhdW2N1cnJlbnRDaGVja2luZ1Bvcy55XSA9IHRydWVcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gb3BlbnNcclxufVxyXG5cclxudmFyIGxldHRlck1hcCA9IFtdXHJcbmxldHRlck1hcFtUeXBlLmJpc3Nob3BdID0gJ0InXHJcbmxldHRlck1hcFtUeXBlLmtpbmddID0gJ0snXHJcbmxldHRlck1hcFtUeXBlLmtuaWdodF0gPSAnSCdcclxubGV0dGVyTWFwW1R5cGUucGF3bl0gPSAnUCdcclxubGV0dGVyTWFwW1R5cGUucXVlZW5dID0gJ1EnXHJcbmxldHRlck1hcFtUeXBlLnJvb2tdID0gJ1InXHJcblxyXG5DaGVzc1BpZWNlLlR5cGUgPSBUeXBlXHJcbkNoZXNzUGllY2UuVGVhbSA9IFRlYW1cclxubW9kdWxlLmV4cG9ydHMgPSBDaGVzc1BpZWNlIiwiY2xhc3MgV2ViSU9De1xyXG4gICAgY29uc3RydWN0b3Ioc29ja2V0KXtcclxuICAgICAgICB0aGlzLnNvY2tldCA9IHNvY2tldDtcclxuICAgICAgICB0aGlzLnJvdXRlTWFwID0ge307XHJcbiAgICAgICAgdGhpcy5zb2NrZXQub25tZXNzYWdlID0gKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgIHZhciBkYXRhID0gZXZlbnQuZGF0YVxyXG4gICAgICAgICAgICB2YXIgcGFyc2VkRGF0YSA9IEpTT04ucGFyc2UoZGF0YSk7XHJcbiAgICAgICAgICAgIGlmKHRoaXMucm91dGVNYXBbcGFyc2VkRGF0YS5yb3V0ZV0pe1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yb3V0ZU1hcFtwYXJzZWREYXRhLnJvdXRlXShwYXJzZWREYXRhKTtcclxuICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnNDA0OiAnICsgcGFyc2VkRGF0YS5yb3V0ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgb24ocm91dGUsIGFjdGlvbil7Ly9hY3Rpb25zIG5lZWQgdG8gYmUgcGFzc2VkIHVzaW5nIGFuIGFycm93IGZ1bmN0aW9uIG9yIGZ1bmN0aW9ucyBiaW5kZWQgd2l0aCAuYmluZCh0aGlzKVxyXG4gICAgICAgIHRoaXMucm91dGVNYXBbcm91dGVdID0gYWN0aW9uO1xyXG4gICAgfVxyXG5cclxuICAgIHNlbmQocm91dGUsIHZhbHVlKXsvL3ZhbHVlIGlzIG9iamVjdCBlbiBnZXNlcmlhbGl6ZWRcclxuICAgICAgICB2YWx1ZS5yb3V0ZSA9IHJvdXRlO1xyXG4gICAgICAgIGlmKHRoaXMuc29ja2V0LnJlYWR5U3RhdGU9PTEpe1xyXG4gICAgICAgICAgdGhpcy5zb2NrZXQuc2VuZChKU09OLnN0cmluZ2lmeSh2YWx1ZSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBvbmNsb3NlKCl7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGNsb3NlKCl7XHJcbiAgICAgICAgdGhpcy5zb2NrZXQuY2xvc2UoKTtcclxuICAgIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBXZWJJT0MiLCJjbGFzcyBFdmVudEhhbmRsZXJ7XHJcbiAgICBcclxuXHJcbiAgICBzdGF0aWMgdHJpZ2dlcihldmVudCwgZGF0YSl7XHJcbiAgICAgICAgaWYoRXZlbnRIYW5kbGVyLmV2ZW50TWFwLmdldChldmVudCkgPT0gbnVsbClyZXR1cm5cclxuICAgICAgICBmb3IodmFyIGNhbGxiYWNrIG9mIEV2ZW50SGFuZGxlci5ldmVudE1hcC5nZXQoZXZlbnQpKWNhbGxiYWNrKGRhdGEpXHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIHN1YnNjcmliZShldmVudCwgY2FsbGJhY2spe1xyXG4gICAgICAgIGlmKEV2ZW50SGFuZGxlci5ldmVudE1hcC5nZXQoZXZlbnQpID09IG51bGwpRXZlbnRIYW5kbGVyLmV2ZW50TWFwLnNldChldmVudCwgW10pXHJcbiAgICAgICAgRXZlbnRIYW5kbGVyLmV2ZW50TWFwLmdldChldmVudCkucHVzaChjYWxsYmFjaylcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgZGV0YWNoKGV2ZW50LCBjYWxsYmFjayl7XHJcbiAgICAgICAgdmFyIHN1Ymxpc3QgPSBFdmVudEhhbmRsZXIuZXZlbnRNYXAuZ2V0KGV2ZW50KTtcclxuICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgc3VibGlzdC5sZW5ndGg7IGkrKyl7XHJcbiAgICAgICAgICAgIHZhciBjYWxsYmFja0luTWFwID0gc3VibGlzdFtpXTtcclxuICAgICAgICAgICAgaWYoY2FsbGJhY2tJbk1hcCA9PSBjYWxsYmFjayl7XHJcbiAgICAgICAgICAgICAgICBzdWJsaXN0LnNwbGljZShpLDEpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gIFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcbkV2ZW50SGFuZGxlci5ldmVudE1hcCA9IG5ldyBNYXAoKTtcclxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEhhbmRsZXIiLCJ2YXIgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbnZhcycpXHJcbnZhciBjdHh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJylcclxudmFyIGxhc3RVcGRhdGUgPSBEYXRlLm5vdygpO1xyXG52YXIgZHQ7XHJcbnZhciBwaSA9IE1hdGguUElcclxudmFyIHJlc2V0QnRuID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3Jlc2V0QnRuJylcclxudmFyIHRlYW1MYWJlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyN0ZWFtTGFiZWwnKVxyXG52YXIgdHVybkxhYmVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3R1cm5MYWJlbCcpXHJcblxyXG52YXIgVmVjdG9yID0gcmVxdWlyZSgnLi9WZWN0b3InKVxyXG52YXIgVXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJylcclxudmFyIEV2ZW50SGFuZGxlciA9IHJlcXVpcmUoJy4vZXZlbnRIYW5kbGVyJylcclxudmFyIENoZXNzUGllY2UgPSByZXF1aXJlKCcuL0NoZXNzUGllY2UnKVxyXG52YXIgQ2hlc3NCb2FyZCA9IHJlcXVpcmUoJy4vQ2hlc3NCb2FyZCcpXHJcbnZhciBBQUJCID0gcmVxdWlyZSgnLi9BQUJCJylcclxudmFyIFdlYklPQyA9IHJlcXVpcmUoJy4vV2ViSU9DJylcclxuXHJcbnZhciBzb2NrZXRcclxuaWYod2luZG93LmxvY2F0aW9uLmhyZWYgPT0gJ2h0dHA6Ly9sb2NhbGhvc3Q6ODAwMC8nKXNvY2tldCA9IG5ldyBXZWJTb2NrZXQoXCJ3czovL2xvY2FsaG9zdDo4MDAwL1wiKTtcclxuZWxzZSBzb2NrZXQgPSBuZXcgV2ViU29ja2V0KFwid3NzOi8vcGF1bGNoZXNzLmhlcm9rdWFwcC5jb20vXCIpO1xyXG52YXIgd2ViSU9DID0gbmV3IFdlYklPQyhzb2NrZXQpO1xyXG52YXIgVGVhbSA9IENoZXNzUGllY2UuVGVhbVxyXG52YXIgVHlwZSA9IENoZXNzUGllY2UuVHlwZVxyXG52YXIgdGVhbVxyXG52YXIgY2FudmFzQ29udGFpbmVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2NhbnZhcy1jb250YWluZXInKVxyXG5jYW52YXMud2lkdGggPSBjYW52YXNDb250YWluZXIub2Zmc2V0V2lkdGggLSAzXHJcbmNhbnZhcy5oZWlnaHQgPSBjYW52YXNDb250YWluZXIub2Zmc2V0SGVpZ2h0IC0gMTAwXHJcblxyXG52YXIgY2hlc3NCb2FyZCA9IG5ldyBDaGVzc0JvYXJkKCk7XHJcblxyXG5zZXRJbnRlcnZhbChmdW5jdGlvbigpe1xyXG4gICAgdmFyIG5vdyA9IERhdGUubm93KCk7XHJcbiAgICBkdCA9IChub3cgLSBsYXN0VXBkYXRlKSAvIDEwMDA7XHJcbiAgICBsYXN0VXBkYXRlID0gbm93O1xyXG4gICAgZHQgPSBVdGlscy5taW4oZHQsIDEpXHJcbiAgICB1cGRhdGUoKVxyXG4gICAgZHJhdygpO1xyXG4gICAgXHJcbn0sIDEwMDAgLyA2MCk7XHJcbnZhciBoYWxmc2l6ZSA9IGNoZXNzQm9hcmQuc2l6ZS54ICogY2hlc3NCb2FyZC5zcXVhcmVTaXplLnggLyAyXHJcbnZhciBvZmZzZXQgPSBuZXcgVmVjdG9yKE1hdGguZmxvb3IoY2FudmFzLndpZHRoIC8gMiAtIGhhbGZzaXplKSwgTWF0aC5mbG9vcihjYW52YXMuaGVpZ2h0IC8gMiAtIGhhbGZzaXplKSlcclxuY2hlc3NCb2FyZC5kcmF3KGN0eHQsIG9mZnNldClcclxuXHJcblxyXG5yZXNldEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+e1xyXG4gICAgd2ViSU9DLnNlbmQoJ3Jlc2V0Jywge30pXHJcbn0pXHJcblxyXG53ZWJJT0Mub24oJ3VwZGF0ZScsIChkYXRhKT0+e1xyXG4gICAgY2hlc3NCb2FyZCA9IENoZXNzQm9hcmQuZGVzZXJpYWxpemUoZGF0YS5jaGVzc0JvYXJkKVxyXG4gICAgdGVhbSA9IGRhdGEudGVhbVxyXG4gICAgdGVhbUxhYmVsLmlubmVySFRNTCA9IFRlYW1bdGVhbV1cclxuICAgIHR1cm5MYWJlbC5pbm5lckhUTUwgPSBUZWFtW2NoZXNzQm9hcmQudHVybl1cclxuICAgIGNoZXNzQm9hcmQuZHJhdyhjdHh0LCBvZmZzZXQpXHJcbn0pXHJcblxyXG5kb2N1bWVudC5vbm1vdXNlZG93biA9IChldnQpID0+IHtcclxuICAgIHZhciBhYWJiID0gbmV3IEFBQkIobmV3IFZlY3RvcigpLCBjaGVzc0JvYXJkLnNpemUuYygpLnN1YihuZXcgVmVjdG9yKDEsMSkpKVxyXG4gICAgdmFyIHYgPSBjaGVzc0JvYXJkLnZlY3RvclRvR3JpZFBvcyhnZXRNb3VzZVBvcyhjYW52YXMsIGV2dCkuc3ViKG9mZnNldCkpXHJcbiAgICBcclxuICAgIFxyXG4gICAgaWYoIWFhYmIuY29sbGlkZSh2KSl7XHJcbiAgICAgICAgY2hlc3NCb2FyZC5zZWxlY3RlZCA9IG51bGw7XHJcbiAgICB9ZWxzZXtcclxuICAgICAgICB2YXIgcGllY2UgPSBjaGVzc0JvYXJkLmdyaWRbdi54XVt2LnldXHJcblxyXG4gICAgICAgIGlmKGNoZXNzQm9hcmQuc2VsZWN0ZWQgPT0gbnVsbCl7XHJcbiAgICAgICAgICAgIGlmKHBpZWNlICYmIHBpZWNlLnRlYW0gPT0gY2hlc3NCb2FyZC50dXJuICYmIHBpZWNlLnRlYW0gPT0gdGVhbSl7XHJcbiAgICAgICAgICAgICAgICBjaGVzc0JvYXJkLnNlbGVjdGVkID0gcGllY2VcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICBpZihwaWVjZSAmJiBwaWVjZS50ZWFtID09IGNoZXNzQm9hcmQudHVybiljaGVzc0JvYXJkLnNlbGVjdGVkID0gcGllY2VcclxuICAgICAgICAgICAgZWxzZXtcclxuICAgICAgICAgICAgICAgIGlmKGNoZXNzQm9hcmQuc2VsZWN0ZWQuaXNMZWdhbE1vdmUodikpe1xyXG4gICAgICAgICAgICAgICAgICAgIHdlYklPQy5zZW5kKCdtb3ZlJywge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmcm9tOmNoZXNzQm9hcmQuc2VsZWN0ZWQucG9zLnNlcmlhbGl6ZSgpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0bzp2LnNlcmlhbGl6ZSgpXHJcbiAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNoZXNzQm9hcmQuc2VsZWN0ZWQgPSBudWxsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgY2hlc3NCb2FyZC5kcmF3KGN0eHQsIG9mZnNldClcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlKCl7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyYXcoKXtcclxuICAgIC8vY3R4dC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0TW91c2VQb3MoY2FudmFzLCBldnQpIHtcclxuICAgIHZhciByZWN0ID0gY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gICAgcmV0dXJuIG5ldyBWZWN0b3IoZXZ0LmNsaWVudFggLSByZWN0LmxlZnQsIGV2dC5jbGllbnRZIC0gcmVjdC50b3ApXHJcbn0iLCJ2YXIgVmVjdG9yID0gcmVxdWlyZSgnLi92ZWN0b3InKVxyXG5cclxuY2xhc3MgVXRpbHN7XHJcbiAgICBzdGF0aWMgbWFwKHZhbDEsIHN0YXJ0MSwgc3RvcDEsIHN0YXJ0Miwgc3RvcDIpe1xyXG4gICAgICAgIHJldHVybiBzdGFydDIgKyAoc3RvcDIgLSBzdGFydDIpICogKCh2YWwxIC0gc3RhcnQxKSAvIChzdG9wMSAtIHN0YXJ0MSkpXHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGluUmFuZ2UobWluICxtYXggLHZhbHVlKXtcclxuICAgICAgICBpZihtaW4gPiBtYXgpe1xyXG4gICAgICAgICAgICB2YXIgdGVtcCA9IG1pbjtcclxuICAgICAgICAgICAgbWluID0gbWF4O1xyXG4gICAgICAgICAgICBtYXggPSB0ZW1wO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdmFsdWUgPD0gbWF4ICYmIHZhbHVlID49IG1pbjtcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgbWluKGEsIGIpe1xyXG4gICAgICAgIGlmKGEgPCBiKXJldHVybiBhO1xyXG4gICAgICAgIHJldHVybiBiO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBtYXgoYSwgYil7XHJcbiAgICAgICAgaWYoYSA+IGIpcmV0dXJuIGE7XHJcbiAgICAgICAgcmV0dXJuIGI7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGNsYW1wKHZhbCwgbWluLCBtYXgpe1xyXG4gICAgICAgIHJldHVybiB0aGlzLm1heCh0aGlzLm1pbih2YWwsIG1heCksIG1pbilcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgcmFuZ2VDb250YWluKGExLGEyLGIxLGIyKXsvL2FzIGluIGRvZXMgYSBlbmNsb3NlIGItLS0tLSBzbyByZXR1cm5zIHRydWUgaWYgYiBpcyBzbWFsbGVyIGluIGFsbCB3YXlzXHJcbiAgICAgICAgcmV0dXJuIG1heChhMSwgYTIpID49IG1heChiMSwgYjIpICYmIG1pbihhMSxhMikgPD0gbWF4KGIxLGIyKTtcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgY3JlYXRlMmRBcnJheSh2LCBmaWxsKXtcclxuICAgICAgICB2YXIgcm93cyA9IG5ldyBBcnJheSh2LngpXHJcbiAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IHYueDsgaSsrKXtcclxuICAgICAgICAgICAgcm93c1tpXSA9IG5ldyBBcnJheSh2LnkpXHJcbiAgICAgICAgICAgIGZvcih2YXIgaiA9IDA7IGogPCB2Lnk7IGorKyl7XHJcbiAgICAgICAgICAgICAgICByb3dzW2ldW2pdID0gZmlsbFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiByb3dzO1xyXG4gICAgfVxyXG5cclxuICAgIFxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFV0aWxzOyIsImNsYXNzIFZlY3RvcntcclxuICAgIFxyXG4gICAgY29uc3RydWN0b3IoeCA9IDAsIHkgPSAwKXtcclxuICAgICAgICB0aGlzLnggPSB4O1xyXG4gICAgICAgIHRoaXMueSA9IHk7XHJcbiAgICB9XHJcblxyXG4gICAgYWRkKHZlY3Rvcil7XHJcbiAgICAgICAgdGhpcy54ICs9IHZlY3Rvci54O1xyXG4gICAgICAgIHRoaXMueSArPSB2ZWN0b3IueTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBzdWIodmVjdG9yKXtcclxuICAgICAgICB0aGlzLnggLT0gdmVjdG9yLng7XHJcbiAgICAgICAgdGhpcy55IC09IHZlY3Rvci55O1xyXG4gICAgICAgIHJldHVybiB0aGlzXHJcbiAgICB9XHJcblxyXG4gICAgbGVuZ3RoKCl7XHJcbiAgICAgICAgcmV0dXJuIE1hdGgucG93KHRoaXMueCAqIHRoaXMueCArIHRoaXMueSAqIHRoaXMueSwgMC41KTtcclxuICAgIH1cclxuXHJcbiAgICBub3JtYWxpemUoKXtcclxuICAgICAgICB2YXIgbGVuZ3RoID0gdGhpcy5sZW5ndGgoKTtcclxuICAgICAgICByZXR1cm4gdGhpcy5zY2FsZSgxIC8gbGVuZ3RoKVxyXG4gICAgfVxyXG5cclxuICAgIHNjYWxlKHNjYWxhcil7XHJcbiAgICAgICAgdGhpcy54ICo9IHNjYWxhcjtcclxuICAgICAgICB0aGlzLnkgKj0gc2NhbGFyXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgcm90YXRlKHIsIG9yaWdpbiA9IG5ldyBWZWN0b3IoKSl7XHJcbiAgICAgICAgdmFyIG9mZnNldCA9IHRoaXMuYygpLnN1YihvcmlnaW4pXHJcbiAgICAgICAgdmFyIHggPSBvZmZzZXQueCAqIE1hdGguY29zKHIpIC0gb2Zmc2V0LnkgKiBNYXRoLnNpbihyKVxyXG4gICAgICAgIHZhciB5ID0gb2Zmc2V0LnggKiBNYXRoLnNpbihyKSArIG9mZnNldC55ICogTWF0aC5jb3MocilcclxuICAgICAgICBvZmZzZXQueCA9IHg7IG9mZnNldC55ID0geTtcclxuICAgICAgICB2YXIgYmFjayA9IG9mZnNldC5hZGQob3JpZ2luKVxyXG4gICAgICAgIHRoaXMueCA9IGJhY2sueDsgdGhpcy55ID0gYmFjay55O1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIGxlcnAodmVjdG9yLCB3ZWlndGgpe1xyXG4gICAgICAgIHJldHVybiB0aGlzLnNjYWxlKDEgLSB3ZWlndGgpLmFkZCh2ZWN0b3IuYygpLnNjYWxlKHdlaWd0aCkpXHJcbiAgICB9XHJcblxyXG4gICAgYygpe1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjdG9yKHRoaXMueCwgdGhpcy55KVxyXG4gICAgfVxyXG5cclxuICAgIGVxdWFscyh2KXtcclxuICAgICAgICBpZih2ID09IG51bGwpcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgcmV0dXJuIHRoaXMueCA9PSB2LnggJiYgdGhpcy55ID09IHYueTtcclxuICAgIH1cclxuXHJcbiAgICBzZXQodmVjdG9yKXtcclxuICAgICAgICB0aGlzLnggPSB2ZWN0b3IueDtcclxuICAgICAgICB0aGlzLnkgPSB2ZWN0b3IueTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBwZXJwRG90KHZlY3Rvcil7XHJcbiAgICAgICAgcmV0dXJuIE1hdGguYXRhbjIoIHRoaXMueCAqIHZlY3Rvci55IC0gdGhpcy55ICogdmVjdG9yLngsIHRoaXMueCAqIHZlY3Rvci54ICsgdGhpcy55ICogdmVjdG9yLnkgKVxyXG4gICAgfVxyXG5cclxuICAgIGRyYXcoY3R4dCl7XHJcbiAgICAgICAgdmFyIHdpZHRoID0gMTA7dmFyIGhhbGYgPSB3aWR0aCAvIDI7XHJcbiAgICAgICAgY3R4dC5maWxsUmVjdCh0aGlzLnggLSBoYWxmLCB0aGlzLnkgLSBoYWxmLCB3aWR0aCwgd2lkdGgpO1xyXG4gICAgfVxyXG5cclxuICAgIGxvb3AoY2FsbGJhY2spe1xyXG4gICAgICAgIGZvcih2YXIgeCA9IDA7IHggPCB0aGlzLng7IHgrKyl7XHJcbiAgICAgICAgICAgIGZvcih2YXIgeSA9IDA7IHkgPCB0aGlzLnk7IHkrKyl7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhuZXcgVmVjdG9yKHgsIHkpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBzZXJpYWxpemUoKXtcclxuICAgICAgICByZXR1cm4ge3g6dGhpcy54LCB5OnRoaXMueX1cclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgZGVzZXJpYWxpemUob2JqZWN0KXtcclxuICAgICAgICByZXR1cm4gbmV3IFZlY3RvcihvYmplY3QueCwgb2JqZWN0LnkpXHJcbiAgICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gVmVjdG9yOyJdfQ==
