# TaxYou architecture

Last architecture review: 2026-09-19

This file records stable boundaries. Current categories, pages, scripts, tests, and tools are generated in [project-map.md](project-map.md); do not duplicate that inventory here.

## Runtime model

TaxYou is a Korean static site. Each root-level calculator `.html` file remains an independent production URL under `https://www.taxyou.co.kr/`. Those root HTML files are deployment artifacts generated from `src/pages/*.html.erb`; GitHub Pages and other static hosts still publish the repository root without a server runtime.

`calculator-registry.json` is the inventory source of truth and includes directory card icons and descriptions. `src/page-metadata.json` owns each page's head tags, canonical, structured data, visible header, breadcrumb, content meta, and CSS/JavaScript dependencies. `src/pages/*.html.erb` contains only page-specific forms and body content. The generated `index.html` and `ranking.html` directories, their ItemList JSON-LD, registry order, canonical URLs, sitemap entries, and generated project map must agree. `src/site-discovery.json` owns the ordered sitemap and RSS publication metadata.

Run `ruby tools/build-site.rb --write` after changing a page template, shared partial, registry directory metadata, or discovery metadata. Run `ruby tools/build-site.rb --check` to verify that committed root artifacts are current. The builder is deterministic and uses only Ruby standard-library code.

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

Shared shell markup and the complete document layout live in `src/partials/`. Page metadata and dependency order live in `src/page-metadata.json`; forms, explanations, FAQs, and related links stay in the matching `src/pages/*.html.erb` fragment. Edit those sources, never the generated root HTML directly.

## Shared runtime maintenance

- Before removing a shared function, variable, selector, or compatibility branch, search every root HTML page, production script, and template. Include inline handlers, cross-file globals, generated markup, state classes, attribute selectors, and pseudo-class variants.
- Treat single-file lint warnings and initial DOM selector coverage as candidates only. Keep code used through another script or created after interaction.
- Remove code only when the repository-wide search finds no implementation or runtime reference. Verify all pages after a shared runtime or CSS change.

## URL and discovery contract

Each page has unique title, H1, description, content, OG metadata, WebApplication and BreadcrumbList JSON-LD, self-referencing canonical, and internal links. The same final filename must appear in:

```text
calculator-registry.json ↔ generated index card and ItemList ↔ page canonical/breadcrumb
                         ↔ src/site-discovery.json ↔ generated sitemap.xml and rss.xml
```

Directory-only hubs belong in the sitemap but not automatically in RSS. Pure edits do not create feed items. Update `lastmod` only for meaningful content or behavior changes.

`tests/fixtures/public-contract.json` snapshots root page names and canonicals plus sitemap and RSS semantics. `tests/fixtures/seo-contract.json` additionally snapshots title, metadata, structured data, headings, links, visible text, and CSS/JavaScript dependencies. Update either snapshot only after reviewing an intentional public or SEO-visible change.

## Generated structure documentation

`docs/project-map.md` is derived from the registry and file tree. After adding or renaming a page, category, shared script, test, tool, or top-level directory, run `npm run docs:sync`. Both context and static tests reject stale output. Conceptual changes still require updating this architecture file; generated documentation only replaces manually maintained inventory.

## Verification ownership

- `tests/static-site.test.rb`: page shell, metadata, accessibility contracts, internal links, registry/index order, sitemap/RSS, and generated map freshness
- `tests/public-contract.test.rb`: approved URL, canonical, sitemap, and RSS contract
- `tests/seo-contract.test.rb`: approved metadata, structured data, headings, links, visible text, and asset contract
- `tests/calculation-regression.test.js`: pure calculations, boundaries, rounding, zero/blank, and errors
- Focused tests: domain-specific UI branches or large official data tables

Add the smallest assertion that prevents a real regression. Avoid tests that merely repeat implementation text.
