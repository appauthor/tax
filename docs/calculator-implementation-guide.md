# Calculator implementation guide

Read this only for a new calculator or a material calculation change.

## 1. Load only relevant context

```sh
ruby tools/taxyou-context.rb --check
ruby tools/taxyou-context.rb --category CATEGORY_ID --pretty
```

Inspect one representative page, its pure math module, matching controller, and relevant tests. Use focused `rg` queries; do not print all of `index.html` or inspect every calculator.

## 2. Fix intent and supported scope

- Choose one primary search intent and canonical page. Do not split synonyms into keyword-swapped pages.
- Use the primary phrase naturally in title, H1, description, introduction, help, result interpretation, content, and FAQ.
- Define supported users, effective period, included inputs, exclusions, and unsupported exceptions before coding.

## 3. Verify rules before formulas

- Prefer current legislation, government, or public-agency sources; never treat blogs, communities, or competing calculators as authority.
- Record effective year/date, review date, source URL, and exclusions.
- Store changing rates and thresholds as named constants or explicit data.
- Require a user-confirmed value or omit a case when the official value cannot be verified. Never guess rates, thresholds, deductions, or search volume.

## 4. Model the real calculation

Inputs and results must follow the actual procedure. Expose legally material stages: gross input, recognized amount, deductions, base, applied rate/rule, component amounts, total, and meaningful comparison where relevant. Keep precise calculations separate from display rounding and label estimates neutrally.

## 5. Reuse the platform

```sh
ruby tools/scaffold-calculator.rb --help
```

The scaffold creates a noindex shell and never guesses rules or copy. Complete it by:

1. Adding pure math to the closest `*-math.js` module.
2. Adding validation, conditional fields, and rendering to its controller.
3. Reusing shared form classes, result panel, PNG/PDF/share, nav, footer, breadcrumb, FAQ, related links, and `style.css`.
4. Keeping inline help short and moving detailed explanations to content or FAQ.

## 6. Register and publish internally

Use one final filename everywhere:

- `calculator-registry.json`
- Homepage category card and ItemList JSON-LD in identical order
- Page canonical and visible/structured breadcrumb
- Matching `about.html` group and relevant inbound links
- `sitemap.xml`; `rss.xml` only for a new published calculator

Update review/`lastmod` dates only where content or behavior materially changed. Then run `npm run docs:sync`; never edit `docs/project-map.md` directly.

## 7. Verify behavior

Cover each branch with a representative case, blank/zero, threshold and eligibility boundaries, min/max, precision/rounding, invalid input, and an official worked example when available. Verify mode switching, stale-result clearing, notice/formula output, keyboard labels, mobile layout, PNG/PDF/share paths, canonical, indexability, sitemap, RSS, and internal links. Finish with the completion checklist.
