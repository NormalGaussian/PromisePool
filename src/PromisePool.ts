/**
 * Error handling strategy:
 * - 'abort': Stop immediately when the first error occurs, reject with that error
 * - 'drain': Stop starting new tasks on error, wait for ongoing to complete, then throw AggregateError
 * - 'continue': Continue processing all tasks regardless of errors, then throw AggregateError if any errors
 */
export type OnError = 'abort' | 'drain' | 'continue';

export interface PromisePoolOptions {
  /** Maximum number of concurrent promises */
  concurrency: number;
  /** Total number of tasks to process */
  count: number;
  /** Function to execute for each task index */
  task(index: number): Promise<void>;
  /** How to handle errors */
  onError: OnError;
}

/**
 * Executes async tasks with a concurrency limit.
 *
 * @param options - Configuration options for the pool
 * @returns Promise that resolves when all tasks complete, or rejects based on onError strategy
 */
export async function PromisePool({
  concurrency,
  count,
  task,
  onError,
}: PromisePoolOptions): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let completed = 0;
    let ongoing = 0;
    let started = 0;
    let ended = false;
    let draining = false;
    const errors: Error[] = [];

    function checkCompletion(): void {
      if (ended) {
        return;
      }

      const finished = completed + errors.length;
      const allStartedFinished = started === finished + ongoing && ongoing === 0;
      const allTasksCompleted = completed >= count;

      if (allTasksCompleted || (draining && allStartedFinished)) {
        ended = true;
        if (errors.length > 0) {
          reject(new AggregateError(errors, `${errors.length} task(s) failed`));
        } else {
          resolve();
        }
      }
    }

    function trigger(): void {
      if (ended) {
        return;
      }

      if (completed >= count) {
        checkCompletion();
        return;
      }

      if (draining) {
        checkCompletion();
        return;
      }

      if (completed + ongoing >= count) {
        return;
      }

      if (ongoing < concurrency) {
        const index = started;
        started += 1;
        ongoing += 1;

        task(index).then(
          () => {
            ongoing -= 1;
            completed += 1;
            trigger();
          },
          (e: Error) => {
            ongoing -= 1;
            errors.push(e);

            switch (onError) {
              case 'abort':
                if (!ended) {
                  ended = true;
                  reject(e);
                }
                break;

              case 'drain':
                draining = true;
                checkCompletion();
                break;

              case 'continue':
                completed += 1;
                trigger();
                break;
            }
          },
        );

        trigger();
      }
    }

    for (let i = 0; i < concurrency && i < count; i++) {
      trigger();
    }

    if (count === 0) {
      resolve();
    }
  });
}
