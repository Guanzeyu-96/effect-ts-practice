// Effect提供了创建以及handle unexpected error的方法

import { Effect } from "effect"

// Effect.die
// 执行到这个effect会立即终止fiber，从而从类型上，Effect的第二类型参数是never

const divide = (a: number, b: number) => {
  if (b === 0) {
    return Effect.die(new Error("Division by zero"))
  }
  return Effect.succeed(a / b)
}

Effect.runPromise(divide(1, 0)).catch((error) => {
  console.log(error)
})

// dieMessage: throw一个runtimeException

const divideDieMessage = (a: number, b: number) => {
  if (b === 0) {
    return Effect.dieMessage("Division by zero")
  }
  return Effect.succeed(a / b)
}

// convert failure to defects
// 转换过后error类型会被移除

// orDie

const divideWithError = (a: number, b: number) =>
  Effect.suspend(() => {
    if (b === 0) {
      return Effect.fail("Division by zero")
    }
    return Effect.succeed(a / b)
  })

// Effect.Effect<number, never, never>
const programOrDie = Effect.orDie(divideWithError(1, 0))

// orDieWith: 对比orDie可以提供一个callback来转化error
const programOrDieWith = Effect.orDieWith(
  divideWithError(1, 0),
  (error) => new Error(error)
)

// catching defects
// defects从设计上是不应该被recover的，这一部分的function应该仅在Effect与外部系统的边界被使用
