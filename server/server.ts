import * as express from 'express'
import * as ws from 'ws'
import * as path from 'path'
import * as http from 'http'
import WebIO from './WebIO'
import ChessBoard = require('../client/src/ChessBoard')
import Vector = require('../client/src/vector')

var server = http.createServer()
var wss = new ws.Server({server})
var app = express();
var port = process.env.PORT || 8000;
var clients:WebIO[] = []
var chessBoard = new ChessBoard()

wss.on('connection', (client:ws) =>{
    var webIO = new WebIO(client);
    
    clients.push(webIO)
    for(var _client of clients){
        _client.send('update', chessBoard.serialize())
    }


    webIO.on('move', (data) => {
        var from = Vector.deserialize(data.from)
        var to = Vector.deserialize(data.to)
        chessBoard.tryFromTo(from, to)//returns true/false
        for(var client of clients){
            client.send('update', chessBoard.serialize())
        }
    })
})

app.use('/', express.static(path.join(__dirname, '../../client')))

server.on('request', app)
app.listen(port, () =>{
    console.log('listening on ' + port)
})
