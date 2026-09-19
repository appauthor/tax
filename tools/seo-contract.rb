require 'cgi'
require 'digest'
require 'json'

module TaxYouSeoContract
  module_function

  def capture(root)
    Dir[File.join(root, '*.html')].sort.to_h do |path|
      source = File.read(path)
      [File.basename(path), page_contract(source)]
    end
  end

  def page_contract(source)
    head = source[/<head>(.*?)<\/head>/mi, 1].to_s
    body = source[/<body\b[^>]*>(.*?)<\/body>/mi, 1].to_s
    {
      'title' => text_content(head[/<title>(.*?)<\/title>/mi, 1]),
      'canonical' => attribute(head[/<link\b[^>]*\brel=["']canonical["'][^>]*>/mi], 'href'),
      'meta' => metadata(head),
      'structuredData' => structured_data(head),
      'headings' => headings(body),
      'links' => body.scan(/<a\b[^>]*\bhref=["']([^"']+)["']/mi).flatten,
      'assets' => assets(source),
      'inlineScriptSha256' => inline_script_hashes(source),
      'visibleTextSha256' => Digest::SHA256.hexdigest(visible_text(body))
    }
  end

  def metadata(head)
    head.scan(/<meta\b[^>]*>/mi).each_with_object([]) do |tag, result|
      key_type = %w[name property http-equiv].find { |name| attribute(tag, name) }
      next unless key_type

      result << {
        'type' => key_type,
        'key' => attribute(tag, key_type),
        'content' => attribute(tag, 'content').to_s
      }
    end
  end

  def structured_data(head)
    head.scan(/<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/mi).map do |match|
      JSON.parse(match.first)
    end
  end

  def headings(body)
    body.scan(/<(h[1-3])\b[^>]*>(.*?)<\/\1>/mi).map do |tag, content|
      { 'tag' => tag.downcase, 'text' => text_content(content) }
    end
  end

  def assets(source)
    tags = source.scan(/<(?:script|link)\b[^>]*>/mi)
    tags.each_with_object([]) do |tag, result|
      parsed = tag_attributes(tag)
      location = parsed['src'] || parsed['href']
      next unless location
      next if parsed['rel'] == 'canonical' || parsed['rel'] == 'shortcut icon'

      result << { 'tag' => tag[/\A<([a-z]+)/i, 1].downcase, 'attributes' => parsed }
    end
  end

  def tag_attributes(tag)
    opening = tag.sub(/\A<[^\s>]+/, '').sub(/\/?>\z/m, '')
    opening.scan(/([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/).to_h do |name, double, single, bare|
      value = double || single || bare
      [name.downcase, value.nil? ? true : CGI.unescapeHTML(value)]
    end
  end

  def visible_text(body)
    without_scripts = body.gsub(/<(script|style)\b[^>]*>.*?<\/\1>/mi, ' ')
    text_content(without_scripts)
  end

  def inline_script_hashes(source)
    source.scan(/<script\b([^>]*)>(.*?)<\/script>/mi).each_with_object([]) do |(attributes, content), result|
      next if attributes.match?(/\bsrc\s*=/i)
      next if attributes.match?(/\btype=["']application\/ld\+json["']/i)

      result << Digest::SHA256.hexdigest(content)
    end
  end

  def text_content(value)
    CGI.unescapeHTML(value.to_s.gsub(/<[^>]+>/m, ' ').gsub(/\s+/, ' ').strip)
  end

  def attribute(tag, name)
    return unless tag

    match = tag.match(/\b#{Regexp.escape(name)}\s*=\s*(["'])(.*?)\1/mi)
    match && CGI.unescapeHTML(match[2])
  end
end
