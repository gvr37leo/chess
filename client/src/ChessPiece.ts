import Vector = require('./vector')
import Utils = require('./utils')
import ChessBoard = require('./ChessBoard')
import AABB = require('./AABB')
import EventHandler = require('./eventHandler')
enum Team{Black, White}
enum Type{pawn, rook, knight, bishop, queen, king}

declare class Map<K,V>{
    constructor()
    get(a:K):V
    set(a:K, b:V)
}

class ChessPiece{
    type:Type
    pos:Vector
    team:Team
    chessBoard:ChessBoard
    moved:boolean = false
    image:HTMLImageElement
    posChecker:(c:ChessPiece, chessBoard:ChessBoard) => boolean[][]
    
    constructor(type:Type, team:Team, pos:Vector, chessBoard:ChessBoard){
        if(typeof document != 'undefined'){ 
            if(team == Team.Black)this.image = imageMapB[Type[type]] 
            else this.image = imageMapW[Type[type]] 
        }

        this.pos = pos
        this.chessBoard = chessBoard
        this.posChecker = checkMap.get(type)
        this.type = type
        this.team = team
        
    }

    draw(ctxt:CanvasRenderingContext2D, squareSize:Vector, offset:Vector){
        var size = this.chessBoard.squareSize.x 
        var halfsize = size / 2
        ctxt.drawImage(this.image, offset.x + 0.5 + this.pos.x * squareSize.x + squareSize.x / 2 - halfsize, offset.y + 0.5 + this.pos.y * squareSize.y + squareSize.y / 2 - halfsize, size, size) 
    }

    tryMove(to:Vector):boolean{    
        if(this.posChecker(this, this.chessBoard)[to.x][to.y]){
            this.chessBoard.lastMoveFrom = this.pos.c()
            this.chessBoard.lastMoveTo = to.c()
            var fromTO = to.c().sub(this.pos)
            if(this.type == Type.king && fromTO.length() == 2){//check if castling occured
                fromTO.normalize()
                var rook = getPieceInDirection(this.pos, fromTO, Type.rook, this.chessBoard)
                rook.move(this.pos.c().add(fromTO))//assumes rook has been found because posChecker saw this as a legal move

            }

            var piece = this.chessBoard.grid[to.x][to.y]//check if hit piece is king
            if(piece && piece.type == Type.king) EventHandler.trigger('gameOver', piece)

            this.move(to)

            if(this.type == Type.pawn){//check for pawn promotion, atm always promotes to queen
                if(this.team == Team.Black && this.pos.y == this.chessBoard.size.y - 1
                || this.team == Team.White && this.pos.y == 0){
                    this.type = Type.queen
                    this.posChecker = checkMap.get(Type.queen)
                }
            }
            
            if(this.chessBoard.turn == Team.Black)this.chessBoard.turn = Team.White//switch turn
            else this.chessBoard.turn = Team.Black
            return true
        }
        return false
    }

    move(to:Vector){
        this.chessBoard.grid[to.x][to.y] = this;//move this piece to requested spot
        this.chessBoard.grid[this.pos.x][this.pos.y] = null;
        this.pos = to;
        this.moved = true;
    }

    isLegalMove(v:Vector):boolean{
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

checkMap.set(Type.bishop, function(c:ChessPiece, grid:ChessBoard):boolean[][]{
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
    var legalMoves = movesStamp(moves, c);
    
    if(!c.moved){//castling
        var aabb = new AABB(new Vector(), c.chessBoard.size.c().sub(new Vector(1,1)))
        var opens = Utils.create2dArray<boolean>(c.chessBoard.size, false)
        var rookDirections = [
            new Vector(1, 0),
            new Vector(-1, 0),
            new Vector(0, 1),
            new Vector(0, -1)
        ]
        for(var direction of rookDirections){
            var currentCheckingPos = c.pos.c();
            while(true){
                currentCheckingPos.add(direction)
                if(aabb.collide(currentCheckingPos)){
                    var piece = c.chessBoard.grid[currentCheckingPos.x][currentCheckingPos.y]
                    if(piece == null)continue
                    else{
                        if(piece.team == c.team && piece.type == Type.rook && !piece.moved){
                            var jumpPos = c.pos.c().add(direction.c().scale(2))
                            legalMoves[jumpPos.x][jumpPos.y] = true
                        }else break
                    }
                    
                }else break
            }
        }
    }

    return legalMoves
    
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

function getPieceInDirection(from:Vector, direction:Vector, type:Type, chessBoard:ChessBoard):ChessPiece{
    var aabb = new AABB(new Vector(), chessBoard.size.c().sub(new Vector(1,1)))
    var currentCheckingPos = from.c()
    while(true){
        currentCheckingPos.add(direction)
        if(aabb.collide(currentCheckingPos)){
            var piece = chessBoard.grid[currentCheckingPos.x][currentCheckingPos.y]
            if(piece && piece.type == type)return piece
        }else break
    }
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

export = ChessPiece