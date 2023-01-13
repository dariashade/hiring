import { IExecutor } from './Executor';
import ITask from './Task';

export default async function run(
  executor: IExecutor,
  queue: AsyncIterable<ITask>,
  maxThreads = 0
) {
  maxThreads = Math.max(0, maxThreads);
  /*
   * Не совсем понимаю, что нужно делать с бесконечной очередью.
   * Поставить таймаут какой-то? Или другим способом установить лимит? Или лимит не нужен?
   * В моем случае она будет бесконечно обрабатываться.
   */

  return new Promise((resolve, reject) => {
    const currentTasks = new Map<number, ITask>();
    const queueArr: ITask[] = [];

    async function nextRound() {
      try {
        for await (const task of queue) {
          if (!queueArr.includes(task)) queueArr.push(task);
        }

        if (queueArr.length === 0) resolve(true);

        for (const task of queueArr) {
          if (maxThreads && currentTasks.size >= maxThreads) break;
          if (currentTasks.has(task.targetId)) continue;

          currentTasks.set(task.targetId, task);
          let prom = executor.executeTask(task).then(() => {
            currentTasks.delete(task.targetId);
            queueArr.splice(queueArr.indexOf(task), 1);
            nextRound();
          });
        }
      } catch (err) {
        reject(err);
      }
    }

    nextRound();
  });
}
