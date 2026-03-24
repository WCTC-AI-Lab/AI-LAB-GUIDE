import { lazy, type LazyExoticComponent, type ComponentType } from 'react';
import { llmExploreMeta } from './playgrounds/llm-explore/meta';
import { computerVisionMeta } from './playgrounds/computer-vision/meta';
import { vibeGameMakerMeta } from './adventures/vibe-game-maker/meta';
import type { ModuleMeta } from './types';

const LLMExplorePage = lazy(() => import('./playgrounds/llm-explore/LLMExplorePage'));
const ComputerVisionPlaygroundPage = lazy(() => import('./playgrounds/computer-vision/Page'));
const VibeGameMakerAdventurePage = lazy(() => import('./adventures/vibe-game-maker/Page'));

export { LLMExplorePage, VibeGameMakerAdventurePage };

/** Used when `meta.order` is omitted: sorts after any module that sets `order`. */
export const DEFAULT_MODULE_ORDER = 999;

export interface RegisteredModule {
  meta: ModuleMeta;
  Page: LazyExoticComponent<ComponentType>;
}

export type RegisteredPlayground = RegisteredModule;
export type RegisteredAdventure = RegisteredModule;

export const playgroundModules: RegisteredPlayground[] = [
  { meta: llmExploreMeta, Page: LLMExplorePage },
  { meta: computerVisionMeta, Page: ComputerVisionPlaygroundPage },
];

export const adventureModules: RegisteredAdventure[] = [
  { meta: vibeGameMakerMeta, Page: VibeGameMakerAdventurePage },
];

function sortByOrder<T extends { meta: ModuleMeta }>(a: T, b: T): number {
  const oa = a.meta.order ?? DEFAULT_MODULE_ORDER;
  const ob = b.meta.order ?? DEFAULT_MODULE_ORDER;
  if (oa !== ob) return oa - ob;
  return a.meta.slug.localeCompare(b.meta.slug);
}

export const playgroundModulesSorted = [...playgroundModules].sort(sortByOrder);
export const adventureModulesSorted = [...adventureModules].sort(sortByOrder);
