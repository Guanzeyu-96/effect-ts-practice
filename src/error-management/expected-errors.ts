// Effect用第二个类型参数track expected errors

import { Effect, Random } from "effect"

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
