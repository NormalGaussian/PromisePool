import { describe, it } from "node:test";
import assert from "node:assert";
import { PromisePool } from "./PromisePool";

describe("PromisePool", () => {
  describe("basic functionality", () => {
    it("should process all tasks with concurrency limit", async () => {
      const calls: number[] = [];
      let maxConcurrent = 0;
      let currentConcurrent = 0;

      const task = async (index: number) => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
        calls.push(index);
        await new Promise((r) => setTimeout(r, 10));
        currentConcurrent--;
      };

      const count = 6;
      const concurrency = 2;

      await PromisePool({ concurrency, count, task, onError: "abort" });

      assert.strictEqual(calls.length, count);
      assert.ok(maxConcurrent <= concurrency);

      for (let i = 0; i < count; i++) {
        assert.strictEqual(calls.filter((c) => c === i).length, 1);
      }
    });

    it("should handle count of 0", async () => {
      let callCount = 0;
      const task = async () => {
        callCount++;
      };

      await PromisePool({ concurrency: 2, count: 0, task, onError: "abort" });

      assert.strictEqual(callCount, 0);
    });

    it("should handle concurrency larger than count", async () => {
      const calls: number[] = [];
      const task = async (index: number) => {
        calls.push(index);
      };

      await PromisePool({ concurrency: 10, count: 3, task, onError: "abort" });

      assert.strictEqual(calls.length, 3);
    });
  });

  describe("onError: abort", () => {
    it("should stop immediately on first error", async () => {
      const calls: number[] = [];

      const task = async (index: number) => {
        calls.push(index);
        await new Promise((r) => setTimeout(r, 10));
        if (index === 1) {
          throw new Error("Test error");
        }
      };

      await assert.rejects(
        PromisePool({ concurrency: 2, count: 10, task, onError: "abort" }),
        { message: "Test error" },
      );

      assert.ok(calls.length < 10);
    });

    it("should reject with the first error (not AggregateError)", async () => {
      const error = new Error("First error");

      const task = async (index: number) => {
        if (index === 0) {
          throw error;
        }
      };

      await assert.rejects(
        PromisePool({ concurrency: 2, count: 5, task, onError: "abort" }),
        (err) => err === error,
      );
    });
  });

  describe("onError: drain", () => {
    it("should stop starting new tasks but wait for ongoing to complete", async () => {
      const completed: number[] = [];
      const started: number[] = [];

      const task = async (index: number) => {
        started.push(index);
        await new Promise((r) => setTimeout(r, index === 0 ? 50 : 10));
        if (index === 1) {
          throw new Error(`Error at ${index}`);
        }
        completed.push(index);
      };

      await assert.rejects(
        PromisePool({ concurrency: 2, count: 10, task, onError: "drain" }),
        (err) => err instanceof AggregateError,
      );

      assert.ok(completed.includes(0));
      assert.strictEqual(started.length, 2);
    });

    it("should return AggregateError with all errors from ongoing tasks", async () => {
      const task = async (index: number) => {
        await new Promise((r) => setTimeout(r, 10));
        if (index < 2) {
          throw new Error(`Error at ${index}`);
        }
      };

      try {
        await PromisePool({
          concurrency: 2,
          count: 10,
          task,
          onError: "drain",
        });
        assert.fail("Should have thrown");
      } catch (e) {
        assert.ok(e instanceof AggregateError);
        assert.ok((e as AggregateError).errors.length >= 1);
      }
    });
  });

  describe("onError: continue", () => {
    it("should continue processing all tasks despite errors", async () => {
      const calls: number[] = [];

      const task = async (index: number) => {
        calls.push(index);
        await new Promise((r) => setTimeout(r, 5));
        if (index === 2 || index === 5) {
          throw new Error(`Error at ${index}`);
        }
      };

      await assert.rejects(
        PromisePool({ concurrency: 2, count: 8, task, onError: "continue" }),
        (err) => err instanceof AggregateError,
      );

      assert.strictEqual(calls.length, 8);
    });

    it("should return AggregateError with all collected errors", async () => {
      const task = async (index: number) => {
        await new Promise((r) => setTimeout(r, 5));
        if (index % 2 === 0) {
          throw new Error(`Error at ${index}`);
        }
      };

      try {
        await PromisePool({
          concurrency: 3,
          count: 6,
          task,
          onError: "continue",
        });
        assert.fail("Should have thrown");
      } catch (e) {
        assert.ok(e instanceof AggregateError);
        const aggError = e as AggregateError;
        assert.strictEqual(aggError.errors.length, 3);
        assert.strictEqual(aggError.message, "3 task(s) failed");
      }
    });

    it("should resolve successfully if no errors occur", async () => {
      const calls: number[] = [];

      const task = async (index: number) => {
        calls.push(index);
      };

      await PromisePool({
        concurrency: 2,
        count: 5,
        task,
        onError: "continue",
      });

      assert.strictEqual(calls.length, 5);
    });
  });

  describe("edge cases", () => {
    it("should handle synchronous tasks", async () => {
      const calls: number[] = [];

      const task = async (index: number) => {
        calls.push(index);
      };

      await PromisePool({ concurrency: 2, count: 5, task, onError: "abort" });

      assert.strictEqual(calls.length, 5);
    });

    it("should handle concurrency of 1 (sequential)", async () => {
      const order: number[] = [];

      const task = async (index: number) => {
        order.push(index);
        await new Promise((r) => setTimeout(r, 5));
      };

      await PromisePool({ concurrency: 1, count: 5, task, onError: "abort" });

      assert.deepStrictEqual(order, [0, 1, 2, 3, 4]);
    });

    it("should handle errors on first task", async () => {
      const task = async (index: number) => {
        if (index === 0) throw new Error("First task error");
      };

      await assert.rejects(
        PromisePool({ concurrency: 2, count: 5, task, onError: "abort" }),
        { message: "First task error" },
      );
    });

    it("should handle errors on last task with continue mode", async () => {
      const calls: number[] = [];

      const task = async (index: number) => {
        calls.push(index);
        if (index === 4) {
          throw new Error("Last task error");
        }
      };

      try {
        await PromisePool({
          concurrency: 2,
          count: 5,
          task,
          onError: "continue",
        });
        assert.fail("Should have thrown");
      } catch (e) {
        assert.ok(e instanceof AggregateError);
        assert.strictEqual(calls.length, 5);
      }
    });
  });
});
