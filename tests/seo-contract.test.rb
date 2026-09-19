require 'json'
require_relative '../tools/seo-contract'

root = File.expand_path('..', __dir__)
fixture = File.join(root, 'tests', 'fixtures', 'seo-contract.json')
expected = JSON.parse(File.read(fixture))
actual = TaxYouSeoContract.capture(root)

unless actual == expected
  changed = (expected.keys | actual.keys).select { |file| expected[file] != actual[file] }
  warn "SEO_CONTRACT_CHANGED: #{changed.join(', ')}"
  warn 'Review title, metadata, structured data, headings, links, visible text, and assets before accepting this change.'
  warn 'If the SEO-visible change is intentional, run `ruby tools/capture-seo-contract.rb` and review the fixture diff.'
  exit 1
end

puts "SEO_CONTRACT_VALID pages=#{actual.length}"
