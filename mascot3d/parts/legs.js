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

const HIP = { x: 0.2, y: 0.56, z: 0 };

// --- 縦寸法の内訳(股関節からの積み上げ。目安値、SPEC.md §3-4参照) ---
// 関節は細く・装甲(腿/すね)は大きく丸く・靴は分厚い、という誇張プロポーションを
// 出すため、SPEC.mdの目安よりも脚全体の"積み上げ長さ"を短くし、余った分を
// ブーツ(靴+ソール)の高さ予算に回している。
const HIP_JOINT_LEN = 0.025;
const THIGH_LEN = 0.15;
const THIGH_ORANGE_RATIO = 0.55; // 太もも: 上55%がオレンジ、下45%がクリーム
const KNEE_LEN = 0.02;
const SHIN_LEN = 0.14;
const SHIN_ORANGE_RATIO = 0.62; // すね: 上62%がオレンジ(膝まわりの大きいオレンジパネルを再現)
const SHOE_H_NOMINAL = 0.17;

// 画面左(-1)=前にやや踏み出す・画面右(1)=後ろで開く、の非対称ポーズ。
// 角度は控えめ:単純な剛体傾斜(膝の実際の曲げは無い)なので、大きすぎると
// シルエットが破綻するため小さめに留める。
const POSE = {
  '-1': { tiltDeg: 14, yawDeg: 9 },
  1: { tiltDeg: -9, yawDeg: -13 },
};

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

  // 装甲を幅広・薄い「板」状に見せるための共通スケール(参考画像の大きなレッグアーマー)
  const ARMOR_XZ = { x: 1.2, z: 0.62 };

  let y = 0; // chainローカルの下向き積み上げ(マイナス方向)

  // 股関節ジョイント(焦げ茶、細い円柱。下の装甲との太さの差を大きく取り、
  // 「関節は細く・装甲は大きい」という誇張プロポーションを強調する)
  const hipGeo = new THREE.CylinderGeometry(0.032, 0.034, HIP_JOINT_LEN, 10);
  const hip = new THREE.Mesh(hipGeo, M.darkBrown);
  hip.position.set(0, y - HIP_JOINT_LEN / 2, 0);
  chain.add(hip);
  y -= HIP_JOINT_LEN;

  // 太もも装甲(オレンジ上部+クリーム下部、丸みのある大きい塊。
  // 上下でわずかに広がる程度に抑え、コーン状に見えすぎないようにする)
  const thighOrangeLen = THIGH_LEN * THIGH_ORANGE_RATIO;
  const thighCreamLen = THIGH_LEN - thighOrangeLen;

  const thighOrangeGeo = new THREE.CylinderGeometry(0.125, 0.135, thighOrangeLen, 16);
  const thighOrange = new THREE.Mesh(thighOrangeGeo, M.orange);
  thighOrange.position.set(0, y - thighOrangeLen / 2, 0);
  thighOrange.scale.set(ARMOR_XZ.x, 1, ARMOR_XZ.z);
  chain.add(thighOrange);
  M.addOutline(thighOrange, 0.026);
  y -= thighOrangeLen;

  const thighCreamGeo = new THREE.CylinderGeometry(0.135, 0.14, thighCreamLen, 16);
  const thighCream = new THREE.Mesh(thighCreamGeo, M.cream);
  thighCream.position.set(0, y - thighCreamLen / 2, 0);
  thighCream.scale.set(ARMOR_XZ.x, 1, ARMOR_XZ.z);
  chain.add(thighCream);
  M.addOutline(thighCream, 0.026);
  y -= thighCreamLen;

  // ビス(太もも、クリーム部分の前面に1個)
  {
    const boltGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.012, 10);
    const bolt = new THREE.Mesh(boltGeo, M.bolt);
    bolt.rotation.x = Math.PI / 2;
    bolt.position.set(side * 0.04, y + thighCreamLen * 0.6, 0.14 * ARMOR_XZ.z);
    chain.add(bolt);
  }

  // 左脚のみ: 外側寄りに丸い小さなマーク(楕円、参考画像の左脚外側マーク)
  if (side < 0) {
    const markGeo = new THREE.CircleGeometry(0.03, 20);
    const mark = new THREE.Mesh(markGeo, M.bolt);
    mark.scale.set(1, 1.3, 1);
    mark.position.set(side * 0.11 * ARMOR_XZ.x, y + thighCreamLen * 0.8, 0.06);
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

  // すね装甲(オレンジ上部+クリーム下部、太もも同様の大きい塊。ビスあり)
  const shinOrangeLen = SHIN_LEN * SHIN_ORANGE_RATIO;
  const shinCreamLen = SHIN_LEN - shinOrangeLen;

  const shinOrangeGeo = new THREE.CylinderGeometry(0.13, 0.14, shinOrangeLen, 16);
  const shinOrange = new THREE.Mesh(shinOrangeGeo, M.orange);
  shinOrange.position.set(0, y - shinOrangeLen / 2, 0);
  shinOrange.scale.set(ARMOR_XZ.x, 1, ARMOR_XZ.z);
  chain.add(shinOrange);
  M.addOutline(shinOrange, 0.026);
  y -= shinOrangeLen;

  const shinCreamGeo = new THREE.CylinderGeometry(0.14, 0.115, shinCreamLen, 16);
  const shinCream = new THREE.Mesh(shinCreamGeo, M.cream);
  shinCream.position.set(0, y - shinCreamLen / 2, 0);
  shinCream.scale.set(ARMOR_XZ.x, 1, ARMOR_XZ.z);
  chain.add(shinCream);
  M.addOutline(shinCream, 0.026);
  y -= shinCreamLen;

  // ビス(すね、オレンジ部分の前面に2個)
  {
    const boltGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.011, 10);
    for (const dx of [-0.045, 0.045]) {
      const bolt = new THREE.Mesh(boltGeo, M.bolt);
      bolt.rotation.x = Math.PI / 2;
      bolt.position.set(dx, y + shinOrangeLen * 0.55, 0.135 * ARMOR_XZ.z);
      chain.add(bolt);
    }
  }

  // --- 足首位置をleg空間へ変換し、そこから真下(floor)まで靴+ソールを積む ---
  const ankleInChain = new THREE.Vector3(0, y, 0);
  chain.updateMatrix();
  const ankleInLeg = ankleInChain.clone().applyMatrix4(chain.matrix);

  const floorLocalY = -HIP.y; // leg group内でのfootSoleY(=0)
  const footDrop = Math.max(0.16, ankleInLeg.y - floorLocalY); // 靴+ソールの高さ予算

  const shoeH = Math.min(SHOE_H_NOMINAL, footDrop * 0.75);
  const soleThickness = Math.max(0.04, footDrop - shoeH);

  const foot = new THREE.Group();
  foot.name = 'foot';
  // つま先の向き(yaw)だけ引き継ぐ。傾き(tilt)は引き継がず、足裏は常に水平にする。
  foot.rotation.y = yaw;
  foot.position.set(ankleInLeg.x, ankleInLeg.y, ankleInLeg.z);
  leg.add(foot);

  // 靴本体(オレンジ、大きく丸いブーツ。装甲より幅広い塊+前方やや上向きに
  // 傾けることで「前が丸く高い」印象を出す)
  const bootR = 0.13;
  const bootDepth = 0.4;
  const bootWidth = 0.3;
  const bootGeo = new THREE.SphereGeometry(bootR, 16, 12);
  const boot = new THREE.Mesh(bootGeo, M.orange);
  const bootScaleY = shoeH / (bootR * 2);
  boot.scale.set(bootWidth / (bootR * 2), bootScaleY, bootDepth / (bootR * 2));
  boot.position.set(0, -shoeH / 2, 0.05);
  boot.rotation.x = THREE.MathUtils.degToRad(-9); // つま先側をわずかに持ち上げる
  foot.add(boot);
  M.addOutline(boot, 0.022);

  // ソール(焦げ茶、厚い板。前後に大きくはみ出す)
  const soleGeo = new THREE.BoxGeometry(bootWidth + 0.04, soleThickness, bootDepth + 0.09);
  const sole = new THREE.Mesh(soleGeo, M.sole);
  sole.position.set(0, -shoeH - soleThickness / 2, 0.05);
  foot.add(sole);
  M.addOutline(sole, 0.02);

  // ソール側面(左右)の縦の溝(薄い箱を数本並べる)
  {
    const grooveGeo = new THREE.BoxGeometry(0.012, soleThickness * 0.7, 0.022);
    const halfW = (bootWidth + 0.04) / 2;
    for (const gx of [-halfW, halfW]) {
      for (const gz of [-0.09, 0.02, 0.12]) {
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
