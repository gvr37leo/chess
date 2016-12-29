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
        var serialized = {
            size:this.size.serialize(),
            squareSize:this.squareSize.serialize(),
            grid:grid,
            turn:this.turn,
            selected:selected,
            lastMove:lastMove
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL1Byb2dyYW0gRmlsZXMvbm9kZWpzNjMvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjbGllbnQvanMvQUFCQi5qcyIsImNsaWVudC9qcy9DaGVzc0JvYXJkLmpzIiwiY2xpZW50L2pzL0NoZXNzUGllY2UuanMiLCJjbGllbnQvanMvV2ViSU9DLmpzIiwiY2xpZW50L2pzL2V2ZW50SGFuZGxlci5qcyIsImNsaWVudC9qcy9tYWluLmpzIiwiY2xpZW50L2pzL3V0aWxzLmpzIiwiY2xpZW50L2pzL3ZlY3Rvci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBWZWN0b3IgPSByZXF1aXJlKCcuL3ZlY3RvcicpXHJcbnZhciBVdGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKVxyXG5jbGFzcyBBQUJCe1xyXG4gICAgY29uc3RydWN0b3IocG9zLCBzaXplKXtcclxuICAgICAgICB0aGlzLnBvcyA9IHBvcztcclxuICAgICAgICB0aGlzLnNpemUgPSBzaXplO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBmcm9tVmVjdG9ycyhhKXtcclxuICAgICAgICB2YXIgc21hbGwgPSBhWzBdO1xyXG4gICAgICAgIHZhciBiaWcgPSBhW2EubGVuZ3RoIC0gMV07XHJcbiAgICAgICAgZm9yKHZhciB2IG9mIGEpe1xyXG4gICAgICAgICAgICBpZih2LnggPCBzbWFsbC54KXNtYWxsLnggPSB2Lng7XHJcbiAgICAgICAgICAgIGVsc2UgaWYodi54ID4gYmlnLngpYmlnLnggPSB2Lng7XHJcbiAgICAgICAgICAgIGlmKHYueSA8IHNtYWxsLnkpc21hbGwueSA9IHYueTtcclxuICAgICAgICAgICAgZWxzZSBpZih2LnkgPiBiaWcueSliaWcueSA9IHYueTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG5ldyBBQUJCKHNtYWxsLCBiaWcuc3ViKHNtYWxsKSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29udGFpbnMoYWFiYil7XHJcbiAgICAgICAgcmV0dXJuIFV0aWxzLnJhbmdlQ29udGFpbih0aGlzLnBvcy54LCB0aGlzLnNpemUueCArIHRoaXMucG9zLngsIGFhYmIucG9zLngsIGFhYmIuc2l6ZS54ICsgYWFiYi5wb3MueCkgXHJcbiAgICAgICAgJiYgVXRpbHMucmFuZ2VDb250YWluKHRoaXMucG9zLnksIHRoaXMuc2l6ZS55ICsgdGhpcy5wb3MueSwgYWFiYi5wb3MueSwgYWFiYi5zaXplLnkgKyBhYWJiLnBvcy55KVxyXG4gICAgfVxyXG5cclxuICAgIGNvbGxpZGUodil7XHJcbiAgICAgICAgcmV0dXJuIFV0aWxzLmluUmFuZ2UodGhpcy5wb3MueCwgdGhpcy5zaXplLnggKyB0aGlzLnBvcy54LCB2LngpICYmIFV0aWxzLmluUmFuZ2UodGhpcy5wb3MueSwgdGhpcy5zaXplLnkgKyB0aGlzLnBvcy55LCB2LnkpXHJcbiAgICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQUFCQiIsInZhciBWZWN0b3IgPSByZXF1aXJlKCcuL3ZlY3RvcicpXHJcbnZhciBVdGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKVxyXG52YXIgQUFCQiA9IHJlcXVpcmUoJy4vQUFCQicpXHJcbnZhciBDaGVzc1BpZWNlID0gcmVxdWlyZSgnLi9DaGVzc1BpZWNlJylcclxudmFyIFRlYW0gPSBDaGVzc1BpZWNlLlRlYW1cclxuXHJcbmNsYXNzIENoZXNzQm9hcmR7XHJcblxyXG4gICAgY29uc3RydWN0b3IoKXtcclxuICAgICAgICB0aGlzLmxhc3RNb3ZlID0gbnVsbDtcclxuICAgICAgICB0aGlzLnNpemUgPSBuZXcgVmVjdG9yKDgsOClcclxuICAgICAgICB0aGlzLnNxdWFyZVNpemUgPSBuZXcgVmVjdG9yKDUwLCA1MClcclxuICAgICAgICB0aGlzLnR1cm4gPSBUZWFtLldoaXRlXHJcbiAgICAgICAgdGhpcy5ncmlkID0gVXRpbHMuY3JlYXRlMmRBcnJheSh0aGlzLnNpemUsIG51bGwpO1xyXG4gICAgfVxyXG5cclxuICAgIHRyeUZyb21Ubyhmcm9tLCB0byl7XHJcbiAgICAgICAgdmFyIGZyb21QaWVjZSA9IHRoaXMuZ3JpZFtmcm9tLnhdW2Zyb20ueV0vL2NvdWxkIG91dG9mcmFuZ2UgZnJvbSBiYWRjbGllbnRcclxuICAgICAgICByZXR1cm4gZnJvbVBpZWNlLnRyeU1vdmUodG8pXHJcbiAgICB9XHJcblxyXG4gICAgZHJhdyhjdHh0LCBvZmZzZXQpe1xyXG4gICAgICAgIFxyXG4gICAgICAgIHZhciBsZWdhbHNTcG90cztcclxuICAgICAgICBpZih0aGlzLnNlbGVjdGVkKWxlZ2Fsc1Nwb3RzID0gdGhpcy5zZWxlY3RlZC5wb3NDaGVja2VyKHRoaXMuc2VsZWN0ZWQsIHRoaXMpXHJcbiAgICAgICAgdGhpcy5zaXplLmxvb3AoKHYpID0+e1xyXG4gICAgICAgICAgICBpZigodi54ICsgdi55KSAlIDIgPT0gMCljdHh0LmZpbGxTdHlsZSA9IFwiI2ZmZlwiXHJcbiAgICAgICAgICAgIGVsc2UgY3R4dC5maWxsU3R5bGUgPSBcIiMwMDBcIlxyXG4gICAgICAgICAgICBpZih0aGlzLnNlbGVjdGVkICYmIHYuZXF1YWxzKHRoaXMuc2VsZWN0ZWQucG9zKSljdHh0LmZpbGxTdHlsZSA9IFwiIzBmZlwiXHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpZih0aGlzLmxhc3RNb3ZlICYmIHYuZXF1YWxzKHRoaXMubGFzdE1vdmUpKXtcclxuICAgICAgICAgICAgICAgIGN0eHQuZmlsbFN0eWxlID0gXCIjNDA0XCJcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZih0aGlzLnNlbGVjdGVkICYmIGxlZ2Fsc1Nwb3RzW3YueF1bdi55XSljdHh0LmZpbGxTdHlsZSA9IFwiI2YwMFwiXHJcbiAgICAgICAgICAgIGN0eHQuZmlsbFJlY3Qodi54ICogdGhpcy5zcXVhcmVTaXplLnggKyBvZmZzZXQueCwgdi55ICogdGhpcy5zcXVhcmVTaXplLnkgKyBvZmZzZXQueSwgdGhpcy5zcXVhcmVTaXplLngsIHRoaXMuc3F1YXJlU2l6ZS55KVxyXG4gICAgICAgICAgICBpZih0aGlzLmdyaWRbdi54XVt2LnldKXtcclxuICAgICAgICAgICAgICAgIHRoaXMuZ3JpZFt2LnhdW3YueV0uZHJhdyhjdHh0LCB0aGlzLnNxdWFyZVNpemUsIG9mZnNldClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgdmVjdG9yVG9HcmlkUG9zKHYpe1xyXG4gICAgICAgIHZhciBuID0gbmV3IFZlY3RvcigpO1xyXG4gICAgICAgIG4ueCA9IE1hdGguZmxvb3Iodi54IC8gdGhpcy5zcXVhcmVTaXplLngpXHJcbiAgICAgICAgbi55ID0gTWF0aC5mbG9vcih2LnkgLyB0aGlzLnNxdWFyZVNpemUueSlcclxuICAgICAgICByZXR1cm4gbjtcclxuICAgIH1cclxuXHJcbiAgICBhZGQoYyl7XHJcbiAgICAgICAgdGhpcy5ncmlkW2MucG9zLnhdW2MucG9zLnldID0gYztcclxuICAgIH1cclxuXHJcbiAgICBzZXJpYWxpemUoKXtcclxuICAgICAgICB2YXIgZ3JpZCA9IFV0aWxzLmNyZWF0ZTJkQXJyYXkodGhpcy5zaXplLCBudWxsKVxyXG4gICAgICAgIHRoaXMuc2l6ZS5sb29wKCh2KSA9PiB7XHJcbiAgICAgICAgICAgIGlmKHRoaXMuZ3JpZFt2LnhdW3YueV0pZ3JpZFt2LnhdW3YueV0gPSB0aGlzLmdyaWRbdi54XVt2LnldLnNlcmlhbGl6ZSgpXHJcbiAgICAgICAgfSlcclxuICAgICAgICB2YXIgc2VsZWN0ZWQ7XHJcbiAgICAgICAgaWYodGhpcy5zZWxlY3RlZClzZWxlY3RlZCA9IHRoaXMuc2VsZWN0ZWQuc2VyaWFsaXplKClcclxuICAgICAgICB2YXIgbGFzdE1vdmU7XHJcbiAgICAgICAgaWYodGhpcy5sYXN0TW92ZSlsYXN0TW92ZSA9IHRoaXMubGFzdE1vdmUuc2VyaWFsaXplKClcclxuICAgICAgICB2YXIgc2VyaWFsaXplZCA9IHtcclxuICAgICAgICAgICAgc2l6ZTp0aGlzLnNpemUuc2VyaWFsaXplKCksXHJcbiAgICAgICAgICAgIHNxdWFyZVNpemU6dGhpcy5zcXVhcmVTaXplLnNlcmlhbGl6ZSgpLFxyXG4gICAgICAgICAgICBncmlkOmdyaWQsXHJcbiAgICAgICAgICAgIHR1cm46dGhpcy50dXJuLFxyXG4gICAgICAgICAgICBzZWxlY3RlZDpzZWxlY3RlZCxcclxuICAgICAgICAgICAgbGFzdE1vdmU6bGFzdE1vdmVcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHNlcmlhbGl6ZWRcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgZGVzZXJpYWxpemUob2JqZWN0KXtcclxuICAgICAgICB2YXIgY2hlc3NCb2FyZCA9IG5ldyBDaGVzc0JvYXJkKClcclxuICAgICAgICB2YXIgZ3JpZCA9IFV0aWxzLmNyZWF0ZTJkQXJyYXkoY2hlc3NCb2FyZC5zaXplLCBudWxsKVxyXG4gICAgICAgIGNoZXNzQm9hcmQuc2l6ZS5sb29wKCh2KSA9PiB7XHJcbiAgICAgICAgICAgIGlmKG9iamVjdC5ncmlkW3YueF1bdi55XSlncmlkW3YueF1bdi55XSA9IENoZXNzUGllY2UuZGVzZXJpYWxpemUob2JqZWN0LmdyaWRbdi54XVt2LnldLCBjaGVzc0JvYXJkKVxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgY2hlc3NCb2FyZC5ncmlkID0gZ3JpZFxyXG4gICAgICAgIGNoZXNzQm9hcmQudHVybiA9IG9iamVjdC50dXJuXHJcbiAgICAgICAgaWYob2JqZWN0Lmxhc3RNb3ZlKWNoZXNzQm9hcmQubGFzdE1vdmUgPSBWZWN0b3IuZGVzZXJpYWxpemUob2JqZWN0Lmxhc3RNb3ZlKVxyXG4gICAgICAgIGlmKG9iamVjdC5zZWxlY3RlZCljaGVzc0JvYXJkLnNlbGVjdGVkID0gQ2hlc3NQaWVjZS5kZXNlcmlhbGl6ZShvYmplY3Quc2VsZWN0ZWQsIGNoZXNzQm9hcmQpXHJcbiAgICAgICAgcmV0dXJuIGNoZXNzQm9hcmRcclxuICAgIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDaGVzc0JvYXJkIiwidmFyIFZlY3RvciA9IHJlcXVpcmUoJy4vdmVjdG9yJylcclxudmFyIFV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpXHJcbnZhciBBQUJCID0gcmVxdWlyZSgnLi9BQUJCJylcclxudmFyIEV2ZW50SGFuZGxlciA9IHJlcXVpcmUoJy4vZXZlbnRIYW5kbGVyJylcclxuXHJcbnZhciBUZWFtID0ge31cclxuVGVhbVtUZWFtW1wiQmxhY2tcIl0gPSAwXSA9IFwiQmxhY2tcIjsgXHJcblRlYW1bVGVhbVtcIldoaXRlXCJdID0gMV0gPSBcIldoaXRlXCI7IFxyXG5cclxudmFyIFR5cGUgPSB7fVxyXG5UeXBlW1R5cGVbXCJwYXduXCJdID0gMF0gPSBcInBhd25cIjsgXHJcblR5cGVbVHlwZVtcInJvb2tcIl0gPSAxXSA9IFwicm9va1wiOyBcclxuVHlwZVtUeXBlW1wia25pZ2h0XCJdID0gMl0gPSBcImtuaWdodFwiOyBcclxuVHlwZVtUeXBlW1wiYmlzc2hvcFwiXSA9IDNdID0gXCJiaXNzaG9wXCI7IFxyXG5UeXBlW1R5cGVbXCJxdWVlblwiXSA9IDRdID0gXCJxdWVlblwiOyBcclxuVHlwZVtUeXBlW1wia2luZ1wiXSA9IDVdID0gXCJraW5nXCI7IFxyXG5cclxuY2xhc3MgQ2hlc3NQaWVjZXtcclxuICAgIFxyXG4gICAgY29uc3RydWN0b3IodHlwZSwgdGVhbSwgcG9zLCBjaGVzc0JvYXJkKXtcclxuICAgICAgICB0aGlzLm1vdmVkID0gZmFsc2VcclxuICAgICAgICB0aGlzLnBvcyA9IHBvc1xyXG4gICAgICAgIHRoaXMuY2hlc3NCb2FyZCA9IGNoZXNzQm9hcmRcclxuICAgICAgICB0aGlzLnBvc0NoZWNrZXIgPSBjaGVja01hcC5nZXQodHlwZSlcclxuICAgICAgICB0aGlzLnR5cGUgPSB0eXBlXHJcbiAgICAgICAgdGhpcy50ZWFtID0gdGVhbVxyXG4gICAgICAgIFxyXG4gICAgfVxyXG5cclxuICAgIGRyYXcoY3R4dCwgc3F1YXJlU2l6ZSwgb2Zmc2V0KXtcclxuICAgICAgICBjdHh0LnRleHRBbGlnbiA9ICdjZW50ZXInXHJcbiAgICAgICAgY3R4dC50ZXh0QmFzZWxpbmUgPSAnbWlkZGxlJ1xyXG4gICAgICAgIGN0eHQuc3Ryb2tlU3R5bGUgPSAnIzAwMCdcclxuICAgICAgICBjdHh0LmZpbGxTdHlsZSA9ICcjZmZmJ1xyXG4gICAgICAgIGlmKHRoaXMudGVhbSA9PSBUZWFtLkJsYWNrKXtcclxuICAgICAgICAgICAgY3R4dC5zdHJva2VTdHlsZSA9ICcjZmZmJ1xyXG4gICAgICAgICAgICBjdHh0LmZpbGxTdHlsZSA9ICcjMDAwJ1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgc2l6ZSA9IDMwXHJcbiAgICAgICAgdmFyIGhhbGZzaXplID0gc2l6ZSAvIDJcclxuICAgICAgICBjdHh0LnN0cm9rZVJlY3Qob2Zmc2V0LnggKyAwLjUgKyB0aGlzLnBvcy54ICogc3F1YXJlU2l6ZS54ICsgc3F1YXJlU2l6ZS54IC8gMiAtIGhhbGZzaXplLCBvZmZzZXQueSArIDAuNSArIHRoaXMucG9zLnkgKiBzcXVhcmVTaXplLnkgKyBzcXVhcmVTaXplLnkgLyAyIC0gaGFsZnNpemUsIHNpemUsIHNpemUpXHJcbiAgICAgICAgY3R4dC5maWxsUmVjdChvZmZzZXQueCArIDEgKyB0aGlzLnBvcy54ICogc3F1YXJlU2l6ZS54ICsgc3F1YXJlU2l6ZS54IC8gMiAtIGhhbGZzaXplLCBvZmZzZXQueSArIDEgKyB0aGlzLnBvcy55ICogc3F1YXJlU2l6ZS55ICsgc3F1YXJlU2l6ZS55IC8gMiAtIGhhbGZzaXplLCBzaXplIC0gMSwgc2l6ZSAtIDEpXHJcbiAgICAgICAgaWYodGhpcy50ZWFtID09IFRlYW0uQmxhY2spY3R4dC5maWxsU3R5bGUgPSAnI2ZmZidcclxuICAgICAgICBlbHNlIGN0eHQuZmlsbFN0eWxlID0gJyMwMDAnXHJcbiAgICAgICAgXHJcbiAgICAgICAgY3R4dC5maWxsVGV4dChsZXR0ZXJNYXBbdGhpcy50eXBlXSxvZmZzZXQueCArIHRoaXMucG9zLnggKiBzcXVhcmVTaXplLnggKyBzcXVhcmVTaXplLnggLyAyLCBvZmZzZXQueSArIHRoaXMucG9zLnkgKiBzcXVhcmVTaXplLnkgKyBzcXVhcmVTaXplLnkgLyAyKVxyXG4gICAgfVxyXG5cclxuICAgIHRyeU1vdmUodil7ICAgIFxyXG4gICAgICAgIGlmKHRoaXMucG9zQ2hlY2tlcih0aGlzLCB0aGlzLmNoZXNzQm9hcmQpW3YueF1bdi55XSl7XHJcbiAgICAgICAgICAgIHRoaXMuY2hlc3NCb2FyZC5sYXN0TW92ZSA9IHRoaXMucG9zLmMoKVxyXG4gICAgICAgICAgICB2YXIgcGllY2UgPSB0aGlzLmNoZXNzQm9hcmQuZ3JpZFt2LnhdW3YueV1cclxuICAgICAgICAgICAgaWYocGllY2UgJiYgcGllY2UudHlwZSA9PSBUeXBlLmtpbmcpIEV2ZW50SGFuZGxlci50cmlnZ2VyKCdnYW1lT3ZlcicsIHBpZWNlKVxyXG4gICAgICAgICAgICB0aGlzLmNoZXNzQm9hcmQuZ3JpZFt2LnhdW3YueV0gPSB0aGlzO1xyXG4gICAgICAgICAgICB0aGlzLmNoZXNzQm9hcmQuZ3JpZFt0aGlzLnBvcy54XVt0aGlzLnBvcy55XSA9IG51bGw7XHJcbiAgICAgICAgICAgIHRoaXMucG9zID0gdjtcclxuICAgICAgICAgICAgdGhpcy5tb3ZlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYodGhpcy5jaGVzc0JvYXJkLnR1cm4gPT0gVGVhbS5CbGFjayl0aGlzLmNoZXNzQm9hcmQudHVybiA9IFRlYW0uV2hpdGVcclxuICAgICAgICAgICAgZWxzZSB0aGlzLmNoZXNzQm9hcmQudHVybiA9IFRlYW0uQmxhY2tcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgaXNMZWdhbE1vdmUodil7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMucG9zQ2hlY2tlcih0aGlzLCB0aGlzLmNoZXNzQm9hcmQpW3YueF1bdi55XVxyXG4gICAgfVxyXG5cclxuICAgIHNlcmlhbGl6ZSgpe1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHR5cGU6dGhpcy50eXBlLFxyXG4gICAgICAgICAgICBwb3M6dGhpcy5wb3Muc2VyaWFsaXplKCksXHJcbiAgICAgICAgICAgIHRlYW06dGhpcy50ZWFtLFxyXG4gICAgICAgICAgICBtb3ZlZDp0aGlzLm1vdmVkXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBkZXNlcmlhbGl6ZShvYmplY3QsIGNoZXNzQm9hcmQpe1xyXG4gICAgICAgIHZhciBjID0gbmV3IENoZXNzUGllY2Uob2JqZWN0LnR5cGUsIG9iamVjdC50ZWFtLCBWZWN0b3IuZGVzZXJpYWxpemUob2JqZWN0LnBvcyksIGNoZXNzQm9hcmQpXHJcbiAgICAgICAgYy5tb3ZlZCA9IG9iamVjdC5tb3ZlZFxyXG4gICAgICAgIHJldHVybiBjXHJcbiAgICB9XHJcbn1cclxuXHJcbnZhciBjaGVja01hcCA9IG5ldyBNYXAoKTtcclxuXHJcbmNoZWNrTWFwLnNldChUeXBlLnBhd24sIGZ1bmN0aW9uKGMsIGJvYXJkKXtcclxuICAgIHZhciBhYWJiID0gbmV3IEFBQkIobmV3IFZlY3RvcigpLCBib2FyZC5zaXplLmMoKS5zdWIobmV3IFZlY3RvcigxLDEpKSlcclxuICAgIHZhciBtb3ZlcyA9IFtdO1xyXG4gICAgdmFyIGZhY2luZztcclxuICAgIGlmKGMudGVhbSA9PSBUZWFtLldoaXRlKWZhY2luZyA9IG5ldyBWZWN0b3IoMCwgLTEpXHJcbiAgICBlbHNlIGZhY2luZyA9IG5ldyBWZWN0b3IoMCwgMSlcclxuICAgIHZhciB3c2Zyb250ID0gYy5wb3MuYygpLmFkZChmYWNpbmcpXHJcbiAgICBpZihhYWJiLmNvbGxpZGUod3Nmcm9udCkgJiYgYm9hcmQuZ3JpZFt3c2Zyb250LnhdW3dzZnJvbnQueV0gPT0gbnVsbCltb3Zlcy5wdXNoKGZhY2luZylcclxuXHJcbiAgICB2YXIgZmFyRnJvbnQgPSBmYWNpbmcuYygpLnNjYWxlKDIpXHJcbiAgICB2YXIgd3NGYXJGcm9udCA9IGMucG9zLmMoKS5hZGQoZmFyRnJvbnQpXHJcbiAgICBpZighYy5tb3ZlZCAmJiBhYWJiLmNvbGxpZGUod3NGYXJGcm9udCkgJiYgYm9hcmQuZ3JpZFt3c0ZhckZyb250LnhdW3dzRmFyRnJvbnQueV0gPT0gbnVsbCltb3Zlcy5wdXNoKGZhckZyb250KVxyXG5cclxuICAgIHZhciB3ZXN0ID0gbmV3IFZlY3RvcigxLDApLmFkZChmYWNpbmcpXHJcbiAgICB2YXIgd3N3ZXN0ID0gd2VzdC5jKCkuYWRkKGMucG9zKVxyXG4gICAgaWYoYWFiYi5jb2xsaWRlKHdzd2VzdCkgJiYgYm9hcmQuZ3JpZFt3c3dlc3QueF1bd3N3ZXN0LnldICE9IG51bGwgJiYgYm9hcmQuZ3JpZFt3c3dlc3QueF1bd3N3ZXN0LnldLnRlYW0gIT0gYy50ZWFtKSBtb3Zlcy5wdXNoKHdlc3QpXHJcbiAgICBcclxuICAgIHZhciBlYXN0ID0gbmV3IFZlY3RvcigtMSwwKS5hZGQoZmFjaW5nKVxyXG4gICAgdmFyIHdzZWFzdCA9IGVhc3QuYygpLmFkZChjLnBvcylcclxuICAgIGlmKGFhYmIuY29sbGlkZSh3c2Vhc3QpICYmIGJvYXJkLmdyaWRbd3NlYXN0LnhdW3dzZWFzdC55XSAhPSBudWxsICYmIGJvYXJkLmdyaWRbd3NlYXN0LnhdW3dzZWFzdC55XS50ZWFtICE9IGMudGVhbSkgbW92ZXMucHVzaChlYXN0KVxyXG5cclxuICAgIHJldHVybiBtb3Zlc1N0YW1wKG1vdmVzLCBjKTtcclxufSlcclxuXHJcbmNoZWNrTWFwLnNldChUeXBlLnJvb2ssIGZ1bmN0aW9uKGMsIGdyaWQpe1xyXG4gICAgdmFyIGRpcmVjdGlvbnMgPSBbXHJcbiAgICAgICAgbmV3IFZlY3RvcigxLCAwKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0xLCAwKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDAsIDEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoMCwgLTEpXHJcbiAgICBdXHJcbiAgICByZXR1cm4gZGlyZWN0aW9uU3RhbXAoZGlyZWN0aW9ucywgYyk7XHJcbn0pXHJcblxyXG5jaGVja01hcC5zZXQoVHlwZS5rbmlnaHQsIGZ1bmN0aW9uKGMsIGdyaWQpe1xyXG4gICAgdmFyIG1vdmVzID0gW1xyXG4gICAgICAgIG5ldyBWZWN0b3IoMSwgLTIpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoMiwgLTEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoMiwgMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigxLCAyKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0xLCAyKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0yLCAxKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0yLCAtMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigtMSwgLTIpXHJcbiAgICBdXHJcbiAgICByZXR1cm4gbW92ZXNTdGFtcChtb3ZlcywgYyk7XHJcbn0pXHJcblxyXG5jaGVja01hcC5zZXQoVHlwZS5iaXNzaG9wLCBmdW5jdGlvbihjLCBncmlkKXtcclxuICAgIHZhciBkaXJlY3Rpb25zID0gW1xyXG4gICAgICAgIG5ldyBWZWN0b3IoMSwgMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigtMSwgLTEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoMSwgLTEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTEsIDEpXHJcbiAgICBdXHJcbiAgICByZXR1cm4gZGlyZWN0aW9uU3RhbXAoZGlyZWN0aW9ucywgYyk7XHJcbn0pXHJcblxyXG5jaGVja01hcC5zZXQoVHlwZS5xdWVlbiwgZnVuY3Rpb24oYyl7XHJcbiAgICB2YXIgZGlyZWN0aW9ucyA9IFtcclxuICAgICAgICBuZXcgVmVjdG9yKDEsIDEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTEsIC0xKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDEsIC0xKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0xLCAxKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDEsIDApLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTEsIDApLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoMCwgMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigwLCAtMSlcclxuICAgIF1cclxuICAgIHJldHVybiBkaXJlY3Rpb25TdGFtcChkaXJlY3Rpb25zLCBjKTtcclxufSlcclxuXHJcbmNoZWNrTWFwLnNldChUeXBlLmtpbmcsIGZ1bmN0aW9uKGMsIGdyaWQpe1xyXG4gICAgdmFyIG1vdmVzID0gW1xyXG4gICAgICAgIG5ldyBWZWN0b3IoMCwgMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigxLCAxKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDEsIDApLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoMSwgLTEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoMCwgLTEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTEsIC0xKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0xLCAwKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0xLCAxKSxcclxuICAgIF1cclxuICAgIHJldHVybiBtb3Zlc1N0YW1wKG1vdmVzLCBjKTtcclxufSlcclxuXHJcbmZ1bmN0aW9uIGZpbHRlck1vdmVzT2ZmQm9hcmQobW92ZXMsIHNpemUsIHBvcyl7XHJcbiAgICB2YXIgbGVnYWxNb3ZlcyA9IFtdO1xyXG4gICAgdmFyIGFhYmIgPSBuZXcgQUFCQihuZXcgVmVjdG9yKCksIHNpemUuYygpLnN1YihuZXcgVmVjdG9yKDEsIDEpKSlcclxuXHJcbiAgICBmb3IodmFyIG1vdmUgb2YgbW92ZXMpe1xyXG4gICAgICAgIHZhciB3cyA9IG1vdmUuYygpLmFkZChwb3MpXHJcbiAgICAgICAgaWYoYWFiYi5jb2xsaWRlKHdzKSlsZWdhbE1vdmVzLnB1c2gobW92ZSlcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbGVnYWxNb3ZlcztcclxufVxyXG5cclxuZnVuY3Rpb24gZGlyZWN0aW9uU3RhbXAoZGlyZWN0aW9ucywgYyl7XHJcbiAgICB2YXIgYWFiYiA9IG5ldyBBQUJCKG5ldyBWZWN0b3IoKSwgYy5jaGVzc0JvYXJkLnNpemUuYygpLnN1YihuZXcgVmVjdG9yKDEsMSkpKVxyXG4gICAgdmFyIG9wZW5zID0gVXRpbHMuY3JlYXRlMmRBcnJheShjLmNoZXNzQm9hcmQuc2l6ZSwgZmFsc2UpXHJcbiAgICBmb3IodmFyIGRpcmVjdGlvbiBvZiBkaXJlY3Rpb25zKXtcclxuICAgICAgICB2YXIgY3VycmVudENoZWNraW5nUG9zID0gYy5wb3MuYygpO1xyXG4gICAgICAgIHdoaWxlKHRydWUpe1xyXG4gICAgICAgICAgICBjdXJyZW50Q2hlY2tpbmdQb3MuYWRkKGRpcmVjdGlvbilcclxuICAgICAgICAgICAgaWYoYWFiYi5jb2xsaWRlKGN1cnJlbnRDaGVja2luZ1Bvcykpe1xyXG4gICAgICAgICAgICAgICAgdmFyIHBpZWNlID0gYy5jaGVzc0JvYXJkLmdyaWRbY3VycmVudENoZWNraW5nUG9zLnhdW2N1cnJlbnRDaGVja2luZ1Bvcy55XVxyXG4gICAgICAgICAgICAgICAgaWYocGllY2UgPT0gbnVsbClvcGVuc1tjdXJyZW50Q2hlY2tpbmdQb3MueF1bY3VycmVudENoZWNraW5nUG9zLnldID0gdHJ1ZVxyXG4gICAgICAgICAgICAgICAgZWxzZXtcclxuICAgICAgICAgICAgICAgICAgICBpZihwaWVjZS50ZWFtICE9IGMudGVhbSlvcGVuc1tjdXJyZW50Q2hlY2tpbmdQb3MueF1bY3VycmVudENoZWNraW5nUG9zLnldID0gdHJ1ZVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrLy9icmVhayBpbiBib3RoIGNhc2VzIChpZi9lbHNlIHN0YXRlbWVudCBib3RoIGJyZWFrKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9ZWxzZSBicmVha1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBvcGVucztcclxufVxyXG5cclxuZnVuY3Rpb24gbW92ZXNTdGFtcChtb3ZlcywgYyl7XHJcbiAgICB2YXIgYWFiYiA9IG5ldyBBQUJCKG5ldyBWZWN0b3IoKSwgYy5jaGVzc0JvYXJkLnNpemUuYygpLnN1YihuZXcgVmVjdG9yKDEsMSkpKVxyXG4gICAgdmFyIG9wZW5zID0gVXRpbHMuY3JlYXRlMmRBcnJheShjLmNoZXNzQm9hcmQuc2l6ZSwgZmFsc2UpXHJcbiAgICBmb3IodmFyIG1vdmUgb2YgbW92ZXMpe1xyXG4gICAgICAgIHZhciBjdXJyZW50Q2hlY2tpbmdQb3MgPSBjLnBvcy5jKCk7XHJcbiAgICAgICAgY3VycmVudENoZWNraW5nUG9zLmFkZChtb3ZlKVxyXG5cclxuICAgICAgICBpZihhYWJiLmNvbGxpZGUoY3VycmVudENoZWNraW5nUG9zKSl7XHJcbiAgICAgICAgICAgIHZhciBwaWVjZSA9IGMuY2hlc3NCb2FyZC5ncmlkW2N1cnJlbnRDaGVja2luZ1Bvcy54XVtjdXJyZW50Q2hlY2tpbmdQb3MueV1cclxuICAgICAgICAgICAgaWYocGllY2UgPT0gbnVsbCB8fCBwaWVjZS50ZWFtICE9IGMudGVhbSlvcGVuc1tjdXJyZW50Q2hlY2tpbmdQb3MueF1bY3VycmVudENoZWNraW5nUG9zLnldID0gdHJ1ZVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBvcGVuc1xyXG59XHJcblxyXG52YXIgbGV0dGVyTWFwID0gW11cclxubGV0dGVyTWFwW1R5cGUuYmlzc2hvcF0gPSAnQidcclxubGV0dGVyTWFwW1R5cGUua2luZ10gPSAnSydcclxubGV0dGVyTWFwW1R5cGUua25pZ2h0XSA9ICdIJ1xyXG5sZXR0ZXJNYXBbVHlwZS5wYXduXSA9ICdQJ1xyXG5sZXR0ZXJNYXBbVHlwZS5xdWVlbl0gPSAnUSdcclxubGV0dGVyTWFwW1R5cGUucm9va10gPSAnUidcclxuXHJcbkNoZXNzUGllY2UuVHlwZSA9IFR5cGVcclxuQ2hlc3NQaWVjZS5UZWFtID0gVGVhbVxyXG5tb2R1bGUuZXhwb3J0cyA9IENoZXNzUGllY2UiLCJjbGFzcyBXZWJJT0N7XHJcbiAgICBjb25zdHJ1Y3Rvcihzb2NrZXQpe1xyXG4gICAgICAgIHRoaXMuc29ja2V0ID0gc29ja2V0O1xyXG4gICAgICAgIHRoaXMucm91dGVNYXAgPSB7fTtcclxuICAgICAgICB0aGlzLnNvY2tldC5vbm1lc3NhZ2UgPSAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgdmFyIGRhdGEgPSBldmVudC5kYXRhXHJcbiAgICAgICAgICAgIHZhciBwYXJzZWREYXRhID0gSlNPTi5wYXJzZShkYXRhKTtcclxuICAgICAgICAgICAgaWYodGhpcy5yb3V0ZU1hcFtwYXJzZWREYXRhLnJvdXRlXSl7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJvdXRlTWFwW3BhcnNlZERhdGEucm91dGVdKHBhcnNlZERhdGEpO1xyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCc0MDQ6ICcgKyBwYXJzZWREYXRhLnJvdXRlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBvbihyb3V0ZSwgYWN0aW9uKXsvL2FjdGlvbnMgbmVlZCB0byBiZSBwYXNzZWQgdXNpbmcgYW4gYXJyb3cgZnVuY3Rpb24gb3IgZnVuY3Rpb25zIGJpbmRlZCB3aXRoIC5iaW5kKHRoaXMpXHJcbiAgICAgICAgdGhpcy5yb3V0ZU1hcFtyb3V0ZV0gPSBhY3Rpb247XHJcbiAgICB9XHJcblxyXG4gICAgc2VuZChyb3V0ZSwgdmFsdWUpey8vdmFsdWUgaXMgb2JqZWN0IGVuIGdlc2VyaWFsaXplZFxyXG4gICAgICAgIHZhbHVlLnJvdXRlID0gcm91dGU7XHJcbiAgICAgICAgaWYodGhpcy5zb2NrZXQucmVhZHlTdGF0ZT09MSl7XHJcbiAgICAgICAgICB0aGlzLnNvY2tldC5zZW5kKEpTT04uc3RyaW5naWZ5KHZhbHVlKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIG9uY2xvc2UoKXtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgY2xvc2UoKXtcclxuICAgICAgICB0aGlzLnNvY2tldC5jbG9zZSgpO1xyXG4gICAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFdlYklPQyIsImNsYXNzIEV2ZW50SGFuZGxlcntcclxuICAgIFxyXG5cclxuICAgIHN0YXRpYyB0cmlnZ2VyKGV2ZW50LCBkYXRhKXtcclxuICAgICAgICBpZihFdmVudEhhbmRsZXIuZXZlbnRNYXAuZ2V0KGV2ZW50KSA9PSBudWxsKXJldHVyblxyXG4gICAgICAgIGZvcih2YXIgY2FsbGJhY2sgb2YgRXZlbnRIYW5kbGVyLmV2ZW50TWFwLmdldChldmVudCkpY2FsbGJhY2soZGF0YSlcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgc3Vic2NyaWJlKGV2ZW50LCBjYWxsYmFjayl7XHJcbiAgICAgICAgaWYoRXZlbnRIYW5kbGVyLmV2ZW50TWFwLmdldChldmVudCkgPT0gbnVsbClFdmVudEhhbmRsZXIuZXZlbnRNYXAuc2V0KGV2ZW50LCBbXSlcclxuICAgICAgICBFdmVudEhhbmRsZXIuZXZlbnRNYXAuZ2V0KGV2ZW50KS5wdXNoKGNhbGxiYWNrKVxyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBkZXRhY2goZXZlbnQsIGNhbGxiYWNrKXtcclxuICAgICAgICB2YXIgc3VibGlzdCA9IEV2ZW50SGFuZGxlci5ldmVudE1hcC5nZXQoZXZlbnQpO1xyXG4gICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBzdWJsaXN0Lmxlbmd0aDsgaSsrKXtcclxuICAgICAgICAgICAgdmFyIGNhbGxiYWNrSW5NYXAgPSBzdWJsaXN0W2ldO1xyXG4gICAgICAgICAgICBpZihjYWxsYmFja0luTWFwID09IGNhbGxiYWNrKXtcclxuICAgICAgICAgICAgICAgIHN1Ymxpc3Quc3BsaWNlKGksMSlcclxuICAgICAgICAgICAgICAgIHJldHVybiAgXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuRXZlbnRIYW5kbGVyLmV2ZW50TWFwID0gbmV3IE1hcCgpO1xyXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50SGFuZGxlciIsInZhciBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzJylcclxudmFyIGN0eHQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKVxyXG52YXIgbGFzdFVwZGF0ZSA9IERhdGUubm93KCk7XHJcbnZhciBkdDtcclxudmFyIHBpID0gTWF0aC5QSVxyXG52YXIgcmVzZXRCdG4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcmVzZXRCdG4nKVxyXG52YXIgdGVhbUxhYmVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3RlYW1MYWJlbCcpXHJcbnZhciB0dXJuTGFiZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjdHVybkxhYmVsJylcclxuXHJcbnZhciBWZWN0b3IgPSByZXF1aXJlKCcuL1ZlY3RvcicpXHJcbnZhciBVdGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKVxyXG52YXIgRXZlbnRIYW5kbGVyID0gcmVxdWlyZSgnLi9ldmVudEhhbmRsZXInKVxyXG52YXIgQ2hlc3NQaWVjZSA9IHJlcXVpcmUoJy4vQ2hlc3NQaWVjZScpXHJcbnZhciBDaGVzc0JvYXJkID0gcmVxdWlyZSgnLi9DaGVzc0JvYXJkJylcclxudmFyIEFBQkIgPSByZXF1aXJlKCcuL0FBQkInKVxyXG52YXIgV2ViSU9DID0gcmVxdWlyZSgnLi9XZWJJT0MnKVxyXG5cclxudmFyIHNvY2tldFxyXG5pZih3aW5kb3cubG9jYXRpb24uaHJlZiA9PSAnaHR0cDovL2xvY2FsaG9zdDo4MDAwLycpc29ja2V0ID0gbmV3IFdlYlNvY2tldChcIndzOi8vbG9jYWxob3N0OjgwMDAvXCIpO1xyXG5lbHNlIHNvY2tldCA9IG5ldyBXZWJTb2NrZXQoXCJ3c3M6Ly9wYXVsY2hlc3MuaGVyb2t1YXBwLmNvbS9cIik7XHJcbnZhciB3ZWJJT0MgPSBuZXcgV2ViSU9DKHNvY2tldCk7XHJcbnZhciBUZWFtID0gQ2hlc3NQaWVjZS5UZWFtXHJcbnZhciBUeXBlID0gQ2hlc3NQaWVjZS5UeXBlXHJcbnZhciB0ZWFtXHJcbnZhciBjYW52YXNDb250YWluZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjY2FudmFzLWNvbnRhaW5lcicpXHJcbmNhbnZhcy53aWR0aCA9IGNhbnZhc0NvbnRhaW5lci5vZmZzZXRXaWR0aCAtIDNcclxuY2FudmFzLmhlaWdodCA9IGNhbnZhc0NvbnRhaW5lci5vZmZzZXRIZWlnaHQgLSAxMDBcclxuXHJcbnZhciBjaGVzc0JvYXJkID0gbmV3IENoZXNzQm9hcmQoKTtcclxuXHJcbnNldEludGVydmFsKGZ1bmN0aW9uKCl7XHJcbiAgICB2YXIgbm93ID0gRGF0ZS5ub3coKTtcclxuICAgIGR0ID0gKG5vdyAtIGxhc3RVcGRhdGUpIC8gMTAwMDtcclxuICAgIGxhc3RVcGRhdGUgPSBub3c7XHJcbiAgICBkdCA9IFV0aWxzLm1pbihkdCwgMSlcclxuICAgIHVwZGF0ZSgpXHJcbiAgICBkcmF3KCk7XHJcbiAgICBcclxufSwgMTAwMCAvIDYwKTtcclxudmFyIGhhbGZzaXplID0gY2hlc3NCb2FyZC5zaXplLnggKiBjaGVzc0JvYXJkLnNxdWFyZVNpemUueCAvIDJcclxudmFyIG9mZnNldCA9IG5ldyBWZWN0b3IoTWF0aC5mbG9vcihjYW52YXMud2lkdGggLyAyIC0gaGFsZnNpemUpLCBNYXRoLmZsb29yKGNhbnZhcy5oZWlnaHQgLyAyIC0gaGFsZnNpemUpKVxyXG5jaGVzc0JvYXJkLmRyYXcoY3R4dCwgb2Zmc2V0KVxyXG5cclxuXHJcbnJlc2V0QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT57XHJcbiAgICB3ZWJJT0Muc2VuZCgncmVzZXQnLCB7fSlcclxufSlcclxuXHJcbndlYklPQy5vbigndXBkYXRlJywgKGRhdGEpPT57XHJcbiAgICBjaGVzc0JvYXJkID0gQ2hlc3NCb2FyZC5kZXNlcmlhbGl6ZShkYXRhLmNoZXNzQm9hcmQpXHJcbiAgICB0ZWFtID0gZGF0YS50ZWFtXHJcbiAgICB0ZWFtTGFiZWwuaW5uZXJIVE1MID0gVGVhbVt0ZWFtXVxyXG4gICAgdHVybkxhYmVsLmlubmVySFRNTCA9IFRlYW1bY2hlc3NCb2FyZC50dXJuXVxyXG4gICAgY2hlc3NCb2FyZC5kcmF3KGN0eHQsIG9mZnNldClcclxufSlcclxuXHJcbmRvY3VtZW50Lm9ubW91c2Vkb3duID0gKGV2dCkgPT4ge1xyXG4gICAgdmFyIGFhYmIgPSBuZXcgQUFCQihuZXcgVmVjdG9yKCksIGNoZXNzQm9hcmQuc2l6ZS5jKCkuc3ViKG5ldyBWZWN0b3IoMSwxKSkpXHJcbiAgICB2YXIgdiA9IGNoZXNzQm9hcmQudmVjdG9yVG9HcmlkUG9zKGdldE1vdXNlUG9zKGNhbnZhcywgZXZ0KS5zdWIob2Zmc2V0KSlcclxuICAgIFxyXG4gICAgXHJcbiAgICBpZighYWFiYi5jb2xsaWRlKHYpKXtcclxuICAgICAgICBjaGVzc0JvYXJkLnNlbGVjdGVkID0gbnVsbDtcclxuICAgIH1lbHNle1xyXG4gICAgICAgIHZhciBwaWVjZSA9IGNoZXNzQm9hcmQuZ3JpZFt2LnhdW3YueV1cclxuXHJcbiAgICAgICAgaWYoY2hlc3NCb2FyZC5zZWxlY3RlZCA9PSBudWxsKXtcclxuICAgICAgICAgICAgaWYocGllY2UgJiYgcGllY2UudGVhbSA9PSBjaGVzc0JvYXJkLnR1cm4gJiYgcGllY2UudGVhbSA9PSB0ZWFtKXtcclxuICAgICAgICAgICAgICAgIGNoZXNzQm9hcmQuc2VsZWN0ZWQgPSBwaWVjZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIGlmKHBpZWNlICYmIHBpZWNlLnRlYW0gPT0gY2hlc3NCb2FyZC50dXJuKWNoZXNzQm9hcmQuc2VsZWN0ZWQgPSBwaWVjZVxyXG4gICAgICAgICAgICBlbHNle1xyXG4gICAgICAgICAgICAgICAgaWYoY2hlc3NCb2FyZC5zZWxlY3RlZC5pc0xlZ2FsTW92ZSh2KSl7XHJcbiAgICAgICAgICAgICAgICAgICAgd2ViSU9DLnNlbmQoJ21vdmUnLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZyb206Y2hlc3NCb2FyZC5zZWxlY3RlZC5wb3Muc2VyaWFsaXplKCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvOnYuc2VyaWFsaXplKClcclxuICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY2hlc3NCb2FyZC5zZWxlY3RlZCA9IG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBjaGVzc0JvYXJkLmRyYXcoY3R4dCwgb2Zmc2V0KVxyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGUoKXtcclxufVxyXG5cclxuZnVuY3Rpb24gZHJhdygpe1xyXG4gICAgLy9jdHh0LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRNb3VzZVBvcyhjYW52YXMsIGV2dCkge1xyXG4gICAgdmFyIHJlY3QgPSBjYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbiAgICByZXR1cm4gbmV3IFZlY3RvcihldnQuY2xpZW50WCAtIHJlY3QubGVmdCwgZXZ0LmNsaWVudFkgLSByZWN0LnRvcClcclxufSIsInZhciBWZWN0b3IgPSByZXF1aXJlKCcuL3ZlY3RvcicpXHJcblxyXG5jbGFzcyBVdGlsc3tcclxuICAgIHN0YXRpYyBtYXAodmFsMSwgc3RhcnQxLCBzdG9wMSwgc3RhcnQyLCBzdG9wMil7XHJcbiAgICAgICAgcmV0dXJuIHN0YXJ0MiArIChzdG9wMiAtIHN0YXJ0MikgKiAoKHZhbDEgLSBzdGFydDEpIC8gKHN0b3AxIC0gc3RhcnQxKSlcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgaW5SYW5nZShtaW4gLG1heCAsdmFsdWUpe1xyXG4gICAgICAgIGlmKG1pbiA+IG1heCl7XHJcbiAgICAgICAgICAgIHZhciB0ZW1wID0gbWluO1xyXG4gICAgICAgICAgICBtaW4gPSBtYXg7XHJcbiAgICAgICAgICAgIG1heCA9IHRlbXA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB2YWx1ZSA8PSBtYXggJiYgdmFsdWUgPj0gbWluO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBtaW4oYSwgYil7XHJcbiAgICAgICAgaWYoYSA8IGIpcmV0dXJuIGE7XHJcbiAgICAgICAgcmV0dXJuIGI7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIG1heChhLCBiKXtcclxuICAgICAgICBpZihhID4gYilyZXR1cm4gYTtcclxuICAgICAgICByZXR1cm4gYjtcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgY2xhbXAodmFsLCBtaW4sIG1heCl7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubWF4KHRoaXMubWluKHZhbCwgbWF4KSwgbWluKVxyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyByYW5nZUNvbnRhaW4oYTEsYTIsYjEsYjIpey8vYXMgaW4gZG9lcyBhIGVuY2xvc2UgYi0tLS0tIHNvIHJldHVybnMgdHJ1ZSBpZiBiIGlzIHNtYWxsZXIgaW4gYWxsIHdheXNcclxuICAgICAgICByZXR1cm4gbWF4KGExLCBhMikgPj0gbWF4KGIxLCBiMikgJiYgbWluKGExLGEyKSA8PSBtYXgoYjEsYjIpO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBjcmVhdGUyZEFycmF5KHYsIGZpbGwpe1xyXG4gICAgICAgIHZhciByb3dzID0gbmV3IEFycmF5KHYueClcclxuICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgdi54OyBpKyspe1xyXG4gICAgICAgICAgICByb3dzW2ldID0gbmV3IEFycmF5KHYueSlcclxuICAgICAgICAgICAgZm9yKHZhciBqID0gMDsgaiA8IHYueTsgaisrKXtcclxuICAgICAgICAgICAgICAgIHJvd3NbaV1bal0gPSBmaWxsXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHJvd3M7XHJcbiAgICB9XHJcblxyXG4gICAgXHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gVXRpbHM7IiwiY2xhc3MgVmVjdG9ye1xyXG4gICAgXHJcbiAgICBjb25zdHJ1Y3Rvcih4ID0gMCwgeSA9IDApe1xyXG4gICAgICAgIHRoaXMueCA9IHg7XHJcbiAgICAgICAgdGhpcy55ID0geTtcclxuICAgIH1cclxuXHJcbiAgICBhZGQodmVjdG9yKXtcclxuICAgICAgICB0aGlzLnggKz0gdmVjdG9yLng7XHJcbiAgICAgICAgdGhpcy55ICs9IHZlY3Rvci55O1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHN1Yih2ZWN0b3Ipe1xyXG4gICAgICAgIHRoaXMueCAtPSB2ZWN0b3IueDtcclxuICAgICAgICB0aGlzLnkgLT0gdmVjdG9yLnk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXNcclxuICAgIH1cclxuXHJcbiAgICBsZW5ndGgoKXtcclxuICAgICAgICByZXR1cm4gTWF0aC5wb3codGhpcy54ICogdGhpcy54ICsgdGhpcy55ICogdGhpcy55LCAwLjUpO1xyXG4gICAgfVxyXG5cclxuICAgIG5vcm1hbGl6ZSgpe1xyXG4gICAgICAgIHZhciBsZW5ndGggPSB0aGlzLmxlbmd0aCgpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLnNjYWxlKDEgLyBsZW5ndGgpXHJcbiAgICB9XHJcblxyXG4gICAgc2NhbGUoc2NhbGFyKXtcclxuICAgICAgICB0aGlzLnggKj0gc2NhbGFyO1xyXG4gICAgICAgIHRoaXMueSAqPSBzY2FsYXJcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICByb3RhdGUociwgb3JpZ2luID0gbmV3IFZlY3RvcigpKXtcclxuICAgICAgICB2YXIgb2Zmc2V0ID0gdGhpcy5jKCkuc3ViKG9yaWdpbilcclxuICAgICAgICB2YXIgeCA9IG9mZnNldC54ICogTWF0aC5jb3MocikgLSBvZmZzZXQueSAqIE1hdGguc2luKHIpXHJcbiAgICAgICAgdmFyIHkgPSBvZmZzZXQueCAqIE1hdGguc2luKHIpICsgb2Zmc2V0LnkgKiBNYXRoLmNvcyhyKVxyXG4gICAgICAgIG9mZnNldC54ID0geDsgb2Zmc2V0LnkgPSB5O1xyXG4gICAgICAgIHZhciBiYWNrID0gb2Zmc2V0LmFkZChvcmlnaW4pXHJcbiAgICAgICAgdGhpcy54ID0gYmFjay54OyB0aGlzLnkgPSBiYWNrLnk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgbGVycCh2ZWN0b3IsIHdlaWd0aCl7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc2NhbGUoMSAtIHdlaWd0aCkuYWRkKHZlY3Rvci5jKCkuc2NhbGUod2VpZ3RoKSlcclxuICAgIH1cclxuXHJcbiAgICBjKCl7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWN0b3IodGhpcy54LCB0aGlzLnkpXHJcbiAgICB9XHJcblxyXG4gICAgZXF1YWxzKHYpe1xyXG4gICAgICAgIGlmKHYgPT0gbnVsbClyZXR1cm4gZmFsc2VcclxuICAgICAgICByZXR1cm4gdGhpcy54ID09IHYueCAmJiB0aGlzLnkgPT0gdi55O1xyXG4gICAgfVxyXG5cclxuICAgIHNldCh2ZWN0b3Ipe1xyXG4gICAgICAgIHRoaXMueCA9IHZlY3Rvci54O1xyXG4gICAgICAgIHRoaXMueSA9IHZlY3Rvci55O1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHBlcnBEb3QodmVjdG9yKXtcclxuICAgICAgICByZXR1cm4gTWF0aC5hdGFuMiggdGhpcy54ICogdmVjdG9yLnkgLSB0aGlzLnkgKiB2ZWN0b3IueCwgdGhpcy54ICogdmVjdG9yLnggKyB0aGlzLnkgKiB2ZWN0b3IueSApXHJcbiAgICB9XHJcblxyXG4gICAgZHJhdyhjdHh0KXtcclxuICAgICAgICB2YXIgd2lkdGggPSAxMDt2YXIgaGFsZiA9IHdpZHRoIC8gMjtcclxuICAgICAgICBjdHh0LmZpbGxSZWN0KHRoaXMueCAtIGhhbGYsIHRoaXMueSAtIGhhbGYsIHdpZHRoLCB3aWR0aCk7XHJcbiAgICB9XHJcblxyXG4gICAgbG9vcChjYWxsYmFjayl7XHJcbiAgICAgICAgZm9yKHZhciB4ID0gMDsgeCA8IHRoaXMueDsgeCsrKXtcclxuICAgICAgICAgICAgZm9yKHZhciB5ID0gMDsgeSA8IHRoaXMueTsgeSsrKXtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG5ldyBWZWN0b3IoeCwgeSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHNlcmlhbGl6ZSgpe1xyXG4gICAgICAgIHJldHVybiB7eDp0aGlzLngsIHk6dGhpcy55fVxyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBkZXNlcmlhbGl6ZShvYmplY3Qpe1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjdG9yKG9iamVjdC54LCBvYmplY3QueSlcclxuICAgIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBWZWN0b3I7Il19
