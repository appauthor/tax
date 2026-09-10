# TaxYou repository guidance

## Start with minimal context

1. Run `ruby tools/taxyou-context.rb --check` before broad inspection.
2. For one category, run `ruby tools/taxyou-context.rb --category CATEGORY_ID --pretty`.
3. Read one representative page plus its shared math/controller. Do not print all of `index.html` or read every calculator.

Read only the guide required by the task:

- Structure, shared runtime, or category changes: `docs/taxyou-architecture.md`
- New calculator or material calculation change: `docs/calculator-implementation-guide.md`
- Before delivery: `docs/calculator-completion-checklist.md`
- Domain-specific work: the matching `docs/*-calculation-notes.md`, when present

`docs/project-map.md` is a generated human overview. Use the category context command for smaller model context.

## Sources of truth

- `calculator-registry.json`: category, calculator, hub, and ranking inventory
- Calculator HTML: page copy, metadata, canonical, structured data, and form
- Pure `*-math.js`: calculation behavior
- Matching controller: DOM behavior and result rendering
- `sitemap.xml` and `rss.xml`: discovery/publication records
- Tests: enforced contracts

After adding or renaming pages, categories, shared scripts, tests, tools, or top-level directories, run `npm run docs:sync`. Never hand-edit `docs/project-map.md`. Context and static tests reject a stale map.

## Implementation rules

- Preserve working pages and avoid unrelated refactors.
- Reuse nav, footer, breadcrumb, FAQ, form, result report, responsive styles, engines, controllers, and export utilities.
- Keep calculation math independent from DOM/UI code.
- Create separate pages only for distinct search intent and behavior; never make keyword-swapped duplicates.
- Give each page unique title, H1, description, content, self-canonical, and useful internal links.
- Verify current taxes, rates, thresholds, labor, insurance, and housing rules with official sources. Show the applicable year/review date and exclusions. Never guess values or search volume.
- Keep canonical, internal-link, sitemap, RSS, registry, and generated map URLs consistent. Change `lastmod` only for meaningful edits.
- New results must support PNG, PDF, and sharing through common utilities.
- Do not add external libraries unless the platform cannot safely provide the feature.

## Required verification

```sh
ruby tools/taxyou-context.rb --check
ruby tests/static-site.test.rb
node tests/calculation-regression.test.js
xmllint --noout sitemap.xml rss.xml
git diff --check
```

Use focused calculation smoke tests if Node is unavailable and report the limitation. Do not commit or push unless the user explicitly asks.

When the user corrects a recurring convention, update the closest guide or test. Keep this file concise; task details belong under `docs/`.
