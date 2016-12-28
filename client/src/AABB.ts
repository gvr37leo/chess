import Vector = require('./vector')
import Utils = require('./utils')
class AABB{
    pos:Vector
    size:Vector

    constructor(pos:Vector, size:Vector){
        this.pos = pos;
        this.size = size;
    }

    static fromVectors(a:Vector[]):AABB{
        var small = a[0];
        var big = a[a.length - 1];
        for(var v of a){
            if(v.x < small.x)small.x = v.x;
            else if(v.x > big.x)big.x = v.x;
            if(v.y < small.y)small.y = v.y;
            else if(v.y > big.y)big.y = v.y;
        }
        return new AABB(small, big.sub(small));
    }

    contains(aabb:AABB){
        return Utils.rangeContain(this.pos.x, this.size.x + this.pos.x, aabb.pos.x, aabb.size.x + aabb.pos.x) 
        && Utils.rangeContain(this.pos.y, this.size.y + this.pos.y, aabb.pos.y, aabb.size.y + aabb.pos.y)
    }

    collide(v:Vector):boolean{
        return Utils.inRange(this.pos.x, this.size.x + this.pos.x, v.x) && Utils.inRange(this.pos.y, this.size.y + this.pos.y, v.y)
    }
}

export = AABB