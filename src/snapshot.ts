import { ObservableMap, ObservableSet } from "mobx"

import { PrimitiveType } from "./decorators"
import { Mosx } from "./mosx"

export interface ISnapshot {
  [key: string]: any
}

export interface ISnapshotParams {
  tags?: string | string[]
  objTags?: Set<string>
}

export const snapshot = (target: any, params: ISnapshotParams): any => {
  if (target instanceof ObservableMap) {
    return mapSnapshot(target, params)
  } else if (target instanceof ObservableSet) {
    return setSnapshot(target, params)
  } else if (Array.isArray(target)) {
    return arraySnapshot(target, params)
  } else if (target instanceof Mosx) {
    return mosxSnapshot(target, params)
  } else {
    return target
  }
}

export const compressedSnapshot = (target: any, params: ISnapshotParams): any => {
  return target
}

const mosxSnapshot = (target: any, params: ISnapshotParams): ISnapshot | undefined => {

  const { tags = [], objTags = Mosx.getTags(target) || new Set() } = params
  const tagsArr = !Array.isArray(tags) ? [tags] : tags

  // object props
  const meta = Mosx.meta(target)

  // check if object is visible for listner
  if (meta.hidden && !tagsArr.find((tag) => objTags.has(tag))) { return }

  // filtered visible props
  const props = meta.props.filter((prop) => !prop.hidden || tagsArr.find((tag) => objTags.has(tag)))

  // create snapshot object
  const result: ISnapshot = {}
  props.forEach(({ key }) => {
    result[key] = snapshot((target as any)[key], params)
  })

  return result
}

const mapSnapshot = (target: ObservableMap, params: ISnapshotParams): any => {
  const result: any = {}
  for (const [key, object] of target) {
    result[key] = snapshot(object, params)
  }
  return result
}

const arraySnapshot = (target: PrimitiveType[], params: ISnapshotParams): any[] => {
  return target.map((item) => snapshot(item, params))
}

const setSnapshot = (target: ObservableSet, params: ISnapshotParams): any => {
  const result: any = new Set()
  for (const [key, object] of target) {
    result.add(snapshot(object, params))
  }
  return result
}
