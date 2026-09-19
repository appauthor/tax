# TaxYou architecture

Last architecture review: 2026-09-19

This file records stable boundaries. Current categories, pages, scripts, tests, and tools are generated in [project-map.md](project-map.md); do not duplicate that inventory here.

## Build and runtime model

TaxYou is a Korean static site. Each root-level calculator `.html` file remains an independent production URL under `https://www.taxyou.co.kr/`. Those root HTML files are deployment artifacts generated from `src/pages/*.html.erb`; GitHub Pages and other static hosts still publish the repository root without a server runtime.

The two refactors replaced hand-maintained full HTML pages with a one-way build:

```text
registry + page metadata + body fragment + shared partials + discovery metadata
                                  ↓ npm run build
                 root HTML + sitemap.xml + rss.xml
```

`calculator-registry.json` owns inventory, order, card icons, and descriptions. `src/page-metadata.json` owns head tags, canonical, structured data, visible header, breadcrumb, content meta, and dependency order. `src/pages/*.html.erb` owns only page-specific forms and body content. `src/partials/` owns the document shell. `src/site-discovery.json` owns ordered sitemap and RSS publication metadata.

The builder is deterministic and uses only Ruby standard-library code. `npm run build` writes artifacts; `npm run build:check` verifies them without writing. Existing URLs and static hosting behavior do not change when the sources are reorganized.

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

## Source boundaries

Every calculator reuses the TaxYou shell:

- Header, H1, subtitle, notice, author/review date
- Global nav, category breadcrumb, footer
- `.calculator-section`, `.tax-form-card.form-grid`, `.article-lead`, `.info-section`, `.faq-list`
- Related links via `.guide-jump-nav`
- Shared result targets: `resultBox`, `captureArea`, `repBadge`, `repTitle`, `repCurrentDate`, `resultTableBody`, `resultNotice`, `formulaContent`

Reuse `style.css`; do not introduce page CSS for an existing pattern. Forms use two desktop columns and the shared mobile breakpoint. Inputs require associated labels; money inputs use `.money-input` and `inputmode="numeric"`. Full-width help uses `.helper-box.form-span-full`, and checkbox choices use `.checkbox-row`.

Do not duplicate shell markup in a page fragment or put page-specific copy in a shared partial. Edit sources, run the builder once, and review the generated diff; never repair generated root files by hand.

## Shared runtime maintenance

- Before removing a shared function, variable, selector, or compatibility branch, search `src/`, production scripts, and templates. Include inline handlers, cross-file globals, generated markup, state classes, attribute selectors, and pseudo-class variants.
- Treat single-file lint warnings and initial DOM selector coverage as candidates only. Keep code used through another script or created after interaction.
- Remove code only when the source-wide search finds no implementation or runtime reference. Rebuild, then verify generated pages after a shared runtime or CSS change.

## URL and discovery contract

Each page has unique title, H1, description, content, OG metadata, WebApplication and BreadcrumbList JSON-LD, self-referencing canonical, and internal links. The same final filename must appear in:

```text
calculator-registry.json ↔ generated index card and ItemList ↔ page canonical/breadcrumb
                         ↔ src/site-discovery.json ↔ generated sitemap.xml and rss.xml
```

Directory-only hubs belong in the sitemap but not automatically in RSS. Pure edits do not create feed items. Update `lastmod` only for meaningful content or behavior changes.

`tests/fixtures/public-contract.json` snapshots root page names and canonicals plus sitemap and RSS semantics. `tests/fixtures/seo-contract.json` snapshots title, metadata, structured data, headings, links, visible text, and CSS/JavaScript dependencies. A failure means either the output regressed or the public contract changed intentionally; never recapture a fixture before deciding which is true.

## Generated structure documentation

`docs/project-map.md` is a compact inventory derived from the registry and file tree. Run `npm run docs:sync` only after adding, removing, or renaming a page, category, script, test, tool, or top-level directory. Conceptual rules belong here rather than in the generated map.

## Verification ownership

- `tests/static-site.test.rb`: page shell, metadata, accessibility contracts, internal links, registry/index order, sitemap/RSS, and generated map freshness
- `tests/public-contract.test.rb`: approved URL, canonical, sitemap, and RSS contract
- `tests/seo-contract.test.rb`: approved metadata, structured data, headings, links, visible text, and asset contract
- `tests/calculation-regression.test.js`: pure calculations, boundaries, rounding, zero/blank, and errors
- Focused tests: domain-specific UI branches or large official data tables

Add the smallest assertion that prevents a real regression. Avoid tests that merely repeat implementation text.
