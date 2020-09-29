import * as notepack from "notepack.io"

import { MosxContext } from "../context"
import { IReversibleJsonPatch } from "../tracker"

export const decodeMap = (context: MosxContext) => {
  return {}
}

export const encode = (context: MosxContext, patch: IReversibleJsonPatch, pathItems: string[]): Buffer => {
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

export const decode = (context: MosxContext, buffer: Buffer): IReversibleJsonPatch => {
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
