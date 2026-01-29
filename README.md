# @normed/promise-pool

Execute async tasks with concurrency control and configurable error handling.

## Installation

```bash
npm install @normed/promise-pool
# or
yarn add @normed/promise-pool
```

## Usage

```typescript
import { PromisePool } from "@normed/promise-pool";

await PromisePool({
  concurrency: 5,
  count: 100,
  task: async (index) => {
    await processItem(index);
  },
  onError: "continue",
});
```

## API

### `PromisePool(options)`

#### Options

| Option        | Type                               | Description                              |
| ------------- | ---------------------------------- | ---------------------------------------- |
| `concurrency` | `number`                           | Maximum number of concurrent tasks       |
| `count`       | `number`                           | Total number of tasks to execute         |
| `task`        | `(index: number) => Promise<void>` | Async function to execute for each index |
| `onError`     | `'abort' \| 'drain' \| 'continue'` | Error handling strategy                  |

#### Error Handling Strategies

| Strategy   | Behavior                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------- |
| `abort`    | Stop immediately on first error, reject with that error                                     |
| `drain`    | Stop starting new tasks, wait for in-flight tasks to complete, reject with `AggregateError` |
| `continue` | Process all tasks regardless of errors, reject with `AggregateError` if any failed          |

## License

MIT
