#!/usr/bin/env python3
"""Structural regression tests for the CSSBC 27-model source generator."""
import importlib.util
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "tools" / "model_pack" / "generate_armored_pack.py"
spec = importlib.util.spec_from_file_location("armored_pack", SCRIPT)
pack = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pack)


class ArmoredPackTests(unittest.TestCase):
    def test_roster_is_exactly_27_with_expected_split(self):
        self.assertEqual(len(pack.ROLES), 27)
        self.assertEqual(sum(r[1] == "t" for r in pack.ROLES), 13)
        self.assertEqual(sum(r[1] == "ct" for r in pack.ROLES), 13)
        self.assertEqual(sum(r[1] == "special" for r in pack.ROLES), 1)
        self.assertEqual(sum(r[2] == "sniper" for r in pack.ROLES), 2)
        self.assertEqual([r[0] for r in pack.ROLES].count("juggernaut"), 1)

    def test_generated_sources_and_materials_are_complete(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = pack.generate(tmp)
            models = [p for p in out.iterdir() if p.is_dir() and p.name != "materials"]
            self.assertEqual(len(models), 27)
            material_dir = out / "materials" / "models" / "cssbc" / "player"
            for role in pack.ROLES:
                rid = role[0]
                folder = out / rid
                for name in ("model.smd", "idle.smd", "walk.smd", rid + ".qc"):
                    self.assertTrue((folder / name).is_file(), f"missing {rid}/{name}")
                qc = (folder / (rid + ".qc")).read_text(encoding="utf-8")
                self.assertIn('$modelname "cssbc/player/' + rid + '.mdl"', qc)
                smd = (folder / "model.smd").read_text(encoding="ascii")
                self.assertIn("triangles\n", smd)
                self.assertIn("\nend\n", smd)
                used = {line for line in smd.splitlines() if line in pack.PALETTE}
                self.assertTrue(used)
                vertex_lines = smd.split("triangles\\n", 1)[1].splitlines()
                z_values = []
                for index, line in enumerate(vertex_lines):
                    if line in pack.PALETTE:
                        for vertex in vertex_lines[index + 1:index + 4]:
                            fields = vertex.split()
                            z_values.append(float(fields[3]))
                self.assertTrue(z_values)
                height = max(z_values) - min(z_values)
                self.assertGreater(height, 60.0)
                self.assertLess(height, 100.0)
            for name in pack.PALETTE:
                tga = material_dir / (name + ".tga")
                self.assertEqual(tga.stat().st_size, 18 + 32 * 32 * 4)
                self.assertTrue((material_dir / (name + ".vmt")).is_file())

    def test_role_materials_are_not_collapsed_to_generic_defaults(self):
        roles = {r[0]: r for r in pack.ROLES}
        self.assertNotEqual(roles["t_raider"][3], roles["ct_assault"][3])
        self.assertNotEqual(roles["t_raider"][4], roles["ct_assault"][4])


if __name__ == "__main__":
    unittest.main()
