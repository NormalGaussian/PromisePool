# Changelog

## 1.0.1

Adds prettier and formats the codebase.

## 1.0.0

This package is a fork of `@numbereight/synchronisation`. The license remains unchanged (MIT).

### Changes from upstream

- Extracted and renamed `PromisePoolBarrier` to `PromisePool`
- Removed `Barrier`, `PromiseBarrier`, and `Periodically` utilities
- Removed external dependencies (`@numbereight/logging`, `@numbereight/utils`, `luxon`)
- Renamed parameters for clarity:
  - `poolsize` → `concurrency`
  - `barriersize` → `count`
  - `start` → `task`
- Added configurable error handling via `onError` option:
  - `'abort'`: Stop immediately on first error, reject with that error
  - `'drain'`: Stop starting new tasks, wait for in-flight tasks, reject with `AggregateError`
  - `'continue'`: Process all tasks regardless of errors, reject with `AggregateError` if any failed
- Exported TypeScript types: `OnError`, `PromisePoolOptions`
- Handle edge case when `count` is 0
