# Serializer

## Concept

By default all patches and snapshotes are not serialized


The following serializers are currently avalible:
- mpack
- light
- schema (will be added soon)

## **Serializer: "mpack"**

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

## **Serializer: "light" (advanced)**

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

## **Serializer: "schema" (advanced)**

This serialize algorithms is under development. The main difference from "light" version is that dynamic decode Map will be used (schema). The size of encoded patch will be reduced significantly.

## Custom Serializer 

You can build your own serializer

