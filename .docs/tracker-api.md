# Tracker API

Tracker instance can be created to root node (Mosx object) of state tree, then it will be avalible in all child nodes:
```ts
  // create new tracker
  const tracker = Mosx.createTracker(state)
```

Get tracker from any node of state tree:
```ts
  const player = state.players[0]

  // get existing tracker
  const tracker = Mosx.getTracker(player)
```

## tracker.snapshot

Alias to Mosx.getSnapshot()
```ts
  snapshot(params: IMosxSnapshotParams) {
    return Mosx.getSnapshot(this.root, params && params.tags)
  }
```

```ts
export interface IMosxSnapshotParams {
  tags?: string | string[]
}
```

Set access ```tags``` parameter to get snapshot with private objects/properties.

## tracker.onPatch

```ts
  onPatch (listener: MosxPatchListener<T>, params?: IMosxPatchParams) => IDisposer
```
Use ```onPatch``` method to add listener for state stree change. 

The following parameters can be used:
```ts
export interface IMosxPatchParams {
  tags?: string | string[]
  filter?: JsonPatchOp | JsonPatchOp[]
  reversible?: boolean
  serializer?: string
}
```

Set access ```tags``` parameter to recieve patches for private objects/properties.

Set ```filter``` parameter to any operations ("add", "replace", "remove") fo recieve patches for choosen operations.

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

## tracker.decodeMap

```ts
  decodeMap(serializer?: string): any
```

Generate decodeMap for choosen serializer.

#### **decodeMap for light serialized**

```ts
export interface ILightSchema {
  [type: string]: ISchemaItem
}

export interface ISchemaItem {
  index: number // typeIndex
  parent: string // parent class name
  props: string[] // array of props name
  schema: IPropsSchema
}

export interface IPropsSchema {
  [prop: string]: string | IPropSchema
}

export interface IPropSchema {
  type: "map" | "set" | "array"
  items: string
}

```

### tracker.dispose

```ts
  dispose(): void
```

Dispose tracker.