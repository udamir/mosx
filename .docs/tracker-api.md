# Tracker API

## Concept

Tracker instance can be created only to root node (Mosx object) of state tree, then it will be avalible in all child nodes. Only one tracker can be created for state.

## Create tracker
```ts
// create new tracker
const tracker = Mosx.createTracker(state, { serializer, reversible })
```

The following parameters can be used:
```ts
export interface IMosxTrackerParams {
  serializer?: any
  reversible?: boolean
  privateMapValuePatch?: boolean
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
  oldValue?: any // only if reversible enabled
  encoded?: Buffer // only if serializer set
}
```
::: info
Read more about [serializer](/mosx/serializer.html)
:::

Set ```privateMapValuePatch``` if you need to get patches for hidden map items as undefined

## Get tracker

Get tracker from any node of state tree:
```ts
  const player = state.players[0]

  // get existing tracker
  const tracker = Mosx.getTracker(player)
```

## tracker.snapshot

Return serialized snapshot if serialized is defined, if not - return Mosx.getSnapshot
```ts
  snapshot(params: IMosxSnapshotParams) {
    const snapshot = Mosx.getSnapshot(this.root, params && params.tags)
    return this.serializer 
      ? this.serializer.encodeSnapshot(snapshot) 
      : snapshot
  }
```

```ts
export interface IMosxSnapshotParams {
  tags?: string | string[]
  spy?: boolean
}
```

Set access ```tags``` parameter to get snapshot with private objects/properties.

Set ```spy``` as true if you need to get full snapshot including all private objects/properties

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
  spy?: boolean
}
```

Set access ```tags``` parameter to recieve patches for private objects/properties.

Set ```filter``` parameter to any operations ("add", "replace", "remove") fo recieve patches for choosen operations.

Set ```reversible``` as true if you need to get oldValue in JsonPatch:
```ts
export interface IReversibleJsonPatch {
  op: "replace" | "remove" | "add"
  path: Path
  value?: any // value is not available for remove operations
  oldValue?: any // only if reversible enabled
}
```
Set ```spy``` as true if you need to recieve all patches including private objects/properties

### tracker.dispose

```ts
  dispose(): void
```

Dispose tracker.