var canvas = <HTMLCanvasElement> document.getElementById('canvas')
var ctxt = canvas.getContext('2d')
var lastUpdate = Date.now();
var dt:number;
var pi = Math.PI
var resetBtn = document.querySelector('#resetBtn')


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
var team:Team

var canvasContainer:any = document.querySelector('#canvas-container')
canvas.width = canvasContainer.offsetWidth - 3
canvas.height = canvasContainer.offsetHeight - 3


var chessBoard = new ChessBoard();




setInterval(function(){
    var now = Date.now();
    dt = (now - lastUpdate) / 1000;
    lastUpdate = now;
    dt = Utils.min(dt, 1)
    update()
    draw();
    
}, 1000 / 60);

chessBoard.draw(ctxt)


resetBtn.addEventListener('click', () =>{
    webIOC.send('reset', {})
})

webIOC.on('update', (data)=>{
    chessBoard = ChessBoard.deserialize(data.chessBoard)
    team = data.team
    chessBoard.draw(ctxt)
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
                if(chessBoard.selected.isLegalMove(v)){
                    webIOC.send('move', {
                        from:from.serialize(),
                        to:v.serialize()
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