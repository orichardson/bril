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

export type BasisElt = Map<string, bigint>
export class Poly extends StringifyingMap<BasisElt, number> {
  protected stringifyKey(key : BasisElt): string { 
    return map2str(key); 
  }

  static rand_count : number = -1;
  static fresh_rand() : string {
    //console.log("fresh_rand", Poly.rand_count)
    return "r_" + Poly.rand_count++;
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
	static parse(desc : string) : Poly {
		let pow_exp = /\(?([a-z]\w*)(?:\^([0-9]+))?\)?/g
		var exp_mono = new RegExp(String.raw`(\+|-)?\s*\(?([0-9.]+)?\)?((?:\s*${pow_exp.source})*)\s*`, 'g')
		
		let p = new Poly();
		
		
		let matchdata : RegExpExecArray | null;
		while( matchdata = exp_mono.exec(desc)) {
			if(matchdata == null || matchdata[0].trim().length == 0) break;
			
			let sgn : number = matchdata[1] == '-' ? -1 : 1
			let coef : number = matchdata[2] == undefined ? 1 : parseFloat(matchdata[2])
			
			// console.log(sgn, coef);
			
			let rest = matchdata[3];
			console.log('rest', rest);
			let monos : BasisElt = new Map();
			while(matchdata  = pow_exp.exec(rest)) {
				if(matchdata == null || matchdata[0].trim().length == 0) 
					break;
					
				console.log(matchdata);
				
				let power : string | number = matchdata[2];
				if(power == undefined) 
					power = 1;
				
				monos.set(matchdata[1], BigInt(power));						
			}
			p.set(monos, coef * sgn);			
			console.log(p);
			console.log(monos);
		}
		
		// console.log(p)
		return p;
		
		// let terms = desc.split(/\+|-/);
		// terms.forEach( t => {
		// 
		// 	p.set(belt, coef);
		// })
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
			if(bstr == '') return ''+coef
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

  scale(v : number) : Poly {
    for(let belt of this.keys()) {
      let mycoef = getVar(this, belt);
      this.set(belt, v*mycoef);
    }
    return this
  }

  equal(other: Poly) : boolean {
    for(let belt of other.keys()) {
      if(!this.has(belt))
        return false
      if(getVar(this, belt) != getVar(other, belt))
        return false
    }
    return true
  }
  
  times(other : Poly) : Poly {
		let rslt = new Poly();
		for(let belt of other.keys()) {
			for(let b of this.keys()) {
				let mono = new Map(b);
				for (let [ident,power] of belt) {
					mono.set(ident, (mono.has(ident)?mono.get(ident)!:BigInt(0)) + power)
				}
				
				let prodcoef = other.get(belt)! * this.get(b)!;
				rslt.set(mono, rslt.getOr(mono, 0) + prodcoef)
			}
		}
		this.map = rslt.map;
		this.keyMap = rslt.keyMap;
   	return this;
  }
	
	
}



export type Interval = [number, number]
export class Spline extends Map<Interval, Poly> {
	integrate() : number {
		return 0;
	}
}

export function spline2str(s : Spline) {
  let toret = ""
  s.forEach( (poly, interval)  => {
    toret += `[${interval[0]}, ${interval[1]}]: ${poly.tostr()} \n`;
  })
  return toret
}

<<<<<<< HEAD

//*******************************************//

async function test() {
  Poly.fresh().times
}

process.on('unhandledRejection', e => { throw e });

if (require.main === module)
  test();
=======
export function copySpline(s : Spline) {
  let toret = new Map()
  s.forEach( (poly, interval) => {
    toret.set(interval, poly.copy())
  })
  return toret
}
>>>>>>> 7466d39ee8af988a6f7129accc2c5e025619659a
