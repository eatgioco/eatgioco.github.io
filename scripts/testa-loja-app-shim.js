/* Shim mínimo do Firebase compat v8 para testes: memória + registo de escritas.
   window.__FB = { store, writes, online, setOnline(bool) } */
(function(){
 var store={};try{store=JSON.parse(localStorage.getItem('__fbshim')||'{}');}catch(e){}
 function persist(){try{localStorage.setItem('__fbshim',JSON.stringify(store));}catch(e){}}var writes=[];var listeners=[];var online=true;var pendentes=[];
 function get(path){var o=store;path.split('/').filter(Boolean).forEach(function(k){o=(o&&typeof o==='object')?o[k]:undefined;});return o===undefined?null:o;}
 function setPath(path,v){var parts=path.split('/').filter(Boolean),o=store;
  for(var i=0;i<parts.length-1;i++){if(!o[parts[i]]||typeof o[parts[i]]!=='object')o[parts[i]]={};o=o[parts[i]];}
  if(v===null||v===undefined)delete o[parts[parts.length-1]];else o[parts[parts.length-1]]=JSON.parse(JSON.stringify(v));}
 function snap(path,val){return {val:function(){return val===undefined?null:JSON.parse(JSON.stringify(val));},key:path.split('/').pop()};}
 function notify(){persist();listeners.forEach(function(l){l.cb(snap(l.path,l.q(get(l.path))));});}
 function ref(path){
  path=(path||'').replace(/^\/+|\/+$/g,'');
  var q=function(v){return v;};
  var r={
   path:path,
   child:function(c){return ref(path+'/'+c);},
   push:function(){var k='-P'+Math.random().toString(36).slice(2,10);return ref(path+'/'+k);},
   set:function(v){
    writes.push({path:path,valor:JSON.parse(JSON.stringify(v===undefined?null:v)),em:Date.now(),online:online});
    setPath(path,v);notify();
    if(online)return Promise.resolve();
    return new Promise(function(res){pendentes.push(res);});
   },
   update:function(v){writes.push({path:path,update:v,online:online});Object.keys(v).forEach(function(k){setPath(path+'/'+k,v[k]);});notify();return Promise.resolve();},
   remove:function(){writes.push({path:path,remove:true});setPath(path,null);notify();return Promise.resolve();},
   orderByKey:function(){return r;},
   limitToLast:function(n){var q0=q;q=function(v){v=q0(v);if(!v||typeof v!=='object')return v;var ks=Object.keys(v).sort().slice(-n),o={};ks.forEach(function(k){o[k]=v[k];});return o;};return r;},
   on:function(ev,cb){var l={path:path,cb:cb,q:q};listeners.push(l);
    if(path==='.info/connected'){l.q=function(){return online;};}
    if(online||path==='.info/connected')setTimeout(function(){cb(snap(path,l.q(get(path))));},0);return cb;},
   off:function(){},
   once:function(){return Promise.resolve(snap(path,q(get(path))));}
  };
  return r;
 }
 window.firebase={
  initializeApp:function(){},
  auth:function(){return {signInAnonymously:function(){return Promise.resolve({});}};},
  database:function(){return {ref:ref};}
 };
 window.__FB={store:store,writes:writes,get:get,seed:function(p,v){setPath(p,v);notify();},
  setOnline:function(b){online=b;if(b){var p=pendentes;pendentes=[];p.forEach(function(r){r();});}notify();},
  isOnline:function(){return online;}};
})();
