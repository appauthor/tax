#!/usr/bin/env ruby

require 'csv'
require 'json'

input_path = ARGV[0]
output_path = ARGV[1] || File.expand_path('../scripts/lifestyle-business-data.js', __dir__)
abort 'Usage: ruby tools/build-lifestyle-business-data.rb INPUT.csv [OUTPUT.js]' unless input_path && File.file?(input_path)

totals = Hash.new { |hash, key| hash[key] = { current: 0, previous_month: 0, previous_year: 0 } }
industry_totals = Hash.new { |hash, key| hash[key] = Hash.new { |region_hash, region| region_hash[region] = { current: 0, previous_month: 0, previous_year: 0 } } }

CSV.foreach(input_path, headers: true, encoding: 'bom|utf-8') do |row|
  values = row.to_h.transform_keys { |key| key.to_s.delete_prefix("\uFEFF").strip }
  industry = values.fetch('업종').strip
  region = values.fetch('시도').strip
  current = values.fetch('당월').to_i
  previous_month = values.fetch('전월').to_i
  previous_year = values.fetch('전년동월').to_i
  totals[region][:current] += current
  totals[region][:previous_month] += previous_month
  totals[region][:previous_year] += previous_year
  industry_totals[industry][region][:current] += current
  industry_totals[industry][region][:previous_month] += previous_month
  industry_totals[industry][region][:previous_year] += previous_year
end

regions = totals.keys.sort
industries = industry_totals.keys.sort
rows = industries.flat_map do |industry|
  regions.map do |region|
    values = industry_totals[industry][region]
    {
      industry: industry,
      region: region,
      current: values[:current],
      previousMonth: values[:previous_month],
      previousYear: values[:previous_year]
    }
  end
end

payload = {
  asOf: '2026-06-30',
  sourceName: '공공데이터포털 국세청 사업자현황 100대 생활업종',
  sourceUrl: 'https://www.data.go.kr/data/15061118/fileData.do',
  sourceFile: '국세청_사업자현황_100대 생활업종_20260630.csv',
  suppressionNote: '셀 값이 3 미만이면 공식 파일에서 0으로 변환됩니다.',
  industries: industries,
  regions: regions,
  regionTotals: totals.transform_values do |values|
    { current: values[:current], previousMonth: values[:previous_month], previousYear: values[:previous_year] }
  end,
  rows: rows
}

File.write(output_path, "(function (global) {\n    'use strict';\n    global.LifestyleBusinessData = Object.freeze(#{JSON.generate(payload)});\n})(typeof window !== 'undefined' ? window : globalThis);\n")
puts "Wrote #{output_path}: #{industries.length} industries, #{regions.length} regions, #{rows.length} rows"
