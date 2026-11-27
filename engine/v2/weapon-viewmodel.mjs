// First-person weapon viewmodel for SOLO Engine V2 (Babylon.js).
// Procedural, self-contained asset: no external model downloads or texture requests.
export function createWeaponViewmodel(B, scene, camera, mobile = false) {
  const root = new B.TransformNode('solo-fps-viewmodel', scene);
  root.parent = camera;
  root.position.set(.16, -.31, .68);
  // Weapon geometry is authored muzzle-forward along local -Z, matching the Babylon FPS camera.
  root.rotation.set(0, 0, 0);
  root.scaling.setAll(1.0);

  const material = (name, hex, roughness = .7, metallic = 0) => {
    const m = new B.PBRMaterial(name, scene);
    m.albedoColor = B.Color3.FromHexString(hex);
    m.roughness = roughness;
    m.metallic = metallic;
    return m;
  };
  const m = {
    cloth: material('VM olive combat fabric', '#454f43', .96),
    clothDark: material('VM fabric shadow', '#303a32', .98),
    glove: material('VM black tactical glove', '#202522', .91),
    gloveRaised: material('VM glove reinforcement', '#414a43', .78),
    polymer: material('VM rifle polymer', '#202724', .48, .12),
    polymerEdge: material('VM polymer edges', '#343d39', .52, .1),
    metal: material('VM parkerized steel', '#626a66', .3, .78),
    metalDark: material('VM blued steel', '#292f2d', .34, .72),
    rubber: material('VM rubber', '#111614', .94),
    glass: material('VM optic glass', '#315451', .12, .5),
    brass: material('VM brass', '#98733d', .35, .68),
    red: material('VM optic emitter', '#d64b38', .3, .25),
    flash: material('VM muzzle flash', '#ffb64d', .25, .05)
  };

  // Real tiled micro-surfaces: the old viewmodel used flat solid colours only.
  // These repeatable 1K albedo + tangent-space normal maps add cloth weave,
  // polymer grain, fine steel brushing and rubber stipple without external assets.
  const makeSurface=(name,pattern)=>{
    const size=mobile?512:1024;
    const albedo=new B.DynamicTexture(name+' albedo',{width:size,height:size},scene,true);
    const ac=albedo.getContext();ac.fillStyle='#dedede';ac.fillRect(0,0,size,size);
    for(let i=0;i<size*size/34;i++){
      const x=Math.random()*size,y=Math.random()*size,v=155+Math.floor(Math.random()*85);
      ac.fillStyle='rgba('+v+','+v+','+v+','+(.035+Math.random()*.12)+')';
      ac.fillRect(x,y,1+Math.random()*2,1+Math.random()*2);
    }
    if(pattern==='fabric'){
      ac.strokeStyle='rgba(95,95,95,.16)';ac.lineWidth=1;
      for(let i=0;i<size;i+=5){ac.beginPath();ac.moveTo(i,0);ac.lineTo(i,size);ac.stroke();ac.beginPath();ac.moveTo(0,i);ac.lineTo(size,i);ac.stroke();}
    }else if(pattern==='metal'){
      for(let i=0;i<260;i++){const y=Math.random()*size;ac.strokeStyle='rgba(75,75,75,'+(.08+Math.random()*.18)+')';ac.lineWidth=.5+Math.random()*1.2;ac.beginPath();ac.moveTo(Math.random()*size,y);ac.lineTo(Math.random()*size,y+(Math.random()-.5)*2);ac.stroke();}
    }else if(pattern==='polymer'){
      for(let i=0;i<2400;i++){const x=Math.random()*size,y=Math.random()*size;ac.fillStyle='rgba(70,70,70,.16)';ac.fillRect(x,y,2,2);}
    }else{
      for(let y=4;y<size;y+=9)for(let x=4;x<size;x+=9){ac.fillStyle='rgba(80,80,80,.13)';ac.beginPath();ac.arc(x,y,1.7,0,Math.PI*2);ac.fill();}
    }
    albedo.update(false);albedo.wrapU=albedo.wrapV=B.Texture.WRAP_ADDRESSMODE;
    albedo.anisotropicFilteringLevel=Math.min(mobile?8:16,scene.getEngine().getCaps().maxAnisotropy||1);
    const normalSize=mobile?256:512;
    const normal=new B.DynamicTexture(name+' normal',{width:normalSize,height:normalSize},scene,true);
    const nc=normal.getContext();nc.fillStyle='rgb(128,128,255)';nc.fillRect(0,0,normalSize,normalSize);
    const step=pattern==='fabric'?5:pattern==='rubber'?9:pattern==='metal'?18:7;
    nc.strokeStyle='rgb(116,128,249)';nc.lineWidth=1;
    for(let i=0;i<normalSize;i+=step){nc.beginPath();nc.moveTo(i,0);nc.lineTo(i,normalSize);nc.stroke();}
    if(pattern==='fabric'||pattern==='rubber'){
      nc.strokeStyle='rgb(140,128,255)';
      for(let i=0;i<normalSize;i+=step){nc.beginPath();nc.moveTo(0,i);nc.lineTo(normalSize,i);nc.stroke();}
    }
    normal.update(false);normal.wrapU=normal.wrapV=B.Texture.WRAP_ADDRESSMODE;normal.gammaSpace=false;
    normal.anisotropicFilteringLevel=Math.min(mobile?8:16,scene.getEngine().getCaps().maxAnisotropy||1);
    return {albedo,normal};
  };
  const applySurface=(materials,surface,normalLevel)=>{
    for(const material of materials){material.albedoTexture=surface.albedo;material.bumpTexture=surface.normal;material.bumpTexture.level=normalLevel;}
  };
  applySurface([m.cloth,m.clothDark],makeSurface('woven combat fabric','fabric'),.18);
  applySurface([m.glove,m.gloveRaised,m.rubber],makeSurface('tactical polymer rubber','rubber'),.14);
  applySurface([m.polymer,m.polymerEdge],makeSurface('reinforced weapon polymer','polymer'),.12);
  applySurface([m.metal,m.metalDark,m.brass],makeSurface('brushed parkerized steel','metal'),.1);

  const node = (name, parent = root) => {
    const n = new B.TransformNode(name, scene);
    n.parent = parent;
    return n;
  };
  const box = (name, parent, pos, size, mat, bevel = false) => {
    const mesh = B.MeshBuilder.CreateBox(name, { width:size[0], height:size[1], depth:size[2] }, scene);
    mesh.parent = parent;
    mesh.position.set(...pos);
    mesh.material = mat;
    mesh.isPickable = false;
    mesh.alwaysSelectAsActiveMesh = true;
    mesh.renderingGroupId = 1;
    return mesh;
  };
  const sphere = (name, parent, pos, scale, mat, segments = 12) => {
    const mesh = B.MeshBuilder.CreateSphere(name, { diameter:1, segments:Math.max(20,segments) }, scene);
    mesh.parent = parent;
    mesh.position.set(...pos);
    mesh.scaling.set(...scale);
    mesh.material = mat;
    mesh.isPickable = false;
    mesh.alwaysSelectAsActiveMesh = true;
    mesh.renderingGroupId = 1;
    return mesh;
  };
  const cylinder = (name, parent, a, b, rA, rB, mat, sides = 14) => {
    const av = new B.Vector3(...a), bv = new B.Vector3(...b);
    const d = bv.subtract(av);
    const mesh = B.MeshBuilder.CreateCylinder(name, {
      height:d.length(), diameterTop:rA*2, diameterBottom:rB*2, tessellation:sides
    }, scene);
    mesh.parent = parent;
    mesh.position.copyFrom(av.add(bv).scale(.5));
    const dir = d.normalize(), axis = B.Vector3.Cross(B.Axis.Y, dir);
    if (axis.lengthSquared() > 1e-7) {
      axis.normalize();
      mesh.rotationQuaternion = B.Quaternion.RotationAxis(axis, Math.acos(B.Scalar.Clamp(B.Vector3.Dot(B.Axis.Y, dir), -1, 1)));
    } else if (dir.y < 0) mesh.rotation.x = Math.PI;
    mesh.material = mat;
    mesh.isPickable = false;
    mesh.alwaysSelectAsActiveMesh = true;
    mesh.renderingGroupId = 1;
    return mesh;
  };
  const capsule = (name, parent, a, b, radius, mat) => {
    const av = new B.Vector3(...a), bv = new B.Vector3(...b), d = bv.subtract(av);
    const mesh = B.MeshBuilder.CreateCapsule(name, { height:d.length()+radius*2, radius, tessellation:18, subdivisions:2 }, scene);
    mesh.parent = parent;
    mesh.position.copyFrom(av.add(bv).scale(.5));
    const dir = d.normalize(), axis = B.Vector3.Cross(B.Axis.Y, dir);
    if (axis.lengthSquared() > 1e-7) {
      axis.normalize();
      mesh.rotationQuaternion = B.Quaternion.RotationAxis(axis, Math.acos(B.Scalar.Clamp(B.Vector3.Dot(B.Axis.Y, dir), -1, 1)));
    } else if (dir.y < 0) mesh.rotation.x = Math.PI;
    mesh.material = mat;
    mesh.isPickable = false;
    mesh.alwaysSelectAsActiveMesh = true;
    mesh.renderingGroupId = 1;
    return mesh;
  };

  const roundedBox = (name,parent,pos,size,mat,radius=.018) => {
    const [w,h,d]=size, r=Math.min(radius,w*.22,h*.22);
    const core=B.MeshBuilder.CreateBox(name+' core',{width:Math.max(.001,w-2*r),height:Math.max(.001,h-2*r),depth:d},scene);
    core.parent=parent;core.position.set(...pos);core.material=mat;core.isPickable=false;core.alwaysSelectAsActiveMesh=true;core.renderingGroupId=1;
    for(const sx of [-1,1])for(const sy of [-1,1]){
      const x=pos[0]+sx*(w/2-r),y=pos[1]+sy*(h/2-r);
      cylinder(name+' radiused edge',parent,[x,y,pos[2]-d/2],[x,y,pos[2]+d/2],r,r,mat,20);
    }
    return core;
  };

  // Slim segmented first-person arms. Forearms, wrists and hands have independent
  // pivots; the previous single-piece capsules made the sleeves look oversized.
  const arms = node('viewmodel-arms-rig');
  const armPart=(name,parent,a,b,r,mat)=>capsule(name,parent,a,b,r,mat);
  const leftArm = node('left-arm-pivot', arms);
  const rightArm = node('right-arm-pivot', arms);
  leftArm.position.set(-.24,-.20,-.02);
  rightArm.position.set(.26,-.28,.35);
  const leftElbow=node('left-elbow-joint',leftArm);
  leftElbow.position.set(.08,.015,-.035);
  const rightElbow=node('right-elbow-joint',rightArm);
  rightElbow.position.set(-.075,.015,-.035);
  const leftWrist=node('left-wrist-joint',leftElbow);
  leftWrist.position.set(.22,.13,-.23);
  const rightWrist=node('right-wrist-joint',rightElbow);
  rightWrist.position.set(-.20,.13,-.19);
  armPart('left upper sleeve',leftArm,[0,-.17,.20],[.075,.015,-.035],.078,m.cloth);
  sphere('left shoulder seam',leftArm,[.005,-.13,.17],[.15,.13,.15],m.clothDark,20);
  armPart('left forearm sleeve',leftElbow,[0,0,0],[.22,.13,-.23],.054,m.cloth);
  sphere('left elbow pad',leftArm,[.075,.015,-.035],[.125,.105,.12],m.clothDark,20);
  cylinder('left cuff seam',leftElbow,[.19,.11,-.19],[.235,.14,-.25],.054,.05,m.clothDark,20);
  sphere('left palm',leftWrist,[.015,.012,-.015],[.105,.067,.13],m.glove,20);
  sphere('left knuckle armor',leftWrist,[.012,.048,-.025],[.09,.018,.085],m.gloveRaised,18);
  const leftFingers=[];
  for(let i=0;i<4;i++){
    const x=-.045+i*.029;
    leftFingers.push(capsule('left glove finger '+i,leftWrist,[x,.005,-.045],[x+.008,-.018,-.105],.012,m.glove));
  }
  const leftThumb=capsule('left thumb',leftWrist,[-.075,.018,-.005],[-.105,-.005,-.065],.017,m.glove);
  armPart('right upper sleeve',rightArm,[0,-.17,.20],[-.075,.015,-.035],.079,m.cloth);
  sphere('right shoulder seam',rightArm,[-.005,-.13,.17],[.15,.13,.15],m.clothDark,20);
  armPart('right forearm sleeve',rightElbow,[0,0,0],[-.20,.13,-.19],.055,m.cloth);
  sphere('right elbow pad',rightArm,[-.075,.015,-.035],[.125,.105,.12],m.clothDark,20);
  cylinder('right cuff seam',rightElbow,[-.17,.11,-.16],[-.215,.14,-.22],.052,.048,m.clothDark,20);
  sphere('right palm',rightWrist,[-.012,.012,-.012],[.10,.066,.125],m.glove,20);
  sphere('right knuckle armor',rightWrist,[-.012,.047,-.022],[.087,.018,.08],m.gloveRaised,18);
  const rightFingers=[];
  for(let i=0;i<4;i++){
    const x=-.055+i*.029;
    rightFingers.push(capsule('right glove finger '+i,rightWrist,[x,.004,-.04],[x-.006,-.018,-.095],.012,m.glove));
  }
  const rightThumb=capsule('right thumb',rightWrist,[.055,.018,-.005],[.085,-.005,-.06],.017,m.glove);
  // Carbine assembly. The weapon is split into receiver, bolt, magazine and handguard
  // so its moving parts can be animated independently during reload and firing.
  const rifle = node('M4A1-realistic-viewmodel');
  const receiver = node('upper-lower-receiver', rifle);
  roundedBox('upper receiver',receiver,[0,.02,0],[.15,.115,.39],m.polymer,.024);
  // Receiver machining, engraved controls and fasteners catch highlights at close range.
  box('receiver top chamfer',receiver,[0,.083,-.015],[.135,.012,.31],m.polymerEdge);
  box('receiver left bevel',receiver,[-.076,.012,.005],[.008,.072,.29],m.polymerEdge);
  box('receiver right bevel',receiver,[.076,.012,.005],[.008,.072,.29],m.polymerEdge);
  for(const x of [-.079,.079])for(const z of [-.115,-.065,.075,.13]){
    const screw=B.MeshBuilder.CreateCylinder('receiver recessed fastener',{height:.006,diameter:.014,tessellation:20},scene);
    screw.parent=receiver;screw.position.set(x,.018,z);screw.rotation.z=Math.PI/2;screw.material=m.metalDark;screw.isPickable=false;screw.renderingGroupId=1;
    const slot=box('fastener slot',receiver,[x*1.02,.018,z],[.003,.002,.009],m.rubber);
  }
  box('ejection port recess',receiver,[-.079,.025,-.02],[.006,.033,.085],m.rubber);
  box('bolt catch',receiver,[.079,-.035,.045],[.012,.04,.055],m.metal);
  box('magazine release',receiver,[.082,-.075,.075],[.014,.028,.035],m.metal);
  box('trigger guard front',receiver,[.035,-.16,.015],[.018,.012,.12],m.metalDark);
  box('trigger guard rear',receiver,[-.035,-.16,.12],[.018,.012,.12],m.metalDark);
  
  roundedBox('lower receiver',receiver,[0,-.065,.055],[.145,.095,.30],m.polymerEdge,.02);
  box('ejection port',receiver,[-.078,.026,-.02],[.009,.045,.11],m.metalDark);
  box('dust cover',receiver,[-.084,.022,-.02],[.008,.03,.085],m.metal);
  box('charging handle',receiver,[0,.105,.145],[.12,.02,.075],m.metalDark);
  box('trigger guard',receiver,[0,-.145,.085],[.075,.025,.12],m.metalDark);
  cylinder('trigger',receiver,[0,-.145,.04],[0,-.20,.04],.012,.012,m.metal,10);
  box('pistol grip',receiver,[0,-.18,.15],[.095,.23,.13],m.rubber);
  box('grip backstrap',receiver,[0,-.18,.215],[.08,.17,.015],m.polymerEdge);
  for(let i=0;i<5;i++)box('grip texture '+i,receiver,[0,-.12-i*.027,.224],[.075,.008,.006],m.gloveRaised);

  const stock = node('adjustable-stock', rifle);
  stock.position.z=.30;
  box('buffer tube',stock,[0,.02,.02],[.09,.09,.27],m.metalDark);
  roundedBox('six-position stock',stock,[0,.005,.19],[.16,.14,.25],m.polymer,.025);
  box('stock cheek weld',stock,[0,.078,.19],[.145,.035,.20],m.polymerEdge);
  box('rubber buttpad',stock,[0,.005,.325],[.17,.15,.035],m.rubber);
  box('stock sling loop',stock,[0,.09,.06],[.08,.018,.035],m.metalDark);

  const handguard = node('free-float-handguard', rifle);
  handguard.position.z=-.29;
  roundedBox('MLOK handguard core',handguard,[0,.015,0],[.145,.115,.43],m.polymer,.026);
  box('handguard top bevel',handguard,[0,.073,-.01],[.125,.018,.40],m.polymerEdge);
  for(let i=0;i<11;i++){
    const z=-.19+i*.037;
    for(const x of [-.076,.076]){
      const vent=box('handguard recessed vent',handguard,[x,.015,z],[.006,.028,.018],m.rubber);
      vent.rotation.x=.16;
    }
  }
  for(const x of [-.07,.07])for(let i=0;i<4;i++){
    cylinder('handguard QD socket',handguard,[x,.015,-.14+i*.09],[x,.015,-.14+i*.09+.004],.012,.012,m.metalDark,20);
  }
  box('top picatinny rail',handguard,[0,.083,-.015],[.075,.025,.48],m.metalDark);
  box('left accessory rail',handguard,[-.078,.015,0],[.025,.065,.34],m.metalDark);
  box('right accessory rail',handguard,[.078,.015,0],[.025,.065,.34],m.metalDark);
  for(let i=0;i<9;i++){
    const z=-.19+i*.045;
    box('left MLOK slot '+i,handguard,[-.091,.012,z],[.006,.025,.022],m.rubber);
    box('right MLOK slot '+i,handguard,[.091,.012,z],[.006,.025,.022],m.rubber);
    box('top rail tooth '+i,handguard,[0,.101,z],[.083,.012,.018],m.metal);
  }
  const barrel = node('barrel-assembly', rifle);
  cylinder('5.56 barrel',barrel,[0,.018,-.43],[0,.018,-.76],.018,.018,m.metal,18);
  for(let i=0;i<3;i++)cylinder('gas block ring '+i,barrel,[0,.018,-.47-i*.018],[0,.018,-.48-i*.018],.027,.027,m.metalDark,16);
  cylinder('A2 flash hider',barrel,[0,.018,-.75],[0,.018,-.825],.027,.021,m.metalDark,16);
  for(let i=0;i<4;i++)box('flash hider vent '+i,barrel,[0,.018+(i%2-.5)*.022,-.79],[.047,.008,.014],m.rubber);

  const optic = node('red-dot-optic', rifle);
  optic.position.set(0,.145,-.12);
  box('optic mount',optic,[0,-.035,0],[.12,.045,.17],m.metalDark);
  box('optic housing',optic,[0,.025,0],[.105,.105,.13],m.rubber);
  box('optic front lens',optic,[0,.025,-.068],[.075,.073,.008],m.glass);
  box('optic rear lens',optic,[0,.025,.068],[.075,.073,.008],m.glass);
  sphere('red dot emitter',optic,[0,.025,-.055],[.012,.012,.008],m.red,8);
  box('optic brightness dial',optic,[.061,.015,0],[.018,.035,.035],m.metal);
  const frontSight = node('folding-front-sight', rifle);
  frontSight.position.set(0,.12,-.55);
  box('front sight base',frontSight,[0,-.02,0],[.07,.035,.08],m.metalDark);
  box('front sight ears',frontSight,[0,.055,0],[.05,.11,.025],m.metal);
  box('front sight post',frontSight,[0,.11,-.005],[.012,.045,.012],m.metal);
  box('rear backup sight',rifle,[0,.12,.07],[.065,.065,.045],m.metalDark);

  // Moving bolt and magazine; magazine well remains fixed to the receiver.
  const bolt = node('bolt-carrier', rifle);
  bolt.position.set(-.02,.045,-.02);
  box('bolt carrier body',bolt,[0,0,0],[.045,.035,.16],m.metal);
  box('bolt carrier handle',bolt,[-.045,.005,0],[.025,.018,.07],m.metalDark);
  const magPivot = node('drop-free-magazine', rifle);
  magPivot.position.set(0,-.12,.005);
  roundedBox('magazine steel body',magPivot,[0,-.10,0],[.105,.25,.13],m.metalDark,.014);
  box('magazine front rib',magPivot,[0,-.10,-.069],[.087,.20,.008],m.metal);
  box('magazine floorplate',magPivot,[0,-.232,0],[.115,.022,.14],m.polymer);
  for(let i=0;i<5;i++)box('magazine rib '+i,magPivot,[0,-.035-i*.033,.067],[.088,.009,.006],m.metal);
  // Selector, pins, sling mounts, fasteners and tactile controls.
  box('fire selector',receiver,[.08,-.04,.08],[.018,.026,.055],m.metal);
  for(const x of [-.077,.077])for(const z of [-.105,.12]){
    const pin=B.MeshBuilder.CreateCylinder('receiver takedown pin',{height:.012,diameter:.025,tessellation:14},scene);
    pin.parent=receiver;pin.position.set(x,-.008,z);pin.rotation.x=Math.PI/2;pin.material=m.metal;pin.isPickable=false;pin.renderingGroupId=1;
  }
  box('front sling QD',rifle,[0,.06,.39],[.09,.025,.025],m.metalDark);
  box('rear sling QD',rifle,[0,.035,.46],[.07,.018,.025],m.metalDark);

  const muzzleFlash = sphere('rifle-muzzle-flash', rifle, [0,.018,-.84], [.18,.15,.26], m.flash, 8);
  muzzleFlash.isVisible = false;
  // Detailed compact 9mm service pistol: frame, moving slide, controls and magazine.
  const pistol = node('9mm-service-pistol');
  pistol.setEnabled(false);
  const pistolFrame=node('pistol-frame',pistol);
  roundedBox('pistol polymer frame',pistolFrame,[.015,-.075,-.015],[.105,.095,.235],m.polymer,.018);
  box('pistol dustcover rail',pistolFrame,[.015,-.025,-.105],[.075,.025,.12],m.metalDark);
  box('pistol trigger guard',pistolFrame,[.015,-.12,.045],[.07,.018,.085],m.metalDark);
  cylinder('pistol trigger',pistolFrame,[.015,-.115,.01],[.015,-.16,.01],.009,.009,m.metal,8);
  const pistolGrip=node('pistol-textured-grip',pistolFrame);
  roundedBox('pistol grip core',pistolGrip,[.015,-.18,.075],[.09,.19,.115],m.rubber,.018);
  box('pistol grip backstrap',pistolGrip,[.015,-.18,.132],[.075,.16,.012],m.polymerEdge);
  for(let i=0;i<7;i++)box('pistol grip stippling '+i,pistolGrip,[.015,-.115-i*.019,.137],[.067,.007,.006],m.gloveRaised);
  const pistolSlide=node('pistol-reciprocating-slide',pistol);
  roundedBox('pistol steel slide',pistolSlide,[.015,-.005,-.12],[.105,.075,.31],m.metalDark,.017);
  box('pistol slide side flat',pistolSlide,[-.039,-.005,-.12],[.008,.043,.26],m.metal);
  box('pistol extractor',pistolSlide,[-.041,.005,-.015],[.006,.018,.038],m.metal);
  box('pistol chamber indicator',pistolSlide,[.071,-.012,-.01],[.005,.012,.025],m.brass);
  box('pistol rear plate',pistolSlide,[.015,-.005,.041],[.084,.064,.012],m.polymerEdge);
  for(const x of [-.041,.071])for(const z of [-.23,.015]){
    const pin=B.MeshBuilder.CreateCylinder('pistol slide pin',{height:.006,diameter:.012,tessellation:18},scene);
    pin.parent=pistolSlide;pin.position.set(x,-.005,z);pin.rotation.z=Math.PI/2;pin.material=m.metal;pin.isPickable=false;pin.renderingGroupId=1;
  }
  box('pistol slide top flat',pistolSlide,[.015,.035,-.12],[.075,.012,.28],m.metal);
  box('pistol front sight',pistolSlide,[.015,.042,-.255],[.025,.018,.018],m.metal);
  box('pistol rear sight',pistolSlide,[.015,.042,.005],[.055,.025,.018],m.metal);
  for(let i=0;i<6;i++){
    box('pistol slide serration L '+i, pistolSlide,[-.04,.002,-.025+i*.016],[.006,.045,.006],m.metal);
    box('pistol slide serration R '+i,pistolSlide,[.07,.002,-.025+i*.016],[.006,.045,.006],m.metal);
  }
  cylinder('pistol barrel',pistol,[.015,.002,-.13],[.015,.002,-.29],.014,.014,m.metal,14);
  const pistolMag=node('pistol-drop-magazine',pistol);
  pistolMag.position.set(.015,-.14,.085);
  box('pistol magazine body',pistolMag,[0,-.055,0],[.065,.16,.075],m.metalDark);
  box('pistol magazine floorplate',pistolMag,[0,-.14,0],[.078,.018,.085],m.polymerEdge);
  box('pistol mag witness window',pistolMag,[.049,-.045,0],[.004,.055,.028],m.metal);
  box('pistol takedown pin',pistolFrame,[.071,-.075,.005],[.012,.018,.018],m.metal);
  const pistolFlash=sphere('pistol-muzzle-flash',pistol,[.015,.002,-.30],[.10,.09,.16],m.flash,8);
  pistolFlash.isVisible=false;

  // Full-tang tactical knife with guard, textured scales, pommel and faceted point.
  const knife=node('combat-knife');
  knife.setEnabled(false);
  const knifeHandle=node('knife-handle',knife);
  box('knife tang',knifeHandle,[.015,-.12,.075],[.035,.045,.20],m.metalDark);
  roundedBox('knife grip scale left',knifeHandle,[-.012,-.12,.075],[.025,.065,.19],m.rubber,.008);
  roundedBox('knife grip scale right',knifeHandle,[.042,-.12,.075],[.025,.065,.19],m.rubber,.008);
  for(let i=0;i<6;i++)box('knife grip grooves '+i,knifeHandle,[-.027,-.12,.0+i*.029],[.006,.052,.008],m.gloveRaised);
  box('knife pommel',knifeHandle,[.015,-.12,.185],[.06,.075,.025],m.metal);
  box('knife crossguard',knifeHandle,[.015,-.085,-.025],[.13,.025,.035],m.metalDark);
  const blade=node('knife-blade',knife);
  box('knife blade spine',blade,[.015,-.075,-.205],[.055,.025,.34],m.metal);
  box('knife blade fuller',blade,[.015,-.059,-.205],[.012,.004,.245],m.metalDark);
  box('knife ricasso',blade,[.015,-.075,-.045],[.062,.03,.055],m.metalDark);
  for(let i=0;i<5;i++){
    const jimp=box('knife spine jimping',blade,[.015,-.057,-.015+i*.012],[.06,.006,.004],m.metalDark);
    jimp.rotation.z=.04;
  }
  box('knife cutting bevel',blade,[.015,-.092,-.205],[.045,.012,.31],m.metalDark);
  box('knife edge highlight',blade,[.015,-.101,-.205],[.012,.006,.28],m.metal);
  const tip=B.MeshBuilder.CreateCylinder('knife-point',{height:.12,diameterTop:0,diameterBottom:.055,tessellation:4},scene);
  tip.parent=blade;tip.position.set(.015,-.075,-.43);tip.rotation.x=Math.PI/2;tip.material=m.metal;tip.isPickable=false;tip.renderingGroupId=1;

  const initial = { x:.19, y:-.29, z:.76 };
  let recoil = 0, fireT = 0, reloadT = 0, reloadDuration = 1.45, reloadWeapon = null, shotFlash = 0, time = 0, meleeT = 0, switchT = 0;
  let walking = 0, selected = 'rifle', meleeHitPending = false, meleeHitReady = false, sprintT=0, inspectT=0, lastStep=0;
  const clamp01 = v => Math.max(0,Math.min(1,v));
  const smooth = v => {v=clamp01(v);return v*v*(3-2*v)};
  function fire() {
    if (selected === 'knife') {
      if (meleeT > 0) return false;
      // A knife swing is a dedicated melee animation, never a leftover firearm recoil.
      recoil = 0; fireT = 0; shotFlash = 0;
      muzzleFlash.isVisible = false; pistolFlash.isVisible = false;
      meleeT = 1; meleeHitPending = true; meleeHitReady = false;
      return true;
    }
    recoil = Math.min(1.8,recoil + (selected === 'rifle' ? .72 : .58));
    fireT = 1;
    shotFlash = .07;
    bolt.position.z = -.055;
    bolt.position.y = .045;
    muzzleFlash.isVisible = selected === 'rifle';
    pistolFlash.isVisible = selected === 'pistol';
    pistolSlide.position.z = -.035;
    return true;
  }
  function beginReload(duration = 1.45) {
    reloadT = duration;
    reloadDuration = duration;
    reloadWeapon = selected;
    magPivot.setEnabled(true);
    if(selected==='pistol')pistolMag.setEnabled(true);
  }
  function completeReload() {
    reloadT = 0;
    reloadWeapon = null;
    magPivot.position.set(0,-.12,.005);
    magPivot.rotation.set(0,0,0);
    pistolMag.position.set(.015,-.14,.085);
    pistolMag.rotation.set(0,0,0);
    pistolSlide.position.set(0,0,0);
    bolt.position.set(-.02,.045,-.02);
    rightArm.rotation.set(0,0,0);
    leftArm.rotation.set(0,0,0);
  }
  function update(dt, movement = 0) {
    const d=Math.max(0,Math.min(.05,dt||0));
    time+=d;
    const speed=clamp01(Math.abs(movement));
    const sprint=clamp01((Math.abs(movement)-.92)*3.2);
    const moving=speed*(1-sprint*.18);
    recoil=Math.max(0,recoil-d*(selected==='pistol'?8.5:7.2));
    fireT=Math.max(0,fireT-d*10);
    shotFlash=Math.max(0,shotFlash-d);
    if(shotFlash===0){muzzleFlash.isVisible=false;pistolFlash.isVisible=false;}
    const prevMelee=meleeT;
    meleeT=Math.max(0,meleeT-d*4.25);
    if(meleeHitPending&&prevMelee>.66&&meleeT<=.66){meleeHitPending=false;meleeHitReady=true;}
    switchT=Math.max(0,switchT-d*5.2);
    sprintT+=(sprint-sprintT)*Math.min(1,d*9);
    walking+=d*(moving>.04?10+ sprintT*4:1.8);
    const reloadElapsed=reloadT>0?reloadDuration-reloadT:reloadDuration;
    if(reloadT>0)reloadT=Math.max(0,reloadT-d);
    const progress=reloadWeapon&&reloadDuration>0?clamp01(reloadElapsed/reloadDuration):0;
    const r=smooth(progress),reloadActive=reloadWeapon!==null&&progress<1;
    const reloadDip=Math.sin(r*Math.PI);
    const lift=Math.sin(switchT*Math.PI);
    const gait=Math.sin(walking),crossGait=Math.cos(walking*.5);
    const breathing=Math.sin(time*1.35);
    const weaponBob=(.004+moving*.012+sprintT*.009)*gait;
    const sideSway=(.002+moving*.009+sprintT*.012)*crossGait;

    // High-frequency, low-amplitude hand motion gives the weapon weight without
    // the old slow, mechanical single-axis rocking.
    root.position.x=initial.x+sideSway+Math.sin(time*2.1)*.0015;
    root.position.y=initial.y+weaponBob+breathing*.0025-reloadDip*.09-lift*.065-sprintT*.018;
    root.position.z=initial.z-recoil*(selected==='pistol'?.15:.105)-sprintT*.025;
    root.rotation.x=recoil*.055+breathing*.002+weaponBob*.45;
    root.rotation.y=Math.sin(walking*.5)*(.003+moving*.008)+sideSway*.3;
    root.rotation.z=-sideSway*.8-sprintT*.025;

    // Mechanical response: short impulse, overshoot and spring return.
    rifle.rotation.x=selected==='rifle'?recoil*.065+fireT*.012:0;
    rifle.rotation.z=selected==='rifle'?Math.sin(time*23)*recoil*.008:0;
    pistol.rotation.x=selected==='pistol'?recoil*.09+fireT*.018:0;
    pistol.rotation.z=selected==='pistol'?Math.sin(time*27)*recoil*.012:0;
    pistolSlide.position.z=Math.max(-.055,Math.min(0,pistolSlide.position.z+d*.95));
    bolt.position.z=-.02-recoil*.07;
    bolt.position.x=-.02+fireT*.016;

    const magOut=smooth(clamp01(progress/.34)),magIn=smooth(clamp01((progress-.56)/.34));
    if(reloadWeapon==='rifle'){
      magPivot.position.y=-.12-magOut*.19+magIn*.19;
      magPivot.position.z=.005+magOut*.045-magIn*.045;
      magPivot.rotation.x=magOut*.62-magIn*.62;
    }else if(reloadWeapon==='pistol'){
      pistolMag.position.y=-.14-magOut*.16+magIn*.16;
      pistolMag.position.z=.085+magOut*.035-magIn*.035;
      pistolMag.rotation.x=magOut*.42-magIn*.42;
      pistolSlide.position.z=progress>.82?-.035*(1-smooth((progress-.82)/.18)):pistolSlide.position.z;
    }

    // Articulated elbows and wrists: support hand tracks the magazine, trigger
    // hand stays on the grip, and the knife uses a fast diagonal cut/recovery.
    const reloadWave=reloadActive?Math.sin(r*Math.PI):0;
    const slash=Math.sin((1-meleeT)*Math.PI);
    const knifeActive=selected==='knife';
    leftArm.rotation.x=-.025+gait*.018*moving-sprintT*.11+reloadWave*.22+(knifeActive?-.12:0);
    leftArm.rotation.y=-.025+crossGait*.018*moving;
    leftArm.rotation.z=-.035+sideSway*.8;
    rightArm.rotation.x=-.018-gait*.015*moving-sprintT*.09+reloadWave*.12+(knifeActive?-.18*slash:0);
    rightArm.rotation.y=.015-sideSway*.6+(knifeActive?.12*slash:0);
    rightArm.rotation.z=-.025-sprintT*.035+(knifeActive?-.24*slash:0);
    leftElbow.rotation.x=reloadActive?-.85*reloadWave:(knifeActive?.48: -.08+moving*.08);
    leftElbow.rotation.y=reloadActive?.22*reloadWave:(knifeActive?-.30: .04);
    leftWrist.rotation.x=reloadActive?-.45*reloadWave:(knifeActive?-.55*slash: .025+gait*.025*moving);
    leftWrist.rotation.z=reloadActive?.35*reloadWave:(knifeActive?.28*slash:sideSway);
    rightElbow.rotation.x=reloadActive?-.42*reloadWave:(knifeActive?-.8*slash:-.06+moving*.04);
    rightElbow.rotation.y=knifeActive?.18*slash:0;
    rightWrist.rotation.x=knifeActive?-.95*slash:reloadActive?-.3*reloadWave:gait*.018*moving;
    rightWrist.rotation.z=knifeActive?-.32*slash:0;
    for(let i=0;i<4;i++){
      const curl=knifeActive?.18*slash:reloadActive?.12*reloadWave:0;
      leftFingers[i].rotation.x=curl;
      rightFingers[i].rotation.x=knifeActive?-.12*slash:reloadActive?.08*reloadWave:0;
    }
    leftThumb.rotation.x=reloadActive?-.25*reloadWave:knifeActive?-.2*slash:0;
    rightThumb.rotation.x=knifeActive?-.18*slash:0;

    rifle.position.y=selected==='rifle'?lift*.05+weaponBob*.4:0;
    pistol.position.y=selected==='pistol'?lift*.05+weaponBob*.4:0;
    knife.position.y=selected==='knife'?lift*.05+weaponBob*.4:0;
    knife.rotation.x=knifeActive?-.12-slash*.92:0;
    knife.rotation.y=knifeActive?-.08+slash*.2:0;
    knife.rotation.z=knifeActive?-.08-slash*.32:0;
    stock.rotation.x=recoil*.025;

    if(reloadT===0&&reloadWeapon!==null){
      if(reloadWeapon==='rifle'){magPivot.position.set(0,-.12,.005);magPivot.rotation.set(0,0,0);}
      if(reloadWeapon==='pistol'){pistolMag.position.set(.015,-.14,.085);pistolMag.rotation.set(0,0,0);}
    }
  }
  function consumeMeleeHit() { const ready = meleeHitReady; meleeHitReady = false; return ready; }
  function select(slot) {
    selected = slot;
    switchT=1;
    meleeT=0;meleeHitPending=false;meleeHitReady=false;
    rifle.setEnabled(slot === 'rifle');
    pistol.setEnabled(slot === 'pistol');
    knife.setEnabled(slot === 'knife');
    if (slot !== 'rifle') muzzleFlash.isVisible = false;
    if (slot !== 'pistol') pistolFlash.isVisible = false;
    if (slot==='knife') {
      recoil=0;fireT=0;shotFlash=0;
      bolt.position.z=-.02;bolt.position.y=.045;
      pistolSlide.position.z=0;
      muzzleFlash.isVisible=false;pistolFlash.isVisible=false;
      rightArm.rotation.z=-.12;leftArm.rotation.z=.08;
    }
  }
  return { root, rifle, pistol, knife, muzzleFlash, pistolFlash, fire, beginReload, completeReload, update, select, consumeMeleeHit, arms };
}
