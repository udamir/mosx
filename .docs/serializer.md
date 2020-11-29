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

Simple serializer based on messagePack and with static decodeMap. DecodeMap will added to encoded snapshot and required for decoding. 

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

This serializer based on [patchPack](https://github.com/udamir/patchpack) library. The main difference from "light" version is that dynamic decode Map will be used (schema). Schema will be updated by decoding snapshot and patches. This serialize algorithm minimize size of encoded patch.

::: warning
  ```privateMapValuePatch``` must be set as true.
:::

### Schema format

As in LightSerializer decodeMap included in encoded snapshot.

```ts
  const tracker = Mosx.createTracker(state, { 
    serializer: SchemaSerializer,
    privateMapValuePatch: true
  })
  const snapshot = tracker.snapshot()
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

  public beforeChange(change: IChange, parent: ITreeNode) { 
    // before sending patches to listeners
  }

  public afterChange(change: IChange, parent: ITreeNode) {
    // after sending patches to listeners
  }

  public onCreateNode(entry: ITreeNode, target: any) {
    // on create new tree node
  }

  public onDeleteNode(entry: ITreeNode) {
    // on delete tree node
  }

  public encodeSnapshot(value: any): Buffer {
    // add encode snapshot algorithms
  }

  public decodeSnapshot(value: Buffer): any {
    // add decode snapshot algorithms
  }

  public encodePatch(patch: IReversibleJsonPatch, target: any): Buffer {
    // add encode patch algorithms
  }

  public decodePatch(buffer: Buffer): IReversibleJsonPatch {
    // add decode patch algorithms
  }
}
```
