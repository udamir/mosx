import { Mosx, mx, SchemaSerializer } from "../src/internal"
import { PatchPack } from "patchpack"

@mx.Object
class MapObj {
  @mx public items = new Map()
  @mx.private pitems = new Map()
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

const state = new MapObj()
Mosx.addTag(state, "1")
const tracker = Mosx.createTracker(state, { serializer: SchemaSerializer, privateMapValuePatch: true })

state.items.set("1", new PublicItem())
state.items.set("2", new PrivateItem("1"))
state.items.set("3", new PublicItem())
state.items.set("4", new PrivateItem("2"))
state.items.set("5", new PublicItem())
state.items.set("6", new PrivateItem("2"))
state.items.set("7", new PublicItem())
state.items.set("8", new PrivateItem("1"))
state.items.set("9", new PublicItem())

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

state.items.set("10", new PrivateItem("1"))
state.items.set("11", new PublicItem())
const i12 = new PrivateItem("2")
state.items.set("12", i12)
const i13 = new PublicItem()
state.items.set("13", i13)

state.items.delete("1")
state.items.delete("10")

i12.name = "12345"
i13.name = "65432"

state.items.set("14", new PrivateItem("1"))
state.items.set("15", new PublicItem())

state.items.set("15", new PrivateItem("1"))

state.pitems.set("1", new PublicItem())
state.pitems.set("2", new PrivateItem("1"))

state.pitems.set("3", new PublicItem())
const i4 = new PrivateItem("2")
state.pitems.set("4", i4)

i4.secret = "!"