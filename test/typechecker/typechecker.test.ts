import { expect, test } from "@jest/globals";
import { typeCheck } from "./test_utils";

test("case 1", () => {
  const code = `
  fn add(a: i32, b: i32) -> i32 {
    return a + b;
  }

  fn main() -> () {
    let result : i32 = add(20, 15);
    if result > 25 {
      let msg : str = "Big sum!";
      println(msg);
    }
    let msg : str = "small sum!";
    let msg2 : str = msg;
    println(msg); // ❌ should fail
    let mut x : i32 = 5;
    let y : i32 = 10;
    let z : &mut i32 = &mut x;
    let w : i32 = *z;
  }
  `;
  expect(typeCheck(code)).toEqual(`Cannot use moved value: 'msg'`);
});

test("case 2", () => {
  const code = `
fn main() -> () {
  let s1: str = "hello";
  let s2: str = s1; // ownership moved

  println(s2);
  // println(s1); // ❗️ Would cause error if uncommented
}
`;
  expect(typeCheck(code)).toEqual(`fn() -> ()`);
});

test("case 3", () => {
  const code = `
  fn main() -> () {
    let a : i32 = 10;
    let b : i32 = 20;
    let c : i32 = a + b;
    println(c);
  }
`;
  expect(typeCheck(code)).toEqual(`fn() -> ()`);
});

test("case 4", () => {
  const code = `
  fn factorial(n: i32) -> i32 {
    if n <= 1 {
      return 1;
    } else {
      return n * factorial(n - 1);
    }
  }

  fn main() -> () {
    let result : i32 = factorial(5);
    println(result);
  }
  `;
  expect(typeCheck(code)).toEqual(`fn() -> ()`);
});

test("case 5", () => {
  const code = `
  fn main() -> () {
    let mut a : i32 = 5;
    a = 10;
    let b : i32 = 5;
    // b = 10; // This should cause a type error
    println(a);
  }
  `;
  expect(typeCheck(code)).toEqual(`fn() -> ()`);
});

test("case 6", () => {
  const code = `
  fn main() -> (){
    let mut x: i32 = 10;

    let r1: &i32 = &x;      // immutable borrow
    let r2: &mut i32 = &mut x; // ❌ ERROR: cannot borrow x as mutable because it's already borrowed as immutable

    println(r1);
  }
  `;
  expect(typeCheck(code)).toEqual(`Cannot borrow 'x' as mutable because it is also borrowed as immutable`);
});

test("case 7", () => {
  const code = `
  fn main() -> () {
    let mut x: i32 = 42;
    let r: &mut i32 = &mut x; // mutable borrow of x

    println(x); // ❌ ERROR: cannot use x because it is borrowed as mutable
    *r = 1;
  }
  `;
  expect(typeCheck(code)).toEqual(`Cannot call with 'x' because it is borrowed`);
});

test("case 8", () => {
  const code = `
  fn main() -> () {
    let mut x: i32 = 7;

    let r1: &mut i32 = &mut x;
    let r2: &mut i32 = &mut x; // ❌ ERROR: cannot borrow x as mutable more than once at a time

    *r1 = 1;
    *r2 = 1;
  }
  `;
  expect(typeCheck(code)).toEqual(`Cannot borrow 'x' as mutable more than once at a time`);
});

test("case 9", () => {
  const code = `
  fn get_ref() -> &i32 { // ❌ ERROR: returns a reference to local variable
    let x: i32 = 5;
    return &x; // x is dropped here, reference would dangle
  }
  `;
  expect(typeCheck(code)).toEqual(`Cannot return potential dangling reference to '&x'`);
});

test("case 10", () => {
  const code = `
  fn main() -> (){
    let x: i32 = 100;

    let r1: &i32 = &x;
    let r2: &i32 = &x;

    println(r1); // ok: multiple readers allowed
    println(r2); 
  }
  `;
  expect(typeCheck(code)).toEqual(`fn() -> ()`);
});

test("case 11", () => {
  const code = `
fn main() -> () {
  let mut x: i32 = 10;

  {
      let r1: &i32 = &x;
      println(r1); // first borrow immutable
  } // r1 ends here

  {
      let r2: &mut i32 = &mut x;
      *r2 = 5;
      println(r2); // second borrow mutable
  }
  // r2 ends here
  println(x); // x can be used again
}
`;
  expect(typeCheck(code)).toEqual(`fn() -> ()`);
});

test("case 12", () => {
  const code = `
  fn increment(x: &mut i32) -> (){
    *x = *x + 1;
  }

  fn main() -> () {
      let mut value: i32 = 7;
      increment(&mut value); // pass by mutable reference should be ok
      println(value);
  }
  `;
  expect(typeCheck(code)).toEqual(`fn() -> ()`);
});

test("case 13", () => {
  const code = `
fn main() -> () {
  let x: bool = true;
  println(x);
}
`;
  expect(typeCheck(code)).toEqual(`fn() -> ()`);
});

test("case 14", () => {
  const code = `
fn judge(cond: bool) -> i32 {
  if cond {
    return 1;
  } else {
    return 2;
  }
}

fn main() -> () {
  let condition: bool = true;
  let result: i32 = judge(condition);
  println(result);
}
`;
  expect(typeCheck(code)).toEqual(`fn() -> ()`);
});

test("case 15", () => {
  const code = `
fn judge(cond: bool) -> i32 {
  if cond {
    return 1;
  } else {
    return "abc"; // ❌ ERROR: return type inconsistent
  }
}

fn main() -> () {
  let condition: bool = true;
  let result: i32 = judge(condition);
  println(result);
}
`;
  expect(typeCheck(code)).toEqual(`Return type 'str' doesn't match function return type 'i32'`);
});

test("case 16", () => {
  const code = `
fn main() -> () {
  let mut count: i32 = 0;

  while count < 5 {
      println(&count); // We used stricter move checking. Here we must pass by reference
      count = count + 1;
  }
}`;
  expect(typeCheck(code)).toEqual(`fn() -> ()`);
});

test("case 17", () => {
  const code = `
fn main() -> () {
  let count: i32 = 0; // ❌ ERROR: count is immutable

  while count < 5 {
      println(&count); // We used stricter move checking. Here we must pass by reference
      count = count + 1;
  }
}`;
  expect(typeCheck(code)).toEqual(`Cannot assign to immutable variable 'count'`);
});

test("case 18", () => {
  const code = `
fn main() -> () {
  let mut count: i32 = 0;

  while count { // ❌ ERROR: condition must be a boolean
      println(&count); // We used stricter move checking. Here we must pass by reference
      count = count + 1;
  }
}
`;
  expect(typeCheck(code)).toEqual(`While condition must be a boolean, got 'i32'`);
});

test("case 19", () => {
  const code = `
fn main() -> () {
  let x: i32 = 10;
  let y: i32 = x; // copy, not move, ok

  println(x);
  println(y);
}
`;
  expect(typeCheck(code)).toEqual(`fn() -> ()`);
});

test("case 20", () => {
  const code = `
fn consume(s: str) -> () {
  println(s);
}

fn main() -> () {
  let msg: str = "hello";
  consume(msg);
  println(msg); // ❌ ERROR: use of moved value
}
`;
  expect(typeCheck(code)).toEqual(`Cannot use moved value: 'msg'`);
});

test("case 21", () => {
  const code = `
fn read(s: &str) -> () {
  println(s);
}

fn main() -> () {
  let data: str = "borrowed";
  read(&data); // pass by immutable reference is ok
  println(data);
}
`;
  expect(typeCheck(code)).toEqual(`fn() -> ()`);
});

test("case 22", () => {
  const code = `
fn main() -> () {
  let mut s: str = "conflict";

  let r1: &str = &s;
  let r2: &mut str = &mut s; // ❌ ERROR: cannot borrow as mutable while immutable borrow exists

  println(r2);
}
`;
  expect(typeCheck(code)).toEqual(`Cannot borrow 's' as mutable because it is also borrowed as immutable`);
});

test("case 23", () => {
  const code = `
fn main() -> () {
  let condition: bool = true;
  let mut message: str = "default"; // default value

  if condition {
      let s1: str = "hello from if";
      message = s1; // ownership moves here
  } else {
      let s2: str = "hello from else";
      message = s2; // same here
  }
  println(message); // ownership is consistent
}
`;
  expect(typeCheck(code)).toEqual(`fn() -> ()`);
});

test("case 24", () => {
  const code = `
fn main() -> () {
  let condition: bool = true;

  let s1: str = "owned";
  let mut s2: str = "default"; // default value

  if condition {
      s2 = s1; // ownership moves here
  }

  println(s1); // ❌ ERROR: use of moved value
}
`;
  expect(typeCheck(code)).toEqual(`Cannot use moved value: 's1'`);
});

test("case 25", () => {
  const code = `
fn main() -> () {
  let mut count: i32 = 0;
  let msg: str = "looping";

  while count < 3 {
      println(&count);
      println(&msg); // borrowed, not moved
      count = count + 1;
  }

  println(&msg); // still accessible
}
`;
  expect(typeCheck(code)).toEqual(`fn() -> ()`);
});

test("case 26", () => {
  const code = `
  fn main() -> () {
  let mut msg: str = "hello";
  let mut i: i32 = 0;

  while i < 1 {
      let taken: str = msg; // ownership moved
      println(taken);
      i = i + 1;
  }

  println(msg); // ❌ ERROR: value moved
}
`;
  expect(typeCheck(code)).toEqual(`Cannot use moved value: 'msg'`);
});

test("case 27", () => {
  const code = `
fn main() -> () {
  let mut x: i32 = 5;
  let y: i32 = x;  // copy, not move, ok

  if x < y {
      println(y);
  } else {
      println(x);
  }
}
`;
  expect(typeCheck(code)).toEqual(`fn() -> ()`);
});

test("case 28", () => {
  const code = `
let x: i32 = 5;

fn main() -> () {
  println(x);
}
`;
  expect(typeCheck(code)).toEqual(`fn() -> ()`);
});

test("case 29", () => {
  const code = `
let mut x: i32 = 5;

fn main() -> () {
  let y: i32 = x;
  x = 10;
  println(x);
}
`;
  expect(typeCheck(code)).toEqual(`fn() -> ()`);
});

test("case 30", () => {
  const code = `
fn main() -> () {
  let mut x: i32 = 5;
  let y: &i32 = &mut x;  // Mutable borrow of x
  x = 6;       // ❌ ERROR: Cannot modify x while it's borrowed mutably
  println(y);
}
`;
  expect(typeCheck(code)).toEqual(`Cannot assign to 'x' because it is borrowed`);
});

test("case 31", () => {
  const code = `
fn main() -> () {
  let mut x: i32 = 5;
  let y: &i32 = &x;  // Immutable borrow of x
  x = 6;       // ❌ ERROR: Cannot modify x while it's borrowed immutably
  println(y);
}
`;
  expect(typeCheck(code)).toEqual(`Cannot assign to 'x' because it is borrowed`);
});

test("case 32", () => {
  const code = `
  fn some_function(x: &mut i32) -> () {
    println(x);
  }

  fn main() -> () {
    let mut value: i32 = 10;
    some_function(&mut value); // Pass by mutable reference
    println(value); // value is still accessible
  }
`;
  expect(typeCheck(code)).toEqual(`fn() -> ()`);
});

test("case 33", () => {
  const code = `
  fn some_function(x: &i32) -> () {
    println(x);
  }

  fn main() -> () {
    let mut value: i32 = 10;
    some_function(&value); // Pass by immutable reference
    println(value); // value is still accessible
  }
`;
  expect(typeCheck(code)).toEqual(`fn() -> ()`);
});

test("case 34", () => {
  const code = `
  fn some_function(x: &i32) -> () {
    println(x);
  }

  fn main() -> () {
    let mut value: i32 = 10;
    let y: &i32 = &value; // Immutable borrow
    some_function(&value); // ❌ ERROR! parameter cannot be borrowed
    println(value); 
  }
`;
  expect(typeCheck(code)).toEqual(`Cannot call with 'value' because it is borrowed`);
});

test("case 35", () => {
  const code = `
  fn main() -> () {
    let mut a : i32 = 5;
    a = 10;
    let b : i32 = 5;
    b = 10; //  ❌ This should cause a type error
    println(a);
  }
  `;
  expect(typeCheck(code)).toEqual(`Cannot assign to immutable variable 'b'`);
});