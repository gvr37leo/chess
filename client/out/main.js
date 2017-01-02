"use strict";
var canvas = document.getElementById('canvas');
var ctxt = canvas.getContext('2d');
var lastUpdate = Date.now();
var dt;
var pi = Math.PI;
var resetBtn = document.querySelector('#resetBtn');
var teamLabel = document.querySelector('#teamLabel');
var turnLabel = document.querySelector('#turnLabel');
var Vector = require('./Vector');
var Utils = require('./utils');
var ChessBoard = require('./ChessBoard');
var AABB = require('./AABB');
var WebIOC = require('./WebIOC');
var socket = new WebSocket("ws://localhost:8000/");
var webIOC = new WebIOC(socket);
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
    Type[Type["bisshop"] = 3] = "bisshop";
    Type[Type["queen"] = 4] = "queen";
    Type[Type["king"] = 5] = "king";
})(Type || (Type = {}));
var team;
var canvasContainer = document.querySelector('#canvas-container');
canvas.width = canvasContainer.offsetWidth - 3;
canvas.height = canvasContainer.offsetHeight - 100;
var chessBoard = new ChessBoard();
setInterval(function () {
    var now = Date.now();
    dt = (now - lastUpdate) / 1000;
    lastUpdate = now;
    dt = Utils.min(dt, 1);
    update();
    draw();
}, 1000 / 60);
var halfsize = chessBoard.size.x * chessBoard.squareSize.x / 2;
var offset = new Vector(Math.floor(canvas.width / 2 - halfsize), Math.floor(canvas.height / 2 - halfsize));
chessBoard.draw(ctxt, offset);
resetBtn.addEventListener('click', function () {
    webIOC.send('reset', {});
});
webIOC.on('update', function (data) {
    chessBoard = ChessBoard.deserialize(data.chessBoard);
    team = data.team;
    teamLabel.innerHTML = Team[team];
    turnLabel.innerHTML = Team[chessBoard.turn];
    chessBoard.draw(ctxt, offset);
});
document.onmousedown = function (evt) {
    var aabb = new AABB(new Vector(), chessBoard.size.c().sub(new Vector(1, 1)));
    var v = chessBoard.vectorToGridPos(getMousePos(canvas, evt).sub(offset));
    if (!aabb.collide(v)) {
        chessBoard.selected = null;
    }
    else {
        var piece = chessBoard.grid[v.x][v.y];
        if (chessBoard.selected == null) {
            if (piece && piece.team == chessBoard.turn && piece.team == team) {
                chessBoard.selected = piece;
            }
        }
        else {
            if (piece && piece.team == chessBoard.turn)
                chessBoard.selected = piece;
            else {
                if (chessBoard.selected.isLegalMove(v)) {
                    webIOC.send('move', {
                        from: chessBoard.selected.pos.serialize(),
                        to: v.serialize()
                    });
                }
                chessBoard.selected = null;
            }
        }
    }
    chessBoard.draw(ctxt, offset);
};
function update() {
}
function draw() {
    //ctxt.clearRect(0, 0, canvas.width, canvas.height);
}
function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return new Vector(evt.clientX - rect.left, evt.clientY - rect.top);
}
//# sourceMappingURL=main.js.map