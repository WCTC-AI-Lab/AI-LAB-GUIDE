# Frontend structure: modules, registry, and routes

This document describes how the **AI Lab Guide** React app organizes **playgrounds** (short, interactive demos) and **adventures** (~30 minute projects). The goal is to add new features like blog posts: one folder per module, register it once, and the hub pages and routes stay in sync.

---

## Directory layout

Relevant paths (under the repo root):

- **`frontend/src/App.tsx`** — Shell: `AppBar`, router, `Home`, and route definitions. Playground and adventure **detail** routes are generated from the registry via a small helper (`moduleDetailRoutes`). Optional legacy routes (e.g. `/llm-explore`, `/games`) can be defined here explicitly.
- **`frontend/src/NavHoverGroup.tsx`** — App bar hover menus: MUI `Popper` (with `disablePortal`) anchored to each hub label, slight vertical overlap and a small invisible hit-area so the pointer can reach items without crossing a dead gap.
- **`frontend/src/modules/types.ts`** — Shared `ModuleMeta` type (`navGroup`, `slug`, `title`, `description`, optional `order`).
- **`frontend/src/modules/registry.ts`** — Imports each module’s `meta`, lazy-loads its page component, and exports:
  - `RegisteredModule` (shared shape), plus type aliases `RegisteredPlayground` / `RegisteredAdventure`
  - `DEFAULT_MODULE_ORDER` — sort key when `meta.order` is omitted
  - `playgroundModules` / `adventureModules`
  - `playgroundModulesSorted` / `adventureModulesSorted` (sorted by `order`, then `slug`)
- **`frontend/src/modules/ModuleHubCard.tsx`** — Card used on index pages (thumbnail area, title, description, link). Optional `thumbnailAlt` when `thumbnailUrl` is informative; otherwise the image can stay decorative (`alt` empty) because the title is in the heading.
- **`frontend/src/modules/playgrounds/PlaygroundsIndexPage.tsx`** — Lists all playgrounds (cards → `/playgrounds/:slug`).
- **`frontend/src/modules/adventures/AdventuresIndexPage.tsx`** — Lists all adventures (cards → `/adventures/:slug`).

Each feature lives in its own folder:

- Playgrounds: **`frontend/src/modules/playgrounds/<slug>/`**
- Adventures: **`frontend/src/modules/adventures/<slug>/`**

A typical module contains:

- **`meta.ts`** — Exports a `ModuleMeta` object (must match the parent folder’s purpose: `navGroup` + `slug`).
- **Page component** — Often **`Page.tsx`** (default export), or a named file such as **`LLMExplorePage.tsx`**, depending on the module.

---

## URLs

| Pattern | Purpose |
|--------|---------|
| `/playgrounds` | Playgrounds hub (all cards). |
| `/playgrounds/<slug>` | One playground (from registry). |
| `/adventures` | Adventures hub. |
| `/adventures/<slug>` | One adventure (from registry). |

Legacy aliases (if present in `App.tsx`) keep old bookmarks working; prefer linking to the canonical `/playgrounds/...` and `/adventures/...` paths in new UI.

---

## Adding a new playground

1. Create **`frontend/src/modules/playgrounds/<your-slug>/`** (use a URL-safe slug; it becomes the path segment).
2. Add **`meta.ts`**:
   - `navGroup: 'playgrounds'`
   - `slug: '<your-slug>'` (should match the folder name)
   - `title`, `description`
   - Optional `order` (lower numbers appear first on the hub; if omitted, the module sorts using `DEFAULT_MODULE_ORDER` in `registry.ts`, i.e. after any module that sets `order`)
3. Add the page component (e.g. **`Page.tsx`**) with a `default export` React component.
4. Edit **`frontend/src/modules/registry.ts`**:
   - `import` the meta
   - `const XxxPage = lazy(() => import('./playgrounds/<your-slug>/Page'));`
   - Append `{ meta: xxxMeta, Page: XxxPage }` to **`playgroundModules`**

You do **not** need to add a new `<Route>` in `App.tsx` for the standard `/playgrounds/:slug` pattern; it is created by mapping over `playgroundModules`.

---

## Adding a new adventure

Same steps as a playground, but under **`frontend/src/modules/adventures/<slug>/`**, with `navGroup: 'adventures'`, and register the entry in **`adventureModules`** in **`registry.ts`**.

---

## Lazy loading

Page components are loaded with `React.lazy` in **`registry.ts`** so each module is split into its own chunk. `App.tsx` wraps those routes in **`Suspense`** with a loading fallback.

---

## Navigation shortcuts

The app bar includes hover menus (`NavHoverGroup`) that list each registered playground and adventure. They use the same sorted registry arrays as the hub pages, so new modules show up after you register them. Implementation note: menus stay in the DOM tree (`disablePortal`) so a single hover region can wrap the label and the panel; positioning uses MUI `Popper` with a small upward offset so there is no pointer gap between the bar and the list.
