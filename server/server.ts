import * as express from 'express'
import {Server} from 'ws'
import * as path from 'path'
import * as http from 'http'
import WebIO from './WebIO'
import ChessBoard = require('../client/src/ChessBoard')
import ChessPiece = require('../client/src/ChessPiece')
import Vector = require('../client/src/vector')
import EventHandler = require('../client/src/EventHandler')
enum Team{Black, White}
enum Type{pawn, rook, knight, bishop, queen, king}

var server = http.createServer()
var wss = new Server({server:server})
var app = express();
var port = process.env.PORT || 8000;
var player1:WebIO
var player2:WebIO
var chessBoard = new ChessBoard()
fillChessBoard(chessBoard);

EventHandler.subscribe('gameOver', (c:ChessPiece)=>{
    chessBoard = new ChessBoard()
    fillChessBoard(chessBoard)
    updateClients()
})

wss.on('connection', (client) =>{
    console.log('client connected')
    var webIO = new WebIO(client);
    if(!player1){
        player1 = webIO
        player1.team = Team.White
    }
    else if(!player2){
        player2 = webIO
        player2.team = Team.Black
    }
    
    
    updateClients()


    webIO.on('move', (data) => {
        if(webIO.team != chessBoard.turn)return
        var from = Vector.deserialize(data.from)
        var to = Vector.deserialize(data.to)
        chessBoard.tryFromTo(from, to)//returns true/false
        updateClients()
    })

    webIO.on('reset', (data) => {
        chessBoard = new ChessBoard()
        fillChessBoard(chessBoard)
        updateClients()
    })

    webIO.onclose = () =>{
        if(player1 && player1.socket.readyState == 3)player1 = null
        if(player2 && player2.socket.readyState == 3)player2 = null
    }
})

function updateClients(){
    var c = chessBoard.serialize()
    if(player1)player1.send('update', {chessBoard:c, team:player1.team})
    if(player2)player2.send('update', {chessBoard:c, team:player2.team})
}

app.use('/', express.static(path.join(__dirname, '../../../client')))//typescript kinda fucks this up

server.on('request', app)
server.listen(port, () =>{
    console.log('listening on ' + port)
})

function fillChessBoard(chessBoard:ChessBoard){
    chessBoard.add(new ChessPiece(Type.rook, Team.Black, new Vector(0, 0), chessBoard))
    chessBoard.add(new ChessPiece(Type.knight, Team.Black, new Vector(1, 0), chessBoard))
    chessBoard.add(new ChessPiece(Type.bishop, Team.Black, new Vector(2, 0), chessBoard))
    chessBoard.add(new ChessPiece(Type.queen, Team.Black, new Vector(3, 0), chessBoard))
    chessBoard.add(new ChessPiece(Type.king, Team.Black, new Vector(4, 0), chessBoard))
    chessBoard.add(new ChessPiece(Type.bishop, Team.Black, new Vector(5, 0), chessBoard))
    chessBoard.add(new ChessPiece(Type.knight, Team.Black, new Vector(6, 0), chessBoard))
    chessBoard.add(new ChessPiece(Type.rook, Team.Black, new Vector(7, 0), chessBoard))
    for(var x = 0; x < 8; x++)chessBoard.add(new ChessPiece(Type.pawn, Team.Black, new Vector(x, 1), chessBoard))

    chessBoard.add(new ChessPiece(Type.rook, Team.White, new Vector(0, 7), chessBoard))
    chessBoard.add(new ChessPiece(Type.knight, Team.White, new Vector(1, 7), chessBoard))
    chessBoard.add(new ChessPiece(Type.bishop, Team.White, new Vector(2, 7), chessBoard))
    chessBoard.add(new ChessPiece(Type.queen, Team.White, new Vector(3, 7), chessBoard))
    chessBoard.add(new ChessPiece(Type.king, Team.White, new Vector(4, 7), chessBoard))
    chessBoard.add(new ChessPiece(Type.bishop, Team.White, new Vector(5, 7), chessBoard))
    chessBoard.add(new ChessPiece(Type.knight, Team.White, new Vector(6, 7), chessBoard))
    chessBoard.add(new ChessPiece(Type.rook, Team.White, new Vector(7, 7), chessBoard))
    for(var x = 0; x < 8; x++)chessBoard.add(new ChessPiece(Type.pawn, Team.White, new Vector(x, 6), chessBoard))
}