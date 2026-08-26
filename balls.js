/* balls.js - サイトのあちこちに玉を落としておく道具
 *
 * 各ページに <script src="balls.js" defer></script> を1行足すだけで動く。
 * 拾った玉は、パチンコ台（pachi3d.html）の持ち玉に加算される。
 *
 * **お金では買えないし、何にも換えられない。** ただの得点。
 *
 * 置く場所は、ページごとに決まった疑似乱数で決める（毎回同じ場所に出る）。
 * 完全な乱数にすると「さっき見たのに無い」が起きて、探す気が失せる。
 */
(function () {
  var STOCK_KEY = "tsukurimichi_pachi_balls";   // パチンコ台と共通
  var GOT_KEY = "tsukurimichi_balls_got";       // 拾い終えた玉の目印
  var PER = 3;                                  // 1個あたりの玉数
  var GOLD_KEY = "tsukurimichi_gold";           // 金の玉が今どのページに居るか
  var GOLD_PER = 50;                            // 金の玉は50玉

  // ページごとの個数。合計で50玉ぶんになるように配る
  var PLAN = {
    "index": 2, "story": 2, "play": 2, "diary": 2, "money": 2,
    "made": 1, "tips": 1, "changelog": 1, "claude-code": 1,
    "mascot3d": 1, "papercraft": 1, "wallpapers": 1, "soap": 1,
    "video": 1, "tools": 1, "credit": 1
  };  // 合計21個 x 3玉 = 63玉ぶん（全部見つければ）

  function pageKey() {
    var p = location.pathname.replace(/\/+$/, "");
    var f = p.substring(p.lastIndexOf("/") + 1) || "index";
    return f.replace(/\.html?$/i, "") || "index";
  }

  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h;
  }

  function rnd(seed) {           // 種から0〜1の値を作る
    var x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  function got() {
    try { return JSON.parse(localStorage.getItem(GOT_KEY) || "[]"); }
    catch (e) { return []; }
  }

  function addStock(n) {
    var v = 0;
    try { v = parseInt(localStorage.getItem(STOCK_KEY) || "250", 10) || 0; } catch (e) { }
    try { localStorage.setItem(STOCK_KEY, String(v + n)); } catch (e) { }
    return v + n;
  }

  function toast(text) {
    var t = document.createElement("div");
    t.textContent = text;
    t.style.cssText =
      "position:fixed;left:50%;bottom:26px;transform:translateX(-50%);" +
      "background:#141416;border:1px solid #F0913F;color:#F0913F;" +
      "font:700 13px/1 -apple-system,BlinkMacSystemFont,sans-serif;" +
      "padding:10px 16px;border-radius:20px;z-index:99999;opacity:0;" +
      "transition:opacity .2s,transform .3s;pointer-events:none;";
    document.body.appendChild(t);
    requestAnimationFrame(function () {
      t.style.opacity = "1";
      t.style.transform = "translateX(-50%) translateY(-6px)";
    });
    setTimeout(function () {
      t.style.opacity = "0";
      setTimeout(function () { t.remove(); }, 300);
    }, 1600);
  }

  /* ===== 金の玉 =====
     サイト全体で1個だけ。取ると、また別のページへ移る。
     いまは端末ごとに1個（サーバーが無いので、訪問者どうしでは共有できない）。
     人が増えたら、置き場所だけをサーバーに移せば「みんなで1個」に載せ替えられる。 */
  function goldPages() {
    var a = [];
    for (var k in PLAN) if (PLAN.hasOwnProperty(k)) a.push(k);
    return a;
  }

  function goldWhere() {
    var v = null;
    try { v = localStorage.getItem(GOLD_KEY); } catch (e) { }
    if (!v) {
      var a = goldPages();
      v = a[Math.floor(Math.random() * a.length)];
      try { localStorage.setItem(GOLD_KEY, v); } catch (e) { }
    }
    return v;
  }

  function moveGold(from) {
    var a = goldPages().filter(function (k) { return k !== from; });
    var to = a[Math.floor(Math.random() * a.length)];
    try { localStorage.setItem(GOLD_KEY, to); } catch (e) { }
  }

  function placeGold(key, docH) {
    if (goldWhere() !== key) return;
    var s = hash("gold:" + key + ":" + (Date.now() / 86400000 | 0));
    var x = 8 + rnd(s * 0.9) * 78;
    var y = 0.24 + rnd(s * 1.7) * 0.64;

    var b = document.createElement("button");
    b.setAttribute("aria-label", "金の玉を拾う");
    b.style.cssText =
      "position:absolute;width:30px;height:30px;padding:0;border:0;" +
      "border-radius:50%;cursor:pointer;z-index:9999;" +
      "background:radial-gradient(circle at 32% 26%,#fff6d8 0%,#f6d27a 34%,#d09a2c 70%,#7a5510 100%);" +
      "box-shadow:0 0 14px rgba(240,180,60,.55),0 2px 8px rgba(0,0,0,.6)," +
      "0 0 0 1px rgba(255,255,255,.28) inset;" +
      "left:" + x + "%;top:" + Math.round(y * docH) + "px;" +
      "animation:ballBob 2.2s ease-in-out infinite;";
    b.addEventListener("click", function (ev) {
      ev.preventDefault();
      var el = ev.currentTarget;
      addStock(GOLD_PER);
      moveGold(key);
      el.style.transition = "transform .45s,opacity .45s";
      el.style.transform = "translateY(-40px) scale(.3)";
      el.style.opacity = "0";
      setTimeout(function () { el.remove(); }, 460);
      toast("金の玉！ " + GOLD_PER + " 個");
      if (window.gtag) gtag("event", "gold_pick", { page: key });
    });
    document.body.appendChild(b);
  }

  function place() {
    var key = pageKey();
    var docH = Math.max(document.body.scrollHeight, window.innerHeight);
    var n = PLAN[key];
    if (!n) { placeGold(key, docH); return; }

    var taken = got();

    for (var i = 0; i < n; i++) {
      var id = key + ":" + i;
      if (taken.indexOf(id) >= 0) continue;

      var s = hash(id);
      // 上端は避ける（帯やメニューに重なるため）。左右も端から少し内側に
      var x = 6 + rnd(s * 0.7) * 82;                 // 画面幅に対する%
      var y = 0.22 + rnd(s * 1.3) * 0.68;            // ページの高さに対する割合

      var b = document.createElement("button");
      b.setAttribute("aria-label", "玉を拾う");
      b.dataset.id = id;
      b.style.cssText =
        "position:absolute;width:22px;height:22px;padding:0;border:0;" +
        "border-radius:50%;cursor:pointer;z-index:9998;" +
        "background:radial-gradient(circle at 32% 28%,#ffffff 0%,#d7dbe2 38%,#8f959f 72%,#4a4f57 100%);" +
        "box-shadow:0 2px 6px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.18) inset;" +
        "left:" + x + "%;top:" + Math.round(y * docH) + "px;" +
        "animation:ballBob 2.6s ease-in-out infinite;";
      b.addEventListener("click", function (ev) {
        ev.preventDefault();
        var el = ev.currentTarget;
        var list = got();
        if (list.indexOf(el.dataset.id) >= 0) return;
        list.push(el.dataset.id);
        try { localStorage.setItem(GOT_KEY, JSON.stringify(list)); } catch (e) { }
        addStock(PER);
        el.style.transition = "transform .35s,opacity .35s";
        el.style.transform = "translateY(-28px) scale(.4)";
        el.style.opacity = "0";
        setTimeout(function () { el.remove(); }, 360);
        toast("玉を " + PER + " 個ひろった");
        if (window.gtag) gtag("event", "ball_pick", { page: pageKey() });
      });
      document.body.appendChild(b);
    }

    placeGold(key, docH);

    var st = document.createElement("style");
    st.textContent =
      "@keyframes ballBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}" +
      "@media (prefers-reduced-motion:reduce){[aria-label='玉を拾う'],[aria-label='金の玉を拾う']{animation:none!important}}";
    document.head.appendChild(st);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(place, 300); });
  } else {
    setTimeout(place, 300);
  }
})();
