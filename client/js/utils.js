var Vector = require('./vector')

class Utils{
    static map(val1, start1, stop1, start2, stop2){
        return start2 + (stop2 - start2) * ((val1 - start1) / (stop1 - start1))
    }

    static inRange(min ,max ,value){
        if(min > max){
            var temp = min;
            min = max;
            max = temp;
        }
        return value <= max && value >= min;
    }

    static min(a, b){
        if(a < b)return a;
        return b;
    }

    static max(a, b){
        if(a > b)return a;
        return b;
    }

    static clamp(val, min, max){
        return this.max(this.min(val, max), min)
    }

    static rangeContain(a1,a2,b1,b2){//as in does a enclose b----- so returns true if b is smaller in all ways
        return max(a1, a2) >= max(b1, b2) && min(a1,a2) <= max(b1,b2);
    }

    static create2dArray(v, fill){
        var rows = new Array(v.x)
        for(var i = 0; i < v.x; i++){
            rows[i] = new Array(v.y)
            for(var j = 0; j < v.y; j++){
                rows[i][j] = fill
            }
        }
        return rows;
    }

    
}

module.exports = Utils;