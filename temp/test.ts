import { mx, Mosx } from '../index'
import { SchemaSerializer } from '../src/serializer/schema'
import { PatchPack } from 'patchpack'

@mx.Object
class State {
  @mx public arr: any[] = []
  @mx public clients: Client[] = []
  @mx public objects = new Map<string, BaseObject>()
  @mx public map = new Map<string, number>()

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
  @mx public x: number
  @mx public items = []

  constructor () {
    this.type = this.constructor.name || "BaseObject"
    const count = Array.from(testState.objects.values()).filter(({ type }) => type === this.type).length
    this.id = this.type + count
    this.x = 100
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
const c1 = testState.addClient("client1", ["1"])
testState.arr.push("asdad")
const stateTracker = Mosx.createTracker(testState, { serializer: SchemaSerializer })

// testState.map.set("asdad", 1)
const s1 = stateTracker.snapshot({ tags: ["1"] })

// const c1 = state.addClient("client1", ["1"])
const decoder1 = new PatchPack()

const state1 = decoder1.decodeState(s1 as Buffer)

console.log(state1)

stateTracker.onPatch((patch) => {
  const { encoded, ...rest } = patch
  console.log("Client 1", rest)
  if (encoded) {
    const decodedPatch = decoder1.decodePatch(encoded)
    console.log("Client 1", decodedPatch)
    console.log("Client 1, encoded size:", PatchPack.encode(rest).length, encoded.length)
  }
}, { tags: ["1"]})

c1.addObject("asdasd")

const decoder2 = new PatchPack()
const s2 = stateTracker.snapshot({ tags: ["2", "123"]})
const state2 = decoder2.decodeState(s2 as Buffer)

console.log(state2)

const c2 = testState.addClient("client2", ["2", "123"])
stateTracker.onPatch((patch) => {
  const { encoded, ...rest } = patch
  console.log("Client 2", rest)
  if (encoded) {
    const decodedPatch = decoder2.decodePatch(encoded)
    console.log("Client 2", decodedPatch)
    console.log("Client 2, encoded size:", PatchPack.encode(rest).length, encoded.length)
  }
}, { tags: ["2", "123"]})

c1.addCard("back", "A", 1)


const obj0 = testState.objects.get("DataObject0") as DataObject
obj0.x = 55
Mosx.setParent(obj0, c2)

testState.objects.delete("Card0")