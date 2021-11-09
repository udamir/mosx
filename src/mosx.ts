import { computed } from "mobx"

import { MosxTracker, IMosxTracker, IMosxTrackerParams } from "./internal"
import { DefinitionType } from "./decorators"
import { snapshot } from "./snapshot"
import { MosxAdmin } from "./admin"

const mosx = Symbol("mosx")

export interface IMeta {
  type?: string
  props?: IMetaProperty[]
  hidden?: boolean
}

export interface IMetaProperty {
  key: string
  type: DefinitionType
  hidden?: boolean
  getter?: boolean
}

export abstract class Mosx {
  public static $mx: IMeta
  private [mosx]: MosxAdmin

  constructor(owner?: Mosx, tags: string | string[] = []) {
    Mosx.inject(this, owner, tags)
  }

  public static [Symbol.hasInstance](instance: any) {
    return instance && instance[mosx] && instance[mosx] instanceof MosxAdmin
  }

  public static inject(target: any, owner?: any, tags: string | string[] = []): Mosx {
    if ((target instanceof Mosx)) {
      Mosx.setParent(owner)
      Mosx.addTag(target, tags)
      return target
    }

    if (owner && !(owner instanceof Mosx)) {
      throw Error("Owner must be Mosx object!")
    }

    // create mosxTreeNode for object
    const tree = new MosxAdmin(target, owner && owner[mosx])
    Object.defineProperty(target, mosx, { enumerable: false, writable: false, value: tree })

    // make all mx computed observable
    const classParams = Mosx.meta(target)
    classParams.props!.filter(({ getter }) => getter).forEach(({ key }) => {
      const propDispose = computed(() => target[key]).observe((change) => {
        if (tree.tracker) {
          tree.tracker.computedChange(target, { ...change, name: key, object: target })
        }
      })
      tree.disposers.push(propDispose)
    })
    Mosx.addTag(target, tags)
    return target as Mosx
  }

  public static new(Class: new (...args: any[]) => any, parent?: any, tags: any = []) {
    return (...args: any[]) => {
      const obj = new Class(...args)
      parent && Mosx.setParent(obj, parent)
      Mosx.addTag(obj, tags)
      return obj
    }
  }

  public static isParent(target: any, parent: any): boolean {
    if (target instanceof Mosx && parent instanceof Mosx) {
      const targetParent = target[mosx].parent
      return targetParent === parent[mosx] || (targetParent && Mosx.isParent(targetParent.target, parent)) || false
    } else {
      return false
    }
  }

  public static getParent(target: any): Mosx | null {
    const parent = target instanceof Mosx && target[mosx].parent
    return parent && parent.target || null
  }

  public static setParent(target: any, owner?: any) {
    if (target instanceof Mosx) {
      target[mosx].setParent(owner && owner[mosx])
    } else {
      Mosx.inject(target, owner)
    }
  }

  public static getSnapshot(target: any, tags?: string | string[], spy = false) {
    tags = Array.isArray(tags) ? tags : tags && [tags] || undefined
    return snapshot(target, { tags, spy })
  }

  public static createTracker<T>(target: T, params?: IMosxTrackerParams): IMosxTracker<T> {
    if (!(target instanceof Mosx)) {
      throw Error("Tracker can be created only for Mosx object!")
    }
    if (Mosx.getParent(target)) {
      throw Error("Tracker can be created only for root object!")
    }
    const tracker = target[mosx].tracker || new MosxTracker(target, params)
    target[mosx].tracker = tracker
    return tracker
  }

  public static getTracker(target: any): MosxTracker | null {
    return target instanceof Mosx ? target[mosx].tracker : null
  }

  public static getTags(target: any): Set<string> | null {
    return target instanceof Mosx ? target[mosx].tags : null
  }

  public static addTag(target: any, tags: string | string[]) {
    if (target instanceof Mosx) {
      target[mosx].addTag(tags)
    } else {
      Mosx.inject(target, undefined, tags)
    }
  }

  public static deleteTag(target: any, id: string) {
    if (!(target instanceof Mosx)) {
      throw Error("Tags can be deleted only from Mosx object!")
    }
    target[mosx].deleteTag(id)
  }

  public static meta(target: any): IMeta {
    return (target.constructor as typeof Mosx).$mx
  }

  public static destroy(target: any) {
    if (!(target instanceof Mosx)) {
      throw Error("TargetTags can be deleted only from Mosx object!")
    }
    const { parent } = target[mosx]
    if (parent) {
      parent.children.delete(target)
      target[mosx].disposers.forEach((dispose) => dispose())
    }
  }
}
