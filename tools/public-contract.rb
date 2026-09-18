require 'rexml/document'

module TaxYouPublicContract
  module_function

  def capture(root)
    {
      'pages' => page_canonicals(root),
      'sitemap' => sitemap_entries(root),
      'rss' => rss_data(root)
    }
  end

  def page_canonicals(root)
    Dir[File.join(root, '*.html')].sort.to_h do |path|
      source = File.read(path)
      [File.basename(path), source[/<link rel="canonical" href="([^"]+)"/, 1]]
    end
  end

  def sitemap_entries(root)
    document = REXML::Document.new(File.read(File.join(root, 'sitemap.xml')))
    entries = []
    REXML::XPath.each(document, '//*[local-name()="url"]') do |url|
      values = url.elements.to_a.to_h { |element| [element.name, element.text.to_s] }
      entry = { 'url' => values.fetch('loc'), 'lastmod' => values.fetch('lastmod') }
      entry['changefreq'] = values['changefreq'] if values['changefreq']
      entry['priority'] = values['priority'] if values['priority']
      entries << entry
    end
    entries
  end

  def rss_data(root)
    document = REXML::Document.new(File.read(File.join(root, 'rss.xml')))
    channel = REXML::XPath.first(document, '/rss/channel')
    {
      'channel' => {
        'title' => text(channel, 'title'),
        'link' => text(channel, 'link'),
        'description' => text(channel, 'description'),
        'language' => text(channel, 'language'),
        'lastBuildDate' => text(channel, 'lastBuildDate'),
        'self' => channel.elements['atom:link'].attributes.fetch('href').value
      },
      'items' => channel.get_elements('item').map do |item|
        result = %w[title link guid description pubDate].to_h { |name| [name, text(item, name)] }
        result['category'] = text(item, 'category') if item.elements['category']
        result
      end
    }
  end

  def text(element, name)
    element.elements[name].text.to_s
  end
end
