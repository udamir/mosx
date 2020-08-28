import { observable, action, computed, Lambda } from "mobx"

import { MosxTracker } from "./tracker"

export interface ISyncObjectTag {
  id: string,
  tag: string
}

export class MosxAdmin {
  @observable
  public parent: MosxAdmin | null = null
  public children: WeakSet<any> = new WeakSet<any>()

  @observable
  private $tags: Set<string> = new Set<string>()
  private $tracker: MosxTracker<any> | null = null

  public disposers: Lambda[] = []

  get tracker(): MosxTracker | null {
    return this.$tracker || this.parent && this.parent.tracker
  }

  set tracker(tracker: MosxTracker | null) {
    this.$tracker = tracker
  }

  constructor(public target: any, parentNode?: MosxAdmin) {
    this.setParent(parentNode || null)

    // observe tags change
    const tagsDispose = computed(() => this.tags).observe((change) => {
      if (this.tracker) {
        const { object: obj, ...rest } = change
        this.tracker.tagChange(target, rest)
      }
    })

    this.disposers.push(tagsDispose)
  }

  @action
  public addTag(tags: string | string[]) {
    if (!Array.isArray(tags)) {
      tags = [tags]
    }
    tags.forEach((tag) => this.$tags.add(tag))
    this.tracker && this.tracker.tagChanged()
  }

  @action
  public deleteTag(tag: string) {
    this.$tags.delete(tag)
    this.tracker && this.tracker.tagChanged()
  }

  @computed
  get tags(): Set<string> {
    return new Set([...this.$tags, ...(this.parent && this.parent.tags || [])])
  }

  public setParent(parentNode?: MosxAdmin | null) {
    if (parentNode && parentNode === this.parent) { return }

    // remove object from old parent node
    if (this.parent) {
      this.children.delete(this.target)
    }

    // add object to new parent node
    if (parentNode) {
      parentNode.children.add(this.target)
    }

    // save owner
    this.parent = parentNode || null
    this.tracker && this.tracker.tagChanged()
  }
}
