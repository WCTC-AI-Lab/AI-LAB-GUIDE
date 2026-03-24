export type NavGroup = 'playgrounds' | 'adventures';

export interface ModuleMeta {
  navGroup: NavGroup;
  slug: string;
  title: string;
  description: string;
  order?: number;
}
