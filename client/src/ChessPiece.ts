import Vector = require('./Vector')
import Utils = require('./utils')
import ChessBoard = require('./ChessBoard')
import AABB = require('./AABB')
import EventHandler = require('./eventHandler')
enum Team{Black, White}
enum Type{pawn, rook, knight, bisshop, queen, king}

class ChessPiece{
    type:Type
    pos:Vector
    team:Team
    chessBoard:ChessBoard
    moved:boolean = false
    posChecker:(c:ChessPiece, chessBoard:ChessBoard) => boolean[][]
    
    constructor(type:Type, team:Team, pos:Vector, chessBoard:ChessBoard){
        this.pos = pos
        this.chessBoard = chessBoard
        this.posChecker = checkMap.get(type)
        this.type = type
        this.team = team
        
    }

    draw(ctxt:CanvasRenderingContext2D, squareSize:Vector, v:Vector){
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
        ctxt.strokeRect(0.5 + this.pos.x * squareSize.x + squareSize.x / 2 - halfsize, 0.5 + this.pos.y * squareSize.y + squareSize.y / 2 - halfsize, size, size)
        ctxt.fillRect( 1 + this.pos.x * squareSize.x + squareSize.x / 2 - halfsize,  1 + this.pos.y * squareSize.y + squareSize.y / 2 - halfsize, size - 1, size - 1)
        if(this.team == Team.Black)ctxt.fillStyle = '#fff'
        else ctxt.fillStyle = '#000'
        
        ctxt.fillText(letterMap[this.type], this.pos.x * squareSize.x + squareSize.x / 2, this.pos.y * squareSize.y + squareSize.y / 2)
    }

    tryMove(v:Vector):boolean{    
        if(this.posChecker(this, this.chessBoard)[v.x][v.y]){
            var piece = this.chessBoard.grid[v.x][v.y]
            if(piece && piece.type == Type.king) EventHandler.trigger('gameOver', piece)
            this.chessBoard.grid[v.x][v.y] = this;
            this.chessBoard.grid[this.pos.x][this.pos.y] = null;
            this.pos = v;
            this.moved = true;
            
            if(this.chessBoard.turn == Team.Black)this.chessBoard.turn = Team.White
            else this.chessBoard.turn = Team.Black
            
        }
        return false
    }

    serialize(){
        return {
            type:this.type,
            pos:this.pos.serialize(),
            team:this.team,
            moved:this.moved
        }
    }

    static deserialize(object:any, chessBoard:ChessBoard):ChessPiece{
        var c = new ChessPiece(object.type, object.team, Vector.deserialize(object.pos), chessBoard)
        c.moved = object.moved
        return c
    }
}

var checkMap = new Map<Type, (c:ChessPiece, chessBoard:ChessBoard) => boolean[][]>();

checkMap.set(Type.pawn, function(c:ChessPiece, board:ChessBoard):boolean[][]{
    var aabb = new AABB(new Vector(), board.size.c().sub(new Vector(1,1)))
    var moves:Vector[] = [];
    var facing:Vector;
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

checkMap.set(Type.rook, function(c:ChessPiece, grid:ChessBoard):boolean[][]{
    var directions = [
        new Vector(1, 0),
        new Vector(-1, 0),
        new Vector(0, 1),
        new Vector(0, -1)
    ]
    return directionStamp(directions, c);
})

checkMap.set(Type.knight, function(c:ChessPiece, grid:ChessBoard):boolean[][]{
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

checkMap.set(Type.bisshop, function(c:ChessPiece, grid:ChessBoard):boolean[][]{
    var directions = [
        new Vector(1, 1),
        new Vector(-1, -1),
        new Vector(1, -1),
        new Vector(-1, 1)
    ]
    return directionStamp(directions, c);
})

checkMap.set(Type.queen, function(c:ChessPiece):boolean[][]{
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

checkMap.set(Type.king, function(c:ChessPiece, grid:ChessBoard):boolean[][]{
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

function filterMovesOffBoard(moves:Vector[], size:Vector, pos:Vector):Vector[]{
    var legalMoves:Vector[] = [];
    var aabb = new AABB(new Vector(), size.c().sub(new Vector(1, 1)))

    for(var move of moves){
        var ws = move.c().add(pos)
        if(aabb.collide(ws))legalMoves.push(move)
    }

    return legalMoves;
}

function directionStamp(directions:Vector[], c:ChessPiece):boolean[][]{
    var aabb = new AABB(new Vector(), c.chessBoard.size.c().sub(new Vector(1,1)))
    var opens = Utils.create2dArray<boolean>(c.chessBoard.size, false)
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

function movesStamp(moves:Vector[], c:ChessPiece):boolean[][]{
    var aabb = new AABB(new Vector(), c.chessBoard.size.c().sub(new Vector(1,1)))
    var opens = Utils.create2dArray<boolean>(c.chessBoard.size, false)
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

export = ChessPiece