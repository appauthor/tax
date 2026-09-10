# TaxYou architecture

Last architecture review: 2026-09-10

This file records stable boundaries. Current categories, pages, scripts, tests, and tools are generated in [project-map.md](project-map.md); do not duplicate that inventory here.

## Runtime model

TaxYou is a Korean static site. Each root-level calculator `.html` file is an independent production URL under `https://www.taxyou.co.kr/`; there is no page build step.

`calculator-registry.json` is the inventory source of truth. `index.html` renders the calculator directory and matching ItemList JSON-LD. `ranking.html` is the ranking directory. Registry order, visible card order, canonical URLs, sitemap entries, and generated project map must agree.

## Dependency direction

```text
official rules/data → pure calculation module → UI controller → calculator HTML
                                                    ↓
                         common result/export utilities and shared CSS
```

- Pure calculations belong in `*-math.js` and must run without the DOM.
- Form binding, conditional fields, messages, and result rows belong in the matching controller.
- `scripts/common.js` owns common input/result helpers.
- `scripts/calculator-page.js` creates or enhances the shared result panel.
- `scripts/export-report.js` owns PNG, PDF, and sharing.
- Large official tables stay in separate data files loaded before their calculation module.

Extend the closest domain module when assumptions match. Create a new module only for a genuinely different calculation structure. Use `ruby tools/taxyou-context.rb --category ID --pretty` to find the current files instead of maintaining a module list here.

## Page contract

Every calculator reuses the TaxYou shell:

- Header, H1, subtitle, notice, author/review date
- Global nav, category breadcrumb, footer
- `.calculator-section`, `.tax-form-card.form-grid`, `.article-lead`, `.info-section`, `.faq-list`
- Related links via `.guide-jump-nav`
- Shared result targets: `resultBox`, `captureArea`, `repBadge`, `repTitle`, `repCurrentDate`, `resultTableBody`, `resultNotice`, `formulaContent`

Reuse `style.css`; do not introduce page CSS for an existing pattern. Forms use two desktop columns and the shared mobile breakpoint. Inputs require associated labels; money inputs use `.money-input` and `inputmode="numeric"`. Full-width help uses `.helper-box.form-span-full`, and checkbox choices use `.checkbox-row`.

## URL and discovery contract

Each page has unique title, H1, description, content, OG metadata, WebApplication and BreadcrumbList JSON-LD, self-referencing canonical, and internal links. The same final filename must appear in:

```text
calculator-registry.json ↔ index card and ItemList ↔ page canonical/breadcrumb
                         ↔ about.html ↔ sitemap.xml ↔ rss.xml for a new release
```

Directory-only hubs belong in the sitemap but not automatically in RSS. Pure edits do not create feed items. Update `lastmod` only for meaningful content or behavior changes.

## Generated structure documentation

`docs/project-map.md` is derived from the registry and file tree. After adding or renaming a page, category, shared script, test, tool, or top-level directory, run `npm run docs:sync`. Both context and static tests reject stale output. Conceptual changes still require updating this architecture file; generated documentation only replaces manually maintained inventory.

## Verification ownership

- `tests/static-site.test.rb`: page shell, metadata, accessibility contracts, internal links, registry/index order, sitemap/RSS, and generated map freshness
- `tests/calculation-regression.test.js`: pure calculations, boundaries, rounding, zero/blank, and errors
- Focused tests: domain-specific UI branches or large official data tables

Add the smallest assertion that prevents a real regression. Avoid tests that merely repeat implementation text.
