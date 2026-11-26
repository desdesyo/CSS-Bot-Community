#!/usr/bin/env python3
"""Preflight a CS:S v34 player reference before attempting model retargeting.

This tool does not invent a skeleton or modify model assets. It checks SMD
structure, hierarchy, weighted-bone references, QC sequences, attachments and
hitbox declarations, then writes a machine-readable compatibility report.
"""
from __future__ import annotations
import argparse
import json
import re
from pathlib import Path

def parse_smd(path: Path):
    lines = path.read_text(encoding="utf-8-sig", errors="replace").splitlines()
    nodes = {}
    section = None
    in_triangles = False
    weighted_ids = set()
    skeleton_frames = set()
    for line_no, raw in enumerate(lines, 1):
        line = raw.strip()
        if not line:
            continue
        if line in ("nodes", "skeleton", "triangles"):
            section = line
            in_triangles = line == "triangles"
            continue
        if line == "end":
            section = None
            in_triangles = False
            continue
        if section == "nodes":
            match = re.match(r'^(\d+)\s+"([^"]+)"\s+(-?\d+)$', line)
            if not match:
                raise ValueError(f"SMD line {line_no}: malformed node")
            idx, name, parent = int(match.group(1)), match.group(2), int(match.group(3))
            if idx in nodes:
                raise ValueError(f"SMD line {line_no}: duplicate node id {idx}")
            nodes[idx] = {"name": name, "parent": parent}
        elif section == "skeleton":
            match = re.match(r"^(\d+)\s+", line)
            if line.startswith("time "):
                skeleton_frames.add(int(line.split()[1]))
            elif match:
                bone_id = int(match.group(1))
                if bone_id not in nodes:
                    raise ValueError(f"SMD line {line_no}: skeleton references unknown node {bone_id}")
        elif in_triangles:
            fields = line.split()
            if len(fields) >= 10:
                try:
                    parent = int(fields[0])
                    float(fields[1]); float(fields[2]); float(fields[3])
                except ValueError:
                    continue
                weighted_ids.add(parent)
                if len(fields) >= 11:
                    try:
                        links = int(fields[10])
                        for i in range(links):
                            weighted_ids.add(int(fields[11 + i * 2]))
                    except (ValueError, IndexError):
                        raise ValueError(f"SMD line {line_no}: malformed bone weights")
    if not nodes:
        raise ValueError("SMD has no nodes section")
    missing_parents = {v["parent"] for v in nodes.values() if v["parent"] != -1 and v["parent"] not in nodes}
    if missing_parents:
        raise ValueError("SMD hierarchy references missing parents: " + ", ".join(map(str, sorted(missing_parents))))
    unknown_weights = weighted_ids - set(nodes)
    if unknown_weights:
        raise ValueError("SMD triangles reference unknown bones: " + ", ".join(map(str, sorted(unknown_weights))))
    return {"nodes": nodes, "weighted_bones": sorted(weighted_ids), "frames": sorted(skeleton_frames)}

def parse_qc(path: Path):
    source = path.read_text(encoding="utf-8-sig", errors="replace")
    return {
        "modelname": re.findall(r'^\s*\$modelname\s+"([^"]+)"', source, re.I | re.M),
        "sequences": re.findall(r'^\s*\$sequence\s+"([^"]+)"', source, re.I | re.M),
        "attachments": re.findall(r'^\s*\$attachment\s+"([^"]+)"', source, re.I | re.M),
        "hitbox_sets": re.findall(r'^\s*\$hboxset\s+"([^"]+)"', source, re.I | re.M),
        "has_body": bool(re.search(r'^\s*\$body\b', source, re.I | re.M)),
        "has_eyeposition": bool(re.search(r'^\s*\$eyeposition\b', source, re.I | re.M)),
        "has_illumposition": bool(re.search(r'^\s*\$illumposition\b', source, re.I | re.M)),
        "has_include": bool(re.search(r'^\s*\$include\b', source, re.I | re.M)),
        "raw_lines": len(source.splitlines()),
    }

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--smd", required=True, type=Path, help="reference player SMD")
    ap.add_argument("--qc", required=True, type=Path, help="matching reference QC")
    ap.add_argument("--json", type=Path, default=Path("css_v34_reference_report.json"))
    args = ap.parse_args()
    smd = parse_smd(args.smd)
    qc = parse_qc(args.qc)
    node_names = {v["name"] for v in smd["nodes"].values()}
    expected = {
        "pelvis": ["ValveBiped.Bip01_Pelvis", "Bip01_Pelvis"],
        "spine": ["ValveBiped.Bip01_Spine", "ValveBiped.Bip01_Spine1", "ValveBiped.Bip01_Spine2", "Bip01_Spine"],
        "head": ["ValveBiped.Bip01_Head1", "ValveBiped.Bip01_Head", "Bip01_Head1"],
        "upperarm_L": ["ValveBiped.Bip01_L_UpperArm", "Bip01_L_UpperArm"],
        "forearm_L": ["ValveBiped.Bip01_L_Forearm", "Bip01_L_Forearm"],
        "upperarm_R": ["ValveBiped.Bip01_R_UpperArm", "Bip01_R_UpperArm"],
        "forearm_R": ["ValveBiped.Bip01_R_Forearm", "Bip01_R_Forearm"],
        "thigh_L": ["ValveBiped.Bip01_L_Thigh", "Bip01_L_Thigh"],
        "calf_L": ["ValveBiped.Bip01_L_Calf", "Bip01_L_Calf"],
        "thigh_R": ["ValveBiped.Bip01_R_Thigh", "Bip01_R_Thigh"],
        "calf_R": ["ValveBiped.Bip01_R_Calf", "Bip01_R_Calf"],
    }
    mapping = {}
    for source, aliases in expected.items():
        mapping[source] = next((name for name in aliases if name in node_names), None)
    report = {
        "reference_smd": str(args.smd),
        "reference_qc": str(args.qc),
        "smd": {
            "node_count": len(smd["nodes"]),
            "nodes": [{"id": i, **v} for i, v in sorted(smd["nodes"].items())],
            "weighted_bone_ids": smd["weighted_bones"],
            "skeleton_frames": smd["frames"],
        },
        "qc": qc,
        "candidate_bone_mapping": mapping,
        "missing_candidate_bones": [k for k, v in mapping.items() if v is None],
        "checks": {
            "has_modelname": len(qc["modelname"]) == 1,
            "has_body": qc["has_body"],
            "has_sequences": bool(qc["sequences"]),
            "has_attachments": bool(qc["attachments"]),
            "has_hitbox_set": bool(qc["hitbox_sets"]),
            "has_eyeposition": qc["has_eyeposition"],
            "has_illumposition": qc["has_illumposition"],
        },
        "ready_for_retarget_design": all(mapping.values()) and len(qc["modelname"]) == 1 and qc["has_body"],
        "note": "Candidate aliases only. Confirm bind pose, hierarchy, attachment semantics and animation contract before retargeting or compiling.",
    }
    args.json.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"report": str(args.json), "nodes": report["smd"]["node_count"], "mapping": mapping, "checks": report["checks"], "ready_for_retarget_design": report["ready_for_retarget_design"]}, indent=2, ensure_ascii=False))
    return 0 if report["checks"]["has_modelname"] and report["checks"]["has_body"] else 2

if __name__ == "__main__":
    raise SystemExit(main())
