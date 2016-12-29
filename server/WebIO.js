var ws = require('ws')
var Team = {}
Team[Team["Black"] = 0] = "Black";
Team[Team["White"] = 1] = "White";

class WebIO{
    constructor(socket){
        this.socket = socket;
        this.routeMap = {};
        this.socket.onmessage = (event) => {
            var data = event.data
            var parsedData = JSON.parse(data);
            if(this.routeMap[parsedData.route]){
                this.routeMap[parsedData.route](parsedData);
            }else{
                console.log('404: ' + parsedData.route);
            }
        }

        this.socket.onclose = () =>{
            this.onclose();
        }
    }

    on(route, action){//actions need to be passed using an arrow function or functions binded with .bind(this)
        this.routeMap[route] = action;
    }

    send(route, value){//value is object en geserialized
        value.route = route;
        if(this.socket.readyState==1){
          this.socket.send(JSON.stringify(value));
        }
    }

    onclose(){//only here so that calls to it dont cause nullpointer exceptions

    }

    close(){
        this.socket.close();
    }
}
