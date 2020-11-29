import { observable, computed, IComputed } from "mobx"
import { MosxContext } from "./context"
import { Mosx } from "./mosx"

/**
 * Decorator for observable and computed properties in Mosx
 *
 * example:
 *  @mx.Object // Decorate class to make it visible for Tracker
 *  class Item {
 *    // simple types: string, number, boolen
 *    @mx                  name = "" // any type proprty
 *    @mx.string           id = "123" //string type property
 *    @mx.private.boolean  bool = false // private boolean property
 *
 *    // complex types: object, array, map, set
 *    @mx.object(Item) obj = new Item()
 *    @mx.array(Item)  arr = new Array<Items>()
 *    @mx.map(Item)    map = new Map<string, Item>()
 *    @mx.set(Item)    set = new Set<Item>()
 *
 *    // public computed property
 *    @mx.computed.string
 *    get flag() { return this.bool } // if this.bool change, computed property flag will change too
 *
 *    // observable property, but not visible for tracker
 *    // @mx.observable === mobx.observable
 *    @mx.observable public mobx = "mobx"
 *
 *    // private computed property
 *    @mx.computed.private.string
 *    get flag2() { return this.mobx } // if this.mobx change, computed property flag2 will change too
 * }
 *
 * // use class decorator for private objectes
 *  @mx.Object.private
 *  class PrivateItem extends Item {
 *    // PrivateItem inherits @mx properties from Item
 *  }
 *
 * // alternative way via extending of Mosx
 * class Item extends Mosx {
 *   constructor(owner, tags) {
 *     super(owner, tags) // owner and tags - construcror params
 *   }
 * }
 */

export type PrimitiveType = "any" | "string" | "number" | "boolean" | object
export type DefinitionType = PrimitiveType | PrimitiveType[] | { map: PrimitiveType } | { set: PrimitiveType }

const mosxPropertyDecorator = (type: DefinitionType = "any", hidden = false, getter = false): PropertyDecorator => {
  // tslint:disable-next-line: ban-types
  return (target: Object, key: string | symbol, descriptor?: PropertyDescriptor) => {
    if (typeof key === "string") {
      const constructor = target.constructor as any

      // save ptoperty to schema
      const params = { key, type, hidden, getter }
      if (!mx.$context.has(constructor)) {
        mx.$context.add(constructor)
        const parent = constructor.$mx || { props: [] }
        constructor.$mx = { props: [...parent.props], hidden: parent.hidden }
      }
      constructor.$mx.props.push(params)
      return getter ? computed(target, key, descriptor) : observable(target, key)
    }
  }
}

const propertyFactory: any = (hidden = false, getter = false) => ({
  string: mosxPropertyDecorator("string", hidden, getter),
  number: mosxPropertyDecorator("number", hidden, getter),
  boolean: mosxPropertyDecorator("boolean", hidden, getter),
  object: (mType: object) => mosxPropertyDecorator(mType, hidden, getter),
  array: (mType: PrimitiveType) => mosxPropertyDecorator([mType], hidden, getter),
  map: (mType: PrimitiveType) => mosxPropertyDecorator({ map: mType }, hidden, getter),
  set: (mType: PrimitiveType) => mosxPropertyDecorator({ set: mType }, hidden, getter),
})

const computedFactory: any = mosxPropertyDecorator("any", false, true)
computedFactory.private = Object.assign(mosxPropertyDecorator("any", true, true), propertyFactory(true, true))

// tslint:disable-next-line: interface-name
interface MosxTypesDecorator {
  string: PropertyDecorator
  number: PropertyDecorator
  boolean: PropertyDecorator
  object: (mType: object) => PropertyDecorator
  array: (mType: PrimitiveType) => PropertyDecorator
  map: (mType: PrimitiveType) => PropertyDecorator
  set: (mType: PrimitiveType) => PropertyDecorator
}

type ClassDecorator = <T extends new(...args: any[]) => {}>(constructor: T) => T

// tslint:disable-next-line: interface-name
interface MosxPrivateDecorator {
  private: PropertyDecorator & MosxTypesDecorator
  computed: IComputed & MosxTypesDecorator & {
    private: PropertyDecorator & MosxTypesDecorator,
  }
  observable: any
  Object: ClassDecorator & {
    private: ClassDecorator,
  }
}

type MosxDecorator = PropertyDecorator & MosxPrivateDecorator & MosxTypesDecorator & { $context: MosxContext }

// tslint:disable-next-line: ban-types
const mosxClassDecorator = (hidden = false) => <T extends new(...args: any[]) => {}>(constructor: T): T => {
  const _constructor = constructor as any
  if (!mx.$context.has(_constructor)) {
    mx.$context.add(_constructor)
    _constructor.$mx = Object.assign({}, _constructor.$mx || { props: [] })
  }
  _constructor.$mx.hidden = hidden

  return class extends _constructor {
    constructor(...args: any[]) {
      super(...args)
      if (!(this instanceof Mosx)) {
        Mosx.inject(this)
      }
    }
  } as T
}

export const mx: MosxDecorator = Object.assign(mosxPropertyDecorator(), propertyFactory())

mx.private = Object.assign(mosxPropertyDecorator("any", true), propertyFactory(true))
mx.computed = Object.assign(computedFactory, propertyFactory(false, true))
mx.observable = observable
mx.Object = Object.assign(mosxClassDecorator(false), {
  private: mosxClassDecorator(true),
})

mx.$context = new MosxContext()
