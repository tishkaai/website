<script>
(function(){
  var modal = document.getElementById('usermodal');
  var darkBtn = document.getElementById('theme-dark');
  var lightBtn = document.getElementById('theme-light');
  var chatpanel = document.getElementById('chatpanel');
  var chatbtn = document.getElementById('chatbtn');
  var ctxlabel = document.getElementById('ctxlabel');
  var cpbody = document.getElementById('cpbody');

  function applyTheme(dark){
    document.documentElement.classList.toggle('dark', dark);
    try { localStorage.setItem('tishka-theme', dark ? 'dark' : 'light'); } catch(e){}
    darkBtn.classList.toggle('active-theme', dark);
    lightBtn.classList.toggle('active-theme', !dark);
  }
  applyTheme(document.documentElement.classList.contains('dark'));

  var VIEWS = ['brief','clients','leads','delivery','reporting','finance','files'];
  var defaultCtx = { brief:'On: morning brief', clients:'On: clients', leads:'On: leads',
    delivery:'On: delivery', reporting:'On: reporting', finance:'On: finance', files:'On: files' };
  function show(view){
    VIEWS.forEach(function(v){
      var el = document.getElementById('view-' + v); if (el) el.classList.toggle('hidden', v !== view);
    });
    document.querySelectorAll('[data-sidebar="menu-button"]').forEach(function(a){
      if (a.dataset.view) a.setAttribute('data-active', a.dataset.view === view ? 'true' : 'false');
    });
    setCtx(defaultCtx[view] || view);
    window.scrollTo({ top: 0 });
  }
  function setCtx(t){ if (ctxlabel) ctxlabel.textContent = t; }
  function addMsg(who, text, msrc){
    var d = document.createElement('div'); d.className = 'msg ' + who; d.textContent = text;
    if (msrc) { var s = document.createElement('span'); s.className = 'msrc'; s.textContent = msrc; d.appendChild(s); }
    cpbody.appendChild(d); cpbody.scrollTop = cpbody.scrollHeight;
  }
  function highlight(el){
    if (!el) return;
    if (el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('hl');
    setTimeout(function(){ el.classList.remove('hl'); }, 3200);
  }
  function chatToggle(){
    var open = chatpanel.classList.toggle('open');
    chatbtn.setAttribute('aria-pressed', open ? 'true' : 'false');
  }

  // ONE delegated click handler for the whole page
  document.addEventListener('click', function(e){
    var t = e.target;
    if (!t || !t.closest) return;
    var el;

    if ((el = t.closest('#chatbtn'))) { chatToggle(); return; }
    if ((el = t.closest('#theme-dark'))) { applyTheme(true); return; }
    if ((el = t.closest('#theme-light'))) { applyTheme(false); return; }
    if ((el = t.closest('#userbtn'))) { modal.classList.add('open'); return; }
    if ((el = t.closest('#usermodal'))) { if (e.target === modal) modal.classList.remove('open'); return; }
    if ((el = t.closest('.tick-item'))) { el.classList.toggle('done'); return; }
    if ((el = t.closest('[data-goto]'))) {
      show(el.getAttribute('data-goto'));
      var target = document.getElementById(el.getAttribute('data-target'));
      setTimeout(function(){ highlight(target); }, 80);
      return;
    }
    if ((el = t.closest('[data-view]'))) { e.preventDefault(); show(el.getAttribute('data-view')); return; }
    if ((el = t.closest('[data-ctx]'))) {
      chatpanel.classList.add('open');
      chatbtn.setAttribute('aria-pressed', 'true');
      var c = el.getAttribute('data-ctx');
      if (c) { setCtx('On: ' + c.toLowerCase()); addMsg('me', 'Tell me about ' + c.split('\u00b7')[1].trim() + '.'); }
      addMsg('ai', 'I can walk you through it.', 'Read from this page \u00b7 demo copy');
      return;
    }
  });

  document.getElementById('cpsend').addEventListener('click', function(){
    var inp = document.getElementById('cpin'); if (!inp.value.trim()) return;
    addMsg('me', inp.value.trim()); inp.value = '';
    setTimeout(function(){ addMsg('ai', 'In the live app I answer from your records and act on the page you are on: ' + ctxlabel.textContent + '.', 'Demo answer \u00b7 not live'); }, 250);
  });
  document.getElementById('cpin').addEventListener('keydown', function(e){ if (e.key === 'Enter') document.getElementById('cpsend').click(); });

  var initial = new URLSearchParams(window.location.search).get('view');
  show(initial || 'brief');
})();
</script>