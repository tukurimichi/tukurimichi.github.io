// parts/arms.js
// 担当: 腕（左右2本セット）
// 仕様: SPEC.md §3-3（形状）・§2（座標規約）を必ず参照すること。
//
// ローカル座標規約（SPEC.md §2）:
//   build() が返す Group はそのまま mascot.js 側で (0,0,0) に置かれるだけなので、
//   このファイル内で mascot 座標系そのままの位置(肩ジョイント = (±0.42, 1.08, 0))
//   に自分で配置すること。
//   +Z = 正面。腕は体側からやや外に開き、肘で少し前に曲げた「構え」のポーズ。
//   side<0 = arm_L (画面向かって左＝キャラの右腕)、side>0 = arm_R (画面向かって右＝キャラの左腕)。
//   左右で微妙にポーズ・手の開き方を変える（参考画像通り）。

const SHOULDER = { x: 0.42, y: 1.08, z: 0 };

function buildHand(THREE, M, open) {
  // 手(焦げ茶、グローブ状の拳)。指を1本ずつバラバラに突き出させず、
  // 握り気味にまとまった丸い塊+甲の溝2本で指の分割を軽く示す程度に留める。
  const hand = new THREE.Group();
  hand.name = 'hand';

  // 拳本体(卵形につぶした大きめの球)
  const fistGeo = new THREE.SphereGeometry(0.095, 16, 14);
  const fist = new THREE.Mesh(fistGeo, M.darkBrown);
  fist.scale.set(1.05, 0.92, 1.0);
  hand.add(fist);
  M.addOutline(fist, 0.03);

  // 指の分割線(甲の前面に溝を横に3本。太めにして指の塊感を強調する)
  const grooveGeo = new THREE.BoxGeometry(0.13, 0.02, 0.026);
  for (const gy of [0.01, -0.025, -0.06]) {
    const groove = new THREE.Mesh(grooveGeo, M.darkBrown);
    groove.position.set(0, gy, 0.086);
    hand.add(groove);
  }

  // 親指(小さく丸いこぶ状、控えめに横へ)
  const thumbGeo = new THREE.SphereGeometry(open ? 0.032 : 0.03, 10, 8);
  const thumb = new THREE.Mesh(thumbGeo, M.darkBrown);
  thumb.scale.set(1.2, 0.9, 0.9);
  thumb.position.set(-0.075, -0.01, 0.03);
  hand.add(thumb);

  return hand;
}

function buildOneArm(THREE, M, side /* -1 = 左(画面向かって左), 1 = 右 */) {
  const arm = new THREE.Group();
  arm.name = side < 0 ? 'arm_L' : 'arm_R';
  arm.position.set(side * SHOULDER.x, SHOULDER.y, SHOULDER.z);

  // --- 肩ボール(クリーム白の正球、大きめに出して肩球をはっきり見せる) ---
  const shoulderGeo = new THREE.SphereGeometry(0.115, 20, 16);
  const shoulder = new THREE.Mesh(shoulderGeo, M.cream);
  arm.add(shoulder);
  M.addOutline(shoulder, 0.03);

  // 肩付け根のリング(焦げ茶、胴体側に少し埋め込んで継ぎ目を隠す)
  const ringGeo = new THREE.TorusGeometry(0.07, 0.018, 8, 20);
  const ring = new THREE.Mesh(ringGeo, M.darkBrown);
  ring.rotation.y = Math.PI / 2;
  ring.position.set(-side * 0.06, -0.01, 0);
  arm.add(ring);

  // --- 上腕ジョイント〜先を1グループにまとめ、肩を軸に外側26°・やや前に傾ける ---
  const upperGroup = new THREE.Group();
  upperGroup.rotation.z = side * THREE.MathUtils.degToRad(26);
  upperGroup.rotation.x = THREE.MathUtils.degToRad(-6);
  arm.add(upperGroup);

  // 上腕ジョイント(焦げ茶、細い段付き円柱。前腕が太くなった分、対比でより細く見せる)
  const upperLen = 0.09;
  const upperGeo = new THREE.CylinderGeometry(0.038, 0.043, upperLen, 12);
  const upper = new THREE.Mesh(upperGeo, M.darkBrown);
  upper.position.set(0, -upperLen / 2, 0);
  upperGroup.add(upper);
  // 段付き感を出す小さいリング
  const stepGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.015, 12);
  const step = new THREE.Mesh(stepGeo, M.darkBrown);
  step.position.set(0, -upperLen + 0.01, 0);
  upperGroup.add(step);

  // --- 肘: 前腕〜手をさらにまとめ、内向きに少し戻しつつ前方へ曲げる(構えポーズ) ---
  const elbowGroup = new THREE.Group();
  elbowGroup.position.set(0, -upperLen, 0);
  elbowGroup.rotation.z = side * THREE.MathUtils.degToRad(-6);
  elbowGroup.rotation.x = THREE.MathUtils.degToRad(side < 0 ? -16 : -10);
  upperGroup.add(elbowGroup);

  // 前腕ガントレット: 上(肘側)はクリーム白の短いカフ、下(手側)は大きいオレンジの塊
  // (参考画像は前腕幅≒胴体幅の40%相当の非常に太いボリューム。既存比+約30%太く)
  const foreUpperLen = 0.1;
  const foreLowerLen = 0.22;
  const foreUpperTopR = 0.175;
  const foreUpperBotR = 0.195;
  const foreLowerTopR = 0.195;
  const foreLowerBotR = 0.16;

  const foreUpperGeo = new THREE.CylinderGeometry(foreUpperTopR, foreUpperBotR, foreUpperLen, 14);
  const foreUpper = new THREE.Mesh(foreUpperGeo, M.cream);
  foreUpper.position.set(0, -foreUpperLen / 2, 0);
  elbowGroup.add(foreUpper);
  M.addOutline(foreUpper, 0.03);

  // 肘側の丸み(クリームの半球キャップ。ドームが+Y=上向きに膨らみ、上腕ジョイントとの継ぎ目を隠す)
  const elbowCapGeo = new THREE.SphereGeometry(foreUpperTopR, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  const elbowCap = new THREE.Mesh(elbowCapGeo, M.cream);
  elbowCap.position.set(0, 0.0, 0);
  elbowGroup.add(elbowCap);

  const foreLowerGeo = new THREE.CylinderGeometry(foreLowerTopR, foreLowerBotR, foreLowerLen, 14);
  const foreLower = new THREE.Mesh(foreLowerGeo, M.orange);
  foreLower.position.set(0, -foreUpperLen - foreLowerLen / 2, 0);
  elbowGroup.add(foreLower);
  M.addOutline(foreLower, 0.03);

  // ツートンの境目の段差(オレンジ側がわずかに張り出すリム)
  const seamGeo = new THREE.CylinderGeometry(foreLowerTopR + 0.01, foreLowerTopR + 0.01, 0.014, 14);
  const seam = new THREE.Mesh(seamGeo, M.orange);
  seam.position.set(0, -foreUpperLen, 0);
  elbowGroup.add(seam);
  M.addOutline(seam, 0.02);

  // 手首側の丸み(オレンジの半球キャップ。ドームを-Y=下向きに反転し、手との継ぎ目を丸くする)
  const wristCapGeo = new THREE.SphereGeometry(foreLowerBotR, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  const wristCap = new THREE.Mesh(wristCapGeo, M.orange);
  wristCap.rotation.x = Math.PI;
  wristCap.position.set(0, -foreUpperLen - foreLowerLen, 0);
  elbowGroup.add(wristCap);
  M.addOutline(wristCap, 0.02);

  // ボルト(焦げ茶の丸、外側面)
  const boltGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.024, 14);
  const bolt = new THREE.Mesh(boltGeo, M.darkBrown);
  bolt.rotation.z = Math.PI / 2;
  bolt.position.set(side * (foreLowerTopR + 0.01), -0.17, 0.03);
  elbowGroup.add(bolt);

  // 小さいビス(前面寄り)
  const screwGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.012, 10);
  const screw = new THREE.Mesh(screwGeo, M.bolt);
  screw.rotation.x = Math.PI / 2;
  screw.position.set(side * 0.03, -foreUpperLen - 0.03, 0.135);
  elbowGroup.add(screw);

  // --- 手(前腕が大幅に太くなった分に合わせて、より大きな焦げ茶のこぶしに) ---
  // 前腕(手首側)の直径の約0.9倍を狙い、手首キャップの奥に埋もれないよう
  // 前腕先端よりはっきり外側(下)へ突き出す位置に配置する。
  const hand = buildHand(THREE, M, side > 0);
  hand.scale.setScalar(1.6);
  hand.position.set(0, -foreUpperLen - foreLowerLen - 0.11, 0.02);
  elbowGroup.add(hand);

  return arm;
}

export function build(THREE, M) {
  const g = new THREE.Group();
  g.name = 'arms';
  g.add(buildOneArm(THREE, M, -1));
  g.add(buildOneArm(THREE, M, 1));
  return g;
}
