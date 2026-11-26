#!/usr/bin/env python3
"""Structural tests for generated CSSBC Source model source files."""
import tempfile
import unittest
from pathlib import Path
from generate_pack import ROLES, BONES, MATERIALS, generate

def sections(text):
    result={}
    current=None
    for line in text.splitlines():
        if line in ("nodes","skeleton","triangles"):
            current=line
            result.setdefault(current,[])
        elif line=="end":
            current=None
        elif current:
            result[current].append(line)
    return result

class ModelPackTests(unittest.TestCase):
    def test_all_roles_generate_qc_reference_and_animations(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=generate(tmp)
            for role,cloth,gear,scale,helmet in ROLES:
                folder=root/role
                self.assertTrue((folder/"model.smd").is_file())
                self.assertTrue((folder/"idle.smd").is_file())
                self.assertTrue((folder/"walk.smd").is_file())
                qc=(folder/f"{role}.qc").read_text()
                self.assertIn('"idle" "idle.smd"',qc)
                self.assertIn('"walk" "walk.smd"',qc)
                self.assertIn(f"$modelname \"cssbc/player/{role}.mdl\"",qc)

    def test_reference_mesh_has_valid_materials_and_bone_links(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=generate(tmp)
            allowed=set(MATERIALS)
            for role,*_ in ROLES:
                parsed=sections((root/role/"model.smd").read_text())
                self.assertEqual(len(parsed["nodes"]),len(BONES))
                triangles=parsed["triangles"]
                self.assertGreater(len(triangles),100)
                for index,line in enumerate(triangles):
                    if index%4==0:
                        self.assertIn(line,allowed)
                    else:
                        fields=line.split()
                        self.assertEqual(len(fields),12)
                        self.assertIn(int(fields[0]),range(len(BONES)))
                        self.assertEqual(int(fields[10]),int(fields[0]))

    def test_animation_frames_have_complete_skeleton(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=generate(tmp)
            for role,*_ in ROLES:
                for filename,expected_frames in (("idle.smd",3),("walk.smd",31)):
                    text=(root/role/filename).read_text()
                    parsed=sections(text)
                    self.assertEqual(len(parsed["nodes"]),len(BONES))
                    frame_count=text.count("\ntime ")
                    self.assertEqual(frame_count,expected_frames)

    def test_material_templates_and_tga_sources_exist(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=generate(tmp)
            folder=root/"materials"/"models"/"cssbc"/"player"
            for name in MATERIALS:
                self.assertTrue((folder/f"{name}.vmt").is_file())
                tga=(folder/f"{name}.tga").read_bytes()
                self.assertEqual(len(tga),18+16*16*4)
                self.assertEqual(tga[2],2)
                self.assertEqual(tga[16],32)

if __name__=="__main__":
    unittest.main()
