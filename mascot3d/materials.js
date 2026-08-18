// materials.js
// 共通パレット・トゥーンマテリアル生成・アウトラインヘルパー
// 詳細な色決定の根拠は SPEC.md §4/§5 を参照。
//
// 使い方:
//   import * as THREE from './lib/three.module.js';
//   import { makeMaterials } from './materials.js';
//   const M = makeMaterials(THREE);
//   const mesh = new THREE.Mesh(geo, M.orange);
//   M.addOutline(mesh, 0.03); // メッシュに黒縁アウトラインの子メッシュを追加して返す

export const PALETTE = {
  orange: 0xf0862e,
  orangeLight: 0xffb74d,
  cream: 0xf7eee1,
  darkBrown: 0x3a2a22,
  sole: 0x2a1b12,
  skyBlue: 0xa9d6e0,
  bolt: 0xeadfc9,
  outline: 0x241812,
};

// 3階調のグラデーションテクスチャを1枚作り、全MeshToonMaterialで共有する。
function makeGradientMap(THREE) {
  const data = new Uint8Array([80, 170, 255]); // 暗-中-明の3段階
  const tex = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  tex.needsUpdate = true;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  // width=3 x 1byte/pixel は4byte境界に満たないため、既定のunpackAlignment(4)だと
  // 行の読み出しがズレて縞状のノイズが出る。1byte境界に変更して回避する。
  tex.unpackAlignment = 1;
  return tex;
}

/**
 * @param {typeof import('./lib/three.module.js')} THREE
 * @returns {{
 *   orange: THREE.MeshToonMaterial,
 *   orangeLight: THREE.MeshToonMaterial,
 *   cream: THREE.MeshToonMaterial,
 *   darkBrown: THREE.MeshToonMaterial,
 *   sole: THREE.MeshToonMaterial,
 *   skyBlue: THREE.MeshToonMaterial,
 *   bolt: THREE.MeshToonMaterial,
 *   outlineColor: number,
 *   gradientMap: THREE.DataTexture,
 *   addOutline: (mesh: THREE.Mesh, thickness?: number) => THREE.Mesh,
 * }}
 */
export function makeMaterials(THREE) {
  const gradientMap = makeGradientMap(THREE);

  const toon = (hex) =>
    new THREE.MeshToonMaterial({ color: hex, gradientMap });

  const M = {
    orange: toon(PALETTE.orange),
    orangeLight: toon(PALETTE.orangeLight),
    cream: toon(PALETTE.cream),
    darkBrown: toon(PALETTE.darkBrown),
    sole: toon(PALETTE.sole),
    skyBlue: toon(PALETTE.skyBlue),
    bolt: toon(PALETTE.bolt),
    outlineColor: PALETTE.outline,
    gradientMap,
  };

  // アウトライン用マテリアルは1つ共有（BackSide・裏面のみ描画）
  const outlineMaterial = new THREE.MeshBasicMaterial({
    color: PALETTE.outline,
    side: THREE.BackSide,
  });

  /**
   * mesh と同じジオメトリを法線方向にわずかに拡大した複製を作り、
   * mesh の子として追加して返す。トゥーン調の縁取り表現。
   * mesh.geometry は非破壊（複製したジオメトリを新しいメッシュに使う）。
   */
  M.addOutline = (mesh, thickness = 0.03) => {
    const outline = new THREE.Mesh(mesh.geometry, outlineMaterial);
    outline.scale.multiplyScalar(1 + thickness);
    mesh.add(outline);
    return outline;
  };

  return M;
}
