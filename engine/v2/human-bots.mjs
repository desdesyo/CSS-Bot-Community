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
    throw new Error("Babylon glTF loader is missing");
  }
  const models = await Promise.all(MODEL_FILES.map(file =>
    B.SceneLoader.LoadAssetContainerAsync("./assets/", file, scene)
  ));
  const animations = {};
  for (const [name,file] of Object.entries(CLIPS)) {
    const container = await B.SceneLoader.LoadAssetContainerAsync("./assets/", file, scene);
    if (!container.animationGroups?.length) {
      throw new Error("Animation clip has no AnimationGroup: " + file);
    }
    animations[name] = container.animationGroups[0];
  }
  return { models, animations };
}

export function createHumanBot(B, scene, shadowGen, root, team, id, assets) {
  const source = assets.models[(id - 1) % assets.models.length];
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
  const tintedMaterials = new Set();
  for (const node of instance.rootNodes) {
    for (const mesh of node.getChildMeshes?.(false) || []) {
      mesh.isPickable = false;
      mesh.receiveShadows = true;
      if (shadowGen && mesh.getTotalVertices() > 100) shadowGen.addShadowCaster(mesh);
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
    if (!mappedTargets) {
      group.dispose();
      throw new Error("Could not retarget " + name + " animation to soldier Biped skeleton");
    }
    animationGroups[name] = group;
  }
  const body = B.MeshBuilder.CreateCapsule("body-" + id,{height:1.45,radius:.31,tessellation:10},scene);
  body.parent=root;body.position.y=.91;body.visibility=0;body.isVisible=true;body.isPickable=true;
  const head = B.MeshBuilder.CreateSphere("head-" + id,{diameter:.36,segments:10},scene);
  head.parent=root;head.position.y=1.68;head.visibility=0;head.isVisible=true;head.isPickable=true;

  const rig = { root, skeleton, animationGroups, current:"" };
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
