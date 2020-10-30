# Serializer

## Concept

By default all patches and snapshotes are not serialized


The following serializers are currently avalible:
- MpackSerializer
- LightSerializer
- SchemaSerializer

## **MpackSerializer**

Simple serializer based on [messagePack](https://msgpack.org/). Patch converted to array format and then encoded with [notepack.io](https://github.com/darrachequesne/notepack) serialization. DecodeMap is not required for decoding:

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

## **LightSerializer**

Simple serializer based on messagePack and with static decodeMap. DecodeMap will added to snapshot and required for decoding. 

Patch converted to tuple array format, ```patch.path``` converted from string to bytes with indexes in static decode Map.
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

## **SchemaSerializer**

The main difference from "light" version is that dynamic decode Map will be used (schema). With each new node in state tree schema must be updated accordingly. This serialize algorithm minimize size of encoded patch.

::: warning
This serialize algorithms is under testing.
:::

### Schema format

As in LightSerializer decodeMap included in snapshot with key ```"_"```.

```ts
  const tracker = Mosx.createTracker(state, { serializer: SchemaSerializer })
  const snapshot = tracker.snapshot()
  const schema = snapshot._
```

This decodeMap (schema) is not static, so you need to apply all related patches. Schema includes array of types and array of nodes:

```ts
interface ISchema {
  types: SchemaType[]
  nodes: SchemaNode[]
}
```

#### **Schema: types**
Schema types - is tuple array of ```Mosx``` classes and ```@mx``` properties:
```ts
//   SchemaType = [ name,   props    ]
type SchemaType = [ string, ...string[] ]
```

| index | name  | description     |
| ----- | ----- | --------------- |
| 0     | name  | Mosx class name |
| 1+    | props | @mx properties  |

#### **Schema: nodes**
```ts
//   SchemaNode = [ id,     type,   parent, name,            items? ]
type SchemaNode = [ number, number, number, string | number, ...string[] ]
```
| index | name   | description                                  |
| ----- | ------ | -------------------------------------------- |
| 0     | id     | node id                                      |
| 1     | type   | Array (-1), Map (-2), Mosx type Index (0+)   |
| 2     | parent | parent node id                               |
| 3     | index  | array index / map key index / property index |
| 4+    | items  | map keys (if type === -2)                    |

### Patch format

Decode by [notepack.io](https://github.com/darrachequesne/notepack) patch has following format:
```ts
//   SchemaPatch = [ op,     id,     prop,   value/oldValue ]
type SchemaPatch = [ number, number, number, any?, any? ]
```

There are 2 types of patches:
- state patch
- schema patch (types patch, nodes patch)
  
Zero array element ```op``` is used to set patch type (state or schema) and for patch.op converted to number:
| patch.op  | state | schema nodes | schema types |
| --------- | ----- | ------------ | ------------ |
| "add"     | 0     | -3           | -6           |
| "replace" | 1     | -2           | -5           |
| "remove"  | 2     | -1           | -4           |

#### State patch format:

| index | name   | description                                                          |
| ----- | ------ | -------------------------------------------------------------------- |
| 0     | op     | patch.op                                                             |
| 1     | id     | schema node id                                                       |
| 2     | prop   | index of node type                                                   |
| 3+    | values | patch.value (if not remove) and patch.oldValue (if reversable patch) |

#### Schema patch format:

| index | name     | description                              |
| ----- | -------- | ---------------------------------------- |
| 0     | op       | patch.op and patch type (nodes or types) |
| 1     | index    | nodes (or types) array index             |
| 2     | keyIndex | node (or type) array item                |
| 3     | value    | patch.value (if not remove operation)    |

### Encode example

schema:
```ts
{
  types: [
//  [ 0: class     1+: properties   ]
    [ 'SchemaMap', 'types', 'nodes' ], // 0 -> Schema type
    [ 'State',     'clients' ],        // 1 -> State type
    [ 'Client',    'name', "x", "y" ], // 2 -> Client type
  ],
  nodes: [
//  [ id, type,            parent,               index      ]
    [ 0,  1,  /* State */  -1, /* null */        -1 /* no index */  ],    // id=0 -> state (State)
    [ 1,  -1, /* Array */  0,  /* "/" */         0 /* prop index */ ],    // id=1 -> state.clients (Array)
    [ 2,  2,  /* Client */ 1,  /* "/clients/" */ 0 /* array index */],     // id=2 -> state.clients[0] (Client)
  ]
}
```
source patch:
```ts
{
  op: "add",                                // "add" -> 0
  path: "/clients/0",                       // node id -> 2
  value: { name: "client1", x: 50, y: 50 }  // type -> Client
}
```
encoded patch: 
```ts
[
  0,                    // op
  2,                    // path
  ["client1", 50, 50]   // value
]
```

### Decode example

schema:
```ts
{
  types: [
//  [ 0: class     1+: properties   ]
    [ 'SchemaMap', 'types', 'nodes' ], // 0 -> Schema type
    [ 'State',     'clients' ],        // 1 -> State type
    [ 'Client',    'name', "x", "y" ], // 2 -> Client type
  ],
  nodes: [
//  [ id, type,            parent,               name      ]
    [ 0,  1,  /* State */  -1, /* null */        -1 /* no index */  ],    // id=0 -> state (State)
    [ 1,  -1, /* Array */  0,  /* "/" */         0 /* prop index */ ],    // id=1 -> state.clients (Array)
    [ 2,  2,  /* Client */ 1,  /* "/clients/" */ 0 /* array index */],     // id=2 -> state.clients[0] (Client)
  ]
}
```
encoded patch: 
```ts
[
  0,                    // op -> "add"
  2,                    // path -> type = Client, name = 0, parent.name = "clients"
  ["client1", 50, 50]   // value -> Client props: ['name', "x", "y"]
]
```

decoded patch:
```ts
{
  op: "add",                                
  path: "/clients/0",                     
  value: { name: "client1", x: 50, y: 50 }  
}
```

## Custom Serializer 

You can build your own serializer extending ```Serializer``` class:

```ts
class CustomSerializer extends Serializer<T = any> {
  // tree nodes
  public nodes: WeakMap<any, ITreeNode>

  // tracker listeneres
  public listeneres: Set<IListener<T>>

  // state tree root
  public root: T

  public onCreate(): void {
    // on serializer create
  }

  public onChange(change: IChange, parent: ITreeNode) {
    // on stata change
  }

  public onCreateNode(entry: ITreeNode, target: any) {
    // on create new tree node
  }

  public onDeleteNode(entry: ITreeNode) {
    // on delete tree node
  }

  public encode(patch: IReversibleJsonPatch, target: any): Buffer {
    // add encode algorithms
  }

  public decode(buffer: Buffer): IReversibleJsonPatch {
    // add decode algorithms
  }
}
```
