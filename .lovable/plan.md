

## Move active filter chips inside the Filter popover

Replace the always-visible chip row with active-filter chips shown at the top of the Filter popover/sheet when it opens. This keeps the dashboard header clean while still giving a clear at-a-glance view of what's active — at the moment users go to inspect or change filters.

### What changes visually

```text
Header row (always):
  Section title                           [ Filter · 3 ] | [ Date ▾ ]
  (no second row of chips anymore)

When user clicks Filter, popover opens:
  ┌───────────────────────────────────┐
  │ Filter                            │
  ├───────────────────────────────────┤
  │ Active                  Clear all │
  │  [Markets: UAE ✕]                 │
  │  [Campaigns: Ramadan +2 ✕]        │
  ├───────────────────────────────────┤
  │ Platforms              View All › │
  │ Markets               1 selected ›│
  │ Channels                View All ›│
  │ Campaigns             3 selected ›│
  │ Objectives              View All ›│
  ├───────────────────────────────────┤
  │           [ Done ]                │
  └───────────────────────────────────┘
```

### Behavior rules

- The standalone `<FilterSummary />` row beneath the section header is removed entirely (desktop and mobile).
- The Filter button keeps its existing count badge so users still see "something is active" without opening anything.
- When the popover (desktop) or bottom sheet (mobile) opens on the **list view**, an "Active filters" block renders at the top — only if at least one filter is set.
- Each chip shows `Label: Value` using the same compact summary logic as today (`Meta`, `Meta, UAE`, `Meta +2`).
- Clicking the small ✕ on a chip clears that one filter group immediately (e.g. removes all selected Markets). The popover stays open so the user can keep adjusting.
- A `Clear all` text button sits to the right of the "Active" header, only when chips exist. Same behavior as today's clear-all in the footer.
- The detail view (when a single filter category is open) is unchanged — no chips there.
- Tooltip on hover still shows the full `Label: Value` for truncated chips.

### Technical notes

- `src/components/dashboard/SectionHeader.tsx`: remove the `<FilterSummary />` render block. The Filter button's existing count badge handles the at-a-glance signal.
- `src/components/dashboard/MobileFilterSheet.tsx`: in `FilterListView`, add a new "Active" section above the category list. It iterates over `filters`, and for each one with `selected.length > 0` renders a chip using the same summarize helper currently in `FilterSummary.tsx`. Each chip has an inline ✕ button that calls `f.setSelected([])`. The "Clear all" link reuses the existing `clearAll` callback already passed into the view.
- `src/components/dashboard/FilterSummary.tsx`: no longer used by the header. Either delete it or keep it as an internal helper — plan is to delete and inline a small `summarize()` helper into `MobileFilterSheet.tsx` to avoid an orphan file.

### Files touched

- `src/components/dashboard/SectionHeader.tsx` — remove inline filter summary row.
- `src/components/dashboard/MobileFilterSheet.tsx` — add "Active filters" block at the top of the list view with per-chip clear and "Clear all".
- `src/components/dashboard/FilterSummary.tsx` — delete (logic absorbed into MobileFilterSheet).

