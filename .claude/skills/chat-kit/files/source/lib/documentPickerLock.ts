/**
 * expo-document-picker rejects concurrent getDocumentAsync calls ("Different document picking in progress").
 * Serialize native document picking app-wide.
 */
let chain: Promise<unknown> = Promise.resolve();

export function enqueueDocumentPick<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(() => fn());
  chain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}
