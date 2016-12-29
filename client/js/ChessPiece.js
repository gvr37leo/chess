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