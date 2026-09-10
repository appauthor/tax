# Calculator completion checklist

Use before reporting a new or materially changed calculator complete.

## Intent and page

- [ ] Distinct search/calculation intent; no synonym-only duplicate
- [ ] Unique title, H1, description, content, OG data, schemas, and self-canonical
- [ ] Primary and related phrases read naturally; page-specific inputs, examples, content, results, and matching visible/schema FAQ
- [ ] Correct review date, indexable robots, category breadcrumb, and meaningful related links

## Calculation

- [ ] Inputs and output stages match the official procedure; pure math stays separate from DOM
- [ ] Current official sources and effective period verified; named constants/data used for changing rules
- [ ] Rates, thresholds, deductions, formulas, search volume, and rankings are never guessed
- [ ] Supported scope, exclusions, and exceptions are explicit in content and result notice
- [ ] Precision is preserved until display rounding; results use neutral wording
- [ ] Representative, blank/zero, branch, boundary, min/max, rounding, invalid, and official-example cases tested

## Shared UX

- [ ] TaxYou nav, footer, form, result report, FAQ, related links, responsive CSS, and shared utilities reused
- [ ] Every control has a label; conditional fields update visibly and disabled hidden fields do not block native validation
- [ ] Invalid input hides stale results and gives a useful message; successful results receive focus
- [ ] Result rows, notice, formula, PNG, PDF, and sharing work on desktop and mobile layouts

## Registry and discovery

- [ ] Final name/URL agrees across registry, homepage card/ItemList, page, `about.html`, internal links, and sitemap
- [ ] RSS contains a new release once; pure edits do not create feed items
- [ ] Only meaningfully changed pages have a new `lastmod`
- [ ] `npm run docs:sync` updated the generated project map after structure/inventory changes

## Final commands

```sh
ruby tools/taxyou-context.rb --check
ruby tests/static-site.test.rb
node tests/calculation-regression.test.js
xmllint --noout sitemap.xml rss.xml
git diff --check
```

- [ ] New local URLs return HTTP 200 when a local server is available
- [ ] Production HTTP 200/canonical checked when production access is available
- [ ] Unavailable checks and remaining limitations reported
