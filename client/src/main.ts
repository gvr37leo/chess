var canvas = <HTMLCanvasElement> document.getElementById('canvas')
var ctxt = canvas.getContext('2d')
var lastUpdate = Date.now();
var dt:number;
var pi = Math.PI



import Vector = require('./Vector')
import Utils = require('./utils')
import EventHandler = require('./eventHandler')
import ChessPiece = require('./ChessPiece')
import ChessBoard = require('./ChessBoard')
import AABB = require('./AABB')
import WebIOC = require('./WebIOC')

var socket = new WebSocket("ws://localhost:8000/");
var webIOC = new WebIOC(socket);
enum Team{Black, White}
enum Type{pawn, rook, knight, bisshop, queen, king}

var canvasContainer:any = document.querySelector('#canvas-container')
canvas.width = canvasContainer.offsetWidth - 3
canvas.height = canvasContainer.offsetHeight - 3


var chessBoard = new ChessBoard();
// initChessBoard();
// function initChessBoard(){
//     chessBoard.add(new ChessPiece(Type.rook, Team.Black, new Vector(0, 0), chessBoard))
//     chessBoard.add(new ChessPiece(Type.knight, Team.Black, new Vector(1, 0), chessBoard))
//     chessBoard.add(new ChessPiece(Type.bisshop, Team.Black, new Vector(2, 0), chessBoard))
//     chessBoard.add(new ChessPiece(Type.queen, Team.Black, new Vector(3, 0), chessBoard))
//     chessBoard.add(new ChessPiece(Type.king, Team.Black, new Vector(4, 0), chessBoard))
//     chessBoard.add(new ChessPiece(Type.bisshop, Team.Black, new Vector(5, 0), chessBoard))
//     chessBoard.add(new ChessPiece(Type.knight, Team.Black, new Vector(6, 0), chessBoard))
//     chessBoard.add(new ChessPiece(Type.rook, Team.Black, new Vector(7, 0), chessBoard))
//     for(var x = 0; x < 8; x++)chessBoard.add(new ChessPiece(Type.pawn, Team.Black, new Vector(x, 1), chessBoard))

//     chessBoard.add(new ChessPiece(Type.rook, Team.White, new Vector(0, 7), chessBoard))
//     chessBoard.add(new ChessPiece(Type.knight, Team.White, new Vector(1, 7), chessBoard))
//     chessBoard.add(new ChessPiece(Type.bisshop, Team.White, new Vector(2, 7), chessBoard))
//     chessBoard.add(new ChessPiece(Type.queen, Team.White, new Vector(3, 7), chessBoard))
//     chessBoard.add(new ChessPiece(Type.king, Team.White, new Vector(4, 7), chessBoard))
//     chessBoard.add(new ChessPiece(Type.bisshop, Team.White, new Vector(5, 7), chessBoard))
//     chessBoard.add(new ChessPiece(Type.knight, Team.White, new Vector(6, 7), chessBoard))
//     chessBoard.add(new ChessPiece(Type.rook, Team.White, new Vector(7, 7), chessBoard))
//     for(var x = 0; x < 8; x++)chessBoard.add(new ChessPiece(Type.pawn, Team.White, new Vector(x, 6), chessBoard))
// }



setInterval(function(){
    var now = Date.now();
    dt = (now - lastUpdate) / 1000;
    lastUpdate = now;
    dt = Utils.min(dt, 1)
    update()
    draw();
    
}, 1000 / 60);

chessBoard.draw(ctxt)

// EventHandler.subscribe('gameOver', (c:ChessPiece)=>{
//     chessBoard = new ChessBoard()
//     initChessBoard()
// })

webIOC.on('update', (data)=>{
    chessBoard = ChessBoard.deserialize(data)
})

document.onmousedown = (evt) => {
    var aabb = new AABB(new Vector(), chessBoard.size.c().sub(new Vector(1,1)))
    var v = chessBoard.vectorToGridPos(getMousePos(canvas, evt))
    
    
    if(!aabb.collide(v)){
        chessBoard.selected = null;
    }else{
        var piece = chessBoard.grid[v.x][v.y]

        if(chessBoard.selected == null){
            if(piece && piece.team == chessBoard.turn){
                chessBoard.selected = piece
            }
        }else{
            if(piece && piece.team == chessBoard.turn)chessBoard.selected = piece
            else{
                var from = chessBoard.selected.pos.c()
                if(chessBoard.selected.tryMove(v)){
                    webIOC.send('move', {
                        from:from.serialize(),
                        to:chessBoard.selected.pos.serialize()
                    })
                }
                chessBoard.selected = null;
            }
        }
    }
    chessBoard.draw(ctxt)
}

function update(){
}

function draw(){
    //ctxt.clearRect(0, 0, canvas.width, canvas.height);
}

function getMousePos(canvas, evt):Vector {
    var rect = canvas.getBoundingClientRect();
    return new Vector(evt.clientX - rect.left, evt.clientY - rect.top)
}