// parts/torso.js
// 担当: 胴体
// 仕様: SPEC.md §3-2（形状）・§2（座標規約）を必ず参照すること。
//
// ローカル座標規約（SPEC.md §2）:
//   ローカル原点 (0,0,0) = waistCenter（腰下端中心、mascot.js側で y=0.56 に配置される）
//   ローカル y=0.58 付近 = 肩上端（neckBase高さ = mascot y=1.14）
//   +Z = 正面
//   肩ボール自体（クリーム白球）は arms.js が shoulderJointL/R = mascot座標(±0.42,1.08,0)
//   に配置するので、torso.js 側は「肩の受け皿」程度の軽い盛り上がりのみ。
//
// 首の継ぎ目メモ:
//   head.js 側の原点(headBottom)は mascot y=1.22 = torso ローカル y=0.66。
//   torso の肩上端(ローカル y=0.58 = mascot y=1.14)との間に mascot座標で
//   0.08 の「首」区間があるが、これを担当するファイルが他にないため、
//   torso.js 側でローカル y=0.70 付近まで焦げ茶の首パーツを伸ばして
//   head.js の底面にわずかにめり込ませ、隙間を確実に塞いでいる
//   （README §3 に記載の「オーバーラップで隙間を隠す」手法）。

export function build(THREE, M) {
  const g = new THREE.Group();
  g.name = 'torso';

  const DEPTH_SCALE = 0.66; // 円形断面(Lathe)を前後方向だけ潰して卵型にする

  // ---------------------------------------------------------------
  // 1. 腰ベルト（焦げ茶、y=0〜0.07）: 股関節土台の視覚的な受け皿。
  //    脚(legs.js)側の股関節はここより下(mascot y<=0.56)に来る想定。
  // ---------------------------------------------------------------
  const beltGeo = new THREE.CylinderGeometry(0.185, 0.205, 0.07, 28);
  const belt = new THREE.Mesh(beltGeo, M.darkBrown);
  belt.position.set(0, 0.035, 0);
  belt.scale.set(1, 1, DEPTH_SCALE);
  g.add(belt);
  M.addOutline(belt, 0.03);

  // ---------------------------------------------------------------
  // 2. 本体（クリーム白、丸みのある逆卵型）: LatheGeometryで
  //    「下腹の丸み→ウエストの括れ→胸に向けて広がる→肩ですぼまる」
  //    という参考画像のシルエットを再現し、Z方向だけ潰して厚みを出す。
  // ---------------------------------------------------------------
  const profile = [
    [0.19, 0.03],
    [0.235, 0.10],
    [0.26, 0.16], // 下腹の丸み最大(強調)
    [0.20, 0.26], // ウエストの括れ
    [0.225, 0.33],
    [0.27, 0.41],
    [0.30, 0.48], // 胸〜肩にかけて最も広い
    [0.275, 0.535],
    [0.19, 0.565],
    [0.10, 0.585],
  ].map(([r, y]) => new THREE.Vector2(r, y));

  const bodyGeo = new THREE.LatheGeometry(profile, 32);
  const body = new THREE.Mesh(bodyGeo, M.cream);
  body.scale.set(1, 1, DEPTH_SCALE);
  g.add(body);
  M.addOutline(body, 0.03);

  // ---------------------------------------------------------------
  // 3. 首ジョイント（焦げ茶）: 肩上端に短く幅広な「リング」を見せつつ、
  //    その上に細いブリッジを立てて head.js の底面まで確実に届かせる。
  //    (太い円錐1本にすると「とんがり帽子」に見えてしまうため2段構成にした)
  // ---------------------------------------------------------------
  const collarRingGeo = new THREE.CylinderGeometry(0.115, 0.13, 0.03, 24);
  const collarRing = new THREE.Mesh(collarRingGeo, M.darkBrown);
  collarRing.position.set(0, 0.572, 0);
  g.add(collarRing);
  M.addOutline(collarRing, 0.03);

  const neckBridgeGeo = new THREE.CylinderGeometry(0.075, 0.10, 0.11, 20);
  const neckBridge = new THREE.Mesh(neckBridgeGeo, M.darkBrown);
  neckBridge.position.set(0, 0.645, 0);
  g.add(neckBridge);

  // 首の下、胸当てとの間に薄いオレンジの襟パーツ（SPEC§3-2「薄いオレンジの襟状パーツ」）
  const collarGeo = new THREE.CylinderGeometry(0.118, 0.135, 0.018, 24);
  const collar = new THREE.Mesh(collarGeo, M.orange);
  collar.position.set(0, 0.553, 0);
  g.add(collar);

  // ---------------------------------------------------------------
  // 4. 肩の受け皿（クリーム白の小さな半埋め込み球）: 腕(arms.js)側の
  //    肩ボール(mascot座標 ±0.42,1.08,0 = torsoローカル ±0.42,0.52,0)
  //    の付け根にわずかに重ねて、継ぎ目のない一体感を出す控えめな盛り上がり。
  // ---------------------------------------------------------------
  const padGeo = new THREE.SphereGeometry(0.065, 16, 16);
  for (const side of [-1, 1]) {
    const pad = new THREE.Mesh(padGeo, M.cream);
    pad.position.set(side * 0.30, 0.49, 0);
    g.add(pad);
  }

  // ---------------------------------------------------------------
  // 5. 胸当てプレート（オレンジ、角丸トラペゾイド、上辺アーチ、少し前に浮かせる）
  // ---------------------------------------------------------------
  const CHEST = {
    bottomY: 0.205,
    topY: 0.485,
    bottomHalfW: 0.125,
    topHalfW: 0.185,
    r: 0.035,
    arch: 0.02,
  };
  const FRONT_Z = 0.195;
  const CHEST_THICK = 0.04;

  const chestShape = new THREE.Shape();
  chestShape.moveTo(-CHEST.bottomHalfW + CHEST.r, CHEST.bottomY);
  chestShape.lineTo(CHEST.bottomHalfW - CHEST.r, CHEST.bottomY);
  chestShape.quadraticCurveTo(CHEST.bottomHalfW, CHEST.bottomY, CHEST.bottomHalfW, CHEST.bottomY + CHEST.r);
  chestShape.lineTo(CHEST.topHalfW, CHEST.topY - CHEST.r);
  chestShape.quadraticCurveTo(CHEST.topHalfW, CHEST.topY, CHEST.topHalfW - CHEST.r, CHEST.topY);
  chestShape.quadraticCurveTo(0, CHEST.topY + CHEST.arch, -(CHEST.topHalfW - CHEST.r), CHEST.topY);
  chestShape.quadraticCurveTo(-CHEST.topHalfW, CHEST.topY, -CHEST.topHalfW, CHEST.topY - CHEST.r);
  chestShape.lineTo(-CHEST.bottomHalfW, CHEST.bottomY + CHEST.r);
  chestShape.quadraticCurveTo(-CHEST.bottomHalfW, CHEST.bottomY, -CHEST.bottomHalfW + CHEST.r, CHEST.bottomY);

  const chestGeo = new THREE.ExtrudeGeometry(chestShape, {
    depth: CHEST_THICK,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    bevelSegments: 2,
    steps: 1,
    curveSegments: 12,
  });
  const chest = new THREE.Mesh(chestGeo, M.orange);
  chest.position.set(0, 0, FRONT_Z - CHEST_THICK);
  g.add(chest);
  M.addOutline(chest, 0.025);

  // --- ビス(クリーム寄りの丸)、四隅付近 ---
  const boltGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.016, 12);
  const boltPositions = [
    [-0.135, 0.435],
    [0.135, 0.435],
    [-0.085, 0.25],
    [0.085, 0.25],
  ];
  for (const [bx, by] of boltPositions) {
    const bolt = new THREE.Mesh(boltGeo, M.bolt);
    bolt.rotation.x = Math.PI / 2;
    bolt.position.set(bx, by, FRONT_Z + 0.008);
    g.add(bolt);
  }

  // --- 下部中央のスロット(濃茶の小さい長方形) ---
  const slotGeo = new THREE.BoxGeometry(0.075, 0.025, 0.02);
  const slot = new THREE.Mesh(slotGeo, M.darkBrown);
  slot.position.set(0, 0.165, 0.165);
  g.add(slot);

  // --- その下の横スリット2本 ---
  const slitGeo = new THREE.BoxGeometry(0.085, 0.008, 0.015);
  for (const sy of [0.13, 0.105]) {
    const slit = new THREE.Mesh(slitGeo, M.darkBrown);
    slit.position.set(0, sy, 0.16);
    g.add(slit);
  }

  // ---------------------------------------------------------------
  // 6. 露出メカ部（焦げ茶+オレンジ、胸当て脇・肩付け根付近、左右対称の簡略クラスタ）
  // ---------------------------------------------------------------
  function addMechaCluster(side) {
    const baseX = side * 0.205;
    const baseY = 0.34;
    const baseZ = 0.15;

    const hexGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.025, 6);
    const hex = new THREE.Mesh(hexGeo, M.darkBrown);
    hex.rotation.x = Math.PI / 2;
    hex.position.set(baseX, baseY + 0.06, baseZ);
    g.add(hex);

    const tubeGeo = new THREE.CylinderGeometry(0.02, 0.028, 0.05, 10);
    const tube = new THREE.Mesh(tubeGeo, M.darkBrown);
    tube.rotation.z = side * (Math.PI / 2) * 0.85;
    tube.position.set(baseX + side * 0.015, baseY - 0.01, baseZ - 0.01);
    g.add(tube);

    const capGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.018, 8);
    const cap = new THREE.Mesh(capGeo, M.orange);
    cap.rotation.x = Math.PI / 2;
    cap.position.set(baseX - side * 0.008, baseY + 0.10, baseZ + 0.005);
    g.add(cap);
  }
  addMechaCluster(-1);
  addMechaCluster(1);

  return g;
}
