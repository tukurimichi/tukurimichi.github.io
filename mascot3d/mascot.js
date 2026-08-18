// mascot.js
// 4部位(head/torso/arms/legs)を SPEC.md §2 のアタッチポイントに従って組み立てる。
// 通常はここを編集する必要はない(各担当は parts/*.js のみ編集)。
// アタッチポイントの数値そのものを変更する合意ができた場合のみ、
// SPEC.md §2 の表とこのファイルの座標を同時に更新すること。

import { build as buildHead } from './parts/head.js';
import { build as buildTorso } from './parts/torso.js';
import { build as buildArms } from './parts/arms.js';
import { build as buildLegs } from './parts/legs.js';

// SPEC.md §2 のアタッチポイント表と一致させること。
export const ATTACH = {
  footSoleY: 0.0,
  hipJointY: 0.56,
  waistCenterY: 0.56,
  shoulderJointY: 1.08,
  neckBaseY: 1.14,
  headBottomY: 1.22,
  headTopY: 2.0,
  totalHeight: 2.0,
};

/**
 * @param {typeof import('./lib/three.module.js')} THREE
 * @param {ReturnType<typeof import('./materials.js').makeMaterials>} M
 * @param {{ only?: 'head'|'torso'|'arms'|'legs' }} [opts]
 */
export function buildMascot(THREE, M, opts = {}) {
  const mascot = new THREE.Group();
  mascot.name = 'mascot';

  const parts = {};

  if (!opts.only || opts.only === 'legs') {
    parts.legs = buildLegs(THREE, M); // 内部で股関節位置(±0.20, 0.56, 0)に自配置済み
    mascot.add(parts.legs);
  }

  if (!opts.only || opts.only === 'torso') {
    parts.torso = buildTorso(THREE, M); // ローカル原点 = waistCenter
    parts.torso.position.set(0, ATTACH.waistCenterY, 0);
    mascot.add(parts.torso);
  }

  if (!opts.only || opts.only === 'arms') {
    parts.arms = buildArms(THREE, M); // 内部で肩ジョイント位置(±0.42, 1.08, 0)に自配置済み
    mascot.add(parts.arms);
  }

  if (!opts.only || opts.only === 'head') {
    parts.head = buildHead(THREE, M); // ローカル原点 = headBottom
    parts.head.position.set(0, ATTACH.headBottomY, 0);
    mascot.add(parts.head);
  }

  mascot.userData.parts = parts;
  return mascot;
}
