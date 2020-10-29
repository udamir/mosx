import { IReversibleJsonPatch, IMosxTracker } from "./tracker.h"

type Action = () => void
type Trigger = (id: string, change: IReversibleJsonPatch) => void

export class MosxTester<T = any> {
  public action: Action | null = null
  public disposers: { [id: string]: Action } = {}
  public triggers: Trigger[] = []
  public uTrigger: Trigger | null = null
  public uTriggerCount: number = Infinity
  public unhandled: any[] = []

  constructor(public tracker: IMosxTracker<T>) {}

  public addListener(id: string, tags: string | string[], reversible = true) {
    this.disposers[id] = this.tracker.onPatch((change) => {
      const trigger = this.uTrigger || this.triggers.pop()
      if (trigger && this.uTriggerCount-- > 0) {
        trigger(id, change)
      } else if (this.action && (this.uTriggerCount < 0 || !this.triggers.length)) {
        this.unhandled.push({ id, change })
      }
    }, { tags, reversible })
  }

  public onAction(action: Action) {
    this.triggers = []
    this.uTrigger = null
    this.action = action
    return this
  }

  public trigger(listener: Trigger) {
    this.triggers.push(listener)
    return this
  }

  public universalTrigger(count: any, listener: Trigger) {
    if (typeof count === "function") {
      listener = count
      count = undefined
    }
    this.uTriggerCount = count || Infinity
    this.uTrigger = listener
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
    if (this.uTriggerCount !== Infinity && this.uTriggerCount > 0) {
      this.unhandled.push({ count: this.uTriggerCount })
    }
    if (this.triggers.length > 0) {
      this.unhandled.push({ count: this.triggers.length })
    }
    final && final(this.unhandled)
    this.action = null
    this.uTriggerCount = Infinity
    this.uTrigger = null
    this.unhandled = []
  }
}
