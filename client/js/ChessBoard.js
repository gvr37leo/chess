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