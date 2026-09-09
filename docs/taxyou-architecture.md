# TaxYou architecture

Last architecture review: 2026-09-09

## Runtime and page model

TaxYou is a static Korean HTML site. Calculator routes are root-level `.html` files with self-referencing canonical URLs under `https://www.taxyou.co.kr/`. There is no build step that generates calculator pages.

The homepage, `index.html`, is the calculator directory and internal-link hub. Its visible calculator cards and ItemList JSON-LD must remain in the same order. `ranking.html` is the directory for ranking and comparison tools, and each ranking page must link back to it through the breadcrumb. `calculator-registry.json` is the compact inventory for calculators, hubs, and ranking pages; production truth is still verified against the HTML, canonical URLs, sitemap, and tests.

## Category hierarchy

### Tax calculators

- `realEstateTaxCalculators`: 부동산
- `financialTaxCalculators`: 금융·투자·연금
- `familyTaxCalculators`: 증여·상속
- `businessTaxCalculators`: 사업자
- `vehicleTaxCalculators`: 자동차
- `benefitTaxCalculators`: 장려금·지원금 (user-approved category for 근로장려금)

### Finance calculators

- `savingInvestmentCalculators`: 저축·투자
- `housingFinanceCalculators`: 주거·부동산
- `laborFinanceCalculators`: 임금·노동
- `loanCalculators`: 대출·부채

Use the existing category ID in homepage links, breadcrumb links, and BreadcrumbList JSON-LD. Do not add a category for a single page unless the user journey clearly requires it.

### Ranking and comparison pages

- Global navigation points to `ranking.html` using the label `순위·비교`.
- `rankingCategories` in the registry mirrors the visible category sections and cards on `ranking.html`.
- Individual ranking pages keep their independent URLs and use `홈 > 순위·비교 > 현재 페이지` breadcrumbs.
- A directory-only hub is added to the sitemap but not to RSS unless the feed's publication purpose changes.

## Shared page shell

All calculator pages reuse:

- Header with H1, subtitle, notice, and content review date
- `.site-links` global navigation
- `.breadcrumb` navigation
- `.calculator-section` and `.tax-form-card.form-grid`
- `.article-lead`, explanatory `.info-section` blocks, and `.faq-list`
- Related calculator links using `.guide-jump-nav`
- `.site-footer`
- `scripts/common.js`, `scripts/export-report.js`, and `scripts/calculator-page.js`

The common result panel IDs are `resultBox`, `captureArea`, `repBadge`, `repTitle`, `repCurrentDate`, `resultTableBody`, `resultNotice`, and `formulaContent`. Controllers must not invent alternate result markup when the shared panel is sufficient.

## Calculation and UI separation

- Pure math belongs in a `*-math.js` module and must work without the DOM.
- Form binding, field visibility, validation messages, and result rendering belong in a controller module.
- `scripts/common.js` owns shared money formatting and result display helpers.
- `scripts/calculator-page.js` owns the common result report and export buttons.
- `scripts/export-report.js` owns PNG, PDF, and sharing behavior.

Representative shared modules:

- Investment/tax: `scripts/investment-tax-math.js`, `scripts/investment-tax-calculators.js`
- Business/vehicle: `scripts/business-vehicle-tax-math.js`, `scripts/business-vehicle-tax-calculators.js`
- Housing/labor/benefits: `scripts/living-finance-math.js`, `scripts/living-finance-calculators.js`
- Earned income credit: `scripts/earned-income-credit-table.js` loads the official table before the shared math module. Source provenance and supported cases are in `docs/labor-benefits-calculation-notes.md`.
- Loans: `scripts/loan-math.js`, `scripts/loan-calculators.js`
- Ranking comparisons: dedicated `*-rank-math.js` and matching UI controller; do not interpolate within unpublished official percentile ranges.

Extend the closest module when the domain and assumptions match. Create a new shared domain module only when the calculation structure is genuinely different.

## UI rules

- Reuse `style.css`; avoid page-specific CSS.
- Inputs use `.form-group`; money inputs use `.money-input` and `inputmode="numeric"`.
- Full-width guidance uses `.helper-box.form-span-full`.
- Checkbox choices use `.checkbox-row` or an established equivalent.
- Use existing vertical spacing instead of inline margins.
- Forms are two columns on desktop and one column at the existing mobile breakpoint.
- The homepage menu is two aligned columns on desktop, stacked on tablets, and single-column on mobile.
- FAQ questions and answers use the shared `.faq-list` details/summary style.

## Metadata, discovery, and feeds

Every calculator needs unique title, H1, meta description, OG metadata, WebApplication JSON-LD, and a self-referencing canonical. BreadcrumbList JSON-LD should reflect its actual category.

Add every canonical calculator URL to `sitemap.xml`. Keep existing URLs unchanged and update only meaningful lastmod dates. The RSS feed currently publishes newly released calculators, so new calculator releases normally receive an RSS item with the same canonical URL and real publication date. Pure edits do not automatically require a new RSS item.

## Tests

- `tests/static-site.test.rb` validates metadata uniqueness, nav/footer, labels, internal links, orphan pages, ItemList order, sitemap coverage/canonical equality, RSS validity, and page-specific contracts.
- `tests/calculation-regression.test.js` validates pure calculation engines with normal, boundary, zero, and error cases.

Add focused metadata/control/source assertions for new calculator families rather than duplicating full-page assertions.
