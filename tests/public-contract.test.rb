require 'json'
require_relative '../tools/public-contract'

root = File.expand_path('..', __dir__)
fixture = File.join(root, 'tests', 'fixtures', 'public-contract.json')
expected = JSON.parse(File.read(fixture))
actual = TaxYouPublicContract.capture(root)

unless actual == expected
  warn 'PUBLIC_CONTRACT_CHANGED: root URLs, canonicals, sitemap, or RSS differ from the approved snapshot.'
  warn 'If the public change is intentional, run `ruby tools/capture-public-contract.rb` and review the fixture diff.'
  exit 1
end

puts "PUBLIC_CONTRACT_VALID pages=#{actual.fetch('pages').length} sitemap_urls=#{actual.fetch('sitemap').length} rss_items=#{actual.dig('rss', 'items').length}"
