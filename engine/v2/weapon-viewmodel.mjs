// First-person weapon viewmodel for SOLO Engine V2 (Babylon.js).
// Procedural, self-contained asset: no external model downloads or texture requests.
export function createWeaponViewmodel(B, scene, camera, mobile = false) {
  const root = new B.TransformNode('solo-fps-viewmodel', scene);
  root.parent = camera;
  root.position.set(.18, -.27, .72);
  root.rotation.set(0, Math.PI, 0);
  root.scaling.setAll(1.12);

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
    const mesh = B.MeshBuilder.CreateSphere(name, { diameter:1, segments }, scene);
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
    const mesh = B.MeshBuilder.CreateCapsule(name, { height:d.length()+radius*2, radius, tessellation:12, subdivisions:2 }, scene);
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

  // Arm rig: separate shoulder pivots let recoil, breathing and reload move the hands together.
  const arms = node('viewmodel-arms-rig');
  const leftArm = node('left-arm-pivot', arms);
  const rightArm = node('right-arm-pivot', arms);
  leftArm.position.set(-.48, -.34, .15);
  rightArm.position.set(.34, -.34, .38);
  const armPart = (name, parent, a, b, r, mat) => capsule(name, parent, a, b, r, mat);
  armPart('left upper sleeve', leftArm, [0,-.22,.27], [.10,.03,-.02], .105, m.cloth);
  armPart('left forearm sleeve', leftArm, [.10,.03,-.02], [.30,.18,-.36], .073, m.cloth);
  sphere('left elbow pad', leftArm, [.10,.03,-.02], [.19,.16,.16], m.clothDark);
  cylinder('left cuff seam', leftArm, [.30,.18,-.34], [.32,.20,-.40], .072,.068,m.clothDark);
  sphere('left palm', leftArm, [.33,.205,-.45], [.16,.10,.18], m.glove);
  sphere('left knuckle armor', leftArm, [.33,.255,-.45], [.13,.035,.12], m.gloveRaised);
  for (let i=0;i<4;i++) {
    const x=.275+i*.035;
    capsule('left glove finger '+i,leftArm,[x,.18,-.49],[x+.015,.14,-.59],.018,m.glove);
  }
  capsule('left thumb',leftArm,[.25,.24,-.43],[.20,.20,-.51],.024,m.glove);
  armPart('right upper sleeve', rightArm, [0,-.22,.28], [-.10,.02,.02], .108, m.cloth);
  armPart('right forearm sleeve', rightArm, [-.10,.02,.02], [-.29,.17,-.20], .076, m.cloth);
  sphere('right elbow pad', rightArm, [-.10,.02,.02], [.18,.16,.16], m.clothDark);
  cylinder('right cuff seam',rightArm,[-.28,.16,-.18],[-.32,.18,-.25],.071,.067,m.clothDark);
  sphere('right palm',rightArm,[-.34,.19,-.29],[.15,.105,.17],m.glove);
  sphere('right knuckle armor',rightArm,[-.34,.245,-.29],[.13,.035,.12],m.gloveRaised);
  for(let i=0;i<4;i++){
    const x=-.39+i*.032;
    capsule('right glove finger '+i,rightArm,[x,.18,-.32],[x-.01,.15,-.41],.018,m.glove);
  }
  capsule('right thumb',rightArm,[-.27,.23,-.27],[-.22,.19,-.34],.024,m.glove);

  // Carbine assembly. The weapon is split into receiver, bolt, magazine and handguard
  // so its moving parts can be animated independently during reload and firing.
  const rifle = node('M4A1-realistic-viewmodel');
  const receiver = node('upper-lower-receiver', rifle);
  box('upper receiver',receiver,[0,.02,0],[.15,.115,.39],m.polymer);
  box('lower receiver',receiver,[0,-.065,.055],[.145,.095,.30],m.polymerEdge);
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
  box('six-position stock',stock,[0,.005,.19],[.16,.14,.25],m.polymer);
  box('stock cheek weld',stock,[0,.078,.19],[.145,.035,.20],m.polymerEdge);
  box('rubber buttpad',stock,[0,.005,.325],[.17,.15,.035],m.rubber);
  box('stock sling loop',stock,[0,.09,.06],[.08,.018,.035],m.metalDark);

  const handguard = node('free-float-handguard', rifle);
  handguard.position.z=-.29;
  box('MLOK handguard core',handguard,[0,.015,0],[.145,.115,.43],m.polymer);
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
  box('magazine steel body',magPivot,[0,-.10,0],[.105,.25,.13],m.metalDark);
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
  box('pistol polymer frame',pistolFrame,[.015,-.075,-.015],[.105,.095,.235],m.polymer);
  box('pistol dustcover rail',pistolFrame,[.015,-.025,-.105],[.075,.025,.12],m.metalDark);
  box('pistol trigger guard',pistolFrame,[.015,-.12,.045],[.07,.018,.085],m.metalDark);
  cylinder('pistol trigger',pistolFrame,[.015,-.115,.01],[.015,-.16,.01],.009,.009,m.metal,8);
  const pistolGrip=node('pistol-textured-grip',pistolFrame);
  box('pistol grip core',pistolGrip,[.015,-.18,.075],[.09,.19,.115],m.rubber);
  box('pistol grip backstrap',pistolGrip,[.015,-.18,.132],[.075,.16,.012],m.polymerEdge);
  for(let i=0;i<7;i++)box('pistol grip stippling '+i,pistolGrip,[.015,-.115-i*.019,.137],[.067,.007,.006],m.gloveRaised);
  const pistolSlide=node('pistol-reciprocating-slide',pistol);
  box('pistol steel slide',pistolSlide,[.015,-.005,-.12],[.105,.075,.31],m.metalDark);
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
  box('knife grip scale left',knifeHandle,[-.012,-.12,.075],[.025,.065,.19],m.rubber);
  box('knife grip scale right',knifeHandle,[.042,-.12,.075],[.025,.065,.19],m.rubber);
  for(let i=0;i<6;i++)box('knife grip grooves '+i,knifeHandle,[-.027,-.12,.0+i*.029],[.006,.052,.008],m.gloveRaised);
  box('knife pommel',knifeHandle,[.015,-.12,.185],[.06,.075,.025],m.metal);
  box('knife crossguard',knifeHandle,[.015,-.085,-.025],[.13,.025,.035],m.metalDark);
  const blade=node('knife-blade',knife);
  box('knife blade spine',blade,[.015,-.075,-.205],[.055,.025,.34],m.metal);
  box('knife cutting bevel',blade,[.015,-.092,-.205],[.045,.012,.31],m.metalDark);
  box('knife edge highlight',blade,[.015,-.101,-.205],[.012,.006,.28],m.metal);
  const tip=B.MeshBuilder.CreateCylinder('knife-point',{height:.12,diameterTop:0,diameterBottom:.055,tessellation:4},scene);
  tip.parent=blade;tip.position.set(.015,-.075,-.43);tip.rotation.x=Math.PI/2;tip.material=m.metal;tip.isPickable=false;tip.renderingGroupId=1;

  const initial = { x:.18, y:-.27, z:.72 };
  let recoil = 0, fireT = 0, reloadT = 0, reloadDuration = 1.45, reloadWeapon = null, shotFlash = 0, time = 0, meleeT = 0, switchT = 0;
  let walking = 0, selected = 'rifle', meleeHitPending = false, meleeHitReady = false;
  const clamp01 = v => Math.max(0,Math.min(1,v));
  const smooth = v => {v=clamp01(v);return v*v*(3-2*v)};
  function fire() {
    if (selected === 'knife') { if (meleeT > 0) return false; meleeT = 1; meleeHitPending = true; meleeHitReady = false; return true; }
    recoil = Math.min(1.8,recoil + (selected === 'rifle' ? .72 : .58));
    fireT = 1;
    shotFlash = .07;
    bolt.position.z = -.055;
    bolt.position.y = .045;
    muzzleFlash.isVisible = selected === 'rifle';
    pistolFlash.isVisible = selected === 'pistol';
    pistolSlide.position.z = -.035;
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
    const d = Math.max(0,Math.min(.05,dt || 0));
    time += d;
    recoil = Math.max(0,recoil - d*5.8);
    fireT = Math.max(0,fireT-d*9);
    shotFlash = Math.max(0,shotFlash-d);
    if (shotFlash === 0) { muzzleFlash.isVisible = false; pistolFlash.isVisible=false; }
    const previousMelee = meleeT;
    meleeT = Math.max(0,meleeT-d*3.2);
    if (meleeHitPending && previousMelee > .62 && meleeT <= .62) { meleeHitPending = false; meleeHitReady = true; }
    switchT = Math.max(0,switchT-d*4.5);

    const moving = clamp01(Math.abs(movement));
    walking += d*(moving > .05 ? 9 : 2.2);
    const reloadElapsed = reloadT > 0 ? reloadDuration-reloadT : 0;
    if (reloadT > 0) reloadT = Math.max(0,reloadT-d);
    const progress = reloadWeapon && reloadDuration > 0 ? clamp01(reloadElapsed/reloadDuration) : 0;
    const r = smooth(progress);
    const reloadActive = reloadT > 0 || (reloadWeapon !== null && progress < 1);
    const reloadDip = Math.sin(r*Math.PI);
    const lift = Math.sin(switchT*Math.PI);

    // Camera-relative idle/breathing and movement sway. Engine movement may add its own
    // small displacement; this layer remains additive and is reset every frame.
    const bob = Math.sin(walking)*.008*moving;
    root.position.x = initial.x + Math.sin(walking*.5)*.004*moving;
    root.position.y = initial.y + bob - reloadDip*.075 + recoil*.012 - lift*.045;
    root.position.z = initial.z - recoil*.12;
    root.rotation.x = recoil*.035 + Math.sin(time*1.7)*.003;
    root.rotation.z = Math.sin(walking*.5)*.006*moving;

    // Distinct firing response for each weapon, with spring return to the rest pose.
    rifle.rotation.x = selected==='rifle' ? recoil*.045 + fireT*.018 : 0;
    pistol.rotation.x = selected==='pistol' ? recoil*.055 + fireT*.025 : 0;
    pistolSlide.position.z = Math.min(0,pistolSlide.position.z+d*.72);
    pistolSlide.position.z = Math.max(-.045,pistolSlide.position.z);
    bolt.position.z = -.02 - recoil*.055;
    bolt.position.x = -.02 + fireT*.012;

    // Magazines follow a three-stage removal / insertion arc rather than scaling or
    // teleporting. reloadWeapon is captured at reload start, so switching slots is safe.
    const magOut = smooth(clamp01(progress/.38));
    const magIn = smooth(clamp01((progress-.58)/.34));
    if (reloadWeapon === 'rifle') {
      magPivot.position.y = -.12 - magOut*.17 + magIn*.17;
      magPivot.position.z = .005 + magOut*.035 - magIn*.035;
      magPivot.rotation.x = magOut*.48 - magIn*.48;
    } else {
      pistolMag.position.y = -.14 - magOut*.15 + magIn*.15;
      pistolMag.position.z = .085 + magOut*.025 - magIn*.025;
      pistolMag.rotation.x = magOut*.35 - magIn*.35;
      pistolSlide.position.z = progress > .82 ? -.025*(1-smooth((progress-.82)/.18)) : pistolSlide.position.z;
    }

    // Weapon-specific hand poses: support hand reaches the magazine; knife hand drives
    // the slash and recovers naturally. No pose accumulates between frames.
    const reloadPose = reloadActive ? reloadDip : 0;
    rightArm.rotation.x = selected==='knife' ? -Math.sin(meleeT*Math.PI)*.72 : reloadPose*(selected==='pistol'?.82:.58);
    rightArm.rotation.y = selected==='knife' ? Math.sin(meleeT*Math.PI)*.10 : 0;
    rightArm.rotation.z = selected==='knife' ? -.20 : -reloadPose*.24;
    leftArm.rotation.x = selected==='knife' ? .16 : reloadPose*.20;
    leftArm.rotation.y = selected==='knife' ? -.08 : 0;
    leftArm.rotation.z = selected==='knife' ? .12 : reloadPose*.10;
    rifle.position.y = selected==='rifle' ? lift*.045 : 0;
    pistol.position.y = selected==='pistol' ? lift*.045 : 0;
    knife.position.y = selected==='knife' ? lift*.045 : 0;
    knife.rotation.x = selected==='knife' ? -Math.sin(meleeT*Math.PI)*.95 : 0;
    knife.rotation.y = selected==='knife' ? Math.sin(meleeT*Math.PI)*.12 : 0;
    stock.rotation.x = recoil*.018;

    if (reloadT === 0 && reloadWeapon !== null) {
      // Hold the magazine in its seated position until the gameplay reload completes.
      if (reloadWeapon === 'rifle') {
        magPivot.position.set(0,-.12,.005); magPivot.rotation.set(0,0,0);
      } else {
        pistolMag.position.set(.015,-.14,.085); pistolMag.rotation.set(0,0,0);
      }
    }
  }
  function consumeMeleeHit() { const ready = meleeHitReady; meleeHitReady = false; return ready; }
  function select(slot) {
    selected = slot;
    switchT=1;
    rifle.setEnabled(slot === 'rifle');
    pistol.setEnabled(slot === 'pistol');
    knife.setEnabled(slot === 'knife');
    if (slot !== 'rifle') muzzleFlash.isVisible = false;
    if (slot !== 'pistol') pistolFlash.isVisible = false;
    if (slot==='knife') { rightArm.rotation.z=-.12; leftArm.rotation.z=.08; }
  }
  return { root, rifle, pistol, knife, muzzleFlash, pistolFlash, fire, beginReload, completeReload, update, select, consumeMeleeHit, arms };
}
