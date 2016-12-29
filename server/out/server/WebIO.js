"use strict";
var Team;
(function (Team) {
    Team[Team["Black"] = 0] = "Black";
    Team[Team["White"] = 1] = "White";
})(Team || (Team = {}));
var WebIO = (function () {
    function WebIO(socket) {
        var _this = this;
        this.socket = socket;
        this.routeMap = {};
        this.socket.onmessage = function (event) {
            var data = event.data;
            var parsedData = JSON.parse(data);
            if (_this.routeMap[parsedData.route]) {
                _this.routeMap[parsedData.route](parsedData);
            }
            else {
                console.log('404: ' + parsedData.route);
            }
        };
        this.socket.onclose = function () {
            _this.onclose();
        };
    }
    WebIO.prototype.on = function (route, action) {
        this.routeMap[route] = action;
    };
    WebIO.prototype.send = function (route, value) {
        value.route = route;
        if (this.socket.readyState == 1) {
            this.socket.send(JSON.stringify(value));
        }
    };
    WebIO.prototype.onclose = function () {
    };
    WebIO.prototype.close = function () {
        this.socket.close();
    };
    return WebIO;
}());
exports.__esModule = true;
exports["default"] = WebIO;
//# sourceMappingURL=WebIO.js.map