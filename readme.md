# MosX 
<img alt="npm" src="https://img.shields.io/npm/v/mosx"> <img alt="npm" src="https://img.shields.io/npm/dm/mosx?label=npm"> <img alt="CircleCI" src="https://img.shields.io/circleci/build/github/udamir/mosx/master?token=af6cb1791c99dfb47ce0b39b3269c0433f9a10b7"> <img alt="npm type definitions" src="https://img.shields.io/npm/types/mosx"> <img alt="GitHub" src="https://img.shields.io/github/license/udamir/mosx">

Multiview observable state management engine based on [MobX](https://mobx.js.org/README.html)

## Summary:
- Observable state with concept of a living tree
- Multiple views of the same state (private parts supported)
- Runtime views configuration
- Patch ([JsonPatch](http://jsonpatch.com/) format) and snapshot generation for each view
- Embeded patch serializer with compression based on [PatchPack](https://github.com/udamir/patchpack)
- Custom schema serialization support
- Typescript syntax support out of the box
- Works perfect with [MagX](https://github.com/udamir/magx) server

## Concept

Central in mosx is the concept of a state tree. The state tree consists of mutable objects, arrays and maps. Every object and property of state tree can be public or private. Public objects/properies can be tracing by all listeners, but private are avalible only for listeners with access. So this means that every listener can have their own view of the same state tree. Access to private object/properties can be updated in real-time.

On each mutation of state automatically generate patch for all listeners in ([JsonPatch](http://jsonpatch.com/) format. Patch can be encoded via embeded serializers, or with custom serializer implementation. Snapshot of state tree is also avalible for every listener.

Since mosx uses MobX behind the scenes, computed properties are supported OOB. Observable properties are also supported, but hidden for listeners and can be used in computed properties.

Another core design goal of mosx is to offer a easy and clean way to create multiview state with great Typescript decorators syntax. Everything you need to make your state trackable, just wrap your class and proreties with @mx decorator.

## Installation

```
npm install --save mosx
```

## Documentation
https://udamir.github.io/mosx/

## Examples project

The easiest way to try out Mosx is using the magx-examples project:
```
git clone https://github.com/udamir/magx-examples.git
cd magx-examples
npm install
```

To run the MagX server, run ```npm start```

## Basic state example

1. Define MosX object for Player:
```ts
import { Mosx, mx } from "mosx"

@mx.Object
class Player {
  @mx public x = Math.floor(Math.random() * 400)
  @mx public y = Math.floor(Math.random() * 400)
}
```
2. Define MosX state:
```ts
@mx.Object
export class State {
  @mx public players = new Map<string, Player>()

  public createPlayer(id: string) {
    const player = new Player()
    this.players.set(id, player)
  }

  public removePlayer(id: string) {
    this.players.delete(id)
  }

  public movePlayer(id: string, movement: any) {
    const player = this.players.get(id)
    if (!player) { return }
    player.x += movement.x ? movement.x * 10 : 0
    player.y += movement.y ? movement.y * 10 : 0
  }
}
```
3. Start track state changes:
```ts
const state = new State()

const tracker = Mosx.createTracker(state)

tracker.onPatch((change) => console.log(change))

```
4. Update state and check track patches
```ts
state.createPlayer("Player 1")

// Patch in JsonPatch format
// {
//   op: 'add',
//   path: '/players/Player 1',
//   value: { x: 77, y: 393 }
// }

state.movePlayer("Player 1", { x: 5, y: -5 })

// { op: 'replace', path: '/players/Player 1/x', value: 127 }
// { op: 'replace', path: '/players/Player 1/y', value: 343 }
```
5. Get snapshot of current state
```ts
const snapshot = Mosx.getSnapshot(state)
console.log(snapshot)

// { players: { 'Player 1': { x: 127, y: 343 } } }
```

## License

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fudamir%2Fmosx.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Fudamir%2Fmosx?ref=badge_large)
