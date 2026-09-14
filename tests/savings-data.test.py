import importlib.util
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('collector', Path(__file__).resolve().parents[1] / 'tools/refresh-savings-rates.py')
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)


def fixture(kind='deposit', method='S', total=1, rate='3.00%', rsrv='S'):
    cells = ['', '검증은행', '테스트', rate, '2.54%', '253800', '4.00%', '제한없음', '단리' if method == 'S' else '복리', '문의', '상세']
    if kind == 'installment':
        cells.insert(3, '정액적립식' if rsrv == 'S' else '자유적립식')
    attrs = f'data-savetrm="12" data-fincono="1" data-finprdtcd="2" data-intrratetype="{method}" data-rsrvtype="{rsrv}" data-finprdtnm="테스트 &amp; 안전" data-dclsmonth="202608" data-maxlimit="50000000"'
    return f'총 <em>{total}</em>건<table><tr class="onOffTr" {attrs}>' + ''.join(f'<td>{s}</td>' for s in cells) + '</tr></table>'


class SavingsDataTest(unittest.TestCase):
    def test_field_alignment_and_escaping(self):
        for kind in ('deposit', 'installment'):
            for method in ('S', 'M'):
                rows, total = collector.parse_listing(fixture(kind, method), kind, 12)
                self.assertEqual(total, 1)
                self.assertEqual(rows[0]['baseRate'], 3)
                self.assertEqual(rows[0]['maxRate'], 4)
                self.assertEqual(rows[0]['name'], '테스트 & 안전')
                self.assertEqual(rows[0]['maxLimit'], 50000000)
                self.assertEqual(rows[0]['method'], 'simple' if method == 'S' else 'monthly-compound')

    def test_incomplete_or_invalid_data_is_rejected(self):
        for source in (fixture(total=2), fixture(rate='-'), fixture(rate='NaN%'), fixture(rate='5.00%'), fixture().replace('202608', '202613'), '<html>maintenance</html>'):
            with self.assertRaises(ValueError):
                collector.parse_listing(source, 'deposit', 12)
        with self.assertRaises(ValueError):
            collector.parse_listing(fixture(), 'deposit', 6)
        with self.assertRaises(ValueError):
            collector.parse_listing(fixture('installment', rsrv='F'), 'installment', 12)

    def test_partial_fetch_failure_preserves_snapshot(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'snapshot.js'
            output.write_text('previous valid snapshot')
            first = collector.parse_listing(fixture(), 'deposit', 12)
            with patch.object(sys, 'argv', ['refresh', '--output', str(output)]), patch.object(collector, 'fetch_listing', side_effect=[first, OSError('network unavailable')]):
                with self.assertRaises(OSError):
                    collector.main()
            self.assertEqual(output.read_text(), 'previous valid snapshot')


if __name__ == '__main__':
    unittest.main()
