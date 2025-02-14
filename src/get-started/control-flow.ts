/*
Effectt提供了一些自己的contorl flow方法
*/

import { log } from "console"
import { Console, Effect, Option, Random } from "effect"

// 1. if from JS
// Function to validate weight and return an Option
const validateWeightOption = (
  weight: number
): Effect.Effect<Option.Option<number>> => {
  if (weight >= 0) {
    // Return Some if the weight is valid
    return Effect.succeed(Option.some(weight))
  } else {
    // Return None if the weight is invalid
    return Effect.succeed(Option.none())
  }
}

const validateWeightOrFail = (
  weight: number
): Effect.Effect<number, string> => {
  if (weight >= 0) {
    // Return the weight if valid
    return Effect.succeed(weight)
  } else {
    // Fail with an error if invalid
    return Effect.fail(`negative input: ${weight}`)
  }
}

// 2. if
// 这里的Random.nextBoolean是一个Effect<boolean, never>
const flipTheCoin = Effect.if(Random.nextBoolean, {
  // onTrue的类型是LazyEffect，而Console也是封装的Effect的console log
  onTrue: () => Console.log("Head"), // Runs if the predicate is true
  onFalse: () => Console.log("Tail") // Runs if the predicate is false
})

Effect.runFork(flipTheCoin)

// 3. when
// 提供一个predicate，只有当predicate为true时才执行Effect

// 类型是Effect.Effect<Option.Option<number>, never, never>
// when的参数是一个LazyArg<boolean>
const validateWeightOptionWhen = (weight: number) =>
  Effect.succeed(weight).pipe(
    Effect.when(() => weight >= 0),
    Effect.tap(log)
  )

// 3. whenEffect
// 类似when，根据另一个Effect的结果来决定是否执行Effect
// 参数类型是Effect<boolean, E, R>
const validateWeightOptionWhenEffect = Random.nextInt.pipe(Effect.whenEffect(Random.nextBoolean))

// 4. unless/unlessEffect

const validateWeightOptionUnless = (weight: number) => Effect.succeed(weight).pipe(Effect.unless(() => weight < 0))
const validateWeightOptionUnlessEffect = (weight: number) =>
  Effect.succeed(weight).pipe(Effect.unlessEffect(Random.nextBoolean))

Effect.runFork(validateWeightOptionWhen(10))

// 5. zip
// 用于将两个effect合成一个effect，产生一个包含两个Effect结果的tuple。

const task1 = Effect.succeed(1).pipe(
  Effect.delay("200 millis"),
  Effect.tap(Console.log("task1 done"))
)

const task2 = Effect.succeed("hello").pipe(
  Effect.delay("100 millis"),
  Effect.tap(Console.log("task2 done"))
)

// 默认两个effect是顺序执行的，但可以加option concurrent来并行执行
// 其中一个Effect fail了整个Effect就fail了
const program = Effect.zip(task1, task2, { concurrent: true })

// task1 done
// task2 done
// [ 1, 'hello' ]
Effect.runPromise(program).then(log)

// 6. zipWith: 就是Effect的flatMap，用于Effect的combine。和zip一样，也可以加option concurrent来并行执行

const taskZipWith1 = Effect.succeed(1).pipe(
  Effect.delay("200 millis"),
  Effect.tap(Console.log("task zipWith 1 done"))
)

const taskZipWith2 = Effect.succeed("hello").pipe(
  Effect.delay("100 millis"),
  Effect.tap(Console.log("task zipWith 2 done"))
)

const programZipWith = Effect.zipWith(
  taskZipWith1,
  taskZipWith2,
  (num, str) => `${num} ${str}`
).pipe(Effect.tap(Console.log))

Effect.runFork(programZipWith)

// 7. loop: Effect世界的循环，用于循环的执行Effectful operation，并最终将所有结果return成一个Effect<Array>
// 返回值是一个length为loop次数的Array的Effect（不是Effect的Array）

// Effect.Effect<number[], never, never>
const loopResult = Effect.loop(
  // init state
  1,
  {
    // 循环中止条件
    while: (state) => state <= 5,
    // 步长
    step: (state) => state + 1,
    // 每一步迭代产生的Effect
    body: (state) => Effect.succeed(state),
    // discard set成true的情况下只会执行每一步Effect，但最终结果会是undefine而不是Array
    discard: true
  }
)

Effect.runPromise(loopResult).then(log)

// 8. iterate: 允许循环对【一个】state执行一个Effectful operation，直到满足while的退出条件

const iterateResult = Effect.iterate(
  1,
  {
    while: (state) => state <= 5,
    body: (state) => Effect.succeed(state + 1)
  }
)
// 6
log(`iterateResult: ${Effect.runSync(iterateResult)}`)

// 9. forEach: 用于对一个iterable里每一个元素执行一个Effectful operation，返回一个包含所有结果的Array

const forEachResult = Effect.forEach(
  [1, 2, 3, 4, 5],
  (n, index) => Console.log(`Currently at index ${index}`).pipe(Effect.as(n * 2))
  // 也可以加 { discard: true } 来让整个Effect.forEach返回undefined而不是Array
)

// [ 2, 4, 6, 8, 10 ]
Effect.runPromise(forEachResult).then(log)

// all: 用于combine多个Effect，合成一个大的Effect
// 参数上支持tuples, iterables, objects, and records
// Q：和zip有什么区别？

const tupleOfEffects = [
  Effect.succeed(42).pipe(Effect.tap(Console.log)),
  Effect.succeed("Hello").pipe(Effect.tap(Console.log))
] as const

const resultAsTuple = Effect.all(tupleOfEffects)

Effect.runPromise(resultAsTuple).then(log)

const iterableOfEffects: Array<Effect.Effect<number>> = [1, 2, 3].map((n) =>
  Effect.succeed(n).pipe(Effect.tap(Console.log))
)

const structOfEffects = {
  a: Effect.succeed(42).pipe(Effect.tap(Console.log)),
  b: Effect.succeed("Hello").pipe(Effect.tap(Console.log))
}

const resultAsStruct = Effect.all(structOfEffects)

// { a: 42, b: 'Hello' }
Effect.runPromise(resultAsStruct).then(log)

// Effect.all也是Short-Circuiting的（快速失败），可以通过const program = Effect.all(effects, { mode: "either" })来改变行为（即使存在fail，也会执行完每个Effect）从而返回一个Either的array
// { mode: "validate" }会用Option去评估每一个error或faliure；success会return None，fail会return Some
