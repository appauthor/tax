#!/usr/bin/env ruby
require 'optparse'
require_relative 'site-builder'

root = File.expand_path('..', __dir__)
mode = nil

OptionParser.new do |options|
  options.banner = 'Usage: ruby tools/build-site.rb --write|--check'
  options.on('--write', 'Render source templates to root deployment files') { mode = :write }
  options.on('--check', 'Fail when generated deployment files are stale') { mode = :check }
  options.on('-h', '--help', 'Show this help') { puts options; exit }
end.parse!

abort 'Choose exactly one of --write or --check.' unless mode

TaxYouSiteBuilder.public_send(mode, root)
puts(mode == :write ? 'TAXYOU_SITE_BUILT' : 'TAXYOU_SITE_BUILD_VALID')
