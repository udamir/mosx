import * as mobx from "mobx"

import {
  snapshot, Mosx, Serializer, IMeta,
  IChange, IDisposer, IEncodedJsonPatch, IListener, IMosxPatchParams, IMosxSnapshotParams,
  IMosxTracker, IMosxTrackerParams, ITagsChange, ITreeNode, JsonPatchOp, MosxPatchListener,
} from "./internal"

export class MosxTracker<T = any> implements IMosxTracker<T> {
  private _adding: boolean = false
  private lastId: number = 0
  private patchedObjects: Map<MosxPatchListener<T>, any[]> = new Map<MosxPatchListener<T>, any[]>()
  public listeners: Set<IListener<T>> = new Set<IListener<T>>()
  public nodes = new WeakMap<any, ITreeNode>()
  public root: T

  public serializer?: Serializer
  public reversible: boolean
  public privateMapValuePatch: boolean

  constructor(object: T, params: IMosxTrackerParams = {}) {
    if (Mosx.getParent(object)) {
      throw Error("Can track only root object!")
    }
    this.root = object
    this.reversible = params.reversible || false
    this.privateMapValuePatch = params.privateMapValuePatch || false
    this.serializer = params.serializer && new params.serializer(this)
    this.observeRecursively(this.root, undefined, "")
  }

  public onPatch(handler: MosxPatchListener<T>, params: IMosxPatchParams = {}): IDisposer {
    let { tags = [], filter = [] } = params
    const { reversible = this.reversible, spy = false } = params

    filter = Array.isArray(filter) ? filter : [filter]
    tags = Array.isArray(tags) ? tags : [tags]

    const listener = { handler, filter: new Set(filter), tags, reversible, spy }
    this.listeners.add(listener)

    return () => { this.listeners.delete(listener) }
  }

  public dispose() {
    this.unobserveRecursively(this.root)
  }

  public tagChanged() {
    this.patchedObjects.clear()
  }

  public snapshot(params: IMosxSnapshotParams): any {
    const state = Mosx.getSnapshot(this.root, params?.tags, params?.spy)
    return this.serializer ? this.serializer.encodeSnapshot(state) : state
  }

  public tagExist(entryTags?: Set<string> | string[], tags: string[] = []) {
    const tagsArr = entryTags ? [...entryTags] : []
    // tslint:disable-next-line: no-bitwise
    return !!tagsArr.find((tag) => !!~tags.indexOf(tag))
  }

  public getParentValue(entry: ITreeNode) {
    entry.path
  }

  public tagChange(object: any, change: ITagsChange) {
    const entry = this.nodes.get(object)
    if (!entry) { return }

    entry.tags = Array.from(change.newValue)
    let path = "/" + this.buildPath(entry)

    // skip if parent is added
    if (this._adding) { return }

    // object props
    const props = entry.meta.props!.filter((prop) => prop.hidden)

    if (!props.length && !entry.hidden) { return }

    for (const { handler: listener, tags, reversible, filter, spy } of this.listeners.values()) {
      // spy don't need updates 
      if (spy) { continue }

      // check if listeners already got this patch
      let patchedObjects = this.patchedObjects.get(listener)
      if (!patchedObjects) {
        patchedObjects = []
        this.patchedObjects.set(listener, patchedObjects)
      } else {
        let alreadyPatched = false
        for (const parent of patchedObjects) {
          alreadyPatched = object === parent || Mosx.isParent(object, parent)
          if (alreadyPatched) { break }
        }
        if (alreadyPatched) { continue }
      }

      // check if tag inhereted from private parent
      if (entry.parent && entry.parent.hidden) { continue }

      // check if update needed
      const wasVisible = this.tagExist(change.oldValue, tags)
      const nowVisible = this.tagExist(change.newValue, tags)
      if (wasVisible === nowVisible) { continue }

      const changedObjects: Array<{ op: JsonPatchOp, path: string, object: any }> = []

      if (entry.hidden) {
        // handle private object
        const op: JsonPatchOp = !this.privateMapValuePatch && entry.parent?.meta?.type === "map"
          ? nowVisible ? "add" : "remove"
          : "replace"

        if (filter.size && !filter.has(op)) { continue }
        changedObjects.push({ op, path, object })
      } else {
        // handle private properties
        const op = nowVisible ? "add" : "remove"
        if (filter.size && !filter.has(op)) { continue }

        path = path.slice(-1) !== "/" ? path + "/" : path
        for (const prop of props) {
          changedObjects.push({ op, path: path + prop.key, object: (object as any)[prop.key] })
        }
      }

      for (const changedObject of changedObjects) {
        // create patch for each changed object/property
        const patch: IEncodedJsonPatch = {
          op: changedObject.op,
          path: changedObject.path,
          value: nowVisible ? snapshot(changedObject.object, { tags }) : undefined,
        }
        if (reversible) {
          patch.oldValue = wasVisible ? snapshot(changedObject.object, { tags, objTags: change.oldValue }) : undefined
        }

        if (this.serializer) {
          patch.encoded = this.serializer.encodePatch(patch, entry)
        }

        // save patched object
        if (changedObject.object instanceof Mosx) {
          patchedObjects.push(changedObject.object)
        }
        listener(patch, changedObject.object, this.root)
      }
    }
  }

  public computedChange(object: any, change: IChange) {
    const entry = this.nodes.get(object)
    if (!entry) { return }
    this.processChange(change, entry)
  }

  private isHidden (node: ITreeNode, tags: string[]): boolean {
    while (node) {
      if (node.hidden && !this.tagExist(tags, node.tags)) {
        return true
      }
      node = node.parent as ITreeNode
    }
    return false
  }

  private processAddChange(change: IChange, parent: ITreeNode, path: string) {
    if (change.type !== "add") { return }
    this._adding = true
    const entry = this.observeRecursively(change.newValue, parent, change.name) || parent
    this._adding = false
    for (const { handler, tags, filter, spy } of this.listeners.values()) {
      if (filter.size && !filter.has("add")) { continue }
      if (!spy && this.isHidden(parent, tags)) { continue }
      // check if object is visible for listener
      if (!spy && !this.privateMapValuePatch && this.isHidden(entry, tags)) { continue }

      const patch: IEncodedJsonPatch = {
        op: "add",
        path: path + change.name,
        value: snapshot(change.newValue, { tags, spy }),
      }

      if (this.serializer) {
        patch.encoded = this.serializer.encodePatch(patch, entry)
      }

      handler(patch, change.object, this.root)
    }
  }

  private processUpdateChange(change: IChange, parent: ITreeNode, path: string) {
    if (change.type !== "update") { return }

    const key = (change as any).name || "" + (change as any).index
    const props = parent.meta && parent.meta.props || []

    this.unobserveRecursively(change.oldValue)
    const entry = this.observeRecursively(change.newValue, parent, key) || parent

    // ignore observable properies
    if (parent.meta?.props && !props.find((prop) => prop.key === key)) { return }
    const hidden = parent.hidden || !!props.find((prop) => prop.key === key && !!prop.hidden)

    for (const { handler, tags, reversible, filter, spy } of this.listeners.values()) {
      if (filter.size && !filter.has("replace")) { continue }
      if (!spy && this.isHidden(parent, tags)) { continue }
      // check if object and field are visible for listener
      if (!spy && hidden && !this.tagExist(tags, entry.tags)) { continue }

      const patch: IEncodedJsonPatch = {
        op: "replace",
        path: path + key,
        value: snapshot(change.newValue, { tags, spy }),
      }

      if (reversible) {
        patch.oldValue = snapshot(change.oldValue, { tags, spy })
      }

      if (this.serializer) {
        patch.encoded = this.serializer.encodePatch(patch, entry)
      }

      handler(patch, change.object, this.root)
    }
  }

  private processDeleteChange(change: IChange, parent: ITreeNode, path: string) {
    if (change.type !== "delete" && change.type !== "remove") { return }

    const entry = this.unobserveRecursively(change.oldValue) || parent

    for (const { handler, tags, reversible, filter, spy } of this.listeners.values()) {
      if (filter.size && !filter.has("remove")) { continue }
      if (!spy && this.isHidden(parent, tags)) { continue }
      // check if object is visible for listener
      if (!spy && !this.privateMapValuePatch && this.isHidden(entry, tags)) { continue }

      const patch: IEncodedJsonPatch = {
        op: "remove",
        path: path + change.name,
      }

      if (reversible) {
        patch.oldValue = snapshot(change.oldValue, { tags, spy })
      }

      if (this.serializer) {
        patch.encoded = this.serializer.encodePatch(patch, entry)
      }

      handler(patch, change.object, this.root)
    }
  }

  private processSpliceChange(change: mobx.IArraySplice, parent: ITreeNode, path: string) {

    change.removed.forEach((item: any) => {
      const entry = this.unobserveRecursively(item) || parent

      for (const { handler, tags, reversible, filter, spy } of this.listeners.values()) {
        if (filter.size && !filter.has("remove")) { continue }
        if (!spy && this.isHidden(parent, tags)) { continue }

        const patch: IEncodedJsonPatch = {
          op: "remove",
          path: path + change.index,
        }

        if (reversible) {
          patch.oldValue = (spy || !entry.hidden || this.tagExist(tags, entry.tags)) ? snapshot(item, { tags, spy }) : undefined
        }

        if (this.serializer) {
          patch.encoded = this.serializer.encodePatch(patch, entry)
        }

        handler(patch, change.object, this.root)
      }
    })

    change.added.forEach((item: any, idx: number) => {

      const entry = this.observeRecursively(item, parent, "" + (change.index + idx)) || parent

      for (const { handler, tags, filter, spy } of this.listeners.values()) {

        if (filter.size && !filter.has("add")) { continue }
        if (!spy && this.isHidden(parent, tags)) { continue }

        const patch: IEncodedJsonPatch = {
          op: "add",
          path: path + change.index,
          value: snapshot(item, { tags, spy }),
        }

        if (this.serializer) {
          patch.encoded = this.serializer.encodePatch(patch, entry)
        }

        handler(patch, change.object, this.root)
      }
    })

    // update paths
    for (let i = change.index + change.addedCount; i < change.object.length; i++) {
      if (this.isRecursivelyObservable(change.object[i])) {
        const itemEntry = this.nodes.get(change.object[i])
        if (itemEntry) { itemEntry.path = "" + i }
      }
    }
  }

  private processChange(change: IChange, parent: ITreeNode) {
    let path = "/" + this.buildPath(parent)
    path = path !== "/" ? path + "/" : "/"

    switch (change.type) {
      case "add": return this.processAddChange(change, parent, path)
      case "update": return this.processUpdateChange(change, parent, path)
      case "delete": case "remove": return this.processDeleteChange(change, parent, path)
      case "splice": return this.processSpliceChange(change, parent, path)
    }
  }

  private isRecursivelyObservable(node: any) {
    return mobx.isObservableObject(node) || mobx.isObservableArray(node) || mobx.isObservableMap(node)
  }

  private buildPath(entry: ITreeNode | undefined): string {
    if (!entry) { return "" }
    const res: string[] = []
    while (entry.parent) {
      res.push(entry.path)
      entry = entry.parent
    }
    return res.reverse().join("/")
  }

  private observeRecursively(node: any, parent: ITreeNode | undefined, path: string): ITreeNode | undefined {
    if (!this.isRecursivelyObservable(node)) { return }

    let entry = this.nodes.get(node)
    if (entry && (entry.parent !== parent || entry.path !== path)) {
      throw new Error(`The same observable object cannot appear twice in the same tree,` +
                      ` trying to assign it to '${this.buildPath(parent)}/${path}',` +
                      ` but it already exists at '${this.buildPath(entry.parent)}/${entry.path}'`)
    }
    if (!entry) {
      // create entry
      entry = this.createEntry(node, parent, path)

      mobx.entries(node).forEach(([key, value]) => {
        this.observeRecursively(value, entry, key)
      })
    }
    return entry
  }

  private createEntry(value: any, parent: ITreeNode | undefined, path: string) {
    // observe node
    const dispose = mobx.observe(value, (change: IChange) => {
      const parentNode = this.nodes.get(change.object)!

      // notify serializer
      this.serializer && this.serializer.beforeChange(change, parentNode)

      this.processChange(change, parentNode)

      // notify serializer
      this.serializer && this.serializer.afterChange(change, parentNode)
    })
    // current node metadata
    let meta: IMeta
    if (value instanceof Mosx) {
      meta = Mosx.meta(value)
      meta.type = value.constructor.name || (value.constructor as any).__proto__.name
    } else {
      meta = { type: "", props: undefined, hidden: false }
      meta.type = mobx.isObservableMap(value) && "map"
        || mobx.isObservableArray(value) && "array"
        || mobx.isObservableObject(value) && "object" || ""
    }
    // check if path is hidden
    const parentProps = parent?.meta?.props || []
    const hiddenProp = !!parentProps.find((prop) => prop.key === path && (prop.hidden || false))
    // check if current or parent nodes are hidden
    const hidden = !!meta && meta.hidden || !!parent && (parent.hidden || hiddenProp)
    // collect node tags or parent node tags
    const tags: string[] = Array.from(Mosx.getTags(value) || parent && parent.tags || [])

    const entry = { id: this.lastId++, parent, path, dispose, meta, hidden, tags }
    this.nodes.set(value, entry)

    // notify serializer
    this.serializer?.onCreateNode(entry, value)

    // add default parent (root) to mosx object tagsTree
    if (value !== this.root && value instanceof Mosx && !Mosx.getParent(value)) {
      Mosx.setParent(value, this.root)
    }
    // store endtry
    return entry
  }

  private unobserveRecursively(node: any) {
    if (!this.isRecursivelyObservable(node)) { return }

    const entry = this.nodes.get(node)
    if (!entry) { return }

    this.nodes.delete(node)
    entry.dispose()

    if (node instanceof Mosx) {
      Mosx.destroy(node)
    }

    // notify serializer
    this.serializer && this.serializer.onDeleteNode(entry)

    // unobserve children
    mobx.values(node).forEach(this.unobserveRecursively.bind(this))
    return entry
  }

}
