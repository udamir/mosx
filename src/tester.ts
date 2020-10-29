import { IReversibleJsonPatch, IMosxTracker } from "./tracker.h"

type Action = () => void
type Trigger = (id: string, change: IReversibleJsonPatch) => void

export class MosxTester<T = any> {
  public action: Action | null = null
  public disposers: { [id: string]: Action } = {}
  public triggers: Trigger[] = []
  public unhandled: any[] = []

  constructor(public tracker: IMosxTracker<T>) {}

  public addListener(id: string, tags: string | string[], reversible = true) {
    this.disposers[id] = this.tracker.onPatch((change) => {
      const trigger = this.triggers.pop()
      if (trigger) {
        trigger(id, change)
      } else if (this.action && !this.triggers.length) {
        this.unhandled.push({ id, change })
      }
    }, { tags, reversible })
  }

  public onAction(action: Action) {
    this.triggers = []
    this.action = action
    return this
  }

  public trigger(count: any, listener?: Trigger) {
    if (typeof count === "function") {
      listener = count
      count = 1
    }
    while (count-- && listener) {
      this.triggers.push(listener)
    }
    return this
  }

  public dispose(id: string) {
    if (this.disposers[id]) {
      this.disposers[id]()
    }
  }

  public run(final?: (unhandled: any[]) => void) {
    this.triggers = this.triggers.reverse()
    if (this.action) {
      this.action()
    } else {
      console.log("action not defined!")
    }
    if (this.triggers.length > 0) {
      this.unhandled.push({ count: this.triggers.length })
    }
    final && final(this.unhandled)
    this.action = null
    this.unhandled = []
  }
}
