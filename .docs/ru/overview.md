# Обзор

## Объект Mosx

Объект Mosx можно создать двумя способами:
- через декоратор ```@mx.Object```
- наследуя класс Mosx

```ts
// wrap with class decorator
@mx.Object 
class State {

  // property decorator
  @mx clients = new Map()
  // ...
}

// extending Mosx class 
class Item extends Mosx {

  @mx name = "abc"
  // ...
}

// inheritance is also supported
class Child extends Item {
  // ...
}
```

::: tip
Instanses of State, Item and Child classes will be Mosx object
:::
```ts
console.log(new State() instanceof Mosx) // true
console.log(new Item() instanceof Mosx) // true
console.log(new Child() instanceof Mosx) // true
```

## Supported types

- primitive types: number, string, boolean
- complex types: embeded object (Mosx), array, map

```ts
@mx.Object
class Item {

  // simple types: string, number, boolen
  @mx name = "abc"
  @mx id = 123 
  @mx bool = false

  // complex types: object, array, map
  @mx obj = new Item() // must be Mosx instance
  @mx arr = new Array<Item>()
  @mx map = new Map<string, Item>()

}
```

## Snapshots

Snapshots are the immutable, structurally shared, representation of Mosx object (and it's children).

Basically, when a change is performed over a Mosx object then a new immutable snapshot can be generated via ```Mosx.getSnapshot``` method.

Getting the snapshot out of any Mosx object is as easy as this:

```ts
@mx.Object
class Item {
  @mx name = "abc"
  @mx id = 123 
  @mx bool = false
}

const item = new Item()

// get snapshot of item
console.log(Mosx.getSnapshot(item))
// { name: "abc", id: 123, bool: false }
```

## Change tracker

Every change of Mosx state can be tracked. First you need to create tracker and then subscribe for patches: 

```ts
const tracker = Mosx.createTracker(state)

const disposer = tracker.onPatch((patch: IEncodedJsonPatch, obj: any, state: State) => {
  // ...
  console.log(patch)
})
```

A patch object has this structure:
```ts
export interface IEncodedJsonPatch {
  op: "replace" | "remove" | "add"
  path: Path
  value?: any // value is not available for remove operations
  oldValue?: any // only if reversible enabled
  encoded?: Buffer // only if serializer used
}
```
## Computed and Observable properies

Computed property can be tracked also if it depends on any ```@mx``` property (including ```@mx.oservable```). Use ```@mx.computed``` decorator to wrap computed property.

```ts
@mx.Object
class Item {

  // computed property
  @mx.computed get flag() { 
    return this.mobx ? "Computed value" : ""
  }

  // observable property
  @mx.observable public mobx = true

}

const item = new Item()

// get snapshot of item
console.log(Mosx.getSnapshot(item))
// { flag: 'Computed value' }

// update observable property
item.mobx = false

// get updated snapdhot of item
console.log(Mosx.getSnapshot(item))
// { flag: '' }

```

Observable properties are hidden for tracker and snapshots 
::: tip 
```@mx.observable === mobx.observable```
:::

## Private objects and properties

By default all ```@mx``` objects/properties are public and visible for all listeners. If it is required to manage visibility of objects/properies you need to make them private. 

Use ```@mx.Object.private``` decorator for private objects:

```ts
@mx.Object.private
class PrivateItem {
  ...
}
```

Use ```@mx.private``` decorator for private properties and ```@mx.computed.private``` decorator for private computed properties:

```ts
@mx.Object
class Item {

  // public property
  @mx name = "abc"

  // private property
  @mx.private value = 100

  // private computed property
  @mx.computed.private get flag() {
    // ...
  }
}

const item = new Item()

// get snapshot of item
console.log(Mosx.getSnapshot(item))
// { name: 'abc' }
```

Private objects and properties are not visible for tracker and in snapshots without access tags. Access for private objects and properties are described in Visibility management.

## Visiblity management

### Access tags

Access tags can be added to any Mosx object. All listeners with one of this tag can see all private properties of Mosx object. To manage access tags of object use ```addTag, deleteTag, getTags``` methods:

```ts
@mx.Object
class Item {
  // public property
  @mx name = "abc"

  // private property
  @mx.private value = 100
}

const item = new Item()
// add access tags to object
Mosx.addTag(item, ["123", "234"])

// get snapshot of item with access tag
console.log(Mosx.getSnapshot(item, "123"))
// { name: 'abc', value: 100 }
console.log(Mosx.getSnapshot(item, "234"))
// { name: 'abc', value: 100 }

// delete one of tags
Mosx.deleteTag(item, "123")

console.log(Mosx.getSnapshot(item, "123"))
// { name: 'abc' }
console.log(Mosx.getSnapshot(item, "234"))
// { name: 'abc', value: 100 }

console.log(Mosx.getTags(item))
// Set(1) {"234"}
``` 

### Virtual objects tree (advanced)

Every Mosx object has virtual Mosx parent and inherits parent tags and tracker. By default parent of all Mosx objects are root state Object. To manage virtual objects tree use ```setParent``` method:

```ts
@mx.Object
class State {
  @mx players = new Array()
  @mx objects = new Map()
}

class Player extends Mosx {
  @mx.private id: string
  @mx name: string

  constructor(id: string, name: string) {
    super(null, id) // setTag for player
    this.id = id
    this.name = name
  }
}

@mx.Object.private
class Item {
  @mx created = Date.now()
}

// create state and players
const state = new State()
const p1 = new Player("1", "John")
const p2 = new Player("2", "Tony")

// create 2 items and set p1 as parent 
const i1 = new Item()
Mosx.setParent(i1, p1)

// Mosx.new - short alias 
const i2 = Mosx.new(Item, p1)()

// add players and items to state
state.players.push(p1, p2)
state.objects.set("item1", i1)
state.objects.set("item2", i2)

// check state for player p1
console.log(Mosx.getSnapshot(state, p1.id))
// { 
//   players: [ { id: '1', name: 'John' }, { name: 'Tony' } ],
//   objects: { item1: { created: 1603317890537 }, item2: { created: 1603317890538 }}
// }

// check state for player p2
console.log(Mosx.getSnapshot(state, p2.id))
// { 
//   players: [ { name: 'John' }, { id: '2', name: 'Tony' } ],
//   objects: { item1: undefined, item2: undefined }  
// }
``` 