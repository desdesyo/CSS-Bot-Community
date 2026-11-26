#!/usr/bin/env python3
"""Build CSSBC models on a full ValveBiped reference skeleton.

The skeleton reference is vendored from robotboy655/gmod-animations (see
ATTRIBUTION.md). Geometry remains original CSSBC procedural work. This is a
Source-compatible ValveBiped baseline; the target CS:S v34 studiomdl/HLMV
runtime still has to be used for final verification.
"""
from __future__ import annotations
import argparse
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DEFAULT_REFERENCE = ROOT / "reference" / "valvebiped_reference.smd"

# Original procedural bones -> stable ValveBiped bones.
MAP_NAMES = {
    0: "ValveBiped.Bip01_Pelvis",
    1: "ValveBiped.Bip01_Pelvis",
    2: "ValveBiped.Bip01_Spine2",
    3: "ValveBiped.Bip01_Head1",
    4: "ValveBiped.Bip01_L_UpperArm",
    5: "ValveBiped.Bip01_L_Forearm",
    6: "ValveBiped.Bip01_R_UpperArm",
    7: "ValveBiped.Bip01_R_Forearm",
    8: "ValveBiped.Bip01_L_Thigh",
    9: "ValveBiped.Bip01_L_Calf",
    10: "ValveBiped.Bip01_R_Thigh",
    11: "ValveBiped.Bip01_R_Calf",
}

def sections(text: str):
    lines = text.splitlines()
    def get(name):
        start = next(i for i, x in enumerate(lines) if x.strip() == name)
        end = next(i for i in range(start + 1, len(lines)) if lines[i].strip() == "end")
        return lines[start + 1:end]
    return lines, get("nodes"), get("skeleton")

def parse_nodes(lines):
    out = {}
    for line in lines:
        m = re.match(r'\s*(\d+)\s+"([^"]+)"\s+(-?\d+)\s*$', line)
        if m:
            out[m.group(2)] = int(m.group(1))
    return out

def remap_mesh(path: Path, ref_nodes, ref_node_lines, ref_skeleton_lines):
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    mapping = {}
    for old_id, name in MAP_NAMES.items():
        if name not in ref_nodes:
            raise ValueError(f"Reference skeleton missing required bone: {name}")
        mapping[old_id] = ref_nodes[name]
    tri_start = next(i for i, x in enumerate(lines) if x.strip() == "triangles")
    tri_end = next(i for i in range(tri_start + 1, len(lines)) if lines[i].strip() == "end")
    out = lines[:]
    out[1:next(i for i,x in enumerate(out) if x.strip()=="end")+1] = ["nodes", *ref_node_lines, "end"]
    # Re-find triangles after replacing the node section.
    tri_start = next(i for i, x in enumerate(out) if x.strip() == "triangles")
    tri_end = next(i for i in range(tri_start + 1, len(out)) if out[i].strip() == "end")
    out[tri_start+1:tri_end] = [
        remap_vertex_line(line, mapping) if is_vertex_line(line) else line
        for line in out[tri_start+1:tri_end]
    ]
    # Replace the original small skeleton with the complete reference bind pose.
    sk_start = next(i for i, x in enumerate(out) if x.strip() == "skeleton")
    sk_end = next(i for i in range(sk_start + 1, len(out)) if out[i].strip() == "end")
    out[sk_start:sk_end+1] = ["skeleton", "time 0", *ref_skeleton_lines, "end"]
    path.write_text("\n".join(out) + "\n", encoding="ascii")

def is_vertex_line(line):
    p = line.split()
    if len(p) < 10:
        return False
    try:
        int(p[0]); [float(x) for x in p[1:9]]; int(p[9])
        return True
    except ValueError:
        return False

def remap_vertex_line(line, mapping):
    p = line.split()
    count = int(p[9])
    if len(p) != 10 + count * 2:
        raise ValueError(f"Malformed SMD vertex weight record: {line[:100]}")
    old = int(p[0])
    p[0] = str(mapping[old])
    for i in range(count):
        idx = 10 + i * 2
        old_weight_bone = int(p[idx])
        if old_weight_bone not in mapping:
            raise ValueError(f"Unmapped source bone {old_weight_bone}")
        p[idx] = str(mapping[old_weight_bone])
    return " ".join(p)

def write_animation(path, node_lines, skeleton_lines, node_ids, mode):
    parsed = []
    for line in skeleton_lines:
        p = line.split()
        if len(p) == 7:
            parsed.append([int(p[0]), *[float(x) for x in p[1:]]])
    if not parsed:
        raise ValueError("Reference SMD has no bind-pose skeleton rows")
    frames = 31 if mode == "walk" else 2
    with path.open("w", encoding="ascii", newline="\n") as f:
        f.write("version 1\nnodes\n" + "\n".join(node_lines) + "\nend\nskeleton\n")
        for frame in range(frames):
            f.write(f"time {frame}\n")
            phase = 2.0 * math.pi * frame / 30.0
            for row in parsed:
                bone_id = row[0]
                values = row[1:].copy()
                if mode == "walk":
                    name = next((n for n, i in node_ids.items() if i == bone_id), "")
                    swing = math.sin(phase)
                    if name.endswith("_L_UpperArm"): values[5] += 0.42 * swing
                    elif name.endswith("_R_UpperArm"): values[5] -= 0.42 * swing
                    elif name.endswith("_L_Forearm"): values[5] += 0.12 * swing
                    elif name.endswith("_R_Forearm"): values[5] -= 0.12 * swing
                    elif name.endswith("_L_Thigh"): values[5] -= 0.34 * swing
                    elif name.endswith("_R_Thigh"): values[5] += 0.34 * swing
                    elif name.endswith("_L_Calf"): values[5] += 0.16 * max(0.0, swing)
                    elif name.endswith("_R_Calf"): values[5] += 0.16 * max(0.0, -swing)
                f.write(str(bone_id) + " " + " ".join(f"{v:.6f}" for v in values) + "\n")
        f.write("end\n")

def qc_text(role):
    # CS:S hitgroups: head=1, chest=2, stomach=3, arms=4/5, legs=6/7.
    hitboxes = [
        '$hbox 1 "ValveBiped.Bip01_Head1" -3 -4 -4 3 4 5',
        '$hbox 2 "ValveBiped.Bip01_Spine2" -8 -5 -7 8 5 8',
        '$hbox 3 "ValveBiped.Bip01_Pelvis" -7 -5 -6 7 5 6',
        '$hbox 4 "ValveBiped.Bip01_L_UpperArm" -3 -4 -4 3 4 5',
        '$hbox 4 "ValveBiped.Bip01_L_Forearm" -2.5 -3 -3 2.5 3 4',
        '$hbox 5 "ValveBiped.Bip01_R_UpperArm" -3 -4 -4 3 4 5',
        '$hbox 5 "ValveBiped.Bip01_R_Forearm" -2.5 -3 -3 2.5 3 4',
        '$hbox 6 "ValveBiped.Bip01_L_Thigh" -3.5 -4 -4 3.5 4 5',
        '$hbox 6 "ValveBiped.Bip01_L_Calf" -2.5 -3 -3 2.5 3 4',
        '$hbox 7 "ValveBiped.Bip01_R_Thigh" -3.5 -4 -4 3.5 4 5',
        '$hbox 7 "ValveBiped.Bip01_R_Calf" -2.5 -3 -3 2.5 3 4',
    ]
    return f'''// CSSBC ValveBiped player baseline. Generated by build_valvebiped_pack.py.
$modelname "cssbc/player/{role}.mdl"
$body "body" "model.smd"
$cdmaterials "models/cssbc/player"
$surfaceprop "flesh"
$eyeposition 0 0 68
$illumposition 0 0 36

$attachment "eyes" "ValveBiped.Bip01_Head1" 4.5 -5 0 rotate 0 -90 -90
$attachment "anim_attachment_RH" "ValveBiped.Bip01_R_Hand" 0 0 0 rotate 0 0 0
$attachment "anim_attachment_LH" "ValveBiped.Bip01_L_Hand" 0 0 0 rotate 0 0 0
$attachment "weapon_bone" "ValveBiped.Bip01_R_Hand" 0 0 0 rotate 0 0 0
$attachment "weapon_bone_Clip" "ValveBiped.Bip01_R_Hand" 0 0 0 rotate 0 0 0
$attachment "lefthand" "ValveBiped.Bip01_L_Hand" 0 0 0 rotate 0 0 0

$hboxset "default"
{chr(10).join(hitboxes)}

$sequence "idle" "idle.smd" fps 30 loop ACT_IDLE 1
$sequence "idle_all_01" "idle.smd" fps 30 loop
$sequence "walk" "walk.smd" fps 30 loop ACT_WALK 1
$sequence "walk_all" "walk.smd" fps 30 loop
$sequence "run" "walk.smd" fps 36 loop ACT_RUN 1
$sequence "run_all" "walk.smd" fps 36 loop
$sequence "crouch_idle" "idle.smd" fps 30 loop ACT_CROUCHIDLE 1
$sequence "crouch_walk" "walk.smd" fps 24 loop ACT_WALK_CROUCH 1
$sequence "jump" "walk.smd" fps 30
'''

def build(pack: Path, reference: Path):
    ref_text = reference.read_text(encoding="utf-8-sig")
    _, ref_nodes_lines, raw_ref_skel_lines = sections(ref_text)
    ref_skel_lines = [line for line in raw_ref_skel_lines if not line.strip().startswith("time ")]
    ref_nodes = parse_nodes(ref_nodes_lines)
    if len(ref_nodes) < 50:
        raise ValueError(f"Reference skeleton unexpectedly small: {len(ref_nodes)} bones")
    for old, name in MAP_NAMES.items():
        if name not in ref_nodes:
            raise ValueError(f"Missing mapped ValveBiped bone: {name}")
    for folder in sorted(p for p in pack.iterdir() if p.is_dir() and (p / "model.smd").exists()):
        remap_mesh(folder / "model.smd", ref_nodes, ref_nodes_lines, ref_skel_lines)
        write_animation(folder / "idle.smd", ref_nodes_lines, ref_skel_lines, ref_nodes, "idle")
        write_animation(folder / "walk.smd", ref_nodes_lines, ref_skel_lines, ref_nodes, "walk")
        (folder / f"{folder.name}.qc").write_text(qc_text(folder.name), encoding="utf-8")
    return len([p for p in pack.iterdir() if p.is_dir() and (p / "model.smd").exists()])

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pack", type=Path, required=True)
    ap.add_argument("--reference", type=Path, default=DEFAULT_REFERENCE)
    args = ap.parse_args()
    count = build(args.pack, args.reference)
    print(f"Retargeted {count} models to ValveBiped ({len(parse_nodes(sections(args.reference.read_text(encoding='utf-8-sig'))[1]))} bones each).")

if __name__ == "__main__":
    main()
