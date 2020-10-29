import { ObservableMap, ObservableSet } from "mobx"
import * as notepack from "notepack.io"

import { Serializer, ITreeNode, IReversibleJsonPatch, Mosx, mx } from "../../index"
import { IChange, IJsonPatch, IMosxTracker } from "../internal"

//   SchemaType = [ name,   props    ]
type SchemaType = [ string, ...string[] ]

//   SchemaNode = [ id,     type,   parent, name,            items? ]
type SchemaNode = [ number, number, number, string | number, ...string[] ]
interface ISchemaNodeObject {
  id: number
  type: number
  parent: number
  name: number | string
  items?: string[]
}

//   SchemaPatch = [ op,     id,     prop,   value/oldValue ]
type SchemaPatch = [ number, number, number, any?, any? ]

@mx.Object
export class SchemaMap {
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

  public node(id: number): SchemaNode & ISchemaNodeObject | undefined {
    const node = this.nodes.find((n) => n[0] === id) as SchemaNode & ISchemaNodeObject | undefined
    if (!node) { return }
    node.id = node[0]
    node.type = node[1]
    node.parent = node[2]
    node.name = node[3]
    node.items = node.slice(4) as string[]
    return node
  }

  public nodePath(node: ISchemaNodeObject) {
    const pathArr = []
    while (!!node) {
      pathArr.push(node.name)
      node = this.node(node.parent)!
    }
    return pathArr.reverse().join("/")
  }
}

export class SchemaSerializer extends Serializer {

  public tracker!: IMosxTracker<SchemaMap>

  public encodeSchemaPatch(patch: IJsonPatch): SchemaPatch {
    // split path to elements
    // "/nodes/1/2"
    const [, type, index, prop] = patch.path.split("/")

    // set operation for patch type
    // if "/nodes/" updated op = -3 | -2 | -1
    // if "/types/" updated op = -6 | -5 | -4
    const opIndex = ["add", "replace", "remove"].indexOf(patch.op) - (type === "nodes" ? 3 : 6)

    // return SchemaPatch
    return [ opIndex, +index, +prop, patch.value ]
  }

  public decodeSchemaPatch(schmaPatch: SchemaPatch): IJsonPatch {
    const [opIndex, index, prop, value] = schmaPatch

    // set JsonPatch operation
    const op = ["add", "replace", "remove"][opIndex + (opIndex < -3 ? 6 : 3)] as any

    // set path elements
    const pathArr = [, opIndex < -3 ? "types" : "nodes", index]
    if (prop) { pathArr.push(prop) }

    // return JsonPatch
    return { op, path: pathArr.join("/"), value }
  }

  public onCreate() {
    // create schema map
    const schemaMap = new SchemaMap()

    // track schema map changes
    this.tracker = Mosx.createTracker(schemaMap)
    this.tracker.onPatch((patch, obj, root) => {
      // encode schema paches
      patch.encoded = notepack.encode(this.encodeSchemaPatch(patch))

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
    const schemaMap = this.root._ as SchemaMap
    const parentId = entry.parent ? entry.parent.id : -1
    const name = entry.path

    if (target instanceof ObservableMap) {
      // add map node to schema
      schemaMap.nodes.push([ entry.id, -2, parentId, name, ...target.keys() ])
    } else if (target instanceof ObservableSet) {
      // TODO
    } else if (Array.isArray(target)) {
      // add array node to schema
      schemaMap.nodes.push([ entry.id, -1, parentId, name ])
    } else if (target instanceof Mosx) {
      // add mosx node to schema
      schemaMap.nodes.push([ entry.id, schemaMap.typeIndex(entry.meta.type!), parentId, name ])
    }
  }

  public onDeleteNode(entry: ITreeNode) {
    const schemaMap = this.root._ as SchemaMap
    const index = schemaMap.nodes.findIndex((n) => n[0] === entry.id)
    if (index < 0) { return }
    schemaMap.nodes.splice(index, 1)
  }

  public onChange(change: IChange) {
    if (change.object instanceof ObservableMap) {
      const schemaMap = this.root._ as SchemaMap
      const entry = this.nodes.get(change.object)!
      const key = (change as any).name

      const schemaNode = schemaMap.node(entry.id)!
      const keys = schemaNode.items
      if (!keys) {
        schemaNode.push(...change.object.keys())
      } else if (!keys.includes(key)) {
        schemaNode.push(key)
      }
    }
  }

  private encodeNode (snapshot: any, target: any): any[] {
    const schemaMap = this.root._ as SchemaMap
    const entry = this.nodes.get(target)
    if (!entry || !snapshot) { return snapshot }

    if (target instanceof ObservableMap) {
      const keys = schemaMap.node(entry.id)!.items || []
      return keys.map((key: string) => this.encodeNode(snapshot[key], (target as any)[key]))
    } else if (Array.isArray(target)) {
      return target.map((item, i) => this.encodeNode(snapshot[i], item))
    } else if (target instanceof Mosx) {
      return entry.meta.props.map(({ key }) => this.encodeNode(snapshot[key], (target as any)[key]))
    } else {
      return snapshot
    }
  }

  private decodeNode (nodeId: any, snapshot: any[]): any {
    const schemaMap = this.root._ as SchemaMap

    const node = schemaMap.node(nodeId)
    if (!node || !snapshot) { return snapshot }
    const [ id, type ] = node

    if (type === -1) {
      return snapshot.map((item, i) => {
        const itemNode = schemaMap.nodes.find((n) => n[2] === id && n[3] === i)
        return this.decodeNode(itemNode ? itemNode[0] : -1, item)
      })
    } else {
      const result: any = {}
      const keys = type === -2 ? node.items || [] : schemaMap.typeProps(type)
      keys.forEach((key: string, i: number) => {
        const itemNode = schemaMap.nodes.find((n) => n[2] === id && n[3] === key)
        result[key] = this.decodeNode(itemNode ? itemNode[0] : -1, snapshot[i])
      })
      return result
    }
  }

  public encodeSnapshot(snapshot: any, object: any): Buffer {

    const entry = this.nodes.get(object)
    if (!entry) {
      throw new Error(`Cannot get encoded snapshot - Mosx object required!`)
    }

    return notepack.encode([entry.id, this.encodeNode(snapshot, object)])
  }

  public decodeSnapshot(buffer: Buffer): any {

    const [id, data] = notepack.decode(buffer)
    return this.decodeNode(id, data)
  }

  public buildPath(entry: ITreeNode | undefined): string {
    if (!entry) { return "" }
    const res: string[] = []
    while (entry.parent) {
      res.push(entry.path)
      entry = entry.parent
    }
    return "/" + res.reverse().join("/")
  }

  public treeNodeObject(entry: ITreeNode): any {
    if (!entry) { return this.root }
    const res: string[] = []
    while (entry.parent) {
      res.push(entry.path)
      entry = entry.parent
    }
    let obj = this.root
    while(res.length) {
      const key = res.pop() as string
      if (Array.isArray(obj)) {
        obj = obj[+key]
      } else if (obj instanceof ObservableMap) {
        obj = obj.get(key)
      } else {
        obj = obj[key]
      }
    }
    return obj
  }

  public encode (patch: IReversibleJsonPatch, entry: ITreeNode): Buffer {

    const op = ["add", "replace", "remove"].indexOf(patch.op)

    const path = this.buildPath(entry)
    const key = patch.path.slice(path.length + 1)

    const index = entry.meta ? entry.meta.props.findIndex((prop) => prop.key === key) : -1

    const data: SchemaPatch = [ op, entry.id, index ]
    const target = this.treeNodeObject(entry)

    if (patch.op !== "remove") {
      data.push(path === patch.path ? this.encodeNode(patch.value, target) : patch.value)
    }
    if (patch.op !== "add" && "oldValue" in patch) {
      data.push(path === patch.path ? this.encodeNode(patch.oldValue, target) : patch.oldValue)
    }

    return notepack.encode(data)
  }

  public decode (buffer: Buffer) {

    const [opIndex, entryId, propIndex, ...values] = notepack.decode<SchemaPatch>(buffer)

    if (opIndex < 0) {
      return this.decodeSchemaPatch([opIndex, entryId, propIndex, ...values])
    }

    const schemaMap = this.root._ as SchemaMap
    const node = schemaMap.node(entryId)
    if (!node) {
      throw new Error(`Cannot decode patch - schema for node with id ${entryId} not found`)
    }
    const path = schemaMap.nodePath(node)
    const props = schemaMap.typeProps(node.type)

    const patch: any = {
      op: ["add", "replace", "remove"][opIndex],
      path: path + (propIndex >= 0 ? "/" + props[propIndex] : "")
    }

    if (values.length && patch.op !== "remove") {
      patch.value = propIndex < 0 ? this.decodeNode(entryId, values.reverse().pop()) : values.reverse().pop()
    }

    if (values.length && patch.op !== "add") {
      patch.oldValue = propIndex < 0 ?  this.decodeNode(entryId, values.pop()) : values.pop()
    }

    if (values.length) {
      throw new Error(`Unhandled params: ${values.toString()}`)
    }

    return patch
  }
}
