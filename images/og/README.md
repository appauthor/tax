# Calculator Open Graph images

Created: 2026-10-30 (Asia/Seoul). Generated using the built-in `image_gen` tool; final PNGs are resized to 512×512 with macOS `sips`.

Each calculator has a distinct illustration and its own absolute OG / social image URL in `src/page-metadata.json`. The shared homepage image remains `og-image.png`. Images are metadata assets, so they do not add a new section to the calculator forms.

## Image preparation convention

For new calculator OG assets, use the established navy / ivory / amber editorial illustration style, with a distinct subject and composition for each calculation. Deliver a 512×512 PNG and inspect the Korean headline at the final size. Do not bake changing tax rates, thresholds, benefit caps or years into the art.

After resizing, remove non-rendering file metadata (including EXIF, textual descriptions, software/tool names, prompts, timestamps and provenance containers). Retain only PNG pixel, transparency and color-rendering chunks. Validate the chunk CRCs and confirm that metadata removal leaves the compressed pixel stream unchanged. This checks file metadata only; it does not claim that an image cannot be recognized as generated, or that metadata removal changes search rankings.

Source generations and prompt records are retained separately; generation records do not belong inside deployed image files. The 19 additional images below contain only `IHDR`, `sRGB`, `IDAT` and `IEND` chunks after preparation.

## Keyword mapping

| Search keyword | Existing page | Image |
| --- | --- | --- |
| 중고차 취득세 계산기 | [vehicle-acquisition-tax-calculator.html](../../vehicle-acquisition-tax-calculator.html) | [vehicle-acquisition-tax-calculator.png](vehicle-acquisition-tax-calculator.png) |
| 마이너스통장 이자계산기 | [overdraft-interest-calculator.html](../../overdraft-interest-calculator.html) | [overdraft-interest-calculator.png](overdraft-interest-calculator.png) |
| 공급가액 부가세 계산기 | [vat-calculator.html](../../vat-calculator.html) | [vat-calculator.png](vat-calculator.png) |
| 퇴직연금 세금 소득세 계산기 | [pension-income-tax.html](../../pension-income-tax.html) | [pension-income-tax.png](pension-income-tax.png) |
| 종부세 계산기 | [comprehensive-real-estate-tax-calculator.html](../../comprehensive-real-estate-tax-calculator.html) | [comprehensive-real-estate-tax-calculator.png](comprehensive-real-estate-tax-calculator.png) |
| ltv dsr 계산기 — LTV | [ltv-calculator.html](../../ltv-calculator.html) | [ltv-calculator.png](ltv-calculator.png) |
| ltv dsr 계산기 — DSR | [dsr-calculator.html](../../dsr-calculator.html) | [dsr-calculator.png](dsr-calculator.png) |
| 전세자금대출 금리 계산기 | [jeonse-loan-calculator.html](../../jeonse-loan-calculator.html) | [jeonse-loan-calculator.png](jeonse-loan-calculator.png) |

The retirement-pension query maps to `pension-income-tax.html`, which handles IRP and deferred retirement income. LTV and DSR have separate calculator pages and separate images. No rates or regulatory thresholds are depicted in the illustrations.

## Final generation prompts

The following prompts were passed individually to the built-in image tool. Source generations are retained under the tool's generated-images directory; only the final resized PNGs belong to this site.

### vehicle-acquisition-tax-calculator

```text
Use case: stylized-concept. Asset type: unique TaxYou calculator Open Graph thumbnail, square 1:1, designed to be delivered at 512x512. Create a polished editorial 3D illustration, refined tactile ceramic and paper materials, crisp forms, soft studio light, deep ink navy with warm ivory and restrained amber details suited to a financial calculation website. Large central storytelling subject, exceptionally clear at small thumbnail size, generous margins. This must feel like a thoughtful illustration of this calculator, not an advertising banner. No brand names or logos, no watermark, no tax rates, no fabricated numerical examples, no fine print. Subject: a beautiful graphite compact used sedan in three-quarter view on a warm ivory circular platform. Beside the front wheel a folded vehicle ownership transfer certificate with a raised amber percentage seal, and a simple car key in foreground. Subtle second-hand transfer cue using two clean curved arrows around the key, not wear or damage. Background navy fading into muted blue, delicate ground shadow. Composition: car occupies lower two thirds, short large Korean title at top in warm white. Text verbatim, exactly two lines: "중고차" then "취득세". No other writing. Visually distinguish the car acquisition tax from annual vehicle tax or vehicle financing.
```

### overdraft-interest-calculator

```text
Use case: stylized-concept. Asset type: unique TaxYou calculator Open Graph thumbnail, square 1:1, designed to be delivered at 512x512. Create a polished editorial 3D illustration, refined tactile ceramic and paper materials, crisp forms, soft studio light, deep ink navy with warm ivory and restrained amber details suited to a financial calculation website. Large central storytelling subject, exceptionally clear at small thumbnail size, generous margins. This must feel like a thoughtful illustration of this calculator, not an advertising banner. No brand names or logos, no watermark, no tax rates, no fabricated numerical examples, no fine print. Subject: an open navy bank passbook with a large debossed minus symbol, its ivory pages flowing into a sculptural desk calendar with a few amber date squares, and a small neat stack of coins. Create an elegant diagonal still life showing that interest depends on amount used and days used. No credit card, no house, no invented numbers or dates. Deep navy background, pale porcelain calendar, amber accents. Large readable Korean title at top, exactly two lines: "마이너스통장" then "이자 계산". Use clean contemporary Korean sans serif, modest generous letter spacing. Objects fill lower two thirds, strong distinct silhouette.
```

### vat-calculator

```text
Use case: stylized-concept. Asset type: unique TaxYou calculator Open Graph thumbnail, square 1:1, designed to be delivered at 512x512. Create a polished editorial 3D illustration, refined tactile ceramic and paper materials, crisp forms, soft studio light, deep ink navy with warm ivory and restrained amber details suited to a financial calculation website. Large central storytelling subject, exceptionally clear at small thumbnail size, generous margins. This must feel like a thoughtful illustration of this calculator, not an advertising banner. No brand names or logos, no watermark, no tax rates, no fabricated numerical examples, no fine print. Subject: an artfully folded ivory sales receipt splitting into two wide paper ribbons, one navy for the supply value and one amber for VAT, which visually come together at a simple plus symbol over a compact calculator. A refined overhead paper sculpture still life, unlike a dashboard. A few blank embossed receipt lines, no figures or tax rate. Warm ivory background with navy and amber sculptural forms. Large dark navy Korean headline at top, exactly two lines: "공급가액" then "부가세". Clearly explain an invoice total being separated into base amount and tax without relying on small writing.
```

### pension-income-tax

```text
Use case: stylized-concept. Asset type: unique TaxYou calculator Open Graph thumbnail, square 1:1, designed to be delivered at 512x512. Create a polished editorial 3D illustration, refined tactile ceramic and paper materials, crisp forms, soft studio light, deep ink navy with warm ivory and restrained amber details suited to a financial calculation website. Large central storytelling subject, exceptionally clear at small thumbnail size, generous margins. This must feel like a thoughtful illustration of this calculator, not an advertising banner. No brand names or logos, no watermark, no tax rates, no fabricated numerical examples, no fine print. Subject: a refined ivory pension envelope with a small navy seal clearly reading "IRP", beside a curved path of three softly glowing amber coin stacks that mark recurring pension payments, an understated blank calendar leaf and subtle silver percentage token. Distinct flowing horizontal composition, visually suggesting retirement income paid over time and tax deducted, never a get-rich growth chart. Deep navy-blue background, soft tactile ceramic and folded paper. Large Korean headline at top, exactly two lines: "퇴직연금" then "수령 세금". No age, rate, year, invented bank logo or numerical example.
```

### comprehensive-real-estate-tax-calculator

```text
Use case: stylized-concept. Asset type: unique TaxYou calculator Open Graph thumbnail, square 1:1, designed to be delivered at 512x512. Create a polished editorial 3D illustration, refined tactile ceramic and paper materials, crisp forms, soft studio light, deep ink navy with warm ivory and restrained amber details suited to a financial calculation website. Large central storytelling subject, exceptionally clear at small thumbnail size, generous margins. This must feel like a thoughtful illustration of this calculator, not an advertising banner. No brand names or logos, no watermark, no tax rates, no fabricated numerical examples, no fine print. Subject: three beautiful miniature Korean apartment buildings of varied height, arranged as a single property portfolio on three interlocking ivory plot tiles. An elegant navy property assessment folder stands behind, a small amber percentage seal in front and two restrained coin stacks. Low three-quarter architectural view with a premium editorial model-making feeling. Background warm ivory with soft blue architectural shadows. Large dark navy Korean headline across top, exactly two lines: "종합부동산세" then "계산". No real prices, tax rates, tax brackets, years or invented emblems. Emphasize combined residential property value and tax, rather than a house purchase or mortgage.
```

### ltv-calculator

```text
Use case: stylized-concept. Asset type: unique TaxYou calculator Open Graph thumbnail, square 1:1, designed to be delivered at 512x512. Create a polished editorial 3D illustration, refined tactile ceramic and paper materials, crisp forms, soft studio light, deep ink navy with warm ivory and restrained amber details suited to a financial calculation website. Large central storytelling subject, exceptionally clear at small thumbnail size, generous margins. This must feel like a thoughtful illustration of this calculator, not an advertising banner. No brand names or logos, no watermark, no tax rates, no fabricated numerical examples, no fine print. Subject: a single sculptural ivory house sitting at the center of a thick horizontal circular ring. The ring is a carefully designed navy whole with a restrained amber segment, suggesting a loan as part of total home value without stating any numeric ratio. A small folded property valuation card beneath the house and subtle coin edge. Eye-level architectural still life, striking simple silhouette. Background deep ink navy fading to slate. Large ivory title "LTV" at top, and directly beneath in Korean "담보대출 한도". No numeric percentage, no gauge needle, no bank logo, no other writing. Strong visual focus on HOME VALUE, not salary or loan repayment.
```

### dsr-calculator

```text
Use case: stylized-concept. Asset type: unique TaxYou calculator Open Graph thumbnail, square 1:1, designed to be delivered at 512x512. Create a polished editorial 3D illustration, refined tactile ceramic and paper materials, crisp forms, soft studio light, deep ink navy with warm ivory and restrained amber details suited to a financial calculation website. Large central storytelling subject, exceptionally clear at small thumbnail size, generous margins. This must feel like a thoughtful illustration of this calculator, not an advertising banner. No brand names or logos, no watermark, no tax rates, no fabricated numerical examples, no fine print. Subject: a premium sculptural semicircular ivory gauge with an amber needle, set on a navy plinth. Beneath it, one folded salary envelope fans into three clearly separated paper strips leading into small restrained coin stacks, visually showing multiple debt repayments drawn from income. A small embossed won symbol on the envelope only. Warm ivory background with very soft shadows, navy and amber objects. Bold dark navy title "DSR" at top with Korean subtitle "소득 대비 상환액". No numerical ratios, no threshold colors implying approval, no house model, no document clutter. Emphasize income and repayment burden. Clear proportions at small thumbnail size.
```

### jeonse-loan-calculator

```text
Use case: stylized-concept. Asset type: unique TaxYou calculator Open Graph thumbnail, square 1:1, designed to be delivered at 512x512. Create a polished editorial 3D illustration, refined tactile ceramic and paper materials, crisp forms, soft studio light, deep ink navy with warm ivory and restrained amber details suited to a financial calculation website. Large central storytelling subject, exceptionally clear at small thumbnail size, generous margins. This must feel like a thoughtful illustration of this calculator, not an advertising banner. No brand names or logos, no watermark, no tax rates, no fabricated numerical examples, no fine print. Subject: a small beautifully crafted ivory apartment doorway with a navy open door and one oversized amber house key leaning across a folded blank rental lease. A single navy desk calendar page with embossed percent symbol, a short orderly row of amber coins evokes monthly rent-deposit loan interest. Intimate close-up still life distinct from an LTV mortgage house or apartment property portfolio. Deep navy and slightly teal background, warm ivory lighting, refined ceramic and paper. Large Korean headline at top, exactly two lines: "전세자금대출" then "월 이자". No actual interest rate, amounts, dates, bank names or promotional slogans.
```


## Additional 19 pages — 2026-10-30

Priority is an editorial implementation order based on broad everyday use, a distinct calculation purpose and coverage across salary, tax, housing, loans, benefits and savings. It is not a measured search-volume or CTR ranking. Previously assigned unique OG images were excluded.

| Priority | Calculator | Page | Image | Selection reason |
| --- | --- | --- | --- | --- |
| 1 | 연봉 실수령액 | [net-salary-calculator.html](../../net-salary-calculator.html) | [net-salary-calculator.png](net-salary-calculator.png) | 급여의 공제와 실제 입금액을 구분하는 대표 계산기 |
| 2 | 퇴직금 | [severance-pay-calculator.html](../../severance-pay-calculator.html) | [severance-pay-calculator.png](severance-pay-calculator.png) | 퇴직 시 정산과 재직기간 확인 |
| 3 | 주휴수당 | [weekly-holiday-pay-calculator.html](../../weekly-holiday-pay-calculator.html) | [weekly-holiday-pay-calculator.png](weekly-holiday-pay-calculator.png) | 시급·근무시간 기반 임금 확인 |
| 4 | 실업급여 | [unemployment-benefit-calculator.html](../../unemployment-benefit-calculator.html) | [unemployment-benefit-calculator.png](unemployment-benefit-calculator.png) | 퇴직 후 급여·수급기간 계획 |
| 5 | 연차·연차수당 | [annual-leave-calculator.html](../../annual-leave-calculator.html) | [annual-leave-calculator.png](annual-leave-calculator.png) | 연차 발생·잔여일수와 정산 |
| 6 | 육아휴직 급여 | [parental-leave-benefit-calculator.html](../../parental-leave-benefit-calculator.html) | [parental-leave-benefit-calculator.png](parental-leave-benefit-calculator.png) | 가계의 육아휴직 기간 소득 계획 |
| 7 | 연말정산 환급액 | [year-end-tax-calculator.html](../../year-end-tax-calculator.html) | [year-end-tax-calculator.png](year-end-tax-calculator.png) | 연말정산 시기와 환급·추가 납부 확인 |
| 8 | 월세 세액공제 | [rent-tax-credit-calculator.html](../../rent-tax-credit-calculator.html) | [rent-tax-credit-calculator.png](rent-tax-credit-calculator.png) | 임차인의 주거비 세액공제 확인 |
| 9 | 종합소득세 | [comprehensive-income-tax-calculator.html](../../comprehensive-income-tax-calculator.html) | [comprehensive-income-tax-calculator.png](comprehensive-income-tax-calculator.png) | 소득 종류를 합산하는 대표 세금 계산 |
| 10 | 아파트 취득세 | [acquisition-tax.html](../../acquisition-tax.html) | [acquisition-tax.png](acquisition-tax.png) | 주택 구매 전 초기 세금 예산 |
| 11 | 아파트 재산세 | [holding-tax.html](../../holding-tax.html) | [holding-tax.png](holding-tax.png) | 주택 보유 중 정기 세금 확인 |
| 12 | 아파트 양도세 | [transfer-tax.html](../../transfer-tax.html) | [transfer-tax.png](transfer-tax.png) | 주택 매도 전 예상 세금 확인 |
| 13 | 증여세 | [gift-tax.html](../../gift-tax.html) | [gift-tax.png](gift-tax.png) | 가족 간 재산 이전 세금 계획 |
| 14 | 상속세 | [inheritance-tax.html](../../inheritance-tax.html) | [inheritance-tax.png](inheritance-tax.png) | 상속재산·공제와 세금 확인 |
| 15 | 대출 이자 | [loan-calculator.html](../../loan-calculator.html) | [loan-calculator.png](loan-calculator.png) | 상환방식별 월 납입액·총이자 비교 |
| 16 | 주택담보대출 | [mortgage-loan-calculator.html](../../mortgage-loan-calculator.html) | [mortgage-loan-calculator.png](mortgage-loan-calculator.png) | 주택 구입자금·한도·상환 부담 통합 확인 |
| 17 | 근로장려금 | [earned-income-credit-calculator.html](../../earned-income-credit-calculator.html) | [earned-income-credit-calculator.png](earned-income-credit-calculator.png) | 가구·소득·재산에 따른 지원금 확인 |
| 18 | 복리 | [compound-interest-calculator.html](../../compound-interest-calculator.html) | [compound-interest-calculator.png](compound-interest-calculator.png) | 저축·투자의 장기 적립 시나리오 |
| 19 | 예금·적금 이자 | [savings-interest-calculator.html](../../savings-interest-calculator.html) | [savings-interest-calculator.png](savings-interest-calculator.png) | 저축 방식별 세후 이자·만기액 비교 |

### Generation prompts for the additional images

Each prompt below was used in a separate built-in `image_gen` call. The final 512×512 PNGs were prepared using `sips`, then non-rendering PNG metadata was removed without changing the compressed pixel data.

#### net-salary-calculator

```text
Use case: stylized-concept. Asset type: unique TaxYou calculator Open Graph thumbnail, square 1:1, designed to be delivered at 512x512. Create a polished editorial 3D illustration, refined tactile ceramic and paper materials, crisp forms, soft studio light, deep ink navy with warm ivory and restrained amber details suited to a financial calculation website. Large central storytelling subject, exceptionally clear at small thumbnail size, generous margins. This must feel like a thoughtful illustration of this calculator, not an advertising banner. No brand names or logos, no watermark, no tax rates, no fabricated numerical examples, no fine print. Use only the exact short headline specified, beautifully typeset in legible bold Korean, and no other text unless explicitly allowed. Subject: a sculptural folded ivory monthly payslip transforming into two distinct neat groups: a large navy wallet with amber coins representing take-home pay, and two small paper tabs set aside representing deductions. A small amber minus symbol between the payslip and the tabs. Refined top-down still life with crisp generous breathing room, warm ivory background. Headline at top, two lines exactly: "연봉" and "실수령액". No tax percentages, no fake payslip numbers, no currency bills. Main visual is salary after deductions, not investment gains.
```

#### severance-pay-calculator

```text
Use case: stylized-concept. Asset type: unique TaxYou calculator Open Graph thumbnail, square 1:1, designed to be delivered at 512x512. Create a polished editorial 3D illustration, refined tactile ceramic and paper materials, crisp forms, soft studio light, deep ink navy with warm ivory and restrained amber details suited to a financial calculation website. Large central storytelling subject, exceptionally clear at small thumbnail size, generous margins. This must feel like a thoughtful illustration of this calculator, not an advertising banner. No brand names or logos, no watermark, no tax rates, no fabricated numerical examples, no fine print. Use only the exact short headline specified, beautifully typeset in legible bold Korean, and no other text unless explicitly allowed. Subject: an elegant closed navy work briefcase resting on an ivory timeline of three interlocking calendar leaves, ending at a single amber payout envelope with a subtle won-symbol seal. A silver desk clock leaned beside the calendar suggests length of service. Three-quarter studio still life, deep blue background, warm ivory paper. Headline two lines at top exactly: "퇴직금" and "계산". No IRP lettering, no recurring pension coin path, no age or dates. Convey a payout based on employment duration and wages.
```

#### weekly-holiday-pay-calculator

```text
Use case: stylized-concept. Asset type: unique TaxYou calculator Open Graph thumbnail, square 1:1, designed to be delivered at 512x512. Create a polished editorial 3D illustration, refined tactile ceramic and paper materials, crisp forms, soft studio light, deep ink navy with warm ivory and restrained amber details suited to a financial calculation website. Large central storytelling subject, exceptionally clear at small thumbnail size, generous margins. This must feel like a thoughtful illustration of this calculator, not an advertising banner. No brand names or logos, no watermark, no tax rates, no fabricated numerical examples, no fine print. Use only the exact short headline specified, beautifully typeset in legible bold Korean, and no other text unless explicitly allowed. Subject: a sculptural miniature workweek made of five upright navy calendar tiles leading to a single warm amber rest-day tile with a sun relief; in front a simple elegant ivory clock and small open pay envelope with a few coins. Clean lateral sequence showing paid weekly rest after work, not annual leave. Warm ivory background, subtle slate cast shadows. Two-line navy Korean headline exactly: "주휴수당" and "계산". No weekday letters, numbers, hours, minimum wage or rates.
```

#### unemployment-benefit-calculator

```text
Use case: stylized-concept. Asset type: unique TaxYou calculator Open Graph thumbnail, square 1:1, designed to be delivered at 512x512. Create a polished editorial 3D illustration, refined tactile ceramic and paper materials, crisp forms, soft studio light, deep ink navy with warm ivory and restrained amber details suited to a financial calculation website. Large central storytelling subject, exceptionally clear at small thumbnail size, generous margins. This must feel like a thoughtful illustration of this calculator, not an advertising banner. No brand names or logos, no watermark, no tax rates, no fabricated numerical examples, no fine print. Use only the exact short headline specified, beautifully typeset in legible bold Korean, and no other text unless explicitly allowed. Subject: an open navy job portfolio on a broad ivory calendar platform; a flowing folded paper bridge connects a small previous-work briefcase on one side to a new blank application folder on the other. One amber support-payment envelope at center, restrained coin stack and a hopeful softly lit doorway behind. Quiet supportive editorial still life about income support during a job transition, not effortless money. Deep navy backdrop. Large warm white Korean title exactly two lines: "실업급여" and "계산". No application approval seals, no fixed amount or duration.
```

#### annual-leave-calculator

```text
Use case: stylized-concept. Asset type: unique TaxYou calculator Open Graph thumbnail, square 1:1, designed to be delivered at 512x512. Create a polished editorial 3D illustration, refined tactile ceramic and paper materials, crisp forms, soft studio light, deep ink navy with warm ivory and restrained amber details suited to a financial calculation website. Large central storytelling subject, exceptionally clear at small thumbnail size, generous margins. This must feel like a thoughtful illustration of this calculator, not an advertising banner. No brand names or logos, no watermark, no tax rates, no fabricated numerical examples, no fine print. Use only the exact short headline specified, beautifully typeset in legible bold Korean, and no other text unless explicitly allowed. Subject: a beautifully crafted ivory desk calendar with removable square date tiles: a few navy checked tiles on the left, a small fan of unused amber tiles on the right. A minimal navy travel bag sits behind while a tiny elegant coin dish in foreground suggests unused-leave allowance. Overhead angled paper-and-ceramic arrangement, warm ivory background. Two-line Korean headline in navy exactly: "연차" and "연차수당". No years, dates, entitlement counts or promises. Clear distinction from weekly holiday wages.
```

#### parental-leave-benefit-calculator

```text
Use case: stylized-concept. Asset type: unique TaxYou calculator Open Graph thumbnail, square 1:1, designed to be delivered at 512x512. Create a polished editorial 3D illustration, refined tactile ceramic and paper materials, crisp forms, soft studio light, deep ink navy with warm ivory and restrained amber details suited to a financial calculation website. Large central storytelling subject, exceptionally clear at small thumbnail size, generous margins. This must feel like a thoughtful illustration of this calculator, not an advertising banner. No brand names or logos, no watermark, no tax rates, no fabricated numerical examples, no fine print. Use only the exact short headline specified, beautifully typeset in legible bold Korean, and no other text unless explicitly allowed. Subject: a soft ivory miniature baby bassinet with a folded navy blanket under a graceful amber arch; alongside it a small navy calendar accordion with three blank payment-envelope pockets, symbolizing monthly parental-leave income. Tasteful warm intimate family planning still life, restrained amber details, deep blue backdrop and gentle studio light. No people, no baby face, no cartoon character. Two-line ivory Korean headline at top exactly: "육아휴직" and "급여 계산". No 6+6 numbers, rates or benefit caps.
```

#### year-end-tax-calculator

```text
Use case: stylized-concept. Asset type: unique TaxYou calculator Open Graph thumbnail, square 1:1, designed to be delivered at 512x512. Create a polished editorial 3D illustration, refined tactile ceramic and paper materials, crisp forms, soft studio light, deep ink navy with warm ivory and restrained amber details suited to a financial calculation website. Large central storytelling subject, exceptionally clear at small thumbnail size, generous margins. This must feel like a thoughtful illustration of this calculator, not an advertising banner. No brand names or logos, no watermark, no tax rates, no fabricated numerical examples, no fine print. Use only the exact short headline specified, beautifully typeset in legible bold Korean, and no other text unless explicitly allowed. Subject: an ivory tax settlement folder opened into two large sheets: one navy sheet for tax already paid and one ivory sheet for the final calculation. An elegant amber double-headed comparison arrow links them, with a modest refund tray holding coins in the foreground. Three-quarter editorial paper sculpture, deep navy background, thoughtful clean composition. Headline two lines exactly: "연말정산" and "환급액 계산". No refund guarantees, no real amounts or December dates, no official seals.
```

#### rent-tax-credit-calculator

```text
Use case: stylized-concept. Asset type: unique TaxYou calculator Open Graph thumbnail, square 1:1, designed to be delivered at 512x512. Create a polished editorial 3D illustration, refined tactile ceramic and paper materials, crisp forms, soft studio light, deep ink navy with warm ivory and restrained amber details suited to a financial calculation website. Large central storytelling subject, exceptionally clear at small thumbnail size, generous margins. This must feel like a thoughtful illustration of this calculator, not an advertising banner. No brand names or logos, no watermark, no tax rates, no fabricated numerical examples, no fine print. Use only the exact short headline specified, beautifully typeset in legible bold Korean, and no other text unless explicitly allowed. Subject: a charming ivory apartment room cross section with one navy window, beside a folded monthly rent receipt and a simple lease envelope. A small amber percentage token is gently inset into the receipt and an amber curved subtraction notch suggests a tax credit. A single house key rests flat, secondary to the receipt. Warm ivory background with deep navy props. Headline at top exactly two lines: "월세" and "세액공제". No mortgage gauge, no interest rate, no refund amount, no tax-credit percentage.
```

#### comprehensive-income-tax-calculator

```text
Use case: stylized-concept. Asset type: unique TaxYou calculator Open Graph thumbnail, square 1:1, designed to be delivered at 512x512. Create a polished editorial 3D illustration, refined tactile ceramic and paper materials, crisp forms, soft studio light, deep ink navy with warm ivory and restrained amber details suited to a financial calculation website. Large central storytelling subject, exceptionally clear at small thumbnail size, generous margins. This must feel like a thoughtful illustration of this calculator, not an advertising banner. No brand names or logos, no watermark, no tax rates, no fabricated numerical examples, no fine print. Use only the exact short headline specified, beautifully typeset in legible bold Korean, and no other text unless explicitly allowed. Subject: three distinct elegant folded income streams—an ivory salary envelope, a navy small-business ledger, and an amber investment statement—converging into one broad ivory tax declaration folder. An understated navy calculator with blank display sits at the junction. Top-down structured paper sculpture with three streams clearly visible and no fine text, warm ivory background with navy and amber details. Headline exactly two lines: "종합소득세" and "계산". No tax brackets, dates, rates, specific deduction or invented emblem.
```

#### acquisition-tax

```text
Use case: stylized-concept. Asset type: unique TaxYou calculator Open Graph thumbnail, square 1:1, designed to be delivered at 512x512. Create a polished editorial 3D illustration, refined tactile ceramic and paper materials, crisp forms, soft studio light, deep ink navy with warm ivory and restrained amber details suited to a financial calculation website. Large central storytelling subject, exceptionally clear at small thumbnail size, generous margins. This must feel like a thoughtful illustration of this calculator, not an advertising banner. No brand names or logos, no watermark, no tax rates, no fabricated numerical examples, no fine print. Use only the exact short headline specified, beautifully typeset in legible bold Korean, and no other text unless explicitly allowed. Subject: a pristine sculptural ivory Korean apartment model standing on a newly transferred title deed, with a single oversized amber apartment key and an elegant navy tax receipt folded at the base. A restrained raised percent symbol embossed into the receipt. Close architectural editorial still life emphasizing a new property purchase and initial acquisition tax, not annual property tax. Deep navy backdrop, warm ivory highlights, soft shadow. Large Korean headline two lines exactly: "아파트" and "취득세". No car, prices, tax rates, apartment brand logo or year.
```

#### holding-tax

```text
Use case: stylized-concept. Asset type: unique TaxYou calculator Open Graph thumbnail, square 1:1, designed to be delivered at 512x512. Create a polished editorial 3D illustration, refined tactile ceramic and paper materials, crisp forms, soft studio light, deep ink navy with warm ivory and restrained amber details suited to a financial calculation website. Large central storytelling subject, exceptionally clear at small thumbnail size, generous margins. This must feel like a thoughtful illustration of this calculator, not an advertising banner. No brand names or logos, no watermark, no tax rates, no fabricated numerical examples, no fine print. Use only the exact short headline specified, beautifully typeset in legible bold Korean, and no other text unless explicitly allowed. Subject: a pair of tasteful miniature ivory apartment towers on one navy plot tile, with an elegantly folded yearly property assessment notice wrapping the base like a paper calendar band. An amber circular calendar motif with a small percent seal suggests a recurring property tax, alongside a restrained coin dish. Architectural still life, warm ivory background and navy folded paper, soft daylight. Headline two lines exactly: "아파트" and "재산세". No date numerals, no tax amounts, no keys or transfer arrows. Distinguish recurring holding tax from a home purchase.
```

#### transfer-tax

```text
Use case: stylized-concept. Asset type: unique TaxYou calculator Open Graph thumbnail, square 1:1, designed to be delivered at 512x512. Create a polished editorial 3D illustration, refined tactile ceramic and paper materials, crisp forms, soft studio light, deep ink navy with warm ivory and restrained amber details suited to a financial calculation website. Large central storytelling subject, exceptionally clear at small thumbnail size, generous margins. This must feel like a thoughtful illustration of this calculator, not an advertising banner. No brand names or logos, no watermark, no tax rates, no fabricated numerical examples, no fine print. Use only the exact short headline specified, beautifully typeset in legible bold Korean, and no other text unless explicitly allowed. Subject: an ivory apartment model in the center of an editorial paper-sculpture composition: two large upright blank sale documents on either side, navy on the left and amber on the right, linked by a horizontal arrow with a small visible gap representing gain after costs. A discreet slim calculator and folded expense slip in foreground. Deep navy backdrop with warm ivory architecture, clear simple forms. Headline two lines exactly: "아파트" and "양도세". No market price examples, no tax rates, no celebratory gold piles. Focus on sale proceeds versus acquisition cost.
```

#### gift-tax

```text
Use case: stylized-concept. Asset type: unique TaxYou calculator Open Graph thumbnail, square 1:1, designed to be delivered at 512x512. Create a polished editorial 3D illustration, refined tactile ceramic and paper materials, crisp forms, soft studio light, deep ink navy with warm ivory and restrained amber details suited to a financial calculation website. Large central storytelling subject, exceptionally clear at small thumbnail size, generous margins. This must feel like a thoughtful illustration of this calculator, not an advertising banner. No brand names or logos, no watermark, no tax rates, no fabricated numerical examples, no fine print. Use only the exact short headline specified, beautifully typeset in legible bold Korean, and no other text unless explicitly allowed. Subject: a beautifully crafted ivory gift box with a deep navy ribbon, its lid slightly lifted to reveal a small sculptural house and a modest stack of amber coins; an elegant folded transfer document lies beneath with a small embossed percent seal. Close-up studio still life, warm ivory backdrop, thoughtful family asset transfer theme rather than holiday shopping. Large navy Korean headline exactly two lines: "증여세" and "계산". No people, no retail labels, no allowance threshold, no amounts or dates.
```

#### inheritance-tax

```text
Use case: stylized-concept. Asset type: unique TaxYou calculator Open Graph thumbnail, square 1:1, designed to be delivered at 512x512. Create a polished editorial 3D illustration, refined tactile ceramic and paper materials, crisp forms, soft studio light, deep ink navy with warm ivory and restrained amber details suited to a financial calculation website. Large central storytelling subject, exceptionally clear at small thumbnail size, generous margins. This must feel like a thoughtful illustration of this calculator, not an advertising banner. No brand names or logos, no watermark, no tax rates, no fabricated numerical examples, no fine print. Use only the exact short headline specified, beautifully typeset in legible bold Korean, and no other text unless explicitly allowed. Subject: an archival navy family asset folder opened into a dignified ivory family-tree paper relief, with a small ivory house and two restrained coin stacks arranged on separate paper estate tiles. An amber dividing line connects the shared folder to the tiles and a subtle percentage seal sits on the folder. Calm respectful editorial still life, deep navy backdrop with soft warm light. No mourning symbols, graves, portraits or people. Large ivory Korean headline exactly two lines: "상속세" and "계산". No values, deduction thresholds, rates or specific inheritance shares.
```

#### loan-calculator

```text
Use case: stylized-concept. Asset type: unique TaxYou calculator Open Graph thumbnail, square 1:1, designed to be delivered at 512x512. Create a polished editorial 3D illustration, refined tactile ceramic and paper materials, crisp forms, soft studio light, deep ink navy with warm ivory and restrained amber details suited to a financial calculation website. Large central storytelling subject, exceptionally clear at small thumbnail size, generous margins. This must feel like a thoughtful illustration of this calculator, not an advertising banner. No brand names or logos, no watermark, no tax rates, no fabricated numerical examples, no fine print. Use only the exact short headline specified, beautifully typeset in legible bold Korean, and no other text unless explicitly allowed. Subject: three refined ivory payment-plan strips unfolding forward from a navy loan envelope, each strip with a different arrangement of navy and amber blocks: evenly spaced level blocks, gently descending blocks, and a small end-of-term grouped block. The strips represent alternative repayment schedules, not promises. One small navy calculator with blank display sits beside them. Warm ivory backdrop, clean diagonal perspective. Two-line navy headline exactly: "대출 이자" and "상환 비교". No numerical examples, no rate, no house or bank branding.
```

#### mortgage-loan-calculator

```text
Use case: stylized-concept. Asset type: unique TaxYou calculator Open Graph thumbnail, square 1:1, designed to be delivered at 512x512. Create a polished editorial 3D illustration, refined tactile ceramic and paper materials, crisp forms, soft studio light, deep ink navy with warm ivory and restrained amber details suited to a financial calculation website. Large central storytelling subject, exceptionally clear at small thumbnail size, generous margins. This must feel like a thoughtful illustration of this calculator, not an advertising banner. No brand names or logos, no watermark, no tax rates, no fabricated numerical examples, no fine print. Use only the exact short headline specified, beautifully typeset in legible bold Korean, and no other text unless explicitly allowed. Subject: a beautiful ivory apartment model supported by two interlocking sculptural components: a navy savings wallet and an amber loan-plan ledger. In front a single long folded monthly repayment strip extends toward a tasteful blank calculator. Architectural planning still life, deep navy background, warm ivory and restrained amber. Show home purchase funding plus monthly repayment, with no circular LTV ring and no DSR gauge, visually distinct from those individual ratio calculators. Large Korean title exactly two lines: "주택담보대출" and "계산". No numeric limits, loan approvals, prices, interest rates or slogans.
```

#### earned-income-credit-calculator

```text
Use case: stylized-concept. Asset type: unique TaxYou calculator Open Graph thumbnail, square 1:1, designed to be delivered at 512x512. Create a polished editorial 3D illustration, refined tactile ceramic and paper materials, crisp forms, soft studio light, deep ink navy with warm ivory and restrained amber details suited to a financial calculation website. Large central storytelling subject, exceptionally clear at small thumbnail size, generous margins. This must feel like a thoughtful illustration of this calculator, not an advertising banner. No brand names or logos, no watermark, no tax rates, no fabricated numerical examples, no fine print. Use only the exact short headline specified, beautifully typeset in legible bold Korean, and no other text unless explicitly allowed. Subject: three small abstract ivory household silhouettes without faces stand on a navy household-card folder; beside them a warm amber support-payment envelope rests on a neatly folded income statement. A navy checklist frame with three unlabelled tiles suggests household, income and assets reviewed together. Tactile editorial paper sculpture, warm ivory background, restrained few coins. Clear supportive social-benefit planning theme. Two-line navy Korean headline exactly: "근로장려금" and "계산". No official insignia, approval checkmark, fixed subsidy amount, guaranteed payout or dates.
```

#### compound-interest-calculator

```text
Use case: stylized-concept. Asset type: unique TaxYou calculator Open Graph thumbnail, square 1:1, designed to be delivered at 512x512. Create a polished editorial 3D illustration, refined tactile ceramic and paper materials, crisp forms, soft studio light, deep ink navy with warm ivory and restrained amber details suited to a financial calculation website. Large central storytelling subject, exceptionally clear at small thumbnail size, generous margins. This must feel like a thoughtful illustration of this calculator, not an advertising banner. No brand names or logos, no watermark, no tax rates, no fabricated numerical examples, no fine print. Use only the exact short headline specified, beautifully typeset in legible bold Korean, and no other text unless explicitly allowed. Subject: a graceful sculptural spiral staircase made of ivory savings blocks, each step holding a modest navy-and-amber coin cluster that grows gradually; an amber loop arrow subtly returns the top of one coin cluster into the next, suggesting reinvestment rather than guaranteed riches. A small navy seed pot at the center has one delicate ivory leaf. Deep navy backdrop, refined conceptual editorial 3D, lots of space and no jagged stock chart. Large ivory Korean headline exactly two lines: "복리" and "계산". No promised returns, percentages, huge gold piles, digits or years.
```

#### savings-interest-calculator

```text
Use case: stylized-concept. Asset type: unique TaxYou calculator Open Graph thumbnail, square 1:1, designed to be delivered at 512x512. Create a polished editorial 3D illustration, refined tactile ceramic and paper materials, crisp forms, soft studio light, deep ink navy with warm ivory and restrained amber details suited to a financial calculation website. Large central storytelling subject, exceptionally clear at small thumbnail size, generous margins. This must feel like a thoughtful illustration of this calculator, not an advertising banner. No brand names or logos, no watermark, no tax rates, no fabricated numerical examples, no fine print. Use only the exact short headline specified, beautifully typeset in legible bold Korean, and no other text unless explicitly allowed. Subject: two premium transparent fluted savings vessels on ivory pedestals: the left holds one tidy initial deposit cluster and a single navy deposit envelope, the right is approached by a sequence of smaller amber monthly deposit tiles. A simple folded blank maturity statement bridges the two at the front and a subtle tiny percent motif suggests interest. Warm ivory background with deep navy details, restrained coins and strong clear silhouette. Two-line navy Korean headline exactly: "예금·적금" and "이자 계산". No bank logo, advertised rate, tax percentage, deposit guarantee badge or amounts.
```
