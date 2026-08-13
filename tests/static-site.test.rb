require 'json'
require 'rexml/document'
require 'uri'

ROOT = File.expand_path('..', __dir__)
HTML_FILES = Dir[File.join(ROOT, '*.html')].sort.freeze
SITE_ORIGIN = 'https://www.taxyou.co.kr'.freeze

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
  'overseas-stock-capital-gains-tax.html' => '해외주식 양도소득세 계산기',
  'securities-transaction-tax.html' => '증권거래세 계산기',
  'financial-income-comprehensive-tax.html' => '금융소득 종합과세 계산기',
  'retirement-income-tax.html' => '퇴직소득세 계산기',
  'pension-income-tax.html' => '연금소득세 계산기'
}.freeze

NEW_BUSINESS_VEHICLE_CALCULATORS = {
  'vat-calculator.html' => '부가세 계산기',
  'vehicle-acquisition-tax-calculator.html' => '자동차 취등록세 계산기',
  'vehicle-tax-prepayment-calculator.html' => '자동차세·연납 계산기'
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
  vat-calculator.html
  vehicle-acquisition-tax-calculator.html
  vehicle-tax-prepayment-calculator.html
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

NEW_FINANCIAL_CALCULATORS.each do |file, primary_keyword|
  source = File.read(File.join(ROOT, file))
  title = source[/<title>(.*?)<\/title>/m, 1]&.strip
  h1 = source[/<h1\b[^>]*>(.*?)<\/h1>/m, 1]&.gsub(/<[^>]+>/, '')&.strip
  errors << "#{file}: primary keyword missing from title" unless title&.include?(primary_keyword)
  errors << "#{file}: primary keyword missing from H1" unless h1&.include?(primary_keyword)
  errors << "#{file}: missing financial category breadcrumb" unless source.include?('금융·투자·연금 세금 계산기</a>')
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
  errors << "#{file}: missing 2026 source review date" unless source.include?('2026-08-13')
end

calculator_pages = HTML_FILES.select do |absolute_path|
  File.read(absolute_path).include?('class="calculator-section')
end
calculator_pages.each do |absolute_path|
  file = File.basename(absolute_path)
  source = File.read(absolute_path)
  faq_heading_count = source.scan(/<h2[^>]*>자주 묻는 질문<\/h2>/).length
  errors << "#{file}: FAQ section count #{faq_heading_count}" unless faq_heading_count == 1

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
errors << 'style.css: missing info-section example text line-height' unless stylesheet.match?(/\.info-section\s+\.example-box\s*\{[^}]*line-height:\s*1\.8;/m)
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
mobile_rule = stylesheet[/@media \(max-width: 640px\)\s*\{(.*)\}\s*@media \(max-width: 380px\)/m, 1]
errors << 'style.css: missing mobile article lead size' unless mobile_rule&.match?(/\.article-lead\s*\{[^}]*font-size:\s*0\.92rem;/m)

vehicle_acquisition_source = File.read(File.join(ROOT, 'vehicle-acquisition-tax-calculator.html'))
errors << 'vehicle-acquisition-tax-calculator.html: stale tax-base UI stylesheet' unless vehicle_acquisition_source.include?('href="style.css?v=20260813-tax-base-sync"')
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

index_source = File.read(File.join(ROOT, 'index.html'))
%w[세금\ 계산기 금융\ 계산기 대출·부채].each do |category_name|
  errors << "index.html: missing calculator category #{category_name}" unless index_source.include?(category_name)
end

category_positions = %w[
  realEstateTaxCalculators
  financialTaxCalculators
  familyTaxCalculators
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
  errors << "#{file}: missing stylesheet cache key" unless source.match?(/href="style\.css\?v=[^"]+"/)
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
REXML::XPath.each(rss, '//*[local-name()="item"]/*[local-name()="link"]') { |node| rss_links << node.text }
errors << 'rss has duplicate item URLs' unless rss_links.uniq.length == rss_links.length
NEW_BUSINESS_VEHICLE_CALCULATORS.each_key do |file|
  expected_url = "#{SITE_ORIGIN}/#{file}"
  errors << "rss missing new calculator #{expected_url}" unless rss_links.include?(expected_url)
end

if errors.empty?
  puts "STATIC_SITE_VALID pages=#{HTML_FILES.length} sitemap_urls=#{sitemap_urls.length}"
else
  warn errors.join("\n")
  exit 1
end
