class Vector{
    x:number;
    y:number;
    
    constructor(x:number = 0, y:number = 0){
        this.x = x;
        this.y = y;
    }

    add(vector:Vector):Vector{
        this.x += vector.x;
        this.y += vector.y;
        return this;
    }

    sub(vector:Vector):Vector{
        this.x -= vector.x;
        this.y -= vector.y;
        return this
    }

    length(){
        return Math.pow(this.x * this.x + this.y * this.y, 0.5);
    }

    normalize(){
        var length = this.length();
        return this.scale(1 / length)
    }

    scale(scalar:number):Vector{
        this.x *= scalar;
        this.y *= scalar
        return this;
    }

    rotate(r:number, origin:Vector = new Vector()):Vector{
        var offset = this.c().sub(origin)
        var x = offset.x * Math.cos(r) - offset.y * Math.sin(r)
        var y = offset.x * Math.sin(r) + offset.y * Math.cos(r)
        offset.x = x; offset.y = y;
        var back = offset.add(origin)
        this.x = back.x; this.y = back.y;
        return this;
    }

    lerp(vector:Vector, weigth:number){
        return this.scale(1 - weigth).add(vector.c().scale(weigth))
    }

    c():Vector{
        return new Vector(this.x, this.y)
    }

    equals(v:Vector):boolean{
        if(v == null)return false
        return this.x == v.x && this.y == v.y;
    }

    set(vector:Vector):Vector{
        this.x = vector.x;
        this.y = vector.y;
        return this;
    }

    perpDot(vector:Vector):number{
        return Math.atan2( this.x * vector.y - this.y * vector.x, this.x * vector.x + this.y * vector.y )
    }

    draw(ctxt:CanvasRenderingContext2D){
        var width = 10;var half = width / 2;
        ctxt.fillRect(this.x - half, this.y - half, width, width);
    }

    loop(callback:(v:Vector) => void){
        for(var x = 0; x < this.x; x++){
            for(var y = 0; y < this.y; y++){
                callback(new Vector(x, y));
            }
        }
    }

    serialize(){
        return {x:this.x, y:this.y}
    }

    static deserialize(object:any){
        return new Vector(object.x, object.y)
    }
}

export = Vector;