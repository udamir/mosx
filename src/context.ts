export interface ISchemaMeta {
  index: number
  parent: string
  ref: any
}

export class MosxContext {
  // mosx constructors
  public types: Set<any> = new Set()
  // mosx object types meta
  public meta: Map<string, ISchemaMeta> = new Map()
  // mosx object types index
  public index: string[] = []

  // add constructor to schema
  public add(contructor: any) {
    this.meta.set(contructor.name, {
      index: this.types.size,
      parent: contructor.$mx && contructor.__proto__.name,
      ref: contructor,
    })
    this.index.push(contructor.name)
    this.types.add(contructor)
  }

  // check is constructor already added
  public has(constructor: any): boolean {
    return this.types.has(constructor)
  }
}
