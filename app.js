const WA='5521974424777', PHONE='+55 21 97442-4777', IG='bonely.store', OWNER='Gabriely', EMAIL='', HOURS='Seg. à Sáb. 09h às 18h';
const BEN=[['shield','Loja 100% segura','selo SSL de segurança'],['map','Entregamos','em todo o Brasil'],['card','Parcele suas compras','em até 12x'],['truck','Entrega rápida','receba seu produto em poucos dias']];
const STATUS=['Aguardando pagamento','Pago','Separando','Enviado','Entregue','Cancelado'];
const K='bonely_preview_v2';
const demo=()=>({
 colls:['Essencial','Verão 26'],
 products:[
  {id:1,name:'Vestido Midi Seda',price:289.9,type:'roupa',coll:'Verão 26',sizes:'P,M,G',stock:8,gen:'Feminino',img:''},
  {id:2,name:'Blusa Cetim Ouro',price:149.9,type:'roupa',coll:'Essencial',sizes:'P,M,G,GG',stock:12,gen:'Feminino',img:''},
  {id:3,name:'Calça Alfaiataria',price:219.9,type:'roupa',coll:'Essencial',sizes:'36,38,40,42',stock:5,gen:'Masculino',img:''},
  {id:6,name:'Camisa Linho Slim',price:179.9,type:'roupa',coll:'Verão 26',sizes:'P,M,G,GG',stock:9,gen:'Masculino',img:''},
  {id:4,name:'Brinco Estrela',price:59.9,type:'avulso',coll:'',sizes:'Único',stock:20,img:''},
  {id:5,name:'Necessaire Bonely',price:79.9,type:'avulso',coll:'',sizes:'Único',stock:2,img:''}],
 combos:[{id:1,name:'Combo Essencial',price:329.9,items:[2,3]}],
 orders:[],moves:[],customer:null,cart:[],seq:1000});
let S; try{S=JSON.parse(localStorage.getItem(K))}catch(e){}
if(!S)S=demo();
const save=()=>{try{localStorage.setItem(K,JSON.stringify(S))}catch(e){}};
const $=s=>document.querySelector(s);
const money=v=>Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let view=window.STATIC_PAGE?'doc':'loja',filter='tudo',genF='',collF='',cartOpen=false,ship=null,adminOk=false,atab='produtos',msg='',trk=null,modal='',fs=null,menu=false,q='',pg='';

/* Camada de dados: hoje usa localStorage (prévia). No projeto real, cada save() vira gravação no Firestore. */

function freteDemo(c){const d=Math.abs(+c[0]-8);return [{name:'PAC (exemplo)',price:+(16+d*3.2).toFixed(2),days:4+d,demo:1},{name:'SEDEX (exemplo)',price:+(26+d*5.1).toFixed(2),days:1+Math.ceil(d/2),demo:1}]}
async function calcFrete(cep){
 const c=String(cep).replace(/\D/g,'');
 if(c.length!==8)return null;
 const qty=S.cart.reduce((a,i)=>a+i.qty,0)||1;
 try{
  const r=await fetch('/api/frete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cep:c,items:[{qty}],value:S.cart.length?cartSub():0})});
  if(r.status===404||r.status===405)return freteDemo(c);
  if(!r.ok)return 'erro';
  const d=await r.json();
  return d.opts&&d.opts.length?d.opts:'erro';
 }catch(e){return freteDemo(c)}
}
function item(key){
 if(String(key).startsWith('c')){const c=S.combos.find(x=>'c'+x.id===key);return c&&{name:c.name,price:c.price,combo:c}}
 const p=S.products.find(x=>x.id==key);return p&&{name:p.name,price:p.price,p}
}
function stockOf(key){
 if(String(key).startsWith('c')){const c=item(key).combo;return Math.min(...c.items.map(i=>S.products.find(p=>p.id==i)?.stock??0))}
 return item(key).p.stock;
}
function addCart(key){
 const sel=$('#sz'+key),size=sel?sel.value:'';
 const ex=S.cart.find(i=>i.key==key&&i.size==size);
 const q=(ex?ex.qty:0)+1;
 if(q>stockOf(key)){alert('Sem estoque suficiente.');return}
 ex?ex.qty++:S.cart.push({key,size,qty:1});
 save();cartOpen=true;render();
}
const cartSub=()=>S.cart.reduce((a,i)=>a+item(i.key).price*i.qty,0);
function setShip(i){ship.sel=i;render()}
async function doCep(){const v=$('#cep').value;ship={loading:1,cep:v};render();const f=await calcFrete(v);ship=f==='erro'?{fail:1,cep:v}:f?{cep:v,opts:f,sel:0}:{err:1};render()}
function rm(i){S.cart.splice(i,1);save();render()}

function checkout(){
 const g=id=>$(id).value.trim();
 const c={name:g('#cn'),phone:g('#cp'),email:g('#ce').toLowerCase(),addr:g('#ca')};
 if(!S.cart.length)return alert('Carrinho vazio.');
 if(!c.name||!c.phone||!c.email||!c.addr)return alert('Preencha nome, WhatsApp, e-mail e endereço.');
 if(!ship||!ship.opts)return alert('Calcule o frete pelo CEP.');
 const sh=ship.opts[ship.sel];
 const items=S.cart.map(i=>({key:i.key,name:item(i.key).name,price:item(i.key).price,qty:i.qty,size:i.size}));
 const sub=cartSub();
 const o={id:'BN'+(++S.seq),date:new Date().toLocaleString('pt-BR'),ts:Date.now(),customer:{...c,cep:ship.cep},items,subtotal:sub,ship:sh,total:sub+sh.price,pay:$('#cpay').value,status:STATUS[0],tracking:'',stockDone:false};
 S.orders.unshift(o);saveCustomer(c);S.cart=[];ship=null;cartOpen=false;save();
 const wm=`Olá, ${OWNER}! O pedido *${o.id}* foi realizado.\n\nCliente: ${c.name}\n`+items.map(i=>`• ${i.qty}x ${i.name}${i.size?' ('+i.size+')':''} - ${money(i.price*i.qty)}`).join('\n')+`\n\nFrete ${sh.name}: ${money(sh.price)}\n*Total: ${money(o.total)}*\nForma de pagamento: ${o.pay}\n\nEntrega: ${c.addr} (CEP ${o.customer.cep})`;
 const txt=encodeURIComponent(wm);
 view='conta';render();
 window.open(`https://wa.me/${WA}?text=${txt}`,'_blank');
}

/* Admin */
function setStatus(id,st){
 const o=S.orders.find(x=>x.id===id);o.status=st;
 if(st==='Pago'&&!o.stockDone){
  o.items.forEach(i=>{const ps=String(i.key).startsWith('c')?item(i.key)?.combo.items.map(x=>S.products.find(p=>p.id==x)):[S.products.find(p=>p.id==i.key)];
   (ps||[]).forEach(p=>{if(p){p.stock=Math.max(0,p.stock-i.qty);S.moves.unshift({date:new Date().toLocaleString('pt-BR'),name:p.name,type:'saida',qty:i.qty,note:'Pedido '+id})}})});
  o.stockDone=true;
 }
 save();render();
}
function readImg(file,cb){
 const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const s=Math.min(1,600/im.width),c=document.createElement('canvas');c.width=im.width*s;c.height=im.height*s;c.getContext('2d').drawImage(im,0,0,c.width,c.height);cb(c.toDataURL('image/jpeg',.7))};im.src=r.result};r.readAsDataURL(file);
}
function saveCustomer(c){
 S.customers=S.customers||[];
 const k=S.customers.find(x=>x.email===c.email);
 if(k)Object.assign(k,Object.fromEntries(Object.entries(c).filter(([,v])=>v)));else S.customers.push({addr:'',...c});
 S.customer=S.customers.find(x=>x.email===c.email);
}
function login(){
 const c={name:$('#ln').value.trim(),email:$('#le').value.trim().toLowerCase(),phone:$('#lp').value.trim()};
 if(!c.name||!c.email||!c.phone)return alert('Informe nome, e-mail e WhatsApp.');
 saveCustomer(c);save();render();
}
function trackBlock(o){
 if(!o.tracking)return '<p class="tag">O código de rastreio aparece aqui assim que o pedido for enviado.</p>';
 const c=encodeURIComponent(o.tracking);
 return `<p>Código de rastreio: <b>${esc(o.tracking)}</b></p><div class="row"><a class="btn sm" style="text-decoration:none" target="_blank" rel="noopener" href="https://www.melhorrastreio.com.br/rastreio/${c}">Rastrear agora</a><a class="btn sm ghost" style="text-decoration:none" target="_blank" rel="noopener" href="https://rastreamento.correios.com.br/app/index.php">Site dos Correios</a></div>`;
}
function steps(o){
 if(o.status==='Cancelado')return '<p class="err">Pedido cancelado.</p>';
 const L=STATUS.slice(0,5),at=L.indexOf(o.status);
 return `<div class="steps">${L.map((x,i)=>`<span class="${i<=at?'on':''}">${x}</span>`).join('')}</div>`;
}
function findOrder(){
 const id=$('#ro').value.trim().toUpperCase(),em=$('#re').value.trim().toLowerCase();
 const o=S.orders.find(x=>x.id===id&&x.customer.email===em);
 trk=o?{o}:{err:1};render();
}
function vRastreio(){
 const o=trk&&trk.o;
 return `<section><div class="wrap" style="max-width:560px"><h2>Rastrear pedido</h2><p class="sub">Veja o andamento do seu pedido e o código de rastreio.</p>
 <label>Número do pedido</label><input id="ro" placeholder="Ex.: BN1001"><label>E-mail usado na compra</label><input id="re" type="email"><div class="row"><button class="btn" onclick="findOrder()">Consultar pedido</button></div>
 ${trk&&trk.err?'<p class="err">Pedido não encontrado. Confira o número e o e-mail.</p>':''}
 ${o?`<div class="card in" style="margin-top:20px;padding:16px"><div class="line"><b>${o.id}</b><span class="st">${o.status}</span></div>${steps(o)}${trackBlock(o)}</div>`:''}
 <h3 style="margin-top:34px">Já tem o código dos Correios?</h3><p class="tag">Digite o código e abrimos a consulta de entrega em outra aba. O trajeto da encomenda aparece no site dos Correios, não aqui.</p>
 <div class="row"><input id="rc" placeholder="Ex.: AA123456789BR" aria-label="Código de rastreio"><button class="btn ghost" onclick="const c=$('#rc').value.trim();if(c)window.open('https://www.melhorrastreio.com.br/rastreio/'+encodeURIComponent(c),'_blank')">Rastrear</button></div></div></section>`;
}
function match(p){
 if(collF&&p.coll!==collF)return false;
 if(q&&!p.name.toLowerCase().includes(q.toLowerCase()))return false;
 if(filter==='tudo')return true;
 if(filter==='avulso')return p.type==='avulso';
 const g=p.gen||'Unissex';
 return p.type==='roupa'&&(g===filter||g==='Unissex');
}
function cat(f,col){pg='cat';filter=f;collF=col||'';view='loja';cartOpen=false;menu=false;render();setTimeout(()=>{const e=document.getElementById('cat');if(e)e.scrollIntoView({behavior:'smooth'})},30)}
function goto(id){pg=id;view='loja';cartOpen=false;menu=false;render();setTimeout(()=>{const e=document.getElementById(id);if(e)e.scrollIntoView({behavior:'smooth'})},30)}
function doSearch(e){e.preventDefault();q=$('#q').value.trim();cat('tudo')}
function vMenu(){
 return `<div class="scrim ${menu?'show':''}" onclick="menu=false;render()"></div><div class="drawer left ${menu?'open':''}" role="dialog" aria-label="Menu"><div class="line" style="border:0"><h2 style="margin:0">Menu</h2><button class="btn sm ghost" onclick="menu=false;render()">Fechar</button></div>
 <button class="mlk" onclick="q='';cat('tudo')">Todos os produtos</button><button class="mlk" onclick="q='';cat('Feminino')">Feminino</button><button class="mlk" onclick="q='';cat('Masculino')">Masculino</button><button class="mlk" onclick="q='';cat('avulso')">Avulsos</button>
 ${S.colls.length?'<h3 style="margin:18px 0 4px;color:var(--gold)">Coleções</h3>'+S.colls.map((c,i)=>`<button class="mlk" onclick="q='';cat('tudo',S.colls[${i}])">${esc(c)}</button>`).join(''):''}
 ${S.combos.length?'<button class="mlk" onclick="goto(\'combos\')">Combos</button>':''}
 <h3 style="margin:18px 0 4px;color:var(--gold)">Sua conta</h3><button class="mlk" onclick="go('conta')">Minha conta</button><button class="mlk" onclick="go('rastreio')">Rastrear pedido</button><button class="mlk" onclick="menu=false;modal='frete';render()">Simular frete</button></div>`;
}
function vDoc(){const t=document.getElementById('doc');return `<section><div class="wrap doc" style="padding-top:0;padding-bottom:0">${t?t.innerHTML:''}</div></section>`}
async function calcF(){const v=$('#cepm').value;fs={cep:v,loading:1};render();const f=await calcFrete(v);fs={cep:v,opts:f==='erro'?null:f,fail:f==='erro'};render()}
function vModal(){
 return `<div class="modal" onclick="if(event.target===this){modal='';render()}"><div role="dialog" aria-label="Simular frete" style="width:min(460px,100%)"><h2>Simular frete</h2><p class="sub">Informe o CEP para ver valor e prazo de entrega.</p>
 <div class="row" style="margin-top:0"><input id="cepm" value="${esc(fs?fs.cep:'')}" placeholder="00000-000" inputmode="numeric" aria-label="CEP"><button class="btn" onclick="calcF()">Calcular</button></div>
 ${fs&&fs.loading?'<p class="tag">Calculando…</p>':''}${fs&&!fs.loading&&fs.fail?'<p class="err">Não foi possível calcular agora. Tente novamente em instantes.</p>':''}${fs&&!fs.loading&&!fs.fail&&!fs.opts?'<p class="err">CEP inválido. Digite 8 números.</p>':''}
 ${fs&&fs.opts?fs.opts.map(o=>`<div class="line"><span>${o.name} · ${o.days} dias úteis</span><span class="price">${money(o.price)}</span></div>`).join('')+`<p class="tag">${fs.opts[0].demo?'Valores de exemplo (modo de teste).':fs.opts[0].src==='tabela'?'Valores estimados por região.':'Valores calculados pelo Melhor Envio.'} O valor final aparece no carrinho.</p>`:''}
 <div class="row"><button class="btn ghost" onclick="modal='';render()">Fechar</button></div></div></div>`;
}
const ph=p=>`<div class="ph">${p.img?`<img src="${p.img}" alt="${esc(p.name)}">`:'B'}</div>`;

/* Views */
function vLoja(){
 const list=S.products.filter(match);
 return `<section class="hero"><div class="wrap"><img class="herologo" src="IMGs/logo_img.jpeg" alt="Bonely Store"><p>Moda feminina, masculina e peças especiais, com envio para todo o Brasil.</p><div class="row" style="justify-content:center"><button class="btn" onclick="document.getElementById('cat').scrollIntoView({behavior:'smooth'})">Ver catálogo</button></div></div></section>
 <div class="benefits"><div class="wrap">${BEN.map(b=>`<div class="ben">${IC[b[0]]}<span><b>${b[1]}</b>${b[2]}</span></div>`).join('')}</div></div>
 <section id="cat"><div class="wrap"><h2>Catálogo</h2><p class="sub">${q?`Resultados para “${esc(q)}” <button class="btn sm ghost" onclick="q='';render()">Limpar busca</button>`:'Moda feminina, masculina e peças avulsas.'}</p>
 <div class="pills">${[['tudo','Tudo'],['Feminino','Feminino'],['Masculino','Masculino'],['avulso','Avulsos']].map(([k,l])=>`<button class="${filter===k?'on':''}" onclick="filter='${k}';render()">${l}</button>`).join('')}</div>
 ${S.colls.length?`<div class="chips"><span>Coleção</span><button class="${!collF?'on':''}" onclick="collF='';render()">Todas</button>${S.colls.map((c,i)=>`<button class="${collF===c?'on':''}" onclick="collF=S.colls[${i}];render()">${esc(c)}</button>`).join('')}</div>`:''}
 ${list.length?`<div class="grid">${list.map(p=>`<div class="card">${ph(p)}<div class="in"><h3>${esc(p.name)}</h3><div class="tag">${[p.gen,p.coll||(p.type==='avulso'?'Avulso':'')].filter(Boolean).map(esc).join(' · ')}</div><div class="price">${money(p.price)}</div>
  ${p.stock>0?`<div class="row"><select id="sz${p.id}" aria-label="Tamanho">${p.sizes.split(',').map(s=>`<option>${esc(s.trim())}</option>`).join('')}</select><button class="btn sm" onclick="addCart(${p.id})">Adicionar</button></div>${p.stock<=3?`<div class="tag">Restam ${p.stock}</div>`:''}`:'<div class="tag err">Esgotado</div>'}</div></div>`).join('')}</div>`:'<div class="empty">Nenhuma peça nesse filtro.</div>'}
 </div></section>
 ${S.combos.length?`<section id="combos" style="border-top:1px solid var(--line)"><div class="wrap"><h2>Combos</h2><p class="sub">Leve junto e pague menos.</p><div class="grid">${S.combos.map(c=>{const ps=c.items.map(i=>S.products.find(p=>p.id==i)).filter(Boolean);const full=ps.reduce((a,p)=>a+p.price,0);return `<div class="card"><div class="in"><h3>${esc(c.name)}</h3><div class="tag">${ps.map(p=>esc(p.name)).join(' + ')}</div><div class="tag"><s>${money(full)}</s></div><div class="price">${money(c.price)}</div><div class="row">${stockOf('c'+c.id)>0?`<button class="btn sm" onclick="addCart('c${c.id}')">Adicionar combo</button>`:'<span class="tag err">Esgotado</span>'}</div></div></div>`}).join('')}</div></div></section>`:''}`;
}
function vConta(){
 const c=S.customer;
 if(!c)return `<section><div class="wrap" style="max-width:420px"><h2>Minha conta</h2><p class="sub">Entre para acompanhar seus pedidos.</p><label>Nome</label><input id="ln"><label>E-mail</label><input id="le" type="email"><label>WhatsApp</label><input id="lp"><div class="row"><button class="btn" onclick="login()">Entrar</button></div></div></section>`;
 const os=S.orders.filter(o=>o.customer.email===c.email);
 return `<section><div class="wrap"><h2>Olá, ${esc(c.name)}</h2><p class="sub">${esc(c.email)} · <button class="btn sm ghost" onclick="S.customer=null;save();render()">Sair</button></p>
 <h3 style="margin:20px 0 8px">Meus pedidos</h3>${os.length?os.map(o=>`<div class="card in" style="margin-bottom:14px;padding:16px"><div class="line"><b>${o.id}</b><span class="st">${o.status}</span></div><div class="tag">${o.date}</div>${o.items.map(i=>`<div class="line"><span>${i.qty}x ${esc(i.name)} ${i.size?'('+esc(i.size)+')':''}</span><span>${money(i.price*i.qty)}</span></div>`).join('')}<div class="line"><span>Frete ${esc(o.ship.name)}</span><span>${money(o.ship.price)}</span></div><div class="line total"><span>Total</span><span>${money(o.total)}</span></div>
 ${steps(o)}${trackBlock(o)}</div>`).join(''):'<div class="empty">Você ainda não fez pedidos.</div>'}</div></section>`;
}
function vCart(){
 const c=S.customer||{};const sh=ship&&ship.opts?ship.opts[ship.sel]:null;
 return `<div class="drawer ${cartOpen?'open':''}" role="dialog" aria-label="Carrinho"><div class="line" style="border:0"><h2 style="margin:0">Carrinho</h2><button class="btn sm ghost" onclick="cartOpen=false;render()">Fechar</button></div>
 ${S.cart.length?S.cart.map((i,n)=>`<div class="line"><span>${i.qty}x ${esc(item(i.key).name)} ${i.size?'('+esc(i.size)+')':''}</span><span>${money(item(i.key).price*i.qty)} <button class="btn sm ghost" onclick="rm(${n})" aria-label="Remover">×</button></span></div>`).join(''):'<div class="empty">Seu carrinho está vazio. Escolha uma peça no catálogo.</div>'}
 ${S.cart.length?`<label>CEP de entrega</label><div class="row" style="margin-top:0"><input id="cep" value="${esc(ship?.cep||'')}" placeholder="00000-000" inputmode="numeric"><button class="btn sm" onclick="doCep()">Calcular</button></div>
 ${ship&&ship.err?'<div class="err">CEP inválido.</div>':''}${ship&&ship.loading?'<div class="tag">Calculando…</div>':''}${ship&&ship.fail?'<div class="err">Não foi possível calcular o frete agora. Tente novamente.</div>':''}${ship&&ship.opts?ship.opts.map((o,n)=>`<label style="color:var(--tx);display:flex;gap:8px"><input type="radio" name="fr" style="width:auto" ${n===ship.sel?'checked':''} onchange="setShip(${n})"> ${o.name} · ${o.days} dias · ${money(o.price)}</label>`).join(''):''}
 <label>Nome</label><input id="cn" value="${esc(c.name)}"><label>WhatsApp</label><input id="cp" value="${esc(c.phone)}"><label>E-mail</label><input id="ce" type="email" value="${esc(c.email)}"><label>Endereço completo</label><input id="ca" value="${esc(c.addr)}"><label>Forma de pagamento</label><select id="cpay"><option>Pix</option><option>Cartão de crédito</option><option>Cartão de débito</option><option>A combinar</option></select>
 <div class="line total" style="margin-top:14px"><span>Total</span><span>${money(cartSub()+(sh?sh.price:0))}</span></div>
 <div class="row"><button class="btn" style="width:100%" onclick="checkout()">Finalizar pedido</button></div><p class="tag">Ao finalizar, o pedido fica salvo na sua conta e você segue com a loja para combinar o pagamento.</p>`:''}</div>`;
}
const IC={
 wa:'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/><g transform="translate(6.6 6.1) scale(.45)" stroke-width="3.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></g></svg>',
 cart:'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
 menu:'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
 search:'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>',
 head:'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>',
 user:'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
 up:'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>',
 mail:'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>',
 shield:'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>',
 map:'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/><path d="M8 2v16M16 6v16"/></svg>',
 card:'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>',
 truck:'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
 pct:'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 5L5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>',
 tel:'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
 ig:'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><path d="M17.5 6.5h.01"/></svg>'
};
function vFooter(){
 return `<footer><div class="wrap">
 <div class="fgrid">
 <div><img class="flogo" src="IMGs/logo_img.jpeg" alt="Bonely Store"><p class="fabout">Bem-vindo(a) à Bonely Store. Moda feminina e masculina com peças selecionadas e envio para todo o Brasil.</p></div>
 <div><h3>Categorias</h3><button class="lk" onclick="q='';cat('Feminino')">Feminino</button><button class="lk" onclick="q='';cat('Masculino')">Masculino</button><button class="lk" onclick="q='';cat('avulso')">Avulsos</button></div>
 <div><h3>Institucional</h3><a class="lk" href="privacidade.html">Política de Privacidade</a><a class="lk" href="cancelamento.html">Política de Cancelamento e Trocas</a><button class="lk" onclick="go('admin')">Área da loja</button></div>
 <div><h3>Minhas compras</h3><button class="lk" onclick="go('conta')">Minha conta</button><button class="lk" onclick="go('rastreio')">Rastrear pedido</button><button class="lk" onclick="modal='frete';render()">Simular frete</button></div>
 <div><h3>Contato</h3><ul class="contact"><li><a href="https://wa.me/${WA}" target="_blank" rel="noopener">${IC.wa}<span>WhatsApp</span></a></li></ul><div class="hours"><b>Horário de atendimento</b><p>${HOURS}</p></div></div>
 </div>
 <div class="fline"></div>
 <div class="fpay"><div><h3>Pague com</h3><div class="pay"><span>Pix</span><span>Cartão de crédito</span><span>Cartão de débito</span></div></div><div><h3 style="white-space:nowrap">Acompanhe nas redes</h3><a class="soc" href="https://www.instagram.com/${IG}" target="_blank" rel="noopener" aria-label="Instagram">${IC.ig}</a></div></div>
 <div class="copy">© ${new Date().getFullYear()} Bonely Store. Todos os direitos reservados.<br>Desenvolvido por <a href="https://linkneres.vercel.app/" target="_blank" rel="noopener">Dalton Neres</a> | Full Stack developer</div>
 </div></footer>`;
}
function go(v){pg='';view=v;cartOpen=false;menu=false;render();scrollTo(0,0)}
function render(){
 if(window.STATIC_PAGE&&view!=='doc'){location.href='index.html?'+new URLSearchParams({v:view,f:filter,c:collF,q:q,g:pg});return}
 if(view==='admin'){ADM.render();return}
 document.body.style.overflow='';
 const n=S.cart.reduce((a,i)=>a+i.qty,0),cu=S.customer;
 $('#app').innerHTML=`<header><div class="wrap hd">
 <button class="iconbtn" onclick="menu=true;render()" aria-label="Abrir menu">${IC.menu}</button>
 <button class="brand" onclick="q='';go('loja')" aria-label="Bonely Store, início">BONELY</button>
 <form class="search" onsubmit="doSearch(event)"><input id="q" value="${esc(q)}" placeholder="Digite o que você procura" aria-label="Buscar produtos"><button aria-label="Buscar">${IC.search}</button></form>
 <a class="hbox central" href="https://wa.me/${WA}" target="_blank" rel="noopener">${IC.head}<span><small>Central de</small>Atendimento</span></a>
 <button class="hbox" onclick="go('conta')">${IC.user}<span><small>${cu?'Olá, '+esc(cu.name.split(' ')[0]):'Olá, Bem-vindo(a)'}</small>${cu?'Minha conta':'Entre ou Cadastre-se'}</span></button>
 <button class="cartbtn" onclick="cartOpen=true;render()" aria-label="Carrinho, ${n} itens">${IC.cart}${n?`<b>${n}</b>`:''}</button></div></header>
 <main>${view==='loja'?vLoja():view==='conta'?vConta():view==='rastreio'?vRastreio():view==='doc'?vDoc():''}</main>${vFooter()}${vCart()}${vMenu()}${modal==='frete'?vModal():''}<div class="fabs"><button class="fab up" onclick="scrollTo({top:0,behavior:'smooth'})" aria-label="Voltar ao topo">${IC.up}</button><a class="fab wa" href="https://wa.me/${WA}" target="_blank" rel="noopener" aria-label="WhatsApp">${IC.wa}</a></div>`;
}
(function(){
 const P=new URLSearchParams(location.search);
 if(window.STATIC_PAGE||![...P.keys()].length)return;
 if(['loja','conta','rastreio','admin'].includes(P.get('v')))view=P.get('v');
 if(P.get('f'))filter=P.get('f');
 collF=P.get('c')||'';q=P.get('q')||'';pg=P.get('g')||'';
 history.replaceState(null,'',location.pathname);
})();
render();
if(pg){setTimeout(()=>{const e=document.getElementById(pg);if(e)e.scrollIntoView();pg=''},60)}
