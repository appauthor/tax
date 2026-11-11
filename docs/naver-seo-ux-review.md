# Naver SEO and usability review

Reviewed 2026-11-11. This review applies to 87 existing pages, including 60 calculators and 10 ranking tools. It does not promise recovery of rankings or traffic.

This is a historical implementation record. Ongoing page creation and SEO changes follow [the Naver + Google SEO guide](search-seo-guide.md); the counts, data checks and validation below describe this review only.

## Official guidance and implementation

| Naver guide | Site action |
| --- | --- |
| [Basic site setup](https://searchadvisor.naver.com/guide/seo-basic-create) | Retained existing public URLs, absolute self-canonicals, crawlable links, sitemap and RSS. Audited unique page titles and descriptions. |
| [Content markup](https://searchadvisor.naver.com/guide/markup-content) | Made the homepage title and H1 identify TaxYou; standardized `og:site_name` while preserving page-specific titles, descriptions and assigned OG images. |
| [Preferred URLs and robots](https://searchadvisor.naver.com/guide/markup-structure) | Preserved index/follow and preferred URLs. No robots restrictions or client-side redirect schemes were introduced. |
| [Breadcrumbs](https://searchadvisor.naver.com/guide/structured-data-breadcrumb) | Replaced the generic root label with TaxYou and added 18 missing BreadcrumbList objects. All 78 visible trails now have matching structured data. The builder rejects a missing or mismatched trail. |
| [JavaScript SEO](https://searchadvisor.naver.com/guide/seo-advanced-javascript) | Retained build-time HTML for forms, explanations, internal links and official sources. Added a no-JavaScript explanation for interactive tools. Static section anchors remain in-page navigation, not separate virtual pages. |
| [Indexing efficiency](https://searchadvisor.naver.com/guide/seo-advanced-indexing) | Checked canonical URLs, duplicate metadata and real page availability. No empty keyword-only pages, artificial redirects or duplicate calculator URLs were added. |
| [Content guidance](https://searchadvisor.naver.com/guide/content-basic) | Improved readable spacing, input-unit interpretation and calculator instructions. Preserved applicable dates, exclusions and official source links without inventing review dates, expertise or statistical updates. |

## User-facing improvements

- A keyboard skip link moves to the main page content.
- Large money inputs show exact Korean units using 조/억/만, without changing the numeric input or calculation engine. Existing `aria-describedby` references are preserved and repeated binding does not duplicate helpers.
- Edited inputs or native validation failures hide old results and display a recalculation notice. Controllers that recalculate immediately still show their new result. The status works for both shared calculator panels and ranking-specific controllers.
- Generic result headers describe calculation results rather than calling every loan, benefit or ranking a tax bill. Domain-specific controllers retain their meaningful result labels.
- Form labels, help text, explanation cards and grids have more readable line height and spacing. Mobile text/date/number fields and selects use at least 16px text and a 48px input height.
- Loan inputs explain years plus months, zero-interest support, repayment types and excluded fees.

## Data freshness audit

The data policy was checked before implementation. The stored mortgage and deposit/savings comparison snapshots were collected on 2026-10-29, so the existing seven-day stale-data warnings are active. Current FSS pages timed out through the research tool, so no new rate values or collection dates were asserted. Official R-ONE, NPS, NHIS, NTS/public-data and household-finance pages were consulted; some dynamic tables or ministry pages could not establish a newer period reliably. The business-data source still lists 2026-10-20 as its modification date. Previously stored statistical periods and calculation-law review dates remain intact. New values require the separate source-backed review in `data-update-policy.md`.

Only the homepage brand change and the materially expanded loan instructions update sitemap lastmod in this pass. Shared navigation, typography and schema maintenance do not make every statistical dataset newly reviewed. RSS publication history is unchanged.

## Verification and follow-up

Use `npm test`, `xmllint --noout sitemap.xml rss.xml` and `git diff --check` before delivery. The optional DOM checks use a temporary jsdom path without changing production dependencies:

```sh
node tests/shared-ux-dom.test.js /absolute/path/to/jsdom
node tests/planning-dom.test.js /absolute/path/to/jsdom
node tests/labor-benefits-dom.test.js /absolute/path/to/jsdom
node tests/xirr-dom.test.js /absolute/path/to/jsdom
```

Shared UX checks cover all 70 tools. PNG/PDF/native-share integration tests use renderer and share stubs; they verify the control paths and MIME types rather than native browser file rendering. Desktop Chrome was checked with a loan calculation and the savings-ranking input screen. The browser automation host was unavailable, and the native browser focus changed during the mobile-emulation attempt, so mobile visual emulation could not be completed reliably in this session.

An independent temporary jsdom harness also compared the pre-change Git HEAD with the edited site. All 70 tools produced successful representative results with unchanged result rows, formulas, validation messages and initialization errors; special eligibility confirmations were supplied only in the disposable test DOM. This is regression evidence for those scenarios, not every possible input combination.

After deployment, inspect key URLs in Naver Search Advisor and monitor real search clicks alongside independent page views. Search ranking changes and traffic recovery are not established by a passing code test.
