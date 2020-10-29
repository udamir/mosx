import * as notepack from "notepack.io"

import { Serializer, ITreeNode, IReversibleJsonPatch } from "../../index"

export class MPackSerializer extends Serializer {

  public encode (patch: IReversibleJsonPatch, entry: ITreeNode): Buffer {

    const op = ["add", "replace", "remove"].indexOf(patch.op)
    const patchArr = [op, patch.path]

    if ("value" in patch) {
      patchArr.push(patch.value)
    }

    if ("oldValue" in patch) {
      patchArr.push(patch.oldValue)
    }

    return notepack.encode(patchArr)
  }

  public decode (buffer: Buffer): IReversibleJsonPatch {
    const patchArr = notepack.decode<any[]>(buffer).reverse()

    const patch: IReversibleJsonPatch = {
      op: ["add", "replace", "remove"][patchArr.pop()] as any,
      path: patchArr.pop(),
    }

    if (patchArr.length && patch.op !== "remove") {
      patch.value = patchArr.pop()
    }

    if (patchArr.length && patch.op !== "add") {
      patch.oldValue = patchArr.pop()
    }

    return patch
  }
}
