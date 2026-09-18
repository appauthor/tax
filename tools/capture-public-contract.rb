#!/usr/bin/env ruby
require 'json'
require_relative 'public-contract'

root = File.expand_path('..', __dir__)
path = File.join(root, 'tests', 'fixtures', 'public-contract.json')
File.write(path, "#{JSON.pretty_generate(TaxYouPublicContract.capture(root))}\n")
puts 'TAXYOU_PUBLIC_CONTRACT_UPDATED tests/fixtures/public-contract.json'
