import { PatchPack } from 'patchpack'

import { SchemaSerializer, IEncodedJsonPatch, mx, Mosx } from '../index'
import { MosxTester } from '../src/tester'

@mx.Object
class Public {
  @mx public prop: any
  @mx.private public pprop: any
  @mx.computed get comp() { return this.pprop }
  @mx.computed.private get pcomp() { return this.mobx }
  @mx.observable public mobx: any

  public name: string = ""

  constructor(params: any = {}) {
    const that = this as any
    Object.keys(params).forEach(key => {
      that[key] = params[key]
    })
  }
}

@mx.Object.private
class Private extends Public {
  @mx public ext: any
}

class State extends Public {
  @mx public prop1: any
  @mx.private public pprop1: any
}

const state = new State({ name: "state" })
Mosx.addTag(state, "123")

const c1 = (id: string, value: any): any => id === "client2" ? undefined : value
const c2 = (id: string, value: any): any => id === "client1" ? undefined : value

const stateTracker = Mosx.createTracker(state, { serializer: SchemaSerializer, reversible: true })
const tester = new MosxTester(stateTracker)

const decoder: any = {
  client1: new PatchPack(),
  client2: new PatchPack()
}

describe("Snapshot of state", () => {
  const s1 = Mosx.getSnapshot(state, ["1"])
  const s2 = Mosx.getSnapshot(state, ["123"])
  const view1encoded = stateTracker.snapshot({ tags: ["1"] }) as Buffer
  const view1 = decoder.client1.decodeState(view1encoded)
  test(`should be equal decoded and snapshot for client1`, () => {
    expect(s1).toMatchObject(view1)
  })

  const view2encoded = stateTracker.snapshot({ tags: ["123"] }) as Buffer
  const view2 = decoder.client2.decodeState(view2encoded)
  test(`should be equal decoded and snapshot for client2`, () => {
    expect(s2).toMatchObject(view2)
  })

  test(`should be equal schema`, () => {
    expect(decoder.client1.schema).toMatchObject(decoder.client2.schema)
  })
})

tester.addListener("client1", "1")
tester.addListener("client2", ["2", "123"])

const unhandledTest = (unhandled: any[]) => {
  test("should not be unhandled patches", () => {
    unhandled.length && console.log(unhandled)
    expect(unhandled.length).toBe(0)
  })
}

describe("Replace public property", () => {
  const value = "test value"
  tester
  .onAction(() => state.prop = value)
  .trigger(2, (id: string, change: IEncodedJsonPatch) => {
    const { encoded, ...patch } = change
    test(`${id} should get replace change for property`, () => {
      expect(patch).toMatchObject({ path: "/prop", op: "replace", value })
      expect(patch).toEqual(decoder[id].decodePatch(encoded))
    })
  }).run(unhandledTest)
})

describe("Replace public property with private object", () => {
  const oldValue = state.prop
  const obj = { prop: "test", pprop: "test2", ext: "ext" }
  const value = new Private({ ...obj, name: "prop" })
  Mosx.setParent(value, state)
  tester
  .onAction(() => state.prop = value)
  .trigger(2, (id: string, change: IEncodedJsonPatch) => {
    const { encoded, ...patch } = change
    test(`${id} should get replace change for property`, () => {
      expect(patch).toMatchObject({ path: "/prop", op: "replace", value: c2(id, obj), oldValue })
      expect(patch).toEqual(decoder[id].decodePatch(encoded))
    })
  }).run(unhandledTest)
})

describe("Replace private property", () => {
  const value = "test value"
  tester
  .onAction(() => state.pprop = value)
  .trigger((id: string, { encoded, ...patch }: IEncodedJsonPatch) => {
    test(`${id} should get replace change for computed property`, () => {
      expect(id).toBe("client1")
      expect(patch).toEqual({ path: "/comp", op: "replace", value })
      expect(patch).toEqual(decoder[id].decodePatch(encoded))
    })
  })
  .trigger((id: string, { encoded, ...patch }: IEncodedJsonPatch) => {
    test(`${id} should get replace change for computed property`, () => {
      expect(id).toBe("client2")
      expect(patch).toEqual({ path: "/comp", op: "replace", value })
      expect(patch).toEqual(decoder[id].decodePatch(encoded))
    })
  })
  .trigger((id: string, { encoded, ...change }: IEncodedJsonPatch) => {
    test(`${id} should get replace change for private property`, () => {
      expect(id).toBe("client2")
      expect(change).toEqual({ path: "/pprop", op: "replace", value })
      expect(change).toEqual(decoder[id].decodePatch(encoded))
    })
  }).run(unhandledTest)
})

describe("Set property to public array", () => {
  tester
  .onAction(() => state.prop1 = [])
  .trigger(2, (id: string, { encoded, ...change }: IEncodedJsonPatch) => {
    test(`${id} should get replace change for array property`, () => {
      expect(change).toEqual({ path: "/prop1", op: "replace", value: [] })
      expect(change).toEqual(decoder[id].decodePatch(encoded))
    })
  }).run(unhandledTest)
})

describe("Add to public array", () => {
  const value = "test value"
  tester
  .onAction(() => state.prop1.push(value))
  .trigger(2, (id: string, { encoded, ...change }: IEncodedJsonPatch) => {
    test(`${id} should get add change for array property`, () => {
      expect(change).toEqual({ path: "/prop1/0", op: "add", value })
      expect(change).toEqual(decoder[id].decodePatch(encoded))
    })
  }).run(unhandledTest)
})

describe("Update item in public array", () => {
  const oldValue = "test value"
  const value = "test value 2"
  tester
  .onAction(() => state.prop1[0] = value)
  .trigger(2, (id: string, { encoded, ...change }: IEncodedJsonPatch) => {
    test(`${id} should get remove change for array property`, () => {
      expect(change).toEqual({ path: "/prop1/0", op: "replace", value, oldValue })
      expect(change).toEqual(decoder[id].decodePatch(encoded))
    })
  }).run(unhandledTest)
})

describe("Remove from public array", () => {
  const oldValue = state.prop1[0]
  tester
  .onAction(() => state.prop1.pop())
  .trigger(2, (id: string, { encoded, ...change }: IEncodedJsonPatch) => {
    test(`${id} should get remove change for array property`, () => {
      expect(change).toEqual({ path: "/prop1/0", op: "remove", oldValue })
      expect(change).toEqual(decoder[id].decodePatch(encoded))
    })
  }).run(unhandledTest)
})

describe("Add private object to public array", () => {
  const obj = { prop: "test", pprop: "test2", ext: "ext" }
  const value = new Private({ ...obj, name: "prop1/0" })
  Mosx.setParent(value, state)
  tester
  .onAction(() => state.prop1.push(value))
  .trigger(2, (id: string, { encoded, ...change }: IEncodedJsonPatch) => {
    test(`${id} should get add change for array property`, () => {
      expect(change).toMatchObject({ path: "/prop1/0", op: "add", value: c2(id, obj) })
      expect(change).toEqual(decoder[id].decodePatch(encoded))
    })
  }).run(unhandledTest)
})

describe("Replace property in private object in public array", () => {
  const value = "test value"
  const oldValue = state.prop1[0].prop
  tester
  .onAction(() => state.prop1[0].prop = value)
  .trigger((id: string, { encoded, ...change }: IEncodedJsonPatch) => {
    test(`${id} should get replace change for private property`, () => {
      expect(id).toBe("client2")
      expect(change).toEqual({ path: "/prop1/0/prop", op: "replace", value, oldValue })
      expect(change).toEqual(decoder[id].decodePatch(encoded))
    })
  }).run(unhandledTest)
})

describe("Remove private object from public array", () => {
  const obj = { prop: "test value", pprop: "test2", ext: "ext" }
  tester
  .onAction(() => state.prop1.pop())
  .trigger(2, (id: string, { encoded, ...change }: IEncodedJsonPatch) => {
    test(`${id} should get remove change for array property`, () => {
      expect(change).toMatchObject({ path: "/prop1/0", op: "remove", oldValue: c2(id, obj) })
      expect(change).toEqual(decoder[id].decodePatch(encoded))
    })
  }).run(unhandledTest)
})

describe("Set private property to array", () => {
  tester
  .onAction(() => state.pprop1 = [])
  .trigger((id: string, { encoded, ...change }: IEncodedJsonPatch) => {
    test(`${id} should get replace change for array property`, () => {
      expect(id).toBe("client2")
      expect(change).toEqual({ path: "/pprop1", op: "replace", value: [] })
      expect(change).toEqual(decoder[id].decodePatch(encoded))
    })
  }).run(unhandledTest)
})

describe("Add to private array", () => {
  const value = "test value"
  tester
  .onAction(() => state.pprop1.push(value))
  .trigger((id: string, { encoded, ...change }: IEncodedJsonPatch) => {
    test(`${id} should get add change for array property`, () => {
      expect(id).toBe("client2")
      expect(change).toEqual({ path: "/pprop1/0", op: "add", value })
      expect(change).toEqual(decoder[id].decodePatch(encoded))
    })
  }).run(unhandledTest)
})

describe("Remove from private array", () => {
  const oldValue = state.pprop1[0]
  tester
  .onAction(() => state.pprop1.pop())
  .trigger((id: string, { encoded, ...change }: IEncodedJsonPatch) => {
    test(`${id} should get remove change for array property`, () => {
      expect(id).toBe("client2")
      expect(change).toEqual({ path: "/pprop1/0", op: "remove", oldValue })
      expect(change).toEqual(decoder[id].decodePatch(encoded))
    })
  }).run(unhandledTest)
})

describe("Set property to public map", () => {
  tester
  .onAction(() => state.prop1 = new Map())
  .trigger(2, (id: string, { encoded, ...change }: IEncodedJsonPatch) => {
    test(`${id} should get replace change for array property`, () => {
      expect(change).toEqual({ path: "/prop1", op: "replace", value: {}, oldValue: [] })
      expect(change).toEqual(decoder[id].decodePatch(encoded))
    })
  }).run(unhandledTest)
})

describe("Add to public map", () => {
  const key = "12345"
  const value = "test value"
  tester
  .onAction(() => state.prop1.set(key, value))
  .trigger(2, (id: string, { encoded, ...change }: IEncodedJsonPatch) => {
    test(`${id} should get add change for map property`, () => {
      expect(change).toEqual({ path: "/prop1/" + key, op: "add", value })
      expect(change).toEqual(decoder[id].decodePatch(encoded))
    })
  }).run(unhandledTest)
})

describe("Replace item in public map", () => {
  const key = "12345"
  const oldValue = state.prop1.get(key)
  const value = "test value 2"
  tester
  .onAction(() => state.prop1.set(key, value))
  .trigger(2, (id: string, { encoded, ...change }: IEncodedJsonPatch) => {
    test(`${id} should get replace change for map property`, () => {
      expect(change).toEqual({ path: "/prop1/" + key, op: "replace", value, oldValue })
      expect(change).toEqual(decoder[id].decodePatch(encoded))
    })
  }).run(unhandledTest)
})

describe("Add private object to public map", () => {
  const key = "private"
  const obj = { prop: "test", pprop: "test2", ext: "ext" }
  const value = new Private({...obj, name: "prop1/private" })
  Mosx.setParent(value, state)
  tester
  .onAction(() => state.prop1.set(key, value))
  .trigger(2, (id: string, { encoded, ...change }: IEncodedJsonPatch) => {
    test(`${id} should get add change for map property`, () => {
      expect(change).toMatchObject({ path: "/prop1/" + key, op: "add", value: c2(id, obj) })
      expect(change).toEqual(decoder[id].decodePatch(encoded))
    })
  }).run(unhandledTest)
})

describe("Set private property to map", () => {
  tester
  .onAction(() => state.pprop1 = new Map())
  .trigger((id: string, { encoded, ...change }: IEncodedJsonPatch) => {
    test(`${id} should get replace change for array property`, () => {
      expect(change).toEqual({ path: "/pprop1", op: "replace", value: {}, oldValue: [] })
      expect(change).toEqual(decoder[id].decodePatch(encoded))
    })
  }).run(unhandledTest)
})

describe("Add to private map", () => {
  const key = "12345"
  const value = "test value"
  tester
  .onAction(() => state.pprop1.set(key, value))
  .trigger((id: string, { encoded, ...change }: IEncodedJsonPatch) => {
    test(`${id} should get add change for map property`, () => {
      expect(change).toEqual({ path: "/pprop1/" + key, op: "add", value})
      expect(change).toEqual(decoder[id].decodePatch(encoded))
    })
  }).run(unhandledTest)
})

describe("Replace observable property to trigger computed property", () => {
  const value = "test value"
  tester
  .onAction(() => state.mobx = value)
  .trigger((id: string, { encoded, ...change }: IEncodedJsonPatch) => {
    test(`${id} should get replace change for computed property`, () => {
      expect(id).toBe("client2")
      expect(change).toEqual({ path: "/pcomp", op: "replace", value })
      expect(change).toEqual(decoder[id].decodePatch(encoded))
    })
  }).run(unhandledTest)
})

const view1 = Mosx.getSnapshot(state, "1")

describe("Snapshot of state for client1", () => {
  test(`should not have private/observable properties`, () => {
    expect(view1).toMatchObject({ comp: "test value", prop1: { 12345: "test value 2" }})
    expect(view1).not.toHaveProperty("pprop")
    expect(view1).not.toHaveProperty("pcomp")
    expect(view1).not.toHaveProperty("mobx")
  })
  test(`should have undefined value for private object`, () => {
    expect(view1.prop1.private).toBe(undefined)
  })
})

const view2 = Mosx.getSnapshot(state, "123")

describe("Snapshot of state for client2", () => {
  test(`should have private properties and not have observable properties`, () => {
    expect(view2).toMatchObject({ comp: "test value", prop1: { 12345: "test value 2" } })
    expect(view2).toHaveProperty("pprop")
    expect(view2).toHaveProperty("pcomp")
    expect(view2).not.toHaveProperty("mobx")
  })
  test(`should have value for private object`, () => {
    expect(view2.prop1.private).toMatchObject({ prop: "test", pprop: "test2", ext: "ext" })
  })
})

describe("Add tag of client1 to state", () => {
  tester
  .onAction(() => Mosx.addTag(state, "1"))
  .trigger((id: string, { encoded, ...change }: IEncodedJsonPatch) => {
    test(`${id} should get add change for private propery`, () => {
      expect(id).toBe("client1")
      expect(change).toMatchObject({ path: "/pprop", op: "add", value: view2.pprop })
      expect(change).toEqual(decoder[id].decodePatch(encoded))
    })
  })
  .trigger((id: string, { encoded, ...change }: IEncodedJsonPatch) => {
    test(`${id} should get add change for private computed property`, () => {
      expect(id).toBe("client1")
      expect(change).toMatchObject({ path: "/pcomp", op: "add", value: view2.pcomp })
      expect(change).toEqual(decoder[id].decodePatch(encoded))
    })
  })
  .trigger((id: string, { encoded, ...change }: IEncodedJsonPatch) => {
    test(`${id} should get add change for private property`, () => {
      expect(id).toBe("client1")
      expect(change).toMatchObject({ path: "/pprop1", op: "add", value: view2.pprop1 })
      expect(change).toEqual(decoder[id].decodePatch(encoded))
    })
  })
  .trigger((id: string, { encoded, ...change }: IEncodedJsonPatch) => {
    test(`${id} should get replace change for private object`, () => {
      expect(id).toBe("client1")
      expect(change).toMatchObject({ path: "/prop", op: "replace", value: view2.prop })
      expect(change).toEqual(decoder[id].decodePatch(encoded))
    })
  })
  .trigger((id: string, { encoded, ...change }: IEncodedJsonPatch) => {
    test(`${id} should get replace change for private object of public map propery`, () => {
      expect(id).toBe("client1")
      expect(change).toMatchObject({ path: "/prop1/private", op: "replace", value: view2.prop1.private })
      expect(change).toEqual(decoder[id].decodePatch(encoded))
    })
  }).run(unhandledTest)
})

describe("Remove tag of client1 to state", () => {
  tester
  .onAction(() => Mosx.deleteTag(state, "1"))
  .trigger((id: string, { encoded, ...change }: IEncodedJsonPatch) => {
    test(`${id} should get add change for private propery`, () => {
      expect(id).toBe("client1")
      expect(change).toMatchObject({ path: "/pprop", op: "remove", oldValue: view2.pprop })
      expect(change).toEqual(decoder[id].decodePatch(encoded))
    })
  })
  .trigger((id: string, { encoded, ...change }: IEncodedJsonPatch) => {
    test(`${id} should get add change for private computed property`, () => {
      expect(id).toBe("client1")
      expect(change).toMatchObject({ path: "/pcomp", op: "remove", oldValue: view2.pcomp })
      expect(change).toEqual(decoder[id].decodePatch(encoded))
    })
  })
  .trigger((id: string, { encoded, ...change }: IEncodedJsonPatch) => {
    test(`${id} should get add change for private property`, () => {
      expect(id).toBe("client1")
      expect(change).toMatchObject({ path: "/pprop1", op: "remove", oldValue: view2.pprop1 })
      expect(change).toEqual(decoder[id].decodePatch(encoded))
    })
  })
  .trigger((id: string, { encoded, ...change }: IEncodedJsonPatch) => {
    test(`${id} should get replace change for private object`, () => {
      expect(id).toBe("client1")
      expect(change).toMatchObject({ path: "/prop", op: "replace", oldValue: view2.prop })
      expect(change).toEqual(decoder[id].decodePatch(encoded))
    })
  })
  .trigger((id: string, { encoded, ...change }: IEncodedJsonPatch) => {
    test(`${id} should get replace change for private object of public map propery`, () => {
      expect(id).toBe("client1")
      expect(change).toMatchObject({ path: "/prop1/private", op: "replace", oldValue: view2.prop1.private })
      expect(change).toEqual(decoder[id].decodePatch(encoded))
    })
  })
  .run(unhandledTest)
})

// // TODO: add/remove tag for private object
const p: Private = state.prop1.get("private")

describe("Add tag of client1 to private object in map", () => {
  tester
  .onAction(() => Mosx.addTag(p, "1"))
  .trigger((id: string, { encoded, ...change }: IEncodedJsonPatch) => {
    test(`${id} should get replace change for private object of public map propery`, () => {
      expect(id).toBe("client1")
      expect(change).toMatchObject({ path: "/prop1/private", op: "replace", value: view2.prop1.private })
      expect(change).toEqual(decoder[id].decodePatch(encoded))
    })
  }).run(unhandledTest)
})

describe("Stop tracking change", () => {
  const value = "test"
  tester.disposers.client1()
  tester
  .onAction(() => state.prop = value)
  .trigger((id: string, { encoded, ...change }: IEncodedJsonPatch) => {
    test(`${id} should get replace change for property`, () => {
      expect(change).toMatchObject({ path: "/prop", op: "replace", value })
      expect(change).toEqual(decoder[id].decodePatch(encoded))
    })
  }).run(unhandledTest)
})
