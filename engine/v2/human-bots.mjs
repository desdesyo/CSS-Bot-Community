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

// LoadAssetContainerAsync returns an AssetContainer; AnimationGroup objects are inside animationGroups.
export function extractAnimationGroup(container) {
  const groups = Array.isArray(container?.animationGroups) ? container.animationGroups : [];
  return groups.find(group => typeof group?.clone === "function") || null;
}

export async function loadHumanBotAssets(B, scene) {
  if (!B.SceneLoader || !B.SceneLoader.LoadAssetContainerAsync) {
    throw new Error("Критическая ошибка: Babylon glTF loader недоступен. Реальные 3D-модели бойцов не могут быть загружены.");
  }
  // Resolve against this module, not document.location: GitHub Pages may serve the
  // game through redirects or nested routes while the GLB pack stays beside this module.
  const assetRoot = new URL("./assets/", import.meta.url).href;
  const ASSET_TIMEOUT_MS = 90000;
  const load = (file) => new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error("Asset timeout after " + ASSET_TIMEOUT_MS + "ms: " + file + " (" + assetRoot + file + ")"));
    }, ASSET_TIMEOUT_MS);
    B.SceneLoader.LoadAssetContainerAsync(assetRoot, file, scene).then(value => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      console.info("[SOLO] Loaded soldier asset", file);
      resolve(value);
    }, error => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(file + " from " + assetRoot + ": " + (error?.message || error)));
    });
  });
  // Limit concurrent GLB parsing to two. Six simultaneous skinned imports compete
  // for mobile memory/CPU and previously all hit the short 12-second deadline.
  const loadBatch = async (entries, concurrency = 2) => {
    const results = new Array(entries.length);
    let next = 0;
    const worker = async () => {
      while (true) {
        const index = next++;
        if (index >= entries.length) return;
        try {
          results[index] = { status: "fulfilled", value: await load(entries[index][1]) };
        } catch (reason) {
          results[index] = { status: "rejected", reason };
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, entries.length) }, worker));
    return results;
  };
  const modelResults = await loadBatch(MODEL_FILES.map((file, index) => [index, file]), 2);
  const failedModels = modelResults
    .map((result, index) => result.status === "rejected" ? MODEL_FILES[index] + ": " + result.reason?.message : null)
    .filter(Boolean);
  if (failedModels.length) {
    throw new Error("Не удалось загрузить обязательные 3D-модели бойцов:\n" + failedModels.join("\n"));
  }
  const models = modelResults.map(result => result.value);

  const animations = {};
  const clipEntries = Object.entries(CLIPS);
  const clipResults = await loadBatch(clipEntries, 2).then(results => results.map((result, index) => result.status === "fulfilled" ? { status: "fulfilled", value: [clipEntries[index][0], result.value] } : result));
  for (const result of clipResults) {
    if (result.status === "fulfilled") {
      const [name, container] = result.value;
      const group = extractAnimationGroup(container);
      if (group) animations[name] = group;
      else console.warn("Optional soldier animation container has no cloneable AnimationGroup:", name, container);
    } else console.warn("Optional soldier animation unavailable:", result.reason);
  }
  if (models.length !== MODEL_FILES.length) {
    throw new Error("Загружен неполный комплект 3D-моделей бойцов.");
  }
  return { models, animations };
}

export function createHumanBot(B, scene, shadowGen, root, team, id, assets, isMobile = false) {
  const source = assets.models?.length ? assets.models[(id - 1) % assets.models.length] : null;
  if (!source) {
    throw new Error("Для бойца " + id + " отсутствует настоящая 3D-модель. Примитивная подмена запрещена.");
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
      const meshMaterials=[mesh.material,...(mesh.material?.subMaterials||[])].filter(Boolean);
      for(const material of meshMaterials){
        if(material?.albedoColor && !tintedMaterials.has(material)){
          tintedMaterials.add(material);
          const tint=team==="enemy"?new B.Color3(1.0,.94,.88):new B.Color3(.86,.94,1.0);
          material.albedoColor=material.albedoColor.multiply(tint);
        }
        // Preserve source GLB texture resolution while improving oblique detail.
        const textureSlots=["albedoTexture","bumpTexture","metallicTexture","ambientTexture","emissiveTexture","opacityTexture","lightmapTexture"];
        for(const slot of textureSlots){
          const texture=material?.[slot];
          if(!texture)continue;
          texture.anisotropicFilteringLevel=Math.min(isMobile?8:16,scene.getEngine().getCaps().maxAnisotropy||1);
          if(texture.updateSamplingMode)texture.updateSamplingMode(B.Texture.TRILINEAR_SAMPLINGMODE);
        }
      }
    }
    if (node.getChildMeshes) {
      node.isPickable = false;
    }
  }

  // Report embedded texture dimensions so source quality can be distinguished from GPU scaling.
  if(id===1){
    const textureReport=[];
    for(const node of instance.rootNodes)for(const mesh of node.getChildMeshes?.(false)||[]){
      for(const material of [mesh.material,...(mesh.material?.subMaterials||[])].filter(Boolean)){
        const tex=material.albedoTexture;
        if(tex){const size=tex.getSize?.()||{};textureReport.push({material:material.name,width:size.width||0,height:size.height||0,anisotropy:tex.anisotropicFilteringLevel||1});}
      }
    }
    console.info("[SOLO] Soldier GLB texture quality",textureReport);
  }

  const animationGroups = {};
  for (const [name,sourceGroup] of Object.entries(assets.animations || {})) {
    if (typeof sourceGroup?.clone !== "function") {
      console.warn("Skipping invalid soldier AnimationGroup:", name, sourceGroup);
      continue;
    }
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
