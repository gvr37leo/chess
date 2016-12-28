class WebIOC{
    socket:WebSocket
    routeMap

    constructor(socket:WebSocket){
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

    onclose(){

    }

    close(){
        this.socket.close();
    }
}

export = WebIOC