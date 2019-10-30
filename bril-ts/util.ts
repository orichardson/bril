const util = require('util')

/**
 * Read all the data from stdin as a string.
 */
export function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let chunks: string[] = [];
    process.stdin.on("data", function (chunk: string) {
      chunks.push(chunk);
    }).on("end", function () {
      resolve(chunks.join(""))
    }).setEncoding("utf8");
  });
}

export function unreachable(x: never) {
  throw "impossible case reached";
}

export function fresh(prefix: string, sofar: Set<string>) {
  for( let i = 1; ; i++) {
    let name = prefix + i;
    if (!sofar.has(name)){
      return name;
    }
  }
}

/**
 * ORiginally aken from below, and modified to my needs.
 * https://stackoverflow.com/questions/29759480/how-to-customize-object-equality-for-javascript-set
 * Map that stringifies the key objects in order to leverage
 * the javascript native Map and preserve key uniqueness.
 */
export abstract class StringifyingMap<K, V> {
    private map : Map<string, V> = new Map<string, V>();
    private keyMap : Map<string, K> = new Map<string, K>();
    
    constructor()
    constructor( array : Array<[K,V]> )
    constructor(exiting : StringifyingMap<K,V>)
    constructor( arrayORexisting?: StringifyingMap<K,V> | Array<[K,V]>) {
      if( arrayORexisting !== undefined) {
        if(arrayORexisting instanceof StringifyingMap) {
          this.map = arrayORexisting.map;
          this.keyMap = arrayORexisting.keyMap;
        } else {
          for ( let [k,v] of arrayORexisting ) {
            this.set(k,v);
          }
        }
      }
    }
    
    [util.inspect.custom](depth : any, options : any) {
      let text = util.inspect( new Map<K,V>([...this.keyMap.keys()].map(s => [this.keyMap.get(s)!,this.map.get(s)!]) ) );
      return `Str${text}`
    }

    has(key: K): boolean {
        let keyString = this.stringifyKey(key);
        return this.map.has(keyString);
    }
    
    get(key : K) : V | undefined {
      return this.map.get(this.stringifyKey(key));
    }
    getOr<VV extends V>(key: K, defau: VV): VV | V {
        let keyString = this.stringifyKey(key);
        return this.map.has(keyString) ? this.map.get(keyString)! : defau;
    }
    set(key: K, value: V): StringifyingMap<K, V> {
        let keyString = this.stringifyKey(key);
        this.map.set(keyString, value);
        this.keyMap.set(keyString, key);
        return this;
    }
    pop_first() : [K, V] | undefined {
      if(this.size() == 0) {
        return undefined;
      } else {
        let k : K = this.keyMap.values().next().value;
        let v : V = this.map.values().next().value;
        
        this.delete(k);
        
        return [k, v];
      }
    }

    /**
     * Puts new key/value if key is absent.
     * @param key key
     * @param defaultValue default value factory
     */
    putIfAbsent(key: K, defaultValue: () => V): boolean {
        if (!this.has(key)) {
            let value = defaultValue();
            this.set(key, value);
            return true;
        }
        return false;
    }

    keys(): IterableIterator<K> {
        return this.keyMap.values();
    }

    keyList(): K[] {
        return [...this.keys()];
    }

    delete(key: K): boolean {
        let keyString = this.stringifyKey(key);
        let flag = this.map.delete(keyString);
        this.keyMap.delete(keyString);
        return flag;
    }

    clear(): void {
        this.map.clear();
        this.keyMap.clear();
    }

    size(): number {
        return this.map.size;
    }

    /**
     * Turns the `key` object to a primitive `string` for the underlying `Map`
     * @param key key to be stringified
     */
    protected abstract stringifyKey(key: K): string;
}

export function map2str( x : Map<string,any> ) : string {
  // TODO: does sort actually work for envs? probably not. 
  return JSON.stringify( Array.from( x ).sort(), (key, value) => {
  	if (typeof value === 'bigint') {
  		return value.toString() + 'n';
  	} else {
  		return value;
  	}
  });
}

/**
 * taken from https://stackoverflow.com/questions/29085197/how-do-you-json-stringify-an-es6-map
 */
// export function mapToObj<V>(m : Map<string,V>) {
//   return Array.from(m).reduce((obj, [key, value]) => {
//     obj[key] = value;
//     return obj;
//   }, { [key: string]: V });
// };
