# Offline low-poly bevel/LOD prep for blockout meshes (Blender 4.x)
# Run: blender --background --python tools/optimize_meshes.py
import bpy,os
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'))
DIRS=[os.path.join(ROOT,'assets','weapons','models'),os.path.join(ROOT,'assets','characters','models')]
OUT=os.path.join(ROOT,'build','optimized');os.makedirs(OUT,exist_ok=True)
for d in DIRS:
 for fn in os.listdir(d):
  if not fn.endswith('.obj'):continue
  bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
  bpy.ops.wm.obj_import(filepath=os.path.join(d,fn))
  objs=[o for o in bpy.context.scene.objects if o.type=='MESH']
  if not objs:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in objs:o.select_set(True)
  bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join()
  o=bpy.context.object;o.name=os.path.splitext(fn)[0]
  # remove doubles and triangulate; preserve flat hard edges on blockout surfaces
  bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
  bpy.ops.mesh.remove_doubles(threshold=0.0001);bpy.ops.mesh.normals_make_consistent(inside=False)
  bpy.ops.object.mode_set(mode='OBJECT')
  mod=o.modifiers.new('Triangulate','TRIANGULATE');bpy.ops.object.modifier_apply(modifier=mod.name)
  bpy.ops.wm.obj_export(filepath=os.path.join(OUT,fn),export_selected_objects=True)
print('Optimized source meshes:',OUT)
