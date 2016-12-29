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
        var serialized = {
            size:this.size.serialize(),
            squareSize:this.squareSize.serialize(),
            grid:grid,
            turn:this.turn,
            selected:selected
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

var socket = new WebSocket("ws://localhost:8000/");
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
},{}]},{},[6]);
