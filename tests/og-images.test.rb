require 'json'
require 'zlib'
require 'uri'

root = File.expand_path('..', __dir__)
metadata = JSON.parse(File.read(File.join(root, 'src/page-metadata.json')))
seen = {}
metadata.each do |file, page|
  tags = page.fetch('head').select { |n| n['tag'] == 'meta' }.to_h { |n| a = n.fetch('attributes'); [a['property'] || a['name'] || a['charset'], a['content']] }
  next if file == 'index.html' # Homepage intentionally retains the site's representative image.
  url = tags.fetch('og:image')
  raise "#{file}: missing individual OG" unless url.start_with?('https://www.taxyou.co.kr/images/og/')
  raise "#{file}: reused OG image from #{seen[url]}" if seen[url]
  seen[url] = file
  raise "#{file}: social image mismatch" unless tags['twitter:image'] == url
  %w[og:image:alt twitter:image:alt].each { |key| raise "#{file}: missing #{key}" if tags[key].to_s.strip.empty? }
  raise "#{file}: incorrect dimensions/type metadata" unless tags.values_at('og:image:width', 'og:image:height', 'og:image:type') == %w[512 512 image/png]
  raw = File.binread(File.join(root, URI(url).path.delete_prefix('/')))
  raise "#{file}: invalid PNG" unless raw.start_with?("\x89PNG\r\n\x1a\n".b) && raw.bytesize > 5000
  raise "#{file}: incorrect actual size" unless raw.byteslice(16, 8).unpack('NN') == [512, 512]
  offset = 8
  while offset < raw.bytesize
    length = raw.byteslice(offset, 4).unpack1('N')
    type = raw.byteslice(offset + 4, 4)
    data = raw.byteslice(offset + 8, length)
    crc = raw.byteslice(offset + 8 + length, 4).unpack1('N')
    raise "#{file}: corrupt #{type}" unless Zlib.crc32(type + data) == crc
    raise "#{file}: non-rendering metadata #{type}" unless %w[IHDR PLTE tRNS cHRM gAMA iCCP sBIT sRGB IDAT IEND].include?(type)
    offset += length + 12
  end
end
puts "OG_IMAGES_VALID individual_pages=#{seen.length} actual_sizes CRCs metadata alt and unique URLs"
