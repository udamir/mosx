import { isObservable, ObservableMap, ObservableSet } from "mobx"

import { ITreeNode, IReversibleJsonPatch, Mosx, mx, IChange, IMosxTracker, IEncodedJsonPatch } from "../internal"
import { PatchPack, ISchema, SchemaNode, SchemaType } from "patchpack"
import { Serializer } from "."

@mx.Object
class Schema implements ISchema {
  // all mosx types
  @mx types: Array<SchemaType> = []
  // state tree nodes
  @mx nodes: Array<SchemaNode> = []
}

export class SchemaSerializer extends Serializer {
  public tracker!: IMosxTracker<Schema>
  public patchPack!: PatchPack
  public deleted!: number

  public onCreate() {
    // create schema map
    const schema = new Schema()

    this.patchPack = new PatchPack(schema)
    this.deleted = -1

    // add mosx types to schema map
    mx.$context.types.forEach(( { name, $mx } ) => {
      const meta = mx.$context.meta.get(name)
      if (!meta) { return }
      this.patchPack.schema.addType(name, $mx.props.map((prop: any) => prop.key))
    })

    // add schema map key to state
    this.root.constructor.$mx.props.push({ key: "_", type: "", hidden: false, getter: false })
    Object.defineProperty(this.root, "_", { enumerable: false, writable: false, value: schema })
  }

  public broadcastPatch(patch: IEncodedJsonPatch, obj: any) {
    // encode schema paches
    patch.encoded = this.patchPack.encodeSchemaPatch(patch)

    // forward patches to all listeners
    this.listeneres.forEach((listener) => {
      listener.handler(patch, obj, this.root)
    })
  }

  public onCreateNode(entry: ITreeNode, target: any) {
    const schema = this.patchPack.schema
    const parentId = entry.parent ? entry.parent.id : -1

    let patch
    if (target instanceof ObservableMap) {
      // add map node to schema
      patch = schema.addMapNode(entry.id, parentId, entry.path, [...target.keys()])
    } else if (target instanceof ObservableSet) {
      // TODO add ObservableSet
    } else if (Array.isArray(target)) {
      // add array node to schema
      patch = schema.addArrayNode(entry.id, parentId, entry.path)
    } else if (target instanceof Mosx) {
      // add mosx node to schema
      patch = schema.addObjectNode(entry.id, entry.meta.type!, parentId, entry.path)
    }

    if (patch) {
      this.broadcastPatch(patch, target)
    }
  }

  public onDeleteNode(entry: ITreeNode) {
    if (this.deleted === -1) {
      this.deleted = entry.id
    }
  }

  public beforeChange(change: IChange) {
    const entry = this.nodes.get(change.object)!
    if (change.object instanceof ObservableMap) {
      // skip object keys
      if (isObservable((change as any).newValue)) { return }

      const schema = this.patchPack.schema
      const key = (change as any).name

      const node = schema.getNode(entry.id)!
      if (!node.items.includes(key)) {
        const patch = schema.addMapNodeKey(node.id, key)!
        this.broadcastPatch(patch, change.object)
      }
    }
  }

  public afterChange(change: IChange) {
    if (this.deleted >= 0) {
      const schema = this.patchPack.schema
      const patch = schema.deleteNode(this.deleted)!
      this.broadcastPatch(patch, change.object)
      this.deleted = -1
    }
  }

  public encode (patch: IReversibleJsonPatch, entry: ITreeNode): Buffer {
    return this.patchPack.encodePatch(patch)
  }

  public decode (buffer: Buffer) {
    return this.patchPack.decodePatch(buffer, false)
  }
}
