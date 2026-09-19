# TaxYou development rules

## Start with minimal context

1. Run `ruby tools/taxyou-context.rb --check` before broad inspection.
2. For one category, run `ruby tools/taxyou-context.rb --category CATEGORY_ID --pretty`.
3. Before reading a representative page, run `ruby tools/taxyou-context.rb --page FILE --pretty` to get only its source, dependencies, and SEO summary.
4. Read that source fragment plus its shared math/controller. Do not print generated root HTML, all metadata, or every calculator.

Read only the guide required by the task:

- Structure, shared runtime, or category changes: `docs/taxyou-architecture.md`
- New calculator or material calculation change: `docs/calculator-implementation-guide.md`
- Before delivery: `docs/calculator-completion-checklist.md`
- Domain-specific work: the matching `docs/*-calculation-notes.md`, when present

`docs/project-map.md` is a generated human overview. Use the category context command for smaller model context.

## Edit the source of truth

- Page/category inventory: `calculator-registry.json`
- SEO, header, breadcrumb, and page dependencies: `src/page-metadata.json`
- Page-specific form and body: `src/pages/*.html.erb`
- Shared document shell: `src/partials/`
- Sitemap and RSS inputs: `src/site-discovery.json`
- Calculation behavior: pure `scripts/*-math.js`
- DOM behavior and result rendering: matching controller
- Stable public/SEO behavior: tests and contract fixtures

Root `.html`, `sitemap.xml`, `rss.xml`, and `docs/project-map.md` are generated artifacts. Never hand-edit them.

## Efficient change flow

1. Use the category context command and inspect one analogous page plus its math/controller.
2. Change only the owning source files above.
3. Run `npm run build` after page, partial, registry, metadata, or discovery changes.
4. Run `npm run docs:sync` only after adding, removing, or renaming inventory or code structure.
5. Run focused tests while working and the required verification before delivery.

Do not refresh contract fixtures to make a failure disappear. Update them only after reviewing and approving an intentional public URL or SEO-visible change.

## Implementation rules

- Preserve existing URLs, output semantics, and working pages unless the task explicitly changes them.
- Reuse nav, footer, breadcrumb, FAQ, form, result report, responsive styles, engines, controllers, and export utilities.
- Keep calculation math independent from DOM/UI code.
- Keep shared shell/SEO fields out of page fragments; keep page-specific copy and forms out of shared partials.
- Create separate pages only for distinct search intent and behavior; never make keyword-swapped duplicates.
- Give each page unique title, H1, description, content, self-canonical, and useful internal links.
- Verify current taxes, rates, thresholds, labor, insurance, and housing rules with official sources. Show the applicable year/review date and exclusions. Never guess values or search volume.
- Keep canonical, internal-link, sitemap, RSS, registry, and generated map URLs consistent. Change `lastmod` only for meaningful edits.
- New results must support PNG, PDF, and sharing through common utilities.
- Do not add external libraries unless the platform cannot safely provide the feature.

## Required verification

```sh
npm test
xmllint --noout sitemap.xml rss.xml
git diff --check
```

`npm test` is the single full-suite entry point; use its individual `test:*` scripts only while iterating. Use focused calculation smoke tests if Node is unavailable and report the limitation. Do not commit or push unless the user explicitly asks.

When the user corrects a recurring convention, update the closest guide or test. Keep this file concise; task details belong under `docs/`.
