#!/usr/bin/env ruby
require 'date'
require 'json'
require 'optparse'

ROOT = File.expand_path('..', __dir__)
TEMPLATE_PATH = File.join(ROOT, 'templates', 'calculator-page.html')
REGISTRY_PATH = File.join(ROOT, 'calculator-registry.json')

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
target = File.join(ROOT, filename)
abort "Refusing to overwrite existing file: #{filename}" if File.exist?(target)
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
  'FORM_ID' => options[:form_id], 'ENGINE' => options[:engine], 'CONTROLLER' => options[:controller],
  'WEB_APPLICATION_JSON' => JSON.generate(web_application), 'BREADCRUMB_JSON' => JSON.generate(breadcrumb)
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

File.write(target, rendered)
puts JSON.generate(summary.merge(created: true))
warn 'Next: implement real inputs/math/content, switch robots to index/follow, then update index.html, ItemList, sitemap.xml, rss.xml when applicable, calculator-registry.json, and tests.'
