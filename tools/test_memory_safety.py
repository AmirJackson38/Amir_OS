"""Regression tests: durable history survives and inferred claims stay unverified."""
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from continuity_bootstrap_v2 import build_packet, session_titles
from character_limiter import inspect_sizes
from memory_compactor import compact_session_log
from memory_promoter import session_end_checkpoint
from memory_io import atomic_write


class MemorySafetyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'memory').mkdir()
        (self.root / 'PROJECT_STATE.json').write_text(json.dumps({'tars': {
            'current_phase': 'Phase 10.3.1', 'phase_status': 'shadow_validation_pending',
            'next_gate': 'manual comparison', 'latest_release': 'tars-v9.3.2'
        }}), encoding='utf-8')
        self.log = self.root / 'memory/SESSION_LOG_v2.md'
        self.log.write_text('# History\n## Session 2026-09-30\n' + 'new evidence\n' * 500
                            + '## Session 2026-07-27\nold evidence\n', encoding='utf-8')
        self.original = self.log.read_bytes()

    def test_compactor_and_report_preserve_oversized_history(self):
        changed, _ = compact_session_log(self.log, 20)
        self.assertFalse(changed)
        inspect_sizes(self.root)
        self.assertEqual(self.original, self.log.read_bytes())

    def test_session_order_supports_both_source_orders(self):
        expected = ['2026-09-30', '2026-07-27']
        self.assertEqual(session_titles(self.log.read_text()), expected)
        self.assertEqual(session_titles('## Session 2026-07-27\n## Session 2026-09-30'), expected)

    def test_packet_is_bounded_and_does_not_change_sources(self):
        packet = build_packet(self.root, 1500)
        self.assertLessEqual(len(packet), 1500)
        self.assertIn('Phase 10.3.1', packet)
        self.assertEqual(self.original, self.log.read_bytes())
        self.assertFalse((self.root / 'memory/CONTEXT_PACKET.md').exists())

    def test_checkpoint_queues_unverified_claim_without_rewriting_truth(self):
        state_path = self.root / 'PROJECT_STATE.json'
        before = state_path.read_bytes()
        result = session_end_checkpoint(work_log='phase 99 complete, deployed', root=self.root)
        self.assertEqual(result['verified_promotions'], 0)
        queue = self.root / 'memory/REVIEW_QUEUE.md'
        self.assertIn('needs review', queue.read_text())
        self.assertEqual(state_path.read_bytes(), before)
        self.assertEqual(self.original, self.log.read_bytes())
        self.assertEqual(session_end_checkpoint(work_log='phase 99 complete, deployed', root=self.root)['queued'], 0)

    def test_failed_atomic_replace_preserves_existing_record(self):
        path = self.root / 'memory/REVIEW_QUEUE.md'
        path.write_text('original evidence', encoding='utf-8')
        with patch('memory_io.os.replace', side_effect=OSError('simulated failure')):
            with self.assertRaises(OSError):
                atomic_write(path, 'replacement')
        self.assertEqual(path.read_text(), 'original evidence')
        self.assertEqual(list(path.parent.glob('*.tmp')), [])

    def test_candidate_redacts_supported_token_patterns(self):
        token = 'ghp_' + 'x' * 40
        session_end_checkpoint(agent_notes='token ' + token, root=self.root)
        content = (self.root / 'memory/REVIEW_QUEUE.md').read_text()
        self.assertNotIn(token, content)
        self.assertIn('[REDACTED]', content)

    def test_concurrent_writer_fails_without_changing_queue(self):
        queue = self.root / 'memory/REVIEW_QUEUE.md'
        queue.write_text('preserved evidence', encoding='utf-8')
        lock = queue.with_name(queue.name + '.lock')
        lock.write_text('other writer', encoding='utf-8')
        with self.assertRaises(FileExistsError):
            session_end_checkpoint(work_log='new claim', root=self.root)
        self.assertEqual(queue.read_text(), 'preserved evidence')
        self.assertTrue(lock.exists())


if __name__ == '__main__':
    unittest.main()
