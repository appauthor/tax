#!/usr/bin/env ruby
require 'json'
require 'optparse'
require 'rexml/document'
require 'uri'

ROOT = File.expand_path('..', __dir__)
REGISTRY_PATH = File.join(ROOT, 'calculator-registry.json')
SITE_ORIGIN = 'https://www.taxyou.co.kr'.freeze

options = { pretty: false, check: false }
OptionParser.new do |opts|
  opts.banner = 'Usage: ruby tools/taxyou-context.rb [--check] [--category ID] [--pretty]'
  opts.on('--check', 'Validate registry, homepage, files, canonicals, and sitemap') { options[:check] = true }
  opts.on('--category ID', 'Return one category only') { |value| options[:category] = value }
  opts.on('--pretty', 'Pretty-print JSON output') { options[:pretty] = true }
  opts.on('-h', '--help', 'Show this help') { puts opts; exit }
end.parse!

registry = JSON.parse(File.read(REGISTRY_PATH))
categories = registry.fetch('categories')
if options[:category]
  categories = categories.select { |category| category.fetch('id') == options[:category] }
  abort "Unknown category: #{options[:category]}" if categories.empty?
end

if options[:check]
  errors = []
  index = File.read(File.join(ROOT, 'index.html'))
  registered_files = registry.fetch('categories').flat_map { |category| category.fetch('calculators').map { |calculator| calculator.fetch('file') } }
  hub_files = registry.fetch('hubs', []).map { |hub| hub.fetch('file') }
  ranking_files = registry.fetch('rankingCategories', []).flat_map { |category| category.fetch('pages').map { |page| page.fetch('file') } }
  errors << 'registry contains duplicate calculator files' unless registered_files.uniq.length == registered_files.length
  errors << 'registry contains duplicate hub or ranking files' unless (hub_files + ranking_files).uniq.length == hub_files.length + ranking_files.length

  registry.fetch('categories').each do |category|
    section = index[/<section id="#{Regexp.escape(category.fetch('id'))}" class="info-section calculator-category">(.*?)<\/section>/m, 1]
    unless section
      errors << "index missing category #{category.fetch('id')}"
      next
    end
    visible = section.scan(/class="calculator-card-link" href="([^"]+)".*?<h3>.*?<\/i>(.*?)<\/h3>/m).map do |file, name|
      { 'file' => file, 'name' => name.gsub(/<[^>]+>/, '').strip }
    end
    errors << "registry/index mismatch for #{category.fetch('id')}" unless visible == category.fetch('calculators')
  end

  ranking_index = File.read(File.join(ROOT, 'ranking.html'))
  registry.fetch('rankingCategories', []).each do |category|
    section = ranking_index[/<section id="#{Regexp.escape(category.fetch('id'))}" class="info-section calculator-category">(.*?)<\/section>/m, 1]
    unless section
      errors << "ranking index missing category #{category.fetch('id')}"
      next
    end
    visible = section.scan(/class="calculator-card-link" href="([^"]+)".*?<h3>.*?<\/i>(.*?)<\/h3>/m).map do |file, name|
      { 'file' => file, 'name' => name.gsub(/<[^>]+>/, '').strip }
    end
    errors << "registry/ranking index mismatch for #{category.fetch('id')}" unless visible == category.fetch('pages')
  end

  sitemap = REXML::Document.new(File.read(File.join(ROOT, 'sitemap.xml')))
  sitemap_urls = []
  REXML::XPath.each(sitemap, '//*[local-name()="loc"]') { |node| sitemap_urls << node.text }
  errors << 'sitemap contains duplicate URLs' unless sitemap_urls.uniq.length == sitemap_urls.length

  registered_files.each do |file|
    path = File.join(ROOT, file)
    unless File.file?(path)
      errors << "missing calculator file #{file}"
      next
    end
    canonical = File.read(path)[/<link rel="canonical" href="([^"]+)"/, 1]
    expected = "#{SITE_ORIGIN}/#{file}"
    errors << "canonical mismatch #{file}" unless canonical == expected
    errors << "sitemap missing #{file}" unless sitemap_urls.include?(expected)
  end


  (hub_files + ranking_files).each do |file|
    path = File.join(ROOT, file)
    unless File.file?(path)
      errors << "missing hub or ranking file #{file}"
      next
    end
    canonical = File.read(path)[/<link rel="canonical" href="([^"]+)"/, 1]
    expected = file == 'index.html' ? "#{SITE_ORIGIN}/" : "#{SITE_ORIGIN}/#{file}"
    errors << "canonical mismatch #{file}" unless canonical == expected
    errors << "sitemap missing #{file}" unless sitemap_urls.include?(expected)
  end

  if errors.empty?
    puts "TAXYOU_CONTEXT_VALID calculators=#{registered_files.length} categories=#{registry.fetch('categories').length} rankings=#{ranking_files.length} sitemap_urls=#{sitemap_urls.length}"
    exit
  end
  warn errors.join("\n")
  exit 1
end

payload = {
  'siteOrigin' => registry.fetch('siteOrigin'),
  'reviewedAt' => registry.fetch('reviewedAt'),
  'categories' => categories,
  'hubs' => registry.fetch('hubs', []),
  'rankingCategories' => registry.fetch('rankingCategories', []),
  'sharedFiles' => {
    'pageShell' => %w[style.css scripts/common.js scripts/calculator-page.js scripts/export-report.js],
    'investment' => %w[scripts/investment-tax-math.js scripts/investment-tax-calculators.js],
    'businessVehicle' => %w[scripts/business-vehicle-tax-math.js scripts/business-vehicle-tax-calculators.js],
    'livingFinance' => %w[scripts/living-finance-math.js scripts/living-finance-calculators.js],
    'loan' => %w[scripts/loan-math.js scripts/loan-calculators.js],
    'ranking' => %w[scripts/net-worth-rank-math.js scripts/net-worth-rank.js]
  },
  'guides' => %w[docs/taxyou-architecture.md docs/calculator-implementation-guide.md docs/calculator-completion-checklist.md],
  'verification' => ['ruby tools/taxyou-context.rb --check', 'ruby tests/static-site.test.rb', 'node tests/calculation-regression.test.js', 'xmllint --noout sitemap.xml rss.xml', 'git diff --check']
}

puts(options[:pretty] ? JSON.pretty_generate(payload) : JSON.generate(payload))
