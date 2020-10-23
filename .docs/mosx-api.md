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

::: warning
it's not possible to set parent or tags in constructor if @mx.Object was used
:::

## Mosx.inject

Object can be converted to Mosx object via inject method:
```ts
static inject(target: any, owner?: Mosx, tags: string | string[] = []): void
```

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

## Mosx.getSnapshot

Get snapshot of Mosx object
```ts
  static getSnapshot(target: Mosx, tags?: string | string[]): any 
```

## Mosx.createTracker

Create tracker for Mosx object
```ts
  static createTracker(target: Mosx, params?: IMosxTrackerParams): IMosxTracker
```

Tracker params are global for all listeners, but can setup by every listener individually:
```ts
export interface IMosxTrackerParams {
  reversible?: boolean
  serializer?: string
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

The following serializers are currently avalible:
- mpack
- light
- schema (will be added soon)

### **Serializer: "mpack"**

Simple serializer based on messagePack serializer. Patch converted to array format and then encoded with notepack.io serialization. DecodeMap is not required for decoding:

Zero array element is used for patch.op converted to number:
| patch.op  | op  |
| --------- | --- |
| "add"     | 0   |
| "replace" | 1   |
| "remove"  | 2   |

First array element for patch.path, others elements for patch.value and patch.oldValue.

Example of Json patch:
```json
{
  "op": "add",
  "path": "/players/0",
  "value": { "id": "1", "name": "John" }
}
```
Patch converted to array:
```ts
[ 0, "/players/0", { "id": "1", "name": "John" } ]
```

### **Serializer: "light" (advanced)**

This serialize method convert patch path from string to bytes with indexes in static decode Map. So DecoreMap is required for decoding.
The algoritms is following - patch consists of 2 parts: header and body:
- Header includes excoded patch.op and patch.path
- Body includes array of params and value/oldValue and encoded with notepack.io

When light serializer used patch endoded in following way:

|      | 0   | 1   | 2...n+2 | n+3...                        |
| ---- | --- | --- | ------- | ----------------------------- |
| byte | op  | n   | path    | [...params, value, oldValue]* |
"*" - encoded with notepack

Zero byte is used for operation:
| patch.op  | op  |
| --------- | --- |
| "add"     | 0   |
| "replace" | 1   |
| "remove"  | 2   |

First byte is used for path size - number of nodes in ```patch.path``` (x2 byte for each)

From second byte to n + 2 path encoded:
| byte | option 1  | option 2   |
| ---- | --------- | ---------- |
| 0    | typeIndex | -1         |
| 1    | propIndex | paramIndex |

All map keys are not included in static encode Map as they are dynamic, so all keys added to body array.
patch.value and patch.oldValue also added to body array and encode with notepack.io

### **Serializer: "schema" (advanced)**

This serialize algorithms is under development. The main difference from "light" version is that dynamic decode Map will be used (schema). The size of encoded patch will be reduced significantly.

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
  static addTag(target: Mosx, tags: string | string[]) 
```

## Mosx.deleteTag

Delete tag from state tree node (Mosx object)
```ts
  static deleteTag(target: Mosx, tag: string)
```