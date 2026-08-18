// parts/legs.js
// 担当: 脚（左右2本セット）
// 仕様: SPEC.md §3-4（形状）・§2（座標規約）を必ず参照すること。
//
// ローカル座標規約（SPEC.md §2）:
//   build() が返す Group はそのまま mascot.js 側で (0,0,0) に置かれるだけなので、
//   このファイル内で mascot 座標系そのままの位置(股関節 = (±0.20, 0.56, 0))
//   に自分で配置すること。
//   +Z = 正面。足裏(footSoleY = 0)にきっちり接地させること。
//
// ポーズ方針（参考画像 mascot_v1.jpg 観察）:
//   画面左脚(side=-1)を前にやや踏み出し、画面右脚(side=1)は後ろ気味に開く
//   「仁王立ち・やや前傾」ポーズ。股関節位置と足裏接地(y=0)というSPEC.mdの
//   契約は崩さないため、股関節〜すね(chain)をまとめて前後傾斜(X軸回転)＋
//   開き(Y軸回転)させ、そこから得られる足首位置から真下にfootSoleY=0まで
//   靴+ソールを積む(=脚の傾きに関わらず足裏だけは水平に接地する、という
//   一般的なロボット表現)。
//
// 配色方針（参考画像 mascot_v1.jpg 観察）:
//   脚装甲(太もも・すね)はクリーム白が地。その前面〜内側寄りに、少し浮かせた
//   段差付きのオレンジ角丸パネルが重なる(白が地、オレンジが板)。パネルは
//   装甲幅の6割程度、上部が広く下がやや狭い台形気味。

const HIP = { x: 0.2, y: 0.56, z: 0 };

// --- 縦寸法の内訳(股関節からの積み上げ。目安値、SPEC.md §3-4参照) ---
// 関節は細く・装甲(腿/すね)は大きく丸く・靴は分厚い、という誇張プロポーションを
// 出すため、SPEC.mdの目安よりも脚全体の"積み上げ長さ"を短くし、余った分を
// ブーツ(靴+ソール)の高さ予算に回している。
const HIP_JOINT_LEN = 0.025;
const THIGH_LEN = 0.15;
const KNEE_LEN = 0.02;
const SHIN_LEN = 0.14;

// 装甲を幅広・薄い「板」状に見せるための共通スケール(参考画像の大きなレッグアーマー)
const ARMOR_XZ = { x: 1.2, z: 0.62 };
const PANEL_WIDTH_RATIO = 0.6; // オレンジパネルの幅 = 装甲幅の6割

// 画面左(-1)=前にやや踏み出す・画面右(1)=後ろで開く、の非対称ポーズ。
// 角度は控えめ:単純な剛体傾斜(膝の実際の曲げは無い)なので、大きすぎると
// シルエットが破綻するため小さめに留める。
const POSE = {
  '-1': { tiltDeg: 14, yawDeg: 9 },
  1: { tiltDeg: -9, yawDeg: -13 },
};

// 太もも/すね共通: クリーム白の装甲塊(全長)の前面に、浮かせた段差付きの
// オレンジ台形パネルを重ねる。armorAvgR はパネルの前方オフセット計算用。
function addArmorWithPanel(THREE, M, chain, side, topY, len, armorAvgR, radiusTop, radiusBottom) {
  const armorGeo = new THREE.CylinderGeometry(radiusTop, radiusBottom, len, 16);
  const armor = new THREE.Mesh(armorGeo, M.cream);
  armor.position.set(0, topY - len / 2, 0);
  armor.scale.set(ARMOR_XZ.x, 1, ARMOR_XZ.z);
  chain.add(armor);
  M.addOutline(armor, 0.026);

  const panelLen = len * 0.9;
  const panelTopR = armorAvgR * 0.98;
  const panelBotR = armorAvgR * 0.78; // 下がやや狭い台形
  const panelGeo = new THREE.CylinderGeometry(panelTopR, panelBotR, panelLen, 16);
  const panel = new THREE.Mesh(panelGeo, M.orange);
  const frontZ = armorAvgR * ARMOR_XZ.z + 0.022; // クリーム前面から少し浮かせる(段差)
  const panelCenterY = topY - len * 0.06 - panelLen / 2;
  panel.position.set(0, panelCenterY, frontZ);
  panel.scale.set(PANEL_WIDTH_RATIO * ARMOR_XZ.x, 1, 0.3);
  chain.add(panel);
  M.addOutline(panel, 0.02);

  // ビス(パネル上部左右)
  const boltGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.01, 10);
  const boltDx = panelTopR * PANEL_WIDTH_RATIO * ARMOR_XZ.x * 0.55;
  for (const dx of [-boltDx, boltDx]) {
    const bolt = new THREE.Mesh(boltGeo, M.bolt);
    bolt.rotation.x = Math.PI / 2;
    bolt.position.set(dx, topY - len * 0.2, frontZ + panelTopR * 0.26 + 0.008);
    chain.add(bolt);
  }

  return { panelCenterY, panelTopR, panelBotR, frontZ };
}

function buildOneLeg(THREE, M, side /* -1 = 左(画面向かって左), 1 = 右 */) {
  const leg = new THREE.Group();
  leg.name = side < 0 ? 'leg_L' : 'leg_R';
  leg.position.set(side * HIP.x, HIP.y, HIP.z);

  const pose = POSE[String(side)];
  const tilt = THREE.MathUtils.degToRad(pose.tiltDeg);
  const yaw = THREE.MathUtils.degToRad(pose.yawDeg);

  // --- chain: 股関節〜すね。leg原点(=股関節)を中心に前後傾斜+開きを与える ---
  const chain = new THREE.Group();
  chain.rotation.set(tilt, yaw, 0);
  leg.add(chain);

  let y = 0; // chainローカルの下向き積み上げ(マイナス方向)

  // 股関節ジョイント(焦げ茶、細い円柱。下の装甲との太さの差を大きく取り、
  // 「関節は細く・装甲は大きい」という誇張プロポーションを強調する)
  const hipGeo = new THREE.CylinderGeometry(0.032, 0.034, HIP_JOINT_LEN, 10);
  const hip = new THREE.Mesh(hipGeo, M.darkBrown);
  hip.position.set(0, y - HIP_JOINT_LEN / 2, 0);
  chain.add(hip);
  y -= HIP_JOINT_LEN;

  // 太もも装甲(クリーム白ベース+前面オレンジパネル、大きく丸い塊)
  const thighTopY = y;
  addArmorWithPanel(THREE, M, chain, side, thighTopY, THIGH_LEN, 0.135, 0.125, 0.15);
  y -= THIGH_LEN;

  // 左脚のみ: 外側寄りに丸い小さなマーク(楕円、参考画像の左脚外側マーク)
  if (side < 0) {
    const markGeo = new THREE.CircleGeometry(0.03, 20);
    const mark = new THREE.Mesh(markGeo, M.bolt);
    mark.scale.set(1, 1.3, 1);
    mark.position.set(side * 0.11 * ARMOR_XZ.x, thighTopY - THIGH_LEN * 0.8, 0.06);
    mark.rotation.y = side * Math.PI * 0.42; // 前面よりも外側面(側面)寄りに向ける
    mark.castShadow = false;
    mark.receiveShadow = false;
    chain.add(mark);
  }

  // 膝関節(焦げ茶、細い。目立たない繋ぎ目)
  const kneeGeo = new THREE.CylinderGeometry(0.06, 0.055, KNEE_LEN, 10);
  const knee = new THREE.Mesh(kneeGeo, M.darkBrown);
  knee.position.set(0, y - KNEE_LEN / 2, 0);
  chain.add(knee);
  y -= KNEE_LEN;

  // すね装甲(クリーム白ベース+前面オレンジパネル、太もも同様の大きい塊)
  const shinTopY = y;
  addArmorWithPanel(THREE, M, chain, side, shinTopY, SHIN_LEN, 0.13, 0.13, 0.125);
  y -= SHIN_LEN;

  // --- 足首位置をleg空間へ変換し、そこから真下(floor)まで靴+ソールを積む ---
  const ankleInChain = new THREE.Vector3(0, y, 0);
  chain.updateMatrix();
  const ankleInLeg = ankleInChain.clone().applyMatrix4(chain.matrix);

  const floorLocalY = -HIP.y; // leg group内でのfootSoleY(=0)
  const footDrop = Math.max(0.16, ankleInLeg.y - floorLocalY); // 靴+ソールの高さ予算

  // ブーツ本体(オレンジ)を大きく・ソール(焦げ茶)は薄く、の比率に変更
  const shoeH = Math.min(0.255, footDrop * 0.85);
  const soleThickness = Math.max(0.025, footDrop - shoeH);

  const foot = new THREE.Group();
  foot.name = 'foot';
  // つま先の向き(yaw)だけ引き継ぐ。傾き(tilt)は引き継がず、足裏は常に水平にする。
  foot.rotation.y = yaw;
  foot.position.set(ankleInLeg.x, ankleInLeg.y, ankleInLeg.z);
  leg.add(foot);

  // 靴本体(オレンジ、大きく丸いブーツ。装甲より幅広い塊+前方やや上向きに
  // 傾けることで「前が丸く高い」印象を出す。ソールに対して本体を大きくする)
  const bootR = 0.15;
  const bootDepth = 0.56;
  const bootWidth = 0.32;
  const bootGeo = new THREE.SphereGeometry(bootR, 16, 12);
  const boot = new THREE.Mesh(bootGeo, M.orange);
  const bootScaleY = shoeH / (bootR * 2);
  boot.scale.set(bootWidth / (bootR * 2), bootScaleY, bootDepth / (bootR * 2));
  boot.position.set(0, -shoeH / 2, 0.05);
  boot.rotation.x = THREE.MathUtils.degToRad(-9); // つま先側をわずかに持ち上げる
  foot.add(boot);
  M.addOutline(boot, 0.022);

  // ソール(焦げ茶、薄い板。前後に少しだけはみ出す程度)
  const soleGeo = new THREE.BoxGeometry(bootWidth + 0.02, soleThickness, bootDepth + 0.05);
  const sole = new THREE.Mesh(soleGeo, M.sole);
  sole.position.set(0, -shoeH - soleThickness / 2, 0.05);
  foot.add(sole);
  M.addOutline(sole, 0.02);

  // ソール側面(左右)の縦の溝(薄い箱を数本並べる)
  {
    const grooveGeo = new THREE.BoxGeometry(0.012, soleThickness * 0.7, 0.02);
    const halfW = (bootWidth + 0.02) / 2;
    for (const gx of [-halfW, halfW]) {
      for (const gz of [-0.11, 0.02, 0.15]) {
        const groove = new THREE.Mesh(grooveGeo, M.darkBrown);
        groove.position.set(gx + (gx > 0 ? 0.006 : -0.006), -shoeH - soleThickness / 2, 0.05 + gz);
        groove.castShadow = false;
        foot.add(groove);
      }
    }
  }

  return leg;
}

export function build(THREE, M) {
  const g = new THREE.Group();
  g.name = 'legs';
  g.add(buildOneLeg(THREE, M, -1));
  g.add(buildOneLeg(THREE, M, 1));
  return g;
}
