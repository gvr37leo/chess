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
Type[Type["bishop"] = 3] = "bishop"; 
Type[Type["queen"] = 4] = "queen"; 
Type[Type["king"] = 5] = "king"; 

class ChessPiece{
    
    constructor(type, team, pos, chessBoard){
        if(typeof document != 'undefined'){
            if(team == Team.Black)this.image = imageMapB[Type[type]]
            else this.image = imageMapW[Type[type]]
        }
        
        

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
        var size = this.chessBoard.squareSize.x
        var halfsize = size / 2

        ctxt.drawImage(this.image, offset.x + 0.5 + this.pos.x * squareSize.x + squareSize.x / 2 - halfsize, offset.y + 0.5 + this.pos.y * squareSize.y + squareSize.y / 2 - halfsize, size, size)
        // ctxt.strokeRect(offset.x + 0.5 + this.pos.x * squareSize.x + squareSize.x / 2 - halfsize, offset.y + 0.5 + this.pos.y * squareSize.y + squareSize.y / 2 - halfsize, size, size)
        // ctxt.fillRect(offset.x + 1 + this.pos.x * squareSize.x + squareSize.x / 2 - halfsize, offset.y + 1 + this.pos.y * squareSize.y + squareSize.y / 2 - halfsize, size - 1, size - 1)
        // if(this.team == Team.Black)ctxt.fillStyle = '#fff'
        // else ctxt.fillStyle = '#000'
        
        // ctxt.fillText(letterMap[this.type],offset.x + this.pos.x * squareSize.x + squareSize.x / 2, offset.y + this.pos.y * squareSize.y + squareSize.y / 2)
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
    if(aabb.collide(wsfront) && board.grid[wsfront.x][wsfront.y] == null){
        moves.push(facing)
        var farFront = facing.c().scale(2)
        var wsFarFront = c.pos.c().add(farFront)
        if(!c.moved && aabb.collide(wsFarFront) && board.grid[wsFarFront.x][wsFarFront.y] == null)moves.push(farFront)
    }

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

checkMap.set(Type.bishop, function(c, grid){
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


var imageMapB = {}
var imageMapW = {}
if(typeof document != 'undefined'){
    var types = ['pawn', 'rook', 'bishop', 'queen', 'king', 'knight']
    for(var type of types){
        var imageB = new Image()
        var imageW = new Image()
        imageB.src = 'resources/b' + type + '.png'
        imageW.src = 'resources/w' + type + '.png'
        imageB.onload = () => {
            EventHandler.trigger('imageLoaded', {})
        }
        imageW.onload = () => {
            EventHandler.trigger('imageLoaded', {})
        }
        imageMapB[type] = imageB
        imageMapW[type] = imageW
    }
}

var letterMap = []
letterMap[Type.bishop] = 'B'
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

var imageLoadCounter = 0;
EventHandler.subscribe('imageLoaded', (data) =>{
    imageLoadCounter++;
    if(imageLoadCounter >= 12){
        chessBoard.draw(ctxt, offset)
    }
})

var chessBoard = new ChessBoard();
//asda
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL1Byb2dyYW0gRmlsZXMvbm9kZWpzNjMvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjbGllbnQvanMvQUFCQi5qcyIsImNsaWVudC9qcy9DaGVzc0JvYXJkLmpzIiwiY2xpZW50L2pzL0NoZXNzUGllY2UuanMiLCJjbGllbnQvanMvV2ViSU9DLmpzIiwiY2xpZW50L2pzL2V2ZW50SGFuZGxlci5qcyIsImNsaWVudC9qcy9tYWluLmpzIiwiY2xpZW50L2pzL3V0aWxzLmpzIiwiY2xpZW50L2pzL3ZlY3Rvci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdlFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBWZWN0b3IgPSByZXF1aXJlKCcuL3ZlY3RvcicpXHJcbnZhciBVdGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKVxyXG5jbGFzcyBBQUJCe1xyXG4gICAgY29uc3RydWN0b3IocG9zLCBzaXplKXtcclxuICAgICAgICB0aGlzLnBvcyA9IHBvcztcclxuICAgICAgICB0aGlzLnNpemUgPSBzaXplO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBmcm9tVmVjdG9ycyhhKXtcclxuICAgICAgICB2YXIgc21hbGwgPSBhWzBdO1xyXG4gICAgICAgIHZhciBiaWcgPSBhW2EubGVuZ3RoIC0gMV07XHJcbiAgICAgICAgZm9yKHZhciB2IG9mIGEpe1xyXG4gICAgICAgICAgICBpZih2LnggPCBzbWFsbC54KXNtYWxsLnggPSB2Lng7XHJcbiAgICAgICAgICAgIGVsc2UgaWYodi54ID4gYmlnLngpYmlnLnggPSB2Lng7XHJcbiAgICAgICAgICAgIGlmKHYueSA8IHNtYWxsLnkpc21hbGwueSA9IHYueTtcclxuICAgICAgICAgICAgZWxzZSBpZih2LnkgPiBiaWcueSliaWcueSA9IHYueTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG5ldyBBQUJCKHNtYWxsLCBiaWcuc3ViKHNtYWxsKSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29udGFpbnMoYWFiYil7XHJcbiAgICAgICAgcmV0dXJuIFV0aWxzLnJhbmdlQ29udGFpbih0aGlzLnBvcy54LCB0aGlzLnNpemUueCArIHRoaXMucG9zLngsIGFhYmIucG9zLngsIGFhYmIuc2l6ZS54ICsgYWFiYi5wb3MueCkgXHJcbiAgICAgICAgJiYgVXRpbHMucmFuZ2VDb250YWluKHRoaXMucG9zLnksIHRoaXMuc2l6ZS55ICsgdGhpcy5wb3MueSwgYWFiYi5wb3MueSwgYWFiYi5zaXplLnkgKyBhYWJiLnBvcy55KVxyXG4gICAgfVxyXG5cclxuICAgIGNvbGxpZGUodil7XHJcbiAgICAgICAgcmV0dXJuIFV0aWxzLmluUmFuZ2UodGhpcy5wb3MueCwgdGhpcy5zaXplLnggKyB0aGlzLnBvcy54LCB2LngpICYmIFV0aWxzLmluUmFuZ2UodGhpcy5wb3MueSwgdGhpcy5zaXplLnkgKyB0aGlzLnBvcy55LCB2LnkpXHJcbiAgICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQUFCQiIsInZhciBWZWN0b3IgPSByZXF1aXJlKCcuL3ZlY3RvcicpXHJcbnZhciBVdGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKVxyXG52YXIgQUFCQiA9IHJlcXVpcmUoJy4vQUFCQicpXHJcbnZhciBDaGVzc1BpZWNlID0gcmVxdWlyZSgnLi9DaGVzc1BpZWNlJylcclxudmFyIFRlYW0gPSBDaGVzc1BpZWNlLlRlYW1cclxuXHJcbmNsYXNzIENoZXNzQm9hcmR7XHJcblxyXG4gICAgY29uc3RydWN0b3IoKXtcclxuICAgICAgICB0aGlzLmxhc3RNb3ZlID0gbnVsbDtcclxuICAgICAgICB0aGlzLmxhc3RNb3ZlVG8gPSBudWxsO1xyXG4gICAgICAgIHRoaXMuc2l6ZSA9IG5ldyBWZWN0b3IoOCw4KVxyXG4gICAgICAgIHRoaXMuc3F1YXJlU2l6ZSA9IG5ldyBWZWN0b3IoNTAsIDUwKVxyXG4gICAgICAgIHRoaXMudHVybiA9IFRlYW0uV2hpdGVcclxuICAgICAgICB0aGlzLmdyaWQgPSBVdGlscy5jcmVhdGUyZEFycmF5KHRoaXMuc2l6ZSwgbnVsbCk7XHJcbiAgICB9XHJcblxyXG4gICAgdHJ5RnJvbVRvKGZyb20sIHRvKXtcclxuICAgICAgICB2YXIgZnJvbVBpZWNlID0gdGhpcy5ncmlkW2Zyb20ueF1bZnJvbS55XS8vY291bGQgb3V0b2ZyYW5nZSBmcm9tIGJhZGNsaWVudFxyXG4gICAgICAgIHJldHVybiBmcm9tUGllY2UudHJ5TW92ZSh0bylcclxuICAgIH1cclxuXHJcbiAgICBkcmF3KGN0eHQsIG9mZnNldCl7XHJcbiAgICAgICAgXHJcbiAgICAgICAgdmFyIGxlZ2Fsc1Nwb3RzO1xyXG4gICAgICAgIGlmKHRoaXMuc2VsZWN0ZWQpbGVnYWxzU3BvdHMgPSB0aGlzLnNlbGVjdGVkLnBvc0NoZWNrZXIodGhpcy5zZWxlY3RlZCwgdGhpcylcclxuICAgICAgICB0aGlzLnNpemUubG9vcCgodikgPT57XHJcbiAgICAgICAgICAgIGlmKCh2LnggKyB2LnkpICUgMiA9PSAwKWN0eHQuZmlsbFN0eWxlID0gXCIjZmZmXCJcclxuICAgICAgICAgICAgZWxzZSBjdHh0LmZpbGxTdHlsZSA9IFwiIzAwMFwiXHJcbiAgICAgICAgICAgIGlmKHRoaXMuc2VsZWN0ZWQgJiYgdi5lcXVhbHModGhpcy5zZWxlY3RlZC5wb3MpKWN0eHQuZmlsbFN0eWxlID0gXCIjMGZmXCJcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGlmKHRoaXMubGFzdE1vdmUgJiYgdi5lcXVhbHModGhpcy5sYXN0TW92ZSkpe1xyXG4gICAgICAgICAgICAgICAgY3R4dC5maWxsU3R5bGUgPSBcIiM0MDRcIlxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmKHRoaXMubGFzdE1vdmVUbyAmJiB2LmVxdWFscyh0aGlzLmxhc3RNb3ZlVG8pKXtcclxuICAgICAgICAgICAgICAgIGN0eHQuZmlsbFN0eWxlID0gXCIjYTBhXCJcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZih0aGlzLnNlbGVjdGVkICYmIGxlZ2Fsc1Nwb3RzW3YueF1bdi55XSljdHh0LmZpbGxTdHlsZSA9IFwiI2YwMFwiXHJcbiAgICAgICAgICAgIGN0eHQuZmlsbFJlY3Qodi54ICogdGhpcy5zcXVhcmVTaXplLnggKyBvZmZzZXQueCwgdi55ICogdGhpcy5zcXVhcmVTaXplLnkgKyBvZmZzZXQueSwgdGhpcy5zcXVhcmVTaXplLngsIHRoaXMuc3F1YXJlU2l6ZS55KVxyXG4gICAgICAgICAgICBpZih0aGlzLmdyaWRbdi54XVt2LnldKXtcclxuICAgICAgICAgICAgICAgIHRoaXMuZ3JpZFt2LnhdW3YueV0uZHJhdyhjdHh0LCB0aGlzLnNxdWFyZVNpemUsIG9mZnNldClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgdmVjdG9yVG9HcmlkUG9zKHYpe1xyXG4gICAgICAgIHZhciBuID0gbmV3IFZlY3RvcigpO1xyXG4gICAgICAgIG4ueCA9IE1hdGguZmxvb3Iodi54IC8gdGhpcy5zcXVhcmVTaXplLngpXHJcbiAgICAgICAgbi55ID0gTWF0aC5mbG9vcih2LnkgLyB0aGlzLnNxdWFyZVNpemUueSlcclxuICAgICAgICByZXR1cm4gbjtcclxuICAgIH1cclxuXHJcbiAgICBhZGQoYyl7XHJcbiAgICAgICAgdGhpcy5ncmlkW2MucG9zLnhdW2MucG9zLnldID0gYztcclxuICAgIH1cclxuXHJcbiAgICBzZXJpYWxpemUoKXtcclxuICAgICAgICB2YXIgZ3JpZCA9IFV0aWxzLmNyZWF0ZTJkQXJyYXkodGhpcy5zaXplLCBudWxsKVxyXG4gICAgICAgIHRoaXMuc2l6ZS5sb29wKCh2KSA9PiB7XHJcbiAgICAgICAgICAgIGlmKHRoaXMuZ3JpZFt2LnhdW3YueV0pZ3JpZFt2LnhdW3YueV0gPSB0aGlzLmdyaWRbdi54XVt2LnldLnNlcmlhbGl6ZSgpXHJcbiAgICAgICAgfSlcclxuICAgICAgICB2YXIgc2VsZWN0ZWQ7XHJcbiAgICAgICAgaWYodGhpcy5zZWxlY3RlZClzZWxlY3RlZCA9IHRoaXMuc2VsZWN0ZWQuc2VyaWFsaXplKClcclxuICAgICAgICB2YXIgbGFzdE1vdmU7XHJcbiAgICAgICAgaWYodGhpcy5sYXN0TW92ZSlsYXN0TW92ZSA9IHRoaXMubGFzdE1vdmUuc2VyaWFsaXplKClcclxuICAgICAgICB2YXIgbGFzdE1vdmVUbztcclxuICAgICAgICBpZih0aGlzLmxhc3RNb3ZlVG8pbGFzdE1vdmVUbyA9IHRoaXMubGFzdE1vdmVUby5zZXJpYWxpemUoKVxyXG4gICAgICAgIHZhciBzZXJpYWxpemVkID0ge1xyXG4gICAgICAgICAgICBzaXplOnRoaXMuc2l6ZS5zZXJpYWxpemUoKSxcclxuICAgICAgICAgICAgc3F1YXJlU2l6ZTp0aGlzLnNxdWFyZVNpemUuc2VyaWFsaXplKCksXHJcbiAgICAgICAgICAgIGdyaWQ6Z3JpZCxcclxuICAgICAgICAgICAgdHVybjp0aGlzLnR1cm4sXHJcbiAgICAgICAgICAgIHNlbGVjdGVkOnNlbGVjdGVkLFxyXG4gICAgICAgICAgICBsYXN0TW92ZTpsYXN0TW92ZSxcclxuICAgICAgICAgICAgbGFzdE1vdmVUbzpsYXN0TW92ZVRvXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBzZXJpYWxpemVkXHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGRlc2VyaWFsaXplKG9iamVjdCl7XHJcbiAgICAgICAgdmFyIGNoZXNzQm9hcmQgPSBuZXcgQ2hlc3NCb2FyZCgpXHJcbiAgICAgICAgdmFyIGdyaWQgPSBVdGlscy5jcmVhdGUyZEFycmF5KGNoZXNzQm9hcmQuc2l6ZSwgbnVsbClcclxuICAgICAgICBjaGVzc0JvYXJkLnNpemUubG9vcCgodikgPT4ge1xyXG4gICAgICAgICAgICBpZihvYmplY3QuZ3JpZFt2LnhdW3YueV0pZ3JpZFt2LnhdW3YueV0gPSBDaGVzc1BpZWNlLmRlc2VyaWFsaXplKG9iamVjdC5ncmlkW3YueF1bdi55XSwgY2hlc3NCb2FyZClcclxuICAgICAgICB9KVxyXG4gICAgICAgIGNoZXNzQm9hcmQuZ3JpZCA9IGdyaWRcclxuICAgICAgICBjaGVzc0JvYXJkLnR1cm4gPSBvYmplY3QudHVyblxyXG4gICAgICAgIGlmKG9iamVjdC5sYXN0TW92ZSljaGVzc0JvYXJkLmxhc3RNb3ZlID0gVmVjdG9yLmRlc2VyaWFsaXplKG9iamVjdC5sYXN0TW92ZSlcclxuICAgICAgICBpZihvYmplY3QubGFzdE1vdmVUbyljaGVzc0JvYXJkLmxhc3RNb3ZlVG8gPSBWZWN0b3IuZGVzZXJpYWxpemUob2JqZWN0Lmxhc3RNb3ZlVG8pXHJcbiAgICAgICAgaWYob2JqZWN0LnNlbGVjdGVkKWNoZXNzQm9hcmQuc2VsZWN0ZWQgPSBDaGVzc1BpZWNlLmRlc2VyaWFsaXplKG9iamVjdC5zZWxlY3RlZCwgY2hlc3NCb2FyZClcclxuICAgICAgICByZXR1cm4gY2hlc3NCb2FyZFxyXG4gICAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENoZXNzQm9hcmQiLCJ2YXIgVmVjdG9yID0gcmVxdWlyZSgnLi92ZWN0b3InKVxyXG52YXIgVXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJylcclxudmFyIEFBQkIgPSByZXF1aXJlKCcuL0FBQkInKVxyXG52YXIgRXZlbnRIYW5kbGVyID0gcmVxdWlyZSgnLi9ldmVudEhhbmRsZXInKVxyXG5cclxudmFyIFRlYW0gPSB7fVxyXG5UZWFtW1RlYW1bXCJCbGFja1wiXSA9IDBdID0gXCJCbGFja1wiOyBcclxuVGVhbVtUZWFtW1wiV2hpdGVcIl0gPSAxXSA9IFwiV2hpdGVcIjsgXHJcblxyXG52YXIgVHlwZSA9IHt9XHJcblR5cGVbVHlwZVtcInBhd25cIl0gPSAwXSA9IFwicGF3blwiOyBcclxuVHlwZVtUeXBlW1wicm9va1wiXSA9IDFdID0gXCJyb29rXCI7IFxyXG5UeXBlW1R5cGVbXCJrbmlnaHRcIl0gPSAyXSA9IFwia25pZ2h0XCI7IFxyXG5UeXBlW1R5cGVbXCJiaXNob3BcIl0gPSAzXSA9IFwiYmlzaG9wXCI7IFxyXG5UeXBlW1R5cGVbXCJxdWVlblwiXSA9IDRdID0gXCJxdWVlblwiOyBcclxuVHlwZVtUeXBlW1wia2luZ1wiXSA9IDVdID0gXCJraW5nXCI7IFxyXG5cclxuY2xhc3MgQ2hlc3NQaWVjZXtcclxuICAgIFxyXG4gICAgY29uc3RydWN0b3IodHlwZSwgdGVhbSwgcG9zLCBjaGVzc0JvYXJkKXtcclxuICAgICAgICBpZih0eXBlb2YgZG9jdW1lbnQgIT0gJ3VuZGVmaW5lZCcpe1xyXG4gICAgICAgICAgICBpZih0ZWFtID09IFRlYW0uQmxhY2spdGhpcy5pbWFnZSA9IGltYWdlTWFwQltUeXBlW3R5cGVdXVxyXG4gICAgICAgICAgICBlbHNlIHRoaXMuaW1hZ2UgPSBpbWFnZU1hcFdbVHlwZVt0eXBlXV1cclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgXHJcblxyXG4gICAgICAgIHRoaXMubW92ZWQgPSBmYWxzZVxyXG4gICAgICAgIHRoaXMucG9zID0gcG9zXHJcbiAgICAgICAgdGhpcy5jaGVzc0JvYXJkID0gY2hlc3NCb2FyZFxyXG4gICAgICAgIHRoaXMucG9zQ2hlY2tlciA9IGNoZWNrTWFwLmdldCh0eXBlKVxyXG4gICAgICAgIHRoaXMudHlwZSA9IHR5cGVcclxuICAgICAgICB0aGlzLnRlYW0gPSB0ZWFtXHJcbiAgICAgICAgXHJcbiAgICB9XHJcblxyXG4gICAgZHJhdyhjdHh0LCBzcXVhcmVTaXplLCBvZmZzZXQpe1xyXG4gICAgICAgIGN0eHQudGV4dEFsaWduID0gJ2NlbnRlcidcclxuICAgICAgICBjdHh0LnRleHRCYXNlbGluZSA9ICdtaWRkbGUnXHJcbiAgICAgICAgY3R4dC5zdHJva2VTdHlsZSA9ICcjMDAwJ1xyXG4gICAgICAgIGN0eHQuZmlsbFN0eWxlID0gJyNmZmYnXHJcbiAgICAgICAgaWYodGhpcy50ZWFtID09IFRlYW0uQmxhY2spe1xyXG4gICAgICAgICAgICBjdHh0LnN0cm9rZVN0eWxlID0gJyNmZmYnXHJcbiAgICAgICAgICAgIGN0eHQuZmlsbFN0eWxlID0gJyMwMDAnXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBzaXplID0gdGhpcy5jaGVzc0JvYXJkLnNxdWFyZVNpemUueFxyXG4gICAgICAgIHZhciBoYWxmc2l6ZSA9IHNpemUgLyAyXHJcblxyXG4gICAgICAgIGN0eHQuZHJhd0ltYWdlKHRoaXMuaW1hZ2UsIG9mZnNldC54ICsgMC41ICsgdGhpcy5wb3MueCAqIHNxdWFyZVNpemUueCArIHNxdWFyZVNpemUueCAvIDIgLSBoYWxmc2l6ZSwgb2Zmc2V0LnkgKyAwLjUgKyB0aGlzLnBvcy55ICogc3F1YXJlU2l6ZS55ICsgc3F1YXJlU2l6ZS55IC8gMiAtIGhhbGZzaXplLCBzaXplLCBzaXplKVxyXG4gICAgICAgIC8vIGN0eHQuc3Ryb2tlUmVjdChvZmZzZXQueCArIDAuNSArIHRoaXMucG9zLnggKiBzcXVhcmVTaXplLnggKyBzcXVhcmVTaXplLnggLyAyIC0gaGFsZnNpemUsIG9mZnNldC55ICsgMC41ICsgdGhpcy5wb3MueSAqIHNxdWFyZVNpemUueSArIHNxdWFyZVNpemUueSAvIDIgLSBoYWxmc2l6ZSwgc2l6ZSwgc2l6ZSlcclxuICAgICAgICAvLyBjdHh0LmZpbGxSZWN0KG9mZnNldC54ICsgMSArIHRoaXMucG9zLnggKiBzcXVhcmVTaXplLnggKyBzcXVhcmVTaXplLnggLyAyIC0gaGFsZnNpemUsIG9mZnNldC55ICsgMSArIHRoaXMucG9zLnkgKiBzcXVhcmVTaXplLnkgKyBzcXVhcmVTaXplLnkgLyAyIC0gaGFsZnNpemUsIHNpemUgLSAxLCBzaXplIC0gMSlcclxuICAgICAgICAvLyBpZih0aGlzLnRlYW0gPT0gVGVhbS5CbGFjayljdHh0LmZpbGxTdHlsZSA9ICcjZmZmJ1xyXG4gICAgICAgIC8vIGVsc2UgY3R4dC5maWxsU3R5bGUgPSAnIzAwMCdcclxuICAgICAgICBcclxuICAgICAgICAvLyBjdHh0LmZpbGxUZXh0KGxldHRlck1hcFt0aGlzLnR5cGVdLG9mZnNldC54ICsgdGhpcy5wb3MueCAqIHNxdWFyZVNpemUueCArIHNxdWFyZVNpemUueCAvIDIsIG9mZnNldC55ICsgdGhpcy5wb3MueSAqIHNxdWFyZVNpemUueSArIHNxdWFyZVNpemUueSAvIDIpXHJcbiAgICB9XHJcblxyXG4gICAgdHJ5TW92ZSh2KXsgICAgXHJcbiAgICAgICAgaWYodGhpcy5wb3NDaGVja2VyKHRoaXMsIHRoaXMuY2hlc3NCb2FyZClbdi54XVt2LnldKXtcclxuICAgICAgICAgICAgdGhpcy5jaGVzc0JvYXJkLmxhc3RNb3ZlID0gdGhpcy5wb3MuYygpXHJcbiAgICAgICAgICAgIHZhciBwaWVjZSA9IHRoaXMuY2hlc3NCb2FyZC5ncmlkW3YueF1bdi55XVxyXG4gICAgICAgICAgICBpZihwaWVjZSAmJiBwaWVjZS50eXBlID09IFR5cGUua2luZykgRXZlbnRIYW5kbGVyLnRyaWdnZXIoJ2dhbWVPdmVyJywgcGllY2UpXHJcbiAgICAgICAgICAgIHRoaXMuY2hlc3NCb2FyZC5ncmlkW3YueF1bdi55XSA9IHRoaXM7XHJcbiAgICAgICAgICAgIHRoaXMuY2hlc3NCb2FyZC5ncmlkW3RoaXMucG9zLnhdW3RoaXMucG9zLnldID0gbnVsbDtcclxuICAgICAgICAgICAgdGhpcy5jaGVzc0JvYXJkLmxhc3RNb3ZlVG8gPSB2LmMoKVxyXG4gICAgICAgICAgICB0aGlzLnBvcyA9IHY7XHJcbiAgICAgICAgICAgIHRoaXMubW92ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGlmKHRoaXMuY2hlc3NCb2FyZC50dXJuID09IFRlYW0uQmxhY2spdGhpcy5jaGVzc0JvYXJkLnR1cm4gPSBUZWFtLldoaXRlXHJcbiAgICAgICAgICAgIGVsc2UgdGhpcy5jaGVzc0JvYXJkLnR1cm4gPSBUZWFtLkJsYWNrXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgfVxyXG5cclxuICAgIGlzTGVnYWxNb3ZlKHYpe1xyXG4gICAgICAgIHJldHVybiB0aGlzLnBvc0NoZWNrZXIodGhpcywgdGhpcy5jaGVzc0JvYXJkKVt2LnhdW3YueV1cclxuICAgIH1cclxuXHJcbiAgICBzZXJpYWxpemUoKXtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICB0eXBlOnRoaXMudHlwZSxcclxuICAgICAgICAgICAgcG9zOnRoaXMucG9zLnNlcmlhbGl6ZSgpLFxyXG4gICAgICAgICAgICB0ZWFtOnRoaXMudGVhbSxcclxuICAgICAgICAgICAgbW92ZWQ6dGhpcy5tb3ZlZFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgZGVzZXJpYWxpemUob2JqZWN0LCBjaGVzc0JvYXJkKXtcclxuICAgICAgICB2YXIgYyA9IG5ldyBDaGVzc1BpZWNlKG9iamVjdC50eXBlLCBvYmplY3QudGVhbSwgVmVjdG9yLmRlc2VyaWFsaXplKG9iamVjdC5wb3MpLCBjaGVzc0JvYXJkKVxyXG4gICAgICAgIGMubW92ZWQgPSBvYmplY3QubW92ZWRcclxuICAgICAgICByZXR1cm4gY1xyXG4gICAgfVxyXG59XHJcblxyXG52YXIgY2hlY2tNYXAgPSBuZXcgTWFwKCk7XHJcblxyXG5jaGVja01hcC5zZXQoVHlwZS5wYXduLCBmdW5jdGlvbihjLCBib2FyZCl7XHJcbiAgICB2YXIgYWFiYiA9IG5ldyBBQUJCKG5ldyBWZWN0b3IoKSwgYm9hcmQuc2l6ZS5jKCkuc3ViKG5ldyBWZWN0b3IoMSwxKSkpXHJcbiAgICB2YXIgbW92ZXMgPSBbXTtcclxuICAgIHZhciBmYWNpbmc7XHJcbiAgICBpZihjLnRlYW0gPT0gVGVhbS5XaGl0ZSlmYWNpbmcgPSBuZXcgVmVjdG9yKDAsIC0xKVxyXG4gICAgZWxzZSBmYWNpbmcgPSBuZXcgVmVjdG9yKDAsIDEpXHJcbiAgICB2YXIgd3Nmcm9udCA9IGMucG9zLmMoKS5hZGQoZmFjaW5nKVxyXG4gICAgaWYoYWFiYi5jb2xsaWRlKHdzZnJvbnQpICYmIGJvYXJkLmdyaWRbd3Nmcm9udC54XVt3c2Zyb250LnldID09IG51bGwpe1xyXG4gICAgICAgIG1vdmVzLnB1c2goZmFjaW5nKVxyXG4gICAgICAgIHZhciBmYXJGcm9udCA9IGZhY2luZy5jKCkuc2NhbGUoMilcclxuICAgICAgICB2YXIgd3NGYXJGcm9udCA9IGMucG9zLmMoKS5hZGQoZmFyRnJvbnQpXHJcbiAgICAgICAgaWYoIWMubW92ZWQgJiYgYWFiYi5jb2xsaWRlKHdzRmFyRnJvbnQpICYmIGJvYXJkLmdyaWRbd3NGYXJGcm9udC54XVt3c0ZhckZyb250LnldID09IG51bGwpbW92ZXMucHVzaChmYXJGcm9udClcclxuICAgIH1cclxuXHJcbiAgICB2YXIgd2VzdCA9IG5ldyBWZWN0b3IoMSwwKS5hZGQoZmFjaW5nKVxyXG4gICAgdmFyIHdzd2VzdCA9IHdlc3QuYygpLmFkZChjLnBvcylcclxuICAgIGlmKGFhYmIuY29sbGlkZSh3c3dlc3QpICYmIGJvYXJkLmdyaWRbd3N3ZXN0LnhdW3dzd2VzdC55XSAhPSBudWxsICYmIGJvYXJkLmdyaWRbd3N3ZXN0LnhdW3dzd2VzdC55XS50ZWFtICE9IGMudGVhbSkgbW92ZXMucHVzaCh3ZXN0KVxyXG4gICAgXHJcbiAgICB2YXIgZWFzdCA9IG5ldyBWZWN0b3IoLTEsMCkuYWRkKGZhY2luZylcclxuICAgIHZhciB3c2Vhc3QgPSBlYXN0LmMoKS5hZGQoYy5wb3MpXHJcbiAgICBpZihhYWJiLmNvbGxpZGUod3NlYXN0KSAmJiBib2FyZC5ncmlkW3dzZWFzdC54XVt3c2Vhc3QueV0gIT0gbnVsbCAmJiBib2FyZC5ncmlkW3dzZWFzdC54XVt3c2Vhc3QueV0udGVhbSAhPSBjLnRlYW0pIG1vdmVzLnB1c2goZWFzdClcclxuXHJcbiAgICByZXR1cm4gbW92ZXNTdGFtcChtb3ZlcywgYyk7XHJcbn0pXHJcblxyXG5jaGVja01hcC5zZXQoVHlwZS5yb29rLCBmdW5jdGlvbihjLCBncmlkKXtcclxuICAgIHZhciBkaXJlY3Rpb25zID0gW1xyXG4gICAgICAgIG5ldyBWZWN0b3IoMSwgMCksXHJcbiAgICAgICAgbmV3IFZlY3RvcigtMSwgMCksXHJcbiAgICAgICAgbmV3IFZlY3RvcigwLCAxKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDAsIC0xKVxyXG4gICAgXVxyXG4gICAgcmV0dXJuIGRpcmVjdGlvblN0YW1wKGRpcmVjdGlvbnMsIGMpO1xyXG59KVxyXG5cclxuY2hlY2tNYXAuc2V0KFR5cGUua25pZ2h0LCBmdW5jdGlvbihjLCBncmlkKXtcclxuICAgIHZhciBtb3ZlcyA9IFtcclxuICAgICAgICBuZXcgVmVjdG9yKDEsIC0yKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDIsIC0xKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDIsIDEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoMSwgMiksXHJcbiAgICAgICAgbmV3IFZlY3RvcigtMSwgMiksXHJcbiAgICAgICAgbmV3IFZlY3RvcigtMiwgMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigtMiwgLTEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTEsIC0yKVxyXG4gICAgXVxyXG4gICAgcmV0dXJuIG1vdmVzU3RhbXAobW92ZXMsIGMpO1xyXG59KVxyXG5cclxuY2hlY2tNYXAuc2V0KFR5cGUuYmlzaG9wLCBmdW5jdGlvbihjLCBncmlkKXtcclxuICAgIHZhciBkaXJlY3Rpb25zID0gW1xyXG4gICAgICAgIG5ldyBWZWN0b3IoMSwgMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigtMSwgLTEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoMSwgLTEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTEsIDEpXHJcbiAgICBdXHJcbiAgICByZXR1cm4gZGlyZWN0aW9uU3RhbXAoZGlyZWN0aW9ucywgYyk7XHJcbn0pXHJcblxyXG5jaGVja01hcC5zZXQoVHlwZS5xdWVlbiwgZnVuY3Rpb24oYyl7XHJcbiAgICB2YXIgZGlyZWN0aW9ucyA9IFtcclxuICAgICAgICBuZXcgVmVjdG9yKDEsIDEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTEsIC0xKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDEsIC0xKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0xLCAxKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDEsIDApLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTEsIDApLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoMCwgMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigwLCAtMSlcclxuICAgIF1cclxuICAgIHJldHVybiBkaXJlY3Rpb25TdGFtcChkaXJlY3Rpb25zLCBjKTtcclxufSlcclxuXHJcbmNoZWNrTWFwLnNldChUeXBlLmtpbmcsIGZ1bmN0aW9uKGMsIGdyaWQpe1xyXG4gICAgdmFyIG1vdmVzID0gW1xyXG4gICAgICAgIG5ldyBWZWN0b3IoMCwgMSksXHJcbiAgICAgICAgbmV3IFZlY3RvcigxLCAxKSxcclxuICAgICAgICBuZXcgVmVjdG9yKDEsIDApLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoMSwgLTEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoMCwgLTEpLFxyXG4gICAgICAgIG5ldyBWZWN0b3IoLTEsIC0xKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0xLCAwKSxcclxuICAgICAgICBuZXcgVmVjdG9yKC0xLCAxKSxcclxuICAgIF1cclxuICAgIHJldHVybiBtb3Zlc1N0YW1wKG1vdmVzLCBjKTtcclxufSlcclxuXHJcbmZ1bmN0aW9uIGZpbHRlck1vdmVzT2ZmQm9hcmQobW92ZXMsIHNpemUsIHBvcyl7XHJcbiAgICB2YXIgbGVnYWxNb3ZlcyA9IFtdO1xyXG4gICAgdmFyIGFhYmIgPSBuZXcgQUFCQihuZXcgVmVjdG9yKCksIHNpemUuYygpLnN1YihuZXcgVmVjdG9yKDEsIDEpKSlcclxuXHJcbiAgICBmb3IodmFyIG1vdmUgb2YgbW92ZXMpe1xyXG4gICAgICAgIHZhciB3cyA9IG1vdmUuYygpLmFkZChwb3MpXHJcbiAgICAgICAgaWYoYWFiYi5jb2xsaWRlKHdzKSlsZWdhbE1vdmVzLnB1c2gobW92ZSlcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbGVnYWxNb3ZlcztcclxufVxyXG5cclxuZnVuY3Rpb24gZGlyZWN0aW9uU3RhbXAoZGlyZWN0aW9ucywgYyl7XHJcbiAgICB2YXIgYWFiYiA9IG5ldyBBQUJCKG5ldyBWZWN0b3IoKSwgYy5jaGVzc0JvYXJkLnNpemUuYygpLnN1YihuZXcgVmVjdG9yKDEsMSkpKVxyXG4gICAgdmFyIG9wZW5zID0gVXRpbHMuY3JlYXRlMmRBcnJheShjLmNoZXNzQm9hcmQuc2l6ZSwgZmFsc2UpXHJcbiAgICBmb3IodmFyIGRpcmVjdGlvbiBvZiBkaXJlY3Rpb25zKXtcclxuICAgICAgICB2YXIgY3VycmVudENoZWNraW5nUG9zID0gYy5wb3MuYygpO1xyXG4gICAgICAgIHdoaWxlKHRydWUpe1xyXG4gICAgICAgICAgICBjdXJyZW50Q2hlY2tpbmdQb3MuYWRkKGRpcmVjdGlvbilcclxuICAgICAgICAgICAgaWYoYWFiYi5jb2xsaWRlKGN1cnJlbnRDaGVja2luZ1Bvcykpe1xyXG4gICAgICAgICAgICAgICAgdmFyIHBpZWNlID0gYy5jaGVzc0JvYXJkLmdyaWRbY3VycmVudENoZWNraW5nUG9zLnhdW2N1cnJlbnRDaGVja2luZ1Bvcy55XVxyXG4gICAgICAgICAgICAgICAgaWYocGllY2UgPT0gbnVsbClvcGVuc1tjdXJyZW50Q2hlY2tpbmdQb3MueF1bY3VycmVudENoZWNraW5nUG9zLnldID0gdHJ1ZVxyXG4gICAgICAgICAgICAgICAgZWxzZXtcclxuICAgICAgICAgICAgICAgICAgICBpZihwaWVjZS50ZWFtICE9IGMudGVhbSlvcGVuc1tjdXJyZW50Q2hlY2tpbmdQb3MueF1bY3VycmVudENoZWNraW5nUG9zLnldID0gdHJ1ZVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrLy9icmVhayBpbiBib3RoIGNhc2VzIChpZi9lbHNlIHN0YXRlbWVudCBib3RoIGJyZWFrKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9ZWxzZSBicmVha1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBvcGVucztcclxufVxyXG5cclxuZnVuY3Rpb24gbW92ZXNTdGFtcChtb3ZlcywgYyl7XHJcbiAgICB2YXIgYWFiYiA9IG5ldyBBQUJCKG5ldyBWZWN0b3IoKSwgYy5jaGVzc0JvYXJkLnNpemUuYygpLnN1YihuZXcgVmVjdG9yKDEsMSkpKVxyXG4gICAgdmFyIG9wZW5zID0gVXRpbHMuY3JlYXRlMmRBcnJheShjLmNoZXNzQm9hcmQuc2l6ZSwgZmFsc2UpXHJcbiAgICBmb3IodmFyIG1vdmUgb2YgbW92ZXMpe1xyXG4gICAgICAgIHZhciBjdXJyZW50Q2hlY2tpbmdQb3MgPSBjLnBvcy5jKCk7XHJcbiAgICAgICAgY3VycmVudENoZWNraW5nUG9zLmFkZChtb3ZlKVxyXG5cclxuICAgICAgICBpZihhYWJiLmNvbGxpZGUoY3VycmVudENoZWNraW5nUG9zKSl7XHJcbiAgICAgICAgICAgIHZhciBwaWVjZSA9IGMuY2hlc3NCb2FyZC5ncmlkW2N1cnJlbnRDaGVja2luZ1Bvcy54XVtjdXJyZW50Q2hlY2tpbmdQb3MueV1cclxuICAgICAgICAgICAgaWYocGllY2UgPT0gbnVsbCB8fCBwaWVjZS50ZWFtICE9IGMudGVhbSlvcGVuc1tjdXJyZW50Q2hlY2tpbmdQb3MueF1bY3VycmVudENoZWNraW5nUG9zLnldID0gdHJ1ZVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBvcGVuc1xyXG59XHJcblxyXG5cclxudmFyIGltYWdlTWFwQiA9IHt9XHJcbnZhciBpbWFnZU1hcFcgPSB7fVxyXG5pZih0eXBlb2YgZG9jdW1lbnQgIT0gJ3VuZGVmaW5lZCcpe1xyXG4gICAgdmFyIHR5cGVzID0gWydwYXduJywgJ3Jvb2snLCAnYmlzaG9wJywgJ3F1ZWVuJywgJ2tpbmcnLCAna25pZ2h0J11cclxuICAgIGZvcih2YXIgdHlwZSBvZiB0eXBlcyl7XHJcbiAgICAgICAgdmFyIGltYWdlQiA9IG5ldyBJbWFnZSgpXHJcbiAgICAgICAgdmFyIGltYWdlVyA9IG5ldyBJbWFnZSgpXHJcbiAgICAgICAgaW1hZ2VCLnNyYyA9ICdyZXNvdXJjZXMvYicgKyB0eXBlICsgJy5wbmcnXHJcbiAgICAgICAgaW1hZ2VXLnNyYyA9ICdyZXNvdXJjZXMvdycgKyB0eXBlICsgJy5wbmcnXHJcbiAgICAgICAgaW1hZ2VCLm9ubG9hZCA9ICgpID0+IHtcclxuICAgICAgICAgICAgRXZlbnRIYW5kbGVyLnRyaWdnZXIoJ2ltYWdlTG9hZGVkJywge30pXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGltYWdlVy5vbmxvYWQgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIEV2ZW50SGFuZGxlci50cmlnZ2VyKCdpbWFnZUxvYWRlZCcsIHt9KVxyXG4gICAgICAgIH1cclxuICAgICAgICBpbWFnZU1hcEJbdHlwZV0gPSBpbWFnZUJcclxuICAgICAgICBpbWFnZU1hcFdbdHlwZV0gPSBpbWFnZVdcclxuICAgIH1cclxufVxyXG5cclxudmFyIGxldHRlck1hcCA9IFtdXHJcbmxldHRlck1hcFtUeXBlLmJpc2hvcF0gPSAnQidcclxubGV0dGVyTWFwW1R5cGUua2luZ10gPSAnSydcclxubGV0dGVyTWFwW1R5cGUua25pZ2h0XSA9ICdIJ1xyXG5sZXR0ZXJNYXBbVHlwZS5wYXduXSA9ICdQJ1xyXG5sZXR0ZXJNYXBbVHlwZS5xdWVlbl0gPSAnUSdcclxubGV0dGVyTWFwW1R5cGUucm9va10gPSAnUidcclxuXHJcbkNoZXNzUGllY2UuVHlwZSA9IFR5cGVcclxuQ2hlc3NQaWVjZS5UZWFtID0gVGVhbVxyXG5tb2R1bGUuZXhwb3J0cyA9IENoZXNzUGllY2UiLCJjbGFzcyBXZWJJT0N7XHJcbiAgICBjb25zdHJ1Y3Rvcihzb2NrZXQpe1xyXG4gICAgICAgIHRoaXMuc29ja2V0ID0gc29ja2V0O1xyXG4gICAgICAgIHRoaXMucm91dGVNYXAgPSB7fTtcclxuICAgICAgICB0aGlzLnNvY2tldC5vbm1lc3NhZ2UgPSAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgdmFyIGRhdGEgPSBldmVudC5kYXRhXHJcbiAgICAgICAgICAgIHZhciBwYXJzZWREYXRhID0gSlNPTi5wYXJzZShkYXRhKTtcclxuICAgICAgICAgICAgaWYodGhpcy5yb3V0ZU1hcFtwYXJzZWREYXRhLnJvdXRlXSl7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJvdXRlTWFwW3BhcnNlZERhdGEucm91dGVdKHBhcnNlZERhdGEpO1xyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCc0MDQ6ICcgKyBwYXJzZWREYXRhLnJvdXRlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBvbihyb3V0ZSwgYWN0aW9uKXsvL2FjdGlvbnMgbmVlZCB0byBiZSBwYXNzZWQgdXNpbmcgYW4gYXJyb3cgZnVuY3Rpb24gb3IgZnVuY3Rpb25zIGJpbmRlZCB3aXRoIC5iaW5kKHRoaXMpXHJcbiAgICAgICAgdGhpcy5yb3V0ZU1hcFtyb3V0ZV0gPSBhY3Rpb247XHJcbiAgICB9XHJcblxyXG4gICAgc2VuZChyb3V0ZSwgdmFsdWUpey8vdmFsdWUgaXMgb2JqZWN0IGVuIGdlc2VyaWFsaXplZFxyXG4gICAgICAgIHZhbHVlLnJvdXRlID0gcm91dGU7XHJcbiAgICAgICAgaWYodGhpcy5zb2NrZXQucmVhZHlTdGF0ZT09MSl7XHJcbiAgICAgICAgICB0aGlzLnNvY2tldC5zZW5kKEpTT04uc3RyaW5naWZ5KHZhbHVlKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIG9uY2xvc2UoKXtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgY2xvc2UoKXtcclxuICAgICAgICB0aGlzLnNvY2tldC5jbG9zZSgpO1xyXG4gICAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFdlYklPQyIsImNsYXNzIEV2ZW50SGFuZGxlcntcclxuICAgIFxyXG5cclxuICAgIHN0YXRpYyB0cmlnZ2VyKGV2ZW50LCBkYXRhKXtcclxuICAgICAgICBpZihFdmVudEhhbmRsZXIuZXZlbnRNYXAuZ2V0KGV2ZW50KSA9PSBudWxsKXJldHVyblxyXG4gICAgICAgIGZvcih2YXIgY2FsbGJhY2sgb2YgRXZlbnRIYW5kbGVyLmV2ZW50TWFwLmdldChldmVudCkpY2FsbGJhY2soZGF0YSlcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgc3Vic2NyaWJlKGV2ZW50LCBjYWxsYmFjayl7XHJcbiAgICAgICAgaWYoRXZlbnRIYW5kbGVyLmV2ZW50TWFwLmdldChldmVudCkgPT0gbnVsbClFdmVudEhhbmRsZXIuZXZlbnRNYXAuc2V0KGV2ZW50LCBbXSlcclxuICAgICAgICBFdmVudEhhbmRsZXIuZXZlbnRNYXAuZ2V0KGV2ZW50KS5wdXNoKGNhbGxiYWNrKVxyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBkZXRhY2goZXZlbnQsIGNhbGxiYWNrKXtcclxuICAgICAgICB2YXIgc3VibGlzdCA9IEV2ZW50SGFuZGxlci5ldmVudE1hcC5nZXQoZXZlbnQpO1xyXG4gICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBzdWJsaXN0Lmxlbmd0aDsgaSsrKXtcclxuICAgICAgICAgICAgdmFyIGNhbGxiYWNrSW5NYXAgPSBzdWJsaXN0W2ldO1xyXG4gICAgICAgICAgICBpZihjYWxsYmFja0luTWFwID09IGNhbGxiYWNrKXtcclxuICAgICAgICAgICAgICAgIHN1Ymxpc3Quc3BsaWNlKGksMSlcclxuICAgICAgICAgICAgICAgIHJldHVybiAgXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuRXZlbnRIYW5kbGVyLmV2ZW50TWFwID0gbmV3IE1hcCgpO1xyXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50SGFuZGxlciIsInZhciBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzJylcclxudmFyIGN0eHQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKVxyXG52YXIgbGFzdFVwZGF0ZSA9IERhdGUubm93KCk7XHJcbnZhciBkdDtcclxudmFyIHBpID0gTWF0aC5QSVxyXG52YXIgcmVzZXRCdG4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcmVzZXRCdG4nKVxyXG52YXIgdGVhbUxhYmVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3RlYW1MYWJlbCcpXHJcbnZhciB0dXJuTGFiZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjdHVybkxhYmVsJylcclxuXHJcbnZhciBWZWN0b3IgPSByZXF1aXJlKCcuL1ZlY3RvcicpXHJcbnZhciBVdGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKVxyXG52YXIgRXZlbnRIYW5kbGVyID0gcmVxdWlyZSgnLi9ldmVudEhhbmRsZXInKVxyXG52YXIgQ2hlc3NQaWVjZSA9IHJlcXVpcmUoJy4vQ2hlc3NQaWVjZScpXHJcbnZhciBDaGVzc0JvYXJkID0gcmVxdWlyZSgnLi9DaGVzc0JvYXJkJylcclxudmFyIEFBQkIgPSByZXF1aXJlKCcuL0FBQkInKVxyXG52YXIgV2ViSU9DID0gcmVxdWlyZSgnLi9XZWJJT0MnKVxyXG5cclxudmFyIHNvY2tldFxyXG5pZih3aW5kb3cubG9jYXRpb24uaHJlZiA9PSAnaHR0cDovL2xvY2FsaG9zdDo4MDAwLycpc29ja2V0ID0gbmV3IFdlYlNvY2tldChcIndzOi8vbG9jYWxob3N0OjgwMDAvXCIpO1xyXG5lbHNlIHNvY2tldCA9IG5ldyBXZWJTb2NrZXQoXCJ3c3M6Ly9wYXVsY2hlc3MuaGVyb2t1YXBwLmNvbS9cIik7XHJcbnZhciB3ZWJJT0MgPSBuZXcgV2ViSU9DKHNvY2tldCk7XHJcbnZhciBUZWFtID0gQ2hlc3NQaWVjZS5UZWFtXHJcbnZhciBUeXBlID0gQ2hlc3NQaWVjZS5UeXBlXHJcbnZhciB0ZWFtXHJcbnZhciBjYW52YXNDb250YWluZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjY2FudmFzLWNvbnRhaW5lcicpXHJcbmNhbnZhcy53aWR0aCA9IGNhbnZhc0NvbnRhaW5lci5vZmZzZXRXaWR0aCAtIDNcclxuY2FudmFzLmhlaWdodCA9IGNhbnZhc0NvbnRhaW5lci5vZmZzZXRIZWlnaHQgLSAxMDBcclxuXHJcbnZhciBpbWFnZUxvYWRDb3VudGVyID0gMDtcclxuRXZlbnRIYW5kbGVyLnN1YnNjcmliZSgnaW1hZ2VMb2FkZWQnLCAoZGF0YSkgPT57XHJcbiAgICBpbWFnZUxvYWRDb3VudGVyKys7XHJcbiAgICBpZihpbWFnZUxvYWRDb3VudGVyID49IDEyKXtcclxuICAgICAgICBjaGVzc0JvYXJkLmRyYXcoY3R4dCwgb2Zmc2V0KVxyXG4gICAgfVxyXG59KVxyXG5cclxudmFyIGNoZXNzQm9hcmQgPSBuZXcgQ2hlc3NCb2FyZCgpO1xyXG4vL2FzZGFcclxuc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKXtcclxuICAgIHZhciBub3cgPSBEYXRlLm5vdygpO1xyXG4gICAgZHQgPSAobm93IC0gbGFzdFVwZGF0ZSkgLyAxMDAwO1xyXG4gICAgbGFzdFVwZGF0ZSA9IG5vdztcclxuICAgIGR0ID0gVXRpbHMubWluKGR0LCAxKVxyXG4gICAgdXBkYXRlKClcclxuICAgIGRyYXcoKTtcclxuICAgIFxyXG59LCAxMDAwIC8gNjApO1xyXG52YXIgaGFsZnNpemUgPSBjaGVzc0JvYXJkLnNpemUueCAqIGNoZXNzQm9hcmQuc3F1YXJlU2l6ZS54IC8gMlxyXG52YXIgb2Zmc2V0ID0gbmV3IFZlY3RvcihNYXRoLmZsb29yKGNhbnZhcy53aWR0aCAvIDIgLSBoYWxmc2l6ZSksIE1hdGguZmxvb3IoY2FudmFzLmhlaWdodCAvIDIgLSBoYWxmc2l6ZSkpXHJcbmNoZXNzQm9hcmQuZHJhdyhjdHh0LCBvZmZzZXQpXHJcblxyXG5cclxucmVzZXRCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PntcclxuICAgIHdlYklPQy5zZW5kKCdyZXNldCcsIHt9KVxyXG59KVxyXG5cclxud2ViSU9DLm9uKCd1cGRhdGUnLCAoZGF0YSk9PntcclxuICAgIGNoZXNzQm9hcmQgPSBDaGVzc0JvYXJkLmRlc2VyaWFsaXplKGRhdGEuY2hlc3NCb2FyZClcclxuICAgIHRlYW0gPSBkYXRhLnRlYW1cclxuICAgIHRlYW1MYWJlbC5pbm5lckhUTUwgPSBUZWFtW3RlYW1dXHJcbiAgICB0dXJuTGFiZWwuaW5uZXJIVE1MID0gVGVhbVtjaGVzc0JvYXJkLnR1cm5dXHJcbiAgICBjaGVzc0JvYXJkLmRyYXcoY3R4dCwgb2Zmc2V0KVxyXG59KVxyXG5cclxuZG9jdW1lbnQub25tb3VzZWRvd24gPSAoZXZ0KSA9PiB7XHJcbiAgICB2YXIgYWFiYiA9IG5ldyBBQUJCKG5ldyBWZWN0b3IoKSwgY2hlc3NCb2FyZC5zaXplLmMoKS5zdWIobmV3IFZlY3RvcigxLDEpKSlcclxuICAgIHZhciB2ID0gY2hlc3NCb2FyZC52ZWN0b3JUb0dyaWRQb3MoZ2V0TW91c2VQb3MoY2FudmFzLCBldnQpLnN1YihvZmZzZXQpKVxyXG4gICAgXHJcbiAgICBcclxuICAgIGlmKCFhYWJiLmNvbGxpZGUodikpe1xyXG4gICAgICAgIGNoZXNzQm9hcmQuc2VsZWN0ZWQgPSBudWxsO1xyXG4gICAgfWVsc2V7XHJcbiAgICAgICAgdmFyIHBpZWNlID0gY2hlc3NCb2FyZC5ncmlkW3YueF1bdi55XVxyXG5cclxuICAgICAgICBpZihjaGVzc0JvYXJkLnNlbGVjdGVkID09IG51bGwpe1xyXG4gICAgICAgICAgICBpZihwaWVjZSAmJiBwaWVjZS50ZWFtID09IGNoZXNzQm9hcmQudHVybiAmJiBwaWVjZS50ZWFtID09IHRlYW0pe1xyXG4gICAgICAgICAgICAgICAgY2hlc3NCb2FyZC5zZWxlY3RlZCA9IHBpZWNlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgaWYocGllY2UgJiYgcGllY2UudGVhbSA9PSBjaGVzc0JvYXJkLnR1cm4pY2hlc3NCb2FyZC5zZWxlY3RlZCA9IHBpZWNlXHJcbiAgICAgICAgICAgIGVsc2V7XHJcbiAgICAgICAgICAgICAgICBpZihjaGVzc0JvYXJkLnNlbGVjdGVkLmlzTGVnYWxNb3ZlKHYpKXtcclxuICAgICAgICAgICAgICAgICAgICB3ZWJJT0Muc2VuZCgnbW92ZScsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZnJvbTpjaGVzc0JvYXJkLnNlbGVjdGVkLnBvcy5zZXJpYWxpemUoKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdG86di5zZXJpYWxpemUoKVxyXG4gICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjaGVzc0JvYXJkLnNlbGVjdGVkID0gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGNoZXNzQm9hcmQuZHJhdyhjdHh0LCBvZmZzZXQpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZSgpe1xyXG59XHJcblxyXG5mdW5jdGlvbiBkcmF3KCl7XHJcbiAgICAvL2N0eHQuY2xlYXJSZWN0KDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldE1vdXNlUG9zKGNhbnZhcywgZXZ0KSB7XHJcbiAgICB2YXIgcmVjdCA9IGNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgIHJldHVybiBuZXcgVmVjdG9yKGV2dC5jbGllbnRYIC0gcmVjdC5sZWZ0LCBldnQuY2xpZW50WSAtIHJlY3QudG9wKVxyXG59IiwidmFyIFZlY3RvciA9IHJlcXVpcmUoJy4vdmVjdG9yJylcclxuXHJcbmNsYXNzIFV0aWxze1xyXG4gICAgc3RhdGljIG1hcCh2YWwxLCBzdGFydDEsIHN0b3AxLCBzdGFydDIsIHN0b3AyKXtcclxuICAgICAgICByZXR1cm4gc3RhcnQyICsgKHN0b3AyIC0gc3RhcnQyKSAqICgodmFsMSAtIHN0YXJ0MSkgLyAoc3RvcDEgLSBzdGFydDEpKVxyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBpblJhbmdlKG1pbiAsbWF4ICx2YWx1ZSl7XHJcbiAgICAgICAgaWYobWluID4gbWF4KXtcclxuICAgICAgICAgICAgdmFyIHRlbXAgPSBtaW47XHJcbiAgICAgICAgICAgIG1pbiA9IG1heDtcclxuICAgICAgICAgICAgbWF4ID0gdGVtcDtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHZhbHVlIDw9IG1heCAmJiB2YWx1ZSA+PSBtaW47XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIG1pbihhLCBiKXtcclxuICAgICAgICBpZihhIDwgYilyZXR1cm4gYTtcclxuICAgICAgICByZXR1cm4gYjtcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgbWF4KGEsIGIpe1xyXG4gICAgICAgIGlmKGEgPiBiKXJldHVybiBhO1xyXG4gICAgICAgIHJldHVybiBiO1xyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBjbGFtcCh2YWwsIG1pbiwgbWF4KXtcclxuICAgICAgICByZXR1cm4gdGhpcy5tYXgodGhpcy5taW4odmFsLCBtYXgpLCBtaW4pXHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIHJhbmdlQ29udGFpbihhMSxhMixiMSxiMil7Ly9hcyBpbiBkb2VzIGEgZW5jbG9zZSBiLS0tLS0gc28gcmV0dXJucyB0cnVlIGlmIGIgaXMgc21hbGxlciBpbiBhbGwgd2F5c1xyXG4gICAgICAgIHJldHVybiBtYXgoYTEsIGEyKSA+PSBtYXgoYjEsIGIyKSAmJiBtaW4oYTEsYTIpIDw9IG1heChiMSxiMik7XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGNyZWF0ZTJkQXJyYXkodiwgZmlsbCl7XHJcbiAgICAgICAgdmFyIHJvd3MgPSBuZXcgQXJyYXkodi54KVxyXG4gICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCB2Lng7IGkrKyl7XHJcbiAgICAgICAgICAgIHJvd3NbaV0gPSBuZXcgQXJyYXkodi55KVxyXG4gICAgICAgICAgICBmb3IodmFyIGogPSAwOyBqIDwgdi55OyBqKyspe1xyXG4gICAgICAgICAgICAgICAgcm93c1tpXVtqXSA9IGZpbGxcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcm93cztcclxuICAgIH1cclxuXHJcbiAgICBcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBVdGlsczsiLCJjbGFzcyBWZWN0b3J7XHJcbiAgICBcclxuICAgIGNvbnN0cnVjdG9yKHggPSAwLCB5ID0gMCl7XHJcbiAgICAgICAgdGhpcy54ID0geDtcclxuICAgICAgICB0aGlzLnkgPSB5O1xyXG4gICAgfVxyXG5cclxuICAgIGFkZCh2ZWN0b3Ipe1xyXG4gICAgICAgIHRoaXMueCArPSB2ZWN0b3IueDtcclxuICAgICAgICB0aGlzLnkgKz0gdmVjdG9yLnk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgc3ViKHZlY3Rvcil7XHJcbiAgICAgICAgdGhpcy54IC09IHZlY3Rvci54O1xyXG4gICAgICAgIHRoaXMueSAtPSB2ZWN0b3IueTtcclxuICAgICAgICByZXR1cm4gdGhpc1xyXG4gICAgfVxyXG5cclxuICAgIGxlbmd0aCgpe1xyXG4gICAgICAgIHJldHVybiBNYXRoLnBvdyh0aGlzLnggKiB0aGlzLnggKyB0aGlzLnkgKiB0aGlzLnksIDAuNSk7XHJcbiAgICB9XHJcblxyXG4gICAgbm9ybWFsaXplKCl7XHJcbiAgICAgICAgdmFyIGxlbmd0aCA9IHRoaXMubGVuZ3RoKCk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc2NhbGUoMSAvIGxlbmd0aClcclxuICAgIH1cclxuXHJcbiAgICBzY2FsZShzY2FsYXIpe1xyXG4gICAgICAgIHRoaXMueCAqPSBzY2FsYXI7XHJcbiAgICAgICAgdGhpcy55ICo9IHNjYWxhclxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHJvdGF0ZShyLCBvcmlnaW4gPSBuZXcgVmVjdG9yKCkpe1xyXG4gICAgICAgIHZhciBvZmZzZXQgPSB0aGlzLmMoKS5zdWIob3JpZ2luKVxyXG4gICAgICAgIHZhciB4ID0gb2Zmc2V0LnggKiBNYXRoLmNvcyhyKSAtIG9mZnNldC55ICogTWF0aC5zaW4ocilcclxuICAgICAgICB2YXIgeSA9IG9mZnNldC54ICogTWF0aC5zaW4ocikgKyBvZmZzZXQueSAqIE1hdGguY29zKHIpXHJcbiAgICAgICAgb2Zmc2V0LnggPSB4OyBvZmZzZXQueSA9IHk7XHJcbiAgICAgICAgdmFyIGJhY2sgPSBvZmZzZXQuYWRkKG9yaWdpbilcclxuICAgICAgICB0aGlzLnggPSBiYWNrLng7IHRoaXMueSA9IGJhY2sueTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBsZXJwKHZlY3Rvciwgd2VpZ3RoKXtcclxuICAgICAgICByZXR1cm4gdGhpcy5zY2FsZSgxIC0gd2VpZ3RoKS5hZGQodmVjdG9yLmMoKS5zY2FsZSh3ZWlndGgpKVxyXG4gICAgfVxyXG5cclxuICAgIGMoKXtcclxuICAgICAgICByZXR1cm4gbmV3IFZlY3Rvcih0aGlzLngsIHRoaXMueSlcclxuICAgIH1cclxuXHJcbiAgICBlcXVhbHModil7XHJcbiAgICAgICAgaWYodiA9PSBudWxsKXJldHVybiBmYWxzZVxyXG4gICAgICAgIHJldHVybiB0aGlzLnggPT0gdi54ICYmIHRoaXMueSA9PSB2Lnk7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0KHZlY3Rvcil7XHJcbiAgICAgICAgdGhpcy54ID0gdmVjdG9yLng7XHJcbiAgICAgICAgdGhpcy55ID0gdmVjdG9yLnk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgcGVycERvdCh2ZWN0b3Ipe1xyXG4gICAgICAgIHJldHVybiBNYXRoLmF0YW4yKCB0aGlzLnggKiB2ZWN0b3IueSAtIHRoaXMueSAqIHZlY3Rvci54LCB0aGlzLnggKiB2ZWN0b3IueCArIHRoaXMueSAqIHZlY3Rvci55IClcclxuICAgIH1cclxuXHJcbiAgICBkcmF3KGN0eHQpe1xyXG4gICAgICAgIHZhciB3aWR0aCA9IDEwO3ZhciBoYWxmID0gd2lkdGggLyAyO1xyXG4gICAgICAgIGN0eHQuZmlsbFJlY3QodGhpcy54IC0gaGFsZiwgdGhpcy55IC0gaGFsZiwgd2lkdGgsIHdpZHRoKTtcclxuICAgIH1cclxuXHJcbiAgICBsb29wKGNhbGxiYWNrKXtcclxuICAgICAgICBmb3IodmFyIHggPSAwOyB4IDwgdGhpcy54OyB4Kyspe1xyXG4gICAgICAgICAgICBmb3IodmFyIHkgPSAwOyB5IDwgdGhpcy55OyB5Kyspe1xyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobmV3IFZlY3Rvcih4LCB5KSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgc2VyaWFsaXplKCl7XHJcbiAgICAgICAgcmV0dXJuIHt4OnRoaXMueCwgeTp0aGlzLnl9XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGRlc2VyaWFsaXplKG9iamVjdCl7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWN0b3Iob2JqZWN0LngsIG9iamVjdC55KVxyXG4gICAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFZlY3RvcjsiXX0=
