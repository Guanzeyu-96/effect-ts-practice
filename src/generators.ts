// Effect.gen可以类比async/await，用于创建强可读性的Effect构造代码
// 在需要flatMap的地方使用yield*，纯函数直接=即可

import { Effect } from "effect"

// 纯函数
const addServiceCharge = (amount: number) => amount + 1

// 这是一个会出error的Effect
const applyDiscount = (
  total: number,
  discountRate: number
): Effect.Effect<number, Error> =>
  discountRate === 0
    ? Effect.fail(new Error("Discount rate cannot be zero"))
    : Effect.succeed(total - (total * discountRate) / 100)

// 模拟从数据库取数，异步Effect
const fetchTransactionAmount = Effect.promise(() => Promise.resolve(100))

// 模拟从本地文件取数，异步Effect
const fetchDiscountRate = Effect.promise(() => Promise.resolve(5))

// 用gen构造Effect
const program = Effect.gen(function*() {
  // Retrieve the transaction amount
  const transactionAmount = yield* fetchTransactionAmount

  // Retrieve the discount rate
  const discountRate = yield* fetchDiscountRate

  // Calculate discounted amount
  const discountedAmount = yield* applyDiscount(
    transactionAmount,
    discountRate
  )

  // Apply service charge
  const finalAmount = addServiceCharge(discountedAmount)

  // Return the total amount after applying the charge
  return `Final amount to charge: ${finalAmount}`
})

// Execute the program and log the result
Effect.runPromise(program).then(console.log)
// Output: Final amount to charge: 96

// 在整个Effect.gen中，第一个error会直接中止计算（这点也和flatMap是一致的）

type User = {
  readonly name: string
}

// Imagine this function checks a database or an external service
declare function getUserById(id: string): Effect.Effect<User | undefined>

function greetUser(id: string) {
  return Effect.gen(function*() {
    const user = yield* getUserById(id)

    if (user === undefined) {
      // Even though we fail here, TypeScript still thinks
      // 'user' might be undefined later
      yield* Effect.fail(`User with id ${id} not found`)
    }

    // @ts-expect-error user is possibly 'undefined'.ts(18048)
    return `Hello, ${user.name}!`
  })
}
