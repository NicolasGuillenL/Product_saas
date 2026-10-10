/*
 * Widget de comparação de preços.
 * Uso: <div id="preco-certo"></div>
 *      <script src="https://SUA-API/widget.js" data-key="SUA_API_KEY" data-limit="10" defer></script>
 */
(function () {
  var script = document.currentScript;
  var apiBase = new URL(script.src).origin;
  var key = script.getAttribute('data-key');
  var limit = script.getAttribute('data-limit') || '10';
  var target = document.querySelector(script.getAttribute('data-target') || '#preco-certo');
  if (!target || !key) return console.warn('[preco-certo] faltando data-key ou elemento alvo');

  var root = target.attachShadow({ mode: 'open' });
  root.innerHTML =
    '<style>' +
    ':host{all:initial;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1d1d1f;display:block}' +
    'form{display:flex;gap:8px;margin-bottom:16px}' +
    'input{flex:1;padding:12px 14px;border:1px solid #d0d0d5;border-radius:10px;font-size:16px}' +
    'button{padding:12px 18px;border:0;border-radius:10px;background:#ee4d2d;color:#fff;font-size:16px;cursor:pointer}' +
    'button:disabled{opacity:.6}' +
    '.list{display:grid;gap:10px}' +
    'a.card{display:flex;gap:12px;align-items:center;padding:10px;border:1px solid #e6e6ea;border-radius:12px;text-decoration:none;color:inherit;background:#fff}' +
    'a.card:hover{border-color:#ee4d2d}' +
    'img{width:64px;height:64px;object-fit:cover;border-radius:8px;background:#f2f2f5;flex:none}' +
    '.info{flex:1;min-width:0}.title{font-size:14px;line-height:1.3;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}' +
    '.store{font-size:12px;color:#6e6e73;margin-top:4px}.price{font-weight:700;font-size:17px;white-space:nowrap}' +
    '.rank{font-size:12px;color:#6e6e73;width:20px;text-align:center}.msg{color:#6e6e73;font-size:14px;padding:8px 0}' +
    '</style>' +
    '<form><input name="q" placeholder="O que você procura? Ex.: mesa inox" required minlength="2" maxlength="100">' +
    '<button>Buscar</button></form><div class="msg" hidden></div><div class="list"></div>';

  var form = root.querySelector('form');
  var btn = root.querySelector('button');
  var msg = root.querySelector('.msg');
  var list = root.querySelector('.list');
  var brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function say(text) { msg.hidden = !text; msg.textContent = text || ''; }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var q = form.q.value.trim();
    btn.disabled = true; list.innerHTML = ''; say('Buscando os menores preços...');
    fetch(apiBase + '/api/search?key=' + encodeURIComponent(key) + '&limit=' + limit + '&q=' + encodeURIComponent(q))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) return say(data.error);
        if (!data.products.length) return say('Nenhum produto encontrado. Tente outros termos.');
        say('');
        data.products.forEach(function (p, i) {
          var a = el('a', 'card');
          a.href = p.link; a.target = '_blank'; a.rel = 'noopener sponsored';
          var img = el('img'); img.src = p.imageUrl || ''; img.alt = ''; img.loading = 'lazy';
          var info = el('div', 'info');
          info.appendChild(el('div', 'title', p.title));
          info.appendChild(el('div', 'store', p.store));
          a.appendChild(el('span', 'rank', String(i + 1)));
          a.appendChild(img); a.appendChild(info);
          a.appendChild(el('span', 'price', brl.format(p.price)));
          list.appendChild(a);
        });
      })
      .catch(function () { say('Não foi possível buscar agora. Tente novamente.'); })
      .finally(function () { btn.disabled = false; });
  });
})();
