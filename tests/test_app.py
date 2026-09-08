"""Browser regression tests. Run: python3 -m unittest discover -s tests -v"""
import copy
import functools
import http.server
import json
from pathlib import Path
import threading
import unittest

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
CATALOG = json.loads((ROOT / 'ite_subjects.json').read_text())


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def exam(code, assignment=80, final=80, term='S25', status='Archive'):
    prefix = code if code.startswith('ENG_') else f'ITE_{code}'
    return '\n'.join(f'{prefix}_{term}_{kind}_1_2025-01-01\t{status}\t{grade}'
                     for kind, grade in [('assignment', assignment), ('final', final)]
                     if grade is not None)


class AppTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.url = f'http://127.0.0.1:{cls.server.server_port}'
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(headless=True)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def setUp(self):
        self.context = self.browser.new_context()
        self.page = self.context.new_page()
        self.errors = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def load(self, catalog=None):
        if catalog is not None:
            self.page.route('**/ite_subjects.json', lambda route: route.fulfill(json=catalog))
        self.page.goto(self.url)
        self.page.wait_for_function('document.body.dataset.ready')
        self.assertEqual(self.page.locator('body').get_attribute('data-ready'), 'true')

    def import_history(self, text):
        self.page.locator('#importBtn').click()
        self.page.locator('#examTextarea').fill(text)
        self.page.locator('#modalParseBtn').click()
        preview = self.page.locator('.stat-row.available .stat-value').inner_text()
        self.page.locator('#modalApplyBtn').click()
        self.assertEqual(self.page.locator('#availableCount').inner_text(), preview)

    def node(self, code):
        return self.page.locator(f'.node[data-id="{code}"]')

    def available(self, code):
        return self.page.locator(f'#availableList [data-id="{code}"]').count() > 0

    def stored(self):
        return self.page.evaluate('JSON.parse(localStorage.getItem("svu_ite_progress_v2"))')

    def test_catalog_tracks_and_shared_courses(self):
        self.load()
        self.assertEqual(self.page.locator('.node').count(), 92)
        self.assertEqual(self.page.locator('.node:visible').count(), 50)
        self.assertEqual(self.page.locator('#catFilters button').count(), 8)
        self.assertEqual(self.page.locator('#catFilters .active .cat-label').all_text_contents(), ['General', 'Basic'])
        self.assertEqual(self.page.locator('#trackFilter').count(), 0)
        for spec in CATALOG['program']['specializations']:
            for track in spec['tracks']:
                chip = self.page.locator(f'#catFilters [data-cat="{spec["code"]}/{track["code"]}"]')
                self.assertIn(f'{spec["code"]} {track["name"]}', chip.inner_text())
                chip.click()
                self.assertEqual(self.page.locator('.node:visible').count(), 50 + len(track['subjects']))
                chip.click()
        self.page.locator('#catFilters [data-cat="SE/DS"]').click()
        self.page.locator('#catFilters [data-cat="AI/IS"]').click()
        self.assertTrue(self.node('SIR601').is_visible())
        self.assertEqual(self.node('SIR601').count(), 1)
        self.assertFalse(self.node('SSE602').is_visible())
        self.page.locator('#catFilters [data-cat="SE/DS"]').click()
        self.assertTrue(self.node('SIR601').is_visible())
        self.page.locator('#catFilters [data-cat="AI/IS"]').click()
        self.assertFalse(self.node('SIR601').is_visible())

    def test_filter_defaults_migration_and_empty_selection(self):
        self.page.add_init_script("localStorage.setItem('svu_ite_filters_v1', JSON.stringify(['general','basic','SE','AI','SCN'])); localStorage.setItem('svu_track_v1', 'SE/DS');")
        self.load()
        self.assertEqual(self.page.locator('.node:visible').count(), 50)
        self.page.locator('#catFilters [data-cat="general"]').click()
        self.page.locator('#catFilters [data-cat="basic"]').click()
        self.assertEqual(self.page.locator('.node:visible').count(), 0)
        self.page.reload()
        self.page.wait_for_function('document.body.dataset.ready === "true"')
        self.assertEqual(self.page.locator('.node:visible').count(), 0)
        self.assertEqual(self.page.locator('#catFilters .active').count(), 0)

    def test_failed_prerequisites_and_english_exception(self):
        self.load()
        self.import_history(exam('BMA401', 20, 20) + '\n' + exam('ENG_L1', 20, 20))
        self.assertTrue(self.available('BMA402'))
        self.assertTrue(self.available('BMA401'))
        self.assertFalse(self.available('GEN401'))
        self.assertIn('failed', self.node('BMA401').get_attribute('class'))
        self.import_history(exam('ENG_L1'))
        self.assertTrue(self.available('GEN401'))
        self.assertEqual(self.page.locator('.import-stat.passed .stat-sub').inner_text(), '3 cr')

    def test_new_courses_and_live_json_changes(self):
        catalog = copy.deepcopy(CATALOG)
        catalog['subjects']['basic'].append({'id':'ZZZ601', 'name':'JSON-only course', 'nameAr':'اختبار', 'credits':7,
                                             'level':6, 'category':'basic', 'prerequisites':['BMA401']})
        catalog['app_config']['eligibility']['defaultPrerequisitePolicy'] = 'passed'
        self.load(catalog)
        self.assertEqual(self.page.locator('.node').count(), 93)
        self.import_history(exam('BMA401', 20, 20))
        self.assertFalse(self.available('ZZZ601'))
        self.import_history(exam('BMA401') + '\n' + exam('ZZZ601'))
        self.assertIn('passed', self.node('ZZZ601').get_attribute('class'))
        self.assertEqual(self.page.locator('.import-stat.passed .stat-sub').inner_text(), '12 cr')

    def test_grading_rules_and_zero_weight(self):
        catalog = copy.deepcopy(CATALOG)
        catalog['app_config']['grading'].update(assignmentWeight=0, finalWeight=1, passThreshold=90)
        self.load(catalog)
        self.import_history(exam('BMA401', 100, 89))
        self.assertIn('failed', self.node('BMA401').get_attribute('class'))
        self.import_history(exam('BMA401', 0, 90))
        self.assertIn('passed', self.node('BMA401').get_attribute('class'))
        self.node('BMA401').click()
        self.assertIn('(0%)', self.page.locator('.attempt-grades').inner_text())
        self.assertIn('(100%)', self.page.locator('.attempt-grades').inner_text())

    def test_component_minimum_and_pending_grades(self):
        catalog = copy.deepcopy(CATALOG)
        catalog['app_config']['grading']['minimumFinal'] = 80
        self.load(catalog)
        self.import_history(exam('BMA401', 100, 79))
        self.assertIn('failed', self.node('BMA401').get_attribute('class'))
        self.import_history(exam('BMA401', status='Checking'))
        self.assertIn('in-progress', self.node('BMA401').get_attribute('class'))
        self.assertTrue(self.available('BMA402'))
        self.import_history(exam('ENG_L1', status='Publishing'))
        self.assertFalse(self.available('GEN401'))
        self.assertEqual(self.page.locator('.import-stat.progress .stat-sub').inner_text(), '1 cr')

    def test_chronological_attempts_and_completed_course(self):
        self.load()
        self.import_history(exam('BMA401', 20, 20, 'F24') + '\n' + exam('BMA401', 30, 30, 'S25'))
        attempts = self.stored()['attempts']['BMA401']
        self.assertEqual([a['term'] for a in attempts], ['F24','S25'])
        self.import_history(exam('BMA401', 80, 80, 'S24') + '\n' + exam('BMA401', 20, 20, 'F25'))
        self.assertIn('passed', self.node('BMA401').get_attribute('class'))
        self.assertEqual(self.page.locator('.import-stat.passed .stat-value').inner_text(), '1')

    def test_placement_rules_from_json(self):
        catalog = copy.deepcopy(CATALOG)
        catalog['app_config']['import']['placement']['thresholds'] = [{'minGrade':50,'levelsPassed':2}]
        self.load(catalog)
        self.import_history('ENG_PT_S25_final_1_2025-01-01\tArchive\t55')
        self.assertEqual(self.page.locator('.node.passed').count(), 2)
        self.assertTrue(self.available('GEN501'))
        self.assertEqual(self.page.locator('.import-stat.passed .stat-sub').inner_text(), '6 cr')

    def test_project_thresholds_manual_override_and_reload(self):
        catalog = copy.deepcopy(CATALOG)
        catalog['additional_info']['project_conditions']['project_I']['credits_earned_required'] = 5
        self.load(catalog)
        self.import_history(exam('BID601', 20, 20))
        self.assertFalse(self.available('BPR601'))
        self.node('BMA401').click()
        self.page.locator('#manualPassBtn').click()
        self.assertTrue(self.available('BPR601'))
        self.page.reload()
        self.page.wait_for_function('document.body.dataset.ready === "true"')
        self.assertTrue(self.available('BPR601'))
        self.assertIn('passed', self.node('BMA401').get_attribute('class'))
        self.node('BMA401').click()
        self.page.locator('#manualPassBtn').click()
        self.assertFalse(self.available('BPR601'))

    def test_saved_import_recalculated_when_rules_change(self):
        self.load()
        self.import_history(exam('BMA401', 70, 70))
        catalog = copy.deepcopy(CATALOG)
        catalog['app_config']['grading']['passThreshold'] = 80
        self.page.route('**/ite_subjects.json', lambda route: route.fulfill(json=catalog))
        self.page.reload()
        self.page.wait_for_function('document.body.dataset.ready === "true"')
        self.assertIn('failed', self.node('BMA401').get_attribute('class'))

    def test_language_theme_search_and_track_persistence(self):
        self.load()
        self.page.locator('#catFilters [data-cat="SE/DS"]').click()
        self.node('DSA601').click()
        self.page.locator('#langToggle').click()
        self.assertIn('علم البيانات', self.page.locator('#detailSection').inner_text())
        self.assertEqual(self.page.locator('html').get_attribute('lang'), 'ar')
        self.page.locator('#themeToggle').click()
        self.page.locator('#search').fill('DSA601')
        self.assertEqual(self.node('DSA601').evaluate('el => el.style.opacity'), '1')
        self.page.locator('#search').fill('')
        self.assertEqual(self.node('BMA401').evaluate('el => el.style.opacity'), '')
        self.page.reload()
        self.page.wait_for_function('document.body.dataset.ready === "true"')
        self.assertEqual(self.page.locator('#catFilters [data-cat="SE/DS"]').get_attribute('aria-pressed'), 'true')
        self.assertEqual(self.page.locator('html').get_attribute('lang'), 'ar')
        self.assertIn('dark', self.page.locator('body').get_attribute('class'))

    def test_unrecognized_courses_do_not_count_as_progress(self):
        self.load()
        self.import_history(exam('BMA401') + '\n' + exam('ZZZ999'))
        self.assertNotIn('ZZZ999', self.stored()['attempts'])
        self.assertEqual(self.page.locator('.import-stat.total .stat-value').inner_text(), '1')

    def test_fetch_failure_and_invalid_catalog(self):
        self.page.route('**/ite_subjects.json', lambda route: route.fulfill(status=404, body='missing'))
        self.page.goto(self.url)
        self.page.wait_for_function('document.body.dataset.ready === "error"')
        self.assertIn('404', self.page.locator('#infoEmpty').inner_text())
        self.assertTrue(self.page.locator('#importBtn').is_disabled())
        self.page.unroute('**/ite_subjects.json')
        catalog = copy.deepcopy(CATALOG)
        catalog['subjects']['basic'][0]['prerequisites'] = ['MISSING']
        self.page.route('**/ite_subjects.json', lambda route: route.fulfill(json=catalog))
        self.page.reload()
        self.page.wait_for_function('document.body.dataset.ready === "error"')
        self.assertIn('Unknown prerequisite', self.page.locator('#infoEmpty').inner_text())


if __name__ == '__main__':
    unittest.main()
