import { IReversibleJsonPatch, mx, Mosx } from '../index'
import { SchemaSerializer } from '../src/serializer/schema'
import { PatchPack, SchemaNode, SchemaType } from 'patchpack'
import { MosxTester } from '../src/tester'
import { IEncodedJsonPatch } from '../src/tracker.h'

@mx.Object
class State {
  @mx public clients: Client[] = []
  @mx public objects = new Map<string, BaseObject>()

  public addClient(name: string, tags: string[] = []) {
    // const client = Mosx.new(Client, this, tags)(this, name)
    const client = new Client(this, name)
    Mosx.addTag(client, tags)
    this.clients.push(client)
    return client
  }
}

@mx.Object
class Client {
  @mx public name: string

  constructor(public state: State, name: string) {
    this.name = name
  }

  public addObject(data?: any) {
    const obj = Mosx.new(DataObject, this)(data)
    this.state.objects.set(obj.id, obj)
    return obj
  }

  public addCard(side: string, value: string, suit: number) {
    const obj = Mosx.new(Card, this)(side, value, suit)
    this.state.objects.set(obj.id, obj)
  }
}

@mx.Object
class BaseObject {
  @mx public id: string
  @mx public type: string
  @mx public items = []

  constructor () {
    this.type = this.constructor.name || "BaseObject"
    const count = Array.from(testState.objects.values()).filter(({ type }) => type === this.type).length
    this.id = this.type + count
  }
}

class DataObject extends BaseObject {
  @mx.private public data: any = "hidden value"

  constructor(data?: any) {
    super()
    this.data = data
  }
}

@mx.Object
class CardFace {
  @mx public value: string
  @mx public suit: number

  constructor(value: string, suit: number) {
    this.value = value
    this.suit = suit
  }
}

class Card extends BaseObject {
  @mx public side: string
  @mx.private public face: CardFace
  @mx.computed
  get cardFace(): CardFace | null {
    return this.side === "face" && this.face || null
  }

  constructor(side: string, value: string, suit: number) {
    super()
    this.face = Mosx.new(CardFace, this)(value, suit)
    this.side = side
  }
}

const testState = new State()
const stateTracker = Mosx.createTracker(testState, { serializer: SchemaSerializer, reversible: true })
const tester = new MosxTester(stateTracker)

const serializer = stateTracker.serializer as SchemaSerializer

const unhandledTest = (unhandled: any[]) => {
  test("should not be unhandled patches", () => {
    unhandled.length && console.log(unhandled)
    expect(unhandled.length).toBe(0)
  })
}

const c1 = testState.addClient("client1", ["1"])
const c2 = testState.addClient("client2", ["2", "123"])

tester.addListener("client1", "1")
tester.addListener("client2", ["2", "123"])

const view1 = Mosx.getSnapshot(testState, "1")
const view2 = Mosx.getSnapshot(testState, ["2", "123"])

const types: SchemaType[] = [
  [ "Schema", "types", "nodes" ],
  [ "State", "clients", "objects" ],
  [ "Client", "name" ],
  [ "BaseObject", "id", "type", "items" ],
  [ "DataObject", "id", "type", "items", "data" ],
  [ "CardFace", "value", "suit" ],
  [ "Card", "id", "type", "items", "side", "face", "cardFace" ],
]

const nodes: SchemaNode[] = [
  [ 0,  1, -1, -1 ],
  [ 1, -1,  0,  0 ],
  [ 2, -2,  0,  1 ],
  [ 3,  2,  1,  0 ],
  [ 4,  2,  1,  1 ],
]

const schemaMap = { types, nodes }
const decoder: any = {
  client1: new PatchPack(view1._),
  client2: new PatchPack(view2._)
}

describe("Snapshot of state for client1", () => {
  test(`should not have private/observable properties`, () => {
    expect(view1).toHaveProperty("clients", [ { name: "client1" }, { name: "client2" } ])
    expect(view1).toHaveProperty("objects", {})
    expect(view1).toHaveProperty("_", schemaMap)
  })
})

const schemaAddNodeKey = (id: string, change: IEncodedJsonPatch, value: any) => {
  const patch = { path: `/nodes/2/${nodes[2].length}`, op: "add", value }
  id === "client2" && nodes[2].push(value)

  const { encoded, ...rest } = change
  const decoded = decoder[id].decodePatch(encoded!)

  expect(rest).toMatchObject(patch)
  expect(rest).toMatchObject(decoded)
}

const schemaAddNode = (id: string, change: IEncodedJsonPatch, value: any) => {
  const patch = { path: `/nodes/${nodes.length}`, op: "add", value }
  id === "client2" && nodes.push(value)

  const { encoded, ...rest } = change
  const decoded = decoder[id].decodePatch(encoded!)

  expect(rest).toMatchObject(patch)
  expect(rest).toMatchObject(decoded)
}

describe("Add DataObject for client1", () => {
  const data = "test value"
  tester
  .onAction(() => c1.addObject(data))
  .trigger(2, (id: string, change: IEncodedJsonPatch) => {
    test(`${id} should get add change for schemaMap nodes`, () => {
      schemaAddNode(id, change, [5, 4, 2, "DataObject0"])
    })
  })
  .trigger(2, (id: string, change: IEncodedJsonPatch) => {
    test(`${id} should get add change for schemaMap nodes`, () => {
      schemaAddNode(id, change, [6, -1, 5, 2])
    })
  })
  .trigger((id: string, change: IEncodedJsonPatch) => {
    test(`${id} should get add change for DataObject with data property`, () => {
      expect(id).toBe("client1")
      const patch = { path: "/objects/DataObject0", op: "add", value: { data } }
      expect(change).toMatchObject(patch)
    })
  })
  .trigger((id: string, change: IEncodedJsonPatch) => {
    test(`${id} should get add change for DataObject without data property`, () => {
      expect(id).toBe("client2")
      const patch = { path: "/objects/DataObject0", op: "add", value: {} }
      expect(change).toMatchObject(patch)
      expect(change).not.toHaveProperty("data")
    })
  }).run(unhandledTest)
})

const obj0 = testState.objects.get("DataObject0") as DataObject

describe("Change parent public property", () => {
  tester
  .onAction(() => Mosx.setParent(obj0, c2))
  .trigger((id: string, change: IEncodedJsonPatch) => {
    test(`${id} should get replace change for private object`, () => {
      expect(id).toBe("client1")
      const patch = { path: "/objects/DataObject0/data", op: "remove", oldValue: obj0.data }

      const { encoded, ...rest } = change
      const decoded = decoder[id].decodePatch(encoded!)
      expect(rest).toMatchObject(patch)
      expect(rest).toMatchObject(decoded)
    })
  })
  .trigger((id: string, change: IEncodedJsonPatch) => {
    test(`${id} should get replace change for private object of public map propery`, () => {
      expect(id).toBe("client2")
      const patch = { path: "/objects/DataObject0/data", op: "add", value: obj0.data }
      const { encoded, ...rest } = change
      const decoded = decoder[id].decodePatch(encoded!)
      expect(rest).toMatchObject(patch)
      expect(rest).toMatchObject(decoded)
    })
  }).run(unhandledTest)
})

describe("Add CardObject for client1", () => {
  const face = { suit: 1, value: "A" }
  tester
  .onAction(() => c1.addCard("back", face.value, face.suit))
  .trigger(2, (id: string, change: IEncodedJsonPatch) => {
    test(`${id} should get add change for schemaMap nodes`, () => {
      schemaAddNode(id, change, [7, 6, 2, "Card0"])
    })
  })
  .trigger(2, (id: string, change: IEncodedJsonPatch) => {
    test(`${id} should get add change for schemaMap nodes`, () => {
      schemaAddNode(id, change, [8, -1, 7, 2])
    })
  })
  .trigger(2, (id: string, change: IEncodedJsonPatch) => {
    test(`${id} should get add change for schemaMap nodes`, () => {
      schemaAddNode(id, change, [9, 5, 7, 4])
    })
  })
  .trigger((id: string, change: IReversibleJsonPatch) => {
    test(`${id} should get add change for Card with face property`, () => {
      expect(id).toBe("client1")
      expect(change).toMatchObject({ path: "/objects/Card0", op: "add", value: { face, cardFace: null } })
    })
  })
  .trigger((id: string, change: IReversibleJsonPatch) => {
    test(`${id} should get add change for Card without face property`, () => {
      expect(id).toBe("client2")
      expect(change).toMatchObject({ path: "/objects/Card0", op: "add", value: { cardFace: null, side: "back" } })
      expect(change).not.toHaveProperty("face")
    })
  }).run(unhandledTest)
})

const card0 = testState.objects.get("Card0") as Card

describe("Change parent for ard object", () => {
  tester
  .onAction(() => Mosx.setParent(card0, c2))
  .trigger((id: string, change: IEncodedJsonPatch) => {
    test(`${id} should get replace change for private object`, () => {
      expect(id).toBe("client1")
      const patch = { path: "/objects/Card0/face", op: "remove", oldValue: card0.face }

      const { encoded, ...rest } = change
      const decoded = decoder[id].decodePatch(encoded!)
      expect(rest).toMatchObject(patch)
      expect(rest).toMatchObject(decoded)
    })
  })
  .trigger((id: string, change: IEncodedJsonPatch) => {
    test(`${id} should get replace change for private object of public map propery`, () => {
      expect(id).toBe("client2")
      const patch = { path: "/objects/Card0/face", op: "add", value: card0.face }

      const { encoded, ...rest } = change
      const decoded = decoder[id].decodePatch(encoded!)
      expect(rest).toMatchObject(patch)
      expect(rest).toMatchObject(decoded)
    })
  }).run(unhandledTest)
})

describe("Compare serializer schema with client decoder", () => {
  test(`should be equal all schemas`, () => {
    expect(decoder.client1.schema).toEqual(decoder.client2.schema)
    expect(decoder.client2.schema).toEqual(serializer.patchPack.schema)
  })
})
