#!/usr/bin/env python3
"""Generate original low-poly CSSBC player/support models as Source SMD + QC source.

This creates editable, original geometry and a minimal looping idle sequence.
Compile the generated QC files with a compatible Source studiomdl toolchain.
No Valve or third-party assets are included.
"""
from pathlib import Path
import math

OUT = Path(__file__).resolve().parent / "generated"
# Bone IDs and hierarchy must remain identical in reference and animation SMDs.
BONES = [
    (0, "root", -1), (1, "pelvis", 0), (2, "spine", 1), (3, "head", 2),
    (4, "upperarm_L", 2), (5, "forearm_L", 4),
    (6, "upperarm_R", 2), (7, "forearm_R", 6),
    (8, "thigh_L", 1), (9, "calf_L", 8),
    (10, "thigh_R", 1), (11, "calf_R", 10),
]
# role, clothing material, gear material, body build multiplier, helmet
ROLES = [
    ("t_raider", "cloth_tan", "gear_olive", 1.00, "head_wrap"),
    ("t_insurgent", "cloth_dark", "gear_tan", 0.97, "balaclava"),
    ("ct_assault", "cloth_navy", "gear_black", 1.02, "helmet"),
    ("ct_recon", "cloth_olive", "gear_black", 0.96, "helmet"),
    ("support_medic", "cloth_olive", "gear_red", 1.00, "helmet"),
    ("support_sniper", "cloth_grey", "gear_black", 0.98, "hood"),
    ("support_heavy", "cloth_dark", "gear_steel", 1.10, "heavy_helmet"),
]
MATERIALS = {
    "cloth_tan": (0.43, 0.34, 0.22), "cloth_dark": (0.16, 0.18, 0.19),
    "cloth_navy": (0.10, 0.16, 0.23), "cloth_olive": (0.20, 0.25, 0.16),
    "cloth_grey": (0.29, 0.31, 0.32), "gear_olive": (0.19, 0.23, 0.13),
    "gear_tan": (0.38, 0.31, 0.20), "gear_black": (0.08, 0.09, 0.10),
    "gear_red": (0.42, 0.07, 0.06), "gear_steel": (0.25, 0.28, 0.30),
    "skin": (0.52, 0.37, 0.27), "boots": (0.08, 0.08, 0.07), "skin": (0.52, 0.37, 0.27),
}
# Each cuboid is center(x,y,z), half-size(x,y,z), bone, material.
def parts(scale, helmet):
    s = scale
    p = [
        ((0,0,0.92*s),(.19*s,.12*s,.14*s),1,"gear_olive"),
        ((0,0,1.22*s),(.23*s,.13*s,.27*s),2,"cloth"),
        ((0,-.137*s,1.22*s),(.18*s,.025*s,.19*s),2,"gear"),
        ((0,0,1.58*s),(.115*s,.11*s,.13*s),3,"skin"),
        ((-.29*s,0,1.28*s),(.10*s,.10*s,.19*s),4,"cloth"),
        ((-.31*s,0,.99*s),(.075*s,.075*s,.19*s),5,"cloth"),
        ((.29*s,0,1.28*s),(.10*s,.10*s,.19*s),6,"cloth"),
        ((.31*s,0,.99*s),(.075*s,.075*s,.19*s),7,"cloth"),
        ((-.115*s,0,.57*s),(.105*s,.11*s,.27*s),8,"cloth"),
        ((-.115*s,0,.20*s),(.075*s,.08*s,.20*s),9,"cloth"),
        ((.115*s,0,.57*s),(.105*s,.11*s,.27*s),10,"cloth"),
        ((.115*s,0,.20*s),(.075*s,.08*s,.20*s),11,"cloth"),
    ]
    # boots, belt, chest rig, shoulder/armour details
    p += [
        ((-.115*s,-.025*s,.055*s),(.09*s,.14*s,.055*s),9,"boots"),
        ((.115*s,-.025*s,.055*s),(.09*s,.14*s,.055*s),11,"boots"),
        ((0,-.145*s,1.05*s),(.20*s,.025*s,.055*s),1,"gear"),
        ((0,-.164*s,1.34*s),(.17*s,.025*s,.10*s),2,"gear"),
        ((-.18*s,-.12*s,1.28*s),(.055*s,.035*s,.08*s),2,"gear"),
        ((.18*s,-.12*s,1.28*s),(.055*s,.035*s,.08*s),2,"gear"),
    ]
    if helmet in ("helmet","heavy_helmet"):
        p.append(((0,0,1.68*s),(.14*s,.13*s,.075*s),3,"gear"))
    elif helmet in ("head_wrap","balaclava","hood"):
        p.append(((0,0,1.64*s),(.13*s,.12*s,.09*s),3,"gear"))
    if helmet == "heavy_helmet":
        p += [((0,-.17*s,1.27*s),(.23*s,.035*s,.25*s),2,"gear")]
    return p

def cube_triangles(center, half):
    x,y,z=center; a,b,c=half
    v=[(x-a,y-b,z-c),(x+a,y-b,z-c),(x+a,y+b,z-c),(x-a,y+b,z-c),
       (x-a,y-b,z+c),(x+a,y-b,z+c),(x+a,y+b,z+c),(x-a,y+b,z+c)]
    faces=[(0,2,1),(0,3,2),(4,5,6),(4,6,7),(0,1,5),(0,5,4),
           (1,2,6),(1,6,5),(2,3,7),(2,7,6),(3,0,4),(3,4,7)]
    return [(v[i],v[j],v[k]) for i,j,k in faces]

def write_skeleton(f):
    f.write("nodes\n")
    for i,n,parent in BONES: f.write(f'{i} "{n}" {parent}\n')
    f.write("end\n")

def write_model(path, role, cloth, gear, scale, helmet, animation=False):
    with path.open("w", encoding="ascii", newline="\n") as f:
        f.write("version 1\n")
        write_skeleton(f)
        f.write("skeleton\n time 0\n")
        for i,n,parent in BONES:
            # Reference pose; all bones are in a stable neutral bind position.
            f.write(f"{i} 0 0 0 0 0 0\n")
        f.write("end\n")
        if animation:
            return
        f.write("triangles\n")
        for center, half, bone, material in parts(scale, helmet):
            mat = cloth if material=="cloth" else gear if material=="gear" else material
            for tri in cube_triangles(center, half):
                f.write(mat + "\n")
                for v in tri:
                    x,y,z=v
                    # Source SMD vertex: parent, position, normal, UV, link count.
                    f.write(f"{bone} {x:.5f} {y:.5f} {z:.5f} 0 0 1 0.0 0.0 1 {bone} 1.0\n")
        f.write("end\n")

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for role, cloth, gear, scale, helmet in ROLES:
        folder=OUT/role
        folder.mkdir(parents=True, exist_ok=True)
        write_model(folder/"model.smd", role, cloth, gear, scale, helmet)
        write_model(folder/"idle.smd", role, cloth, gear, scale, helmet, True)
        qc=f'''// Original CSSBC generated character source. Compile with studiomdl.
$modelname "cssbc/player/{role}.mdl"
$body "body" "model.smd"
$cdmaterials "models/cssbc/player"
$surfaceprop "flesh"
$eyeposition 0 0 1.60
$illumposition 0 0 0.9
$sequence "idle" "idle.smd" fps 30 loop
'''
        (folder/"{0}.qc".format(role)).write_text(qc,encoding="utf-8")
    # Material templates: replace $basetexture with authored VTFs before release.
    for name,rgb in MATERIALS.items():
        (OUT/f"{name}.vmt").write_text(
            '"VertexLitGeneric"\\n{\\n  "$basetexture" "models/cssbc/player/'+name+
            '"\\n  "$color" "[%d %d %d]"\\n  "$surfaceprop" "cloth"\\n}\\n' %
            tuple(round(c*255) for c in rgb), encoding="utf-8")
    print(f"Generated {len(ROLES)} original SMD/QC character sources in {OUT}")

if __name__ == "__main__":
    main()
