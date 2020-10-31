import { ITreeNode, IReversibleJsonPatch, MosxTracker, IListener, IChange } from "../internal"

export abstract class Serializer<T = any> {
  public nodes: WeakMap<any, ITreeNode>
  public listeneres: Set<IListener<T>> = new Set<IListener<T>>()
  public root: T

  constructor (tracker: MosxTracker) {
    this.nodes = tracker.nodes
    this.listeneres = tracker.listeners
    this.root = tracker.root

    this.onCreate()
  }

  public onCreate(): void { /** */ }
  public beforeChange(change: IChange, parent: ITreeNode) { /** */ }
  public afterChange(change: IChange, parent: ITreeNode) { /** */ }
  public onCreateNode(entry: ITreeNode, target: any) { /** */ }
  public onDeleteNode(entry: ITreeNode) { /** */ }

  public abstract encode(patch: IReversibleJsonPatch, target: any): Buffer
  public abstract decode(buffer: Buffer): IReversibleJsonPatch
}
