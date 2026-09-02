# TaxYou repository guidance

## Scope

These instructions apply to the entire repository. Preserve working pages and avoid unrelated refactors.

## Start here

- For a calculator change, run `ruby tools/taxyou-context.rb --check` before broad file inspection.
- For a new calculator, read these files completely:
  - `docs/taxyou-architecture.md`
  - `docs/calculator-implementation-guide.md`
  - `docs/calculator-completion-checklist.md`
- Use `calculator-registry.json` for the current category and page inventory. Do not reconstruct the inventory by printing all of `index.html`.
- Read one representative calculator in the same category plus the shared engine/controller it uses. Do not read every calculator page.

## Non-negotiable implementation rules

- Keep nav, footer, breadcrumb, FAQ, form, result report, responsive behavior, and TaxYou visual style consistent.
- Reuse shared calculation engines, controllers, export utilities, and CSS. Separate calculation math from DOM/UI code.
- Do not create keyword-swapped duplicate pages. Split pages only for genuinely different search intent and calculator behavior.
- Give every page independent title, H1, description, content, self-referencing canonical, and internal links.
- Use official current sources first for taxes, rates, deductions, thresholds, labor rules, insurance rates, and housing rules. Show the reviewed date/year and sources on the page.
- Never guess an unverified rate, threshold, deduction, search volume, or ranking. State exclusions and unsupported exceptions.
- Keep canonical, internal-link, sitemap, RSS, and registry URLs identical. Update lastmod only for meaningful changes.
- New result panels must support PNG, PDF, and sharing through the existing common utilities.
- Do not add external libraries unless the existing platform cannot safely provide the feature.

## Verification

- Primary site check: `ruby tests/static-site.test.rb`
- Calculation regression: `node tests/calculation-regression.test.js` when Node is available.
- XML: `xmllint --noout sitemap.xml rss.xml`
- Formatting: `git diff --check`
- Use focused calculation smoke tests when Node is unavailable, and report that limitation.
- Do not commit or push unless the user explicitly asks.

## Feedback loop

When the user corrects a recurring TaxYou convention, update the closest relevant guide or test. Keep this file concise; detailed and task-specific guidance belongs under `docs/`.
