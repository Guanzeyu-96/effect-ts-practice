import { log } from "console"
import { Console, Effect, Fiber, Schedule } from "effect"

// 1. runSync - 用于处理同步、没有throw error的Effect
// 如果Effect中包括async、throw error等情况，runSync会抛出错误（FiberFailure）

const program = Effect.sync(() => {
  console.log("Hello, World!")
  return 1
})

const result = Effect.runSync(program)
// Output: Hello, World!
// const result2 = Effect.runSync(Effect.fail(new Error("error")))

log(`Effect.runSync result: ${result}`)
// Output: 1

// 2. runSyncExit - 基本等同runSync，但是会以obj的形式返回response的具体情况，它本身是不会throw exception的

const resultExit = Effect.runSyncExit(program)

log(`Effect.runSyncExit result: ${resultExit}`)
/* Output:
{
  "_id": "Exit",
  "_tag": "Success",
  "value": 1
}
*/

log(`Effect.runSyncExit fail result: ${Effect.runSyncExit(Effect.fail(new Error("error")))}`)

// 很长，但主要有cause.tag = Die
// log(`Effect.runSyncExit async result: ${Effect.runSyncExit(Effect.promise(() => Promise.resolve(1)))}`)

// 3. runPromise - 执行Effect计算，返回Promise对象

Effect.runPromise(Effect.promise(() => Promise.resolve("runPromise succeed"))).then(log)

// Effect.runPromise(Effect.promise(() => Promise.reject("runPromise failed"))).then(log).catch(console.error)
// Output: (FiberFailure) Error: runPromise failed, 不catch的话会throw exception

// 4. runPromiseExit - 基本等同runPromise，返回一个Promise.resolve(Exit)对象。本身不会reject

// 5. runFork - 其他run Effect的基础，返回一个Fiber对象（这同时也意味着创建了一个Fiber，后台执行Effect计算），可以被observe或者interrupt

// 根据Effect官网建议，除非显式的需要执行一个同步或异步计算，否则都推荐使用runFork执行runnning effect

const programForever = Effect.repeat(
  Console.log("running..."),
  Schedule.spaced("200 millis")
)

// 代码执行到这一行，Effect计算就已经执行了，同时Fiber对象会被返回，从而可以控制该纤程
const fiber = Effect.runFork(programForever)

// 5秒后通过控制fiber来终止进程
setTimeout(() => {
  Effect.runFork(Fiber.interrupt(fiber))
}, 500)

/*
Effect并没有机制预先知道Effect的执行是异步的与否;
推荐pattern是在把Effect的执行放在程序最外层；类似于fp-ts库里domain逻辑都是在构造TE，effect ts的domain也应该都是在构建（有异步的）Effect对象
*/
