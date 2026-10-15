const WA='5521974424777', PHONE='+55 21 97442-4777', IG='bonely.store';
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
let view='loja',filter='tudo',genF='',collF='',cartOpen=false,ship=null,adminOk=false,atab='produtos',msg='',trk=null;

/* Camada de dados: hoje usa localStorage (prévia). No projeto real, cada save() vira gravação no Firestore. */

function calcFrete(cep){
 const c=String(cep).replace(/\D/g,'');
 if(c.length!==8)return null;
 const r=+c[0], d=Math.abs(r-8);
 return [{name:'PAC (Correios)',price:+(16+d*3.2).toFixed(2),days:4+d},{name:'SEDEX (Correios)',price:+(26+d*5.1).toFixed(2),days:1+Math.ceil(d/2)}];
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
function doCep(){const f=calcFrete($('#cep').value);ship=f?{cep:$('#cep').value,opts:f,sel:0}:{err:1};render()}
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
 const o={id:'BN'+(++S.seq),date:new Date().toLocaleString('pt-BR'),customer:{...c,cep:ship.cep},items,subtotal:sub,ship:sh,total:sub+sh.price,status:STATUS[0],tracking:'',stockDone:false};
 S.orders.unshift(o);saveCustomer(c);S.cart=[];ship=null;cartOpen=false;save();
 const txt=`Olá, Bonely Store! Fiz o pedido *${o.id}*:%0A`+items.map(i=>`• ${i.qty}x ${i.name}${i.size?' ('+i.size+')':''} - ${money(i.price*i.qty)}`).join('%0A')+`%0AFrete ${sh.name}: ${money(sh.price)}%0A*Total: ${money(o.total)}*%0A%0AEntrega: ${c.addr} (CEP ${o.customer.cep})`;
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
function setTrack(id){const o=S.orders.find(x=>x.id===id);o.tracking=$('#tr'+id).value.trim();if(o.tracking&&o.status!=='Entregue')o.status='Enviado';save();render()}
function readImg(file,cb){
 const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const s=Math.min(1,600/im.width),c=document.createElement('canvas');c.width=im.width*s;c.height=im.height*s;c.getContext('2d').drawImage(im,0,0,c.width,c.height);cb(c.toDataURL('image/jpeg',.7))};im.src=r.result};r.readAsDataURL(file);
}
let newImg='';
function pickImg(e){if(e.files[0])readImg(e.files[0],d=>{newImg=d;$('#imgok').textContent='Foto carregada ✓'})}
function addProd(){
 const n=$('#pn').value.trim(),pr=parseFloat($('#pp').value);
 if(!n||isNaN(pr))return alert('Informe nome e preço.');
 S.products.push({id:Date.now(),name:n,price:pr,type:$('#pt').value,gen:$('#pg').value,coll:$('#pc').value.trim(),sizes:$('#ps').value.trim()||'Único',stock:parseInt($('#pq').value)||0,img:newImg});
 const c=$('#pc').value.trim();if(c&&!S.colls.includes(c))S.colls.push(c);
 if(parseInt($('#pq').value)>0)S.moves.unshift({date:new Date().toLocaleString('pt-BR'),name:n,type:'entrada',qty:parseInt($('#pq').value),note:'Cadastro inicial'});
 newImg='';save();render();
}
function delProd(id){if(confirm('Excluir produto?')){S.products=S.products.filter(p=>p.id!==id);save();render()}}
function addMove(){
 const p=S.products.find(x=>x.id==$('#mp').value),q=parseInt($('#mq').value),t=$('#mt').value;
 if(!p||!q||q<1)return alert('Escolha produto e quantidade.');
 if(t==='saida'&&q>p.stock)return alert('Saída maior que o estoque.');
 p.stock+=t==='entrada'?q:-q;
 S.moves.unshift({date:new Date().toLocaleString('pt-BR'),name:p.name,type:t,qty:q,note:$('#mn').value||''});save();render();
}
function addCombo(){
 const ids=[...document.querySelectorAll('.cb:checked')].map(x=>+x.value),n=$('#cbn').value.trim(),pr=parseFloat($('#cbp').value);
 if(!n||isNaN(pr)||ids.length<2)return alert('Nome, preço e ao menos 2 produtos.');
 S.combos.push({id:Date.now(),name:n,price:pr,items:ids});save();render();
}
function delCombo(id){S.combos=S.combos.filter(c=>c.id!==id);save();render()}
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
 return `<section><div class="wrap" style="max-width:560px"><h2>Rastrear pedido</h2><p class="sub">Informe o número do pedido e o e-mail usado na compra.</p>
 <label>Número do pedido</label><input id="ro" placeholder="BN1001"><label>E-mail</label><input id="re" type="email"><div class="row"><button class="btn" onclick="findOrder()">Consultar</button></div>
 ${trk&&trk.err?'<p class="err">Pedido não encontrado. Confira o número e o e-mail.</p>':''}
 ${o?`<div class="card in" style="margin-top:20px;padding:16px"><div class="line"><b>${o.id}</b><span class="st">${o.status}</span></div>${steps(o)}${trackBlock(o)}</div>`:''}
 <h3 style="margin-top:34px">Já tem o código de rastreio?</h3><div class="row"><input id="rc" placeholder="Ex.: AA123456789BR" aria-label="Código de rastreio"><button class="btn ghost" onclick="const c=$('#rc').value.trim();if(c)window.open('https://www.melhorrastreio.com.br/rastreio/'+encodeURIComponent(c),'_blank')">Rastrear</button></div></div></section>`;
}
function adminLogin(){if($('#pin').value==='1234'){adminOk=true;render()}else msg='PIN incorreto.',render()}
const ph=p=>`<div class="ph">${p.img?`<img src="${p.img}" alt="${esc(p.name)}">`:'B'}</div>`;

/* Views */
function vLoja(){
 const list=S.products.filter(p=>(filter==='tudo'||p.type===filter)&&(!collF||p.coll===collF)&&(!genF||p.gen===genF));
 return `<section class="hero"><div class="wrap"><img class="herologo" src="IMGs/logo_img.jpeg" alt="Bonely Store"><p>Moda feminina, masculina e peças especiais, com envio para todo o Brasil.</p><div class="row" style="justify-content:center"><button class="btn" onclick="document.getElementById('cat').scrollIntoView({behavior:'smooth'})">Ver catálogo</button><a class="btn ghost" style="text-decoration:none" href="https://wa.me/${WA}" target="_blank" rel="noopener">${IC.wa}Falar no WhatsApp</a></div></div></section>
 <div class="trust"><div class="wrap"><span>Envio para todo o Brasil</span><span>Frete calculado pelo CEP</span><span>Pedido pelo WhatsApp</span><span>Troca em até 7 dias</span></div></div>
 <section id="cat"><div class="wrap"><h2>Catálogo</h2><p class="sub">Roupas e itens avulsos.</p>
 <div class="tabs">${[['tudo','Tudo'],['roupa','Roupas'],['avulso','Avulsos']].map(([k,l])=>`<button class="${filter===k?'on':''}" onclick="filter='${k}';render()">${l}</button>`).join('')}
 <select aria-label="Público" onchange="genF=this.value;render()"><option value="">Feminino e masculino</option>${['Feminino','Masculino','Unissex'].map(g=>`<option ${genF===g?'selected':''}>${g}</option>`).join('')}</select><select aria-label="Coleção" onchange="collF=this.value;render()"><option value="">Todas as coleções</option>${S.colls.map(c=>`<option ${collF===c?'selected':''}>${esc(c)}</option>`).join('')}</select></div>
 ${list.length?`<div class="grid">${list.map(p=>`<div class="card">${ph(p)}<div class="in"><h3>${esc(p.name)}</h3><div class="tag">${[p.gen,p.coll||(p.type==='avulso'?'Avulso':'')].filter(Boolean).map(esc).join(' · ')}</div><div class="price">${money(p.price)}</div>
  ${p.stock>0?`<div class="row"><select id="sz${p.id}" aria-label="Tamanho">${p.sizes.split(',').map(s=>`<option>${esc(s.trim())}</option>`).join('')}</select><button class="btn sm" onclick="addCart(${p.id})">Adicionar</button></div>${p.stock<=3?`<div class="tag">Restam ${p.stock}</div>`:''}`:'<div class="tag err">Esgotado</div>'}</div></div>`).join('')}</div>`:'<div class="empty">Nenhuma peça nesse filtro.</div>'}
 </div></section>
 ${S.combos.length?`<section style="border-top:1px solid var(--line)"><div class="wrap"><h2>Combos</h2><p class="sub">Leve junto e pague menos.</p><div class="grid">${S.combos.map(c=>{const ps=c.items.map(i=>S.products.find(p=>p.id==i)).filter(Boolean);const full=ps.reduce((a,p)=>a+p.price,0);return `<div class="card"><div class="in"><h3>${esc(c.name)}</h3><div class="tag">${ps.map(p=>esc(p.name)).join(' + ')}</div><div class="tag"><s>${money(full)}</s></div><div class="price">${money(c.price)}</div><div class="row">${stockOf('c'+c.id)>0?`<button class="btn sm" onclick="addCart('c${c.id}')">Adicionar combo</button>`:'<span class="tag err">Esgotado</span>'}</div></div></div>`}).join('')}</div></div></section>`:''}
 <section style="border-top:1px solid var(--line)"><div class="wrap"><h2>Simule o frete</h2><p class="sub">Informe seu CEP e veja prazo e valor antes de pedir.</p>
 <div class="row" style="max-width:420px"><input id="cep2" placeholder="00000-000" inputmode="numeric" aria-label="CEP"><button class="btn" onclick="ship={cep:$('#cep2').value,opts:calcFrete($('#cep2').value),sel:0};if(!ship.opts)ship={err:1};render();setTimeout(()=>document.getElementById('sres')?.scrollIntoView({block:'center'}),50)">Calcular</button></div>
 <div id="sres" style="margin-top:14px">${ship&&ship.err?'<span class="err">CEP inválido. Digite 8 números.</span>':ship&&ship.opts?ship.opts.map(o=>`<div class="line" style="max-width:420px"><span>${o.name} · ${o.days} dias úteis</span><span class="price">${money(o.price)}</span></div>`).join('')+'<div class="tag">Valores de exemplo. Na versão final vêm da API do Melhor Envio.</div>':''}</div></div></section>`;
}
function vConta(){
 const c=S.customer;
 if(!c)return `<section><div class="wrap" style="max-width:420px"><h2>Minha conta</h2><p class="sub">Entre para acompanhar seus pedidos.</p><label>Nome</label><input id="ln"><label>E-mail</label><input id="le" type="email"><label>WhatsApp</label><input id="lp"><div class="row"><button class="btn" onclick="login()">Entrar</button></div></div></section>`;
 const os=S.orders.filter(o=>o.customer.email===c.email);
 return `<section><div class="wrap"><h2>Olá, ${esc(c.name)}</h2><p class="sub">${esc(c.email)} · <button class="btn sm ghost" onclick="S.customer=null;save();render()">Sair</button></p>
 <h3 style="margin:20px 0 8px">Meus pedidos</h3>${os.length?os.map(o=>`<div class="card in" style="margin-bottom:14px;padding:16px"><div class="line"><b>${o.id}</b><span class="st">${o.status}</span></div><div class="tag">${o.date}</div>${o.items.map(i=>`<div class="line"><span>${i.qty}x ${esc(i.name)} ${i.size?'('+esc(i.size)+')':''}</span><span>${money(i.price*i.qty)}</span></div>`).join('')}<div class="line"><span>Frete ${esc(o.ship.name)}</span><span>${money(o.ship.price)}</span></div><div class="line total"><span>Total</span><span>${money(o.total)}</span></div>
 ${steps(o)}${trackBlock(o)}</div>`).join(''):'<div class="empty">Você ainda não fez pedidos.</div>'}</div></section>`;
}
function vAdmin(){
 if(!adminOk)return `<section><div class="wrap" style="max-width:360px"><h2>Painel</h2><p class="sub">Acesso da loja. PIN da prévia: 1234</p><input id="pin" type="password" placeholder="PIN" aria-label="PIN"><div class="row"><button class="btn" onclick="adminLogin()">Entrar</button></div><p class="err">${msg}</p></div></section>`;
 const tabs=['produtos','estoque','pedidos','combos'];
 let body='';
 if(atab==='produtos')body=`<div class="two"><div><h3>Novo produto</h3><label>Nome</label><input id="pn"><label>Preço (R$)</label><input id="pp" type="number" step="0.01"><label>Tipo</label><select id="pt"><option value="roupa">Roupa</option><option value="avulso">Avulso</option></select><label>Público</label><select id="pg"><option>Feminino</option><option>Masculino</option><option>Unissex</option></select><label>Coleção</label><input id="pc" list="cl" placeholder="Ex.: Verão 26"><datalist id="cl">${S.colls.map(c=>`<option value="${esc(c)}">`).join('')}</datalist><label>Tamanhos (separe por vírgula)</label><input id="ps" placeholder="P,M,G"><label>Estoque inicial</label><input id="pq" type="number" min="0"><label>Foto</label><input type="file" accept="image/*" onchange="pickImg(this)"><span id="imgok" class="tag"></span><div class="row"><button class="btn" onclick="addProd()">Salvar produto</button></div></div>
 <div class="scroll"><table><tr><th>Produto</th><th>Preço</th><th>Estoque</th><th></th></tr>${S.products.map(p=>`<tr><td>${esc(p.name)}<div class="tag">${p.type}${p.coll?' · '+esc(p.coll):''}</div></td><td>${money(p.price)}</td><td class="${p.stock<=3?'err':''}">${p.stock}</td><td><button class="btn sm ghost" onclick="delProd(${p.id})">Excluir</button></td></tr>`).join('')}</table></div></div>`;
 if(atab==='estoque')body=`<div class="two"><div><h3>Entrada ou saída</h3><label>Produto</label><select id="mp">${S.products.map(p=>`<option value="${p.id}">${esc(p.name)} (${p.stock})</option>`).join('')}</select><label>Movimento</label><select id="mt"><option value="entrada">Entrada</option><option value="saida">Saída</option></select><label>Quantidade</label><input id="mq" type="number" min="1"><label>Observação</label><input id="mn"><div class="row"><button class="btn" onclick="addMove()">Registrar</button></div></div>
 <div class="scroll"><h3>Histórico</h3>${S.moves.length?`<table><tr><th>Data</th><th>Produto</th><th>Mov.</th><th>Qtd</th><th>Obs.</th></tr>${S.moves.map(m=>`<tr><td>${m.date}</td><td>${esc(m.name)}</td><td>${m.type==='entrada'?'Entrada':'Saída'}</td><td>${m.qty}</td><td>${esc(m.note)}</td></tr>`).join('')}</table>`:'<div class="empty">Nenhuma movimentação ainda.</div>'}</div></div>`;
 if(atab==='pedidos')body=S.orders.length?S.orders.map(o=>`<div class="card in" style="margin-bottom:14px;padding:16px"><div class="line"><b>${o.id} · ${esc(o.customer.name)}</b><span class="st">${o.status}</span></div><div class="tag">${o.date} · ${esc(o.customer.phone)} · ${esc(o.customer.addr)} · CEP ${esc(o.customer.cep)}</div>${o.items.map(i=>`<div class="tag">${i.qty}x ${esc(i.name)} ${i.size?'('+esc(i.size)+')':''}</div>`).join('')}<div class="price">${money(o.total)} <span class="tag">(frete ${esc(o.ship.name)} ${money(o.ship.price)})</span></div>
 <div class="row"><select onchange="setStatus('${o.id}',this.value)" aria-label="Status">${STATUS.map(s=>`<option ${s===o.status?'selected':''}>${s}</option>`).join('')}</select><input id="tr${o.id}" placeholder="Código de rastreio" value="${esc(o.tracking)}"><button class="btn sm" onclick="setTrack('${o.id}')">Salvar rastreio</button></div></div>`).join(''):'<div class="empty">Os pedidos feitos na loja aparecem aqui.</div>';
 if(atab==='combos')body=`<div class="two"><div><h3>Novo combo</h3><label>Nome</label><input id="cbn"><label>Preço do combo (R$)</label><input id="cbp" type="number" step="0.01"><label>Produtos</label>${S.products.map(p=>`<label style="color:var(--tx)"><input class="cb" type="checkbox" value="${p.id}" style="width:auto"> ${esc(p.name)}</label>`).join('')}<div class="row"><button class="btn" onclick="addCombo()">Salvar combo</button></div></div><div>${S.combos.map(c=>`<div class="line"><span>${esc(c.name)} · ${money(c.price)}</span><button class="btn sm ghost" onclick="delCombo(${c.id})">Excluir</button></div>`).join('')||'<div class="empty">Nenhum combo.</div>'}</div></div>`;
 return `<section><div class="wrap"><h2>Painel administrativo</h2><div class="tabs" style="margin-top:14px">${tabs.map(t=>`<button class="${atab===t?'on':''}" onclick="atab='${t}';render()">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')}<button onclick="adminOk=false;view='loja';render()">Sair</button></div>${body}</div></section>`;
}
function vCart(){
 const c=S.customer||{};const sh=ship&&ship.opts?ship.opts[ship.sel]:null;
 return `<div class="drawer ${cartOpen?'open':''}" role="dialog" aria-label="Carrinho"><div class="line" style="border:0"><h2 style="margin:0">Carrinho</h2><button class="btn sm ghost" onclick="cartOpen=false;render()">Fechar</button></div>
 ${S.cart.length?S.cart.map((i,n)=>`<div class="line"><span>${i.qty}x ${esc(item(i.key).name)} ${i.size?'('+esc(i.size)+')':''}</span><span>${money(item(i.key).price*i.qty)} <button class="btn sm ghost" onclick="rm(${n})" aria-label="Remover">×</button></span></div>`).join(''):'<div class="empty">Seu carrinho está vazio. Escolha uma peça no catálogo.</div>'}
 ${S.cart.length?`<label>CEP de entrega</label><div class="row" style="margin-top:0"><input id="cep" value="${esc(ship?.cep||'')}" placeholder="00000-000" inputmode="numeric"><button class="btn sm" onclick="doCep()">Calcular</button></div>
 ${ship&&ship.err?'<div class="err">CEP inválido.</div>':''}${ship&&ship.opts?ship.opts.map((o,n)=>`<label style="color:var(--tx);display:flex;gap:8px"><input type="radio" name="fr" style="width:auto" ${n===ship.sel?'checked':''} onchange="setShip(${n})"> ${o.name} · ${o.days} dias · ${money(o.price)}</label>`).join(''):''}
 <label>Nome</label><input id="cn" value="${esc(c.name)}"><label>WhatsApp</label><input id="cp" value="${esc(c.phone)}"><label>E-mail</label><input id="ce" type="email" value="${esc(c.email)}"><label>Endereço completo</label><input id="ca" value="${esc(c.addr)}">
 <div class="line total" style="margin-top:14px"><span>Total</span><span>${money(cartSub()+(sh?sh.price:0))}</span></div>
 <div class="row"><button class="btn" style="width:100%" onclick="checkout()">Finalizar no WhatsApp</button></div><p class="tag">O pedido é salvo na sua conta antes de abrir o WhatsApp.</p>`:''}</div>`;
}
const IC={
 wa:'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/><g transform="translate(6.6 6.1) scale(.45)" stroke-width="3.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></g></svg>',
 tel:'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
 ig:'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><path d="M17.5 6.5h.01"/></svg>'
};
function vFooter(){
 return `<footer><div class="wrap"><div class="cols"><div><div class="brand" style="cursor:default">BONELY</div><div class="tag">Store</div></div>
 <div><h3>Atendimento</h3><ul class="contact">
 <li><a href="https://wa.me/${WA}" target="_blank" rel="noopener">${IC.wa}<span>WhatsApp<small>${PHONE}</small></span></a></li>
 <li><a href="tel:+${WA}">${IC.tel}<span>Ligar<small>${PHONE}</small></span></a></li>
 <li><a href="https://www.instagram.com/${IG}" target="_blank" rel="noopener">${IC.ig}<span>Instagram<small>@${IG}</small></span></a></li></ul></div>
 <div><h3>Informações</h3><a class="lk" href="privacidade.html">Política de Privacidade</a><a class="lk" href="cancelamento.html">Política de Cancelamento</a></div>
 <div><h3>Loja</h3><button class="lk" onclick="go('conta')">Minha conta</button><button class="lk" onclick="go('rastreio')">Rastrear pedido</button><button class="lk" onclick="go('admin')">Área da loja</button></div></div>
 <div class="copy">© ${new Date().getFullYear()} Bonely Store. Todos os direitos reservados. Enviamos para todo o Brasil.<br>Desenvolvido por <a href="https://linkneres.vercel.app/" target="_blank" rel="noopener">Dalton Neres</a> | Full Stack developer</div></div></footer>`;
}
function go(v){view=v;cartOpen=false;render();scrollTo(0,0)}
function render(){
 const n=S.cart.reduce((a,i)=>a+i.qty,0);
 $('#app').innerHTML=`<header><div class="wrap"><button class="brand" onclick="go('loja')" aria-label="Bonely, início">BONELY</button><nav><button onclick="filter='roupa';go('loja')">Roupas</button><button onclick="filter='avulso';go('loja')">Avulsos</button><button onclick="go('conta')">Minha conta</button><button onclick="go('rastreio')">Rastrear pedido</button><button class="btn sm" onclick="cartOpen=true;render()">Carrinho (${n})</button></nav></div></header>
 <main>${view==='loja'?vLoja():view==='conta'?vConta():view==='rastreio'?vRastreio():vAdmin()}</main>${vFooter()}${vCart()}<a class="wafab" href="https://wa.me/${WA}" target="_blank" rel="noopener" aria-label="Falar no WhatsApp">${IC.wa}</a>`;
}
render();
