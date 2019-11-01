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
    return ""+ this.tostr();
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
			
			rslt.plus(temp);
		}
		return rslt;
	}
	
	
	plus(other : Poly) : Poly {
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
		return this.plus(other.copy().scale(-1))
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
}

// export type Arith = number | Poly | Spline
// export namespace Arith {
// 	export function add(a : Arith, b : Arith) : Arith {
// 
// 	}
// }

// class Dist {
// 	// constraint and densities are over same set of variables.
// 	density : Poly;
// 	constraint: Poly;
// }


export type Interval = [number, number]
type AbsInterval = [Poly, Poly]

// class GSpline<J, I> extends Map<[I,I], Poly> {}


/*
Spline is gives polynomials of one variable. 
*/
export class Spline extends StringifyingMap<Interval, Poly> {
	protected stringifyKey(i : Interval) {
		return i[0].toString() + "," + i[1].toString();
	}
	static rand() : Spline {
		let r =  Poly.fresh_rand_name();
		return new Spline([[[0,1],Poly.var(r)]]).of(r)		
	}	
	static unif(name : string) : Spline {
			return new Spline([/*[[-Infinity, 0], Poly.zero], */
					[[0,1], Poly.const(1)]/*, [1, Infinity], Poly.zero]*/]).of(name);	
	}	
					
	public variable : string = "";
	
	of ( variable : string) {
		this.variable = variable;
		return this;
	}
	

	
	copy() : Spline {
	  let toret = new Spline().of(this.variable)
	  this.forEach( (poly, interval) => {
	    toret.set(interval, poly.copy())
	  })
	  return toret
	}
	
	/*
	Take a spline, and sort the intervals from smallest to biggest, and 
	split them up so there are no overlaps. Also, add new ones so there are no gaps.
	Goes from -Infinity to Infinity.
	
	This is the "Riemann" standardization, along the input axis. Makes it easy to look up densities and do multiplication.
	*/
	standardize() : Spline {
		let oldData = new Map(this);
		let points : number[] = [-Infinity, Infinity];
		
		for(let k of this.keys() ) { points.push(...k); }
		
		points.sort();
		this.clear();
		
		for(let i = 1; i < points.length; i++){
			let ivl : Interval = [points[i-i], points[i]];
			console.log(ivl);
			if( oldData.has(ivl) ) {
				this.set(ivl, oldData.get(ivl)!);
				oldData.delete(ivl);
			}
			else
				this.set(ivl, Poly.zero.copy());
		}
		
		console.log(points);
		console.log(this);
		if( oldData.size != 0) {
			for(let [k,v] of oldData) {
				let idx0 = points.indexOf(k[0]);
				let idx1 = points.indexOf(k[1]);
				console.log(k,v);
				
				for(let j = idx0; j < idx1; j++) {
					this.get([points[j],points[j+1]])!.plus(v);
				}
			}
		}
		return this;
	}
	
	add( other: Spline, split=true) : Spline {		
		if(split) {
			let oldData = new Map(this);
			let points : number[] = [];

			for(let k of this.keys() ) { points.push(...k); }
			for(let k of other.keys()) { points.push(...k); }

			points.sort();
			this.clear();
		
			let ivl: Interval
			for( let m of [oldData, other] ) {
				for(let [k,v] of m) {
					let idx0 = points.indexOf(k[0]);
					let idx1 = points.indexOf(k[1]);
					
					for(let j = idx0; j < idx1; j++) {
						ivl = [points[j],points[j+1]];
						if(this.has(ivl))
							this.get(ivl)!.plus(v);
						else this.set(ivl, v);
					}
				}
			}
		} else {
			for( let [k,v] of other ) {
				if(this.has(k)) {
					this.get(k)!.plus(v);
				} else {
					this.set(k, v);
				}
			}
		}
		return this;
	}
	
	scale( amt : number ) {
		this.forEach( (p,ivl) => p.scale(amt));
	}
	
	
	times( other: Spline) : Spline {		
		let oldData = new Map(this);
		let points : number[] = [];

		for(let k of this.keys() ) { points.push(...k); }
		for(let k of other.keys()) { points.push(...k); }

		points.sort();
		this.clear();
		
		for(let [k,v] of oldData) {
			let j = points.indexOf(k[0]);
			let end = points.indexOf(k[1]);

			for(; j < end; j++) {
				this.set([points[j],points[j+1]], v);
			}
		}
	
		let ivl : Interval
		for(let [k,v] of oldData) {
			let j = points.indexOf(k[0]);
			let end = points.indexOf(k[1]);

			for(; j < end; j++) {
				ivl = [points[j],points[j+1]]
				if(this.has(ivl))
					this.get(ivl)!.times(v);
			}
		}
		return this;
	}
	
	// convolve(other : Poly, oldvar1: string, oldvar2: string, newvar:string ): Poly {
	// 	let convolved = this.evaluate({ [oldvar1] : Poly.var(newvar).minus(Poly.var(oldvar2))})
	// 		.times(other).integrate(oldvar2);
	// 	return convolved;
	// }
	

	// integrate() : Spline {
	// 	let total = 0;
	// 
	// 	for( let [iv, poly] of this ){
	// 		// let integrated = poly.copy().integrate();
	// 		// let diff
	// 	}
	// 
	// 	return total;
	// }
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
