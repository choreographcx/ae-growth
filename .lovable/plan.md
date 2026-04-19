
The user wants drag-and-drop reordering of dashboard cards/sections, with per-user persistence so layouts survive logout.

## Scope

Looking at `OverviewPage.tsx`, the page has discrete top-level blocks:
1. KPI cards grid (6 cards)
2. Platform Contribution
3. Trends (4 charts)
4. Funnel
5. Platform Performance
6. Campaign Performance
7. Insights

Two natural levels of reordering:
- **Section level** (the 7 blocks above) — high value, low complexity
- **KPI card level** (within the grid) — nice but adds friction

I'll propose section-level for Overview first, with the KPI grid optionally reorderable as a stretch. Same pattern can extend to platform pages later.

## Approach

**Library**: `@dnd-kit/core` + `@dnd-kit/sortable` — accessible, keyboard-friendly, works well with existing card markup, no wrapper hijacking.

**Persistence**: New Supabase table `user_layouts` keyed by `(user_id, layout_key)` storing an ordered array of section IDs in JSONB. RLS: users manage their own rows.

```text
user_layouts
├─ id (uuid, pk)
├─ user_id (uuid, not null)
├─ layout_key (text)        e.g. 'overview', 'meta', 'google_ads'
├─ order (jsonb)            ['kpis','contribution','trends',...]
├─ created_at / updated_at
unique(user_id, layout_key)
```

RLS: `auth.uid() = user_id` for select/insert/update/delete.

**UI behavior**:
- Each section gets a small drag handle (grip icon) shown on hover top-right of the section.
- "Edit layout" toggle in the page header turns on visible handles + dashed outlines; when off, dragging is disabled (prevents accidental drags on touch).
- "Reset layout" button in edit mode deletes the saved row and reverts to default order.
- Save happens automatically on drop (debounced upsert), with a subtle toast on first save.
- Print/PDF export uses default order (already handled by print CSS) OR the saved order — I'll keep saved order so what you see is what exports.

**Code structure**:
- `src/hooks/useUserLayout.ts` — load/save layout for a given `layoutKey`, returns `{ order, setOrder, resetLayout, isEditing, setEditing, loading }`.
- `src/components/dashboard/SortableSection.tsx` — wrapper that renders a drag handle and applies dnd-kit transforms.
- Refactor `OverviewPage.tsx` to define sections as a `Record<id, ReactNode>` and render them in `order.map(...)` inside `<DndContext><SortableContext>`.
- Add an "Edit layout" toggle button in `SectionHeader` (or page-level) for Overview.

**Default order** lives in code; saved order is merged so newly added sections appear at the end automatically.

## Out of scope (for this pass)
- Reordering individual KPI cards inside the grid
- Resizing cards
- Per-platform-page layouts (pattern is reusable; we'll wire Overview only first, then extend if you like)
- Cross-device sync conflicts (last write wins)

## Files to add / change

- New: `supabase/migrations/*_user_layouts.sql` (table + RLS + trigger for `updated_at`)
- New: `src/hooks/useUserLayout.ts`
- New: `src/components/dashboard/SortableSection.tsx`
- New: `src/components/dashboard/LayoutEditToggle.tsx`
- Edit: `src/pages/OverviewPage.tsx` — wrap sections in DndContext, drive order from hook
- Edit: `package.json` — add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`

## Open question

Should this also apply to the platform pages (Meta, Google Ads, etc.) in this same change, or start with Overview only and extend after you've tried it?
