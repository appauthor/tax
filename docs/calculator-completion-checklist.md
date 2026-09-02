# Calculator completion checklist

Use this checklist before reporting a new or materially changed calculator as complete.

## Page and search intent

- [ ] The page serves a distinct calculation/search intent and is not a synonym-only duplicate.
- [ ] Title and H1 center the primary phrase without keyword stuffing.
- [ ] Meta description and content naturally cover relevant user questions.
- [ ] Content, examples, FAQ, inputs, and results provide page-specific value.
- [ ] Title, H1, description, canonical, OG URL, and structured data are unique and consistent.
- [ ] A self-referencing canonical exists and robots does not block indexing.

## Calculation integrity

- [ ] Inputs and outputs follow the real calculation structure.
- [ ] Pure math and UI/DOM code are separated.
- [ ] Official current sources were checked for every changeable rule.
- [ ] Effective year/date and official source links appear on the page.
- [ ] No unverified rate, deduction, threshold, formula, search volume, or ranking was invented.
- [ ] Included cases, exclusions, and unsupported exceptions are explicit.
- [ ] Rounding/display logic is separate from calculation precision where relevant.
- [ ] Results show the material calculation stages and use neutral interpretation text.

## Shared UX and accessibility

- [ ] Existing nav, footer, breadcrumb, form, input, helper, FAQ, and responsive styles are reused.
- [ ] Conditional form choices visibly update relevant inputs.
- [ ] Labels are associated with every input and button types are explicit.
- [ ] Empty/zero/invalid input behavior is understandable.
- [ ] Result rendering works and includes a calculation notice/formula.
- [ ] PNG, PDF, and sharing use the existing common utilities.
- [ ] Desktop, tablet, and mobile layouts remain usable.

## Discovery and internal links

- [ ] Homepage category card and ItemList JSON-LD use the final URL and order.
- [ ] Breadcrumb and relevant related links prevent an orphan page.
- [ ] Canonical, internal links, sitemap, RSS, and registry use the same URL.
- [ ] Sitemap contains every existing page exactly once.
- [ ] Only meaningfully changed pages receive a new lastmod.
- [ ] RSS inclusion matches the feed purpose and uses real publication/modification dates.

## Tests and delivery

- [ ] Normal, boundary, zero/blank, branch, rounding, and invalid cases are tested.
- [ ] An official worked example is compared when available.
- [ ] `ruby tools/taxyou-context.rb --check` passes.
- [ ] `ruby tests/static-site.test.rb` passes.
- [ ] `node tests/calculation-regression.test.js` passes when Node is available.
- [ ] `xmllint --noout sitemap.xml rss.xml` passes.
- [ ] `git diff --check` passes.
- [ ] New local URLs return HTTP 200 when a local server can be run.
- [ ] Production HTTP 200 and canonical are checked when production access is available.
- [ ] Any unavailable test or remaining limitation is included in the final report.
