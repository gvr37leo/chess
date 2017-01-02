"use strict";
var express = require('express');
var ws_1 = require('ws');
var path = require('path');
var http = require('http');
var WebIO_1 = require('./WebIO');
var ChessBoard = require('../client/src/ChessBoard');
var ChessPiece = require('../client/src/ChessPiece');
var Vector = require('../client/src/vector');
var EventHandler = require('../client/src/eventHandler');
var Team;
(function (Team) {
    Team[Team["Black"] = 0] = "Black";
    Team[Team["White"] = 1] = "White";
})(Team || (Team = {}));
var Type;
(function (Type) {
    Type[Type["pawn"] = 0] = "pawn";
    Type[Type["rook"] = 1] = "rook";
    Type[Type["knight"] = 2] = "knight";
    Type[Type["bishop"] = 3] = "bishop";
    Type[Type["queen"] = 4] = "queen";
    Type[Type["king"] = 5] = "king";
})(Type || (Type = {}));
var server = http.createServer();
var wss = new ws_1.Server({ server: server });
var app = express();
var port = process.env.PORT || 8000;
var player1;
var player2;
var chessBoard = new ChessBoard();
fillChessBoard(chessBoard);
EventHandler.subscribe('gameOver', function (c) {
    chessBoard = new ChessBoard();
    fillChessBoard(chessBoard);
    updateClients();
});
wss.on('connection', function (client) {
    console.log('client connected');
    var webIO = new WebIO_1["default"](client);
    if (!player1) {
        player1 = webIO;
        player1.team = Team.White;
    }
    else if (!player2) {
        player2 = webIO;
        player2.team = Team.Black;
    }
    updateClients();
    webIO.on('move', function (data) {
        if (webIO.team != chessBoard.turn)
            return;
        var from = Vector.deserialize(data.from);
        var to = Vector.deserialize(data.to);
        chessBoard.tryFromTo(from, to); //returns true/false
        updateClients();
    });
    webIO.on('reset', function (data) {
        chessBoard = new ChessBoard();
        fillChessBoard(chessBoard);
        updateClients();
    });
    webIO.onclose = function () {
        if (player1 && player1.socket.readyState == 3)
            player1 = null;
        if (player2 && player2.socket.readyState == 3)
            player2 = null;
    };
});
function updateClients() {
    var c = chessBoard.serialize();
    if (player1)
        player1.send('update', { chessBoard: c, team: player1.team });
    if (player2)
        player2.send('update', { chessBoard: c, team: player2.team });
}
app.use('/', express.static(path.join(__dirname, '../../../client'))); //typescript kinda fucks this up
server.on('request', app);
server.listen(port, function () {
    console.log('listening on ' + port);
});
function fillChessBoard(chessBoard) {
    chessBoard.add(new ChessPiece(Type.rook, Team.Black, new Vector(0, 0), chessBoard));
    // chessBoard.add(new ChessPiece(Type.knight, Team.Black, new Vector(1, 0), chessBoard))
    // chessBoard.add(new ChessPiece(Type.bishop, Team.Black, new Vector(2, 0), chessBoard))
    // chessBoard.add(new ChessPiece(Type.queen, Team.Black, new Vector(3, 0), chessBoard))
    chessBoard.add(new ChessPiece(Type.king, Team.Black, new Vector(4, 0), chessBoard));
    chessBoard.add(new ChessPiece(Type.bishop, Team.Black, new Vector(5, 0), chessBoard));
    chessBoard.add(new ChessPiece(Type.knight, Team.Black, new Vector(6, 0), chessBoard));
    chessBoard.add(new ChessPiece(Type.rook, Team.Black, new Vector(7, 0), chessBoard));
    for (var x = 0; x < 8; x++)
        chessBoard.add(new ChessPiece(Type.pawn, Team.Black, new Vector(x, 1), chessBoard));
    chessBoard.add(new ChessPiece(Type.rook, Team.White, new Vector(0, 7), chessBoard));
    // chessBoard.add(new ChessPiece(Type.knight, Team.White, new Vector(1, 7), chessBoard))
    // chessBoard.add(new ChessPiece(Type.bishop, Team.White, new Vector(2, 7), chessBoard))
    // chessBoard.add(new ChessPiece(Type.queen, Team.White, new Vector(3, 7), chessBoard))
    chessBoard.add(new ChessPiece(Type.king, Team.White, new Vector(4, 7), chessBoard));
    chessBoard.add(new ChessPiece(Type.bishop, Team.White, new Vector(5, 7), chessBoard));
    chessBoard.add(new ChessPiece(Type.knight, Team.White, new Vector(6, 7), chessBoard));
    chessBoard.add(new ChessPiece(Type.rook, Team.White, new Vector(7, 7), chessBoard));
    for (var x = 0; x < 8; x++)
        chessBoard.add(new ChessPiece(Type.pawn, Team.White, new Vector(x, 6), chessBoard));
}
//# sourceMappingURL=server.js.map