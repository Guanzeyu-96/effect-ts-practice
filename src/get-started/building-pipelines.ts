/*
pipeline指的是如何将Effect串起来
例如fp ts的pipe和Do notation
*/

import { Effect, Option, pipe } from "effect"

// 1. pipe
// effect的pipe和fp ts一样

// Define simple arithmetic operations
const increment = (x: number) => x + 1
const double = (x: number) => x * 2
const subtractTen = (x: number) => x - 10

// Sequentially apply these operations using `pipe`
const result = pipe(5, increment, double, subtractTen)

console.log(result)
// Output: 2

// 2. map
// 和fp ts的Monad.map也是一样的

// Function to add a small service charge to a transaction amount
const addServiceCharge = (amount: number) => amount + 1

// Simulated asynchronous task to fetch a transaction amount from database
const fetchTransactionAmount = Effect.promise(() => Promise.resolve(100))

// Apply service charge to the transaction amount
const finalAmount = pipe(
  fetchTransactionAmount,
  Effect.map(addServiceCharge)
)

// Effect上是定义了pipe了的，一定程度上可以写的像scala一样
fetchTransactionAmount.pipe(Effect.map(addServiceCharge))

Effect.runPromise(finalAmount).then(console.log) // Output: 101

// 3. as
// 直接替换Effect中的右值。注意Effect是immutable的，所以这个操作是创建了一个新的Effect

// Replace the value 5 with the constant "new value"
const program = pipe(Effect.succeed(5), Effect.as("new value"))

Effect.runPromise(program).then(console.log) // Output: "new value"

// 4. flatMap
// 也和其他fp框架一致

// Function to apply a discount safely to a transaction amount
const applyDiscount = (
  total: number,
  discountRate: number
): Effect.Effect<number, Error> =>
  discountRate === 0
    ? Effect.fail(new Error("Discount rate cannot be zero"))
    : Effect.succeed(total - (total * discountRate) / 100)

// Simulated asynchronous task to fetch a transaction amount from database
const fetchTransactionAmount2 = Effect.promise(() => Promise.resolve(100))

// Chaining the fetch and discount application using `flatMap`
const finalAmount2 = pipe(
  fetchTransactionAmount2,
  Effect.flatMap((amount) => applyDiscount(amount, 5))
)

Effect.runPromise(finalAmount2).then(console.log)
// Output: 95

// 5. andThen
// 感觉像是map和flatMap的智能版？
// 用于Effect的链式计算
// andThen和Option，Either配合很好，体现在可以自动union error type上

// Function to apply a discount safely to a transaction amount
const applyDiscount5 = (
  total: number,
  discountRate: number
): Effect.Effect<number, Error> =>
  discountRate === 0
    ? Effect.fail(new Error("Discount rate cannot be zero"))
    : Effect.succeed(total - (total * discountRate) / 100)

// Simulated asynchronous task to fetch a transaction amount from database
const fetchTransactionAmount5 = Effect.promise(() => Promise.resolve(100))

// Using Effect.map and Effect.flatMap
const result1 = pipe(
  fetchTransactionAmount5,
  Effect.map((amount) => amount * 2),
  Effect.flatMap((amount) => applyDiscount5(amount, 5))
)

Effect.runPromise(result1).then(console.log) // Output: 190

// Using Effect.andThen
const result2 = pipe(
  fetchTransactionAmount5,
  Effect.andThen((amount) => amount * 2),
  Effect.andThen((amount) => applyDiscount5(amount, 5))
)

Effect.runPromise(result2).then(console.log) // Output: 190

// Simulated asynchronous task fetching a number from a database
const fetchNumberValue = Effect.tryPromise(() => Promise.resolve(42))

//      ┌─── Effect<number, UnknownException | NoSuchElementException, never>
//      ▼
const program5 = pipe(
  fetchNumberValue,
  // option是一种特殊的Effect
  Effect.andThen((x) => (x > 0 ? Option.some(x) : Option.none()))
)

// 6. tap
// 类似于kotlin also，或者fp ts的chainFirst，可以在Effect执行的时候执行一些side effect，例如打log

// 7. all
// Effect.all([effect1, effect2, ...])
// 可用于构造一组Effect，会在执行计算的时候线性计算，并在第一个fail出现的时候中止计算
// 如果不使用Effect.gen的话，当需要结合多个Effect来构造计算的时候就需要用到all
