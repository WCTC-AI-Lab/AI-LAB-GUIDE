export type NavGroup = 'playgrounds' | 'adventures';

export interface ModuleMeta {
  navGroup: NavGroup;
  slug: string;
  title: string;
  description: string;
  order?: number;
  /** Public URL path (served from `frontend/public/`) or absolute URL for hub card thumbnails. */
  thumbnailUrl?: string;
  thumbnailAlt?: string;
}
