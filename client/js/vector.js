class Vector{
    
    constructor(x = 0, y = 0){
        this.x = x;
        this.y = y;
    }

    add(vector){
        this.x += vector.x;
        this.y += vector.y;
        return this;
    }

    sub(vector){
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

    scale(scalar){
        this.x *= scalar;
        this.y *= scalar
        return this;
    }

    rotate(r, origin = new Vector()){
        var offset = this.c().sub(origin)
        var x = offset.x * Math.cos(r) - offset.y * Math.sin(r)
        var y = offset.x * Math.sin(r) + offset.y * Math.cos(r)
        offset.x = x; offset.y = y;
        var back = offset.add(origin)
        this.x = back.x; this.y = back.y;
        return this;
    }

    lerp(vector, weigth){
        return this.scale(1 - weigth).add(vector.c().scale(weigth))
    }

    c(){
        return new Vector(this.x, this.y)
    }

    equals(v){
        if(v == null)return false
        return this.x == v.x && this.y == v.y;
    }

    set(vector){
        this.x = vector.x;
        this.y = vector.y;
        return this;
    }

    perpDot(vector){
        return Math.atan2( this.x * vector.y - this.y * vector.x, this.x * vector.x + this.y * vector.y )
    }

    draw(ctxt){
        var width = 10;var half = width / 2;
        ctxt.fillRect(this.x - half, this.y - half, width, width);
    }

    loop(callback){
        for(var x = 0; x < this.x; x++){
            for(var y = 0; y < this.y; y++){
                callback(new Vector(x, y));
            }
        }
    }

    serialize(){
        return {x:this.x, y:this.y}
    }

    static deserialize(object){
        return new Vector(object.x, object.y)
    }
}

module.exports = Vector;