#!/usr/bin/env ruby
require 'date'
require 'json'
require 'optparse'
require_relative 'site-builder'

ROOT = File.expand_path('..', __dir__)
TEMPLATE_PATH = File.join(ROOT, 'templates', 'calculator-page.html')
REGISTRY_PATH = File.join(ROOT, 'calculator-registry.json')
PAGE_METADATA_PATH = File.join(ROOT, 'src', 'page-metadata.json')

options = { date: Date.today.iso8601, dry_run: false }
parser = OptionParser.new do |opts|
  opts.banner = 'Usage: ruby tools/scaffold-calculator.rb [options]'
  opts.on('--slug SLUG', 'URL filename without .html') { |value| options[:slug] = value }
  opts.on('--name NAME', 'Page display name and H1') { |value| options[:name] = value }
  opts.on('--title TITLE', 'Unique title without the TaxYou suffix') { |value| options[:title] = value }
  opts.on('--description TEXT', 'Unique meta description') { |value| options[:description] = value }
  opts.on('--subtitle TEXT', 'Visible page subtitle') { |value| options[:subtitle] = value }
  opts.on('--introduction TEXT', 'Initial article lead') { |value| options[:introduction] = value }
  opts.on('--category ID', 'Existing category ID from calculator-registry.json') { |value| options[:category] = value }
  opts.on('--calculator-key KEY', 'body data-calculator key') { |value| options[:calculator_key] = value }
  opts.on('--form-id ID', 'Form element ID') { |value| options[:form_id] = value }
  opts.on('--engine PATH', 'Shared pure math script path') { |value| options[:engine] = value }
  opts.on('--controller PATH', 'Shared UI controller script path') { |value| options[:controller] = value }
  opts.on('--date YYYY-MM-DD', 'Creation/review date') { |value| options[:date] = value }
  opts.on('--dry-run', 'Validate and print a compact summary without writing') { options[:dry_run] = true }
  opts.on('-h', '--help', 'Show this help') { puts opts; exit }
end
parser.parse!

required = %i[slug name title description subtitle introduction category calculator_key form_id engine controller]
missing = required.select { |key| options[key].to_s.strip.empty? }
abort "Missing options: #{missing.join(', ')}\n#{parser}" unless missing.empty?
abort 'Slug must contain only lowercase letters, digits, and hyphens.' unless options[:slug].match?(/\A[a-z0-9]+(?:-[a-z0-9]+)*\z/)
abort 'Date must use YYYY-MM-DD.' unless options[:date].match?(/\A\d{4}-\d{2}-\d{2}\z/)

registry = JSON.parse(File.read(REGISTRY_PATH))
category = registry.fetch('categories').find { |item| item.fetch('id') == options[:category] }
abort "Unknown category: #{options[:category]}" unless category

filename = "#{options[:slug]}.html"
target = File.join(ROOT, 'src', 'pages', "#{filename}.erb")
deployment_target = File.join(ROOT, filename)
abort "Refusing to overwrite existing source: src/pages/#{filename}.erb" if File.exist?(target)
abort "Refusing to overwrite existing deployment file: #{filename}" if File.exist?(deployment_target)
abort "Engine not found: #{options[:engine]}" unless File.file?(File.join(ROOT, options[:engine]))
abort "Controller not found: #{options[:controller]}" unless File.file?(File.join(ROOT, options[:controller]))

origin = registry.fetch('siteOrigin')
canonical = "#{origin}/#{filename}"
group_label = category.fetch('group') == 'finance' ? '금융 계산기' : '세금 계산기'
group_href = category.fetch('group') == 'finance' ? 'index.html#financeCalculators' : 'index.html#calculatorMenu'

web_application = {
  '@context' => 'https://schema.org', '@type' => 'WebApplication', 'name' => options[:name],
  'url' => canonical, 'description' => options[:description], 'applicationCategory' => 'FinanceApplication',
  'operatingSystem' => 'All', 'inLanguage' => 'ko-KR', 'dateModified' => options[:date],
  'offers' => { '@type' => 'Offer', 'price' => '0', 'priceCurrency' => 'KRW' }
}
breadcrumb = {
  '@context' => 'https://schema.org', '@type' => 'BreadcrumbList', 'itemListElement' => [
    { '@type' => 'ListItem', 'position' => 1, 'name' => '홈', 'item' => "#{origin}/" },
    { '@type' => 'ListItem', 'position' => 2, 'name' => group_label, 'item' => "#{origin}/#{group_href.sub('index.html', '')}" },
    { '@type' => 'ListItem', 'position' => 3, 'name' => category.fetch('label'), 'item' => "#{origin}/##{category.fetch('id')}" },
    { '@type' => 'ListItem', 'position' => 4, 'name' => options[:name], 'item' => canonical }
  ]
}

replacements = {
  'TITLE' => options[:title], 'DESCRIPTION' => options[:description], 'NAME' => options[:name],
  'SUBTITLE' => options[:subtitle], 'INTRODUCTION' => options[:introduction], 'DATE' => options[:date],
  'CANONICAL' => canonical, 'CATEGORY_ID' => category.fetch('id'), 'CATEGORY_LABEL' => category.fetch('label'),
  'GROUP_LABEL' => group_label, 'GROUP_HREF' => group_href, 'CALCULATOR_KEY' => options[:calculator_key],
  'FORM_ID' => options[:form_id], 'ENGINE' => options[:engine], 'CONTROLLER' => options[:controller]
}

rendered = File.read(TEMPLATE_PATH)
replacements.each { |key, value| rendered = rendered.gsub("{{#{key}}}", value) }
unresolved = rendered.scan(/\{\{[A-Z_]+\}\}/).uniq
abort "Unresolved template values: #{unresolved.join(', ')}" unless unresolved.empty?

summary = { file: filename, name: options[:name], category: category.fetch('id'), canonical: canonical, robots: 'noindex, nofollow' }
if options[:dry_run]
  puts JSON.generate(summary)
  exit
end

head = [
  { 'tag' => 'script', 'attributes' => { 'async' => true, 'src' => 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2407866838876740', 'crossorigin' => 'anonymous' }, 'content' => '' },
  { 'tag' => 'meta', 'attributes' => { 'charset' => 'UTF-8' } },
  { 'tag' => 'meta', 'attributes' => { 'name' => 'viewport', 'content' => 'width=device-width, initial-scale=1.0' } },
  { 'tag' => 'link', 'attributes' => { 'rel' => 'shortcut icon', 'href' => "#{origin}/favicon.ico" } },
  { 'tag' => 'meta', 'attributes' => { 'property' => 'og:image', 'content' => "#{origin}/og-image.png" } },
  { 'tag' => 'title', 'content' => "#{options[:title]} - TaxYou" },
  { 'tag' => 'meta', 'attributes' => { 'name' => 'description', 'content' => options[:description] } },
  { 'tag' => 'meta', 'attributes' => { 'name' => 'author', 'content' => '앱틀리에 편집팀' } },
  { 'tag' => 'meta', 'attributes' => { 'name' => 'robots', 'content' => 'noindex, nofollow' } },
  { 'tag' => 'link', 'attributes' => { 'rel' => 'canonical', 'href' => canonical } },
  { 'tag' => 'meta', 'attributes' => { 'property' => 'og:type', 'content' => 'website' } },
  { 'tag' => 'meta', 'attributes' => { 'property' => 'og:locale', 'content' => 'ko_KR' } },
  { 'tag' => 'meta', 'attributes' => { 'property' => 'og:site_name', 'content' => '통합 세금·금융 계산기' } },
  { 'tag' => 'meta', 'attributes' => { 'property' => 'og:title', 'content' => options[:name] } },
  { 'tag' => 'meta', 'attributes' => { 'property' => 'og:description', 'content' => options[:description] } },
  { 'tag' => 'meta', 'attributes' => { 'property' => 'og:url', 'content' => canonical } },
  { 'tag' => 'script', 'attributes' => { 'type' => 'application/ld+json' }, 'content' => JSON.generate(web_application) },
  { 'tag' => 'script', 'attributes' => { 'type' => 'application/ld+json' }, 'content' => JSON.generate(breadcrumb) },
  { 'tag' => 'script', 'attributes' => { 'defer' => true, 'src' => 'https://unpkg.com/lucide@latest' }, 'content' => '' },
  { 'tag' => 'link', 'attributes' => { 'rel' => 'stylesheet', 'href' => 'style.css?v=20260817-ui-consistency' } }
]
tail = [
  { 'tag' => 'script', 'attributes' => { 'defer' => true, 'src' => 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js' }, 'content' => '' },
  { 'tag' => 'script', 'attributes' => { 'defer' => true, 'src' => 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js' }, 'content' => '' },
  { 'tag' => 'script', 'attributes' => { 'src' => 'scripts/common.js' }, 'content' => '' },
  { 'tag' => 'script', 'attributes' => { 'src' => options[:engine] }, 'content' => '' },
  { 'tag' => 'script', 'attributes' => { 'src' => options[:controller] }, 'content' => '' },
  { 'tag' => 'script', 'attributes' => { 'src' => 'scripts/export-report.js' }, 'content' => '' },
  { 'tag' => 'script', 'attributes' => { 'src' => 'scripts/calculator-page.js' }, 'content' => '' }
]
page_metadata = JSON.parse(File.read(PAGE_METADATA_PATH))
page_metadata[filename] = {
  'htmlAttributes' => { 'lang' => 'ko' },
  'bodyAttributes' => { 'data-calculator' => options[:calculator_key] },
  'mainAttributes' => { 'class' => 'container' },
  'head' => head,
  'header' => {
    'icon' => 'calculator', 'title' => options[:name], 'subtitle' => options[:subtitle],
    'notice' => '입력값을 기준으로 계산한 참고용 결과이며 실제 적용 전 최신 기준을 확인하세요.'
  },
  'contentMeta' => %(<div class="content-meta"><span>작성: 앱틀리에 편집팀</span><span>최근 검토: #{options[:date]}</span></div>),
  'breadcrumb' => [
    { 'href' => 'index.html', 'label' => '홈' },
    { 'href' => group_href, 'label' => group_label },
    { 'href' => "index.html##{category.fetch('id')}", 'label' => category.fetch('label') },
    { 'label' => options[:name] }
  ],
  'footer' => { 'note' => '© 앱틀리에(Apptelier)' },
  'tail' => tail
}

File.write(target, rendered)
File.write(PAGE_METADATA_PATH, "#{JSON.pretty_generate(page_metadata)}\n")
TaxYouSiteBuilder.write(ROOT)
puts JSON.generate(summary.merge(created: true, source: "src/pages/#{filename}.erb"))
warn 'Next: edit the ERB source, implement real inputs/math/content, switch robots to index/follow, update registry/discovery/tests, then run npm run build and npm run docs:sync.'
