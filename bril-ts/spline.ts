const util = require('util')

import {StringifyingMap,map2str} from './util';

function fresh(vals : Set<string>, name : string) : string {
	if(!vals.has(name))
		return name;
		
  var i;
  for (i = 0; ; i++) {
    var s = name + "_" + i
    if (!vals.has(s))
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

  private static rand_count : number = 0;
	static fresh_rand_name() : string {
    return "r_" + Poly.rand_count++;
  }
	private static const_count : number = -1;
  static fresh_const_name() : string {
    return (Poly.const_count++ >= 0)? "C_" + Poly.const_count : "C";
  }
  static readonly zero : Poly = new Poly([])
  static fresh_rand() : Poly { 
    return new Poly([[new Map([[Poly.fresh_rand_name(), BigInt(1)]]), 1]])
  }
  static var(s : string) : Poly { 
    return new Poly([[new Map([[s, BigInt(1)]]), 1]])
  }
  static const(c : number) : Poly { 
    return new Poly([[new Map(), c]])
  }

	static parse(desc : string) : Poly {
		let pow_exp = /\(?([a-zA-Z]\w*)(?:\^([0-9]+))?\)?/g
		var exp_mono = new RegExp(String.raw`(\+|-)?\s*\(?([0-9.]+)?\)?((?:\s*${pow_exp.source})*)\s*`, 'g')
		
		let p = new Poly();
		
		
		let matchdata : RegExpExecArray | null;
		while( matchdata = exp_mono.exec(desc)) {
			if(matchdata == null || matchdata[0].trim().length == 0) break;
			
			let sgn : number = matchdata[1] == '-' ? -1 : 1
			let coef : number = matchdata[2] == undefined ? 1 : parseFloat(matchdata[2])
			
			
			let rest = matchdata[3];
			let monos : BasisElt = new Map();
			while(matchdata  = pow_exp.exec(rest)) {
				if(matchdata == null || matchdata[0].trim().length == 0) 
					break;
				
				let power : string | number = matchdata[2];
				if(power == undefined) 
					power = 1;
				
				monos.set(matchdata[1], BigInt(power));						
			}
			p.set(monos, coef * sgn);			

		}
		
		return p;
	}
	
	reduce() : Poly {
		for(let k of this.keys() ) {
			let coef = this.get(k)!;
			if(coef == 0) {
				this.delete(k);
			}
			else {
				//let newb = new Map(k);
				for ( let [s,pow] of k) {
					if(pow == BigInt(0) ) {
						this.delete(k);
						k.delete(s);
						this.set(k, this.getOr(k,0) + coef)
					}
				}
			}
		}
		
		return this;
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
	
	variables() : Set<string> {
		let vars = new Set<string>();
		for (let belt of this.keys()) {
			for (let v of belt.keys()) {
				vars.add(v);
			}
		} 
		return vars;
	}
	
	/* Application of a polynomial as a function. Note, that this returns a
	polynomial, but it's not this! */
	evaluate(substitute : {[name: string] : Poly}) : Poly {
		let rslt = new Poly();
		
		for (let belt of this.keys()) {
			let temp = Poly.const(this.get(belt)!); // start with just coefficient
			
			for (let [s, pow] of belt) {
				if(s in substitute) {
					let replacement = substitute[s];
					for(let i = 0; i < pow; i++){
						temp.times(replacement);
					}
				} else {
					temp.times(Poly.var(s));
				}
			}
			
			rslt.add(temp);
		}
		return rslt;
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
		return this.reduce();
	}
	
	minus(other : Poly) : Poly {
		return this.add(other.copy().scale(-1))
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
   	return this.reduce();
  }
	
	integrate( dim: string ) : Poly {
		let rslt = new Poly();
		
		for(let belt of this.keys()) {
			let newb = new Map(belt);
			let coef = this.get(belt)!;
			let pow = belt.get(dim)!;

			if( belt.has(dim)) {
				coef /= Number(pow) + 1;
				newb.set(dim, pow + BigInt(1));
			} else {
				newb.set(dim, BigInt(1));
			}	
			rslt.set(newb, coef);
		}
		
		// never forget the +C!
		rslt.set(new Map([[Poly.fresh_const_name(), BigInt(1)]]), 1);
		
		this.map = rslt.map;
		this.keyMap = rslt.keyMap;
		return this;
	}	
	
	differentiate( dim : string ) : Poly {
		let rslt = new Poly();
		
		for(let belt of this.keys()) {
			if( belt.has(dim)) {
				let coef = this.get(belt)!;
				let pow = belt.get(dim)!;
				
				coef *= Number(pow);
				let newb = new Map(belt);
				if(pow > 1) {
					newb.set(dim, pow - BigInt(1) )
				}else {
					newb.delete(dim);
				}
				
				rslt.set(newb, coef);
			}
		}
		this.map = rslt.map;
		this.keyMap = rslt.keyMap;
		return this;
	}
	
	toNum() : number {
		if(this.variables().size > 0)
			throw new Error("Tried to turn abstract polynomial into a number.");
			
		return this.getOr( new Map(), 0);
	}
	
	// convolve( other : Poly) : Poly {
	// 
	// }
	
}


// class Dist {
// 	// constraint and densities are over same set of variables.
// 	density : Poly;
// 	constraint: Poly;
// }


export type Interval = [number, number]
export class Spline extends Map<Interval, Poly> {
	static rand() : Spline {
			return new Spline([[[0,1], Poly.fresh_rand()]])
	}	
	
	copy() : Spline {
	  let toret = new Spline()
	  this.forEach( (poly, interval) => {
	    toret.set(interval, poly.copy())
	  })
	  return toret
	}

	integral() : number {
		let total = 0;
		
		for( let [iv, poly] of this ){
			// let integrated = poly.copy().integrate();
			// let diff
		}
		
		return total;
	}
}

export function spline2str(s : Spline) {
  let toret = ""
  s.forEach( (poly, interval)  => {
    toret += `[${interval[0]}, ${interval[1]}]: ${poly.tostr()} \n`;
  })
  return toret
}

//*******************************************//
// Testing.

// async function test() {
//   Poly.fresh().times
// }
// 
// process.on('unhandledRejection', e => { throw e });
// 
// if (require.main === module)
//   test();
