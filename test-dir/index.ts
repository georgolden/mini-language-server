export const add = (a: number, b: number) => a + b;

export const subtract = (a: number, b: number) => a - b;

export const multiply = (a: number, b: number) => a * b;

export const divide = (a: number, b: number) => a / b;

// i want to try this:
//
// 1: get user prompt (any complexity)
// 2: eval code and what we will need to adjust
// 3: ask for follow up if have questions or smth is unclear
// 4: code writing ->
//    4.1: get position where you want to put your code
//    4.2: get available symbols
//    4.3: attach snippet
//      4.3.1: sub validation (linting and typechecking)
//    4.4: validate (if output is correct)
//      4.4.1: optional debug (debug process might be complex)
// 5: High level validation
// 6: if needed goto step 2
// 7: Profit!
//
//
// lets try to ask it to build calculator haha :D
