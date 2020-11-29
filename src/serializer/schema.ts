import { isObservableMap, ObservableMap, ObservableSet } from "mobx"

import { ITreeNode, IReversibleJsonPatch, Mosx, mx, IChange } from "../internal"
import { PatchPack } from "patchpack"
import { Serializer } from "."

export class SchemaSerializer extends Serializer {
  public patchPack!: PatchPack
  public deleted!: number

  public onCreate() {
    this.deleted = -1

    this.patchPack = new PatchPack()

    const { _types } = this.patchPack.schema as any

    // add mosx types to schema map
    mx.$context.types.forEach((type) => {
      const meta = mx.$context.meta.get(type.name)
      if (!meta) { return }
      // this.patchPack.schema.addType(type.name, type.$mx.props.map((prop: any) => prop.key), type)
      const index = _types.length
      _types.push({ name: type.name, props: type.$mx.props.map((prop: any) => prop.key), index, ref: type })
    })
  }

  public onCreateNode(entry: ITreeNode, target: any) {
    const schema = this.patchPack.schema
    const parentId = entry.parent ? entry.parent.id : -1
    const parent = schema.getNode(parentId)

    // if (parent && parent.type === MAP_NODE) {
    //   parent.keys!.push(entry.path)
    // }

    const index = parent ? schema.getChildIndex(parent, entry.path) : -1

    if (target instanceof ObservableMap) {
      // add map node to schema
      schema.createNode(entry.id, parent, -2, entry.path, index)
      // patch = schema.nodesAddMap(entry.id, parentId, entry.path, [...target.keys()])
    } else if (target instanceof ObservableSet) {
      // TODO add ObservableSet
    } else if (Array.isArray(target)) {
      // add array node to schema
      schema.createNode(entry.id, parent, -1, entry.path, index)
    } else if (target instanceof Mosx) {
      // add mosx node to schema
      const type = schema.typeByName(entry.meta.type!)!
      schema.createNode(entry.id, parent, type, entry.path, index)
    }
  }

  public onDeleteNode(entry: ITreeNode) {
    if (this.deleted === -1) {
      this.deleted = entry.id
      const node = this.patchPack.schema.getNode(this.deleted)!
      this.patchPack.schema.deleteNode(node)
    }
  }

  public afterChange(change: IChange) {
    if (this.deleted >= 0) {
      this.deleted = -1
      this.patchPack.schema.clearDeleted()
    }
  }

  public beforeChange(change: IChange, parent: ITreeNode) {
    if (isObservableMap(change.object) && change.type === "add") {
      const node = this.patchPack.schema.getNode(parent.id)
      if (!node) { return }
      node.keys!.push(change.name)
    }
  }

  public encodeSnapshot(value: any) {
    return this.patchPack.encodeState(value, true, false)
  }

  public decodeSnapshot(buffer: Buffer) {
    return this.patchPack.decodeState(buffer)
  }

  public encodePatch(patch: IReversibleJsonPatch, entry: ITreeNode): Buffer {
    return this.patchPack.encodePatch(patch, false)
  }

  public decodePatch (buffer: Buffer) {
    return this.patchPack.decodePatch(buffer)
  }
}
