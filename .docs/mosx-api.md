# Mosx API

## Constructor

When Mosx object created by extending of Mosx class it can set parent and tags in constructor:
```ts
class Player extends Mosx {
  constructor(owner, tags) {
    // super (owner?: Mosx, tags: string | string[] = [])
    super(owner, tags) 
  }
}
```

## Mosx.inject

Object can be converted to Mosx object via inject method:
```ts
static inject(target: any, owner?: Mosx, tags: string | string[] = []): Mosx
```

::: tip
you can use ```Mosx.inject``` to set parent or tags in constructor if @mx.Object was used
:::

Example: 
```ts
class Item {
  constructor(owner: any, tags: string[]) {
    Mosx.inject(this, owner, tags)
  }
}

const item = new Item(null, [])
console.log(item instanceof Mosx) 
// true
```

## Mosx.new

Alias for creation of Mosx object and set parent/tags
```ts
static new(Class: MosxClass, parent?: Mosx, tags: any = []): (...args)
```

Example:
```ts
// alias for create Item and set parent/tags
// const i1 = new Item(data)
// Mosx.setTag(i1, "111")
// Mosx.setParent(i1, p1)

const i1 = Mosx.new(Item, p1, "111")(data)
```

## Mosx.isParent

Check if Mosx object has parent:
```ts
 static isParent(target: Mosx, parent: Mosx): boolean 
```

## Mosx.getParent

Get parent of Mosx object
```ts
  static getParent(target: Mosx): Mosx | null
```

## Mosx.setParent

Set parent for Mosx object
```ts
  static setParent(target: Mosx, owner?: Mosx)
```

::: tip
```Mosx.setParent``` also convert object to Mosx
:::

## Mosx.getSnapshot

Get snapshot of Mosx object
```ts
  static getSnapshot(target: Mosx, tags?: string | string[], spy = false): any 
```

## Mosx.createTracker

Create tracker for Mosx object
```ts
  static createTracker(target: Mosx, params?: IMosxTrackerParams): IMosxTracker
```

Tracker params are global for all listeners:
```ts
export interface IMosxTrackerParams {
  reversible?: boolean
  serializer?: Serializer
}
```

Set ```reversible``` as true if you need to get oldValue in JsonPatch:
```ts
export interface IEncodedJsonPatch {
  op: "replace" | "remove" | "add"
  path: Path
  value?: any // value is not available for remove operations
  oldValue?: any // only if reversible enabled
}
```

Set ```serializer``` if you need to get encoded patch in JsonPatch:
```ts
export interface IEncodedJsonPatch {
  op: "replace" | "remove" | "add"
  path: Path
  value?: any // value is not available for remove operations
  encoded?: Buffer // only if serializer set
}
```

## Mosx.getTracker

Get tracker of state tree
```ts
  static getTracker(target: Mosx): MosxTracker | null 
```

## Mosx.getTags

Get tags of state tree node (Mosx object)
```ts
  static getTags(target: Mosx): Set<string> | null
```

## Mosx.addTag

Add tags to state tree node (Mosx object)
```ts
  static addTag(target: any, tags: string | string[]) 
```

::: tip
```Mosx.addTag``` also convert target to Mosx
:::

## Mosx.deleteTag

Delete tag from state tree node (Mosx object)
```ts
  static deleteTag(target: Mosx, tag: string)
```