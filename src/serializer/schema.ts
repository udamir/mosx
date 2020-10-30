import { ObservableMap, ObservableSet } from "mobx"
import * as notepack from "notepack.io"

import { ITreeNode, IReversibleJsonPatch, Mosx, mx } from "../internal"
import { IChange, IJsonPatch, IMosxTracker } from "../internal"
import { Serializer } from "."
import { JsonPatchOp } from "../tracker.h"

const NODE_ARRAY_TYPE = -1
const NODE_MAP_TYPE = -2

//   SchemaType = [ name,   props    ]
type SchemaType = [ string, ...string[] ]

interface ISchemaType {
  name: string
  props: string[]
}

const schemaType = (type: SchemaType = [] as any): ISchemaType => ({
  name: type[0],
  props: type.slice(1),
})

//   SchemaNode = [ id,     type,   parent, index,  items? ]
type SchemaNode = [ number, number, number, number, ...string[] ]

interface ISchemaNode {
  id: number
  type: number
  parent: number
  index: number
  items: string[]
}

const schemaNode = (node: SchemaNode = [] as any): ISchemaNode => ({
  id: node[0],
  type: node[1],
  parent: node[2],
  index: node[3],
  items: node.slice(4) as string[],
})

//   SchemaPatch = [ op,     id,     prop,   value/oldValue ]
type SchemaPatch = [ number, number, number, any?, any? ]

interface ISchemaPatch {
  op: number
  id: number
  prop: number
  values: any[]
}

const schemaPatch = (patch: SchemaPatch = [] as any): ISchemaPatch => ({
  op: patch[0],
  id: patch[1],
  prop: patch[2],
  values: patch.slice(3),
})

@mx.Object
class SchemaMap {
  // all mosx types
  @mx types: Array<SchemaType> = []
  // state tree nodes
  @mx nodes: Array<SchemaNode> = []

  public typeIndex(typeName: string): number {
    return this.types.findIndex((t) => t[0] === typeName)
  }

  public typeProps(index: number): string[] {
    const type = this.types[index]
    return type ? type.slice(1) : []
  }

  public nodeName(sn: SchemaNode | ISchemaNode): string | number {
    const node = Array.isArray(sn) ? schemaNode(sn) : sn
    const parent = this.node(node.parent)
    if (!parent) {
      return ""
    } else if (parent.type === NODE_ARRAY_TYPE) {
      return node.index
    } else if (parent.type === NODE_MAP_TYPE) {
      return parent.items[node.index]
    } else {
      const { props } = schemaType(this.types[parent.type])
      return props[node.index]
    }
  }

  public nodeIndex(parentId: number, name: string): number {
    const parent = this.node(parentId)
    if (!parent) {
      return -1
    } else if (parent.type === NODE_MAP_TYPE) {
      return parent.items.indexOf(name)
    } else if (parent.type === NODE_ARRAY_TYPE) {
      return +name
    } else {
      const props = this.typeProps(parent.type)
      return props.indexOf(name)
    }
  }

  public node(id: number): ISchemaNode | undefined {
    const node = this.nodes.find((n) => n[0] === id)
    return node && schemaNode(node)
  }

  public nodePath(sn: SchemaNode | ISchemaNode) {
    let node = Array.isArray(sn) ? schemaNode(sn) : sn
    const pathArr = []
    while (!!node) {
      pathArr.push(this.nodeName(node))
      node = this.node(node.parent)!
    }
    return pathArr.reverse().join("/")
  }

  public childNode(sn: SchemaNode | ISchemaNode | undefined, name: string | number) {
    if (!sn) {
      return this.findNode({ parent: -1 })
    }
    const node = Array.isArray(sn) ? schemaNode(sn) : sn
    if (node.type === NODE_ARRAY_TYPE) {
      return this.findNode({ parent: node.id, index: +name })
    } else if (node.type === NODE_MAP_TYPE) {
      return this.findNode({ parent: node.id, index: node.items.indexOf(name as string) })
    } else {
      const { props } = schemaType(this.types[node.type])
      return this.findNode({ parent: node.id, index: props.indexOf(name as string) })
    }
  }

  public findNode(query: { [key: string]: any }): ISchemaNode | undefined {
    const sn = this.nodes.find((n) => {
      const node = schemaNode(n) as any
      return !Object.keys(query).find((key) => node[key] !== query[key])
    })
    return sn && schemaNode(sn)
  }
}

class SchemaPack {
  constructor (public schema: SchemaMap) { }

  public encodeSchemaPatch(patch: IJsonPatch): SchemaPatch {
    // split path to elements
    // "/nodes/1/2"
    const [, type, index, prop] = patch.path.split("/")

    // set operation for patch type
    // if "/nodes/" updated op = -3 | -2 | -1
    // if "/types/" updated op = -6 | -5 | -4
    const opIndex = ["add", "replace", "remove"].indexOf(patch.op) - (type === "nodes" ? 3 : 6)

    // return SchemaPatch
    return [ opIndex, +index, prop === undefined ? -1 : +prop, patch.value ]
  }

  public decodeSchemaPatch(sp: SchemaPatch, prefix = ""): IJsonPatch {
    const patch = schemaPatch(sp)

    // set JsonPatch operation
    const op = ["add", "replace", "remove"][patch.op + (patch.op < -3 ? 6 : 3)] as any

    // set path elements
    const pathArr = [, patch.op < -3 ? "types" : "nodes", patch.id]
    if (patch.prop >= 0) { pathArr.push(patch.prop) }

    const jsonPatch: IJsonPatch = { op, path: prefix + pathArr.join("/") }

    if (patch.values[0] !== undefined) {
      jsonPatch.value = patch.values[0]
    }

    // return JsonPatch
    return jsonPatch
  }

  public encodeNode (snapshot: any, sn: ISchemaNode, name: string | number): any[] {
    const node = name ? this.schema.childNode(sn, name) : sn
    if (!node || !snapshot) { return snapshot }

    if (node.type === -2) {
      name = this.schema.nodeName(node)
      return node.items!.map((key: string) => this.encodeNode(snapshot[key], node, name))
    } else if (node.type === -1) {
      return snapshot.map((item: any, i: number) => this.encodeNode(item, node, i))
    } else {
      const props = this.schema.typeProps(node.type)
      return props.map((key) => this.encodeNode(snapshot[key], node, key))
    }
  }

  public decodeNode (nodeId: any, encoded: any[]): any {
    const node = this.schema.node(nodeId)
    if (!node || !encoded) { return encoded }

    if (node.type === NODE_ARRAY_TYPE) {
      return encoded.map((item, i) => {
        const itemNode = this.schema.childNode(node, i)
        return this.decodeNode(itemNode ? itemNode.id : -1, item)
      })
    } else {
      const result: any = {}
      const keys = node.type === NODE_MAP_TYPE ? node.items : this.schema.typeProps(node.type)
      keys.forEach((key: string, i: number) => {
        const itemNode = this.schema.childNode(node, key)
        const value = this.decodeNode(itemNode ? itemNode.id : -1, encoded[i])
        if (value === undefined) { return }
        result[key] = value
      })
      return result
    }
  }

  public encodePatch (patch: IReversibleJsonPatch): Buffer {

    const pathArr = patch.path === "/" ? [""] : patch.path.split("/")

    let i = -1
    let node: ISchemaNode | undefined
    while (++i < pathArr.length) {
      const child = this.schema.childNode(node, pathArr[i] || "")
      if (!child) { break }
      node = child
    }

    if (!node) {
      throw new Error(`Wrong patch path: ${patch.path}`)
    }

    const op = ["add", "replace", "remove"].indexOf(patch.op)
    const props = this.schema.typeProps(node.type)
    const propIndex = props.indexOf(pathArr[i])

    const data: SchemaPatch = [ op, node.id, propIndex ]

    if (patch.op !== "remove") {
      data.push(this.encodeNode(patch.value, node, pathArr[i]))
    }
    if (patch.op !== "add" && "oldValue" in patch) {
      data.push(this.encodeNode(patch.oldValue, node, pathArr[i]))
    }

    return notepack.encode(data)
  }

  public decodePatch (buffer: Buffer) {

    const [opIndex, entryId, propIndex, ...values] = notepack.decode<SchemaPatch>(buffer)

    if (opIndex < 0) {
      // decode schemaMap patch
      return this.decodeSchemaPatch([opIndex, entryId, propIndex, ...values], "")
    }

    const node = this.schema.node(entryId)
    if (!node) {
      throw new Error(`Cannot decode patch - schema for node with id ${entryId} not found`)
    }
    const path = this.schema.nodePath(node)
    const props = this.schema.typeProps(node.type)

    const patch: any = {
      op: ["add", "replace", "remove"][opIndex],
      path: path + (propIndex >= 0 ? "/" + props[propIndex] : "")
    }

    const child = this.schema.findNode({ parent: entryId, index: propIndex })
    const nodeId = child ? child.id : propIndex < 0 && entryId || -1

    if (values.length && patch.op !== "remove") {
      patch.value = this.decodeNode(nodeId, values.reverse().pop())
    }

    if (values.length && patch.op !== "add") {
      patch.oldValue = this.decodeNode(nodeId, values.pop())
    }

    if (values.length) {
      throw new Error(`Unhandled params: ${values.toString()}`)
    }

    return patch
  }
}

export class SchemaSerializer extends Serializer {

  public tracker!: IMosxTracker<SchemaMap>
  public schemaPack!: SchemaPack

  public onCreate() {
    // create schema map
    const schemaMap = new SchemaMap()

    this.schemaPack = new SchemaPack(schemaMap)

    // track schema map changes
    this.tracker = Mosx.createTracker(schemaMap)
    this.tracker.onPatch((patch, obj, root) => {
      // encode schema paches
      const encoded = this.schemaPack.encodeSchemaPatch(patch)
      // console.log(patch)
      // console.log(encoded)
      patch.encoded = notepack.encode(encoded)

      // forward patches to all listeners
      this.listeneres.forEach((listener) => {
        listener.handler(patch, obj, root)
      })
    })

    // add mosx types to schema map
    mx.$context.types.forEach(( { name, $mx } ) => {
      const meta = mx.$context.meta.get(name)
      if (!meta) { return }
      schemaMap.types.push([ name, ...$mx.props.map((prop: any) => prop.key) ])
    })

    // add schema map key to state
    this.root.constructor.$mx.props.push({ key: "_", type: "", hidden: false, getter: false })
    Object.defineProperty(this.root, "_", { enumerable: false, writable: false, value: schemaMap })
  }

  public onCreateNode(entry: ITreeNode, target: any) {
    const schema = this.root._ as SchemaMap
    const parentId = entry.parent ? entry.parent.id : -1
    const index = schema.nodeIndex(parentId, entry.path)

    if (target instanceof ObservableMap) {
      // add map node to schema
      schema.nodes.push([ entry.id, NODE_MAP_TYPE, parentId, index, ...target.keys() ])
    } else if (target instanceof ObservableSet) {
      // TODO add ObservableSet
    } else if (Array.isArray(target)) {
      // add array node to schema
      schema.nodes.push([ entry.id, NODE_ARRAY_TYPE, parentId, index ])
    } else if (target instanceof Mosx) {
      // add mosx node to schema
      schema.nodes.push([ entry.id, schema.typeIndex(entry.meta.type!), parentId, index ])
    }
  }

  public onDeleteNode(entry: ITreeNode) {
    const schemaMap = this.root._ as SchemaMap
    // TODO: delete schema nodes
    // const index = schemaMap.nodes.findIndex((n) => n[0] === entry.id)
    // if (index < 0) { return }
    // schemaMap.nodes.splice(index, 1)
  }

  public onChange(change: IChange) {
    if (change.object instanceof ObservableMap) {
      const schemaMap = this.root._ as SchemaMap
      const entry = this.nodes.get(change.object)!
      const key = (change as any).name

      const node = schemaMap.nodes.find((n) => n[0] === entry.id)!
      const keys = node.slice(4)
      if (!keys.length) {
        node.push(...change.object.keys())
      } else if (!keys.includes(key)) {
        node.push(key)
      }
    }
  }

  public encode (patch: IReversibleJsonPatch, entry: ITreeNode): Buffer {
    return this.schemaPack.encodePatch(patch)
  }

  public decode (buffer: Buffer) {
    return this.schemaPack.decodePatch(buffer)
  }
}
