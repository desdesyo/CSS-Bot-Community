#!/usr/bin/env python3
"""Generate the CSSBC 27-character armored operator source pack (SMD/QC/TGA/VMT).

This is an original procedural source-asset generator, not a compiled game pack.
It deliberately uses smooth ellipsoid anatomy and layered gear instead of cuboid
blockout bodies. Compile with the matching CS:S v34 studiomdl/vtex toolchain.
"""
from pathlib import Path
import argparse, math, struct

SOURCE_UNITS_PER_METER = 39.37007874  # Source engine units are inches.\n\nBONES = [
 (0,"root",-1),(1,"pelvis",0),(2,"spine",1),(3,"head",2),
 (4,"upperarm_L",2),(5,"forearm_L",4),(6,"upperarm_R",2),(7,"forearm_R",6),
 (8,"thigh_L",1),(9,"calf_L",8),(10,"thigh_R",1),(11,"calf_R",10),
]
# id, faction, archetype, cloth, armor, headgear, scale
ROLES = [
 ("t_raider","t","rifleman","sand","olive","wrap",1.00),
 ("t_insurgent","t","rifleman","charcoal","tan","balaclava",.99),
 ("t_saboteur","t","scout","black","olive","hood",.98),
 ("t_rifleman","t","rifleman","sand","tan","cap",1.01),
 ("t_breacher","t","breacher","charcoal","steel","heavy",1.04),
 ("t_scout","t","scout","olive","tan","hood",.95),
 ("ct_assault","ct","assault","navy","black","highcut",1.02),
 ("ct_recon","ct","recon","olive","black","highcut",.98),
 ("ct_pointman","ct","breacher","navy","steel","visor",1.04),
 ("ct_engineer","ct","engineer","olive","tan","highcut",1.00),
 ("ct_marksman","ct","marksman","grey","black","hood",.99),
 ("ct_veteran","ct","assault","charcoal","steel","highcut",1.03),
]
# Support groups are faction-specific. A=2 riflemen, B=2 riflemen+sniper,
# C=2 elite low-health/high-firepower operators.
for team, cloth, armor, hat in (("t","olive","tan","wrap"),("ct","navy","black","highcut")):
    ROLES += [
      (f"support_{team}_a1",team,"support_rifle",cloth,armor,hat,1.00),
      (f"support_{team}_a2",team,"support_rifle","charcoal",armor,"visor",1.02),
      (f"support_{team}_b1",team,"support_rifle",cloth,armor,hat,1.00),
      (f"support_{team}_b2",team,"support_rifle","charcoal",armor,"highcut",1.01),
      (f"support_{team}_b_sniper",team,"sniper","grey",armor,"hood",.99),
      (f"support_{team}_c1",team,"elite","charcoal","steel","visor",1.02),
      (f"support_{team}_c2",team,"elite","black","steel","heavy",1.04),
    ]
ROLES.append(("juggernaut","special","juggernaut","black","steel","juggernaut",1.18))

PALETTE = {
 "sand":(104,82,53),"charcoal":(36,39,42),"black":(19,22,25),
 "olive":(55,65,43),"navy":(27,39,55),"grey":(72,77,81),
 "tan":(103,82,55),"steel":(62,70,77),"skin":(105,76,59),
 "rubber":(18,19,20),"webbing":(38,43,39),"lens":(28,55,62),
 "red":(100,20,17),
}
def bones_pos(s):
 return {0:(0,0,0),1:(0,0,.91*s),2:(0,0,1.22*s),3:(0,0,1.59*s),
 4:(-.31*s,0,1.27*s),5:(-.34*s,0,.98*s),6:(.31*s,0,1.27*s),7:(.34*s,0,.98*s),
 8:(-.13*s,0,.57*s),9:(-.13*s,0,.20*s),10:(.13*s,0,.57*s),11:(.13*s,0,.20*s)}
def ellipsoid(c,r,seg=12,rings=8):
 cx,cy,cz=c; rx,ry,rz=r; verts=[]
 for j in range(rings+1):
  lat=-math.pi/2+math.pi*j/rings
  for i in range(seg):
   lon=2*math.pi*i/seg
   verts.append((cx+rx*math.cos(lat)*math.cos(lon),cy+ry*math.cos(lat)*math.sin(lon),cz+rz*math.sin(lat)))
 faces=[]
 for j in range(rings):
  for i in range(seg):
   a=j*seg+i;b=j*seg+(i+1)%seg;d=(j+1)*seg+i;c=(j+1)*seg+(i+1)%seg
   faces.extend(((a,b,c),(a,c,d)))
 return verts,faces
def box(c,r):
 x,y,z=c; a,b,d=r
 v=[(x+sx*a,y+sy*b,z+sz*d) for sx,sy,sz in
    [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
 f=[(0,2,1),(0,3,2),(4,5,6),(4,6,7),(0,1,5),(0,5,4),(1,2,6),(1,6,5),(2,3,7),(2,7,6),(3,0,4),(3,4,7)]
 return v,f
def build_parts(role, faction, archetype, scale, headgear, cloth_mat, armor_mat):
 p=[]
 def add(c,r,b,m,kind="ell"):
  p.append((c,r,b,m,kind))
 # Anatomical base: overlapping smooth forms, tapered limbs and neck.
 add((0,0,.91*scale),(.205,.145,.16),1,"webbing")
 add((0,0,1.22*scale),(.255,.155,.285),2,cloth_mat)
 add((0,0,1.56*scale),(.105,.105,.145),3,"skin")
 for side,bone in [(-1,4),(1,6)]:
  add((side*.30*scale,0,1.27*scale),(.115,.12,.205),bone,cloth_mat)
  add((side*.34*scale,0,1.00*scale),(.082,.09,.19),bone+1,cloth_mat)
  add((side*.35*scale,-.005,.80*scale),(.085,.09,.105),bone+1,"rubber")
 for side,bone in [(-1,8),(1,10)]:
  add((side*.13*scale,0,.57*scale),(.115,.13,.285),bone,cloth_mat)
  add((side*.13*scale,0,.205*scale),(.082,.095,.205),bone+1,cloth_mat)
  add((side*.13*scale,-.035,.055*scale),(.105,.16,.065),bone+1,"rubber")
 # Plate carrier with raised segmented plates, cummerbund and shoulder armor.
 add((0,-.148,1.25*scale),(.205,.035,.205),2,armor_mat,"box")
 add((0,.145,1.25*scale),(.205,.035,.205),2,armor_mat,"box")
 add((0,-.157,1.08*scale),(.19,.035,.055),2,"webbing","box")
 for side in (-1,1):
  add((side*.225,-.025,1.34*scale),(.105,.14,.105),2,armor_mat)
  add((side*.21,-.15,1.18*scale),(.065,.035,.085),2,"webbing","box")
  add((side*.205,-.155,1.04*scale),(.055,.03,.07),2,"webbing","box")
  add((side*.13,-.12,.62*scale),(.075,.045,.105),8 if side<0 else 10,armor_mat,"box")
 # Role-specific head protection.
 if headgear in ("highcut","visor","heavy","juggernaut"):
  add((0,0,1.68*scale),(.145,.135,.095),3,armor_mat)
  add((0,-.105,1.62*scale),(.12,.045,.025),3,"lens","box")
  add((.12,0,1.68*scale),(.035,.05,.04),3,"webbing","box")
 elif headgear=="hood":
  add((0,.015,1.62*scale),(.14,.13,.14),3,cloth_mat)
 elif headgear=="balaclava":
  add((0,0,1.59*scale),(.12,.115,.145),3,cloth_mat)
 elif headgear=="wrap":
  add((0,0,1.68*scale),(.14,.13,.07),3,"webbing")
 else:
  add((0,0,1.68*scale),(.14,.13,.065),3,"webbing")
 # Belt, mag pouches, radio, backpack, hydration and utility.
 for side in (-1,1):
  for z in (1.08,1.18):
   add((side*.115,-.185,z*scale),(.052,.035,.045),2,"webbing","box")
 add((.18,.155,1.29*scale),(.075,.065,.13),2,"webbing","box")
 add((-.18,.16,1.25*scale),(.09,.07,.16),2,armor_mat,"box")
 if archetype in ("breacher","elite","juggernaut"):
  add((0,-.19,1.42*scale),(.20,.04,.075),2,armor_mat,"box")
  for side in (-1,1):
   add((side*.27,0,1.38*scale),(.105,.145,.13),2,armor_mat)
 if archetype=="sniper":
  add((0,.20,1.18*scale),(.16,.09,.23),2,"webbing","box")
  add((-.2,-.1,1.48*scale),(.09,.04,.04),2,"lens")
 if archetype=="engineer":
  add((-.20,.14,1.12*scale),(.07,.06,.17),2,"webbing","box")
 if archetype=="juggernaut":
  # Oversized layered armor and reinforced limbs; retains original intimidating identity.
  add((0,-.19,1.27*scale),(.29,.075,.30),2,armor_mat,"box")
  add((0,.18,1.25*scale),(.29,.09,.31),2,armor_mat,"box")
  for side in (-1,1):
   add((side*.29,0,1.42*scale),(.16,.17,.19),2,armor_mat)
   add((side*.34,-.02,1.0*scale),(.115,.13,.18),7 if side>0 else 5,armor_mat)
   add((side*.14,-.12,.57*scale),(.13,.06,.13),8 if side<0 else 10,armor_mat,"box")
  add((0,-.13,1.72*scale),(.15,.045,.035),3,"lens","box")
 return p
def normal(a,b,c):
 u=[b[i]-a[i] for i in range(3)];v=[c[i]-a[i] for i in range(3)]
 n=(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])
 l=math.sqrt(sum(x*x for x in n)) or 1
 return tuple(x/l for x in n)
def write_smd(path,parts,s):
 jp=bones_pos(s)
 with path.open("w",encoding="ascii",newline="\n") as f:
  f.write("version 1\nnodes\n")
  for i,n,parent in BONES:f.write(f'{i} "{n}" {parent}\n')
  f.write("end\nskeleton\ntime 0\n")
  for i,n,parent in BONES:
   x,y,z=jp[i]
   if parent>=0:
    px,py,pz=jp[parent];x-=px;y-=py;z-=pz
   f.write(f"{i} {x:.6f} {y:.6f} {z:.6f} 0 0 0\n")
  f.write("end\ntriangles\n")
  for center,r,bone,mat,kind in parts:
   verts,faces=ellipsoid(center,r) if kind=="ell" else box(center,r)
   for face in faces:
    tri=[verts[k] for k in face]; nx,ny,nz=normal(*tri);f.write(mat+"\n")
    for k,v in enumerate(tri):
     f.write(f"{bone} {v[0]:.6f} {v[1]:.6f} {v[2]:.6f} {nx:.6f} {ny:.6f} {nz:.6f} {k==1:.1f} {k==2:.1f} 1 {bone} 1.0\n")
def write_anim(path,s,walk=False):
 jp=bones_pos(s)
 with path.open("w",encoding="ascii",newline="\n") as f:
  f.write("version 1\nnodes\n")
  for i,n,parent in BONES:f.write(f'{i} "{n}" {parent}\n')
  f.write("end\nskeleton\n")
  frames=31 if walk else 3
  for frame in range(frames):
   f.write(f"time {frame}\n")
   phase=2*math.pi*frame/30 if walk else 0
   for i,n,parent in BONES:
    x,y,z=jp[i]
    if parent>=0:
     px,py,pz=jp[parent];x-=px;y-=py;z-=pz
    if walk and i in (4,6,5,7,8,9,10,11):
     z += .025*math.sin(phase+(math.pi if i in (4,5,8,9) else 0))*s
    elif not walk and i==2:z+=.008*math.sin(frame*math.pi/15)*s
    f.write(f"{i} {x:.6f} {y:.6f} {z:.6f} 0 0 0\n")
  f.write("end\n")
def write_tga(path,rgb):
 w=h=32;header=struct.pack("<BBBHHBHHHHBB",0,0,2,0,0,0,0,0,w,h,32,0x28);px=bytearray()
 for y in range(h):
  for x in range(w):
   q=.82 if ((x//4+y//4)%2) else 1
   r,g,b=[max(0,min(255,int(c*q))) for c in rgb];px.extend((b,g,r,255))
 path.write_bytes(header+px)
def generate(out):
 out=Path(out);out.mkdir(parents=True,exist_ok=True)
 for rid,fac,arch,cloth,armor,head,scale in ROLES:
  folder=out/rid;folder.mkdir(parents=True,exist_ok=True)
  parts=build_parts(rid,fac,arch,scale,head,cloth,armor)
  write_smd(folder/"model.smd",parts,scale)
  write_anim(folder/"idle.smd",scale);write_anim(folder/"walk.smd",scale,True)
  qc=f'''// CSSBC original armored operator source; complete player animation contract still required.
$modelname "cssbc/player/{rid}.mdl"
$body "body" "model.smd"
$cdmaterials "models/cssbc/player"
$surfaceprop "flesh"
$eyeposition 0 0 1.60
$illumposition 0 0 0.9
$sequence "idle" "idle.smd" fps 30 loop
$sequence "walk" "walk.smd" fps 30 loop
'''
  (folder/f"{rid}.qc").write_text(qc,encoding="utf-8")
 mat=out/"materials"/"models"/"cssbc"/"player";mat.mkdir(parents=True,exist_ok=True)
 for name,rgb in PALETTE.items():
  write_tga(mat/f"{name}.tga",rgb)
  (mat/f"{name}.vmt").write_text('"VertexLitGeneric"\n{\n'+f' "$basetexture" "models/cssbc/player/{name}"\n "$color" "[{rgb[0]} {rgb[1]} {rgb[2]}]"\n "$surfaceprop" "cloth"\n'+'}\n',encoding="utf-8")
 return out
if __name__=="__main__":
 ap=argparse.ArgumentParser();ap.add_argument("--output",default=str(Path(__file__).resolve().parent/"generated"));a=ap.parse_args()
 result=generate(a.output)
 print(f"Generated {len(ROLES)} original Source model source folders: {result}")
