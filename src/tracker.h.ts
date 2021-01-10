import * as mobx from "mobx"

import { Serializer, IMeta } from "./internal"

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
  tags?: string | string[]
  spy?: boolean
}

export interface IMosxPatchParams extends IMosxSnapshotParams {
  filter?: JsonPatchOp | JsonPatchOp[]
  reversible?: boolean
}

export interface IMosxTrackerParams {
  serializer?: any
  reversible?: boolean
  privateMapValuePatch?: boolean
}

export interface IMosxTracker<T> {
  onPatch: (listener: MosxPatchListener<T>, params?: IMosxPatchParams) => IDisposer
  snapshot(params?: IMosxSnapshotParams): { [key: string]: any } | Buffer
  serializer?: Serializer
  dispose(): void
}

export interface ITagsChange {
  type: string
  newValue: Set<string>
  oldValue?: Set<string>
}

export type IDisposer = () => void

export type IChange = mobx.IObjectDidChange |
                      mobx.IArrayChange | mobx.IArraySplice | mobx.IMapDidChange | mobx.IValueDidChange<any>
// TODO: | mobx.ISetDidChange

export interface ITreeNode {
  id: number
  path: string
  parent: ITreeNode | undefined
  meta: IMeta
  hidden: boolean
  tags: Set<string> | null
  dispose: IDisposer
}

export interface IListener<T> {
  handler: MosxPatchListener<T>
  filter: Set<JsonPatchOp>
  tags: string[]
  reversible: boolean
  spy?: boolean // TODO: add spy logic for monitoring
}
