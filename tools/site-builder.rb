require 'cgi'
require 'erb'
require 'fileutils'
require 'json'

module TaxYouSiteBuilder
  class Error < StandardError; end

  class Renderer
    attr_reader :root, :registry, :discovery, :page_metadata, :current_file

    def initialize(root)
      @root = root
      @registry = JSON.parse(File.read(File.join(root, 'calculator-registry.json')))
      @discovery = JSON.parse(File.read(File.join(root, 'src', 'site-discovery.json')))
      @page_metadata = JSON.parse(File.read(File.join(root, 'src', 'page-metadata.json')))
      refresh_registry_schemas!
      validate_page_metadata!
    end

    def outputs
      rendered_pages.merge(
        'sitemap.xml' => render_sitemap,
        'rss.xml' => render_rss
      )
    end

    def render(template_name, locals = {})
      path = File.join(root, 'src', 'partials', "_#{template_name}.html.erb")
      raise Error, "Missing partial: #{path}" unless File.file?(path)

      Scope.new(self, locals).evaluate(File.read(path), path)
    end

    def json(value)
      JSON.generate(value)
    end

    def site_origin
      registry.fetch('siteOrigin')
    end

    def current_page
      page_metadata.fetch(current_file)
    end

    def html_attributes(attributes)
      return '' if attributes.nil? || attributes.empty?

      rendered = attributes.map do |name, value|
        value == true ? name : %(#{name}="#{CGI.escapeHTML(value.to_s)}")
      end
      " #{rendered.join(' ')}"
    end

    def calculator_item_list
      items = registry.fetch('categories').flat_map { |category| category.fetch('calculators') }
      item_list(items, 'TaxYou 계산기 목록')
    end

    def ranking_collection
      pages = registry.fetch('rankingCategories').flat_map { |category| category.fetch('pages') }
      {
        '@context' => 'https://schema.org',
        '@type' => 'CollectionPage',
        'name' => '순위·비교',
        'url' => "#{site_origin}/ranking.html",
        'description' => '공개 통계를 참고한 TaxYou 경제 순위·비교 계산기 모음입니다.',
        'dateModified' => registry.fetch('reviewedAt'),
        'inLanguage' => 'ko-KR',
        'isPartOf' => {
          '@type' => 'WebSite',
          'name' => '통합 세금·금융 계산기',
          'url' => "#{site_origin}/"
        },
        'mainEntity' => item_list(pages).reject { |key, _| key == '@context' }
      }
    end

    private

    def refresh_registry_schemas!
      replace_schema!('index.html', 'ItemList', calculator_item_list)
      replace_schema!('ranking.html', 'CollectionPage', ranking_collection)
    end

    def replace_schema!(file, schema_type, value)
      page = page_metadata.fetch(file)
      tag = page.fetch('head').find do |head_tag|
        next false unless head_tag.dig('attributes', 'type') == 'application/ld+json'

        JSON.parse(head_tag.fetch('content'))['@type'] == schema_type
      end
      raise Error, "#{file}: missing #{schema_type} schema placeholder" unless tag

      tag['content'] = json(value)
    end

    def rendered_pages
      pattern = File.join(root, 'src', 'pages', '*.html.erb')
      Dir[pattern].sort.to_h do |path|
        @current_file = File.basename(path, '.erb')
        content = Scope.new(self).evaluate(File.read(path), path)
        [current_file, render('page_layout', content: content)]
      end
    ensure
      @current_file = nil
    end

    def item_list(items, name = nil)
      result = {
        '@context' => 'https://schema.org',
        '@type' => 'ItemList'
      }
      result['name'] = name if name
      result['itemListElement'] = items.each_with_index.map do |item, index|
        {
          '@type' => 'ListItem',
          'position' => index + 1,
          'name' => item.fetch('name'),
          'url' => "#{site_origin}/#{item.fetch('file')}"
        }
      end
      result
    end

    def validate_page_metadata!
      source_files = Dir[File.join(root, 'src', 'pages', '*.html.erb')].map { |path| File.basename(path, '.erb') }.sort
      metadata_files = page_metadata.keys.sort
      unless source_files == metadata_files
        missing = source_files - metadata_files
        extra = metadata_files - source_files
        raise Error, "Page metadata mismatch. Missing: #{missing.join(', ')}; extra: #{extra.join(', ')}"
      end

      page_metadata.each do |file, page|
        head = page.fetch('head')
        title = head.find { |tag| tag.fetch('tag') == 'title' }
        description = head.find { |tag| tag.dig('attributes', 'name') == 'description' }
        robots = head.find { |tag| tag.dig('attributes', 'name') == 'robots' }
        canonical = head.find { |tag| tag.dig('attributes', 'rel') == 'canonical' }
        raise Error, "#{file}: missing title metadata" unless title
        raise Error, "#{file}: missing description metadata" unless description
        raise Error, "#{file}: missing robots metadata" unless robots
        expected_canonical = file == 'index.html' ? "#{site_origin}/" : "#{site_origin}/#{file}"
        raise Error, "#{file}: canonical metadata mismatch" unless canonical&.dig('attributes', 'href') == expected_canonical
        raise Error, "#{file}: missing page header metadata" unless page.dig('header', 'title')

        schemas = head.select { |tag| tag.dig('attributes', 'type') == 'application/ld+json' }.map do |tag|
          JSON.parse(tag.fetch('content'))
        rescue JSON::ParserError => error
          raise Error, "#{file}: invalid JSON-LD: #{error.message}"
        end
        breadcrumb_schema = schemas.find { |schema| schema['@type'] == 'BreadcrumbList' }
        if breadcrumb_schema
          structured_names = breadcrumb_schema.fetch('itemListElement').map { |item| item.fetch('name') }
          visible_names = page.fetch('breadcrumb').map { |item| CGI.unescapeHTML(item.fetch('label').gsub(/<[^>]+>/, '')) }
          raise Error, "#{file}: visible and structured breadcrumbs differ" unless visible_names == structured_names
        end
      end
    end

    def render_sitemap
      lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
      ]
      discovery.fetch('sitemap').each do |entry|
        fields = ["<loc>#{xml(entry.fetch('url'))}</loc>", "<lastmod>#{xml(entry.fetch('lastmod'))}</lastmod>"]
        fields << "<changefreq>#{xml(entry.fetch('changefreq'))}</changefreq>" if entry['changefreq']
        fields << "<priority>#{xml(entry.fetch('priority'))}</priority>" if entry['priority']
        if entry['format'] == 'compact'
          lines << "  <url>#{fields.join}</url>"
        elsif entry['format'] == 'joined'
          lines << '  <url>'
          lines << "    #{fields.join}"
          lines << '  </url>'
        else
          lines << '  <url>'
          lines.concat(fields.map { |field| "    #{field}" })
          lines << '  </url>'
        end
      end
      lines << '</urlset>'
      "#{lines.join("\n")}\n"
    end

    def render_rss
      feed = discovery.fetch('rss')
      channel = feed.fetch('channel')
      lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
        '  <channel>',
        "    <title>#{xml(channel.fetch('title'))}</title>",
        "    <link>#{xml(channel.fetch('link'))}</link>",
        "    <description>#{xml(channel.fetch('description'))}</description>",
        "    <language>#{xml(channel.fetch('language'))}</language>",
        "    <lastBuildDate>#{xml(channel.fetch('lastBuildDate'))}</lastBuildDate>",
        "    <atom:link href=\"#{xml(channel.fetch('self'))}\" rel=\"self\" type=\"application/rss+xml\" />"
      ]
      feed.fetch('items').each do |item|
        fields = [
          "<title>#{xml(item.fetch('title'))}</title>",
          "<link>#{xml(item.fetch('link'))}</link>",
          "<guid isPermaLink=\"true\">#{xml(item.fetch('guid'))}</guid>",
          "<description>#{xml(item.fetch('description'))}</description>",
          "<pubDate>#{xml(item.fetch('pubDate'))}</pubDate>"
        ]
        fields << "<category>#{xml(item.fetch('category'))}</category>" if item['category']
        if item['format'] == 'compact'
          lines << "    <item>#{fields.join}</item>"
        else
          lines << '    <item>'
          lines.concat(fields.map { |field| "      #{field}" })
          lines << '    </item>'
        end
      end
      lines.concat(['  </channel>', '</rss>'])
      "#{lines.join("\n")}\n"
    end

    def xml(value)
      CGI.escapeHTML(value.to_s)
    end
  end

  class Scope
    def initialize(renderer, locals = {})
      @renderer = renderer
      locals.each { |name, value| define_singleton_method(name) { value } }
    end

    def evaluate(source, filename)
      template = ERB.new(source, trim_mode: '-')
      template.filename = filename if template.respond_to?(:filename=)
      template.result(binding)
    end

    def render(name, locals = {})
      @renderer.render(name, locals)
    end

    def registry
      @renderer.registry
    end

    def page
      @renderer.current_page
    end

    def site_origin
      @renderer.site_origin
    end

    def json(value)
      @renderer.json(value)
    end

    def html_attributes(value)
      @renderer.html_attributes(value)
    end

    def calculator_item_list
      @renderer.calculator_item_list
    end

    def ranking_collection
      @renderer.ranking_collection
    end
  end

  module_function

  def write(root)
    Renderer.new(root).outputs.each do |relative_path, content|
      path = File.join(root, relative_path)
      next if File.file?(path) && File.read(path) == content

      temporary = "#{path}.tmp"
      File.write(temporary, content)
      File.rename(temporary, path)
    end
  end

  def check(root)
    mismatches = Renderer.new(root).outputs.each_with_object([]) do |(relative_path, expected), result|
      path = File.join(root, relative_path)
      result << relative_path unless File.file?(path) && File.read(path) == expected
    end
    return if mismatches.empty?

    raise Error, "Generated files are stale: #{mismatches.join(', ')}. Run `ruby tools/build-site.rb --write`."
  end
end
