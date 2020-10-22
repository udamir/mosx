import * as mobx from "mobx"

import { snapshot } from "./snapshot"
import { Mosx, IMeta } from "./mosx"
import { mx } from "./decorators"

export type JsonPatchOp = "replace" | "add" | "remove"

export interface IJsonPatch {
  op: JsonPatchOp
  path: string
  value?: any
}

export interface IReversibleJsonPatch extends IJsonPatch {
  oldValue?: any
}

export interface IEncodedJsonPatch extends IReversibleJsonPatch {
  encoded?: Buffer
}

export type MosxPatchListener<T> = (patch: IEncodedJsonPatch, obj: any, root: T) => void

export interface IMosxSnapshotParams {
  serializer?: string
  tags?: string | string[]
  spy?: boolean
}

export interface IMosxPatchParams extends IMosxSnapshotParams {
  filter?: JsonPatchOp | JsonPatchOp[]
  reversible?: boolean
}

export interface IMosxTrackerParams {
  serializer?: string
  reversible?: boolean
}

export interface IMosxTracker<T> {
  onPatch: (listener: MosxPatchListener<T>, params?: IMosxPatchParams) => IDisposer
  snapshot(params?: IMosxSnapshotParams): { [key: string]: any }
  decodeMap(serializer?: string): any
  dispose(): void
}

export interface ITagsChange {
  type: string
  newValue: Set<string>
  oldValue?: Set<string>
}

type IDisposer = () => void

 // TODO: mobx.ISetDidChange
type IChange = mobx.IObjectDidChange |
               mobx.IArrayChange | mobx.IArraySplice | mobx.IMapDidChange | mobx.IValueDidChange<any>

interface IEntry {
  id: number
  dispose: IDisposer
  path: string
  parent: IEntry | undefined
  meta: IMeta
  hidden: boolean
  tags: string[]
}

interface IListener<T> {
  handler: MosxPatchListener<T>
  filter: Set<JsonPatchOp>
  tags: string[]
  reversible: boolean
  serializer?: string
  spy?: boolean // TODO: add spy logic for monitoring
}

export class MosxTracker<T = any> implements IMosxTracker<T> {
  private lastId: number = 0
  private listeners: Set<IListener<T>> = new Set<IListener<T>>()
  private patchedObjects: Map<MosxPatchListener<T>, any[]> = new Map<MosxPatchListener<T>, any[]>()
  public entrySet = new WeakMap<any, IEntry>()
  public root: T

  public serializer?: string
  public reversible: boolean

  constructor(object: T, params?: IMosxTrackerParams) {
    if (Mosx.getParent(object)) {
      throw Error("Can track only root object!")
    }
    this.root = object
    this.serializer = params && params.serializer || ""
    this.reversible = params && params.reversible || false
    this.observeRecursively(this.root, undefined, "")
  }

  public decodeMap(serializer = this.serializer): any {
    return mx.$context.decodeMap(serializer)
  }

  public onPatch(handler: MosxPatchListener<T>, params: IMosxPatchParams = {}): IDisposer {
    let { tags = [], filter = [] } = params
    const { reversible = this.reversible, spy = false, serializer = this.serializer } = params

    filter = Array.isArray(filter) ? filter : [filter]
    tags = Array.isArray(tags) ? tags : [tags]

    const listener = { handler, filter: new Set(filter), tags, reversible, spy, serializer }
    this.listeners.add(listener)

    return () => { this.listeners.delete(listener) }
  }

  public dispose() {
    this.unobserveRecursively(this.root)
  }

  public tagChanged() {
    this.patchedObjects.clear()
  }

  public snapshot(params: IMosxSnapshotParams) {
    return Mosx.getSnapshot(this.root, params && params.tags)
  }

  public tagExist(entryTags?: Set<string> | string[], tags: string[] = []) {
    const tagsArr = entryTags ? [...entryTags] : []
    // tslint:disable-next-line: no-bitwise
    return !!tagsArr.find((tag) => !!~tags.indexOf(tag))
  }

  public tagChange(object: any, change: ITagsChange) {
    const entry = this.entrySet.get(object)
    if (!entry) { return }

    entry.tags = Array.from(change.newValue)
    let path = "/" + this.buildPath(entry)

    // object props
    const props = entry.meta.props.filter((prop) => prop.hidden)

    if (!props.length && !entry.hidden) { return }

    for (const { handler: listener, tags, reversible, filter, serializer } of this.listeners.values()) {
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

      // check if update needed
      const wasVisible = this.tagExist(change.oldValue, tags)
      const nowVisible = this.tagExist(change.newValue, tags)
      if (wasVisible === nowVisible) { continue }

      const changedObjects: Array<{ op: JsonPatchOp, path: string, object: any }> = []

      if (entry.hidden) {
        // handle private object
        if (filter.size && !filter.has("replace")) { continue }
        changedObjects.push({ op: "replace", path, object })
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
          value: nowVisible && snapshot(changedObject.object, { tags }),
        }
        if (reversible) {
          patch.oldValue = wasVisible && snapshot(changedObject.object, { tags, objTags: change.oldValue })
        }

        if (serializer) {
          patch.encoded = mx.$context.encodePatch(patch, this.entryTypePath(entry), serializer)
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
    const entry = this.entrySet.get(object)
    if (!entry) { return }
    this.processChange(change, entry)
  }

  private entryTypePath(entry?: IEntry): string[] {
    const pathArr = []
    while (entry) {
      pathArr.push(entry.meta && entry.meta.type || "")
      entry = entry.parent
    }
    return pathArr.reverse()
  }

  private processAddChange(change: IChange, parent: IEntry, path: string) {
    if (change.type !== "add") { return }
    const entry = this.observeRecursively(change.newValue, parent, change.name) || parent

    for (const { handler, tags, filter, serializer } of this.listeners.values()) {
      if (filter.size && !filter.has("add")) { continue }
      // check if object is visible for listener
      if (entry.hidden && !this.tagExist(tags, entry.tags)) { continue }

      const patch: IEncodedJsonPatch = {
        op: "add",
        path: path + change.name,
        value: snapshot(change.newValue, { tags }),
      }

      if (serializer) {
        patch.encoded = mx.$context.encodePatch(patch, this.entryTypePath(entry), serializer)
      }

      handler(patch, change.object, this.root)
    }
  }

  private processUpdateChange(change: IChange, parent: IEntry, path: string) {
    if (change.type !== "update") { return }

    const key = (change as any).name || "" + (change as any).index
    const props = parent.meta && parent.meta.props || []

    this.unobserveRecursively(change.oldValue)
    const entry = this.observeRecursively(change.newValue, parent, key) || parent

    // ignore observable properies
    if (parent.meta && !props.find((prop) => prop.key === key)) { return }
    const hidden = parent.hidden || !!props.find((prop) => prop.key === key && !!prop.hidden)

    for (const { handler, tags, reversible, filter, serializer } of this.listeners.values()) {
      if (filter.size && !filter.has("replace")) { continue }
      // check if object and field are visible for listener
      if (hidden && !this.tagExist(tags, entry.tags)) { continue }

      const patch: IEncodedJsonPatch = {
        op: "replace",
        path: path + key,
        value: snapshot(change.newValue, { tags }),
      }

      if (reversible) {
        patch.oldValue = snapshot(change.oldValue, { tags })
      }

      if (serializer) {
        patch.encoded = mx.$context.encodePatch(patch, this.entryTypePath(entry), serializer)
      }

      handler(patch, change.object, this.root)
    }
  }

  private processDeleteChange(change: IChange, parent: IEntry, path: string) {
    if (change.type !== "delete" && change.type !== "remove") { return }

    const entry = this.unobserveRecursively(change.oldValue) || parent

    for (const { handler, tags, reversible, filter, serializer } of this.listeners.values()) {
      if (filter.size && !filter.has("remove")) { continue }
      // check if object is visible for listener
      if (entry.hidden && !this.tagExist(tags, entry.tags)) { continue }

      const patch: IEncodedJsonPatch = {
        op: "remove",
        path: path + change.name,
      }

      if (reversible) {
        patch.oldValue = snapshot(change.oldValue, { tags })
      }

      if (serializer) {
        patch.encoded = mx.$context.encodePatch(patch, this.entryTypePath(entry), serializer)
      }

      handler(patch, change.object, this.root)
    }
  }

  private processSpliceChange(change: mobx.IArraySplice, parent: IEntry, path: string) {

    change.removed.forEach((item: any) => {
      const entry = this.unobserveRecursively(item) || parent

      for (const { handler, tags, reversible, filter, serializer } of this.listeners.values()) {
        if (filter.size && !filter.has("remove")) { continue }
        if (parent.hidden && !this.tagExist(tags, entry.tags)) { continue }

        const patch: IEncodedJsonPatch = {
          op: "remove",
          path: path + change.index,
        }

        if (reversible) {
          patch.oldValue = (!entry.hidden || this.tagExist(tags, entry.tags)) ? snapshot(item, { tags }) : undefined
        }

        if (serializer) {
          patch.encoded = mx.$context.encodePatch(patch, this.entryTypePath(entry), serializer)
        }

        handler(patch, change.object, this.root)
      }
    })

    change.added.forEach((item: any, idx: number) => {

      const entry = this.observeRecursively(item, parent, "" + (change.index + idx)) || parent
      for (const { handler, tags, filter, serializer } of this.listeners.values()) {

        if (filter.size && !filter.has("add")) { continue }
        if (parent.hidden && !this.tagExist(tags, entry.tags)) { continue }

        const patch: IEncodedJsonPatch = {
          op: "add",
          path: path + change.index,
          value: snapshot(item, { tags }),
        }

        if (serializer) {
          patch.encoded = mx.$context.encodePatch(patch, this.entryTypePath(entry), serializer)
        }

        handler(patch, change.object, this.root)
      }
    })

    // update paths
    for (let i = change.index + change.addedCount; i < change.object.length; i++) {
      if (this.isRecursivelyObservable(change.object[i])) {
        const itemEntry = this.entrySet.get(change.object[i])
        if (itemEntry) { itemEntry.path = "" + i }
      }
    }
  }

  private processChange(change: IChange, parent: IEntry) {
    let path = "/" + this.buildPath(parent)
    path = path !== "/" ? path + "/" : "/"

    switch (change.type) {
      case "add": return this.processAddChange(change, parent, path)
      case "update": return this.processUpdateChange(change, parent, path)
      case "delete": case "remove": return this.processDeleteChange(change, parent, path)
      case "splice": this.processSpliceChange(change, parent, path)
    }
  }

  private isRecursivelyObservable(node: any) {
    return mobx.isObservableObject(node) || mobx.isObservableArray(node) || mobx.isObservableMap(node)
  }

  private buildPath(entry: IEntry | undefined): string {
    if (!entry) { return "" }
    const res: string[] = []
    while (entry.parent) {
      res.push(entry.path)
      entry = entry.parent
    }
    return res.reverse().join("/")
  }

  private observeRecursively(node: any, parent: IEntry | undefined, path: string): IEntry | undefined {
    if (!this.isRecursivelyObservable(node)) { return }

    let entry = this.entrySet.get(node)
    if (entry && (entry.parent !== parent || entry.path !== path)) {
      throw new Error(`The same observable object cannot appear twice in the same tree,` +
                      ` trying to assign it to '${this.buildPath(parent)}/${path}',` +
                      ` but it already exists at '${this.buildPath(entry.parent)}/${entry.path}'`)
    }
    if (!entry) {
      // observe node
      const dispose = mobx.observe(node, (change: IChange) => {
        this.processChange(change, this.entrySet.get(change.object)!)
      })

      // current node metadata
      const meta: any = Mosx.meta(node)
      if (node instanceof Mosx) {
        meta.type = node.constructor.name || (node.constructor as any).__proto__.name
      }
      // check if path is hidden
      const parentProps = parent && parent.meta && parent.meta.props || []
      const hiddenProp = !!parentProps.find((prop) => prop.key === path && (prop.hidden || false))
      // check if current or parent nodes are hidden
      const hidden = !!meta && meta.hidden || !!parent && (parent.hidden || hiddenProp)
      // collect node tags or parent node tags
      const tags: string[] = Array.from(Mosx.getTags(node) || parent && parent.tags || [])

      // store endtry
      entry = { id: this.lastId++, parent, path, dispose, meta, hidden, tags }
      this.entrySet.set(node, entry)

      // add default parent (root) to mosx object tagsTree
      if (node !== this.root && node instanceof Mosx && !Mosx.getParent(node)) {
        Mosx.setParent(node, this.root)
      }

      mobx.entries(node).forEach(([key, value]) => {
        this.observeRecursively(value, entry, key)
      })
    }
    return entry
  }

  private unobserveRecursively(node: any) {
    if (!this.isRecursivelyObservable(node)) { return }

    const entry = this.entrySet.get(node)
    if (!entry) { return }

    this.entrySet.delete(node)
    entry.dispose()

    if (node instanceof Mosx) {
      Mosx.destroy(node)
    }

    // unobserve children
    mobx.values(node).forEach(this.unobserveRecursively.bind(this))
    return entry
  }
}
