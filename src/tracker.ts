import * as mobx from "mobx"

import { snapshot } from "./snapshot"
import { Mosx, IMeta } from "./mosx"

export type JsonPatchOp = "replace" | "add" | "remove"

export interface IJsonPatch {
  op: JsonPatchOp
  path: string
  value?: any
}

export interface IReversibleJsonPatch extends IJsonPatch {
  oldValue?: any
}

export type MosxPatchListener<T> = (patch: IJsonPatch | IReversibleJsonPatch, obj: any, root: T) => void

export interface IMosxSnapshotParams {
  tags?: string | string[]
  spy?: boolean
}

export interface IMTrackerParams extends IMosxSnapshotParams {
  filter?: JsonPatchOp | JsonPatchOp[]
  reversible?: boolean
}

export interface IMosxTracker<T> {
  onPatch: (listner: MosxPatchListener<T>, params?: IMTrackerParams) => IDisposer
  snapshot(params?: IMosxSnapshotParams): { [key: string]: any }
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
  dispose: IDisposer
  path: string
  parent: IEntry | undefined
  meta: IMeta
  hidden: boolean
  tags: string[]
}

interface IListner<T> {
  listner: MosxPatchListener<T>
  filter: Set<JsonPatchOp>
  tags: string[]
  reversible: boolean
  spy?: boolean // TODO: add spy logic
}

export class MosxTracker<T = any> implements IMosxTracker<T> {
  private lastId: number = 0
  private listners: Map<string, IListner<T>> = new Map<string, IListner<T>>()
  private patchedObjects: Map<MosxPatchListener<T>, any[]> = new Map<MosxPatchListener<T>, any[]>()
  public entrySet = new WeakMap<any, IEntry>()
  public root: T

  constructor(object: T) {
    if (Mosx.getParent(object)) {
      throw Error("Can track only root object!")
    }
    this.root = object
    this.observeRecursively(this.root, undefined, "")
  }

  public onPatch(listner: MosxPatchListener<T>, params: IMTrackerParams = {}): IDisposer {
    let { tags = [], filter = [] } = params
    const { reversible = false, spy = false } = params

    filter = Array.isArray(filter) ? filter : [filter]
    tags = Array.isArray(tags) ? tags : [tags]

    const id = "" + this.lastId++
    this.listners.set(id, { listner, filter: new Set(filter), tags, reversible, spy })

    return () => { this.listners.delete(id) }
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

  public tagChange(object: any, change: ITagsChange) {
    const entry = this.entrySet.get(object)
    if (!entry) { return }

    entry.tags = Array.from(change.newValue)
    let path = "/" + this.buildPath(entry)

    // object props
    const props = entry.meta.props.filter((prop) => prop.hidden)

    if (!props.length && !entry.hidden) { return }

    for (const { listner, tags, reversible, filter } of this.listners.values()) {
      // check if listners already got this patch
      let patchedObjects = this.patchedObjects.get(listner)
      if (!patchedObjects) {
        patchedObjects = []
        this.patchedObjects.set(listner, patchedObjects)
      } else {
        let alreadyPatched = false
        for(const parent of patchedObjects) {
          alreadyPatched = object === parent || Mosx.isParent(object, parent)
          if (alreadyPatched) { break }
        }
        if (alreadyPatched) { continue }
      }

      // check if update needed
      const wasVisible = [...(change.oldValue || [])].find((tag) => tags.indexOf(tag) >= 0)
      const nowVisible = [...change.newValue].find((tag) => tags.indexOf(tag) >= 0)
      if (!!wasVisible === !!nowVisible) { continue }

      if (entry.hidden) {
        if (filter.size && !filter.has("replace")) { continue }
        // handle private objects
        const value = !nowVisible ? undefined : snapshot(object, { tags })
        const patch: IReversibleJsonPatch = { op: "replace", path, value }
        if (reversible) {
          patch.oldValue = snapshot(object, { tags, objTags: change.oldValue })
        }
        // save patched object
        patchedObjects.push(object)
        listner(patch, object, this.root)
      } else {
        path = path.slice(-1) !== "/" ? path + "/" : path

        const op = nowVisible ? "add" : "remove"
        if (filter.size && !filter.has(op)) { continue }

        // patch for each private property
        for (const prop of props) {
          const patch: IReversibleJsonPatch = { op, path: path + prop.key }
          const obj = (object as any)[prop.key]

          if (nowVisible) {
            patch.value = snapshot(obj, { tags })
          } else {
            patch.oldValue = snapshot(obj, { tags, objTags: change.oldValue })
          }

          // save patched object
          if (obj instanceof Mosx) {
            patchedObjects.push(obj)
          }
          listner(patch, obj, this.root)
        }
      }
    }
  }

  public computedChange(object: any, change: IChange) {
    const entry = this.entrySet.get(object)
    if (!entry) { return }
    this.processChange(change, entry)
  }

  private processChange(change: IChange, parent: IEntry) {
    let entry: IEntry
    let path = "/" + this.buildPath(parent)
    path = path !== "/" ? path + "/" : "/"

    switch (change.type) {
      case "add":

        entry = this.observeRecursively(change.newValue, parent, change.name) || parent

        for (const { listner, tags, filter } of this.listners.values()) {
          if (filter.size && !filter.has("add")) { continue }
          // check if object is visible for listner
          if (entry.hidden && ![...tags].find((tag) => entry.tags.indexOf(tag) >= 0)) { continue }

          const value = snapshot(change.newValue, { tags })
          const patch: IJsonPatch = { op: "add", path: path + change.name, value }
          listner(patch, change.object, this.root)
        }

        break

      case "update":

        const key = (change as any).name || "" + (change as any).index
        const props = parent.meta && parent.meta.props || []

        this.unobserveRecursively(change.oldValue)
        entry = this.observeRecursively(change.newValue, parent, key) || parent

        // ignore observable properies
        if (parent.meta && !props.find((prop) => prop.key === key)) { return }
        // if (!props.find((prop) => prop.key === key)) { return }
        const hidden = parent.hidden || !!props.find((prop) => prop.key === key && !!prop.hidden)

        for (const { listner, tags, reversible, filter } of this.listners.values()) {
          if (filter.size && !filter.has("replace")) { continue }
          // check if object and field are visible for listner
          if (hidden && ![...tags].find((tag) => entry.tags.indexOf(tag) >= 0)) { continue }

          const value = snapshot(change.newValue, { tags })
          const patch: IReversibleJsonPatch = { op: "replace", path: path + key, value }
          if (reversible) {
            patch.oldValue = snapshot(change.oldValue, { tags })
          }

          listner(patch, change.object, this.root)
        }

        break

      case "delete": case "remove":

        entry = this.unobserveRecursively(change.oldValue) || parent

        for (const { listner, tags, reversible, filter } of this.listners.values()) {
          if (filter.size && !filter.has("remove")) { continue }
          // check if object is visible for listner
          if (entry.hidden && ![...tags].find((tag) => entry.tags.indexOf(tag) >= 0)) { continue }

          const patch: IReversibleJsonPatch = { op: "remove", path: path + change.name }
          if (reversible) {
            patch.oldValue = snapshot(change.oldValue, { tags })
          }

          listner(patch, change.object, this.root)
        }

        break

      case "splice":

        change.removed.forEach((item: any) => {
          entry = this.unobserveRecursively(item) || parent

          for (const { listner, tags, reversible, filter } of this.listners.values()) {
            if (filter.size && !filter.has("remove")) { continue }
            if (parent.hidden && ![...tags].find((tag) => entry.tags.indexOf(tag) >= 0)) { continue }

            const patch: IReversibleJsonPatch = { op: "remove", path: path + change.index }
            // if (reversible && (!entry.hidden || [...tags].find((tag) => entry.tags.indexOf(tag) >= 0))) {
            patch.oldValue = snapshot(item, { tags })
            // }

            listner(patch, change.object, this.root)
          }
        })

        change.added.forEach((item: any, idx: number) => {

          entry = this.observeRecursively(item, parent, "" + (change.index + idx)) || parent
          for (const { listner, tags, filter } of this.listners.values()) {

            if (filter.size && !filter.has("add")) { continue }
            if (parent.hidden && ![...tags].find((tag) => entry.tags.indexOf(tag) >= 0)) { continue }

            const value = snapshot(item, { tags })
            const patch: IJsonPatch = { op: "add", path: path + change.index, value }

            listner(patch, change.object, this.root)
          }
        })

        // update paths
        for (let i = change.index + change.addedCount; i < change.object.length; i++) {
          if (this.isRecursivelyObservable(change.object[i])) {
            const itemEntry = this.entrySet.get(change.object[i])
            if (itemEntry) { itemEntry.path = "" + i }
          }
        }

        break
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

    const entity = this.entrySet.get(node)
    if (entity) {
      if (entity.parent === parent && entity.path === path) { return entity }
      throw new Error(`The same observable object cannot appear twice in the same tree,` +
                      ` trying to assign it to '${this.buildPath(parent)}/${path}',` +
                      ` but it already exists at '${this.buildPath(entity.parent)}/${entity.path}'`)
    } else {
      // observe node
      const dispose = mobx.observe(node, (change: IChange) => {
        this.processChange(change, this.entrySet.get(change.object)!)
      })

      // current node metadata
      const meta = Mosx.meta(node)
      // check if path is hidden
      const parentProps = parent && parent.meta && parent.meta.props || []
      const hiddenProp = !!parentProps.find((prop) => prop.key === path && (prop.hidden || false))
      // check if current or parent nodes are hidden
      const hidden = !!meta && meta.hidden || !!parent && (parent.hidden || hiddenProp)
      // collect node tags or parent node tags
      const tags: string[] = Array.from(Mosx.getTags(node) || parent && parent.tags || [])

      // store endtry
      const entry: IEntry = { parent, path, dispose, meta, hidden, tags }
      this.entrySet.set(node, entry)

      // add default parent (root) to mosx object tagsTree
      if (node !== this.root && node instanceof Mosx && !Mosx.getParent(node)) {
        Mosx.setParent(node, this.root)
      }

      mobx.entries(node).forEach(([key, value]) => {
        this.observeRecursively(value, entry, key)
      })
      return entry
    }
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
