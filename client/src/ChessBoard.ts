import Vector = require('./Vector')
import Utils = require('./utils')
import AABB = require('./AABB')
import ChessPiece = require('./ChessPiece')
enum Team{Black, White}

class ChessBoard{
    size:Vector
    squareSize:Vector
    grid:ChessPiece[][]
    turn:Team
    selected:ChessPiece

    constructor(){
        this.size = new Vector(8,8)
        this.squareSize = new Vector(50, 50)
        this.turn = Team.White
        this.grid = Utils.create2dArray<ChessPiece>(this.size, null);
    }

    tryFromTo(from:Vector, to:Vector):boolean{
        var fromPiece = this.grid[from.x][from.y]//could outofrange from badclient
        return fromPiece.tryMove(to)
    }

    draw(ctxt:CanvasRenderingContext2D){
        var legalsSpots:boolean[][];
        if(this.selected)legalsSpots = this.selected.posChecker(this.selected, this)
        this.size.loop((v) =>{
            if((v.x + v.y) % 2 == 0)ctxt.fillStyle = "#fff"
            else ctxt.fillStyle = "#000"
            if(this.selected && v.equals(this.selected.pos))ctxt.fillStyle = "#0ff"
            
            if(this.selected && legalsSpots[v.x][v.y])ctxt.fillStyle = "#f00"
            ctxt.fillRect(v.x * this.squareSize.x, v.y * this.squareSize.y, this.squareSize.x, this.squareSize.y)
            if(this.grid[v.x][v.y]){
                this.grid[v.x][v.y].draw(ctxt, this.squareSize, v)
            }
        })
    }

    vectorToGridPos(v:Vector):Vector{
        var n = new Vector();
        n.x = Math.floor(v.x / this.squareSize.x)
        n.y = Math.floor(v.y / this.squareSize.y)
        return n;
    }

    add(c:ChessPiece){
        this.grid[c.pos.x][c.pos.y] = c;
    }

    serialize():any{
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
        var grid = Utils.create2dArray<ChessPiece>(chessBoard.size, null)
        chessBoard.size.loop((v) => {
            if(object.grid[v.x][v.y])grid[v.x][v.y] = ChessPiece.deserialize(object.grid[v.x][v.y], chessBoard)
        })
        chessBoard.grid = grid
        chessBoard.turn = object.turn
        if(object.selected)chessBoard.selected = ChessPiece.deserialize(object.selected, chessBoard)
        return chessBoard
    }
}

export = ChessBoard