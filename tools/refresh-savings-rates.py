#!/usr/bin/env python3
"""Refresh the public FSS comparison snapshot; stdlib only, no credentials.

Public HTML is intentionally parsed strictly. A missing page, changed schema,
incomplete list, or invalid rate aborts before replacing the previous snapshot.
"""
import argparse
import datetime as dt
import html
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import tempfile
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
ENDPOINTS = {
    'deposit': ('fdrmDpst', '700002'),
    'installment': ('fdrmEnty', '700003'),
}


class ProductRows(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows, self.row, self.cell = [], None, None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'tr' and 'onOffTr' in attrs.get('class', '').split():
            if self.row is not None:
                raise ValueError('Nested product row')
            self.row = {'attrs': attrs, 'cells': []}
        if self.row is not None and tag == 'td':
            self.cell = []

    def handle_data(self, data):
        if self.cell is not None:
            self.cell.append(data)

    def handle_endtag(self, tag):
        if tag == 'td' and self.cell is not None:
            self.row['cells'].append(' '.join(' '.join(self.cell).split()))
            self.cell = None
        if tag == 'tr' and self.row is not None:
            self.rows.append(self.row)
            self.row = None


def parse_listing(source, kind, months):
    parser = ProductRows()
    parser.feed(source)
    total = re.search(r'총\s*<em>([\d,]+)</em>\s*건', source)
    if not total or len(parser.rows) != int(total[1].replace(',', '')):
        raise ValueError('Incomplete FSS list; previous snapshot retained')
    if not parser.rows:
        raise ValueError('Empty FSS list; previous snapshot retained')
    result = []
    for row in parser.rows:
        a, c = row['attrs'], row['cells']
        expected = 11 if kind == 'deposit' else 12
        if len(c) != expected or int(a['data-savetrm']) != months:
            raise ValueError('FSS table schema or term changed')
        # Free-deposit savings have no fixed monthly payment and are not comparable.
        if kind == 'installment' and a.get('data-rsrvtype') != 'S':
            continue
        offset = 0 if kind == 'deposit' else 1
        if c[7 + offset] != '제한없음':
            continue
        def rate(index):
            if not re.fullmatch(r'\d+(?:\.\d+)?%', c[index]):
                raise ValueError('Missing/non-numeric rate')
            value = float(c[index][:-1])
            if not 0 <= value <= 100:
                raise ValueError('Rate outside supported range')
            return value
        base, maximum = rate(3 + offset), rate(6 + offset)
        if maximum < base:
            raise ValueError('Maximum rate lower than base rate')
        method = {'S': 'simple', 'M': 'monthly-compound'}[a['data-intrratetype']]
        if c[8 + offset] != {'simple': '단리', 'monthly-compound': '복리'}.get(method) and not (method == 'monthly-compound' and c[8 + offset] == '월복리'):
            raise ValueError('Interest method mismatch')
        disclosure = a['data-dclsmonth']
        if not re.fullmatch(r'20\d{2}(0[1-9]|1[0-2])', disclosure):
            raise ValueError('Invalid disclosure month')
        endpoint, menu = ENDPOINTS[kind]
        source_url = 'https://finlife.fss.or.kr/finlife/svings/' + endpoint + '/list.do?' + urllib.parse.urlencode({'menuNo': menu, 'saveTrm': months, 'searchKeyword': a['data-finprdtnm']})
        result.append({
            'id': ':'.join([kind, a['data-fincono'], a['data-finprdtcd'], str(months), a['data-intrratetype']]),
            'kind': kind, 'company': c[1], 'name': a['data-finprdtnm'],
            'sector': 'savings-bank' if '저축은행' in c[1] else 'bank',
            'months': months, 'method': method, 'baseRate': base, 'maxRate': maximum,
            'maxLimit': int(a['data-maxlimit']) if a.get('data-maxlimit', '').isdigit() else None,
            'disclosureMonth': disclosure[:4] + '-' + disclosure[4:],
            'sourceUrl': source_url,
        })
    if not result or len({p['id'] for p in result}) != len(result):
        raise ValueError('Empty or duplicated comparable options')
    return result, len(parser.rows)


def fetch_listing(kind, months):
    endpoint, menu = ENDPOINTS[kind]
    params = {'menuNo': menu, 'pageType': 'ajax', 'pageIndex': 1, 'pageSize': 5000,
              'pageUnit': 5000, 'saveTrm': months, 'topFinGrpNo': '020000,030300',
              'joinDeny': '1', 'intrRateType': 'S|M', 'joinWay': '1,2,3,4,5,9',
              'inputMoney': 10000000 if kind == 'deposit' else 300000,
              'listOrder': 'intrRateDesc', 'rsrvType': 'S'}
    url = 'https://finlife.fss.or.kr/finlife/svings/' + endpoint + '/list.do?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={'User-Agent': 'TaxYou public-rate-review/1.0', 'Accept': 'text/html'})
    with urllib.request.urlopen(req, timeout=45) as response:
        source = response.read(20_000_001)
    if len(source) > 20_000_000:
        raise ValueError('Unexpected response size')
    return parse_listing(source.decode('utf-8'), kind, months)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / 'scripts/savings-rank-data.js')
    args = parser.parse_args()
    products, coverage = [], []
    for kind in ENDPOINTS:
        for months in (6, 12, 24):
            rows, source_count = fetch_listing(kind, months)
            products.extend(rows)
            coverage.append({'kind': kind, 'months': months, 'sourceRows': source_count, 'includedOptions': len(rows)})
            print(f'{kind} {months} months: {len(rows)} comparable options / {source_count} source rows', flush=True)
    snapshot = {'schemaVersion': 1, 'collectedAt': dt.datetime.now(dt.timezone.utc).isoformat(),
                'source': '금융감독원 금융상품한눈에 공개 비교공시', 'coverage': coverage, 'products': products}
    payload = '// Generated by tools/refresh-savings-rates.py. Do not edit rates by hand.\nwindow.SavingsRankData = ' + json.dumps(snapshot, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c').replace('\u2028', '\\u2028').replace('\u2029', '\\u2029') + ';\n'
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=args.output.parent, delete=False) as f:
        f.write(payload)
        temporary = Path(f.name)
    temporary.replace(args.output)
    print(f'Updated {args.output.name}: {len(products)} options')


if __name__ == '__main__':
    main()
