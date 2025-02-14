/*
Effectt提供了一些自己的contorl flow方法
*/

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
