require 'json'
require 'rexml/document'
require 'time'
require 'uri'

ROOT = File.expand_path('..', __dir__)
HTML_FILES = Dir[File.join(ROOT, '*.html')].sort.freeze
SITE_ORIGIN = 'https://www.taxyou.co.kr'.freeze
STYLESHEET_VERSION = '20260817-ui-consistency'.freeze

NAV_LINKS = [
  ['세금·금융 계산기', 'index.html#calculatorMenu'],
  ['세금 납부 순위', 'tax-rank.html'],
  ['이용 안내', 'about.html'],
  ['세금 가이드', 'guide.html'],
  ['절세 노하우', 'blog.html']
].freeze

FOOTER_LINKS = [
  ['운영자 소개', 'author.html'],
  ['계산 기준', 'methodology.html'],
  ['자주 묻는 질문', 'faq.html'],
  ['편집 정책', 'editorial-policy.html'],
  ['책임 고지', 'index.html#calculationStandards'],
  ['개인정보 처리방침', 'privacy.html'],
  ['문의', 'index.html#contactInfo']
].freeze

NEW_FINANCIAL_CALCULATORS = {
  'stock-average-price-calculator.html' => '주식 평단가 계산기',
  'overseas-stock-capital-gains-tax.html' => '해외주식 양도소득세 계산기',
  'securities-transaction-tax.html' => '증권거래세 계산기',
  'financial-income-comprehensive-tax.html' => '금융소득 종합과세 계산기',
  'retirement-income-tax.html' => '퇴직소득세 계산기',
  'pension-income-tax.html' => '연금소득세 계산기'
}.freeze

SAVING_INVESTMENT_CALCULATORS = {
  'stock-average-price-calculator.html' => '주식 평단가 계산기',
  'compound-interest-calculator.html' => '복리 계산기'
}.freeze

NEW_BUSINESS_VEHICLE_CALCULATORS = {
  'vat-calculator.html' => '부가세 계산기',
  'freelancer-business-tax-calculator.html' => '프리랜서',
  'simplified-vs-general-vat-calculator.html' => '간이과세 일반과세 비교 계산기',
  'sole-proprietor-vs-corporation-tax-calculator.html' => '개인사업자 법인전환',
  'sole-proprietor-health-insurance-calculator.html' => '개인사업자 건강보험료',
  'vehicle-acquisition-tax-calculator.html' => '자동차 취등록세 계산기',
  'vehicle-tax-prepayment-calculator.html' => '자동차세·연납 계산기'
}.freeze

BUSINESS_CALCULATOR_REVIEW_DATES = {
  'vat-calculator.html' => '2026-08-18',
  'freelancer-business-tax-calculator.html' => '2026-08-18',
  'simplified-vs-general-vat-calculator.html' => '2026-08-18',
  'sole-proprietor-vs-corporation-tax-calculator.html' => '2026-08-18',
  'sole-proprietor-health-insurance-calculator.html' => '2026-08-18',
  'vehicle-acquisition-tax-calculator.html' => '2026-08-13',
  'vehicle-tax-prepayment-calculator.html' => '2026-08-13'
}.freeze

SHARED_REPORT_ACTION_PAGES = %w[
  loan-calculator.html
  mortgage-loan-calculator.html
  ltv-calculator.html
  dti-calculator.html
  dsr-calculator.html
  overdraft-interest-calculator.html
  credit-loan-calculator.html
  jeonse-loan-calculator.html
  auto-installment-calculator.html
  early-repayment-fee-calculator.html
  overseas-stock-capital-gains-tax.html
  securities-transaction-tax.html
  financial-income-comprehensive-tax.html
  retirement-income-tax.html
  pension-income-tax.html
  stock-average-price-calculator.html
  compound-interest-calculator.html
  vat-calculator.html
  freelancer-business-tax-calculator.html
  simplified-vs-general-vat-calculator.html
  sole-proprietor-vs-corporation-tax-calculator.html
  sole-proprietor-health-insurance-calculator.html
  vehicle-acquisition-tax-calculator.html
  vehicle-tax-prepayment-calculator.html
  holding-tax.html
  comprehensive-real-estate-tax-calculator.html
].freeze

def links_from(content)
  return [] unless content

  content.scan(/<a\s+href="([^"]+)"[^>]*>(.*?)<\/a>/m).map do |href, text|
    [text.gsub(/<[^>]+>/, '').strip, href]
  end
end

errors = []
titles = Hash.new { |hash, key| hash[key] = [] }
descriptions = Hash.new { |hash, key| hash[key] = [] }
canonicals = Hash.new { |hash, key| hash[key] = [] }
ids_by_file = {}

stock_average_source = File.read(File.join(ROOT, 'stock-average-price-calculator.html'))
errors << 'stock-average-price-calculator.html: title intent mismatch' unless stock_average_source.include?('<title>주식 평단가 계산기 | 물타기·평균단가 계산 - TaxYou</title>')
errors << 'stock-average-price-calculator.html: missing asset selector' unless stock_average_source.include?('id="averageAssetType"')
errors << 'stock-average-price-calculator.html: missing transaction and simulation modes' unless %w[transactions simulation].all? { |mode| stock_average_source.include?(%(<option value="#{mode}")) }
errors << 'stock-average-price-calculator.html: additional purchase mode is not default' unless stock_average_source.include?('<option value="simulation" selected>추가매수·목표 평단가 계산</option>')
errors << 'stock-average-price-calculator.html: additional purchase mode is not first' unless stock_average_source.match?(%r{<select id="averageCalculationMode"><option value="simulation" selected>})
errors << 'stock-average-price-calculator.html: missing target average reverse calculation' unless stock_average_source.include?('id="averageTargetPrice"')
errors << 'stock-average-price-calculator.html: missing finance breadcrumb hierarchy' unless stock_average_source.include?('index.html#financeCalculators">금융 계산기</a>') && stock_average_source.include?('index.html#savingInvestmentCalculators">저축·투자</a>')
errors << 'stock-average-price-calculator.html: missing four-level breadcrumb JSON-LD' unless stock_average_source.include?('"position":3,"name":"저축·투자","item":"https://www.taxyou.co.kr/#savingInvestmentCalculators"')
%w[주식\ 물타기\ 계산기 평균단가\ 계산기 코인\ 평단가\ 계산기].each do |keyword|
  errors << "stock-average-price-calculator.html: missing related intent #{keyword}" unless stock_average_source.include?(keyword)
end

compound_source = File.read(File.join(ROOT, 'compound-interest-calculator.html'))
errors << 'compound-interest-calculator.html: title intent mismatch' unless compound_source.include?('<title>복리 계산기 | 주식·적립식 수익 계산 - TaxYou</title>')
errors << 'compound-interest-calculator.html: H1 intent mismatch' unless compound_source.match?(%r{<h1[^>]*>.*복리 계산기</h1>})
%w[compoundPlanType compoundInitialPrincipal compoundRegularContribution compoundPeriodicRate compoundDuration compoundFrequency compoundContributionFrequency compoundContributionTiming compoundApplyFee compoundAnnualFeeRate compoundApplyInflation compoundInflationRate].each do |control_id|
  errors << "compound-interest-calculator.html: missing compound control #{control_id}" unless compound_source.include?(%(id="#{control_id}"))
end
%w[주식·적립식 일복리 월복리 연복리].each do |keyword|
  errors << "compound-interest-calculator.html: missing compound intent #{keyword}" unless compound_source.include?(keyword)
end
errors << 'compound-interest-calculator.html: missing official compound reference' unless compound_source.include?('investor.gov/financial-tools-calculators/calculators/compound-interest-calculator')
errors << 'compound-interest-calculator.html: missing daily compound option' unless compound_source.include?('<option value="365">일복리</option>')
errors << 'compound-interest-calculator.html: inflation default is not zero' unless compound_source.include?('id="compoundInflationRate" min="-99" max="1000" step="0.01" value="0"')
errors << 'compound-interest-calculator.html: missing daily duration presets' unless %w[30 90 252 365].all? { |days| compound_source.include?(%(data-compound-days="#{days}")) }
errors << 'compound-interest-calculator.html: missing finance breadcrumb hierarchy' unless compound_source.include?('index.html#financeCalculators">금융 계산기</a>') && compound_source.include?('index.html#savingInvestmentCalculators">저축·투자</a>')
investment_controller = File.read(File.join(ROOT, 'scripts/investment-tax-calculators.js'))
errors << 'investment-tax-calculators.js: compound plan fields do not use shared hidden state' unless investment_controller.include?("element.classList.toggle('is-hidden', !recurring)")
errors << 'investment-tax-calculators.js: compound frequency does not update input units' unless investment_controller.include?('function updateCompoundFrequency()') && investment_controller.include?('compoundDurationLabel')
%w[일복리와\ 월복리\ 차이 월복리와\ 연복리\ 차이].each do |removed_result|
  errors << "investment-tax-calculators.js: obsolete compound comparison remains: #{removed_result}" if investment_controller.include?(removed_result)
end

SAVING_INVESTMENT_CALCULATORS.each do |file, primary_keyword|
  source = File.read(File.join(ROOT, file))
  errors << "#{file}: saving/investment keyword missing from title" unless source[/<title>(.*?)<\/title>/m, 1]&.include?(primary_keyword)
  SAVING_INVESTMENT_CALCULATORS.each_key do |related_file|
    errors << "#{file}: missing related saving/investment calculator #{related_file}" unless source.include?(%(href="#{related_file}"))
  end
end

NEW_FINANCIAL_CALCULATORS.each do |file, primary_keyword|
  source = File.read(File.join(ROOT, file))
  title = source[/<title>(.*?)<\/title>/m, 1]&.strip
  h1 = source[/<h1\b[^>]*>(.*?)<\/h1>/m, 1]&.gsub(/<[^>]+>/, '')&.strip
  errors << "#{file}: primary keyword missing from title" unless title&.include?(primary_keyword)
  errors << "#{file}: primary keyword missing from H1" unless h1&.include?(primary_keyword)
  expected_breadcrumb = file == 'stock-average-price-calculator.html' ? '저축·투자</a>' : '금융·투자·연금 세금 계산기</a>'
  errors << "#{file}: missing financial category breadcrumb" unless source.include?(expected_breadcrumb)
  errors << "#{file}: missing shared calculation engine" unless source.include?('scripts/investment-tax-math.js')
  errors << "#{file}: missing shared UI controller" unless source.include?('scripts/investment-tax-calculators.js')
  NEW_FINANCIAL_CALCULATORS.each_key do |related_file|
    errors << "#{file}: missing related calculator #{related_file}" unless source.include?(%(href="#{related_file}"))
  end
end

NEW_BUSINESS_VEHICLE_CALCULATORS.each do |file, primary_keyword|
  source = File.read(File.join(ROOT, file))
  title = source[/<title>(.*?)<\/title>/m, 1]&.strip
  h1 = source[/<h1\b[^>]*>(.*?)<\/h1>/m, 1]&.gsub(/<[^>]+>/, '')&.strip
  canonical = source[/<link rel="canonical" href="([^"]+)"/, 1]
  errors << "#{file}: primary keyword missing from title" unless title&.include?(primary_keyword)
  errors << "#{file}: primary keyword missing from H1" unless h1&.include?(primary_keyword)
  errors << "#{file}: missing shared calculation engine" unless source.include?('scripts/business-vehicle-tax-math.js')
  errors << "#{file}: missing shared UI controller" unless source.include?('scripts/business-vehicle-tax-calculators.js')
  errors << "#{file}: canonical is not self-referencing" unless canonical == "#{SITE_ORIGIN}/#{file}"
  errors << "#{file}: missing verified source review date" unless source.include?(BUSINESS_CALCULATOR_REVIEW_DATES.fetch(file))
end

freelancer_business_source = File.read(File.join(ROOT, 'freelancer-business-tax-calculator.html'))
errors << 'freelancer-business-tax-calculator.html: title intent mismatch' unless freelancer_business_source.include?('<title>프리랜서 개인사업자 차이 | 3.3%·부가세 비교 계산기 - TaxYou</title>')
errors << 'freelancer-business-tax-calculator.html: H1 intent mismatch' unless freelancer_business_source.match?(%r{<h1[^>]*>.*프리랜서와 개인사업자 세금 차이 비교 계산기</h1>})
errors << 'freelancer-business-tax-calculator.html: missing page display name' unless freelancer_business_source.include?('프리랜서·개인사업자 세금 비교 계산기')
errors << 'freelancer-business-tax-calculator.html: missing contract classification confirmation' unless %w[comparisonWithholdingType comparisonVatType].all? { |id| freelancer_business_source.include?(%(id="#{id}")) }
errors << 'freelancer-business-tax-calculator.html: missing scope warning' unless freelancer_business_source.include?('최종 소득세 제외')

vat_type_comparison_source = File.read(File.join(ROOT, 'simplified-vs-general-vat-calculator.html'))
errors << 'simplified-vs-general-vat-calculator.html: title intent mismatch' unless vat_type_comparison_source.include?('<title>간이과세 일반과세 비교 계산기 | 기준·부가세 차이 - TaxYou</title>')
errors << 'simplified-vs-general-vat-calculator.html: H1 intent mismatch' unless vat_type_comparison_source.match?(%r{<h1[^>]*>.*간이과세 일반과세 비교 계산기</h1>})
%w[vatComparisonAnnualSales vatComparisonPriorYearSales vatComparisonIndustryRate vatComparisonPurchases vatComparisonInputVat vatComparisonSpecialBusiness vatComparisonExclusionCheck].each do |control_id|
  errors << "simplified-vs-general-vat-calculator.html: missing comparison control #{control_id}" unless vat_type_comparison_source.include?(%(id="#{control_id}"))
end
errors << 'simplified-vs-general-vat-calculator.html: missing official NTS VAT flow source' unless vat_type_comparison_source.include?('cntntsId=7695')
errors << 'simplified-vs-general-vat-calculator.html: missing official industry rate source' unless vat_type_comparison_source.include?('cntntsId=7696')
errors << 'simplified-vs-general-vat-calculator.html: missing threshold law source' unless vat_type_comparison_source.include?('부가가치세법시행령/제109조')
errors << 'simplified-vs-general-vat-calculator.html: missing scope limitation' unless vat_type_comparison_source.include?('사업 전체 유불리 아님')

sole_corporation_source = File.read(File.join(ROOT, 'sole-proprietor-vs-corporation-tax-calculator.html'))
errors << 'sole-proprietor-vs-corporation-tax-calculator.html: title intent mismatch' unless sole_corporation_source.include?('<title>개인사업자 법인전환 계산기 | 세금 차이·절세 분기점 - TaxYou</title>')
errors << 'sole-proprietor-vs-corporation-tax-calculator.html: H1 intent mismatch' unless sole_corporation_source.match?(%r{<h1[^>]*>.*개인사업자 법인전환 세금 비교 계산기</h1>})
errors << 'sole-proprietor-vs-corporation-tax-calculator.html: missing display name' unless sole_corporation_source.include?('개인사업자·법인 절세 분기점 계산기')
%w[soleCorpAnnualRevenue soleCorpBusinessExpenses soleCorpOtherIncome soleCorpPersonalDeductions soleCorpRepresentativeSalary soleCorpDividend soleCorpAdminCost soleCorpEmployerInsurance soleCorpEmployeeInsurance soleCorpCorporationType soleCorpSalaryConfirmation].each do |control_id|
  errors << "sole-proprietor-vs-corporation-tax-calculator.html: missing comparison control #{control_id}" unless sole_corporation_source.include?(%(id="#{control_id}"))
end
errors << 'sole-proprietor-vs-corporation-tax-calculator.html: missing 2026 corporate tax source' unless sole_corporation_source.include?('cntntsId=7746')
errors << 'sole-proprietor-vs-corporation-tax-calculator.html: missing conversion tax law source' unless sole_corporation_source.include?('조세특례제한법/제32조')
errors << 'sole-proprietor-vs-corporation-tax-calculator.html: missing retained earnings warning' unless sole_corporation_source.include?('법인 유보이익은 대표자 개인 돈이 아닙니다')
errors << 'sole-proprietor-vs-corporation-tax-calculator.html: missing transition tax exclusion' unless sole_corporation_source.include?('전환 자체의 세금 제외')
%w[개인사업자\ 법인전환 개인사업자\ 법인사업자\ 차이 개인사업자\ 법인\ 차이 개인사업자\ 법인전환\ 조건 개인사업자\ 법인전환\ 매출\ 기준 개인사업자\ 법인전환\ 시기 개인사업자\ 법인전환\ 세금].each do |phrase|
  errors << "sole-proprietor-vs-corporation-tax-calculator.html: missing related intent #{phrase}" unless sole_corporation_source.include?(phrase)
end

health_insurance_source = File.read(File.join(ROOT, 'sole-proprietor-health-insurance-calculator.html'))
errors << 'sole-proprietor-health-insurance-calculator.html: title intent mismatch' unless health_insurance_source.include?('<title>개인사업자 건강보험료 계산기 | 지역가입자·직원 채용 비교 - TaxYou</title>')
errors << 'sole-proprietor-health-insurance-calculator.html: H1 intent mismatch' unless health_insurance_source.match?(%r{<h1[^>]*>.*개인사업자 건강보험료 계산기: 지역가입자·직원 채용 비교</h1>})
errors << 'sole-proprietor-health-insurance-calculator.html: missing display name' unless health_insurance_source.include?('개인사업자 건강보험료 비교 계산기')
%w[healthRegionalAnnualIncome healthRegionalPropertyAmount healthQualifiedHousingDebt healthEmployeePeriod healthEmployeeMonthlyHours healthEmployeeMonthlySalary healthOwnerMonthlyRemuneration healthOwnerOtherAnnualIncome healthDependentStatus healthRemainingFamilyPremium].each do |control_id|
  errors << "sole-proprietor-health-insurance-calculator.html: missing comparison control #{control_id}" unless health_insurance_source.include?(%(id="#{control_id}"))
end
%w[①\ 현재\ 지역보험료 ②\ 대표자\ 직장보험료 ③\ 직원\ 급여\ 공제액 ④\ 사업주\ 추가\ 부담].each do |result_label|
  errors << "sole-proprietor-health-insurance-calculator.html: missing separated result #{result_label}" unless health_insurance_source.include?(result_label)
end
%w[개인사업자\ 건강보험료\ 계산 개인사업자\ 건강보험료\ 기준 개인사업자\ 건강보험료는\ 얼마 개인사업자\ 건강보험료\ 상한액 개인사업자\ 건강보험료\ 피부양자].each do |phrase|
  errors << "sole-proprietor-health-insurance-calculator.html: missing related intent #{phrase}" unless health_insurance_source.include?(phrase)
end
errors << 'sole-proprietor-health-insurance-calculator.html: missing 2026 NHIS rate source' unless health_insurance_source.include?('20251204_pop01longdesc')
errors << 'sole-proprietor-health-insurance-calculator.html: missing workplace eligibility source' unless health_insurance_source.include?('국민건강보험법시행령/제9조')
errors << 'sole-proprietor-health-insurance-calculator.html: missing owner remuneration source' unless health_insurance_source.include?('국민건강보험법시행령/제38조')
errors << 'sole-proprietor-health-insurance-calculator.html: missing dependent limitation' unless health_insurance_source.include?('계산기가 자격을 자동 판정하지 않습니다')
errors << 'sole-proprietor-health-insurance-calculator.html: missing employee eligibility confirmation' unless health_insurance_source.include?('1개월 이상 계속 근무 예정') && health_insurance_source.include?('월 60시간 이상')

mortgage_source = File.read(File.join(ROOT, 'mortgage-loan-calculator.html'))
%w[mortgageFundingMode mortgageHomePrice mortgageOwnFunds mortgageLoanAmount mortgageFundingStatus].each do |id|
  errors << "mortgage-loan-calculator.html: missing funding input #{id}" unless mortgage_source.include?(%(id="#{id}"))
end
errors << 'mortgage-loan-calculator.html: missing automatic funding calculation engine' unless mortgage_source.include?('scripts/loan-math.js?v=20260817-funding-sync')
errors << 'mortgage-loan-calculator.html: missing purchase-cost scope notice' unless mortgage_source.include?('취득세·중개보수 등 부대비용은 별도로 준비하세요')
holding_tax_source = File.read(File.join(ROOT, 'holding-tax.html'))
errors << 'holding-tax.html: title intent mismatch' unless holding_tax_source.include?('<title>아파트 재산세 계산기 |')
errors << 'holding-tax.html: H1 intent mismatch' unless holding_tax_source.match?(%r{<h1[^>]*>.*아파트 재산세 계산기</h1>})
errors << 'holding-tax.html: combined calculator intent remains' if holding_tax_source.include?('재산세·종부세 계산하기')
errors << 'holding-tax.html: missing shared property tax engine' unless holding_tax_source.include?('scripts/property-tax-math.js')
errors << 'holding-tax.html: missing 2026 review date' unless holding_tax_source.include?('최근 검토: 2026-08-17')
%w[5억\ 아파트\ 재산세 6억\ 아파트\ 재산세 30억\ 아파트\ 재산세 아파트\ 재산세율 아파트\ 재산세는\ 어디에서\ 조회하나요].each do |phrase|
  errors << "holding-tax.html: missing related intent #{phrase}" unless holding_tax_source.include?(phrase)
end
errors << 'holding-tax.html: missing property price preset handler' unless holding_tax_source.include?('applyPropertyTaxPreset(')

comprehensive_tax_source = File.read(File.join(ROOT, 'comprehensive-real-estate-tax-calculator.html'))
errors << 'comprehensive-real-estate-tax-calculator.html: title intent mismatch' unless comprehensive_tax_source.include?('<title>종부세 계산기 |')
errors << 'comprehensive-real-estate-tax-calculator.html: H1 intent mismatch' unless comprehensive_tax_source.match?(%r{<h1[^>]*>.*종부세 계산기</h1>})
errors << 'comprehensive-real-estate-tax-calculator.html: missing apartment and housing title support' unless comprehensive_tax_source.include?('2026 아파트·주택 종합부동산세 계산')
errors << 'comprehensive-real-estate-tax-calculator.html: missing apartment scope introduction' unless comprehensive_tax_source.include?('아파트를 포함한 개인 보유 주택')
errors << 'comprehensive-real-estate-tax-calculator.html: missing shared property tax engine' unless comprehensive_tax_source.include?('scripts/property-tax-math.js')
%w[comprehensivePublicPrice comprehensiveHomeCount confirmedPropertyTaxCredit previousPropertyTaxEquivalent previousComprehensiveTaxEquivalent].each do |control_id|
  errors << "comprehensive-real-estate-tax-calculator.html: missing control #{control_id}" unless comprehensive_tax_source.include?(%(id="#{control_id}"))
end
errors << 'comprehensive-real-estate-tax-calculator.html: missing official 2026 scope' unless comprehensive_tax_source.include?('2026년 6월 1일 기준')
%w[20억\ 아파트\ 종부세 30억\ 아파트\ 종부세 40억\ 아파트\ 종부세 50억\ 아파트\ 종부세 2026년\ 아파트\ 종부세\ 기준].each do |phrase|
  errors << "comprehensive-real-estate-tax-calculator.html: missing related intent #{phrase}" unless comprehensive_tax_source.include?(phrase)
end
errors << 'comprehensive-real-estate-tax-calculator.html: missing comprehensive price preset handler' unless comprehensive_tax_source.include?('applyComprehensiveTaxPreset(')

calculator_pages = HTML_FILES.select do |absolute_path|
  File.read(absolute_path).include?('class="calculator-section')
end
calculator_pages.each do |absolute_path|
  file = File.basename(absolute_path)
  source = File.read(absolute_path)
  faq_heading_count = source.scan(/<h2[^>]*>자주 묻는 질문<\/h2>/).length
  errors << "#{file}: FAQ section count #{faq_heading_count}" unless faq_heading_count == 1
  errors << "#{file}: article lead count mismatch" unless source.scan(/class="article-lead"/).length == 1

  faq_content = source[/<section class="info-section"><h2>자주 묻는 질문<\/h2><div class="faq-list">(.*?)<\/div><\/section>/m, 1]
  unless faq_content
    errors << "#{file}: FAQ does not use the shared collapsible structure"
    next
  end

  detail_count = faq_content.scan(/<details>/).length
  complete_item_count = faq_content.scan(/<details><summary>.+?<\/summary><p>.+?<\/p><\/details>/m).length
  errors << "#{file}: FAQ needs at least two questions" if detail_count < 2
  errors << "#{file}: malformed FAQ item" unless complete_item_count == detail_count
end

stylesheet = File.read(File.join(ROOT, 'style.css'))
review_note_rule = stylesheet[/\.review-note\s*\{(.*?)\}/m, 1]
errors << 'style.css: review-note missing shared top spacing' unless review_note_rule&.match?(/margin-top:\s*1rem;/)
errors << 'style.css: missing info-section example text line-height' unless stylesheet.match?(/\.info-section\s+\.example-box\s*\{[^}]*line-height:\s*1\.8;/m)
errors << 'style.css: missing shared tax form helper spacing' unless stylesheet.match?(/\.tax-form-card\.form-grid\s*>\s*\.helper-box\.form-span-full,\s*\.nested-form-grid\s*>\s*\.helper-box\.form-span-full,\s*\.holding-options-grid,\s*\.nested-form-grid\s*\{[^}]*margin-bottom:\s*1rem;/m)
errors << 'style.css: missing shared example preset layout' unless stylesheet.match?(/\.example-preset-group\s*\{[^}]*flex-wrap:\s*wrap;/m)
faq_summary_rule = stylesheet[/\.faq-list summary\s*\{(.*?)\}/m, 1]
faq_answer_rule = stylesheet[/\.faq-list details p\s*\{(.*?)\}/m, 1]
errors << 'style.css: missing FAQ question style' unless faq_summary_rule
errors << 'style.css: missing FAQ answer style' unless faq_answer_rule
if faq_summary_rule && faq_answer_rule
  question_size = faq_summary_rule[/font-size:\s*([^;]+);/, 1]
  answer_size = faq_answer_rule[/font-size:\s*([^;]+);/, 1]
  errors << 'style.css: FAQ question is not bold' unless faq_summary_rule.match?(/font-weight:\s*(?:[7-9]00|bold);/)
  errors << 'style.css: FAQ question and answer font sizes differ' unless question_size && question_size == answer_size
  errors << 'style.css: FAQ text size is not 0.9rem' unless question_size == '0.9rem'
  errors << 'style.css: FAQ question-answer spacing is not doubled' unless faq_answer_rule.match?(/margin-top:\s*1rem;/)
end
calculator_active_rule = stylesheet[/\.calculator-section\.active\s*\{(.*?)\}/m, 1]
calculator_bottom_spacing = calculator_active_rule&.match(/margin:\s*0 auto ([\d.]+)rem;/)&.captures&.first&.to_f
errors << 'style.css: missing calculator bottom spacing' unless calculator_bottom_spacing && calculator_bottom_spacing >= 2
result_box_rule = stylesheet[/\.result-box\s*\{(.*?)\}/m, 1]
errors << 'style.css: result actions/article lead spacing mismatch' unless result_box_rule&.match?(/margin-bottom:\s*2rem;/)
mobile_rule = stylesheet[/@media \(max-width: 640px\)\s*\{(.*)\}\s*@media \(max-width: 380px\)/m, 1]
errors << 'style.css: missing mobile article lead size' unless mobile_rule&.match?(/\.article-lead\s*\{[^}]*font-size:\s*0\.92rem;/m)

vehicle_acquisition_source = File.read(File.join(ROOT, 'vehicle-acquisition-tax-calculator.html'))
%w[vehicleTaxBaseSame under18ChildCount multiChildVehicleCategory multiChildEligibility].each do |control_id|
  errors << "vehicle-acquisition-tax-calculator.html: missing multi-child control #{control_id}" unless vehicle_acquisition_source.include?(%(id="#{control_id}"))
end
errors << 'vehicle-acquisition-tax-calculator.html: missing multi-child official law source' unless vehicle_acquisition_source.include?('지방세특례제한법/제22조의2')
errors << 'vehicle-acquisition-tax-calculator.html: missing minimum-tax official law source' unless vehicle_acquisition_source.include?('지방세특례제한법/제177조의2')
errors << 'vehicle-acquisition-tax-calculator.html: missing 2027 reduction deadline' unless vehicle_acquisition_source.include?('2027년 12월 31일')

SHARED_REPORT_ACTION_PAGES.each do |file|
  source = File.read(File.join(ROOT, file))
  %w[
    html2canvas/1.4.1/html2canvas.min.js
    jspdf/2.5.1/jspdf.umd.min.js
    scripts/export-report.js
    scripts/calculator-page.js
  ].each do |dependency|
    errors << "#{file}: missing report dependency #{dependency}" unless source.include?(dependency)
  end
end

calculator_page_script = File.read(File.join(ROOT, 'scripts/calculator-page.js'))
errors << 'calculator-page.js: missing updated PDF button label' unless calculator_page_script.include?('계산 결과 pdf 저장')
errors << 'calculator-page.js: legacy PDF button label remains' if calculator_page_script.include?('세무 리포트 PDF 저장')
tax_rank_source = File.read(File.join(ROOT, 'tax-rank.html'))
['이미지(PNG) 명세서 저장', '계산 결과 pdf 저장', '결과 공유하기'].each do |label|
  errors << "tax-rank.html: report action label mismatch #{label}" unless tax_rank_source.include?(label)
end

index_source = File.read(File.join(ROOT, 'index.html'))
errors << 'index.html: comprehensive tax display name mismatch' unless index_source.match?(%r{href="comprehensive-real-estate-tax-calculator\.html"><h3>.*아파트 종부세 계산기</h3>})
%w[세금\ 계산기 금융\ 계산기 대출·부채].each do |category_name|
  errors << "index.html: missing calculator category #{category_name}" unless index_source.include?(category_name)
end

category_positions = %w[
  realEstateTaxCalculators
  financialTaxCalculators
  familyTaxCalculators
  savingInvestmentCalculators
  loanCalculators
].map { |id| [id, index_source.index(%(id="#{id}"))] }.to_h
category_positions.each do |id, position|
  errors << "index.html: missing category section #{id}" unless position
end
if category_positions.values.all?
  errors << 'index.html: tax and finance category order mismatch' unless category_positions.values == category_positions.values.sort
end

item_list_script = index_source.scan(/<script type="application\/ld\+json">(.*?)<\/script>/m)
  .map { |match| JSON.parse(match.first) }
  .find { |data| data['@type'] == 'ItemList' }
if item_list_script
  positions = item_list_script.fetch('itemListElement').map { |item| item.fetch('position') }
  errors << 'index.html: ItemList positions are not sequential' unless positions == (1..positions.length).to_a
  item_urls = item_list_script.fetch('itemListElement').map { |item| File.basename(URI(item.fetch('url')).path) }
  visible_urls = index_source.scan(/class="calculator-card-link" href="([^"]+)"/).flatten
  errors << 'index.html: ItemList order does not match visible calculator order' unless item_urls == visible_urls
else
  errors << 'index.html: missing calculator ItemList JSON-LD'
end

HTML_FILES.each do |absolute_path|
  file = File.basename(absolute_path)
  source = File.read(absolute_path)
  stylesheet_version = if file == 'compound-interest-calculator.html'
                         '20260818-compound-periods'
                       elsif SAVING_INVESTMENT_CALCULATORS.key?(file)
                         '20260818-stock-average'
                       else
                         STYLESHEET_VERSION
                       end
  expected_stylesheet = %(href="style.css?v=#{stylesheet_version}")
  errors << "#{file}: stylesheet version mismatch" unless source.include?(expected_stylesheet)
  ids = source.scan(/\bid="([^"]+)"/).flatten
  ids_by_file[file] = ids

  duplicate_ids = ids.group_by(&:itself).select { |_id, matches| matches.length > 1 }
  duplicate_ids.each_key { |id| errors << "#{file}: duplicate id #{id}" }

  %w[html head body main header nav section article footer form table select].each do |tag|
    opening_count = source.scan(/<#{tag}\b/i).length
    closing_count = source.scan(/<\/#{tag}>/i).length
    errors << "#{file}: unbalanced #{tag} tags" unless opening_count == closing_count
  end

  nav = source[/<nav class="site-links"[^>]*>(.*?)<\/nav>/m, 1]
  footer = source[/<nav class="footer-links"[^>]*>(.*?)<\/nav>/m, 1]
  errors << "#{file}: nav mismatch" unless links_from(nav) == NAV_LINKS
  errors << "#{file}: footer mismatch" unless links_from(footer) == FOOTER_LINKS

  if source.match?(/"@type"\s*:\s*"WebApplication"/)
    breadcrumb = source[/<nav class="breadcrumb"[^>]*>(.*?)<\/nav>/m, 1]
    errors << "#{file}: missing calculator breadcrumb" unless breadcrumb
    if breadcrumb
      current_page_count = breadcrumb.scan(/aria-current="page"/).length
      errors << "#{file}: breadcrumb current page count #{current_page_count}" unless current_page_count == 1
    end
  end

  title = source[/<title>(.*?)<\/title>/m, 1]&.strip
  description = source[/<meta name="description" content="([^"]+)"/, 1]
  canonical = source[/<link rel="canonical" href="([^"]+)"/, 1]
  robots = source[/<meta name="robots" content="([^"]+)"/, 1]
  h1_count = source.scan(/<h1\b/i).length
  expected_canonical = file == 'index.html' ? "#{SITE_ORIGIN}/" : "#{SITE_ORIGIN}/#{file}"

  errors << "#{file}: missing title" unless title
  errors << "#{file}: missing description" unless description
  errors << "#{file}: canonical mismatch" unless canonical == expected_canonical
  errors << "#{file}: robots is not index, follow" unless robots == 'index, follow'
  errors << "#{file}: H1 count #{h1_count}" unless h1_count == 1

  titles[title] << file
  descriptions[description] << file
  canonicals[canonical] << file

  source.scan(/<script type="application\/ld\+json">(.*?)<\/script>/m).each do |match|
    JSON.parse(match.first)
  rescue JSON::ParserError => error
    errors << "#{file}: invalid JSON-LD #{error.message}"
  end

  controls = source.scan(/<(?:input|select|textarea)\b[^>]*\bid="([^"]+)"[^>]*>/i).flatten
  labels = source.scan(/<label\b[^>]*\bfor="([^"]+)"/i).flatten
  controls.each do |id|
    tag = source[/<(?:input|select|textarea)\b[^>]*\bid="#{Regexp.escape(id)}"[^>]*>/i]
    wrapped_choice = tag&.match?(/type="(?:radio|checkbox)"/i) &&
      source.match?(/<label[^>]*>.*?id="#{Regexp.escape(id)}".*?<\/label>/mi)
    errors << "#{file}: unlabeled control #{id}" unless labels.include?(id) || wrapped_choice
  end

  source.scan(/<button\b(.*?)>/mi).each do |attributes|
    errors << "#{file}: button without type" unless attributes.first.match?(/\btype=/i)
  end
end

[titles, descriptions, canonicals].each do |collection|
  collection.each do |value, files|
    errors << "duplicate or missing metadata: #{files.join(', ')}" if value.nil? || files.length > 1
  end
end

HTML_FILES.each do |absolute_path|
  file = File.basename(absolute_path)
  File.read(absolute_path).scan(/href="([^"]+)"/).flatten.each do |href|
    next if href.empty? || href.start_with?('http://', 'https://', 'mailto:', '#')

    path, fragment = href.split('#', 2)
    target = path.empty? ? file : path
    next unless target.end_with?('.html')

    target_path = File.join(ROOT, target)
    errors << "#{file}: missing link target #{href}" unless File.file?(target_path)
    if File.file?(target_path) && fragment && !ids_by_file.fetch(target, []).include?(fragment)
      errors << "#{file}: missing fragment #{href}"
    end
  end
end

incoming_links = Hash.new(0)
HTML_FILES.each do |absolute_path|
  source_file = File.basename(absolute_path)
  File.read(absolute_path).scan(/href="([^"]+)"/).flatten.each do |href|
    next if href.empty? || href.start_with?('http://', 'https://', 'mailto:', '#')

    path = href.split('#', 2).first
    target = path.empty? ? source_file : path
    incoming_links[target] += 1 if ids_by_file.key?(target)
  end
end

orphan_pages = ids_by_file.keys.reject do |file|
  file == 'index.html' || incoming_links[file].positive?
end
errors << "orphan pages: #{orphan_pages.join(', ')}" unless orphan_pages.empty?

sitemap = REXML::Document.new(File.read(File.join(ROOT, 'sitemap.xml')))
sitemap_urls = []
REXML::XPath.each(sitemap, '//*[local-name()="loc"]') { |node| sitemap_urls << node.text }
sitemap_files = sitemap_urls.map do |url|
  path = URI(url).path.sub(%r{^/}, '')
  path.empty? ? 'index.html' : path
end.select { |path| path.end_with?('.html') }.sort
html_names = HTML_FILES.map { |path| File.basename(path) }.sort

errors << 'sitemap has duplicate URLs' unless sitemap_urls.uniq.length == sitemap_urls.length
errors << 'sitemap contains malformed or off-origin URLs' unless sitemap_urls.all? do |url|
  uri = URI(url)
  uri.scheme == 'https' && uri.host == 'www.taxyou.co.kr' && uri.query.nil? && uri.fragment.nil?
rescue URI::InvalidURIError
  false
end
errors << "sitemap coverage mismatch: missing=#{html_names - sitemap_files}, extra=#{sitemap_files - html_names}" unless sitemap_files == html_names
sitemap_urls.each do |url|
  file = URI(url).path.sub(%r{^/}, '')
  file = 'index.html' if file.empty?
  next unless file.end_with?('.html') && File.file?(File.join(ROOT, file))

  source = File.read(File.join(ROOT, file))
  canonical = source[/<link rel="canonical" href="([^"]+)"/, 1]
  errors << "sitemap/canonical mismatch for #{file}" unless canonical == url
end

rss = REXML::Document.new(File.read(File.join(ROOT, 'rss.xml')))
rss_links = []
rss_guids = []
rss_dates = []
REXML::XPath.each(rss, '//*[local-name()="item"]/*[local-name()="link"]') { |node| rss_links << node.text }
REXML::XPath.each(rss, '//*[local-name()="item"]/*[local-name()="guid"]') { |node| rss_guids << node.text }
REXML::XPath.each(rss, '//*[local-name()="item"]/*[local-name()="pubDate"]') do |node|
  begin
    rss_dates << Time.rfc2822(node.text)
  rescue ArgumentError
    errors << "rss invalid pubDate #{node.text}"
  end
end
errors << 'rss has duplicate item URLs' unless rss_links.uniq.length == rss_links.length
errors << 'rss has duplicate GUIDs' unless rss_guids.uniq.length == rss_guids.length
errors << 'rss item link/GUID mismatch' unless rss_links == rss_guids
errors << 'rss item/pubDate count mismatch' unless rss_links.length == rss_dates.length
rss_links.each do |url|
  path = URI(url).path.sub(%r{^/}, '')
  next unless path.end_with?('.html') && File.file?(File.join(ROOT, path))

  canonical = File.read(File.join(ROOT, path))[/<link rel="canonical" href="([^"]+)"/, 1]
  errors << "rss/canonical mismatch for #{path}" unless canonical == url
end
NEW_BUSINESS_VEHICLE_CALCULATORS.each_key do |file|
  expected_url = "#{SITE_ORIGIN}/#{file}"
  errors << "rss missing new calculator #{expected_url}" unless rss_links.include?(expected_url)
end
new_rss_item = REXML::XPath.first(rss, '//*[local-name()="item"][*[local-name()="link"]="https://www.taxyou.co.kr/freelancer-business-tax-calculator.html"]')
errors << 'rss missing freelancer comparison publication date' unless new_rss_item && REXML::XPath.first(new_rss_item, '*[local-name()="pubDate"]')&.text == 'Mon, 17 Aug 2026 18:00:00 +0900'
vat_type_rss_item = REXML::XPath.first(rss, '//*[local-name()="item"][*[local-name()="link"]="https://www.taxyou.co.kr/simplified-vs-general-vat-calculator.html"]')
errors << 'rss missing VAT type comparison publication date' unless vat_type_rss_item && REXML::XPath.first(vat_type_rss_item, '*[local-name()="pubDate"]')&.text == 'Tue, 18 Aug 2026 18:00:00 +0900'
sole_corporation_rss_item = REXML::XPath.first(rss, '//*[local-name()="item"][*[local-name()="link"]="https://www.taxyou.co.kr/sole-proprietor-vs-corporation-tax-calculator.html"]')
errors << 'rss missing sole corporation comparison publication date' unless sole_corporation_rss_item && REXML::XPath.first(sole_corporation_rss_item, '*[local-name()="pubDate"]')&.text == 'Tue, 18 Aug 2026 19:00:00 +0900'
health_insurance_rss_item = REXML::XPath.first(rss, '//*[local-name()="item"][*[local-name()="link"]="https://www.taxyou.co.kr/sole-proprietor-health-insurance-calculator.html"]')
errors << 'rss missing health insurance comparison publication date' unless health_insurance_rss_item && REXML::XPath.first(health_insurance_rss_item, '*[local-name()="pubDate"]')&.text == 'Tue, 18 Aug 2026 20:00:00 +0900'
stock_average_rss_item = REXML::XPath.first(rss, '//*[local-name()="item"][*[local-name()="link"]="https://www.taxyou.co.kr/stock-average-price-calculator.html"]')
errors << 'rss missing stock average publication date' unless stock_average_rss_item && REXML::XPath.first(stock_average_rss_item, '*[local-name()="pubDate"]')&.text == 'Tue, 18 Aug 2026 21:00:00 +0900'
compound_rss_item = REXML::XPath.first(rss, '//*[local-name()="item"][*[local-name()="link"]="https://www.taxyou.co.kr/compound-interest-calculator.html"]')
errors << 'rss missing compound publication date' unless compound_rss_item && REXML::XPath.first(compound_rss_item, '*[local-name()="pubDate"]')&.text == 'Tue, 18 Aug 2026 22:00:00 +0900'

%w[holding-tax.html comprehensive-real-estate-tax-calculator.html].each do |file|
  expected_url = "#{SITE_ORIGIN}/#{file}"
  errors << "rss missing property tax calculator #{expected_url}" unless rss_links.include?(expected_url)
  sitemap_entry = REXML::XPath.first(sitemap, "//*[local-name()='url'][*[local-name()='loc']='#{expected_url}']")
  lastmod = sitemap_entry && REXML::XPath.first(sitemap_entry, "*[local-name()='lastmod']")&.text
  errors << "sitemap lastmod mismatch for #{file}" unless lastmod == '2026-08-17'
end

if errors.empty?
  puts "STATIC_SITE_VALID pages=#{HTML_FILES.length} sitemap_urls=#{sitemap_urls.length}"
else
  warn errors.join("\n")
  exit 1
end
