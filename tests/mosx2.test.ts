import { IReversibleJsonPatch, mx, Mosx } from '../index'
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
const stateTracker = Mosx.createTracker(testState)
const tester = new MosxTester(stateTracker)

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


describe("Add DataObject for client1", () => {
  const data = "test value"
  tester
  .onAction(() => c1.addObject(data))
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
      expect(change).toMatchObject(patch)
    })
  })
  .trigger((id: string, change: IReversibleJsonPatch) => {
    test(`${id} should get replace change for private object of public map propery`, () => {
      expect(id).toBe("client2")
      expect(change).toMatchObject({ path: "/objects/DataObject0/data", op: "add", value: obj0.data })
    })
  }).run(unhandledTest)
})

describe("Add CardObject for client1", () => {
  const face = { suit: 1, value: "A" }
  tester
  .onAction(() => c1.addCard("back", face.value, face.suit))
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
  .trigger((id: string, change: IReversibleJsonPatch) => {
    test(`${id} should get replace change for private object`, () => {
      expect(id).toBe("client1")
      expect(change).toMatchObject({ path: "/objects/Card0/face", op: "remove", oldValue: card0.face })
    })
  })
  .trigger((id: string, change: IReversibleJsonPatch) => {
    test(`${id} should get replace change for private object of public map propery`, () => {
      expect(id).toBe("client2")
      expect(change).toMatchObject({ path: "/objects/Card0/face", op: "add", value: card0.face })
    })
  }).run(unhandledTest)
})
