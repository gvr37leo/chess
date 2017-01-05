import Vector = require('./vector')

namespace utils{
    export function map(val1:number, start1:number, stop1:number, start2:number, stop2:number){
        return start2 + (stop2 - start2) * ((val1 - start1) / (stop1 - start1))
    }

    export function inRange(min:number ,max:number ,value:number){
        if(min > max){
            var temp = min;
            min = max;
            max = temp;
        }
        return value <= max && value >= min;
    }

    export function min(a:number, b:number):number{
        if(a < b)return a;
        return b;
    }

    export function max(a:number, b:number):number{
        if(a > b)return a;
        return b;
    }

    export function clamp(val:number, min:number, max:number):number{
        return this.max(this.min(val, max), min)
    }

    export function rangeContain(a1,a2,b1,b2){//as in does a enclose b----- so returns true if b is smaller in all ways
        return max(a1, a2) >= max(b1, b2) && min(a1,a2) <= max(b1,b2);
    }

    export function create2dArray<T>(v:Vector, fill:T):T[][]{
        var rows:T[][] = new Array(v.x)
        for(var i = 0; i < v.x; i++){
            rows[i] = new Array(v.y)
            for(var j = 0; j < v.y; j++){
                rows[i][j] = fill
            }
        }
        return rows;
    }

    export function getMousePos(canvas:HTMLCanvasElement, evt:MouseEvent):Vector {
        var rect = canvas.getBoundingClientRect();
        return new Vector(evt.clientX - rect.left, evt.clientY - rect.top)
    }
}

export = utils;