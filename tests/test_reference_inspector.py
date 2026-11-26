import importlib.util
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "tools" / "model_pack" / "inspect_v34_reference.py"
spec = importlib.util.spec_from_file_location("reference_inspector", SCRIPT)
inspector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(inspector)


class ReferenceInspectorTests(unittest.TestCase):
    def test_parses_reference_nodes_and_weighted_bones(self):
        with tempfile.TemporaryDirectory() as tmp:
            smd = Path(tmp) / "reference.smd"
            smd.write_text('''version 1
nodes
0 "ValveBiped.Bip01_Pelvis" -1
1 "ValveBiped.Bip01_Spine2" 0
2 "ValveBiped.Bip01_Head1" 1
end
skeleton
time 0
0 0 0 0 0 0 0
1 0 0 10 0 0 0
2 0 0 10 0 0 0
end
triangles
body
0 0 0 0 0 0 1 0 0 1
1 1 0 0 0 0 1 1 0 1
2 0 1 0 0 0 1 0 1 1
end
''', encoding="utf-8")
            result = inspector.parse_smd(smd)
            self.assertEqual(len(result["nodes"]), 3)
            self.assertEqual(result["weighted_bones"], [0, 1, 2])
            self.assertEqual(result["frames"], [0])

    def test_rejects_missing_parent(self):
        with tempfile.TemporaryDirectory() as tmp:
            smd = Path(tmp) / "bad.smd"
            smd.write_text('version 1\nnodes\n0 "root" 9\nend\n', encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "missing parents"):
                inspector.parse_smd(smd)

    def test_qc_contract_is_reported(self):
        with tempfile.TemporaryDirectory() as tmp:
            qc = Path(tmp) / "reference.qc"
            qc.write_text('''$modelname "player/reference.mdl"
$body "body" "reference.smd"
$sequence "idle" "idle.smd"
$attachment "eyes" "ValveBiped.Bip01_Head1" 0 0 0
$hboxset "default"
$eyeposition 0 0 64
$illumposition 0 0 36
''', encoding="utf-8")
            result = inspector.parse_qc(qc)
            self.assertEqual(result["modelname"], ["player/reference.mdl"])
            self.assertEqual(result["sequences"], ["idle"])
            self.assertEqual(result["attachments"], ["eyes"])
            self.assertEqual(result["hitbox_sets"], ["default"])
            self.assertTrue(result["has_body"])


if __name__ == "__main__":
    unittest.main()
