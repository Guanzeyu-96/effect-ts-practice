import { log } from "console"
import { Fiber } from "effect"
import * as Effect from "effect/Effect"
import { createWriteStream, readFile, unlinkSync } from "fs"

// 1. create synchronous effect

Effect.sync(() => console.log("Hello, World!"))

// may fail
Effect.try<string, Error>({
  try: () => JSON.parse("invalid json"),
  catch: () => new Error("Invalid JSON")
})

// 2. create asynchronous effect

Effect.promise<string>(
  () => new Promise((resolve) => setTimeout(() => resolve("hello"), 1000))
)

// may fail
Effect.tryPromise<string, Error>({
  try: () => fetch("https://jsonplaceholder.typicode.com/todos/1").then((response) => response.json()),
  catch: () => new Error("Invalid JSON")
})

// 3. create effect from callback
// 可以将一些基于callback的API封装在Effect中

// fs库的readFile方法通过一个callback参数，定义对error和data的处理。这也是一个异步操作

readFile("/path/to/file", (error, data: Buffer) => {
  if (error) {
    console.error(error)
  } else {
    console.log(data)
  }
})

// effect通过async封装callback

const readFileEffectly = (fileName: string) =>
  // 这里的类型参数是必须的，因为ts无法通过callback的返回值推断参数类型
  Effect.async<Buffer, Error>((resume) => {
    readFile(fileName, (error, data: Buffer) => {
      // 内部对resuem的调用仅限一次，多出的会被忽略
      if (error) {
        resume(Effect.fail(new Error(error.message)))
      } else {
        resume(Effect.succeed(data))
      }
    })
  })

// 进阶用法：令resume return另一个Effect，从而实现当fiber running effect中断的时候的资源回收
// fiber指的是轻量级执行单元或线程，或者描述成一种可以暂停或恢复的计算。在 Effect TS 中，Fiber 代表一个可以运行、暂停和恢复的异步计算。它们允许你以更细粒度的方式控制异步操作的执行。

const writeFileWithCleanup = (fileName: string, data: string) =>
  Effect.async<void, Error>((resume) => {
    // async的参数是一个lambda，返回值类型是：void | Effect<void, never, R>；第二个类型的作用就是创建clean up effect
    const writeStream = createWriteStream(fileName)

    // writing data to the file
    writeStream.write(data)

    // resume with success when succeed
    writeStream.on("finish", () => resume(Effect.void))

    writeStream.on("error", (err) => resume(Effect.fail(err)))

    // 这个clean up
    return Effect.sync(() => {
      log(`Clean up ${fileName}`)
      // 删除文件
      unlinkSync(fileName)
    })
  })

// Effect.gen接收生成器函数来以同步的方式构造异步Effect。可能类似于for yield以及ts的async await，yield*表示等待异步操作执行完毕
const program = Effect.gen(function*() {
  // fork用于并发执行效果，返回一个fiber对象，可以控制它来控制这个并发
  const fiber = yield* Effect.fork(
    writeFileWithCleanup("example.txt", "some data")
  )

  // 1s后中止fiber，会执行到clean up（删除写入文件）
  yield* Effect.sleep("1 second")
  yield* Fiber.interrupt(fiber)
})

// 4. suspended effect：惰性创建Effect，例如耗费大量计算资源而不必要时

let i = 0

const bad = Effect.succeed(i++)
const good = Effect.suspend(() => Effect.succeed(i++))

log(Effect.runSync(bad)) // 0，因为effect在创建的时候已经确定了i的值
log(Effect.runSync(bad)) // 0

log(Effect.runSync(good)) // 1，因为i++在suspend的时候被计算，而不是Effect创建的时候
log(Effect.runSync(good)) // 2

// suspend effect另一个作用，在Effect之间处理循环依赖，典型场景就是递归

// 下面的函数用于创建斐波那契数列（经典递归）
// 一旦n较大，这个函数会在实际调用时内存泄漏，原因是没有惰性计算，所有blowup的中间值都被放入内存中
const blowup = (n: number): Effect.Effect<number> =>
  // zipWith用于将两个Effect根据lambda combine成另一个Effect，类似于flatMap
  n < 2 ?
    Effect.succeed(1) :
    Effect.zipWith(blowup(n - 1), blowup(n - 2), (a: number, b: number) => a + b)

// 这种实现就没有这个问题，因为Effect内容的计算被suspend标记成了惰性的
const betterRe = (n: number): Effect.Effect<number> =>
  n < 2 ?
    Effect.succeed(1) :
    Effect.zipWith(
      Effect.suspend(() => betterRe(n - 1)),
      Effect.suspend(() => betterRe(n - 2)),
      (a: number, b: number) => a + b
    )

// effect suspend的另一个作用是帮助ts类型推断
// 在这个例子中函数返回值的推断类型是Effect.Effect<never, Error, never> | Effect.Effect<number, never, never>
const withoutSuspend = (a: number, b: number) =>
  b === 0
    ? Effect.fail(new Error("Cannot divide by zero"))
    : Effect.succeed(a / b)

// 这里就可以正常进行类型推断，原因也是由惰性计算带来的
const withSuspend = (a: number, b: number) =>
  Effect.suspend(() =>
    b === 0
      ? Effect.fail(new Error("Cannot divide by zero"))
      : Effect.succeed(a / b)
  )
