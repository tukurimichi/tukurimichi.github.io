// parts/head.js
// 担当: 頭部
// 仕様: SPEC.md §3-1（形状）・§2（座標規約）を必ず参照すること。
//
// ローカル座標規約（SPEC.md §2）:
//   ローカル原点 (0,0,0) = headBottom（顎下・首の付け根、mascot.js側で y=1.22 に配置される）
//   ローカル y=0.78 付近 = headTopCenter（頭シェル最上部）
//   +Z = 正面
//
// 角丸ボックスは three.module.js に RoundedBoxGeometry が無いため、
// 角丸の2D Shape（ExtrudeGeometryのbevel込み）で自作している（roundedBoxGeo）。

export function build(THREE, M) {
  const g = new THREE.Group();
  g.name = 'head';

  const HEIGHT = 0.78;
  const HALF_W = 0.46;
  const DEPTH = 0.68;

  // ---------------------------------------------------------------
  // ヘルパー
  // ---------------------------------------------------------------

  // 角丸の長方形Shape（w,hは全幅・全高、原点中心）
  function roundedRectShape(w, h, r) {
    const shape = new THREE.Shape();
    const x = -w / 2;
    const y = -h / 2;
    shape.moveTo(x, y + r);
    shape.lineTo(x, y + h - r);
    shape.quadraticCurveTo(x, y + h, x + r, y + h);
    shape.lineTo(x + w - r, y + h);
    shape.quadraticCurveTo(x + w, y + h, x + w, y + h - r);
    shape.lineTo(x + w, y + r);
    shape.quadraticCurveTo(x + w, y, x + w - r, y);
    shape.lineTo(x + r, y);
    shape.quadraticCurveTo(x, y, x, y + r);
    return shape;
  }

  // 四隅（XY）も前後（Z）も丸い「角丸ボックス」。
  // ExtrudeGeometryのbevelで前後エッジも丸め、Z方向中心が原点に来るよう平行移動する。
  function roundedBoxGeo(w, h, depth, radius, segments = 5) {
    const r = Math.max(0.001, Math.min(radius, w / 2 - 0.001, h / 2 - 0.001));
    const shape = roundedRectShape(w, h, r);
    // straightDepth(平らな側面)が潰れて0近くになるとbevel同士が食い込み、
    // 法線が乱れてシェーディングアーティファクトが出るため、depthに対して
    // bevelSizeを控えめに抑える(最低でも depth の40%は平らな壁として残す)。
    const bevelSize = Math.max(0.001, Math.min(r * 0.6, depth * 0.3));
    const straightDepth = Math.max(depth - bevelSize * 2, 0.002);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: straightDepth,
      bevelEnabled: true,
      bevelThickness: bevelSize,
      bevelSize: bevelSize,
      bevelSegments: segments,
      curveSegments: segments,
      steps: 1,
    });
    // ExtrudeGeometryのZ方向オフセットは内部実装依存で当てにできないため、
    // 実測のbounding boxから正確にZ中心を0へ揃える(前面がちょうど+depth/2に来るように)。
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    geo.translate(0, 0, -(bb.max.z + bb.min.z) / 2);
    return geo;
  }

  function addMesh(geo, mat, x, y, z, outlineThickness) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    g.add(mesh);
    if (outlineThickness) M.addOutline(mesh, outlineThickness);
    return mesh;
  }

  // ===================================================================
  // 外殻（オレンジ）: 頭部全体シルエット。角丸の横長ヘルメット状。
  // ===================================================================
  const shellGeo = roundedBoxGeo(HALF_W * 2, HEIGHT, DEPTH, 0.18, 5);
  addMesh(shellGeo, M.orange, 0, HEIGHT / 2, 0, 0.03);

  const SHELL_FRONT_Z = DEPTH / 2; // 0.35

  // ===================================================================
  // フェイスプレート（クリーム白）: 正面中央〜上寄りを覆う角丸パネル。
  // 外殻より一段前に張り出して段差を作る。
  // ===================================================================
  const FACE_W = 0.78;
  const FACE_H = 0.62;
  const FACE_Y = 0.42;
  const FACE_DEPTH = 0.1;
  const FACE_FRONT_Z = SHELL_FRONT_Z + 0.05; // 段差で少し前に出る
  const faceGeo = roundedBoxGeo(FACE_W, FACE_H, FACE_DEPTH, 0.1, 4);
  addMesh(faceGeo, M.cream, 0, FACE_Y, FACE_FRONT_Z - FACE_DEPTH / 2, 0.02);

  // フェイスプレート最上部の小さな長方形パネルの筋
  const browPanelGeo = new THREE.BoxGeometry(0.4, 0.05, 0.02);
  addMesh(browPanelGeo, M.cream, 0, FACE_Y + FACE_H / 2 - 0.06, FACE_FRONT_Z + 0.01);

  // ===================================================================
  // スクリーン（焦げ茶）: フェイスプレートに一段凹んではめ込まれた目の窓。
  // ===================================================================
  const SCREEN_W = 0.59;
  const SCREEN_H = 0.35;
  const SCREEN_Y = 0.4;
  const SCREEN_DEPTH = 0.06;
  // 中身が詰まった箱同士なので、文字通り凹ませる(奥に置く)とフェイスプレートの
  // 前面キャップに完全に覆われて見えなくなってしまう。そのためスクリーンは
  // フェイスプレートよりわずかに前へ出す(=一段せり出す)ことで視認性を確保し、
  // 縁の黒アウトライン＋濃色で「はめ込まれた窓」の見た目を作る。
  const SCREEN_FRONT_Z = FACE_FRONT_Z + 0.015;
  const screenGeo = roundedBoxGeo(SCREEN_W, SCREEN_H, SCREEN_DEPTH, 0.07, 4);
  addMesh(screenGeo, M.darkBrown, 0, SCREEN_Y, SCREEN_FRONT_Z - SCREEN_DEPTH / 2, 0.015);

  // ===================================================================
  // 目（オレンジの丸2つ）
  // ===================================================================
  const EYE_Z = SCREEN_FRONT_Z + 0.025;
  const eyeGeo = new THREE.CircleGeometry(0.075, 20);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, M.orangeLight);
    eye.name = side < 0 ? 'eyeL' : 'eyeR'; // 待機モーションの瞬き用にindex.html側から参照
    eye.position.set(side * 0.14, SCREEN_Y, EYE_Z);
    eye.castShadow = false;
    eye.receiveShadow = false;
    g.add(eye);
  }

  // ===================================================================
  // 反射ハイライト（水色、右上に斜め帯）
  // ===================================================================
  {
    // スクリーン右上、目より上に来るよう絶対座標で直接定義(目やスクリーン縁と重ならない範囲)
    const hlShape = new THREE.Shape();
    hlShape.moveTo(0.05, 0.43);
    hlShape.lineTo(0.26, 0.56);
    hlShape.lineTo(0.2, 0.56);
    hlShape.lineTo(-0.01, 0.43);
    hlShape.closePath();
    const hlGeo = new THREE.ShapeGeometry(hlShape, 8);
    const hl = new THREE.Mesh(hlGeo, M.skyBlue);
    hl.position.set(0, 0, SCREEN_FRONT_Z + 0.02);
    hl.castShadow = false;
    hl.receiveShadow = false;
    g.add(hl);
  }

  // ===================================================================
  // 耳パーツ（左右側面、オレンジ）: 目の高さあたりに張り出す丸みブロック。
  // ===================================================================
  const EAR_W = 0.19; // X方向(張り出し)
  const EAR_H = 0.28;
  const EAR_D = 0.36;
  const EAR_Y = 0.4;
  const EAR_Z = 0.05; // 頭の中心よりやや前寄り(顔まわりに揃える)
  const EAR_FRONT_Z = EAR_Z + EAR_D / 2; // 耳の前面(+Z側の面。前面〜斜めから見た時に主に見える面)
  const earGeo = roundedBoxGeo(EAR_W, EAR_H, EAR_D, 0.06, 4);
  // 耳前面に重ねるクリーム白パネル(オレンジ外殻に埋没しないよう、別パーツとして
  // 読めるようにする。参考画像: 白い枠にオレンジ、内側に焦げ茶の縦スロット)
  const earPanelGeo = roundedBoxGeo(EAR_W * 0.72, EAR_H * 0.82, 0.05, 0.04, 4);
  for (const side of [-1, 1]) {
    const earX = side * (HALF_W - 0.02 + EAR_W / 2);
    addMesh(earGeo, M.orange, earX, EAR_Y, EAR_Z, 0.02);
    addMesh(earPanelGeo, M.cream, earX, EAR_Y, EAR_FRONT_Z + 0.01, 0.015);

    // 内側(頭中心寄り)の縦長スロット(濃茶)。耳の前面、中に埋もれないよう表面よりわずかに前へ出す。
    const slotGeo = new THREE.BoxGeometry(0.03, EAR_H * 0.55, 0.014);
    const slot = new THREE.Mesh(slotGeo, M.darkBrown);
    slot.position.set(earX - side * (EAR_W / 2 - 0.035), EAR_Y, EAR_FRONT_Z + 0.035);
    g.add(slot);

    // 下側のビス(耳前面、下寄り)
    const boltGeo = new THREE.SphereGeometry(0.022, 10, 10);
    const bolt = new THREE.Mesh(boltGeo, M.bolt);
    bolt.position.set(earX, EAR_Y - EAR_H / 2 + 0.03, EAR_FRONT_Z + 0.038);
    g.add(bolt);
  }

  // ===================================================================
  // 頭頂のパネルライン（浅いへこみ、額の少し上に横並び2本）
  // ===================================================================
  {
    // shellの前面フラットキャップ(SHELL_FRONT_Z)よりわずかに前へ出して埋没を防ぐ。
    // yはトップ端(0.78)からbevel分(約0.11)以上離しておき、丸め領域の外側=確実な平面に置く。
    const lineGeo = new THREE.BoxGeometry(0.15, 0.018, 0.02);
    for (const side of [-1, 1]) {
      const line = new THREE.Mesh(lineGeo, M.darkBrown);
      line.position.set(side * 0.1, 0.6, SHELL_FRONT_Z + 0.008);
      g.add(line);
    }
  }

  // ===================================================================
  // その他ビス（外殻とフェイスプレートの継ぎ目、顎ライン付近）
  // ===================================================================
  {
    const boltGeo = new THREE.SphereGeometry(0.022, 10, 10);
    const positions = [
      [-0.33, 0.08, SHELL_FRONT_Z + 0.01],
      [0.33, 0.08, SHELL_FRONT_Z + 0.01],
      [-0.37, 0.55, SHELL_FRONT_Z - 0.08],
    ];
    for (const [x, y, z] of positions) {
      const bolt = new THREE.Mesh(boltGeo, M.bolt);
      bolt.position.set(x, y, z);
      g.add(bolt);
    }
  }

  // ===================================================================
  // 頭頂のアンテナ（焦げ茶の軸＋オレンジの球）
  // antennaBase(mascot座標) = (0.05, 2.00, 0.02) → head local = (0.05, 0.78, 0.02)
  // ===================================================================
  const ANT_X = 0.05;
  const ANT_Z = 0.02;
  const ANT_LEN = 0.14;
  // アンテナ根元を1つのGroupにまとめ、その回転を待機モーション(揺れ)の
  // アニメーション対象にする(index.html側が 'antennaGroup' で参照)。
  const antennaGroup = new THREE.Group();
  antennaGroup.name = 'antennaGroup';
  antennaGroup.position.set(ANT_X, HEIGHT, ANT_Z);
  g.add(antennaGroup);

  const antennaGeo = new THREE.CylinderGeometry(0.02, 0.022, ANT_LEN, 10);
  const antenna = new THREE.Mesh(antennaGeo, M.darkBrown);
  antenna.position.set(0, ANT_LEN / 2, 0);
  antennaGroup.add(antenna);
  M.addOutline(antenna, 0.05);

  const tipGeo = new THREE.SphereGeometry(0.06, 16, 16);
  const tip = new THREE.Mesh(tipGeo, M.orangeLight);
  tip.position.set(0, ANT_LEN + 0.01, 0);
  antennaGroup.add(tip);
  M.addOutline(tip, 0.04);

  return g;
}
