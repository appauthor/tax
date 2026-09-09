# Calculator implementation guide

Use this guide only when creating a calculator or materially changing its calculation structure.

## 1. Establish intent and scope

1. Choose one primary search intent and one canonical page.
2. Use the calculator name as the central title and H1 phrase.
3. Distribute related phrases naturally across the description, introduction, input help, result interpretation, explanatory content, and FAQ.
4. Do not create separate pages for synonyms alone.
5. Define included and excluded cases before designing inputs.

## 2. Verify current official rules

For laws, rates, deductions, thresholds, insurance, labor, housing, and public-program rules:

1. Search official government, public agency, or legislation sources first.
2. Record the effective date and review date.
3. Keep year-specific rules as explicit data/constants rather than unexplained literals.
4. If an input cannot be verified, require a user-confirmed value or omit the unsupported calculation.
5. Explain exclusions on the page and in the result notice.

Never use a blog, community post, or competing calculator as the authoritative rule source.

## 3. Inspect the smallest useful pattern

Run:

```sh
ruby tools/taxyou-context.rb --check
ruby tools/taxyou-context.rb --category CATEGORY_ID --pretty
```

Then inspect:

- One representative page in the chosen category
- Its pure math module
- Its controller module
- Relevant assertions in both test files

Avoid printing complete one-line HTML files or all of `index.html` when a focused search or the context tool is sufficient.

## 4. Design the calculator independently

Inputs and outputs must reflect the real calculation procedure rather than copying another form and renaming fields.

The result should expose the important calculation stages, such as:

- Input or gross amount
- Recognized/deductible amount
- Tax base or applicable base
- Applied rate or rule
- Tax, deduction, fee, or contribution by component
- Total and interpretable difference

Do not omit legally material steps for simplicity. Use neutral wording for comparisons and distinguish official amounts from user-entered or estimated costs.

## 5. Implement with shared components

1. Put pure calculations in the closest `*-math.js` module.
2. Put DOM behavior in the matching controller.
3. Reuse money formatting, common form classes, result panel, PNG/PDF/share utilities, nav, footer, breadcrumb, FAQ, and related-link UI.
4. Make conditional inputs visibly react to the selected calculation mode.
5. Add concise inline help; move long explanations to content or FAQ sections.

For a new page shell, use:

```sh
ruby tools/scaffold-calculator.rb --help
```

The scaffold refuses to overwrite an existing file. It intentionally does not guess legal text, calculator inputs, formulas, homepage copy, sitemap dates, or RSS publication dates.

## 6. Register and connect the page

- Add a homepage card under the correct existing category.
- Keep homepage visible card order and ItemList JSON-LD order identical.
- Add related links from relevant existing pages where useful.
- Add the calculator to the matching group in `about.html`, the complete tool usage directory. Update its modification date and sitemap entry.
- Add the exact canonical URL to sitemap.
- Add an RSS item only when the existing feed purpose includes the new release.
- Update `calculator-registry.json` to match the final page name, file, category, and release/review dates.

## 7. Test the behavior

For each calculation branch, cover:

- A normal representative value
- Zero and blank-equivalent values
- Threshold boundaries
- Minimum/maximum or eligibility boundaries
- Rounding/precision behavior
- Invalid inputs
- An official example when one is available

Also verify mode switching, result rendering, result notice, PNG/PDF/share actions, keyboard labels, mobile layout, canonical, sitemap, internal links, and indexability.
