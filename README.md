# YQueue

Yet another concurrent priority task queue, yay!

## Install

```bash
npm install yqueue
```

## Features

- Concurrency control
- Prioritized tasks
- Error handling for batch tasks
- Best effort for error stack trace
- Work with async hooks

## API

### YQueue(options?)

Returns a new `queue` instance.

#### options

Type: `object`

##### concurrency

Type: `number`\
Default: `10`\
Minimum: `1`

Concurrency limit.

### queue

`YQueue` instance.

#### .run(fn, options?)

Adds a sync or async task to the queue. Always returns a promise.

Note: If your items can potentially throw an exception, you must handle those errors from the returned Promise or they may be reported as an unhandled Promise rejection and potentially cause your process to exit immediately.

##### fn

Type: `Function`

Promise-returning/async function.

#### options

Type: `object`

##### priority

Type: `number`\
Default: `0`

Priority of operation. Operations with greater priority will be scheduled first.

#### .add(fn, options?)

Adds a sync or async task to the queue. The only difference from `run` is that it returns nothing.

#### .onIdle()

Returns a promise that settles when the queue becomes empty, and all promises have completed.

#### .onQueueSizeLessThan(limit)

Returns a promise that settles when the queue size is less than the given limit.

If you want to avoid having the queue grow beyond a certain size you can `await queue.onQueueSizeLessThan(size)` before adding a new item.

Note that this only limits the number of items waiting to start. There could still be up to `concurrency` jobs already running that this call does not include in its calculation.

### YBatch(options?)

Returns a new `batch` instance.

#### options

Type: `object`

##### concurrency

Type: `number`\
Default: `10`\
Minimum: `1`

Concurrency limit.

##### maxQueueLength

Type: `number`\
Default: the value of `concurrency`\
Minimum: `1`

Wait until queue size is less than this limit before adding new tasks.

### batch

`YBatch` instance.

#### .add(fn, options?)

Adds a sync or async task to the batch. Always returns a promise, which will be settled once the queue size is less than `maxQueueLength` limit and the task added to the queue.

##### fn

Type: `Function`

Promise-returning/async function.

#### options

Type: `object`

##### priority

Type: `number`\
Default: `0`

Priority of operation. Operations with greater priority will be scheduled first.

#### .failFast()

Returns a promise that settles when any of the tasks throws an error or all tasks have completed.

#### .allSettled(limit)

Returns a promise that settles when all tasks have completed, all promise rejections from the tasks will be wrapped as a `YBatchErrors` class, which put all errors in the `errors` field.
