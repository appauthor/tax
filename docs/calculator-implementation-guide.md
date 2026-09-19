# Calculator implementation guide

Read this only for a new calculator or a material calculation change.

## 1. Load only relevant context

```sh
ruby tools/taxyou-context.rb --check
ruby tools/taxyou-context.rb --category CATEGORY_ID --pretty
ruby tools/taxyou-context.rb --page REPRESENTATIVE.html --pretty
```

Inspect the returned source fragment, its pure math module, matching controller, and relevant tests. Use focused `rg` queries; do not print generated root HTML, the full metadata file, or every calculator.

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

The scaffold creates a body fragment plus its metadata record with `noindex`; it does not publish the page or invent rules and copy. Complete it by:

1. Adding pure math to the closest `*-math.js` module.
2. Adding validation, conditional fields, and rendering to its controller.
3. Reusing shared form classes, result panel, PNG/PDF/share, FAQ, related links, and `style.css`; nav, footer, breadcrumb, and document tags come from metadata and partials.
4. Keeping inline help short and moving detailed explanations to content or FAQ.

Do not paste a full existing HTML page into the fragment. Edit `src/pages/` and `src/page-metadata.json`, then generate the matching root `.html` with `npm run build`.

## 6. Register and publish internally

Use one final filename everywhere. The minimum publish set is:

- `calculator-registry.json`
- `src/page-metadata.json` and `src/pages/<file>.erb`
- `src/site-discovery.json`; add RSS metadata only for a newly published calculator
- Relevant inbound links in page fragments

Homepage cards and ItemList JSON-LD are generated from the registry. Canonical, visible/structured breadcrumb, and dependency order are generated from page metadata; do not maintain duplicate copies elsewhere.

Update review/`lastmod` dates only where content or behavior materially changed. Run `npm run build`, then `npm run docs:sync` because a new page changes the inventory. Never edit generated root HTML/XML or `docs/project-map.md` directly.

If the release intentionally changes the public or SEO contract, first inspect the failing diff and then recapture only the affected fixture:

```sh
ruby tools/capture-public-contract.rb
ruby tools/capture-seo-contract.rb
```

## 7. Verify behavior

Cover each branch with a representative case, blank/zero, threshold and eligibility boundaries, min/max, precision/rounding, invalid input, and an official worked example when available. Verify mode switching, stale-result clearing, notice/formula output, keyboard labels, mobile layout, PNG/PDF/share paths, canonical, indexability, sitemap, RSS, and internal links. Use the completion checklist rather than duplicating the final command list here.
