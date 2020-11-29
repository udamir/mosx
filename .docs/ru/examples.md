# Примеры

## Magx example projects
The easiest way to try out MosX is using the [magx-examples](https://github.com/udamir/magx-examples):
```
git clone https://github.com/udamir/magx-examples.git
cd magx-examples
npm install
```

To run the MagX server, run ```npm start```

## Basic state example

1. Install magx and mosx packages:
```
npm install --save mosx
```

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
