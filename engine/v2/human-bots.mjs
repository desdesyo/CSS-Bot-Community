// Real skinned military characters and shared Biped motion clips.
// Source models: CodeLove Rigged Professions (MIT); see ASSET_CREDITS.md.
const MODEL_FILES = [
  "military-male-01.glb",
  "military-male-02.glb",
  "military-male-03.glb",
  "military-male-04.glb",
  "military-female-01.glb",
  "military-female-02.glb"
];
const CLIPS = {
  idle: "m_idle_neutral_01.glb",
  walk: "m_walk_neutral_01.glb",
  run: "m_run_neutral_01.glb"
};

export async function loadHumanBotAssets(B, scene) {
  if (!B.SceneLoader || !B.SceneLoader.LoadAssetContainerAsync) {
    console.warn("Babylon glTF loader is missing; using procedural soldiers");
    return { models: [], animations: {} };
  }
  const load = (file) => Promise.race([
    B.SceneLoader.LoadAssetContainerAsync("./assets/", file, scene),
    new Promise((_, reject) => setTimeout(() => reject(new Error("Asset timeout: " + file)), 12000))
  ]);
  const modelResults = await Promise.allSettled(MODEL_FILES.map(load));
  const models = modelResults.filter(x => x.status === "fulfilled").map(x => x.value);
  const animations = {};
  const clipResults = await Promise.allSettled(Object.entries(CLIPS).map(async ([name,file]) => {
    const container = await load(file);
    const group = container.animationGroups?.[0];
    if (!group) throw new Error("Animation clip has no AnimationGroup: " + file);
    return [name, group];
  }));
  for (const result of clipResults) {
    if (result.status === "fulfilled") animations[result.value[0]] = result.value[1];
    else console.warn("Optional soldier animation unavailable:", result.reason);
  }
  if (!models.length) console.warn("Soldier models unavailable; using procedural soldiers");
  return { models, animations };
}

export function createHumanBot(B, scene, shadowGen, root, team, id, assets, isMobile = false) {
  const source = assets.models?.length ? assets.models[(id - 1) % assets.models.length] : null;
  if (!source) {
    const uniform = new B.StandardMaterial("fallback-uniform-" + id, scene);
    uniform.diffuseColor = team === "enemy" ? new B.Color3(.34,.39,.35) : new B.Color3(.30,.40,.53);
    const skin = new B.StandardMaterial("fallback-skin-" + id, scene);
    skin.diffuseColor = new B.Color3(.58,.43,.33);
    const make = (name, shape, options, y, material) => {
      const mesh = shape === "sphere"
        ? B.MeshBuilder.CreateSphere(name + "-" + id, options, scene)
        : B.MeshBuilder.CreateCapsule(name + "-" + id, options, scene);
      mesh.parent = root; mesh.position.y = y; mesh.material = material;
      mesh.isPickable = false; mesh.receiveShadows = !isMobile;
      return mesh;
    };
    make("fallback-torso", "capsule", {height: .92, radius: .27, tessellation: 8}, 1.05, uniform);
    make("fallback-head", "sphere", {diameter: .34, segments: 8}, 1.72, skin);
    make("fallback-left-arm", "capsule", {height: .72, radius: .105, tessellation: 6}, 1.05, uniform).position.x = -.34;
    make("fallback-right-arm", "capsule", {height: .72, radius: .105, tessellation: 6}, 1.05, uniform).position.x = .34;
    make("fallback-left-leg", "capsule", {height: .78, radius: .13, tessellation: 6}, .39, uniform).position.x = -.15;
    make("fallback-right-leg", "capsule", {height: .78, radius: .13, tessellation: 6}, .39, uniform).position.x = .15;
    const body = B.MeshBuilder.CreateCapsule("body-" + id,{height:1.45,radius:.31,tessellation:8},scene);
    body.parent=root;body.position.y=.91;body.visibility=0;body.isPickable=true;
    const head = B.MeshBuilder.CreateSphere("head-" + id,{diameter:.36,segments:8},scene);
    head.parent=root;head.position.y=1.68;head.visibility=0;head.isPickable=true;
    return {body,head,rig:{root,skeleton:null,animationGroups:{},current:"",rightHand:null,leftHand:null}};
  }
  const instance = source.instantiateModelsToScene(
    name => "soldier-" + id + "-" + name,
    true
  );
  for (const node of instance.rootNodes) node.parent = root;

  const nodeByName = new Map();
  for (const node of instance.rootNodes) {
    nodeByName.set(node.name,node);
    for (const child of node.getDescendants(false)) nodeByName.set(child.name,child);
  }
  const skeleton = instance.skeletons[0];
  if (!skeleton) throw new Error("Soldier model has no humanoid skeleton: " + MODEL_FILES[(id-1)%assets.models.length]);
  const boneByName = new Map();
  for (const bone of skeleton.bones) {
    const transform = bone.getTransformNode?.();
    if (transform) boneByName.set(bone.name,transform);
  }
  let rightHand = null, leftHand = null;
  for (const [name,node] of nodeByName) {
    if (/right.?hand|hand.?r|mixamorig:RightHand/i.test(name)) { rightHand=node; }
    if (/left.?hand|hand.?l|mixamorig:LeftHand/i.test(name)) { leftHand=node; }
  }
  for (const [name,node] of boneByName) {
    if (!rightHand && /right.?hand|hand.?r|mixamorig:RightHand/i.test(name)) rightHand=node;
    if (!leftHand && /left.?hand|hand.?l|mixamorig:LeftHand/i.test(name)) leftHand=node;
  }

  const tintedMaterials = new Set();
  for (const node of instance.rootNodes) {
    for (const mesh of node.getChildMeshes?.(false) || []) {
      mesh.isPickable = false;
      mesh.receiveShadows = !isMobile;
      // Skinned shadow casters are disproportionately expensive on mobile GPUs.
      if (!isMobile && shadowGen && mesh.getTotalVertices() > 100) shadowGen.addShadowCaster(mesh);
      const material = mesh.material;
      if (material?.albedoColor && !tintedMaterials.has(material)) {
        tintedMaterials.add(material);
        const tint = team === "enemy"
          ? new B.Color3(1.0,0.94,0.88)
          : new B.Color3(0.86,0.94,1.0);
        material.albedoColor = material.albedoColor.multiply(tint);
      }
    }
    if (node.getChildMeshes) {
      node.isPickable = false;
    }
  }

  const animationGroups = {};
  for (const [name,sourceGroup] of Object.entries(assets.animations)) {
    let mappedTargets = 0;
    const group = sourceGroup.clone(
      "soldier-" + id + "-" + name,
      target => {
        const mapped = nodeByName.get(target?.name) || boneByName.get(target?.name);
        if (mapped) mappedTargets++;
        return mapped || target;
      }
    );
    if (!mappedTargets) { group.dispose(); continue; }
    animationGroups[name] = group;
  }
  const body = B.MeshBuilder.CreateCapsule("body-" + id,{height:1.45,radius:.31,tessellation:10},scene);
  body.parent=root;body.position.y=.91;body.visibility=0;body.isVisible=true;body.isPickable=true;
  const head = B.MeshBuilder.CreateSphere("head-" + id,{diameter:.36,segments:10},scene);
  head.parent=root;head.position.y=1.68;head.visibility=0;head.isVisible=true;head.isPickable=true;

  const rig = { root, skeleton, animationGroups, current:"", rightHand, leftHand };
  setAnimation(rig,"idle");
  return { body, head, rig };
}

function setAnimation(rig,name) {
  if (!rig || rig.current === name || !rig.animationGroups[name]) return;
  for (const group of Object.values(rig.animationGroups)) group.stop();
  rig.animationGroups[name].start(true);
  rig.current = name;
}

export function animateHumanBot(rig,moving=true,running=false) {
  setAnimation(rig,running ? "run" : moving ? "walk" : "idle");
}

export function stopHumanBot(rig) {
  if (!rig) return;
  for (const group of Object.values(rig.animationGroups)) group.stop();
  rig.current = "dead";
}
