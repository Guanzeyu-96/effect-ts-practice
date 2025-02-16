// Effect用第二个类型参数track expected errors

import { Cause, Effect, Either, Option, Random } from "effect"

// 对Error的建模没有要求，但注意到这里readonly _tag，后续Effect提供了Effect.catchTag的方式来进行方便的tracking
class HttpError {
  readonly _tag = "HttpError"
}

class ValidationError {
  readonly _tag = "ValidationError"
}

type AppError = HttpError | ValidationError

// Effect.Effect<string, HttpError, never>
const program = Effect.gen(function*() {
  const n = yield* Random.next

  // 模拟可能失败的http call
  if (n > 0.5) {
    yield* Effect.fail(new HttpError())
  }
  return "some result"
})

// effect会将Error type自动推断为所有ErrorType的union

//      ┌─── Effect<string, HttpError | ValidationError, never>
//      ▼
const program2: Effect.Effect<string, AppError, never> = Effect.gen(function*() {
  // Generate two random numbers between 0 and 1
  const n1 = yield* Random.next
  const n2 = yield* Random.next

  // Simulate an HTTP error
  if (n1 < 0.5) {
    yield* Effect.fail(new HttpError())
  }
  // Simulate a validation error
  if (n2 < 0.5) {
    yield* Effect.fail(new ValidationError())
  }

  return "some result"
})

// 值得注意在Effect的gen，flatMap，andThen，map等方法中，错误处理都是Short-Circuiting的（快速失败）

// 设计上，如果需要catch all error，那么需要使用Either monad（这也和其他fp语言一致）
// Effect<A, E, R> -> Effect<Either<A, E>, never, R>

// Either处理error示例

// 从而error type被推断成never
const recovered = Effect.gen(function*() {
  // Effect.either可以直接将Effect封装成Effect<Either<A, E>, never, R>
  const failOrResult = yield* Effect.either(program2)
  // 类似于fold，但是可读性更强
  failOrResult.pipe(Effect.match({
    onFailure: (err) => `Recover by ${err}`,
    onSuccess: (res) => res
  }))
})

// option：封装Effect成Effect.Effect<Option<never>, never, never>

const maybe = Effect.option(Effect.fail("Oh"))

// catchAll
// 可以类比recover，接callback function只处理recovered failure，不能处理unrecovered

const recoveredCatchAll = program2.pipe(
  Effect.catchAll((error) => Effect.succeed(`Recovering from ${error._tag}`))
)

// catchAllCause
// 可以catch到unrecovered error - 用途比较少，因为exception一般情况下不应该被recover

program2.pipe(
  Effect.catchAllCause((cause) =>
    Cause.isFailType(cause)
      ? Effect.succeed("Recovered from a regular error")
      : Effect.succeed("Recovered from a defect")
  )
)

// either也可以用pattren match来catch一部分error
// 其实就是用condition处理掉其中一种Error，类型推断系统会成功收缩类型范围。如果所有error都被handle的话，Error会推断成never

// const recoverPartialEither: Effect.Effect<string, ValidationError, never>
const recoverPartialEither = Effect.gen(function*() {
  const failOrSuccess = yield* Effect.either(program2)

  if (Either.isLeft(failOrSuccess)) {
    const error = failOrSuccess.left
    if (error._tag == "HttpError") {
      return "Recover from HttpError"
    } else {
      // rethrow Validation Error
      return yield* Effect.fail(error)
      // return "Recover from ValidationError"
    }
  } else {
    return failOrSuccess.right
  }
})

// catchSome: 对比catchAll，允许handle一部分的error。参数的lambda返回值类型是Option
// 但是对比either来说，无法做到类型推断的收缩

// Effect.Effect<string, AppError, never>
const recoverCatchSome = program2.pipe(Effect.catchSome((error) => {
  if (error._tag === "HttpError") {
    return Option.some(Effect.succeed("Recover from HttpError"))
  } else {
    return Option.none()
  }
}))

// catchIf
// 一参接对error的predict。二参定义recovery effect

// Effect.Effect<string, ValidationError, never> (能看出来还是成功进行了类型收缩，但它的类型收缩在TS5.5以后才可以)
// 即使是5.5以前的版本也可以通过提供自定义type guard来解决这个问题
const recoverCatchIf = program2.pipe(Effect.catchIf(
  (error): error is HttpError => error._tag === "HttpError",
  () => Effect.succeed("Recovered from HttpError")
))

// catchTag 针对有tag field的catch
// 必须有readonly的_tag field

const recoverCatchTag = program2.pipe(
  Effect.catchTag("HttpError", (HttpError) => Effect.succeed(`Recover from ${HttpError}`))
)

// catchTags catchTag的multiple版

const recoverCatchTags = program2.pipe(
  Effect.catchTags({
    HttpError: (_HttpError) => Effect.succeed("Recover from HttpError"),
    ValidationError: (_ValidationError) => Effect.succeed("Recover from ValidationError")
  })
)
