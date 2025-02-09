# 开始

## Functions vs Methods

js的method和function的区别在于， function独立；而method是定义在class上的（js没有class，所以本质上是定义在object以及原型类继承链上）

Effect ts普遍提供function而不是method，有两方面考虑：

1. Tree Shakeability

   Tree shaking 是一种在 JavaScript 打包工具（如 Webpack、Rollup 等）中使用的过程，用于消除未使用的代码。这有助于减少打包后的文件大小并提高应用程序的性能。
   
   function是shakeable的；而method不是。在js中method是attach在object或者prototype上的，而function相对独立。所以这种设计有利于减小打包文件的体积。

2. Extendibility
    
   可扩展。因为扩展method意味着直接修改prototype或object；而function的扩展可以简单定义extension function（这一部分我的理解是，类似于scala中的type class和直接修改class）
   

## The Effect Type

The Effect type is an immutable description of a workflow or operation that is lazily executed.

核心是，effect这种type是immutable、lazy的。

```
         ┌─── Represents the success type
         │        ┌─── Represents the error type
         │        │      ┌─── Represents required dependencies
         ▼        ▼      ▼
Effect<Success, Error, Requirements>
```

前两个类型参数就是右和左，第三个是 contextual dependencies

Effect会被Effect runtime system执行成真实世界的入口

Effect的三个类型参数可以借助type of抽出来

```typescript
import { Effect, Context } from "effect"

class SomeContext extends Context.Tag("SomeContext")<SomeContext, {}>() {}

// Assume we have an effect that succeeds with a number,
// fails with an Error, and requires SomeContext
declare const program: Effect.Effect<number, Error, SomeContext>

// Extract the success type, which is number
type A = Effect.Effect.Success<typeof program>

// Extract the error type, which is Error
type E = Effect.Effect.Error<typeof program>

// Extract the context type, which is SomeContext
type R = Effect.Effect.Context<typeof program>
```

## 创建Effect

```typescript
const success = Effect.succeed(42)

// 根据错误处理的策略，fail类型不一定非得是error，也可以是string，object等（过去fp实践里的AppError）
const fail = Effect.fail(new Error("error"))

const divide = (a: number, b: number): Effect.Effect<number, Error> =>
  b === 0 ? Effect.fail(new Error("division by zero")) : Effect.succeed(a / b)
```

### sync effect建模

在js中往往用thunk做同步的延迟计算；Effect提供了Effect.sync Effect.try来构造对同步side effect的建模（都接收一个thunk作为参数）：

#### sync

不会throw error的同步side effect。典型场景：打log

```typescript
import { Effect } from "effect"

const log = (message: string) =>
  Effect.sync(() => {
    console.log(message) // side effect
  })

//      ┌─── Effect<void, never, never>
//      ▼
const program = log("Hello, World!")
```

这里的program不会立即执行，而是被管理在Effect的context中了。只会在Effect被explict run的时候执行。

注意：如果thunk throw了error，那么该error会被视作deffect，相当于effect上下文中的unexpected error。可以在后续用Effect.catchAllDeffect来处理。


#### try

应用场景：可能失败的sync side effect。比如各种第三方库函数，以parse json为例：

```typescript
import { Effect } from "effect"

const parse = (input: string) =>
  // This might throw an error if input is not valid JSON
  Effect.try(() => JSON.parse(input))

//      ┌─── Effect<any, UnknownException, never>
//      ▼
1const program = parse("")
```

应该是类似于kotlin raise syntax中的catch block函数。这样Error就不会直接throw而是被Effect管理起来，只会在Runtime的时候执行。

自定义try catch的错误处理逻辑（Effect.try提供的重载，不再接收一个thunk而是一个object包含两个名为try和catch的thunk）：

```typescript
import { Effect } from "effect"

const parse = (input: string) =>
  Effect.try({
    // JSON.parse may throw for bad input
    try: () => JSON.parse(input),
    // remap the error
    catch: (unknown) => new Error(`something went wrong ${unknown}`)
  })

//      ┌─── Effect<any, Error, never>
//      ▼
const program = parse("")
```

这和传统js的try catch是相似的。

### async effect建模

传统js用Promise对象来处理异步，Effect也提供了对异步side effect的建模

#### promise

用Effect.promise()创建，接收一个返回Promise的thunk，这个Promise不能reject，否则会被视作deffect

```typescript
import { Effect } from "effect"

const delay = (message: string) =>
  Effect.promise<string>(
    () =>
      new Promise((resolve) => {
        setTimeout(() => {
          resolve(message)
        }, 2000)
      })
  )

//      ┌─── Effect<string, never, never>
//      ▼
const program = delay("Async operation completed successfully!")
```

#### tryPromise

创建可能会fail的Effect。默认的exception是UnknownException

```typescript
import { Effect } from "effect"

const getTodo = (id: number) =>
  // Will catch any errors and propagate them as UnknownException
  Effect.tryPromise(() =>
  //  这里fetch（三方库返回的是Promise对象故用tryPromise来创建Effect对象）
    fetch(`https://jsonplaceholder.typicode.com/todos/${id}`)
  )

//      ┌─── Effect<Response, UnknownException, never>
//      ▼
const program = getTodo(1)

// 同样可以接catch来自定义 错误处理
import { Effect } from "effect"

const getTodo = (id: number) =>
  Effect.tryPromise({
    try: () => fetch(`https://jsonplaceholder.typicode.com/todos/${id}`),
    // remap the error
    catch: (unknown) => new Error(`something went wrong ${unknown}`)
  })

//      ┌─── Effect<Response, Error, never>
//      ▼
const program = getTodo(1)
```

### From callback

有些api是基于callback的（不是基于async/await或Promise的），Effect也提供了对callback的支持。

```typescript
import { Effect } from "effect"
import * as NodeFS from "node:fs"

const readFile = (filename: string) =>
  Effect.async<Buffer, Error>((resume) => {
    NodeFS.readFile(filename, (error, data) => {
      if (error) {
        // Resume with a failed Effect if an error occurs
        resume(Effect.fail(error))
      } else {
        // Resume with a succeeded Effect if successful
        resume(Effect.succeed(data))
      }
    })
  })

//      ┌─── Effect<Buffer, Error, never>
//      ▼
const program = readFile("example.txt")
```
