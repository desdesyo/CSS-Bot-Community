# Blender 4.x OBJ cleanup pipeline; run: blender --background --python tools/postprocess_obj.py
import bpy, os
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'))
DIRS=[os.path.join(ROOT,'assets','weapons','models'),os.path.join(ROOT,'assets','characters','models')]
OUT=os.path.join(ROOT,'build','postprocessed'); os.makedirs(OUT,exist_ok=True)
files=[(d,f) for d in DIRS for f in os.listdir(d) if f.endswith('.obj')]
for folder,name in files:
 bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
 bpy.ops.wm.obj_import(filepath=os.path.join(folder,name))
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
 for o in meshes:
  bpy.context.view_layer.objects.active=o; o.select_set(True)
  bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
  bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
  bpy.ops.mesh.delete_loose(); bpy.ops.mesh.normals_make_consistent(inside=False)
  bpy.ops.object.mode_set(mode='OBJECT'); o.select_set(False)
 if meshes:
  bpy.ops.object.select_all(action='DESELECT')
  for o in meshes:o.select_set(True)
  bpy.context.view_layer.objects.active=meshes[0]; bpy.ops.object.join()
  obj=bpy.context.object; obj.name=os.path.splitext(name)[0]
  m=obj.modifiers.new('CSSBC_Triangulate','TRIANGULATE')
  bpy.ops.object.modifier_apply(modifier=m.name)
  bpy.ops.wm.obj_export(filepath=os.path.join(OUT,name),export_selected_objects=True)
print('Cleaned',len(files),'OBJ assets:',OUT)
