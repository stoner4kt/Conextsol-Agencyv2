/**
 * useAsyncAction — wraps any async callback with:
 *   - loading state (for button disabled/spinner)
 *   - success toast on completion
 *   - error toast on thrown error
 *   - double-submit prevention
 *
 * Usage:
 *   const { execute, isLoading } = useAsyncAction(onSaveClient, {
 *     successMsg: 'Client saved successfully',
 *     errorMsg: 'Failed to save client',   // optional fallback
 *   });
 *
 *   <button onClick={() => execute(clientPayload)} disabled={isLoading}>
 *     {isLoading ? 'Saving...' : 'Save Client'}
 *   </button>
 *
 * The successMsg / errorMsg can also be a function that receives the
 * resolved value / error, for dynamic messages:
 *   successMsg: (result) => `Invoice ${result.invoice_number} saved`
 */
import { useCallback, useRef, useState } from 'react';
import { notify } from '../lib/notify';

type MsgOrFn<T> = string | ((value: T) => string);

interface UseAsyncActionOptions<T> {
  successMsg: MsgOrFn<T>;
  errorMsg?: MsgOrFn<Error>;
  /** If true, skip the success toast (for fire-and-forget side effects) */
  silent?: boolean;
}

export function useAsyncAction<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn | Promise<TReturn>,
  options: UseAsyncActionOptions<Awaited<TReturn>>,
) {
  const [isLoading, setIsLoading] = useState(false);
  const inflightRef = useRef(false);

  const execute = useCallback(
    async (...args: TArgs): Promise<Awaited<TReturn> | undefined> => {
      if (inflightRef.current) return undefined;
      inflightRef.current = true;
      setIsLoading(true);

      try {
        const result = await fn(...args);

        if (!options.silent) {
          const msg =
            typeof options.successMsg === 'function'
              ? options.successMsg(result as Awaited<TReturn>)
              : options.successMsg;
          notify.success(msg);
        }

        return result as Awaited<TReturn>;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        const msg =
          typeof options.errorMsg === 'function'
            ? options.errorMsg(error)
            : options.errorMsg ?? error.message ?? 'An unexpected error occurred';
        notify.error(msg);
        return undefined;
      } finally {
        inflightRef.current = false;
        setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fn],
  );

  return { execute, isLoading };
}
