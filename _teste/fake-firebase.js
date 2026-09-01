/* Firebase simulado para o harness de teste local — NUNCA vai para o repo.
   Serve o objecto global ZZT_FIXTURE em vez do RTDB. */
(function (g) {
  function get(path) {
    var cur = g.ZZT_FIXTURE;
    var parts = String(path).split('/').filter(Boolean);
    for (var i = 0; i < parts.length; i++) {
      if (cur == null || typeof cur !== 'object') return null;
      cur = cur[parts[i]];
    }
    return cur === undefined ? null : cur;
  }
  g.ZZT_ESCRITAS = [];
  function ref(path) {
    return {
      on: function (ev, cb) { setTimeout(function () { cb({ val: function () { return get(path); } }); }, 0); },
      once: function (ev) { return Promise.resolve({ val: function () { return get(path); } }); },
      child: function (c) { return ref(path + '/' + c); },
      set: function (v) { g.ZZT_ESCRITAS.push({ path: path, op: 'set', valor: v }); return Promise.resolve(); },
      remove: function () { g.ZZT_ESCRITAS.push({ path: path, op: 'remove' }); return Promise.resolve(); },
      push: function (v) { g.ZZT_ESCRITAS.push({ path: path, op: 'push', valor: v }); return { key: 'zzt-push-key' }; }
    };
  }
  g.firebase = {
    initializeApp: function () {},
    database: function () { return { ref: ref }; },
    auth: function () {
      return {
        signInAnonymously: function () { return Promise.resolve({ user: { uid: 'zzt-teste' } }); },
        currentUser: { uid: 'zzt-teste' }
      };
    }
  };
})(window);
