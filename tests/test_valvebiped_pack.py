import importlib.util
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "tools" / "model_pack" / "build_valvebiped_pack.py"
spec = importlib.util.spec_from_file_location("valvebiped_builder", SCRIPT)
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class ValveBipedBuilderTests(unittest.TestCase):
    def test_vendored_reference_contains_full_hierarchy(self):
        text = builder.DEFAULT_REFERENCE.read_text(encoding="utf-8-sig")
        _, node_lines, skeleton_lines = builder.sections(text)
        nodes = builder.parse_nodes(node_lines)
        self.assertGreaterEqual(len(nodes), 50)
        for name in builder.MAP_NAMES.values():
            self.assertIn(name, nodes)
        self.assertTrue(any(line.strip().startswith("time 0") for line in skeleton_lines))

    def test_vertex_influence_ids_are_remapped(self):
        mapping = {1: 0, 2: 3, 3: 6}
        line = "2 1 2 3 0 0 1 0.5 0.5 2 2 0.75 3 0.25"
        result = builder.remap_vertex_line(line, mapping)
        self.assertEqual(result.split()[0], "3")
        self.assertEqual(result.split()[10], "3")
        self.assertEqual(result.split()[12], "6")

    def test_qc_has_attachments_and_hitgroups(self):
        qc = builder.qc_text("test_operator")
        self.assertIn('$attachment "anim_attachment_RH"', qc)
        self.assertIn('$attachment "weapon_bone"', qc)
        self.assertIn('$hboxset "default"', qc)
        self.assertIn('$hbox 1 "ValveBiped.Bip01_Head1"', qc)
        self.assertIn('$sequence "walk_all"', qc)


if __name__ == "__main__":
    unittest.main()
