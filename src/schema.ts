import * as notepack from "notepack.io"

import { IReversibleJsonPatch } from "./tracker"

export interface ISchema {
  [name: string]: ISchemaItem
}

export interface ISchemaItem {
  index: number
  parent: string
  props: string[]
  schema: IPropsSchema
}

export interface IPropsSchema {
  [prop: string]: string | IPropSchema
}

export interface IPropSchema {
  type: "map" | "set" | "array"
  items: string
}

export interface ISchemaMeta {
  index: number
  parent: string
  ref: any
}

export class MosxSchema {
  // mosx constructors
  public items: Set<any> = new Set()
  // mosx object types meta
  public meta: Map<string, ISchemaMeta> = new Map()
  // mosx object types index
  public index: string[] = []

  // mosx schema
  public get schema(): ISchema {
    const schema: ISchema = {}

    const propType = (prop: any) => {
      if (typeof prop.type === "string") {
        return prop.type
      } else if (Array.isArray(prop.type)) {
        return {
          type: "array",
          items: prop.type.map.name,
        }
      } else if (typeof prop.type === "function") {
        return prop.type.name
      } else if (typeof prop.type === "object") {
        return {
          type: "map",
          items: prop.type.map.name,
        }
      }
    }

    this.items.forEach(( { name, $mx } ) => {
      const propSchema: IPropsSchema = {}

      $mx.props.forEach((prop: any) => {
        propSchema[prop.key] = propType(prop)
      })

      const meta = this.meta.get(name)
      if (!meta) { return }

      schema[name] = {
        index: meta.index,
        parent: meta.parent,
        props: $mx.props.map((prop: any) => prop.key),
        schema: propSchema,
      }
    })
    return schema
  }

  // add constructor to shema
  public add(contructor: any) {
    this.meta.set(contructor.name, {
      index: this.items.size,
      parent: contructor.$mx && contructor.__proto__.name,
      ref: contructor,
    })
    this.index.push(contructor.name)
    this.items.add(contructor)
  }

  // check is constructor already added
  public has(constructor: any): boolean {
    return this.items.has(constructor)
  }

  public encodePath(path: string, typePath: Array<string | undefined>) {
    const pathArr = path.replace(/^\/+|\/+$/g, "").split("/")
    const pathBuffer: number[] = []
    const data: any[] = []
    pathArr.forEach((key, i) => {
      const typeName = typePath[i]
      if (!typeName) {
        pathBuffer.push(-1)
        data.push(key)
      } else {
        pathBuffer.push(...this.propIndex(typeName, key))
      }
    })
    return [pathBuffer, data]
  }

  /**
   * schema compression
   * |      |  0 |  1 | 2...n+2 |                     n+3... |
   * |------|----|----|---------|----------------------------|
   * | byte | op | n  |    path | [params, value, oldValue]* |
   *
   * op:
   *  0 -> "add"
   *  1 -> "replace"
   *  2 -> "remove"
   *
   * n: length of path
   *
   * path:
   *  first byte >= 0 -> typeIndex, second byte -> propIndex
   *  first byte < 0  -> param
   *
   * "*" - encoded with notepack
   */
  public encodePatch(patch: IReversibleJsonPatch, typePath: Array<string | undefined>, reversible = false, compression = "schema") {
    const op = ["add", "replace", "remove"].indexOf(patch.op)
    const [path, data] = this.encodePath(patch.path, typePath)

    // tslint:disable-next-line: no-bitwise
    const buffer = Buffer.from([op, path.length, ...path])
    if (patch.op !== "remove") {
      data.push(patch.value)
    }
    if (patch.op !== "add" && reversible) {
      data.push(patch.oldValue)
    }
    const paramsBuffer = Buffer.from(notepack.encode(data))

    return Buffer.concat([buffer, paramsBuffer])
  }

  public decodePath(pathBuffer: Buffer, params: any[]) {
    let path = ""
    for (let i = 0; i < pathBuffer.length; i++) {
      const typeIndex = pathBuffer.readInt8(i)
      if (typeIndex < 0) {
        path += "/" + params.pop()
      } else {
        const propIndex = pathBuffer.readInt8(++i)
        path += "/" + this.propName(typeIndex, propIndex)
      }
    }
    return path
  }

  // decode patch
  public decodePatch(buffer: Buffer): IReversibleJsonPatch {
    const opIndex = buffer.readInt8(0)
    const pathLength = buffer.readInt8(1)

    const pathBuffer = buffer.slice(2, pathLength + 2)
    const paramsBuffer = buffer.slice(pathLength + 2)

    const params = notepack.decode<any[]>(paramsBuffer).reverse()

    const patch: any = {
      op: ["add", "replace", "remove"][opIndex],
      path: this.decodePath(pathBuffer, params),
    }

    if (params.length && patch.op !== "remove") {
      patch.value = params.pop()
    }

    if (params.length && patch.op !== "add") {
      patch.oldValue = params.pop()
    }

    if (params.length) {
      throw new Error(`Unhandled params: ${params.toString()}`)
    }

    return patch
  }

  public encodeParam(index: number) {
    // tslint:disable-next-line: no-bitwise
    return (index << 8) | -1
  }

  public propIndex(type: string, prop: string) {
    const meta = this.meta.get(type)
    if (!meta) {
      throw new Error(`Cannot get prop ${prop} index - object type ${type} not found!`)
    }

    const props: any[] = meta.ref.$mx.props
    const propIndex = props.findIndex(({ key }) => key === prop)

    return [meta.index, propIndex]
  }

  public propName(typeIndex: number, propIndex: number) {
    const typeName = this.index[typeIndex]
    const meta = this.meta.get(typeName)

    if (!meta) {
      throw new Error(`Cannot get prop ${propIndex} name - object type ${typeName} not found!`)
    }

    const prop: any = meta.ref.$mx.props[propIndex]

    if (!prop) {
      throw new Error(`Cannot get prop ${propIndex} name - property not found!`)
    }

    return prop.key
  }

  public encodeProp(type: string, prop: string): number {
    const [typeIndex, propIndex] = this.propIndex(type, prop)
    // tslint:disable-next-line: no-bitwise
    return (propIndex << 8) | typeIndex
  }

  public decodeProp(value: number): string {
    // tslint:disable-next-line: no-bitwise
    const [typeIndex, propIndex] = [value & 0xff, value >> 8]

    return this.propName(typeIndex, propIndex)
  }
}
