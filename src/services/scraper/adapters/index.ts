import type { SourceAdapter } from '../types';
import { greenhouseAdapter } from './greenhouse';
import { leverAdapter } from './lever';
import { ashbyAdapter } from './ashby';
import { workdayAdapter } from './workday';
import { fallbackAdapter } from './fallback';

export const adapters: Record<SourceAdapter['source'], SourceAdapter> = {
  greenhouse: greenhouseAdapter,
  lever: leverAdapter,
  ashby: ashbyAdapter,
  workday: workdayAdapter,
  fallback: fallbackAdapter,
};

export function getAdapter(source: SourceAdapter['source']): SourceAdapter {
  return adapters[source];
}

export { greenhouseAdapter, leverAdapter, ashbyAdapter, workdayAdapter, fallbackAdapter };
