#!/usr/bin/env python3
"""Refresh TaxYou's apartment mortgage comparison from public FSS HTML."""
import argparse
import datetime as dt
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import tempfile
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
SOURCE = 'https://finlife.fss.or.kr/finlife/ldng/houseMrtg/list.do'


class ProductRows(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows, self.row, self.cell = [], None, None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'tr' and 'onOffTr' in attrs.get('class', '').split():
            if self.row is not None:
                raise ValueError('Nested mortgage product row')
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


def parse_listing(source):
    parser = ProductRows()
    parser.feed(source)
    total = re.search(r'총\s*<em>([\d,]+)</em>\s*건', source)
    if not total or len(parser.rows) != int(total[1].replace(',', '')) or not parser.rows:
        raise ValueError('Incomplete FSS mortgage list; previous snapshot retained')
    products = []
    for row in parser.rows:
        attrs, cells = row['attrs'], row['cells']
        if len(cells) != 15 or attrs.get('data-mrtgtype') != 'A':
            raise ValueError('FSS mortgage table schema or property type changed')
        rate_type = attrs.get('data-lendratetype')
        repayment = attrs.get('data-rpaytype')
        if rate_type not in ('C', 'F') or repayment not in ('D1', 'D2', 'S'):
            raise ValueError('Unknown rate or repayment type')
        if cells[4] != {'C': '변동금리', 'F': '고정금리'}[rate_type] or cells[5] != {'D1': '원금분할상환', 'D2': '원리금분할상환', 'S': '만기일시상환'}[repayment]:
            raise ValueError('Rate or repayment label mismatch')
        def rate(value):
            if value == '-':
                return None
            if not re.fullmatch(r'\d+(?:\.\d+)?%', value):
                raise ValueError('Invalid FSS mortgage rate')
            number = float(value[:-1])
            if not 0 <= number <= 100:
                raise ValueError('Mortgage rate outside supported range')
            return number
        minimum, maximum, average = (rate(cells[index]) for index in (6, 7, 8))
        if minimum is None or maximum is None or minimum > maximum:
            raise ValueError('Missing or reversed mortgage rate range')
        month = attrs.get('data-dclsmonth', '')
        if not re.fullmatch(r'20\d{2}(0[1-9]|1[0-2])', month):
            raise ValueError('Invalid FSS disclosure month')
        company, name = cells[1], attrs.get('data-finprdtnm', '')
        if not company or not name:
            raise ValueError('Missing mortgage product name')
        sector = 'savings-bank' if '저축은행' in company else 'insurance' if '보험' in company else 'bank'
        product_url = attrs.get('data-prdturl', '')
        if product_url and not product_url.startswith('https://'):
            product_url = ''
        products.append({
            'id': ':'.join([month, attrs['data-fincono'], attrs['data-finprdtcd'], repayment, rate_type]),
            'company': company, 'name': name, 'sector': sector,
            'rateType': rate_type, 'repayment': repayment,
            'minRate': minimum, 'maxRate': maximum, 'avgRate': average,
            'disclosureMonth': month[:4] + '-' + month[4:],
            'sourceUrl': SOURCE + '?' + urllib.parse.urlencode({'menuNo': '700007', 'searchKeyword': name}),
            'productUrl': product_url,
        })
    if len({item['id'] for item in products}) != len(products):
        raise ValueError('Duplicated FSS mortgage option IDs')
    return products


def fetch_listing():
    params = {
        'menuNo': '700007', 'pageType': 'ajax', 'pageIndex': 1,
        'pageSize': 5000, 'pageUnit': 5000, 'loanMoney': 100000000,
        'houseMoney': 300000000, 'period': 30, 'mrtgType': 'A',
        'rpayType': '', 'lendRateType': '',
        'areaType': ','.join(f'{number:02d}' for number in range(1, 18)),
        'topFinGrpNo': '020000,030300,050000',
        'joinWay': '1,2,3,4,5,9', 'listOrder': 'lendRateAsc'
    }
    request = urllib.request.Request(SOURCE + '?' + urllib.parse.urlencode(params), headers={
        'User-Agent': 'TaxYou public-mortgage-rate-review/1.0', 'Accept': 'text/html'
    })
    with urllib.request.urlopen(request, timeout=45) as response:
        content = response.read(5_000_001)
    if len(content) > 5_000_000:
        raise ValueError('Unexpected FSS response size')
    return parse_listing(content.decode('utf-8'))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / 'scripts/mortgage-rate-data.js')
    args = parser.parse_args()
    products = fetch_listing()
    snapshot = {
        'schemaVersion': 1, 'collectedAt': dt.datetime.now(dt.timezone.utc).isoformat(),
        'source': '금융감독원 금융상품한눈에 주택담보대출 공개 비교공시',
        'scope': '아파트·전국·은행/저축은행/보험·공시 조회조건 주택 3억원/대출 1억원/30년',
        'sourceRows': len(products), 'products': products
    }
    payload = '// Generated by tools/refresh-mortgage-rates.py. Do not edit rates by hand.\nwindow.MortgageRateData = ' + json.dumps(snapshot, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c').replace('\u2028', '\\u2028').replace('\u2029', '\\u2029') + ';\n'
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=args.output.parent, delete=False) as output:
        output.write(payload)
        temporary = Path(output.name)
    temporary.replace(args.output)
    print(f'Updated {args.output.name}: {len(products)} official options')


if __name__ == '__main__':
    main()
