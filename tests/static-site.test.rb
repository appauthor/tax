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

HTML_FILES.each do |absolute_path|
  file = File.basename(absolute_path)
  source = File.read(absolute_path)
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
errors << "sitemap coverage mismatch: missing=#{html_names - sitemap_files}, extra=#{sitemap_files - html_names}" unless sitemap_files == html_names

if errors.empty?
  puts "STATIC_SITE_VALID pages=#{HTML_FILES.length} sitemap_urls=#{sitemap_urls.length}"
else
  warn errors.join("\n")
  exit 1
end
