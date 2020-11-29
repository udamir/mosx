import { PatchPack } from "patchpack"

import { ITreeNode, IReversibleJsonPatch } from "../internal"
import { Serializer } from "."
import { values } from "mobx"

export class MPackSerializer extends Serializer {

  public encodeSnapshot(value: any): Buffer {
    return PatchPack.encode(values)
  }

  public decodeSnapshot(buffer: Buffer): any {
    return PatchPack.decode(buffer)
  }

  public encodePatch (patch: IReversibleJsonPatch, entry: ITreeNode): Buffer {

    const op = ["add", "replace", "remove"].indexOf(patch.op)
    const patchArr = [op, patch.path]

    if ("value" in patch) {
      patchArr.push(patch.value)
    }

    if ("oldValue" in patch) {
      patchArr.push(patch.oldValue)
    }

    return PatchPack.encode(patchArr)
  }

  public decodePatch (buffer: Buffer): IReversibleJsonPatch {
    const patchArr = PatchPack.decode(buffer).reverse()

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
