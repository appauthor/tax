# Calculator implementation guide

Read this only for a new calculator or a material calculation change.

## 1. Load only relevant context

Follow the context commands in [AGENTS.md](../AGENTS.md), then inspect the returned source fragment, math/controller and relevant tests. For every new calculator, read [the Naver + Google SEO guide](search-seo-guide.md) and verify its linked official guidance before implementation. Read only the matching calculation notes.

## 2. Fix intent and supported scope

- Choose a distinct calculation purpose and canonical page; follow the SEO guide for titles, natural wording, crawlable content, links and structured data. Add explanations and FAQs where they answer real user questions.
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
5. Generating and applying a distinct 512×512 OG image under the [image preparation convention](../images/og/README.md) and SEO guide. The scaffold's shared image is a draft placeholder only.

Empty form notices and errors must not leave a visible box or blank spacing. Render initially empty `.notice-text` / `role="alert"` elements with `hidden`; when clearing a message, empty its text and set `hidden = true`. Set the message and `hidden = false` before focusing or announcing an error. Reuse `.notice-text[hidden]` in the shared CSS rather than adding page-specific styles. Verify initial, error-visible, input-corrected, and successful-submit states with computed-style assertions in DOM tests; clearing `textContent` alone is insufficient.

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

Complete [the checklist](calculator-completion-checklist.md), including calculation regression, mobile/keyboard usability, exports and both search engines' applicable checks. Record the official SEO pages reviewed, review date, applied checks and unavailable external validation in the release notes or matching calculation notes. Required commands live in AGENTS.md.
