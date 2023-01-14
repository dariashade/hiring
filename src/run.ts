import { rejects } from 'assert';
import { IExecutor } from './Executor';
import ITask from './Task';

export default async function run(
  executor: IExecutor,
  queue: AsyncIterable<ITask>,
  maxThreads = 0
) {
  maxThreads = Math.max(0, maxThreads);

  return new Promise(resolve => {
    const currentTasks = new Set<number>();
    const localQueue: ITask[] = [];

    async function fillLocalQueue() {
      let counter = localQueue.length ? localQueue.length - 1 : 0;

      for await (const task of queue) {
        localQueue.push(task);

        counter++;
        if (maxThreads && counter >= maxThreads) break;
      }

      localQueue.length ? nextRound() : resolve(true);
    }

    function nextRound() {
      const processedTasks = [];
      for (const task of localQueue) {
        if (maxThreads && currentTasks.size >= maxThreads) break;
        if (currentTasks.has(task.targetId)) continue;

        currentTasks.add(task.targetId);
        processedTasks.push(
          new Promise(resolve =>
            executor.executeTask(task).then(() => {
              currentTasks.delete(task.targetId);
              localQueue.splice(localQueue.indexOf(task), 1);
              resolve(true);
            })
          )
        );
        Promise.all(processedTasks).then(() => fillLocalQueue());
      }
    }

    fillLocalQueue();
  });
}
