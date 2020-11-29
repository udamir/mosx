# Introduction

Mosx is state management framework based on [MobX](https://mobx.js.org/)

## Summary
MosX provides to you:
- Observable state with concept of a living tree
- Objects, Arrays and Maps are supported
- Multiple views of the same state (private parts supported)
- Runtime views configuration
- Patch ([JsonPatch](http://jsonpatch.com/) format) and snapshot generation for each view
- Embeded patch serializer with compression  
- Custom serialization algorithms supported
- Typescript syntax support out of the box
- Works perfect with [MagX](https://github.com/udamir/magx) server

## Concept

Central in mosx is the concept of a state tree. The state tree consists of mutable objects, arrays and maps. Every object and property of state tree can be public or private. Public objects/properies can be tracked by all listeners, but private are avalible only for listeners with access. So this means that every listener can have their own view of the same state tree. Access to private object/properties can be updated in real-time.

On each mutation of state automatically generate patch for all listeners in [JsonPatch](http://jsonpatch.com/) format. Patch can be encoded via embeded serializers, or with custom serializer implementation. Snapshot of state tree is also avalible for every listener.

Since mosx uses MobX behind the scenes, computed properties are supported OOB. Observable properties are also supported, but hidden for listeners and can be used in computed properties.

Another core design goal of mosx is to offer a easy and clean way to create multiview state with great Typescript decorators syntax. Everything you need to make your state trackable, just wrap your class and proreties with ```@mx``` decorator.

## Requirements
This library requires a more or less modern Javascript environment to work, namely one with support for:
- [MobX](https://mobx.js.org/) 5
- Proxies
- Symbols
- WeakMap/WeakSet

If you are using Typescript, then version >= 3.7.3 is recommended, though it might work with older versions.

## Installation
```
npm install --save mosx
```
