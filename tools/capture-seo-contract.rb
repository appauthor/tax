#!/usr/bin/env ruby
require 'json'
require_relative 'seo-contract'

root = File.expand_path('..', __dir__)
path = File.join(root, 'tests', 'fixtures', 'seo-contract.json')
File.write(path, "#{JSON.pretty_generate(TaxYouSeoContract.capture(root))}\n")
puts 'TAXYOU_SEO_CONTRACT_UPDATED tests/fixtures/seo-contract.json'
