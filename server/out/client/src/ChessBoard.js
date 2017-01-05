"use strict";
var Vector = require('./vector');
var Utils = require('./utils');
var AABB = require('./AABB');
var ChessPiece = require('./ChessPiece');
var Team;
(function (Team) {
    Team[Team["Black"] = 0] = "Black";
    Team[Team["White"] = 1] = "White";
})(Team || (Team = {}));
var ChessBoard = (function () {
    function ChessBoard() {
        this.lastMoveTo = null;
        this.lastMoveFrom = null;
        this.size = new Vector(8, 8);
        this.AABB = new AABB(new Vector(), this.size.c().sub(new Vector(1, 1)));
        this.squareSize = new Vector(50, 50);
        this.turn = Team.White;
        this.grid = Utils.create2dArray(this.size, null);
    }
    ChessBoard.prototype.tryFromTo = function (from, to) {
        var fromPiece = this.grid[from.x][from.y]; //could outofrange from badclient
        return fromPiece.tryMove(to);
    };
    ChessBoard.prototype.draw = function (ctxt, offset) {
        var _this = this;
        var legalsSpots;
        if (this.selected)
            legalsSpots = this.selected.posChecker(this.selected, this);
        this.size.loop(function (v) {
            if ((v.x + v.y) % 2 == 0)
                ctxt.fillStyle = "#fff";
            else
                ctxt.fillStyle = "#000";
            if (_this.selected && v.equals(_this.selected.pos))
                ctxt.fillStyle = "#0ff";
            if (_this.lastMoveFrom && v.equals(_this.lastMoveFrom))
                ctxt.fillStyle = "#404";
            if (_this.lastMoveTo && v.equals(_this.lastMoveTo))
                ctxt.fillStyle = "#a0a";
            if (_this.selected && legalsSpots[v.x][v.y])
                ctxt.fillStyle = "#f00";
            ctxt.fillRect(v.x * _this.squareSize.x + offset.x, v.y * _this.squareSize.y + offset.y, _this.squareSize.x, _this.squareSize.y);
            if (_this.grid[v.x][v.y]) {
                _this.grid[v.x][v.y].draw(ctxt, _this.squareSize, offset);
            }
        });
    };
    ChessBoard.prototype.vectorToGridPos = function (v) {
        var n = new Vector();
        n.x = Math.floor(v.x / this.squareSize.x);
        n.y = Math.floor(v.y / this.squareSize.y);
        return n;
    };
    ChessBoard.prototype.add = function (c) {
        this.grid[c.pos.x][c.pos.y] = c;
    };
    ChessBoard.prototype.serialize = function () {
        var _this = this;
        var grid = Utils.create2dArray(this.size, null);
        this.size.loop(function (v) {
            if (_this.grid[v.x][v.y])
                grid[v.x][v.y] = _this.grid[v.x][v.y].serialize();
        });
        var selected;
        if (this.selected)
            selected = this.selected.serialize();
        var lastMoveFrom;
        if (this.lastMoveFrom)
            lastMoveFrom = this.lastMoveFrom.serialize();
        var lastMoveTo;
        if (this.lastMoveTo)
            lastMoveTo = this.lastMoveTo.serialize();
        var serialized = {
            size: this.size.serialize(),
            squareSize: this.squareSize.serialize(),
            grid: grid,
            turn: this.turn,
            selected: selected,
            lastMoveFrom: lastMoveFrom,
            lastMoveTo: lastMoveTo
        };
        return serialized;
    };
    ChessBoard.deserialize = function (object) {
        var chessBoard = new ChessBoard();
        var grid = Utils.create2dArray(chessBoard.size, null);
        chessBoard.size.loop(function (v) {
            if (object.grid[v.x][v.y])
                grid[v.x][v.y] = ChessPiece.deserialize(object.grid[v.x][v.y], chessBoard);
        });
        chessBoard.grid = grid;
        chessBoard.turn = object.turn;
        if (object.selected)
            chessBoard.selected = ChessPiece.deserialize(object.selected, chessBoard);
        if (object.lastMoveFrom)
            chessBoard.lastMoveFrom = Vector.deserialize(object.lastMoveFrom);
        if (object.lastMoveTo)
            chessBoard.lastMoveTo = Vector.deserialize(object.lastMoveTo);
        return chessBoard;
    };
    return ChessBoard;
}());
module.exports = ChessBoard;
//# sourceMappingURL=ChessBoard.js.map