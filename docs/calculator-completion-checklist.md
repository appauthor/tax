# Calculator completion checklist

Use before reporting a new or materially changed calculator complete.

## Intent and page

- [ ] Distinct search/calculation intent; no synonym-only duplicate
- [ ] Useful page-specific inputs, examples, explanations, result interpretation and FAQ where needed; natural wording
- [ ] Applicable year, actual review date, sources and exclusions are clear

## Naver + Google SEO

- [ ] [SEO guide](search-seo-guide.md) followed; current official guidance from both engines checked and source links/review date recorded
- [ ] Unique title, H1 and description; absolute self-canonical, indexability and crawlable inbound/related links agree
- [ ] Important text and navigation are in generated HTML; required CSS/JS/images are crawlable; ready pages shed draft `noindex`
- [ ] Visible and structured breadcrumbs match; application schema is accurate; optional markup has current support and no invented ratings or hidden claims
- [ ] New page's distinct 512×512 PNG and OG/Twitter metadata follow [the image convention](../images/og/README.md); final text, dimensions, URL, alt and file metadata checked

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
- [ ] Comfortable spacing and readable labels/help; narrow screens, zoom, long results and keyboard focus checked
- [ ] Result rows, notice, formula, PNG, PDF, and sharing work on desktop and mobile layouts; loading, responsiveness and layout shifts checked where tools are available

## Registry and discovery

- [ ] Final name/URL agrees across registry, homepage card/ItemList, page, `about.html`, internal links, and sitemap
- [ ] Metadata and dependencies live in `src/page-metadata.json`; the page ERB contains only page-specific body content
- [ ] RSS contains a new release once; pure edits do not create feed items
- [ ] Only meaningfully changed pages have a new `lastmod`
- [ ] `npm run build` regenerated root deployment artifacts from `src/`
- [ ] Public contract snapshot changed only for an intentional URL, canonical, sitemap, or RSS update
- [ ] SEO contract snapshot changed only for an intentional metadata, structured-data, heading, link, content, or dependency update
- [ ] `npm run docs:sync` ran if structure or inventory changed; generated files were not hand-edited

## Final verification

- [ ] `AGENTS.md`의 Required verification을 모두 실행
- [ ] New local URLs return HTTP 200 when a local server is available
- [ ] Production HTTP 200/canonical checked when production access is available
- [ ] After authorized deployment, Naver Search Advisor/Google Search Console URL checks and applicable structured-data/performance checks performed when access is available
- [ ] Unavailable checks and remaining limitations reported
