import { IReversibleJsonPatch } from "./tracker"
import * as light from "./serializer/light"
import * as mpack from "./serializer/mpack"

export interface ISchemaMeta {
  index: number
  parent: string
  ref: any
}

export interface ISerializer {
  encode: (context: MosxContext, patch: IReversibleJsonPatch, pathItems: string[]) => Buffer
  decode: (context: MosxContext, buffer: Buffer) => IReversibleJsonPatch
  decodeMap: (context: MosxContext) => any
}

export class MosxContext {
  // mosx constructors
  public types: Set<any> = new Set()
  // mosx object types meta
  public meta: Map<string, ISchemaMeta> = new Map()
  // mosx object types index
  public index: string[] = []

  // mosx schema
  public decodeMap(serializer = "string"): any {
    switch (serializer) {
      case "string": return {}
      case "light": return light.decodeMap(this)
      case "mpack": return mpack.decodeMap(this)
      default:
        throw new Error(`Unknown serializer: ${serializer}`)
    }
  }

  // add constructor to shema
  public add(contructor: any) {
    this.meta.set(contructor.name, {
      index: this.types.size,
      parent: contructor.$mx && contructor.__proto__.name,
      ref: contructor,
    })
    this.index.push(contructor.name)
    this.types.add(contructor)
  }

  // check is constructor already added
  public has(constructor: any): boolean {
    return this.types.has(constructor)
  }

  public encodePatch(patch: IReversibleJsonPatch, pathItems: string[], serializer = "string"): Buffer {
    switch (serializer) {
      case "string": return Buffer.from(JSON.stringify(patch))
      case "light": return light.encode(this, patch, pathItems)
      case "mpack": return mpack.encode(this, patch, pathItems)
      // custom serializer implementations
      default:
        throw new Error(`Unknown serializer: ${serializer}`)
    }
  }

  // decode patch
  public decodePatch(buffer: Buffer, serializer = "string"): IReversibleJsonPatch {
    switch (serializer) {
      case "string": return JSON.parse(buffer.toString())
      case "light": return light.decode(this, buffer)
      case "mpack": return mpack.decode(this, buffer)
      default:
        throw new Error(`Unknown serializer: ${serializer}`)
    }
  }
}
