const util = require('util')

import {StringifyingMap,map2str} from './util';

function fresh(vals : IterableIterator<string>, name : string) : string {
  var i;
  for (i = 0; ; i++) {
    var s = name + "_" + i
    if (!(s in vals))
      return s;
  }
}

export function getVar<K, V>(a : Map<K, V> | StringifyingMap<K,V>, v : K) : V {
  let val = a.get(v);
  if (typeof val === 'undefined') {
    throw `undefined variable ${v}`;
  }
  return val
}

export type BasisElt = Map<string, BigInt>
export class Poly extends StringifyingMap<BasisElt, number> {
  protected stringifyKey(key : BasisElt): string { 
    return map2str(key); 
  }

  static rand_count : number = -1;
  static fresh_rand() : string {
    //console.log("fresh_rand", Poly.rand_count)
    Poly.rand_count++;
    return "_r_" + Poly.rand_count;
  }
  static zero : Poly = new Poly([])
  static fresh() : Poly { 
    return new Poly([[new Map([[Poly.fresh_rand(), BigInt(1)]]), 1]])
  }
  static var(s : string) : Poly { 
    return new Poly([[new Map([[s, BigInt(1)]]), 1]])
  }
  static const(c : number) : Poly { 
    return new Poly([[new Map(), c]])
  }
  
  tostr() : string {
  // [util.inspect.custom](depth, options) {
    let str = this.keyList().map( b => {
      let coef = this.get(b);
      let bstr = '';
      for (let [k,v] of b) {
        bstr += " "+ k
        if (v != BigInt(1)) {
          bstr += `^${v}`
        }
      }      
      return coef == 1 ? bstr : `(${coef})` + bstr;
    }).join(' + ')
    
    if(str.length == 0) return "0";
    return str;
  }
  
  [util.inspect.custom](depth : any, options : any) {
    return "Poly: "+ this.tostr();
  }
  
  copy() : Poly {
    let res =  new Poly();
    for(let k of this.keys()) {
      let v = getVar(this, k)
      let temp = new Map();
      k.forEach((v2, k2) => {
        temp.set(k2, v2)
      })
      res.set(temp, v)
    }
    return res
  }
  
  neg() : Poly {
    for ( let k of this.keys()) {
      this.set(k, -this.get(k)!)
    }
    return this
  }

  add(other : Poly) : Poly {
    for(let belt of other.keys()) {
      let coef = getVar(other, belt)
      if(this.has(belt)) {
        let mycoef = getVar(this, belt);
        this.set(belt, mycoef+coef);
      }
      else {
        this.set(belt, coef);
      }
    }
    return this
  }
  
  // times(other : Poly) : Poly {
  // 
  // }
}



export type Interval = [number, number]
export type Spline = Map<Interval, Poly>;


export function spline2str(s : Spline) {
  let toret = ""
  s.forEach( (poly, interval)  => {
    toret += `[${interval[0]}, ${interval[1]}]: ${poly.tostr()} \n`;
  })
  return toret
}
