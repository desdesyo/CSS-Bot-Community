#!/usr/bin/env python3
"""Generate original, rigged low-poly CSSBC character source assets (SMD/QC)."""
from pathlib import Path
import argparse
import math
import struct

BONES = [
    (0, "root", -1), (1, "pelvis", 0), (2, "spine", 1), (3, "head", 2),
    (4, "upperarm_L", 2), (5, "forearm_L", 4),
    (6, "upperarm_R", 2), (7, "forearm_R", 6),
    (8, "thigh_L", 1), (9, "calf_L", 8),
    (10, "thigh_R", 1), (11, "calf_R", 10),
]
# 23 regular playable/support characters plus one separately balanced Juggernaut.
# Tuple: model id, faction, clothing material, equipment material, scale, headgear.
ROLES = [
    ("t_raider", "terrorist", "cloth_tan", "gear_olive", 1.00, "head_wrap"),
    ("t_insurgent", "terrorist", "cloth_dark", "gear_tan", 0.97, "balaclava"),
    ("t_saboteur", "terrorist", "cloth_dark", "gear_olive", 0.98, "balaclava"),
    ("t_rifleman", "terrorist", "cloth_tan", "gear_tan", 1.01, "head_wrap"),
    ("t_breacher", "terrorist", "cloth_dark", "gear_steel", 1.03, "heavy_helmet"),
    ("t_scout", "terrorist", "cloth_olive", "gear_tan", 0.94, "hood"),
    ("t_veteran", "terrorist", "cloth_grey", "gear_olive", 1.02, "balaclava"),
    ("t_militia", "terrorist", "cloth_olive", "gear_tan", 0.99, "head_wrap"),
    ("t_operative", "terrorist", "cloth_navy", "gear_black", 0.98, "balaclava"),
    ("t_demolition", "terrorist", "cloth_dark", "gear_red", 1.04, "heavy_helmet"),
    ("ct_assault", "ct", "cloth_navy", "gear_black", 1.02, "helmet"),
    ("ct_recon", "ct", "cloth_olive", "gear_black", 0.96, "helmet"),
    ("ct_pointman", "ct", "cloth_navy", "gear_steel", 1.04, "heavy_helmet"),
    ("ct_engineer", "ct", "cloth_olive", "gear_tan", 1.00, "helmet"),
    ("ct_marksman", "ct", "cloth_grey", "gear_black", 0.98, "hood"),
    ("ct_riot", "ct", "cloth_dark", "gear_steel", 1.06, "heavy_helmet"),
    ("ct_urban", "ct", "cloth_grey", "gear_black", 1.00, "helmet"),
    ("ct_desert", "ct", "cloth_tan", "gear_black", 1.00, "helmet"),
    ("ct_naval", "ct", "cloth_navy", "gear_steel", 0.99, "helmet"),
    ("ct_veteran", "ct", "cloth_olive", "gear_steel", 1.03, "helmet"),
    ("support_medic", "support", "cloth_olive", "gear_red", 1.00, "helmet"),
    ("support_sniper", "support", "cloth_grey", "gear_black", 0.98, "hood"),
    ("support_heavy", "support", "cloth_dark", "gear_steel", 1.10, "heavy_helmet"),
    ("juggernaut", "special", "cloth_dark", "gear_steel", 1.22, "heavy_helmet"),
]
MATERIALS = {
    "cloth_tan": (110, 87, 56), "cloth_dark": (41, 46, 48),
    "cloth_navy": (26, 41, 59), "cloth_olive": (51, 64, 41),
    "cloth_grey": (74, 79, 82), "gear_olive": (48, 59, 33),
    "gear_tan": (97, 79, 51), "gear_black": (20, 23, 26),
    "gear_red": (107, 18, 15), "gear_steel": (64, 71, 77),
    "skin": (133, 94, 69), "boots": (20, 20, 18),
}

def joints(s):
    return {
        0:(0,0,0), 1:(0,0,.92*s), 2:(0,0,1.22*s), 3:(0,0,1.58*s),
        4:(-.29*s,0,1.28*s), 5:(-.31*s,0,.99*s),
        6:(.29*s,0,1.28*s), 7:(.31*s,0,.99*s),
        8:(-.115*s,0,.57*s), 9:(-.115*s,0,.20*s),
        10:(.115*s,0,.57*s), 11:(.115*s,0,.20*s),
    }

def cuboids(s, helmet, role):
    p = [
        ((0,0,.92*s),(.19*s,.12*s,.14*s),1,"gear"),
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
        ((-.115*s,-.025*s,.055*s),(.09*s,.14*s,.055*s),9,"boots"),
        ((.115*s,-.025*s,.055*s),(.09*s,.14*s,.055*s),11,"boots"),
        ((0,-.145*s,1.05*s),(.20*s,.025*s,.055*s),1,"gear"),
        ((0,-.164*s,1.34*s),(.17*s,.025*s,.10*s),2,"gear"),
        ((-.18*s,-.12*s,1.28*s),(.055*s,.035*s,.08*s),2,"gear"),
        ((.18*s,-.12*s,1.28*s),(.055*s,.035*s,.08*s),2,"gear"),
    ]
    if helmet in ("helmet","heavy_helmet"):
        p.append(((0,0,1.68*s),(.14*s,.13*s,.075*s),3,"gear"))
    else:
        p.append(((0,0,1.64*s),(.13*s,.12*s,.09*s),3,"gear"))
    if helmet == "heavy_helmet":
        p.append(((0,-.17*s,1.27*s),(.23*s,.035*s,.25*s),2,"gear"))
    # Role-specific silhouettes and readable support equipment.
    if role == "support_medic":
        p += [
            ((0,.17*s,1.22*s),(.16*s,.09*s,.20*s),2,"gear"),
            ((0,-.193*s,1.35*s),(.055*s,.018*s,.055*s),2,"gear_red"),
            ((-.22*s,-.12*s,1.43*s),(.045*s,.025*s,.07*s),2,"gear_red"),
        ]
    elif role == "support_sniper":
        p += [
            ((0,.17*s,1.18*s),(.18*s,.09*s,.23*s),2,"gear"),
            ((-.20*s,-.10*s,1.46*s),(.09*s,.045*s,.035*s),2,"gear"),
            ((.20*s,-.10*s,1.46*s),(.09*s,.045*s,.035*s),2,"gear"),
        ]
    elif role in ("support_heavy", "juggernaut"):
        p += [
            ((-.22*s,0,1.38*s),(.13*s,.14*s,.12*s),2,"gear"),
            ((.22*s,0,1.38*s),(.13*s,.14*s,.12*s),2,"gear"),
            ((-.115*s,-.11*s,.58*s),(.11*s,.045*s,.09*s),8,"gear"),
            ((.115*s,-.11*s,.58*s),(.11*s,.045*s,.09*s),10,"gear"),
        ]
    elif role == "ct_recon":
        p.append(((.19*s,.15*s,1.28*s),(.08*s,.07*s,.13*s),2,"gear"))
    elif role == "t_insurgent":
        p.append(((0,.15*s,1.10*s),(.13*s,.07*s,.18*s),1,"gear"))
    return p

def triangles(center, half):
    x,y,z=center; a,b,c=half
    v=[(x-a,y-b,z-c),(x+a,y-b,z-c),(x+a,y+b,z-c),(x-a,y+b,z-c),
       (x-a,y-b,z+c),(x+a,y-b,z+c),(x+a,y+b,z+c),(x-a,y+b,z+c)]
    faces=[(0,2,1),(0,3,2),(4,5,6),(4,6,7),(0,1,5),(0,5,4),
           (1,2,6),(1,6,5),(2,3,7),(2,7,6),(3,0,4),(3,4,7)]
    return [(v[i],v[j],v[k]) for i,j,k in faces]

def write_nodes(f):
    f.write("nodes\n")
    for i,n,parent in BONES:
        f.write(f'{i} "{n}" {parent}\n')
    f.write("end\n")

def write_skeleton_frame(f, frame, s, breathing=0.0, walk_phase=None):
    j=joints(s)
    f.write(f"time {frame}\n")
    for i,n,parent in BONES:
        x,y,z=j[i]
        if parent >= 0:
            px,py,pz=j[parent]
            x,y,z=x-px,y-py,z-pz
        # Tiny torso/head movement for a subtle idle loop.
        if i == 2: z += breathing
        if i == 3: z += breathing * .35
        f.write(f"{i} {x:.6f} {y:.6f} {z:.6f} 0 0 0\n")

def normal_of(tri):
    a,b,c=tri
    u=[b[i]-a[i] for i in range(3)]
    v=[c[i]-a[i] for i in range(3)]
    n=(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])
    length=math.sqrt(sum(x*x for x in n)) or 1.0
    return tuple(x/length for x in n)

def write_reference(path, cloth, gear, scale, helmet, role):
    j=joints(scale)
    with path.open("w",encoding="ascii",newline="\n") as f:
        f.write("version 1\n")
        write_nodes(f)
        f.write("skeleton\n")
        write_skeleton_frame(f,0,scale)
        f.write("end\ntriangles\n")
        for center,half,bone,mat in cuboids(scale,helmet,role):
            material=cloth if mat=="cloth" else gear if mat=="gear" else mat
            pivot=j[bone]
            for tri in triangles(center,half):
                nx,ny,nz=normal_of(tri)
                f.write(material+"\n")
                for idx,point in enumerate(tri):
                    x,y,z=(point[k]-pivot[k] for k in range(3))
                    uv=((0,0),(1,0),(1,1))[idx]
                    f.write(f"{bone} {x:.6f} {y:.6f} {z:.6f} {nx:.6f} {ny:.6f} {nz:.6f} {uv[0]} {uv[1]} 1 {bone} 1.0\n")
        f.write("end\n")

def write_idle(path, scale):
    with path.open("w",encoding="ascii",newline="\n") as f:
        f.write("version 1\n")
        write_nodes(f)
        f.write("skeleton\n")
        write_skeleton_frame(f,0,scale,0.0)
        write_skeleton_frame(f,15,scale,0.012*scale)
        write_skeleton_frame(f,30,scale,0.0)
        f.write("end\n")

def write_tga(path, rgb):
    # Small original 32-bit uncompressed TGA swatch; vtex converts it to VTF.
    width=height=16
    header=struct.pack("<BBBHHBHHHHBB",0,0,2,0,0,0,0,0,width,height,32,0x28)
    pixels=bytearray()
    for y in range(height):
        for x in range(width):
            shade=0.92 if ((x//4+y//4)%2) else 1.0
            r,g,b=(max(0,min(255,int(c*shade))) for c in rgb)
            pixels.extend((b,g,r,255))
    path.write_bytes(header+pixels)

def write_walk(path, scale):
    with path.open("w",encoding="ascii",newline="\n") as f:
        f.write("version 1\n")
        write_nodes(f)
        f.write("skeleton\n")
        for frame in range(31):
            write_skeleton_frame(f,frame,scale,0.0,2.0*math.pi*frame/30.0)
        f.write("end\n")

def generate(output):
    output=Path(output)
    output.mkdir(parents=True,exist_ok=True)
    for role,faction,cloth,gear,scale,helmet in ROLES:
        folder=output/role
        folder.mkdir(parents=True,exist_ok=True)
        write_reference(folder/"model.smd",cloth,gear,scale,helmet,role)
        write_idle(folder/"idle.smd",scale)
        write_walk(folder/"walk.smd",scale)
        qc=f'''// Original CSSBC procedural character source.
$modelname "cssbc/player/{role}.mdl"
$body "body" "model.smd"
$cdmaterials "models/cssbc/player"
$surfaceprop "flesh"
$eyeposition 0 0 1.60
$illumposition 0 0 0.9
$sequence "idle" "idle.smd" fps 30 loop
$sequence "walk" "walk.smd" fps 30 loop
'''
        (folder/f"{role}.qc").write_text(qc,encoding="utf-8")
    matdir=output/"materials"/"models"/"cssbc"/"player"
    matdir.mkdir(parents=True,exist_ok=True)
    for name,rgb in MATERIALS.items():
        write_tga(matdir/f"{name}.tga",rgb)
        (matdir/f"{name}.vmt").write_text(
            '"VertexLitGeneric"\n{\n'
            f'  "$basetexture" "models/cssbc/player/{name}"\n'
            f'  "$color" "[{rgb[0]} {rgb[1]} {rgb[2]}]"\n'
            '  "$surfaceprop" "cloth"\n}\n',encoding="utf-8")
    return output

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--output",default=str(Path(__file__).resolve().parent/"generated"))
    args=parser.parse_args()
    result=generate(args.output)
    print(f"Generated {len(ROLES)-1} regular characters + Juggernaut ({len(ROLES)} total): {result}")
