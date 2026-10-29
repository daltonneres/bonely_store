/* Bonely Store | Midily Gestão (página privada, só da Gabriely)
   Carregar DEPOIS de firebase.js e midily-core.js.
   Fluxo: login (Firebase) -> escolhe o setor (Moda ou Importados) -> chat.
   100% local: sem IA externa e sem chave de API. A Midily entende comandos em português, faz contas, sugere ajustes e usa os atalhos.
   Toda alteração mostra um cartão de confirmação e só grava na nuvem depois do toque em "Confirmar". */
(function(){
'use strict';
const C=window.MidilyCore,OWNER='Gabriely',ADMIN_EMAIL='midily@bonelystore.com'; /* usuário só da Midily (autorizado no firebase.js e nas regras) */
const isMe=()=>!!(FB.user&&String(FB.user.email||'').toLowerCase()===ADMIN_EMAIL);
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=C.money,norm=C.norm;
const fmt=t=>esc(t).replace(/^[-*•]\s+/gm,'• ').replace(/\*\*([^*]+)\*\*|\*([^*\n]+)\*/g,(m,a,b)=>'<b>'+(a||b)+'</b>').replace(/\n/g,'<br>');
const num=s=>{const v=parseFloat(String(s).replace(',','.'));return Number.isFinite(v)?v:NaN};
const IC={
 plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
 out:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
 clip:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.4 11.1l-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/></svg>',
 send:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>'
};
const AREAS={moda:{n:'Moda',d:'Roupas femininas e masculinas, combos e coleções'},importados:{n:'Importados',d:'Produtos importados, entrega regional ou retirada'}};
const TITLES={adjust_stock:'Ajustar estoque',create_product:'Novo produto',update_product:'Alterar produto',manage_photos:'Fotos do produto',register_expense:'Novo lançamento',register_sale:'Registrar venda'};

const S={};
const ST={area:'',msgs:[],busy:false,photos:{},nPhoto:0,uid:0,pending:[],lastLoad:0,gen:0,saveErr:false};
let core=null;
window.__midily={S,ST};

/* ---------- dados ---------- */
async function reload(){await FB.loadAdmin(S);ST.lastLoad=Date.now()}
async function freshen(){if(Date.now()-ST.lastLoad>120000)await reload()}
async function commit(){
 if(!(FB.on&&FB.admin&&FB.loaded))return false;
 ST.saveErr=false;await FB.flush(S);return !ST.saveErr;
}
/* valida de novo com os dados mais recentes, aplica e grava na nuvem */
async function execPlan(name,input){
 try{
  await freshen();
  const pl=core.PLAN[name](input);if(!pl.ok)return pl;
  const out=await pl.apply();
  if(out&&out.ok===false)return out;
  if(!(await commit())){await reload().catch(()=>{});return{ok:false,error:'Não consegui salvar na nuvem agora (conexão?). Nada foi alterado.'}}
  return out;
 }catch(e){console.error('Midily',e);await reload().catch(()=>{});return{ok:false,error:'Algo deu errado ao salvar. Nada foi alterado.'}}
}

/* ---------- telas ---------- */
function lockInfo(){try{const v=JSON.parse(localStorage.getItem('mdl_f')||'{}');return{n:+v.n||0,u:+v.u||0}}catch(e){return{n:0,u:0}}}
function lockSet(o){try{localStorage.setItem('mdl_f',JSON.stringify(o))}catch(e){}}
function viewGate(msg){
 $('#root').innerHTML=`<div class="gate"><form id="lf" novalidate><div class="av" aria-hidden="true">M</div><h1>Midily · Gestão</h1><p class="sub">Área privada da ${esc(OWNER)}. Digite a sua senha de 6 dígitos.</p><input class="sr" type="email" autocomplete="username" value="${ADMIN_EMAIL}" readonly tabindex="-1" aria-hidden="true"><label for="lp">Senha</label><input id="lp" class="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="current-password" aria-describedby="le"><p class="err" id="le" role="alert">${esc(msg||'')}</p><button class="btn" type="submit">Entrar</button><small>Só a conta da loja tem acesso.</small></form></div>`;
 const form=$('#lf'),inp=$('#lp'),er=$('#le'),btn=form.querySelector('button');
 async function go(){
  const pw=inp.value.trim(),lk=lockInfo();
  if(lk.u>Date.now()){er.textContent='Muitas tentativas. Aguarde '+Math.ceil((lk.u-Date.now())/1000)+'s.';inp.value='';return}
  if(!/^\d{6}$/.test(pw)){er.textContent='A senha tem 6 números.';return}
  btn.disabled=true;btn.textContent='Entrando…';er.textContent='';
  try{
   if(isMe())await FB.confirmPw(pw);else await FB.login(ADMIN_EMAIL,pw);
   lockSet({n:0,u:0});try{sessionStorage.setItem('mdl','1')}catch(e){}
   await enter();
  }catch(x){
   console.warn(x);const m=FB.errMsg(x),bad=/^E-mail ou senha/.test(m),n=lk.n+(bad?1:0);
   lockSet({n:n>=5?0:n,u:n>=5?Date.now()+60000:0});
   viewGate(bad?(n>=5?'Senha incorreta 5 vezes. Aguarde 1 minuto.':'Senha incorreta.'):m);
  }
 }
 form.onsubmit=e=>{e.preventDefault();go()};
 inp.oninput=()=>{inp.value=inp.value.replace(/\D/g,'').slice(0,6);if(inp.value.length===6)go()};
 inp.focus();
}
function lockNow(msg){ST.gen++;Object.assign(ST,{area:'',msgs:[],busy:false,photos:{},nPhoto:0,pending:[]});try{sessionStorage.removeItem('mdl')}catch(e){}viewGate(msg||'')}
function viewMsg(t,retry){
 $('#root').innerHTML=`<div class="gate"><form onsubmit="return false"><div class="av" aria-hidden="true">M</div><h1>Midily · Gestão</h1><p class="sub">${esc(t)}</p>${retry?'<button class="btn" type="button" id="rt">Tentar de novo</button>':''}</form></div>`;
 if(retry)$('#rt').onclick=boot;
}
function mount(){
 $('#root').innerHTML=`<div class="top"><div class="av" aria-hidden="true">M</div><div class="tt"><b>Midily</b><small id="sub">Gestão da Bonely Store</small></div><button class="ibtn" id="bnew" type="button" aria-label="Nova conversa" title="Nova conversa">${IC.plus}</button><button class="ibtn" id="bout" type="button" aria-label="Sair" title="Sair">${IC.out}</button></div>
 <div id="ban"></div><div class="feed" id="feed" aria-live="polite"></div>
 <div class="dock"><div class="chips" id="chips"></div><div class="tray" id="tray"></div>
 <form class="bar" id="bar"><button class="ibtn" id="att" type="button" aria-label="Enviar fotos" title="Enviar fotos">${IC.clip}</button><input type="file" id="file" accept="image/*" multiple hidden><textarea id="ta" rows="1" maxlength="1500" aria-label="Mensagem para a Midily"></textarea><button class="ibtn send" id="snd" type="submit" aria-label="Enviar">${IC.send}</button></form></div>`;
 const feed=$('#feed'),ta=$('#ta');
 feed.addEventListener('click',onClick);feed.addEventListener('input',onInput);feed.addEventListener('change',onChange);
 $('#bar').addEventListener('submit',e=>{e.preventDefault();send()});
 ta.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)){e.preventDefault();send()}});
 ta.addEventListener('input',()=>{ta.style.height='auto';ta.style.height=Math.min(ta.scrollHeight,140)+'px'});
 $('#att').onclick=()=>{if(ST.area)$('#file').click()};
 $('#file').onchange=e=>{const fs=[...e.target.files];e.target.value='';addPhotos(fs)};
 $('#bnew').onclick=()=>{if(!ST.busy||confirm('Começar uma nova conversa? A atual será apagada.'))newChat()};
 $('#bout').onclick=async()=>{ST.gen++;await FB.logout();Object.assign(ST,{area:'',msgs:[],busy:false,photos:{},nPhoto:0,pending:[]});try{sessionStorage.removeItem('mdl')}catch(e){}viewGate('')};
}

/* ---------- mensagens ---------- */
function add(r,t,w,imgs){const m={r,t:t||'',w:w||null,imgs:imgs||[]};ST.msgs.push(m);paint();return m}
function msgHtml(m,i){
 if(m.r==='u')return `<div class="u" data-i="${i}">${m.imgs.length?`<div class="thumbs">${m.imgs.map(id=>`<img src="${ST.photos[id]||''}" alt="Foto enviada">`).join('')}</div>`:''}${fmt(m.t)}</div>`;
 const w=m.w;
 return `<div class="m${w?' w':''}${w&&w.state==='bad'?' err':''}" data-i="${i}">${m.t?`<div>${fmt(m.t)}</div>`:''}${w?widget(m,i):''}</div>`;
}
function widget(m){
 const w=m.w;
 if(w.type==='sector')return `<div class="sec-pick" style="margin-top:10px">${Object.keys(AREAS).map(k=>`<button type="button" data-act="sec" data-v="${k}"><b>${AREAS[k].n}</b><small>${AREAS[k].d}</small></button>`).join('')}</div>`;
 if(w.type==='confirm')return wConfirm(w);
 if(w.type==='sugg')return wSugg(w);
 if(w.type==='pick')return `<div class="wp"><b class="wt">${esc(w.prompt)}</b><div class="chips f">${[['all','Todos'],['com','Com estoque'],['sem','Sem estoque'],['low','Estoque baixo']].map(([k,l])=>`<button type="button" data-act="pf" data-v="${k}"${(w.f||'all')===k?' class="on"':''}>${l}</button>`).join('')}</div><input class="q" data-act="pq" placeholder="Buscar produto pelo nome" aria-label="Buscar produto" value="${esc(w.q)}" autocomplete="off"><div class="wl">${pickList(w)}</div></div>`;
 if(w.type==='sheet')return wSheet(w);
 if(w.type==='calc')return wCalc(w);
  return '';
}
function wConfirm(w){
 const th=w.photos&&w.photos.length?`<div class="thumbs">${w.photos.map(id=>`<img src="${ST.photos[id]||''}" alt="Foto">`).join('')}</div>`:'';
 const st={pending:`<div class="wa"><button class="btn" type="button" data-act="ok">Confirmar</button><button class="btn ghost" type="button" data-act="no">Cancelar</button></div>`,
  work:'<p class="wst">Salvando…</p>',done:`<p class="wst ok">${esc(w.msg||'Salvo.')}</p>`,bad:`<p class="wst bad">${esc(w.msg||'Não foi possível concluir.')}</p>`,cancel:'<p class="wst">Cancelado. Nada foi alterado.</p>'}[w.state]||'';
 return `<b class="wt">${esc(w.title)}</b>${th}<ul>${w.lines.map(l=>`<li>${fmt(l)}</li>`).join('')}</ul>${st}`;
}
function pickList(w){
 const k=norm(w.q),A=core.prods(),st=p=>+p.stock||0;
 const F={all:()=>true,com:p=>st(p)>0,sem:p=>st(p)<=0,low:p=>st(p)>0&&st(p)<=C.LOW}[w.f||'all'];
 const L=A.filter(p=>(!w.ids||w.ids.includes(String(p.id)))&&F(p)&&(!k||norm([p.name,p.color,p.brand,p.kind,p.coll].join(' ')).includes(k))).sort((a,b)=>String(a.name).localeCompare(b.name,'pt-BR'));
 const head=`<p class="wst" style="margin:0">${L.length} de ${A.length} produto(s)</p>`;
 if(!L.length)return head+'<p class="wst">Nenhum produto encontrado.</p>';
 return head+L.map(p=>`<button type="button" data-act="pp" data-pid="${esc(p.id)}"><span>${esc(p.name)}</span><small>${st(p)>0?st(p)+' em estoque':'<span class="dl n">Sem estoque</span>'} · ${esc(money(p.price))}</small></button>`).join('');
}
function wSugg(w){
 const n=w.items.length;
 return `<div class="wsg"><b class="wt">Sugestões · ${esc(AREAS[ST.area].n)}</b>${n?w.items.map((x,k)=>`<div class="sg"><div>${fmt(x.t)}</div>${x.a&&x.b?`<button class="btn sm ghost" type="button" data-act="sg" data-k="${k}">${esc(x.b)}</button>`:''}</div>`).join(''):'<p class="wst ok">Tudo em ordem por aqui.</p>'}${w.more?`<p class="wst">E mais ${w.more} sugestão(ões). Resolva estas e peça de novo.</p>`:''}</div>`;
}
function wSheet(w){
 const p=core.myProd(w.pid);if(!p)return '<p class="wst bad">Não encontrei esse produto.</p>';
  const sz=core.szOf(p),done=w.state==='done',sp=!core.canStk(p);
 const rows=sz.map((s,i)=>{
  const cur=sp?0:core.stkQ(p,s),v=w.draft[i]!==undefined?w.draft[i]:cur,d=v-cur;
  return `<div class="row"><div><b>${esc(s)}</b><small>agora: ${sp?'—':cur}${d&&!sp?` · <span class="dl${d<0?' n':''}">${d>0?'+':'−'}${Math.abs(d)}</span>`:''}</small></div><div class="step"><button type="button" data-act="sm" data-k="${i}" aria-label="Diminuir ${esc(s)}"${done?' disabled':''}>−</button><input type="number" min="0" inputmode="numeric" data-act="sv" data-k="${i}" value="${v}" aria-label="Quantidade ${esc(s)}"${done?' disabled':''}><button type="button" data-act="sp" data-k="${i}" aria-label="Aumentar ${esc(s)}"${done?' disabled':''}>+</button></div></div>`;
 }).join('');
 const foot=w.state==='done'?`<p class="wst ok">${esc(w.msg||'Salvo.')}</p>`:w.state==='bad'?`<p class="wst bad">${esc(w.msg)}</p><div class="wa"><button class="btn" type="button" data-act="sapply">Tentar de novo</button></div>`:w.state==='work'?'<p class="wst">Salvando…</p>':`<div class="wa"><button class="btn" type="button" data-act="sapply">Salvar ajuste</button><button class="btn ghost" type="button" data-act="sx">Fechar</button></div>`;
 return `<div class="wsh"><b class="wt">${esc(p.name)}</b><p class="wst" style="margin:0 0 6px">${sp?'Este produto tem '+(+p.stock||0)+' peça(s) no total, sem divisão. Informe quanto tem de cada '+(core.imp()?'opção':'tamanho')+' e salve.':'Ajuste para a quantidade que você tem agora em cada '+(core.imp()?'opção':'tamanho')+'.'}</p>${rows}${foot}</div>`;
}
function calcInfo(w){
 const p=core.myProd(w.pid),np=num(w.np),cost=w.cost===''?undefined:num(w.cost);
 if(!p||!(np>=0))return '<div><span>Informe o desconto ou o novo preço.</span></div>';
 const r=core.simulate({product_id:w.pid,new_price:np,cost:Number.isFinite(cost)?cost:undefined});if(!r.ok)return `<div><span>${esc(r.error)}</span></div>`;
 let h=`<div><span>Preço atual</span><b>${money(r.preco_atual)}</b></div><div><span>Novo preço</span><b>${money(r.novo_preco)}</b></div><div><span>Desconto</span><b>${r.desconto_percentual.toLocaleString('pt-BR')}%</b></div><div><span>Economia do cliente</span><b>${money(r.economia_por_peca)}</b></div>`;
 if(r.custo!==undefined)h+=`<div><span>Lucro por peça</span><b class="${r.lucro_por_peca_novo<0?'neg':''}">${money(r.lucro_por_peca_novo)}</b></div><div><span>Margem</span><b class="${r.margem_nova_percent<0?'neg':''}">${r.margem_nova_percent.toLocaleString('pt-BR')}%</b></div><div><span>Piso sem prejuízo</span><b>${money(r.preco_minimo_sem_prejuizo)}</b></div>`;
 return h;
}
function wCalc(w){
 const p=core.myProd(w.pid);if(!p)return '<p class="wst bad">Não encontrei esse produto.</p>';
 const promo=+p.oldPrice>+p.price;
 return `<div class="wcalc"><b class="wt">Desconto · ${esc(p.name)}</b><p class="wst" style="margin:0">Preço atual ${esc(money(p.price))}${promo?` (já em promoção, de ${esc(money(p.oldPrice))})`:''}</p>
 <div class="g2"><div><label for="cp${w.id}">Desconto (%)</label><input id="cp${w.id}" data-act="cp" inputmode="decimal" value="${esc(w.pct)}"></div><div><label for="cn${w.id}">Novo preço (R$)</label><input id="cn${w.id}" data-act="cn" inputmode="decimal" value="${esc(w.np)}"></div></div>
 <label for="cc${w.id}" style="display:block;font-size:14px;color:var(--mut);margin-bottom:3px">Custo da peça (opcional, para ver a margem)</label><input id="cc${w.id}" data-act="cc" inputmode="decimal" value="${esc(w.cost)}" placeholder="Ex.: 89,90">
 <div class="wr" style="margin-top:12px">${calcInfo(w)}</div>
 <div class="wa"><button class="btn" type="button" data-act="capply">Aplicar como promoção</button>${promo?'<button class="btn ghost" type="button" data-act="cend">Encerrar promoção</button>':''}</div></div>`;
}
function paint(keep){
 const f=$('#feed');if(!f)return;
 const top=f.scrollTop;
 const awaiting=ST.msgs.some(m=>m.w&&m.w.type==='confirm'&&m.w.state==='pending'&&m.w.res);
 f.innerHTML=ST.msgs.map(msgHtml).join('')+(ST.busy&&!awaiting?'<div class="m"><span class="dots" aria-label="Midily está escrevendo"><i></i><i></i><i></i></span></div>':'');
 f.scrollTop=keep?top:f.scrollHeight;
 const has=!!ST.area;
 $('#chips').innerHTML=has?[['idea','Sugestões'],['list','Produtos'],['stock','Ajustar estoque'],['disc','Simular desconto'],['calc','Calculadora'],['rep','Resumo da semana'],['photo','Subir fotos']].map(([k,l])=>`<button type="button" data-chip="${k}"${ST.busy?' disabled':''}>${l}</button>`).join(''):'';
 $('#tray').innerHTML=ST.pending.map(id=>`<span><img src="${ST.photos[id]}" alt="Foto ${esc(id)}"><button type="button" data-rm="${esc(id)}" aria-label="Tirar ${esc(id)}">×</button></span>`).join('');
 const ta=$('#ta');ta.disabled=!has;ta.placeholder=!has?'Escolha o setor para começar':ST.pending.length?'Diga a que produto são as fotos':'Escreva o que você precisa';
 $('#snd').disabled=!has||ST.busy;$('#att').disabled=!has;
 $('#sub').innerHTML=has?'Gestão da Bonely Store<span class="pill">'+AREAS[ST.area].n+'</span>':'Gestão da Bonely Store';
 $('#ban').innerHTML='';
 $('#chips').onclick=onChip;$('#tray').onclick=e=>{const b=e.target.closest('[data-rm]');if(b){ST.pending=ST.pending.filter(x=>x!==b.dataset.rm);paint(true)}};
}
function rerender(i){
 const el=$('#feed [data-i="'+i+'"]');if(!el)return paint(true);
 const t=document.createElement('div');t.innerHTML=msgHtml(ST.msgs[i],i);el.replaceWith(t.firstElementChild);
}
function toast(t){const e=document.createElement('div');e.className='toast';e.setAttribute('role','status');e.textContent=t;document.body.appendChild(e);setTimeout(()=>e.remove(),3200)}

/* ---------- eventos do feed ---------- */
const msgOf=el=>{const r=el.closest('[data-i]');return r?{i:+r.dataset.i,m:ST.msgs[+r.dataset.i]}:{}};
function onClick(e){
 const b=e.target.closest('[data-act]');if(!b||b.tagName==='INPUT')return;
 const {i,m}=msgOf(b);if(!m||!m.w)return;const w=m.w,a=b.dataset.act;
 if(a==='sec')return chooseArea(m,b.dataset.v);
 if(a==='ok')return runConfirm(i,w);
 if(a==='no'){w.state='cancel';rerender(i);if(w.res)w.res(JSON.stringify({ok:false,cancelado:true,motivo:'A '+OWNER+' cancelou. Nada foi alterado.'}));return}
 if(a==='pp')return pickProduct(i,m,b.dataset.pid);
 if(a==='sm'||a==='sp'){
  const p=core.myProd(w.pid),k=+b.dataset.k,s=core.szOf(p)[k],cur=core.stkQ(p,s),v=(w.draft[k]!==undefined?w.draft[k]:cur)+(a==='sp'?1:-1);
  w.draft[k]=Math.max(0,v);return rerender(i);
 }
 if(a==='sx'){ST.msgs.splice(i,1);return paint(true)}
 if(a==='sapply')return applySheet(i,w);
 if(a==='capply'||a==='cend')return calcAction(w,a);
 if(a==='pf'){w.f=b.dataset.v;return rerender(i)}
 if(a==='sg'){const x=w.items[+b.dataset.k];if(!x||!x.a)return;if(x.a.kind==='stock')return add('m','',{type:'sheet',pid:x.a.pid,draft:{},state:'edit'});const r=confirmCard(x.a.name,x.a.input);if(!r.ok)toast(r.error);return}
}
function onInput(e){
 const t=e.target,a=t.dataset&&t.dataset.act;if(!a)return;
 const {m}=msgOf(t);if(!m||!m.w)return;const w=m.w;
 if(a==='pq'){w.q=t.value;const l=t.closest('.wp').querySelector('.wl');if(l)l.innerHTML=pickList(w);return}
 if(a==='cp'||a==='cn'||a==='cc'){
  const p=core.myProd(w.pid),price=+p.price,root=t.closest('.wcalc');
  if(a==='cp'){w.pct=t.value;const pc=num(t.value);w.np=Number.isFinite(pc)?(price*(1-pc/100)).toFixed(2).replace('.',','):'';root.querySelector('[data-act=cn]').value=w.np}
  if(a==='cn'){w.np=t.value;const n=num(t.value);w.pct=Number.isFinite(n)&&price?((1-n/price)*100).toFixed(1).replace('.',','):'';root.querySelector('[data-act=cp]').value=w.pct}
  if(a==='cc')w.cost=t.value;
  root.querySelector('.wr').innerHTML=calcInfo(w);
 }
}
function onChange(e){
 const t=e.target;if(!t.dataset||t.dataset.act!=='sv')return;
 const {i,m}=msgOf(t);if(!m)return;const v=parseInt(t.value,10);
 m.w.draft[+t.dataset.k]=Number.isFinite(v)&&v>=0?v:0;rerender(i);
}

/* ---------- confirmação ---------- */
function confirmCard(name,input,res){
 const pl=core.PLAN[name](input);if(!pl.ok)return pl;
 const w={type:'confirm',title:pl.title||TITLES[name],lines:pl.lines,photos:pl.photos||[],state:'pending',name,input,res:res||null};
 ST.msgs.push({r:'m',t:'',w,imgs:[]});paint();return{ok:true};
}
async function runConfirm(i,w){
 if(w.state!=='pending')return;
 w.state='work';rerender(i);
 const out=await execPlan(w.name,w.input);
 if(out&&out.ok===false){w.state='bad';w.msg=out.error}
 else{
  w.state='done';
  w.msg=w.name==='register_sale'?'Salvo. Pedido '+out.pedido+'.':w.name==='create_product'?'Salvo. Produto criado.':w.name==='adjust_stock'?'Salvo. Estoque atualizado.':'Salvo.';
  if(w.name==='manage_photos'||w.name==='create_product')ST.pending=ST.pending.filter(id=>!(w.photos||[]).includes(id));
 }
 paint(true);
 if(w.res)w.res(JSON.stringify(out));
}
async function applySheet(i,w){
 const p=core.myProd(w.pid);if(!p)return;
 const sp=!core.canStk(p),ch=core.szOf(p).map((s,k)=>({s,k,cur:sp?-1:core.stkQ(p,s)})).filter(x=>sp||(w.draft[x.k]!==undefined&&w.draft[x.k]!==x.cur)).map(x=>({product_id:w.pid,size:x.s,mode:'definir',qty:w.draft[x.k]||0}));
 if(!ch.length)return toast('Nenhuma quantidade foi alterada.');
 w.state='work';rerender(i);
 const out=await execPlan('adjust_stock',{changes:ch});
 if(out&&out.ok===false){w.state='bad';w.msg=out.error}
 else{w.state='done';w.draft={};w.msg='Salvo. '+out.atualizados.map(x=>(x.tamanho&&x.tamanho!=='Único'?x.tamanho+': ':'')+x.antes+' → '+x.depois).join(' · ')+'.'}
 rerender(i);
}
function calcAction(w,a){
 const p=core.myProd(w.pid);if(!p)return;
 let input;
 if(a==='cend')input={product_id:w.pid,price:+p.oldPrice,tag:''};
 else{
  const np=num(w.np),old=+p.oldPrice>+p.price?+p.oldPrice:+p.price;
  if(!(np>=0))return toast('Informe o desconto ou o novo preço.');
  if(!(np<old))return toast('O novo preço precisa ser menor que '+money(old)+'.');
  input={product_id:w.pid,price:np,tag:'Promoção',old_price:old};
 }
 const r=confirmCard('update_product',input);
 if(!r.ok)toast(r.error);
}

/* ---------- escolha do setor / início ---------- */
function hello(){const h=new Date().getHours();return(h<12?'Bom dia':h<18?'Boa tarde':'Boa noite')+', '+OWNER+'!'}
function startChat(){
 ST.area='';ST.msgs=[];ST.api=[];ST.pending=[];ST.photos={};ST.nPhoto=0;ST.busy=false;ST.gen++;
 add('m',hello()+' Eu sou a Midily. Sobre qual setor vamos falar agora?',{type:'sector'});
}
function newChat(){startChat()}
function chooseArea(m,v){
 if(!AREAS[v])return;
 ST.area=v;m.w=null;
 add('u',AREAS[v].n);
 const P=core.prods(),r=core.report(7),ex=P[0]?P[0].name:'o produto';
 let t='Certo, vamos falar de *'+AREAS[v].n+'*. Tenho '+P.length+' produto(s) aqui (com e sem estoque)'+(r.estoque_baixo.length?' e '+r.estoque_baixo.length+' com estoque baixo':'')+'.\n\nPode me pedir coisas como:\n• "entraram 5 '+ex+'" ou "tirei 2 do estoque"\n• "sugestões" ou "o que está sem estoque?"\n• "200 com 15% de desconto", "3x de 49,90", "(120*3)+15"\n• "quanto fica 15% de desconto em '+ex+'?"\n\nPara fotos, toque no clipe, escolha as imagens e me diga a que produto pertencem.';
 add('m',t);
 const ta=$('#ta');if(ta&&!/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent))ta.focus();
}

/* ---------- fotos ---------- */
function compress(file){
 return new Promise((ok,no)=>{
  const r=new FileReader();r.onerror=()=>no(new Error('read'));
  r.onload=()=>{const im=new Image();im.onerror=()=>no(new Error('img'));
   im.onload=()=>{const s=Math.min(1,600/im.width),c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*s));c.height=Math.max(1,Math.round(im.height*s));c.getContext('2d').drawImage(im,0,0,c.width,c.height);ok(c.toDataURL('image/jpeg',.7))};
   im.src=r.result};
  r.readAsDataURL(file);
 });
}
async function addPhotos(files){
 if(!files.length||!ST.area)return;
 let bad=0;
 for(const f of files){
  if(ST.pending.length>=8){toast('Máximo de 8 fotos por mensagem.');break}
  try{const d=await compress(f),id='foto'+(++ST.nPhoto);ST.photos[id]=d;ST.pending.push(id)}catch(e){bad++}
 }
 if(bad)toast(bad+' foto(s) não puderam ser abertas.');
 paint(true);
 if(ST.pending.length&&!ST.msgs.some(m=>m.w&&m.w.type==='pick'&&m.w.kind==='photo'&&!m.w.closed))pickWidget('photo');
}

/* ---------- atalhos ---------- */
async function pickWidget(kind,opt){
 opt=opt||{};
 if(Date.now()-ST.lastLoad>20000)try{await reload()}catch(e){}   /* produtos novos aparecem sempre */
 const prompt={stock:'Qual produto você quer ajustar?',disc:'Em qual produto vamos simular o desconto?',photo:'Em qual produto coloco essas fotos? (Produto novo? Me escreva o nome, preço e tamanhos.)',list:'Todos os produtos do setor. Toque em um para ajustar o estoque.'}[kind];
 add('m','',{type:'pick',kind,q:'',f:opt.f||'all',ids:opt.ids||null,prompt});
}
function pickProduct(i,m,pid){
 const w=m.w,p=core.myProd(pid);if(!p)return toast('Não encontrei esse produto.');
 if(w.kind==='stock'||w.kind==='list'){m.w={type:'sheet',pid:String(p.id),draft:{},state:'edit'};return rerender(i)}
 if(w.kind==='disc'){m.w={type:'calc',id:'c'+(++ST.uid),pid:String(p.id),pct:'10',np:(+p.price*0.9).toFixed(2).replace('.',','),cost:''};return rerender(i)}
 if(w.kind==='photo'){
  if(!ST.pending.length)return toast('Escolha as fotos primeiro (clipe).');
  const r=confirmCard('manage_photos',{product_id:String(p.id),action:'add',photo_ids:ST.pending.slice()});
  if(!r.ok)return toast(r.error);
  w.closed=true;ST.msgs.splice(i,1);paint(true);
 }
}
async function showSugg(){
 try{await reload()}catch(e){}
 const all=core.suggest(),items=all.slice(0,12);
 add('m',all.length?'Olhei os dados do setor. Estas são as melhores sugestões agora:':'',{type:'sugg',items,more:all.length-items.length});
}
function onChip(e){
 const b=e.target.closest('[data-chip]');if(!b||ST.busy)return;const k=b.dataset.chip;
 if(k==='stock'||k==='disc')return pickWidget(k);
 if(k==='list')return pickWidget('list');
 if(k==='photo')return $('#file').click();
 if(k==='rep'){add('u','Resumo da semana');return add('m',core.reportText(7))}
 if(k==='idea'){add('u','Sugestões');return showSugg()}
 if(k==='calc'){add('u','Calculadora');return add('m','Digite a conta aqui no chat. Exemplos:\n• 200 com 15% de desconto\n• 150 mais 10%\n• 20% de 349,90\n• 299 em 3x\n• 4x de 49,90\n• (120*3)+15,50')}
}

/* ---------- cérebro local: entende português, faz contas, sem IA externa ---------- */
const pn=s=>{s=String(s).replace(/R\$/gi,'').trim();if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');return parseFloat(s)};
const nf=v=>Number(v).toLocaleString('pt-BR',{maximumFractionDigits:4});
const NUM='(\\d[\\d.,]*)';
function calcText(t){
 const s=t.replace(/R\$\s*/gi,''),R=v=>'*'+money(v)+'*';let m;
 if(m=s.match(new RegExp(NUM+'\\s*%\\s*de\\s+'+NUM,'i'))){const p=pn(m[1]),v=pn(m[2]);return nf(p)+'% de '+money(v)+' = '+R(v*p/100)}
 if(m=s.match(new RegExp(NUM+'\\s*(?:com|menos|-)\\s*'+NUM+'\\s*%','i'))){const v=pn(m[1]),p=pn(m[2]);return money(v)+' com '+nf(p)+'% de desconto = '+R(v*(1-p/100))+'\nVocê abre mão de '+money(v*p/100)+'.'}
 if(m=s.match(new RegExp(NUM+'\\s*(?:mais|\\+)\\s*'+NUM+'\\s*%','i'))){const v=pn(m[1]),p=pn(m[2]);return money(v)+' mais '+nf(p)+'% = '+R(v*(1+p/100))}
 if(m=s.match(new RegExp(NUM+'\\s*(?:em|dividido em|dividir em|\\/)\\s*(\\d{1,2})\\s*(?:x|vezes)','i'))){const v=pn(m[1]),n=+m[2];return money(v)+' em '+n+'x = '+n+' parcelas de '+R(v/n)}
 if(m=s.match(new RegExp('(\\d{1,2})\\s*(?:x|vezes)\\s*de\\s*'+NUM,'i'))){const n=+m[1],v=pn(m[2]);return n+'x de '+money(v)+' = '+R(n*v)}
 if(s.replace(/[^a-zà-ú]/gi,'').length<=6&&/\d\s*[-+*\/x×÷^]\s*[\d(]|\(\s*\d/i.test(s)){
  const e=s.replace(/[^\d+\-*\/().,%^x×÷]/gi,'');
  try{return e+' = *'+nf(C.calc(e))+'*'}catch(x){return 'Não consegui calcular: '+x.message}
 }
 return null;
}
const STOP=new Set(['de','da','do','das','dos','um','uma','no','na','em','para','pra','que','com','por','tem','tenho','quanto','quantos','estoque','desconto','entrou','entraram','chegou','chegaram','tirei','saiu','repor','vendi']);
function matchProd(t){
 const toks=norm(t).split(/[^a-z0-9]+/).filter(x=>x.length>1&&!STOP.has(x)&&!/^\d+$/.test(x));
 let best=[],bs=0;
 core.prods().forEach(p=>{const h=norm([p.name,p.color,p.brand].join(' ')),s=toks.filter(x=>h.includes(x)).length;if(s>bs){bs=s;best=[p]}else if(s&&s===bs)best.push(p)});
 return best;
}
async function brain(t,ph){
 const n=norm(t);
 if(ph.length){
  const L=matchProd(t);
  if(L.length===1){const r=confirmCard('manage_photos',{product_id:String(L[0].id),action:'add',photo_ids:ph});if(r.ok)return;add('m',r.error)}
  ST.pending=ph.slice();paint(true);return pickWidget('photo');
 }
 const L=matchProd(t);
 /* movimentação de estoque em frase: "entraram 5 vestido azul M" */
 const mode=/\b(entrou|entraram|chegou|chegaram|repor|repus|adicion\w*|acrescent\w*)\b/.test(n)?'entrada':/\b(tirei|tiramos|saiu|sairam|retir\w*|baix\w*|vendi|vendemos)\b/.test(n)?'saida':'';
 if(mode&&L.length){
  if(L.length>1){add('m','Achei mais de um produto parecido. Qual deles?');return pickWidget('stock',{ids:L.map(p=>String(p.id))})}
  const p=L[0],sz=core.szOf(p).find(s=>(' '+n+' ').includes(' '+norm(s)+' ')),q=((sz?n.replace(norm(sz),' '):n).match(/\b(\d{1,4})\b/)||[])[1];
  if(q){
   if(!core.canStk(p)||(core.szOf(p).length>1&&!sz))return add('m','Qual '+(core.imp()?'opção':'tamanho')+' de *'+p.name+'*? Ajuste abaixo:',{type:'sheet',pid:String(p.id),draft:{},state:'edit'});
   const r=confirmCard('adjust_stock',{changes:[{product_id:String(p.id),size:sz,mode,qty:+q}]});
   return r.ok?undefined:add('m',r.error);
  }
 }
 if(L.length===1&&/desconto|promo|off\b/.test(n)){
  const p=L[0],pc=(t.match(/(\d+(?:[.,]\d+)?)\s*%/)||[])[1]||'10',np=(+p.price*(1-pn(pc)/100)).toFixed(2).replace('.',',');
  return add('m','',{type:'calc',id:'c'+(++ST.uid),pid:String(p.id),pct:pc,np,cost:''});
 }
 const ct=calcText(t);if(ct)return add('m',ct);
 if(L.length===1&&/estoque|tem |tenho|quanto|quantos/.test(n)){
  const v=core.view(L[0]),sz=Object.entries(v.por_tamanho).map(([k,q])=>'• '+k+': '+q).join('\n');
  return add('m','*'+v.nome+'* · '+money(v.preco)+'\nEstoque total: *'+v.estoque_total+'*'+(Object.keys(v.por_tamanho).length>1?'\n'+sz:''),{type:'sheet',pid:v.id,draft:{},state:'edit'});
 }
 if(/sugest|ideia|dica|melhor|o que (fazer|devo|posso)|vender mais|repor/.test(n))return showSugg();
 if(/sem estoque|esgotad|zerad|acabou|acabaram|faltando/.test(n))return pickWidget('list',{f:'sem'});
 if(/produto|catalogo|todos|lista/.test(n))return pickWidget('list');
 if(/baixo|acabando/.test(n))return pickWidget('list',{f:'low'});
 if(/resumo|relatorio|faturamento|vendas|vendeu/.test(n))return add('m',core.reportText(7));
 if(/estoque|entrada|baixa|chegou|entrou/.test(n))return pickWidget('stock');
 if(/desconto|promo|preco/.test(n))return pickWidget('disc');
 if(/foto|imagem/.test(n))return $('#file').click();
 add('m','Não entendi essa. Eu sei:\n• *contas*: "200 com 15% de desconto", "3x de 49,90"\n• *estoque*: "entraram 5 [produto] [tamanho]", "tirei 2 [produto]"\n• *sugestões*, *produtos*, *sem estoque*, *resumo*\n• *desconto*: "15% de desconto em [produto]"');
}
function send(){sendText($('#ta').value)}
function sendText(raw){
 const t=String(raw||'').trim(),ph=ST.pending.slice();
 if(!ST.area||ST.busy||(!t&&!ph.length))return;
 const ta=$('#ta');ta.value='';ta.style.height='auto';
 ST.pending=[];add('u',t||'Enviei estas fotos.',null,ph);
 brain(t,ph).catch(e=>{console.warn('Midily',e);add('m','Algo deu errado. Tente de novo.')});
}

/* ---------- início ---------- */
async function enter(){
 await reload();
 FB.onerr=()=>{ST.saveErr=true};
 try{FB.listen(S,()=>{ST.lastLoad=Date.now()})}catch(e){}
 core=C.create({S,area:()=>ST.area,photo:id=>ST.photos[id],nextSeq:()=>FB.nextSeq().catch(()=>null)});
 mount();startChat();
}
async function boot(){
 viewMsg('Conectando…');
 try{await FB.ready}catch(e){}
 if(!FB.on)return viewMsg('Não consegui conectar à nuvem. Abra esta página pelo endereço https da loja e confira a internet.',true);
 if(FB.admin&&isMe()&&(()=>{try{return sessionStorage.getItem('mdl')==='1'}catch(e){return false}})()){try{await enter()}catch(e){console.warn(e);viewGate('Não consegui carregar os dados da loja. Entre de novo.')}}
 else viewGate('');
}
let hid=0;
document.addEventListener('visibilitychange',()=>{
 if(document.visibilityState==='hidden')hid=Date.now();
 else if(core&&hid&&Date.now()-hid>600000&&FB.admin){hid=0;return lockNow('Bloqueado por inatividade. Digite a senha.')}
 if(document.visibilityState==='visible'&&core&&ST.area&&!ST.busy&&Date.now()-ST.lastLoad>120000)reload().catch(()=>{});
});
boot();
})();
