import * as notepack from "notepack.io"

import { Serializer, ITreeNode, IReversibleJsonPatch, mx } from "../../index"

export interface ILightSchema {
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

export class LightSerializer extends Serializer {

  public onCreate() {
    const context = mx.$context

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

    const schemaMap: ILightSchema = {}

    context.types.forEach(( { name, $mx } ) => {
      const propSchema: IPropsSchema = {}

      $mx.props.forEach((prop: any) => {
        propSchema[prop.key] = propType(prop)
      })

      const meta = context.meta.get(name)
      if (!meta) { return }

      schemaMap[name] = {
        index: meta.index,
        parent: meta.parent,
        props: $mx.props.map((prop: any) => prop.key),
        schema: propSchema,
      }
    })

    // add schema map key to state
    this.root.constructor.$mx.props.push({ key: "_", type: "", hidden: false, getter: false })
    Object.defineProperty(this.root, "_", { enumerable: false, writable: false, value: schemaMap })
  }

  public entryTypePath (entry?: ITreeNode): string[] {
    const pathArr = []
    while (entry) {
      pathArr.push(entry.meta && entry.meta.type || "")
      entry = entry.parent
    }
    return pathArr.reverse()
  }

 /**
  * light compression
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

  public encode(patch: IReversibleJsonPatch, entry: ITreeNode): Buffer {
    const pathTypes = this.entryTypePath(entry)

    const op = ["add", "replace", "remove"].indexOf(patch.op)

    const pathArr = patch.path.replace(/^\/+|\/+$/g, "").split("/")
    const pathBuffer: number[] = []
    const pathParams: any[] = []
    pathArr.forEach((key, i) => {
      const typeName = pathTypes[i]
      if (!typeName) {
        pathBuffer.push(-1)
        pathParams.push(key)
      } else {
        pathBuffer.push(...this.typePropIndex(typeName, key))
      }
    })

    // tslint:disable-next-line: no-bitwise
    const buffer = Buffer.from([op, pathBuffer.length, ...pathBuffer])
    if (patch.op !== "remove") {
      pathParams.push(patch.value)
    }
    if (patch.op !== "add" && "oldValue" in patch) {
      pathParams.push(patch.oldValue)
    }
    const paramsBuffer = Buffer.from(notepack.encode(pathParams))

    return Buffer.concat([buffer, paramsBuffer])
  }

  public typePropIndex (type: string, prop: string) {

    const meta = mx.$context.meta.get(type)
    if (!meta) {
      throw new Error(`Cannot get prop ${prop} index - object type ${type} not found!`)
    }

    const props: any[] = meta.ref.$mx.props
    const index = props.findIndex(({ key }) => key === prop)

    return [meta.index, index]
  }

  public decode (buffer: Buffer): IReversibleJsonPatch {
    const opIndex = buffer.readInt8(0)
    const pathLength = buffer.readInt8(1)

    const pathBuffer = buffer.slice(2, pathLength + 2)
    const paramsBuffer = buffer.slice(pathLength + 2)

    const params = notepack.decode<any[]>(paramsBuffer).reverse()

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

    const patch: any = {
      op: ["add", "replace", "remove"][opIndex],
      path,
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

  public propName(typeIndex: number, propIndex: number) {
    const context = mx.$context
    const typeName = context.index[typeIndex]
    const meta = context.meta.get(typeName)

    if (!meta) {
      throw new Error(`Cannot get prop ${propIndex} name - object type ${typeName} not found!`)
    }

    const prop: any = meta.ref.$mx.props[propIndex]

    if (!prop) {
      throw new Error(`Cannot get prop ${propIndex} name - property not found!`)
    }

    return prop.key
  }
}
