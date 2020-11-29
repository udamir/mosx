import { Mosx, mx, SchemaSerializer } from "../src/internal"
import { PatchPack } from "patchpack"

@mx.Object
class ArrayObj {
  @mx public items: PublicItem[] = []
  @mx.private pitems: PublicItem[] = []
}

@mx.Object
class PublicItem {
  @mx public name: string
  @mx.private public secret: string
  constructor () {
    this.name = Math.random().toString(36).slice(3)
    this.secret = ""
  }
}

@mx.Object.private
class PrivateItem extends PublicItem {
  constructor (tag: string) {
    super ()
    Mosx.inject(this, undefined, tag)
  }
}

const state = new ArrayObj()
Mosx.addTag(state, "1")
const tracker = Mosx.createTracker(state, { serializer: SchemaSerializer, privateMapValuePatch: true })

state.items.push(new PublicItem())
state.items.push(new PrivateItem("1"))
state.items.push(new PublicItem())
state.items.push(new PrivateItem("2"))
state.items.push(new PublicItem())
state.items.push(new PrivateItem("2"))
state.items.push(new PublicItem())
state.items.push(new PrivateItem("1"))
state.items.push(new PublicItem())

const s1 = tracker.snapshot({ tags: "1"})
const s2 = tracker.snapshot({ tags: "2"})

const decoder1 = new PatchPack()
const decoder2 = new PatchPack()

console.log(decoder1.decodeState(s1 as Buffer))
console.log(decoder2.decodeState(s2 as Buffer))

tracker.onPatch((patch) => {
  const { encoded, ...rest } = patch
  console.log("----- Client 1 -----")
  console.log(rest)
  if (encoded) {
    console.log(decoder1.decodePatch(encoded))
  }
}, { tags: ["1"]})

tracker.onPatch((patch) => {
  const { encoded, ...rest } = patch
  console.log("----- Client 2 -----")
  console.log(rest)
  if (encoded) {
    console.log(decoder2.decodePatch(encoded))
  }
}, { tags: ["2"]})

state.items.push(new PrivateItem("1"))
state.items.push(new PublicItem())
const i12 = new PrivateItem("2")
state.items.push(i12)
const i13 = new PublicItem()
state.items.push(i13)

state.items.splice(0, 1)
state.items.splice(10, 1)

i12.name = "12345"
i13.name = "65432"

state.items.push(new PrivateItem("1"))
state.items.push(new PublicItem())

state.items.push(new PrivateItem("1"))

state.pitems.push(new PublicItem())
state.pitems.push(new PrivateItem("1"))

state.pitems.push(new PublicItem())
state.pitems.push(i12)

i12.secret = "!"