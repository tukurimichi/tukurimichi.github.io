// ===== つくるみち／おこづかい1万円の残高データ =====
//
// **このファイルだけ直せば、トップページも money.html も同時に変わる。**
// 使ったお金が増えたら SPENDS に1行足すだけ。
//
//   date : 日付（表示用の文字列）
//   ja   : 日本語の説明
//   en   : 英語の説明
//   out  : 出ていったお金（円）
//   in   : 入ってきたお金（円）
//
// 0円の出来事も「何もかからなかった」という記録として残している。
var BUDGET = 10000;      // 予算
var COIN = 1000;         // コイン1枚ぶん
var SPENDS = [
  { date:"2026.08.18", ja:"SupaVoxel（AIで3Dモデルを作るサービス）初月ぶん。じゃんけんのグー・チョキ・パーを本物の3Dにするため", en:"SupaVoxel (AI 3D model generator), first month — to turn the rock-paper-scissors hands into real 3D models", out:1400, in:0 },
  { date:"2026.08.22", ja:"マスコットのスクイーズASMR動画をAIで生成。元から入っていたGoogle AI Proの範囲で作れたので、追加の支払いはなし", en:"Generated the mascot squishy ASMR clips with AI — covered by a Google AI Pro plan I already had, so nothing extra was paid", out:0, in:0 },
  { date:"2026.08.23", ja:"Kling AI（動画生成）Standardの初月。無料枠だと1日1本しか作れず、30秒の動画が組めないため。決めたルールの「1回1,000円まで」を271円超えた", en:"Kling AI (video generation), first month of Standard — the free tier only allows one clip a day, which is not enough to build a 30-second piece. This is ¥271 over our own ¥1,000-per-spend rule", out:1271, in:0 }
];
