const SEC=window.SECTION||'loja';
const WA='5521974424777', PHONE='+55 21 97442-4777', IG='bonely.store', OWNER='Gabriely', OWNER_FULL='Gabriely Bonfim', EMAIL='bonelystore@gmail.com', HOURS='Seg. à Sáb. 09h às 18h';
const IMP=SEC==='importados';
const CLEAN=(location.protocol||'')==='https:';
const PG={index:['/','index.html'],importados:['/importados','importados.html'],privacidade:['/privacidade','privacidade.html'],cancelamento:['/cancelamento','cancelamento.html']};
const pageUrl=n=>PG[n][CLEAN?0:1];
const homeUrl=()=>CLEAN?(IMP?'/importados':'/'):'/'+(IMP?'importados.html':'index.html');
const panelUrl=()=>aarea?'/painel/'+aarea:'/painel';
const LOGO=/^https?:/.test(location.protocol||'')?'/IMGs/logo_img.jpeg':'IMGs/logo_img.jpeg';
const CK=IMP?'cartImp':'cart';
const CIDADES=['Salto do Lontra','Dois Vizinhos (UTFPR)','Enéas Marques','Nova Esperança do Sudoeste','Francisco Beltrão'];
const BEN=[['shield','Loja 100% segura','selo SSL de segurança'],['map',IMP?'Entrega regional':'Entregamos',IMP?'ou retirada, você escolhe':'em todo o Brasil'],['card','Parcele suas compras','em até 12x'],['truck',IMP?'Frete na entrega':'Entrega rápida',IMP?'valor combinado na hora':'receba seu produto em poucos dias']];
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
 orders:[],moves:[],expenses:[],customer:null,cart:[],seq:1000});
let S; try{S=JSON.parse(localStorage.getItem(K))}catch(e){}
if(!S)S=demo();
if(!S.expenses)S.expenses=[];
function CART(){return S[CK]||(S[CK]=[])}
/* migra importados que ficaram no carrinho antigo (misturado) para o carrinho próprio */
try{if(!S.cartImp)S.cartImp=[];const mv=(S.cart||[]).filter(i=>{const p=S.products.find(x=>x.id==i.key);return p&&p.type==='avulso'});if(mv.length){S.cartImp.push(...mv);S.cart=S.cart.filter(i=>!mv.includes(i));localStorage.setItem(K,JSON.stringify(S))}}catch(e){}
const SK='bonely_session_v1';let FBM=false; /* FBM = Firebase ativo */
const save=()=>{
 try{if(FBM)localStorage.setItem(SK,JSON.stringify({customer:S.customer||null,cart:S.cart||[],cartImp:S.cartImp||[]}));else localStorage.setItem(K,JSON.stringify(S))}catch(e){}
 if(FBM&&FB.admin&&FB.loaded)FB.queue(S);
};
const $=s=>document.querySelector(s);
const money=v=>Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let view=window.STATIC_PAGE?'doc':'loja',filter='tudo',genF='',collF='',cartOpen=false,ship=null,adminOk=false,atab='produtos',msg='',trk=null,modal='',fs=null,menu=false,q='',pg='',pid=null,shareId=null,asp=null,asn='',asw='',aq='',ofil='Todos',vper='14d',cbSel=[],cbName='',cbPrice='',newQ=[],cdraft={},kindF='',aarea=null,apick=false,aedit=null,justOrdered=null,trkPre=null;

/* Camada de dados: com firebase.js carregado, a loja lê do Firestore e o painel grava nele (save() -> FB.queue). Sem ele, cai no localStorage (prévia). */

function freteDemo(c){const d=Math.abs(+c[0]-8);return [{name:'PAC (exemplo)',price:+(16+d*3.2).toFixed(2),days:4+d,demo:1},{name:'SEDEX (exemplo)',price:+(26+d*5.1).toFixed(2),days:1+Math.ceil(d/2),demo:1}]}
async function calcFrete(cep){
 const c=String(cep).replace(/\D/g,'');
 if(c.length!==8)return null;
 const qty=CART().reduce((a,i)=>a+i.qty,0)||1;
 try{
  const r=await fetch('/api/frete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cep:c,items:[{qty}],value:CART().length?cartSub():0})});
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
/* Estoque por tamanho: p.stk={P:3,M:5}. p.stock é sempre a SOMA (estoque geral).
   Produtos antigos, sem p.stk, continuam funcionando como antes até serem editados. */
const szOf=p=>{const l=parseOpts(p.sizes);return l.length?l:['Único']};
const hasStk=p=>!!(p&&p.stk&&typeof p.stk==='object');
const stkQ=(p,s)=>hasStk(p)?(+p.stk[s]||0):p.stock;
const sumOf=o=>Object.values(o).reduce((a,v)=>a+(+v||0),0);
const stkSum=p=>{p.stock=sumOf(p.stk)};
const rs=i=>String(i.key).startsWith('c')?'':(i.size||'');
function ensureStk(p){if(hasStk(p))return true;const l=szOf(p);if(l.length>1)return false;p.stk={[l[0]]:p.stock};return true}
function takeStk(p,q,s){
 if(!hasStk(p)){p.stock=Math.max(0,p.stock-q);return}
 if(s&&s in p.stk)p.stk[s]=Math.max(0,(+p.stk[s]||0)-q);
 else{let r=q;Object.keys(p.stk).sort((a,b)=>p.stk[b]-p.stk[a]).forEach(k=>{const t=Math.min(r,+p.stk[k]||0);p.stk[k]-=t;r-=t})}
 stkSum(p);
}
function giveStk(p,q,s){
 if(!hasStk(p)){p.stock+=q;return}
 const k=s&&s in p.stk?s:Object.keys(p.stk)[0];p.stk[k]=(+p.stk[k]||0)+q;stkSum(p);
}
function sizeOpts(p){
 let first=true;
 return szOf(p).map(x=>{const q=stkQ(p,x),out=hasStk(p)&&q<=0,sel=!out&&first;if(sel)first=false;
  return `<option value="${esc(x)}"${out?' disabled':''}${sel?' selected':''}>${esc(x)}${hasStk(p)?(out?' (esgotado)':q<=3?' (restam '+q+')':''):''}</option>`}).join('');
}
const lowTag=p=>!hasStk(p)&&p.stock<=3?`<div class="tag">Restam ${p.stock}</div>`:'';
function stockOf(key,size){
 if(String(key).startsWith('c')){const c=item(key).combo;return Math.min(...c.items.map(i=>S.products.find(p=>p.id==i)?.stock??0))}
 const p=item(key).p;return size?stkQ(p,size):p.stock;
}
function addCart(key){
 const sel=$('#sz'+key),size=sel?sel.value:'';
 const ex=CART().find(i=>i.key==key&&i.size==size);
 const q=(ex?ex.qty:0)+1;
 if(q>stockOf(key,size)){alert('Sem estoque suficiente'+(size&&size!=='Único'?' no tamanho '+size:'')+'.');return}
 ex?ex.qty++:CART().push({key,size,qty:1});
 save();cartOpen=true;render();
}
const cartSub=()=>CART().reduce((a,i)=>a+item(i.key).price*i.qty,0);
function setShip(i){ship.sel=i;render()}
function keepDraft(){const g=id=>$(id)?$(id).value:'';cdraft={name:g('#cn'),phone:g('#cp'),email:g('#ce'),addr:g('#ca')};for(const k in cdraft)if(!cdraft[k])delete cdraft[k]}
function setCity(v){if(!ship||!ship.other)return;ship.city=v;const t=v.trim();ship.opts[0].name=t?'Entrega em '+t+' (valor combinado na entrega)':'Entrega (cidade a informar, valor combinado na entrega)'}
function setLocal(v){keepDraft();
 if(!v){ship=null}
 else if(v==='retirada'){ship={local:1,mode:'retirada',opts:[{name:'Retirada na loja',price:0,days:0,local:1}],sel:0}}
 else if(v==='__outra'){ship={local:1,mode:'entrega',other:1,city:'',opts:[{name:'Entrega (cidade a informar, valor combinado na entrega)',price:0,days:0,local:1}],sel:0}}
 else{ship={local:1,mode:'entrega',city:v,opts:[{name:'Entrega em '+v+' (valor combinado na entrega)',price:0,days:0,local:1}],sel:0}}
 render()}
async function doCep(){const v=$('#cep').value;ship={loading:1,cep:v};render();const f=await calcFrete(v);ship=f==='erro'?{fail:1,cep:v}:f?{cep:v,opts:f,sel:0}:{err:1};render()}
function rm(i){CART().splice(i,1);save();render()}

async function checkout(){if(checkout.b)return;checkout.b=1;try{await _checkout()}finally{checkout.b=0}}
async function _checkout(){
 const g=id=>($(id)?$(id).value:'').trim();
 const c={name:g('#cn'),phone:g('#cp'),email:g('#ce').toLowerCase(),addr:g('#ca')};
 if(!CART().length)return alert('Carrinho vazio.');
 const retira=IMP&&ship&&ship.mode==='retirada';
 if(IMP&&(!ship||!ship.opts))return alert('Escolha retirada ou a cidade de entrega.');
 if(IMP&&ship.other&&!String(ship.city||'').trim())return alert('Informe o nome da cidade de entrega.');
 if(IMP&&ship.other)ship.city=ship.city.trim();
 if(retira)c.addr='Retirada na loja';
 else if(IMP&&ship.city&&c.addr)c.addr=c.addr+' - '+ship.city;
 if(!c.name||!c.phone||!c.email||!c.addr)return alert(retira?'Preencha nome, WhatsApp e e-mail.':'Preencha nome, WhatsApp, e-mail e endereço.');
 if(!ship||!ship.opts)return alert('Calcule o frete pelo CEP.');
 const sh=ship.opts[ship.sel];
 const items=CART().map(i=>({key:i.key,name:item(i.key).name,price:item(i.key).price,qty:i.qty,size:i.size}));
 const sub=cartSub();
 const seq=FBM?await FB.nextSeq().catch(()=>null):++S.seq;
 if(!seq)return alert('Não foi possível registrar o pedido agora. Tente de novo em instantes.');
 const o={id:'BN'+seq,date:new Date().toLocaleString('pt-BR'),ts:Date.now(),customer:{...c,cep:ship.local?'':ship.cep},items,subtotal:sub,ship:sh,total:sub+sh.price,pay:$('#cpay').value,status:STATUS[0],tracking:'',stockDone:false,area:IMP?'importados':'moda'};
 if(FBM){try{await FB.placeOrder(o,c)}catch(e){console.error(e);return alert('Não foi possível registrar o pedido agora. Tente de novo em instantes.')}}
 S.orders.unshift(o);saveCustomer(c);if(FBM&&S.customer)S.customer.orderIds=[...new Set([...(S.customer.orderIds||[]),o.id])];S[CK]=[];ship=null;cdraft={};cartOpen=false;save();
 const wm=`Olá, ${OWNER}! O pedido *${o.id}* foi realizado.\n\nCliente: ${c.name}\n`+items.map(i=>`• ${i.qty}x ${i.name}${i.size?' ('+i.size+')':''} - ${money(i.price*i.qty)}`).join('\n')+`\n\n${sh.local?(retira?'*Retirada na loja*':'*'+sh.name+'*\nO valor da entrega é calculado na hora da entrega.'):'Frete '+sh.name+': '+money(sh.price)}\n*Total: ${money(o.total)}*${sh.local?' (sem frete)':''}\nForma de pagamento: ${o.pay}\n\n${retira?'Retirada: combinar com a loja':'Entrega: '+c.addr+(o.customer.cep?' (CEP '+o.customer.cep+')':'')}`;
 const txt=encodeURIComponent(wm);
 justOrdered=o.id;view='conta';render();scrollTo(0,0);
 window.open(`https://wa.me/${WA}?text=${txt}`,'_blank');
}

/* Admin */
function _setStatus(id,st){
 const o=S.orders.find(x=>x.id===id);o.status=st;
 if(st==='Pago'&&!o.stockDone){
  o.items.forEach(i=>{const ps=String(i.key).startsWith('c')?item(i.key)?.combo.items.map(x=>S.products.find(p=>p.id==x)):[S.products.find(p=>p.id==i.key)];
   (ps||[]).forEach(p=>{if(p){takeStk(p,i.qty,rs(i));S.moves.unshift({date:new Date().toLocaleString('pt-BR'),name:p.name,size:rs(i),type:'saida',qty:i.qty,note:'Pedido '+id,area:isImpP(p)?'importados':'moda'})}})});
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
function editProd(id){aedit=id;newImg='';render();scrollTo(0,0)}
function cancelEdit(){aedit=null;pform=false;newImg='';render()}
function addProd(){
 const n=$('#pn').value.trim(),pr=parseFloat($('#pp').value);
 if(!n||isNaN(pr))return alert('Informe nome e preço.');
 const v=id=>$(id)?$(id).value.trim():'';
 const has=id=>!!$(id),d={...(aedit?{}:{coll:'',sizes:'Único',brand:'',desc:'',specs:''}),name:n,price:pr,gen:$('#pg')?$('#pg').value:''};
 if(has('#pc'))d.coll=v('#pc');if(has('#pk'))d.kind=v('#pk');if(has('#popts')){const ck=[...document.querySelectorAll('#popts .po:checked')].map(e=>e.value),ex=parseOpts(v('#pxo')).filter(x=>!ck.some(y=>y.toLowerCase()===x.toLowerCase()));
  if(!ck.length&&!ex.length)return alert('Marque ao menos uma opção em "'+fc('sizes').l+'" (tamanho ou sabor). O estoque é controlado por opção.');
  const nw=[...document.querySelectorAll('#popts .po[data-new]')].filter(e=>e.checked).map(e=>e.value),add=[...nw,...ex];
  if(add.length){S.cfg=S.cfg||{};const c=S.cfg[aarea]=S.cfg[aarea]||{f:{}},o=optCfg();c.opt={name:(c.opt&&c.opt.name)||'',list:[...o.list,...add.filter((x,i)=>add.findIndex(y=>y.toLowerCase()===x.toLowerCase())===i&&!o.list.some(y=>y.toLowerCase()===x.toLowerCase()))]}}
  d.sizes=[...ck,...ex].join(',')}if(has('#pm'))d.brand=v('#pm');if(has('#pd'))d.desc=v('#pd');if(has('#px'))d.specs=cleanSpecs(v('#px'));
 if(d.coll&&!S.colls.includes(d.coll))S.colls.push(d.coll);
 const epr=aedit?S.products.find(x=>x.id==aedit):null,szF=d.sizes?parseOpts(d.sizes):(epr?szOf(epr):['Único']),hasGrid=!!document.querySelector('.pqs'),nv={};
 document.querySelectorAll('.pqs').forEach(e=>nv[e.dataset.s]=Math.max(0,parseInt(e.value)||0));
 const newStk={};szF.forEach(x=>{newStk[x]=nv[x]||0});
 if(aedit){const p=epr;if(p){
   if(hasGrid&&!hasStk(p)&&p.stock>0&&!sumOf(newStk)&&!confirm('Nenhum tamanho está com estoque informado. As '+p.stock+' peças deste produto serão zeradas. Continuar?'))return;
   if(hasGrid)applyStk(p,newStk,'Ajuste no cadastro');
   Object.assign(p,d);if(newImg)p.img=newImg}
  aedit=null;pform=false;newImg='';save();render();toast('Produto salvo.');return}
 S.products.push({id:Date.now(),type:$('#pt').value,...d,stk:newStk,stock:sumOf(newStk),img:newImg});
 Object.keys(newStk).forEach(x=>{if(newStk[x]>0)S.moves.unshift({date:new Date().toLocaleString('pt-BR'),name:n,size:x,type:'entrada',qty:newStk[x],note:'Cadastro inicial',area:aarea})});
 pform=false;newImg='';save();render();toast('Produto salvo.');
}
function delProd(id){if(confirm('Excluir produto?')){if(aedit===id)aedit=null;S.products=S.products.filter(p=>p.id!==id);save();render()}}
async function addMove(){
 const p=S.products.find(x=>x.id==$('#mp').value),q=parseInt($('#mq').value),t=$('#mt').value,z=$('#ms')?$('#ms').value:'',note=($('#mn').value||'').trim();
 if(!p||!q||q<1)return alert('Escolha produto e quantidade.');
 if(!ensureStk(p))return alert('Este produto ainda não tem o estoque dividido por tamanho. Abra ele em Produtos > Editar e informe quanto tem de cada tamanho.');
 const cur=stkQ(p,z),sale=t==='venda';
 if(t!=='entrada'&&q>cur)return alert((sale?'Venda':'Saída')+' maior que o estoque'+(z&&z!=='Único'?' do tamanho '+z:'')+' ('+cur+').');
 const area=isImpP(p)?'importados':'moda',when=()=>new Date().toLocaleString('pt-BR');
 if(sale){
  const v=parseFloat(String($('#mv').value).replace(',','.')),pay=$('#mpay').value,cli=($('#mcl').value||'').trim();
  if(!(v>=0))return alert('Informe o valor de venda de cada peça.');
  if(addMove.b)return;addMove.b=1;
  try{
   const seq=FBM?await FB.nextSeq().catch(()=>null):++S.seq;
   if(!seq)return alert('Não foi possível registrar a venda agora. Tente de novo em instantes.');
   const id='BN'+seq,sub=+(v*q).toFixed(2),ts=Date.now();
   S.orders.unshift({id,date:when(),ts,customer:{name:cli||'Venda na loja',email:'',phone:'',addr:'Venda na loja',cep:''},items:[{key:p.id,name:p.name,price:v,qty:q,size:z}],subtotal:sub,ship:{name:'Venda na loja',price:0,local:true},total:sub,pay,status:'Entregue',tracking:'',stockDone:true,store:true,area});
   S.seen=[...(S.seen||[]),id];
   takeStk(p,q,z);
   S.moves.unshift({date:when(),ts,name:p.name,size:z,type:'saida',qty:q,note:('Venda na loja '+id+(note?' · '+note:'')),area});
   mvOpen=false;mvP=null;save();render();toast('Venda '+id+' registrada como Entregue.');
  }finally{addMove.b=0}
  return;
 }
 p.stk[z]=(+p.stk[z]||0)+(t==='entrada'?q:-q);stkSum(p);
 S.moves.unshift({date:when(),ts:Date.now(),name:p.name,size:z,type:t==='entrada'?'entrada':'saida',qty:q,note,area});mvOpen=false;mvP=null;save();render();toast('Movimento registrado.');
}
function addCombo(){
 const n=cbName.trim(),pr=parseFloat(cbPrice);
 if(!n||isNaN(pr)||cbSel.length<2)return alert('Informe nome, preço e ao menos 2 produtos.');
 S.combos.push({id:Date.now(),name:n,price:pr,items:[...cbSel]});
 cbName='';cbPrice='';cbSel=[];aq='';save();render();
}
function delCombo(id){S.combos=S.combos.filter(c=>c.id!==id);save();render()}
function saveCustomer(c){
 S.customers=S.customers||[];
 const k=S.customers.find(x=>x.email===c.email);
 if(k)Object.assign(k,Object.fromEntries(Object.entries(c).filter(([,v])=>v)));else S.customers.push({addr:'',...c});
 S.customer=S.customers.find(x=>x.email===c.email);
}
let lmode='find',lq='',lerr='',lnote='',lfrom='',lf={name:'',email:'',phone:''};
const acct=()=>S.customer?"go('conta')":"openLogin('')";
const normPhone=s=>{let d=String(s||'').replace(/\D/g,'');if(d.length>11&&d.startsWith('55'))d=d.slice(2);return d};
function findCustomer(v){
 v=String(v||'').trim();if(!v)return null;
 const em=v.includes('@')?v.toLowerCase():'',ph=em?'':normPhone(v);
 if(!em&&ph.length<10)return null;
 const same=c=>em?String(c.email||'').toLowerCase()===em:(normPhone(c.phone).length>=10&&normPhone(c.phone).slice(-10)===ph.slice(-10));
 S.customers=S.customers||[];
 let c=S.customers.find(same);
 if(!c){const o=S.orders.find(x=>!x.demo&&!x.sample&&x.customer&&same(x.customer));
  if(o){const k=o.customer;c={name:k.name,email:k.email,phone:k.phone,addr:k.addr==='Retirada na loja'?'':(k.addr||'')};S.customers.push(c)}}
 return c||null}
function loginFocus(){setTimeout(()=>{const e=$('#lq')||$('#lnm');if(e)e.focus()},40)}
function openLogin(from){if(from==='cart')keepDraft();lfrom=from||'';lmode='find';lq='';lerr='';lnote='';lf={name:'',email:'',phone:''};modal='login';menu=false;if(from!=='cart')cartOpen=false;render();loginFocus()}
function closeLogin(){modal='';lerr='';lnote='';render()}
function setLmode(m){if(m==='new'&&lmode==='find'&&lq.trim()){const em=lq.includes('@');lf={name:lf.name,email:em?lq.trim().toLowerCase():lf.email,phone:em?lf.phone:lq.trim()}}lmode=m;lerr='';lnote='';render();loginFocus()}
async function loginDone(c){S.customer=c;if(FBM){S.customers=[c];await loadMine()}save();const f=lfrom;modal='';lerr='';lnote='';lfrom='';if(f==='cart')render();else go('conta')}
const rFind=async v=>FBM?(await FB.findCustomer(v).catch(()=>null)):findCustomer(v);
async function loadMine(){if(!FBM||!S.customer||(FB.admin&&FB.loaded))return;try{S.orders=await FB.myOrders(S.customer)}catch(e){console.warn(e)}}
function custLogout(){S.customer=null;if(FBM&&!FB.loaded)S.orders=[];save();render()}
async function doFind(){const c=await rFind(lq);if(c)return loginDone(c);
 lf={name:'',email:lq.includes('@')?lq.trim().toLowerCase():'',phone:lq.includes('@')?'':lq.trim()};lmode='new';lerr='';lnote='Não encontramos esse cadastro. Crie o seu abaixo, é rapidinho.';render();loginFocus()}
async function doNew(){
 const n=lf.name.trim(),e=lf.email.trim().toLowerCase(),p=lf.phone.trim();
 if(!n)return setLerr('Informe seu nome.');
 if(!/^\S+@\S+\.\S+$/.test(e))return setLerr('Informe um e-mail válido.');
 if(normPhone(p).length<10)return setLerr('Informe o WhatsApp com DDD.');
 const ex=(await rFind(e))||(await rFind(p));
 if(ex)return loginDone(ex);
 saveCustomer({name:n,email:e,phone:p});loginDone(S.customer)}
function setLerr(m){lerr=m;render()}
function vLogin(){
 const nw=lmode==='new';
 return `<div class="modal" onclick="if(event.target===this)closeLogin()"><div class="lgn" role="dialog" aria-modal="true" aria-labelledby="lt">
 <button class="lgx" onclick="closeLogin()" aria-label="Fechar">×</button>
 <span class="lgk">BONELY STORE</span>
 <h2 id="lt">${nw?'Criar cadastro':'Entrar'}</h2>
 <p class="lgs">${nw?'Leva menos de um minuto. Nos próximos pedidos a gente já preenche tudo para você.':'Digite seu e-mail ou WhatsApp para acessar seus dados e pedidos.'}</p>
 ${lnote?`<div class="lgnote">${esc(lnote)}</div>`:''}
 ${nw?`<label for="lnm">Nome</label><input id="lnm" value="${esc(lf.name)}" oninput="lf.name=this.value" autocomplete="name">
 <label for="lem">E-mail</label><input id="lem" type="email" value="${esc(lf.email)}" oninput="lf.email=this.value" autocomplete="email">
 <label for="lph">WhatsApp</label><input id="lph" value="${esc(lf.phone)}" oninput="lf.phone=this.value" inputmode="tel" autocomplete="tel" onkeydown="if(event.key==='Enter')doNew()">
 ${lerr?`<p class="lgerr">${esc(lerr)}</p>`:''}<button class="lgb" onclick="doNew()">Criar cadastro</button>
 <p class="lgsw">Já é cliente? <button onclick="setLmode('find')">Entrar</button></p>`
 :`<label for="lq">E-mail ou WhatsApp</label><input id="lq" value="${esc(lq)}" oninput="lq=this.value" onkeydown="if(event.key==='Enter')doFind()" autocomplete="username">
 ${lerr?`<p class="lgerr">${esc(lerr)}</p>`:''}<button class="lgb" onclick="doFind()">Entrar</button>
 <p class="lgsw">Ainda não é cliente? <button onclick="setLmode('new')">Criar cadastro</button></p>`}
 <p class="lgf">Ao continuar, você concorda com a <a href="${pageUrl('privacidade')}" target="_blank" rel="noopener">Política de Privacidade</a>.</p></div></div>`}
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
async function findOrder(){
 const id=$('#ro').value.trim().toUpperCase(),em=$('#re').value.trim().toLowerCase();
 let o=S.orders.find(x=>x.id===id&&x.customer.email===em);
 if(!o&&FBM&&id&&em){try{o=await FB.getOrder(id,em)}catch(e){o=null}}
 trk=o?{o}:{err:1};render();
}
function vRastreio(){
 const o=trk&&trk.o;
 return `<section><div class="wrap" style="max-width:560px"><h2>Rastrear pedido</h2><p class="sub">Veja o andamento do seu pedido e o código de rastreio.</p>
 <label>Número do pedido</label><input id="ro" placeholder="Ex.: BN1001" value="${trkPre?esc(trkPre.id):''}"><label>E-mail usado na compra</label><input id="re" type="email" value="${trkPre?esc(trkPre.em):''}"><div class="row"><button class="btn" onclick="findOrder()">Consultar pedido</button></div>
 ${trk&&trk.err?'<p class="err">Pedido não encontrado. Confira o número e o e-mail.</p>':''}
 ${o?`<div class="card in" style="margin-top:20px;padding:16px"><div class="line"><b>${o.id}</b><span class="st">${o.status}</span></div>${steps(o)}${trackBlock(o)}</div>`:''}
 <h3 style="margin-top:34px">Já tem o código dos Correios?</h3><p class="tag">Digite o código e abrimos a consulta de entrega em outra aba. O trajeto da encomenda aparece no site dos Correios, não aqui.</p>
 <div class="row"><input id="rc" placeholder="Ex.: AA123456789BR" aria-label="Código de rastreio"><button class="btn ghost" onclick="const c=$('#rc').value.trim();if(c)window.open('https://www.melhorrastreio.com.br/rastreio/'+encodeURIComponent(c),'_blank')">Rastrear</button></div></div></section>`;
}
function match(p,nk){
 if(q&&![p.name,p.kind,p.brand].filter(Boolean).join(' ').toLowerCase().includes(q.toLowerCase()))return false;
 if((SEC==='importados')!==(p.type==='avulso'))return false;
 if(SEC!=='importados'){
  if(collF&&p.coll!==collF)return false;
  const g=p.gen||'Unissex';
  if(filter!=='tudo'&&g!==filter&&g!=='Unissex')return false;
 }
 if(!nk){if(kindF==='__none')return !p.kind;if(kindF&&p.kind!==kindF)return false}
 return true;
}
function cat(f,col){if(SEC==='importados'&&(f==='Feminino'||f==='Masculino'||col)){location.href=pageUrl('index')+'?'+new URLSearchParams({v:'loja',f:f,c:col||'',g:'cat'});return}
 clearUrl();pg='cat';filter=f;collF=col||'';kindF='';view='loja';cartOpen=false;menu=false;render();setTimeout(()=>{const e=document.getElementById('cat');if(e)e.scrollIntoView({behavior:'smooth'})},30)}
function goto(id){pg=id;view='loja';cartOpen=false;menu=false;render();setTimeout(()=>{const e=document.getElementById(id);if(e)e.scrollIntoView({behavior:'smooth'})},30)}
function doSearch(e){e.preventDefault();q=$('#q').value.trim();cat('tudo')}
function vMenu(){
 const imp=SEC==='importados';
 return `<div class="scrim ${menu?'show':''}" onclick="menu=false;render()"></div><div class="drawer left ${menu?'open':''}" role="dialog" aria-label="Menu"><div class="line" style="border:0"><h2 style="margin:0">Menu</h2><button class="btn sm ghost" onclick="menu=false;render()">Fechar</button></div>
 ${imp?`<button class="mlk" onclick="q='';cat('tudo')">Todos os importados</button><a class="mlk" href="${pageUrl('index')}">Moda feminina e masculina</a>`:`<button class="mlk" onclick="q='';cat('tudo')">Todos os produtos</button><button class="mlk" onclick="q='';cat('Feminino')">Feminino</button><button class="mlk" onclick="q='';cat('Masculino')">Masculino</button><a class="mlk" href="${pageUrl('importados')}">Importados</a>`}
 ${!imp&&S.colls.length?'<h3 style="margin:18px 0 4px;color:var(--gold)">Coleções</h3>'+S.colls.map((c,i)=>`<button class="mlk" onclick="q='';cat('tudo',S.colls[${i}])">${esc(c)}</button>`).join(''):''}
 ${!imp&&S.combos.length?'<button class="mlk" onclick="goto(\'combos\')">Combos</button>':''}
 <h3 style="margin:18px 0 4px;color:var(--gold)">Sua conta</h3><button class="mlk" onclick="${acct()}">Minha conta</button>${IMP?'':`<button class="mlk" onclick="go('rastreio')">Rastrear pedido</button>`}${IMP?'':`<button class="mlk" onclick="menu=false;modal='frete';render()">Simular frete</button>`}</div>`;
}
function docBack(){try{if(history.length>1&&document.referrer){const r=new URL(document.referrer);if(r.origin===location.origin&&!/\/(privacidade|cancelamento)(\.html)?\/?$/.test(r.pathname)){history.back();return false}}}catch(e){}return true}
function vDoc(){const t=document.getElementById('doc');const bk=`<a class="docback" href="${homeUrl()}" onclick="return docBack()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>Voltar à loja</a>`;return `<section><div class="wrap doc" style="padding-top:0;padding-bottom:0">${bk}${t?t.innerHTML:''}</div></section>`}
function clearUrl(){try{if(window.STATIC_PAGE)return;if(/\/(produto|painel)(\/|$)/.test(location.pathname))history.replaceState(null,'',homeUrl());else if(location.search)history.replaceState(null,'',location.pathname)}catch(e){}}
function slug(t){return String(t).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
function prodPath(p){return (p.type==='avulso'?'/importados/produto/':'/produto/')+slug(p.name)+'-'+p.id}
function prodUrl(p){
 if(/^https?:/.test(location.protocol||'')&&location.origin)return location.origin+prodPath(p);
 let d=location.href.split('#')[0].split('?')[0];
 d=d.slice(0,d.lastIndexOf('/')+1);
 return d+(p.type==='avulso'?'importados.html':'index.html')+'?p='+p.id;
}
const fmtWA=t=>esc(t).replace(/\*(.+?)\*/g,'<b>$1</b>');
const pcard=p=>`<div class="pcard">${ph(p)}<div><b>${esc(p.name)}</b><div class="price">${money(p.price)}</div><div class="tag">Bonely Store${p.type==='avulso'?' · Importados':''}</div></div></div>`;
function shareMsg(p,name,loja){
 const u=prodUrl(p),pr=`*${p.name}*\n${money(p.price)}`;
 return loja?`Olá${name?', '+name:''}! 💛\nO produto que você deseja está disponível em nosso site ✨\n\n${pr}\n\nVeja aqui 👇\n${u}\n\nBonely Store`
  :`${name?'Oi, '+name+'! 💛\n':''}Olha o que eu achei na Bonely Store ✨\n\n${pr}\n\nVeja aqui 👇\n${u}`;
}
function copyText(t,ok){
 if(typeof navigator!=='undefined'&&navigator.clipboard)navigator.clipboard.writeText(t).then(ok,()=>{window.prompt('Copie o link:',t);ok()});
 else{window.prompt('Copie o link:',t);ok()}
}
function openProd(id){pid=id;view='produto';cartOpen=false;menu=false;try{const pp=S.products.find(x=>x.id==id);history.replaceState(null,'',pp&&/^https?:/.test(location.protocol||'')?prodPath(pp):'?p='+id)}catch(e){}render();scrollTo(0,0)}
function openShare(id){shareId=id;modal='share';render()}
function waShare(){const p=S.products.find(x=>x.id==shareId);window.open('https://wa.me/?text='+encodeURIComponent(shareMsg(p,$('#shn').value.trim())),'_blank')}
function copyLink(el,id){const p=S.products.find(x=>x.id==id);copyText(prodUrl(p),()=>{el.textContent='Link copiado ✓'})}
async function nativeShare(){const p=S.products.find(x=>x.id==shareId);try{await navigator.share({title:p.name,text:'Olha o que eu achei na Bonely Store: '+p.name+' por '+money(p.price),url:prodUrl(p)})}catch(e){}}
function curShareProd(){const l=AP().filter(aMatch);return l.find(x=>x.id==asp)||l[0]}
function adminShare(ch){
 const p=curShareProd();if(!p)return alert('Escolha um produto.');
 const n=asn.trim(),w=asw.replace(/\D/g,'');
 S.shares=S.shares||[];
 S.shares.unshift({area:isImpP(p)?'importados':'moda',date:new Date().toLocaleString('pt-BR'),name:p.name,to:[n,asw.trim()].filter(Boolean).join(' · '),ch});save();
 if(ch==='wa'){const num=w?(w.length<=11?'55'+w:w):'';window.open('https://wa.me/'+num+'?text='+encodeURIComponent(shareMsg(p,n,1)),'_blank');render()}
 else copyText(prodUrl(p),render);
}
function vShare(){
 const p=S.products.find(x=>x.id==shareId);if(!p)return '';
 return `<div class="modal" onclick="if(event.target===this){modal='';render()}"><div role="dialog" aria-label="Compartilhar produto" style="width:min(460px,100%)"><h2>Compartilhar</h2><p class="sub">Envie esta peça para um amigo ou alguém da família.</p>
 ${pcard(p)}
 <label>Nome de quem vai receber (opcional)</label><input id="shn" placeholder="Ex.: Maria">
 <div class="linkbox">${IC.share}<span>${esc(prodUrl(p).replace(/^https?:\/\//,''))}</span></div>
 <div class="row"><button class="btn" onclick="waShare()">Enviar pelo WhatsApp</button><button class="btn ghost" onclick="copyLink(this,${p.id})">Copiar link</button>${typeof navigator!=='undefined'&&navigator.share?`<button class="btn ghost" onclick="nativeShare()">Mais opções</button>`:''}</div>
 <div class="row"><button class="btn sm ghost" onclick="modal='';render()">Fechar</button></div></div></div>`;
}
function specsHtml(p){const L=String(p.specs||'').split(/\r?\n/).map(x=>x.trim()).filter(x=>x&&!/^[^:]+:\s*$/.test(x));if(!L.length)return '';return `<ul class="pspec">${L.map(x=>{const i=x.indexOf(':');return i>0?`<li><span>${esc(x.slice(0,i).trim())}</span><b>${esc(x.slice(i+1).trim())}</b></li>`:`<li><b>${esc(x)}</b></li>`}).join('')}</ul>`}
function vProduto(){
 const p=S.products.find(x=>x.id==pid);
 if(!p)return `<section><div class="wrap"><h2>Produto não encontrado</h2><p class="sub">Esse link pode estar desatualizado.</p><button class="btn" onclick="go('loja')">Ver catálogo</button></div></section>`;
 const imp=p.type==='avulso';
 return `<section><div class="wrap"><p class="backrow"><button class="backbtn" onclick="go('loja')"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>Voltar ao catálogo</button></p>
 <div class="pdp"><div class="card">${ph(p)}</div><div><h2 style="margin-bottom:4px">${esc(p.name)}</h2><div class="tag">${[p.brand?'Marca '+p.brand:'',imp?'Importado':p.gen,p.kind,p.coll].filter(Boolean).map(esc).join(' · ')}</div><div class="price" style="font-size:28px;margin:12px 0">${money(p.price)}</div>${p.desc?`<p class="pdesc">${esc(p.desc)}</p>`:''}${specsHtml(p)}
 ${p.stock>0?`<label>${esc(optName(p))}</label><select id="sz${p.id}">${sizeOpts(p)}</select>${lowTag(p)}<div class="row"><button class="btn" onclick="addCart(${p.id})">Adicionar ao carrinho</button><button class="btn ghost" onclick="openShare(${p.id})">${IC.share}Compartilhar</button></div>`:`<div class="tag err">Esgotado</div><div class="row"><button class="btn ghost" onclick="openShare(${p.id})">${IC.share}Compartilhar</button></div>`}</div></div></div></section>`;
}
function updPrev(){const p=curShareProd(),e=$('#amsg');if(p&&e)e.innerHTML=fmtWA(shareMsg(p,asn.trim(),1))}
function vShareAdmin(){
 if(!AP().length)return '<div class="empty">Cadastre um produto primeiro.</div>';
 const list=AP().filter(aMatch),p=curShareProd(),log=(S.shares||[]).filter(l=>(l.area||(isImpP(S.products.find(x=>x.name===l.name))?'importados':'moda'))===aarea);
 return `<div class="two"><div><h3>Enviar produto para um cliente</h3>${aSearch('Buscar produto pelo nome')}<label>Produto</label>${p?`<select onchange="asp=this.value;render()" aria-label="Produto">${list.map(x=>`<option value="${x.id}" ${x.id==p.id?'selected':''}>${esc(x.name)}${x.type==='avulso'?' (importado)':''}</option>`).join('')}</select>`:'<div class="empty">Nenhum produto encontrado.</div>'}
 <label>Nome do cliente (opcional)</label><input value="${esc(asn)}" oninput="asn=this.value;updPrev()" placeholder="Ex.: Ana">
 <label>WhatsApp do cliente (opcional)</label><input value="${esc(asw)}" oninput="asw=this.value" inputmode="tel" placeholder="Ex.: 21 99999-9999">
 ${p?`<label>Mensagem que será enviada</label>${pcard(p)}<div class="bubble" id="amsg">${fmtWA(shareMsg(p,asn.trim(),1))}</div>
 <div class="row"><button class="btn" onclick="adminShare('wa')">Enviar pelo WhatsApp</button><button class="btn ghost" onclick="adminShare('copy')">Copiar link</button></div>`:''}
 <p class="tag">Sem o WhatsApp do cliente, você escolhe o contato ao abrir o WhatsApp.</p></div>
 <div class="scroll"><h3>Histórico de envios</h3>${log.length?`<table><tr><th>Data</th><th>Produto</th><th>Para</th><th>Canal</th></tr>${log.map(l=>`<tr><td>${l.date}</td><td>${esc(l.name)}</td><td>${esc(l.to||'-')}</td><td>${l.ch==='wa'?'WhatsApp':'Link copiado'}</td></tr>`).join('')}</table>`:'<div class="empty">Nenhum envio ainda.</div>'}</div></div>`;
}
async function calcF(){const v=$('#cepm').value;fs={cep:v,loading:1};render();const f=await calcFrete(v);fs={cep:v,opts:f==='erro'?null:f,fail:f==='erro'};render()}
function vModal(){
 return `<div class="modal" onclick="if(event.target===this){modal='';render()}"><div role="dialog" aria-label="Simular frete" style="width:min(460px,100%)"><h2>Simular frete</h2><p class="sub">Informe o CEP para ver valor e prazo de entrega.</p>
 <div class="row" style="margin-top:0"><input id="cepm" value="${esc(fs?fs.cep:'')}" placeholder="00000-000" inputmode="numeric" aria-label="CEP"><button class="btn" onclick="calcF()">Calcular</button></div>
 ${fs&&fs.loading?'<p class="tag">Calculando…</p>':''}${fs&&!fs.loading&&fs.fail?'<p class="err">Não foi possível calcular agora. Tente novamente em instantes.</p>':''}${fs&&!fs.loading&&!fs.fail&&!fs.opts?'<p class="err">CEP inválido. Digite 8 números.</p>':''}
 ${fs&&fs.opts?fs.opts.map(o=>`<div class="line"><span>${o.name} · ${o.days} dias úteis</span><span class="price">${money(o.price)}</span></div>`).join('')+`<p class="tag">${fs.opts[0].demo?'Valores de exemplo (modo de teste).':'Valores calculados pelo Melhor Envio.'} O valor final aparece no carrinho.</p>`:''}
 <div class="row"><button class="btn ghost" onclick="modal='';render()">Fechar</button></div></div></div>`;
}
var aemv='';
const EYE_ON='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',EYE_OFF='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.9 17.9A10.6 10.6 0 0 1 12 19c-6.4 0-10-7-10-7a18 18 0 0 1 4.1-4.9M9.9 5.2A9.7 9.7 0 0 1 12 5c6.4 0 10 7 10 7a18 18 0 0 1-2.2 3.2M1 1l22 22"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
function togglePw(){const p=$('#pin'),b=$('.pwb');if(!p)return;const h=p.type==='password';p.type=h?'text':'password';b.innerHTML=h?EYE_OFF:EYE_ON;const t=h?'Ocultar senha':'Mostrar senha';b.setAttribute('aria-label',t);b.title=t;p.focus()}
async function adminLogin(){
 if(FBM){const a=$('#aem');aemv=a?a.value.trim():''}
 if(!FBM){if($('#pin').value==='1234'){adminOk=true;render()}else msg='PIN incorreto.',render();return}
 if(!aemv||!$('#pin').value){msg='Preencha o e-mail e a senha.';render();return}
 try{await FB.login(aemv,$('#pin').value);await enterAdmin();msg='';aemv=''}catch(e){msg=FB.errMsg(e)}
 render();
}
async function enterAdmin(){
 await FB.loadAdmin(S);adminOk=true;msg='';
 FB.onerr=()=>toast('Não foi possível salvar na nuvem. Verifique a conexão.');
 FB.listen(S,()=>{if(view==='admin'&&adminOk&&!modal)render()});
}
const ph=p=>`<div class="ph">${p.img?`<img src="${p.img}" alt="${esc(p.name)}">`:'B'}</div>`;

/* Views */
function vCatsImp(){return `<nav class="cats" aria-label="Lojas"><div class="wrap"><button class="ctile imp" onclick="document.getElementById('cat').scrollIntoView({behavior:'smooth'})"><b>Importados</b><small>Você está aqui. Ver produtos</small><span aria-hidden="true">↓</span></button><a href="${pageUrl('index')}" class="ctile"><b>Moda</b><small>Feminino e masculino</small><span aria-hidden="true">→</span></a></div></nav>`}
function vCats(){const T=(k,t,s,h)=>`<${h?'a href="'+h+'"':'button onclick="'+k+'"'} class="ctile${h?' imp':''}"><b>${t}</b><small>${s}</small><span aria-hidden="true">→</span></${h?'a':'button'}>`;
 return `<nav class="cats" aria-label="Categorias"><div class="wrap">${T("q='';cat('Feminino')",'Feminino','Moda feminina')}${T("q='';cat('Masculino')",'Masculino','Moda masculina')}${S.combos.length?T("goto('combos')",'Combos','Leve junto, pague menos'):''}${T('','Importados','Entrega na região ou retirada',pageUrl('importados'))}</div></nav>`}
let KS=[];
function kindBar(){const pool=S.products.filter(p=>match(p,1)),ks=[...new Set(pool.map(x=>x.kind).filter(Boolean))],sem=pool.some(x=>!x.kind);KS=ks;if(!ks.length)return '';
 return `<div class="pills impf"><button class="${!kindF?'on':''}" onclick="kindF='';render()">Todos</button>${ks.map((k,i)=>`<button class="${kindF===k?'on':''}" onclick="kindF=KS[${i}];render()">${esc(k)}</button>`).join('')}${sem?`<button class="${kindF==='__none'?'on':''}" onclick="kindF='__none';render()">Outros</button>`:''}</div>`}
function vLoja(){
 const list=S.products.filter(p=>match(p));
 return `${SEC==='importados'?`<section class="hero"><div class="wrap"><div class="spark">✦ ✧ ✦</div><h1 class="imp">IMPORTADOS</h1><p>Produtos importados selecionados pela Bonely Store, com entrega na região ou retirada.</p></div></section>`:`<section class="hero"><div class="wrap"><div class="spark">✦ ✧ ✦</div><img class="herologo" src="${LOGO}" alt="Bonely Store"><p>Moda feminina, masculina e peças especiais, com envio para todo o Brasil.</p></div></section>`}
 ${SEC==='importados'?vCatsImp():vCats()}
 <div class="benefits"><div class="wrap">${BEN.map(b=>`<div class="ben">${IC[b[0]]}<span><b>${b[1]}</b>${b[2]}</span></div>`).join('')}</div></div>
 <section id="cat"><div class="wrap"><h2>${SEC==='importados'?'Importados':'Catálogo'}</h2><p class="sub">${q?`Resultados para “${esc(q)}” <button class="btn sm ghost" onclick="q='';render()">Limpar busca</button>`:(SEC==='importados'?'Produtos importados selecionados.':'Moda feminina e masculina.')}</p>
 ${IMP?kindBar():`<div class="pills impf">${[['tudo','Tudo'],['Feminino','Feminino'],['Masculino','Masculino']].map(([k,l])=>`<button class="${filter===k?'on':''}" onclick="filter='${k}';kindF='';render()">${l}</button>`).join('')}</div>${kindBar()}
 ${S.colls.length?`<div class="chips"><span>Coleção</span><button class="${!collF?'on':''}" onclick="collF='';kindF='';render()">Todas</button>${S.colls.map((c,i)=>`<button class="${collF===c?'on':''}" onclick="collF=S.colls[${i}];kindF='';render()">${esc(c)}</button>`).join('')}</div>`:''}`}
 ${list.length?`<p class="impcount">${list.length} ${list.length===1?(IMP?'produto':'peça'):(IMP?'produtos':'peças')}</p><div class="grid impgrid">${list.map(p=>`<div class="card"><button class="shbtn" onclick="openShare(${p.id})" aria-label="Compartilhar ${esc(p.name)}">${IC.share}</button><span class="cbadge">${esc(p.kind||(IMP?'Importado':p.gen)||'Moda')}</span><div class="clk" onclick="openProd(${p.id})" role="link" tabindex="0" onkeydown="if(event.key==='Enter')openProd(${p.id})">${ph(p)}</div><div class="in"><h3 class="clk" onclick="openProd(${p.id})">${esc(p.name)}</h3><div class="tag">${[p.gen,p.coll||(p.type==='avulso'?'Importado':'')].filter(Boolean).map(esc).join(' · ')}</div><div class="price">${money(p.price)}</div>
  ${p.stock>0?`<div class="row"><select id="sz${p.id}" aria-label="${esc(optName(p))}">${sizeOpts(p)}</select><button class="btn sm" onclick="addCart(${p.id})">Adicionar</button></div>${lowTag(p)}`:'<div class="tag err">Esgotado</div>'}</div></div>`).join('')}</div>`:'<div class="empty">'+(SEC==='importados'?'Em breve, novos produtos por aqui.':'Nenhuma peça nesse filtro.')+'</div>'}
 </div></section>
 ${S.combos.length&&SEC!=='importados'?`<section id="combos" style="border-top:1px solid var(--line)"><div class="wrap"><h2>Combos</h2><p class="sub">Leve junto e pague menos.</p><div class="grid impgrid">${S.combos.map(c=>{const ps=c.items.map(i=>S.products.find(p=>p.id==i)).filter(Boolean);const full=ps.reduce((a,p)=>a+p.price,0);return `<div class="card"><div class="in"><h3>${esc(c.name)}</h3><div class="tag">${ps.map(p=>esc(p.name)).join(' + ')}</div><div class="tag"><s>${money(full)}</s></div><div class="price">${money(c.price)}</div><div class="row">${stockOf('c'+c.id)>0?`<button class="btn sm" onclick="addCart('c${c.id}')">Adicionar combo</button>`:'<span class="tag err">Esgotado</span>'}</div></div></div>`}).join('')}</div></div></section>`:''}`;
}
function vConta(){
 const c=S.customer;
 if(!c)return `<section><div class="wrap" style="max-width:420px"><h2>Minha conta</h2><p class="sub">Entre ou crie seu cadastro para acompanhar seus pedidos.</p><div class="row"><button class="btn" onclick="openLogin('')">Entrar ou cadastrar</button></div></div></section>`;
 const os=S.orders.filter(o=>o.customer.email===c.email&&oArea(o)===(IMP?'importados':'moda'));
 return `<section><div class="wrap"><h2>Olá, ${esc(c.name)}</h2><p class="sub">${esc(c.email)} · <button class="btn sm ghost" onclick="custLogout()">Sair</button></p>
 ${justOrdered?vOk(justOrdered):''}<h3 style="margin:20px 0 8px">Meus pedidos</h3>${os.length?os.map(o=>`<div class="card in" style="margin-bottom:14px;padding:16px"><div class="line"><b>${o.id}</b><span class="st">${o.status}</span></div><div class="tag">${o.date}</div>${o.items.map(i=>`<div class="line"><span>${i.qty}x ${esc(i.name)} ${i.size?'('+esc(i.size)+')':''}</span><span>${money(i.price*i.qty)}</span></div>`).join('')}<div class="line"><span>Frete ${esc(o.ship.name)}</span><span>${money(o.ship.price)}</span></div><div class="line total"><span>Total</span><span>${money(o.total)}</span></div>
 ${steps(o)}${trackBlock(o)}</div>`).join(''):'<div class="empty">Você ainda não fez pedidos.</div>'}</div></section>`;
}
function vOk(id){return `<div class="okbox"><span class="tag">Pedido realizado!</span><div class="okid">${esc(id)}</div><p>Guarde esse número do pedido. ${IMP?'Você acompanha o status aqui em <b>Minha conta</b>.':'Com ele e o seu e-mail você acompanha tudo em <b>Rastrear pedido</b>.'} A Gabriely também recebe o número no WhatsApp.</p><div class="row"><button class="btn sm" onclick="copyOrderId(this,'${id}')">Copiar número</button>${IMP?'':`<button class="btn sm ghost" onclick="trackOrder('${id}')">Acompanhar pedido</button>`}</div></div>`}
function copyOrderId(b,id){const done=()=>{b.textContent='Copiado!'};try{navigator.clipboard.writeText(id).then(done,()=>prompt('Copie o número do pedido:',id))}catch(e){prompt('Copie o número do pedido:',id)}}
function trackOrder(id){const o=S.orders.find(x=>x.id===id);trkPre=o?{id:o.id,em:o.customer.email}:null;trk=null;go('rastreio')}
function custMsg(o){
 const n=String(o.customer.name||'').trim().split(' ')[0],h=`Olá, ${n}! Aqui é a ${OWNER}, da Bonely Store. `,site=/^https?:/.test(location.protocol||'')?location.origin:'',loc=!!(o.ship&&o.ship.local),code=String(o.tracking||'').trim();
 const imp=oArea(o)==='importados',web=imp?`Qualquer dúvida sobre o andamento, é só me chamar por aqui, citando o número do pedido (*${o.id}*).`:`No nosso site${site?' ('+site+')':''}: abra *Rastrear pedido* e informe o número do pedido (*${o.id}*) e o e-mail usado na compra.`;
 let t;
 if(o.status==='Aguardando pagamento')t=`Seu pedido *${o.id}* (${money(o.total)}) está aguardando o pagamento. Posso te ajudar a finalizar?`;
 else if(o.status==='Pago')t=`Recebemos o pagamento do seu pedido *${o.id}*. Obrigada! Já vamos separar as suas peças.`;
 else if(o.status==='Separando')t=`Seu pedido *${o.id}* está sendo separado e logo será ${loc?'entregue':'enviado'}.`;
 else if(o.status==='Enviado'){
  if(loc)t=`Seu pedido *${o.id}* saiu para entrega! Qualquer dúvida, é só me chamar por aqui.`;
  else if(code&&imp)t=`Seu pedido *${o.id}* foi enviado!\n\nCódigo de rastreio: *${code}*\nAcompanhe em https://www.correios.com.br/rastreamento ou no app dos Correios.`;
  else if(code)t=`Seu pedido *${o.id}* foi enviado!\n\nCódigo de rastreio: *${code}*\n\n*Como acompanhar:*\n1) ${web}\n2) Direto nos Correios: cole o código *${code}* em https://www.correios.com.br/rastreamento ou no app dos Correios.\n\nO rastreio pode levar algumas horas para aparecer depois da postagem.`;
  else t=`Seu pedido *${o.id}* foi enviado! Assim que o código de rastreio estiver disponível, eu te aviso.`}
 else if(o.status==='Entregue')t=`Seu pedido *${o.id}* consta como entregue. Deu tudo certo com as suas peças?`;
 else if(o.status==='Cancelado')t=`Seu pedido *${o.id}* foi cancelado. Qualquer dúvida, é só falar comigo.`;
 else t=`Sobre o seu pedido *${o.id}*.`;
 if(o.status==='Enviado'&&!loc&&code)return h+t;
 return h+t+`\n\n${imp?'':'*Para acompanhar:* '}${web}`}
function custWa(o){let d=String(o.customer.phone||'').replace(/\D/g,'');if(d&&d.length<=11)d='55'+d;return 'https://wa.me/'+d+'?text='+encodeURIComponent(custMsg(o))}
function orderProds(i){return String(i.key).startsWith('c')?(item(i.key)?item(i.key).combo.items.map(x=>S.products.find(p=>p.id==x)):[]):[S.products.find(p=>p.id==i.key)]}
function setStatus(id,st){
 const o=S.orders.find(x=>x.id===id);
 if(st==='Cancelado'&&o.stockDone&&!o.sample){
  o.items.forEach(i=>orderProds(i).forEach(p=>{if(p){giveStk(p,i.qty,rs(i));S.moves.unshift({date:new Date().toLocaleString('pt-BR'),name:p.name,size:rs(i),type:'entrada',qty:i.qty,note:'Cancelamento '+id,area:isImpP(p)?'importados':'moda'})}}));
  o.stockDone=false;
 }
 _setStatus(id,st);
}
/* Excluir pedido: pede confirmação e a senha do painel */
var delId=null,delErr='',delBusy=false;
const delFocus=()=>setTimeout(()=>{const e=$('#dpw');e&&e.focus()},40);
function askDelOrder(id){delId=id;delErr='';delBusy=false;modal='delorder';render();delFocus()}
function closeDel(){delId=null;delErr='';delBusy=false;modal='';render()}
const delBack=o=>!!(o&&o.stockDone&&!o.sample&&['Pago','Separando'].includes(o.status));
function vDelOrder(){
 const o=S.orders.find(x=>x.id===delId);if(!o)return '';
 return `<div class="modal" onclick="if(event.target===this)closeDel()"><div role="alertdialog" aria-modal="true" aria-labelledby="dlt" style="width:min(460px,100%)"><form onsubmit="event.preventDefault();confirmDelOrder()" novalidate><span class="st" data-s="Cancelado">Ação sem volta</span><h2 id="dlt" style="margin-top:8px">Excluir o pedido ${esc(o.id)}?</h2>
 <p class="tag" style="margin:8px 0 14px">Tem certeza? O pedido será apagado de vez e não poderá ser recuperado.${delBack(o)?' As peças dele voltam para o estoque.':''}</p>
 <div class="line"><span>Cliente</span><span>${esc(o.customer.name)}</span></div><div class="line"><span>Status</span><span>${esc(o.status)}</span></div><div class="line"><span>Total</span><span>${money(o.total)}</span></div>
 <label for="dpw">${FBM?'Digite a senha do painel para confirmar':'Digite o PIN para confirmar'}</label><input id="dpw" type="password" autocomplete="current-password"${FBM?'':' inputmode="numeric"'}>
 <p class="err" role="alert" style="min-height:1.4em;margin:10px 0 0">${esc(delErr)}</p>
 <div class="row" style="justify-content:flex-end;margin-top:12px"><button type="button" class="btn ghost" onclick="closeDel()">Cancelar</button><button class="btn danger" type="submit"${delBusy?' disabled':''}>Excluir definitivamente</button></div></form></div></div>`;
}
async function confirmDelOrder(){
 if(delBusy)return;
 const o=S.orders.find(x=>x.id===delId);if(!o)return closeDel();
 const pw=($('#dpw')||{}).value||'';
 if(!pw){delErr='Digite a senha para excluir.';render();delFocus();return}
 delBusy=true;
 try{if(FBM)await FB.confirmPw(pw);else if(pw!=='1234')throw new Error('bad-pw')}
 catch(e){delBusy=false;const c=String(e&&e.code||e&&e.message||'');delErr=/too-many|network/.test(c)?FB.errMsg(e):'Senha incorreta. O pedido não foi excluído.';render();delFocus();return}
 if(delBack(o))o.items.forEach(i=>orderProds(i).forEach(p=>{if(p){giveStk(p,i.qty,rs(i));S.moves.unshift({date:new Date().toLocaleString('pt-BR'),name:p.name,size:rs(i),type:'entrada',qty:i.qty,note:'Exclusão do pedido '+o.id,area:isImpP(p)?'importados':'moda'})}}));
 S.orders=S.orders.filter(x=>x.id!==o.id);
 delId=null;delBusy=false;modal='';save();render();toast('Pedido '+o.id+' excluído.');
}
/* Painel separado: Moda x Importados. Nada se mistura. */
const AREAS={moda:{name:'Moda',desc:'Roupas femininas e masculinas, combos e coleções.'},importados:{name:'Importados',desc:'Produtos importados, entrega regional ou retirada.'}};
const isImpP=p=>!!p&&p.type==='avulso';
function oArea(o){return o.area||((o.items||[]).some(x=>!String(x.key).startsWith('c')&&isImpP(S.products.find(p=>p.id==x.key)))?'importados':'moda')}
function mArea(m){return m.area||(isImpP(S.products.find(p=>p.name===m.name))?'importados':'moda')}
const ordersOf=a=>S.orders.filter(o=>oArea(o)===a);
const prodsOf=a=>S.products.filter(p=>(a==='importados')===isImpP(p));
const AO=()=>ordersOf(aarea),AP=()=>prodsOf(aarea),AM=()=>S.moves.filter(m=>mArea(m)===aarea),AC=()=>aarea==='moda'?S.combos:[];
const goalVal=()=>+((S.goals&&S.goals[aarea])||(aarea==='moda'?S.goal:0))||0;
function setArea(a){aarea=a;apick=false;aedit=null;aq='';ofil='Todos';cbSel=[];if(a==='importados'&&atab==='combos')atab='produtos';render();scrollTo(0,0)}
const AIC={moda:'<path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/>',importados:'<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'};
function vAreaModal(){
 const card=a=>{const o=ordersOf(a),todo=o.filter(x=>x.status==='Pago'||x.status==='Separando').length,aw=o.filter(x=>x.status===STATUS[0]).length,n=prodsOf(a).length;
  return `<button class="apc ${aarea===a?'cur':''}" onclick="setArea('${a}')"><span class="api"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${AIC[a]}</svg></span><span class="apt2"><b>${AREAS[a].name}</b><small>${AREAS[a].desc}</small></span><span class="apb">${todo?`<span class="hot">${todo} para separar</span>`:''}${aw?`<span class="hot">${aw} aguardando pagamento</span>`:''}<span>${n} produto${n===1?'':'s'}</span></span>${aarea===a?'<span class="apcur">Atual</span>':''}</button>`};
 return `<div class="modal" ${aarea?`onclick="if(event.target===this){apick=false;render()}"`:''}><div class="apd" role="dialog" aria-modal="true" aria-labelledby="apt"><div class="aph"><span class="spark">✦ ✧ ✦</span><h2 id="apt">${aarea?'Trocar de painel':'Olá, '+OWNER}</h2><p class="sub">${aarea?'Escolha qual painel você quer ver.':'Qual painel você quer abrir?'}</p></div><div class="apg">${card('moda')}${card('importados')}</div><div class="apf">${aarea?'<button class="btn sm ghost" onclick="apick=false;render()">Cancelar</button>':'<button class="btn sm ghost" onclick="go(\'loja\')">Voltar para a loja</button>'}</div></div></div>`;
}
const PAID=['Pago','Separando','Enviado','Entregue'],MES=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const ATABS0=[['produtos','Produtos'],['estoque','Estoque'],['vendas','Vendas'],['pedidos','Pedidos'],['combos','Combos'],['compartilhados','Compartilhados'],['config','Configurações']];
const ATABS=()=>ATABS0.filter(([k])=>!(k==='combos'&&aarea==='importados'));
const aMatch=p=>!aq||p.name.toLowerCase().includes(aq.trim().toLowerCase());
function oTs(o){if(o.ts)return o.ts;const m=String(o.date).match(/(\d+)\/(\d+)\/(\d+)/);return m?new Date(+m[3],+m[2]-1,+m[1]).getTime():Date.now()}
const paidOrders=()=>AO().filter(o=>PAID.includes(o.status));
const sumT=a=>a.reduce((x,o)=>x+o.total,0);
function monthRev(){const n=new Date(),a=new Date(n.getFullYear(),n.getMonth(),1).getTime();return sumT(paidOrders().filter(o=>oTs(o)>=a))}
function goalInfo(){const g=goalVal(),m=monthRev();return {g,m,pct:g?Math.round(m/g*100):0}}
function greet(){const h=new Date().getHours();return h<12?'Tenha um bom dia':h<18?'Tenha uma boa tarde':'Tenha uma boa noite'}
const DAYS={'7d':7,'14d':14,'30d':30};
function rangeStart(per){const n=new Date();return DAYS[per]?new Date(n.getFullYear(),n.getMonth(),n.getDate()-(DAYS[per]-1)).getTime():new Date(n.getFullYear(),n.getMonth()-5,1).getTime()}
function series(per){
 const n=new Date(),pd=paidOrders(),out=[],inR=(a,b)=>sumT(pd.filter(o=>{const t=oTs(o);return t>=a&&t<b}));
 if(DAYS[per]){for(let i=DAYS[per]-1;i>=0;i--){const d=new Date(n.getFullYear(),n.getMonth(),n.getDate()-i),a=d.getTime();out.push({l:String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0'),v:inR(a,a+864e5)})}}
 else{for(let i=5;i>=0;i--){const d=new Date(n.getFullYear(),n.getMonth()-i,1),e=new Date(d.getFullYear(),d.getMonth()+1,1);out.push({l:MES[d.getMonth()],v:inR(d.getTime(),e.getTime())})}}
 return out;
}
function bars(d){const mx=Math.max(...d.map(x=>x.v),1);return `<div class="chart" role="img" aria-label="Gráfico de vendas">${d.map((x,k)=>`<div class="col" title="${x.l}: ${money(x.v)}"><div class="bw"><div class="b" style="height:${x.v/mx*100}%"></div></div><div class="l">${d.length>16&&(d.length-1-k)%2?'':x.l}</div></div>`).join('')}</div>`}
function hbars(items,fmt){const mx=Math.max(...items.map(x=>x.v),1);return items.length?items.map(x=>`<div class="hb"><span class="hl" title="${esc(x.l)}">${esc(x.l)}</span><span class="ht"><i class="${x.low?'low':''}" style="width:${Math.max(2,x.v/mx*100)}%"></i></span><span class="hv">${fmt(x.v)}</span></div>`).join(''):'<div class="empty">Sem dados ainda.</div>'}
const tile=(l,v)=>`<div class="tile"><small>${l}</small><b>${v}</b></div>`;
function aSearch(ph){return `<input id="aq" class="aq" value="${esc(aq)}" oninput="aq=this.value;keepFocus(this)" placeholder="${ph}" aria-label="${ph}">`}
function keepFocus(el){const pos=el.selectionStart;render();const e=document.getElementById('aq');if(e){e.focus();try{e.setSelectionRange(pos,pos)}catch(_){}}}
function saveGoal(){const v=parseFloat(String($('#goal').value).replace(',','.'));if(!(v>0))return alert('Informe um valor de meta maior que zero.');S.goals=S.goals||{};S.goals[aarea]=v;save();render()}
function setPer(v){vper=v;render()}
/* ---- Receitas e despesas (aba Vendas) ---- */
const EXP_CATS=['Mercadoria / estoque','Frete e embalagem','Marketing e anúncios','Taxas e tarifas','Material e equipamento','Outros'];
let xlim=30;
const REC_CATS=['Venda fora do site','Aporte / investimento','Outras receitas'];
const AE=()=>(S.expenses||[]).filter(x=>(x.area||'moda')===aarea);
const AX=()=>AE().filter(x=>x.kind!=='in'),AI=()=>AE().filter(x=>x.kind==='in');
function xKind(k){const e=$('#xcat');if(e)e.innerHTML=(k==='in'?REC_CATS:EXP_CATS).map(c=>`<option>${esc(c)}</option>`).join('')}
const sumX=a=>a.reduce((t,x)=>t+(+x.val||0),0);
const fmtD=ts=>new Date(ts).toLocaleDateString('pt-BR');
const todayIso=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
function addExpense(){
 const kind=$('#xkind')&&$('#xkind').value==='in'?'in':'out';
 const desc=($('#xdesc').value||'').trim(),val=parseFloat(String($('#xval').value).replace(',','.')),cat=$('#xcat').value,iso=$('#xdate').value;
 if(!desc)return alert(kind==='in'?'Descreva a receita. Ex.: venda no Instagram, aporte.':'Descreva a despesa. Ex.: embalagens, frete, anúncio.');
 if(!(val>0))return alert('Informe um valor maior que zero.');
 const m=String(iso||'').match(/^(\d+)-(\d+)-(\d+)$/),ts=m?new Date(+m[1],+m[2]-1,+m[3],12).getTime():Date.now();
 if(!S.expenses)S.expenses=[];
 S.expenses.unshift({id:'x'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),ts,date:fmtD(ts),desc,cat,val:+val.toFixed(2),kind,area:aarea});
 save();render();toast(kind==='in'?'Receita registrada.':'Despesa registrada.');
}
function delExpense(id){
 if(!confirm('Excluir este lançamento?'))return;
 S.expenses=(S.expenses||[]).filter(x=>x.id!==id);save();render();
}
function moreX(){xlim+=30;render()}
/* extrato corrido: receitas (pedidos pagos) e despesas em ordem de data, com saldo acumulado */
function ledger(){
 const rows=[];
 paidOrders().forEach(o=>rows.push({ts:oTs(o),kind:'in',desc:(o.store?'Venda na loja ':'Pedido ')+o.id+(o.customer&&o.customer.name&&!o.store?' · '+o.customer.name:''),val:o.total}));
 AE().forEach(x=>rows.push({ts:x.ts||0,kind:x.kind==='in'?'in':'out',id:x.id,desc:x.desc,cat:x.cat,val:+x.val||0}));
 rows.sort((a,b)=>a.ts-b.ts);
 let bal=0;rows.forEach(r=>{bal+=r.kind==='in'?r.val:-r.val;r.bal=bal});
 return rows.reverse();
}
function vFinance(a,tot){
 const ex=AX().filter(x=>(x.ts||0)>=a),totX=sumX(ex),extra=sumX(AI().filter(x=>(x.ts||0)>=a)),led=ledger(),bal=led.length?led[0].bal:0;
 tot+=extra;
 const byCat={};ex.forEach(x=>{byCat[x.cat||'Outros']=(byCat[x.cat||'Outros']||0)+(+x.val||0)});
 const cats=Object.entries(byCat).sort((p,q)=>q[1]-p[1]).map(([l,v])=>({l,v}));
 const res=tot-totX;
 return `<h3 class="sec">Receitas e despesas</h3>
 <div class="tiles">${tile('Receitas no período',money(tot))}${tile('Despesas no período',money(totX))}${tile('Resultado do período',`<span class="${res<0?'neg':'pos'}">${money(res)}</span>`)}${tile('Saldo corrido (total)',`<span class="${bal<0?'neg':'pos'}">${money(bal)}</span>`)}</div>
 <div class="two"><div><h3>Novo lançamento</h3>
  <div class="row" style="margin-top:0"><select id="xkind" onchange="xKind(this.value)" aria-label="Tipo"><option value="out">Despesa (saída)</option><option value="in">Receita (entrada)</option></select></div>
  <div class="row"><input id="xdesc" placeholder="Descrição (ex.: caixas de embalagem, venda no Instagram)" aria-label="Descrição da despesa"></div>
  <div class="row"><input id="xval" type="number" min="0" step="0.01" placeholder="Valor (R$)" aria-label="Valor"><input id="xdate" type="date" value="${todayIso()}" aria-label="Data"></div>
  <div class="row"><select id="xcat" aria-label="Categoria">${EXP_CATS.map(c=>`<option>${esc(c)}</option>`).join('')}</select><button class="btn" onclick="addExpense()">Adicionar</button></div></div>
 <div><h3>Gastos por categoria</h3>${hbars(cats,money)}</div></div>
 <h3>Extrato</h3>${led.length?`<div class="xwrap"><table class="xt"><tr><th>Data</th><th>Descrição</th><th>Receita</th><th>Despesa</th><th>Saldo</th><th></th></tr>${led.slice(0,xlim).map(r=>`<tr><td>${fmtD(r.ts)}</td><td>${esc(r.desc)}${r.cat?`<small class="xc">${esc(r.cat)}</small>`:''}</td><td class="pos">${r.kind==='in'?money(r.val):''}</td><td class="neg">${r.kind==='out'?'−'+money(r.val):''}</td><td class="${r.bal<0?'neg':''}"><b>${money(r.bal)}</b></td><td>${r.id?`<button class="btn sm ghost" onclick="delExpense('${r.id}')" aria-label="Excluir lançamento">Excluir</button>`:''}</td></tr>`).join('')}</table></div>${led.length>xlim?'<div class="row"><button class="btn sm ghost" onclick="moreX()">Ver mais</button></div>':''}`:'<div class="empty">Ainda não há receitas nem despesas. Cadastre seu primeiro lançamento acima.</div>'}`;
}

function togCb(id){cbSel=cbSel.includes(id)?cbSel.filter(x=>x!==id):[...cbSel,id]}
function seedSales(){
 let r=7;const rnd=()=>{r=(r*9301+49297)%233280;return r/233280};
 S.seen=S.seen||[];
 for(let i=0;i<22;i++){
  const PP=AP(),p=PP[Math.floor(rnd()*PP.length)],q=1+Math.floor(rnd()*2),ts=Date.now()-Math.floor(rnd()*40)*864e5-Math.floor(rnd()*3e7),id='EX'+(aarea==='importados'?'I':'')+(i+1);
  if(!p||S.orders.some(o=>o.id===id))continue;
  S.orders.push({id,date:new Date(ts).toLocaleString('pt-BR'),ts,customer:{name:'Cliente exemplo '+(i+1),phone:'',email:'exemplo'+i+'@exemplo.com',addr:'',cep:''},items:[{key:p.id,name:p.name,price:p.price,qty:q,size:''}],subtotal:p.price*q,ship:{name:'PAC (exemplo)',price:22},total:p.price*q+22,pay:'Pix',status:rnd()>.3?'Entregue':'Pago',tracking:'',stockDone:true,sample:true,area:aarea});
  S.seen.push(id);
 }
 S.orders.sort((a,b)=>oTs(b)-oTs(a));save();render();
}
function clearSales(){S.orders=S.orders.filter(o=>!(o.sample&&oArea(o)===aarea));save();render()}
/* ---- Prazo de 12h para confirmar + alertas do painel ---- */
const LOW=4,CONF_H=12,dueOf=o=>oTs(o)+CONF_H*36e5,pendConf=o=>!o.sample&&!o.store&&o.status===STATUS[0];
const fmtDur=ms=>{ms=Math.abs(ms);const h=Math.floor(ms/36e5),m=Math.floor(ms%36e5/6e4);return h?h+'h '+(m<10?'0':'')+m+'min':Math.max(m,1)+'min'};
const fmtDue=o=>new Date(dueOf(o)).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
function dlBadge(o){if(!pendConf(o))return '';const ms=dueOf(o)-Date.now();return ms<=0?`<span class="dl late">Prazo vencido há ${fmtDur(ms)}</span>`:`<span class="dl${ms<2*36e5?' warn':''}">Confirmar em ${fmtDur(ms)}</span>`}
let lowQ=[],dueQ=[],dueAck=[];
const lowAck=()=>{try{return JSON.parse(localStorage.getItem('bn_lowack')||'[]')}catch(e){return []}};
function lowList(){
 return S.products.filter(p=>(isImpP(p)?'importados':'moda')===aarea).map(p=>{
  const tot=+p.stock||0;
  if(tot>LOW)return null;
  const det=hasStk(p)?szOf(p).map(x=>x+' ('+stkQ(p,x)+')'):[];
  return{key:p.id+'|'+tot+'|'+det.join(','),id:p.id,name:p.name,tot,det,area:isImpP(p)?'importados':'moda'};
 }).filter(Boolean);
}
const dueList=()=>S.orders.filter(o=>pendConf(o)&&dueOf(o)-Date.now()<2*36e5);
function checkNew(){
 if(!(view==='admin'&&adminOk&&aarea&&!apick&&!modal))return;
 const seen=S.seen||[],n=S.orders.filter(o=>!seen.includes(o.id));
 if(n.length){newQ=n.map(o=>o.id);modal='neworder';render();return}
 const ak=lowAck(),lw=lowList().filter(x=>!ak.includes(x.key));
 if(lw.length){lowQ=lowList();modal='lowstock';render();return}
 const dd=dueList().filter(o=>!dueAck.includes(o.id));
 if(dd.length){dueQ=dueList().map(o=>o.id);modal='dueorder';render()}
}
function closeLow(ir){
 try{const mine=new Set(S.products.filter(p=>(isImpP(p)?'importados':'moda')===aarea).map(p=>String(p.id)));
  const other=lowAck().filter(k=>!mine.has(String(k).split('|')[0]));
  localStorage.setItem('bn_lowack',JSON.stringify([...other,...lowList().map(x=>x.key)]))}catch(e){}
 const f=lowQ[0];lowQ=[];modal='';
 if(ir&&f){aarea=f.area;atab='estoque';aq=''}
 render();if(ir)scrollTo(0,0);
}
function closeDue(ir){
 dueAck=[...dueAck,...dueQ];dueQ=[];modal='';
 if(ir){atab='pedidos';ofil=STATUS[0];aq=''}
 render();if(ir)scrollTo(0,0);
}
function vLowStock(){
 const l=lowQ.slice().sort((a,b)=>a.tot-b.tot),show=l.slice(0,8);
 return `<div class="modal"><div role="alertdialog" aria-label="Estoque baixo" style="width:min(480px,100%)"><span class="st">Estoque baixo</span><h2 style="margin-top:8px">${l.length} ${l.length===1?'produto precisa':'produtos precisam'} de atenção</h2>
 ${show.map(x=>`<div class="line"><span>${esc(x.name)}<small class="tag" style="display:block">${x.area==='importados'?'Importados':'Moda'}${x.det.length?' · '+esc(x.det.join(', ')):''}</small></span><span class="${x.tot<=0?'err':''}">${x.tot<=0?'Esgotado':'Restam '+x.tot}</span></div>`).join('')}
 ${l.length>show.length?`<p class="tag">+ ${l.length-show.length} outro(s) produto(s)</p>`:''}
 <div class="row"><button class="btn" onclick="closeLow(true)">Ver estoque</button><button class="btn ghost" onclick="closeLow(false)">Fechar</button></div></div></div>`;
}
function vDue(){
 const l=dueQ.map(id=>S.orders.find(o=>o.id===id)).filter(Boolean).sort((a,b)=>dueOf(a)-dueOf(b));
 return `<div class="modal"><div role="alertdialog" aria-label="Pedidos para confirmar" style="width:min(480px,100%)"><span class="st">Prazo de confirmação</span><h2 style="margin-top:8px">${l.length} ${l.length===1?'pedido está':'pedidos estão'} perto de vencer</h2><p class="tag">Cada pedido deve ser confirmado em até ${CONF_H} horas.</p>
 ${l.slice(0,8).map(o=>`<div class="line"><span>${o.id} · ${esc(o.customer.name)}<small class="tag" style="display:block">Prazo até ${fmtDue(o)}</small></span>${dlBadge(o)}</div>`).join('')}
 <div class="row"><button class="btn" onclick="closeDue(true)">Ver pedidos</button><button class="btn ghost" onclick="closeDue(false)">Fechar</button></div></div></div>`;
}
function closeNew(ir){const f=S.orders.find(x=>x.id===newQ[0]);S.seen=[...(S.seen||[]),...newQ];newQ=[];modal='';if(ir){if(f)aarea=oArea(f);atab='pedidos';ofil='Todos';aq=''}save();render()}
function vNewOrder(){
 const o=S.orders.find(x=>x.id===newQ[0]);if(!o)return '';
 return `<div class="modal"><div role="alertdialog" aria-label="Novo pedido" style="width:min(480px,100%)"><span class="st">Novo pedido · ${AREAS[oArea(o)].name}</span><h2 style="margin-top:8px">${o.id}</h2>${newQ.length>1?`<p class="tag">+ ${newQ.length-1} outro(s) pedido(s) novo(s)</p>`:''}
 <div class="line"><span>Cliente</span><span>${esc(o.customer.name)}</span></div><div class="line"><span>WhatsApp</span><span>${esc(o.customer.phone)}</span></div>
 ${o.items.map(i=>`<div class="line"><span>${i.qty}x ${esc(i.name)} ${i.size?'('+esc(i.size)+')':''}</span><span>${money(i.price*i.qty)}</span></div>`).join('')}
 <div class="line"><span>Frete ${esc(o.ship.name)}</span><span>${money(o.ship.price)}</span></div><div class="line"><span>Pagamento</span><span>${esc(o.pay||'a combinar')}</span></div><div class="line total"><span>Total</span><span>${money(o.total)}</span></div>
 ${pendConf(o)?`<p class="tag" style="margin:12px 0 0">Confirme este pedido em até ${CONF_H} horas (até ${fmtDue(o)}).</p>`:''}
 <div class="row"><button class="btn" onclick="closeNew(true)">Ver pedidos</button><button class="btn ghost" onclick="closeNew(false)">Fechar</button></div></div></div>`;
}
function vPanelHead(){
 const gi=goalInfo();
 return `<header><div class="wrap phd"><button class="brand" onclick="go('loja')" aria-label="Ir para a loja">BONELY STORE<span class="sub2">PAINEL${adminOk&&aarea?' · '+AREAS[aarea].name.toUpperCase():''}</span></button><div class="row" style="margin:0">${adminOk&&aarea?`<button class="btn sm" onclick="apick=true;render()">Trocar painel</button>`:''}<button class="btn sm ghost" onclick="go('loja')">Ver loja</button>${adminOk?`<button class="btn sm ghost" onclick="adminOk=false;go('loja')">Sair</button>`:''}</div></div></header>
 ${adminOk&&aarea?`<div class="welcome"><div class="wrap"><h1 class="serif">Olá, ${OWNER_FULL}</h1><p>Painel ${AREAS[aarea].name}. ${greet()}!</p><p class="meta">${gi.g?`Sua meta do mês está em <b>${gi.pct}%</b> (${money(gi.m)} de ${money(gi.g)}).`:'Você ainda não definiu a meta do mês. Defina na aba Vendas.'}</p>${gi.g?`<div class="prog"><i style="width:${Math.min(100,gi.pct)}%"></i></div>`:''}</div></div>`:''}`;
}
/* ---- configuração do cadastro de produto (por painel) ---- */
const FDEF={name:'Nome',price:'Preço (R$)',kind:'Tipo da peça',gen:'Público',coll:'Coleção',sizes:'Tamanhos',stock:'Estoque por tamanho',brand:'Marca',desc:'Descrição',specs:'Detalhes do produto',img:'Foto'};
const FDEF_IMP={sizes:'Tamanhos/Sabores',stock:'Estoque por tamanho/sabor'};
const fdef=k=>(aarea==='importados'&&FDEF_IMP[k])||FDEF[k];
const SZ=()=>aarea==='importados'?{s:'Tamanho/Sabor',p:'Tamanhos/Sabores'}:{s:'Tamanho',p:'Tamanhos'};
const FREQ=['name','price','gen'];
const DEF_OPT=()=>({name:'Tamanho',list:aarea==='importados'?[]:['PP','P','M','G','GG','Extra GG','Baby Look']});
const optCfg=()=>{const o=cfgOf().opt||{},d=DEF_OPT();return {name:String(o.name||'').trim()||d.name,list:Array.isArray(o.list)?o.list:d.list}};
const optName=p=>{const o=((S.cfg||{})[isImpP(p)?'importados':'moda']||{}).opt;return String(o&&o.name||'').trim()||'Tamanho'};
const parseOpts=t=>{const out=[];String(t||'').split(/[\n,]+/).map(x=>x.trim()).filter(Boolean).forEach(x=>{if(!out.some(y=>y.toLowerCase()===x.toLowerCase()))out.push(x)});return out};
function optEditMode(b){const g=$('#popts');if(!g)return;const on=g.classList.toggle('editing');b.textContent=on?'Concluir edição':'Editar opções'}
function optSetList(list){S.cfg=S.cfg||{};const c=S.cfg[aarea]=S.cfg[aarea]||{f:{}};c.opt={name:(c.opt&&c.opt.name)||'',list}}
function optRename(btn,ev){
 ev.preventDefault();ev.stopPropagation();
 const lab=btn.closest('.opt'),inp=lab.querySelector('.po'),old=inp.value,lc=x=>String(x).toLowerCase();
 const nv=(prompt('Novo nome para "'+old+'":',old)||'').replace(/[,\n]+/g,' ').trim();
 if(!nv||nv===old)return;
 const list=optCfg().list;
 if([...list,...[...document.querySelectorAll('#popts .po')].map(e=>e.value)].some(y=>lc(y)===lc(nv)&&lc(y)!==lc(old)))return alert('Já existe uma opção com esse nome.');
 let nl=list.map(x=>lc(x)===lc(old)?nv:x);if(!nl.some(x=>lc(x)===lc(nv)))nl.push(nv);
 optSetList(nl);
 let n=0;
 AP().forEach(p=>{const l=parseOpts(p.sizes);if(!l.some(x=>lc(x)===lc(old)))return;n++;p.sizes=l.map(x=>lc(x)===lc(old)?nv:x).join(',');
  if(hasStk(p)){const k=Object.keys(p.stk).find(y=>lc(y)===lc(old));if(k!==undefined){p.stk[nv]=p.stk[k];if(k!==nv)delete p.stk[k]}}});
 inp.value=nv;lab.querySelector('span').textContent=nv;
 document.querySelectorAll('.pqs').forEach(e=>{if(lc(e.dataset.s)===lc(old))e.dataset.s=nv});
 stkGrid();save();toast('"'+old+'" agora é "'+nv+'"'+(n?' em '+n+' produto(s).':'.'));
}
function optDel(btn,ev){
 ev.preventDefault();ev.stopPropagation();
 const lab=btn.closest('.opt'),inp=lab.querySelector('.po'),old=inp.value,lc=x=>String(x).toLowerCase();
 const used=AP().filter(p=>parseOpts(p.sizes).some(x=>lc(x)===lc(old))).length;
 if(!confirm(used?'A opção "'+old+'" está em '+used+' produto(s). Ela sai só da lista de opções; os produtos que já usam continuam com ela. Excluir da lista?':'Excluir "'+old+'" da lista de opções?'))return;
 optSetList(optCfg().list.filter(x=>lc(x)!==lc(old)));
 if(!inp.checked)lab.remove();
 save();toast('"'+old+'" saiu da lista.');
}
/* ---- opções (tamanhos/sabores): digitar adiciona, lista fica recolhida ---- */
const selChips=l=>l.length?l.map(x=>`<span class="selchip">${esc(x)}<button type="button" data-v="${esc(x)}" onclick="optUn(this.dataset.v)" aria-label="Tirar ${esc(x)}">×</button></span>`).join(''):'<span class="hint">Nenhuma marcada ainda.</span>';
function optSel(){
 const ck=[...document.querySelectorAll('#popts .po:checked')].map(e=>e.value),b=$('#psel'),n=$('#poptsn');
 if(b)b.innerHTML=selChips(ck);if(n)n.textContent=ck.length;
}
function optUn(v){const e=[...document.querySelectorAll('#popts .po')].find(x=>x.value===v);if(e){e.checked=false;stkGrid()}}
function optAdd(){
 const inp=$('#pxo'),box=$('#popts');if(!inp||!box)return;
 parseOpts(inp.value).forEach(x=>{
  const ex=[...box.querySelectorAll('.po')].find(e=>e.value.toLowerCase()===x.toLowerCase());
  if(ex){ex.checked=true;return}
  const lab=document.createElement('label');lab.className='opt';
  lab.innerHTML=`<input type="checkbox" class="po" data-new="1" value="${esc(x)}" checked onchange="stkGrid()"><span>${esc(x)}</span><button type="button" class="oed" onclick="optRename(this,event)" aria-label="Renomear ${esc(x)}" title="Renomear">✎</button><button type="button" class="odel" onclick="optDel(this,event)" aria-label="Excluir ${esc(x)} da lista" title="Excluir da lista">×</button>`;
  box.appendChild(lab);
 });
 inp.value='';stkGrid();
}

function optAll(v){document.querySelectorAll('#popts .po').forEach(e=>e.checked=v);stkGrid()}
/* ---- estoque por tamanho no cadastro ---- */
const KIND_DEF=['Vestido','Blusa','Camisa','Calça','Saia','Short','Jaqueta','Conjunto','Acessório'];
const kinds=()=>{const u=[...new Set(AP().map(p=>p.kind).filter(Boolean))];return aarea==='importados'?u:[...u,...KIND_DEF.filter(k=>!u.some(y=>y.toLowerCase()===k.toLowerCase()))]};
function stkHtml(sz,v){
 if(!sz.length)return '<p class="hint" id="pstt">Marque ao menos uma opção acima para informar o estoque de cada uma.</p>';
 const t=sz.reduce((a,x)=>a+(parseInt(v[x])||0),0);
 return `<div class="stkg">${sz.map(x=>`<label class="stkc"><span>${esc(x)}</span><input class="pqs" type="number" min="0" inputmode="numeric" data-s="${esc(x)}" value="${esc(x in v?v[x]:'')}" placeholder="0" oninput="stkTot()" aria-label="Estoque do tamanho ${esc(x)}"></label>`).join('')}</div><p class="hint" id="pstt">Estoque geral deste produto: ${t} peças</p>`;
}
function stkTot(){const t=[...document.querySelectorAll('.pqs')].reduce((a,e)=>a+(parseInt(e.value)||0),0),e=$('#pstt');if(e)e.textContent='Estoque geral deste produto: '+t+' peças'}
function stkSizes(){
 const ep=aedit?S.products.find(x=>x.id==aedit):null;
 if(!$('#popts'))return ep?szOf(ep):['Único'];
 const ck=[...document.querySelectorAll('#popts .po:checked')].map(e=>e.value),ex=parseOpts($('#pxo')?$('#pxo').value:'').filter(x=>!ck.some(y=>y.toLowerCase()===x.toLowerCase()));
 return [...ck,...ex];
}
function stkGrid(){
 optSel();
 const box=$('#pstk');if(!box)return;
 const ep=aedit?S.products.find(x=>x.id==aedit):null,old={};
 box.querySelectorAll('.pqs').forEach(e=>old[e.dataset.s]=e.value);
 const base=ep?(hasStk(ep)?ep.stk:szOf(ep).length===1?{[szOf(ep)[0]]:ep.stock}:{}):{},v={},sz=stkSizes();
 sz.forEach(x=>{v[x]=x in old?old[x]:(x in base?base[x]:'')});
 box.innerHTML=stkHtml(sz,v);
 const w=$('#pstkw');if(w)w.style.display=sz.length?'':'none';
}
/* grava o estoque novo e registra no histórico o que mudou em cada tamanho */
function applyStk(p,ns,note){
 const old=hasStk(p)?p.stk:(szOf(p).length===1?{[szOf(p)[0]]:p.stock}:null),ar=isImpP(p)?'importados':'moda',
  mv=(sz,df)=>S.moves.unshift({date:new Date().toLocaleString('pt-BR'),name:p.name,size:sz,type:df>0?'entrada':'saida',qty:Math.abs(df),note,area:ar});
 if(old)new Set([...Object.keys(old),...Object.keys(ns)]).forEach(x=>{const df=(+ns[x]||0)-(+old[x]||0);if(df)mv(x,df)});
 else{const df=sumOf(ns)-p.stock;if(df)mv('',df)}
 p.stk=ns;stkSum(p);
}
function stkChips(p){
 if(!hasStk(p)){const l=szOf(p);return l.length===1?`<span class="szc">${esc(l[0])} · ${p.stock}</span>`:'<span class="szc low">sem divisão por tamanho</span>'}
 return szOf(p).map(x=>{const q=stkQ(p,x);return `<span class="szc${q<=0?' out':q<=2?' low':''}">${esc(x)} · ${q}</span>`}).join('');
}
const mvOpts=p=>p?szOf(p).map(x=>`<option value="${esc(x)}">${esc(x)}${hasStk(p)||szOf(p).length===1?' ('+stkQ(p,x)+')':''}</option>`).join(''):'';
function mvType(){const t=$('#mt'),b=$('#msale');if(!t||!b)return;b.style.display=t.value==='venda'?'':'none';const p=S.products.find(x=>x.id==$('#mp').value),v=$('#mv');if(p&&v)v.value=p.price}
function mvSizes(){const p=S.products.find(x=>x.id==$('#mp').value),e=$('#ms');if(e)e.innerHTML=mvOpts(p)}
const DEF_TPL=()=>aarea==='importados'?'Material: \nCor: \nDimensões: \nOrigem: ':'Tecido: \nCor: \nModelagem: \nComposição: \nCuidados: ';
const cfgOf=()=>((S.cfg||{})[aarea])||{};
const NOIMP=k=>aarea==='importados'&&(k==='kind'||k==='coll');
const fc=k=>{const c=(cfgOf().f||{})[k]||{};return {l:String(c.l||'').trim()||fdef(k),on:FREQ.includes(k)||(!c.h&&!NOIMP(k))}};
const SPEC_TPL=()=>{const t=cfgOf().tpl;return typeof t==='string'?t:DEF_TPL()};
const cleanSpecs=t=>String(t||'').split(/\r?\n/).map(x=>x.trim()).filter(x=>x&&!/^[^:]+:\s*$/.test(x)).join('\n');
function toast(t){const e=document.createElement('div');e.className='toast';e.setAttribute('role','status');e.textContent=t;document.body.appendChild(e);setTimeout(()=>e.remove(),2400)}
function prodForm(ep){
 const L=k=>esc(fc(k).l),on=k=>fc(k).on;
 return `<label>${L('name')}</label><input id="pn" value="${esc(ep?ep.name:'')}"><label>${L('price')}</label><input id="pp" type="number" step="0.01" value="${ep?ep.price:''}"><input type="hidden" id="pt" value="${aarea==='importados'?'avulso':'roupa'}">`
 +(on('kind')?`<label>${L('kind')}</label><input id="pk" list="kl" placeholder="Ex.: Vestido, Blusa, Calça..." value="${esc(ep?ep.kind:'')}"><datalist id="kl">${kinds().map(k=>`<option value="${esc(k)}">`).join('')}</datalist>`:'')
 +(aarea==='importados'?'':`<label>${L('gen')}</label><select id="pg">${['Feminino','Masculino','Unissex'].map(g=>`<option ${ep&&ep.gen===g?'selected':''}>${g}</option>`).join('')}</select>`)
 +(on('coll')?`<label>${L('coll')}</label><input id="pc" list="cl" placeholder="Ex.: Verão 26" value="${esc(ep?ep.coll:'')}"><datalist id="cl">${S.colls.map(c=>`<option value="${esc(c)}">`).join('')}</datalist>`:'')
 +(on('sizes')?(()=>{const oc=optCfg(),cur=ep?parseOpts(ep.sizes).filter(x=>x.toLowerCase()!=='único'):[],all=[...oc.list,...cur.filter(x=>!oc.list.some(y=>y.toLowerCase()===x.toLowerCase()))],isOn=x=>cur.some(y=>y.toLowerCase()===x.toLowerCase());
  const labels=all.map(x=>`<label class="opt"><input type="checkbox" class="po" value="${esc(x)}" ${isOn(x)?'checked':''} onchange="stkGrid()"><span>${esc(x)}</span><button type="button" class="oed" onclick="optRename(this,event)" aria-label="Renomear ${esc(x)}" title="Renomear">✎</button><button type="button" class="odel" onclick="optDel(this,event)" aria-label="Excluir ${esc(x)} da lista" title="Excluir da lista">×</button></label>`).join('');
  return `<label>${L('sizes')}</label><input id="pxo" placeholder="Digite e aperte Enter (ex.: M, 42, Morango)" aria-label="Adicionar opção" autocomplete="off" onkeydown="if(event.key==='Enter'||event.key===','){event.preventDefault();optAdd()}" onchange="optAdd()"><div class="selrow" id="psel">${selChips(cur)}</div><details class="fold optl"><summary>Ver lista de ${L('sizes')} <span class="a-mut">(<span id="poptsn">${cur.length}</span> marcados)</span></summary><div class="foldb"><div class="chk" id="popts" role="group" aria-label="${L('sizes')}">${labels}</div>${all.length?'<div class="chkact"><button type="button" class="a-link" onclick="optAll(true)">Marcar todas</button><button type="button" class="a-link" onclick="optAll(false)">Limpar</button><button type="button" class="a-link" onclick="optEditMode(this)">Editar opções</button></div>':''}</div></details><p class="hint">Digite uma opção e aperte Enter: ela já aparece marcada e entra na lista. Para escolher entre as que já existem, abra "Ver lista". Marque pelo menos uma.</p>`})():'')
 +(on('stock')&&(!ep||(!hasStk(ep)&&ep.stock>0&&szOf(ep).length>1))?(()=>{const sz=ep&&parseOpts(ep.sizes).length?szOf(ep):[],v=ep?(hasStk(ep)?ep.stk:(sz.length===1?{[sz[0]]:ep.stock}:{})):{};
  return `<div id="pstkw" style="${sz.length?'':'display:none'}"><label>${L('stock')}</label><div id="pstk">${stkHtml(sz,v)}</div>${ep&&!hasStk(ep)&&ep.stock>0?`<p class="hint err">Este produto tem ${ep.stock} peças no total, ainda sem divisão. Marque as opções e distribua nos campos acima.</p>`:''}</div>`})():'')
 +(['brand','desc','specs'].some(on)?`<details class="fold more" ${ep&&(ep.brand||ep.desc||String(ep.specs||'').trim())?'open':''}><summary>Mais detalhes (marca, descrição...)</summary><div class="foldb">`:'')
 +(on('brand')?`<label>${L('brand')}</label><input id="pm" placeholder="Ex.: Nike, Zara..." value="${esc(ep?ep.brand:'')}">`:'')
 +(on('desc')?`<label>${L('desc')}</label><textarea id="pd" rows="4" placeholder="Conte sobre o produto: modelo, caimento, cuidados...">${esc(ep?ep.desc:'')}</textarea>`:'')
 +(on('specs')?`<label>${L('specs')}</label><textarea id="px" rows="6" spellcheck="false">${esc(ep&&String(ep.specs||'').trim()?ep.specs:SPEC_TPL())}</textarea><p class="hint">Complete depois dos dois pontos. Linha sem preenchimento não aparece na loja.</p>`:'')
 +(['brand','desc','specs'].some(on)?'</div></details>':'')
 +(on('img')?`<label>${L('img')}</label>${ep&&ep.img?'<div class="tag">Já tem foto. Escolha outra só se quiser trocar.</div>':''}<input type="file" accept="image/*" onchange="pickImg(this)"><span id="imgok" class="tag"></span>`:'')
 +`<div class="row"><button class="btn" onclick="addProd()">${ep?'Salvar alterações':'Salvar produto'}</button><button class="btn ghost" onclick="cancelEdit()">Cancelar</button></div>`;
}
function vConfig(){
 const c=cfgOf(),keys=Object.keys(FDEF).filter(k=>!(k==='gen'&&aarea==='importados')&&!NOIMP(k));
 return `<div class="two"><div><h3>Campos do cadastro de produto</h3><p class="hint">Painel ${AREAS[aarea].name}. Escreva um novo nome para trocar o título do campo e desmarque "Mostrar" para esconder. Deixando em branco, vale o nome original.</p>
 ${keys.map(k=>{const req=FREQ.includes(k),cur=(c.f&&c.f[k]&&c.f[k].l)||'';return `<div class="cfr"><div class="cfl"><label for="cf-${k}">${esc(fdef(k))}</label><input id="cf-${k}" value="${esc(cur)}" placeholder="${esc(fdef(k))}" maxlength="40"></div>${req?'<span class="cfreq">Obrigatório</span>':`<label class="cfs"><input type="checkbox" id="cfs-${k}" ${fc(k).on?'checked':''}>Mostrar</label>`}</div>`}).join('')}
 <div class="row"><button class="btn" onclick="saveCfg()">Salvar configurações</button><button class="btn ghost" onclick="resetCfg()">Restaurar padrão</button></div></div>
 <div><h3>Opções do produto</h3><p class="hint">É a lista que aparece para marcar no cadastro, como tamanhos das roupas ou sabores.</p><label for="cf-optn">Nome da opção (aparece na loja)</label><input id="cf-optn" value="${esc((c.opt&&c.opt.name)||'')}" placeholder="Tamanho" maxlength="30"><label for="cf-optl">Lista de opções (uma por linha)</label><textarea id="cf-optl" rows="9" spellcheck="false" placeholder="Ex.: Chocolate&#10;Morango&#10;Baunilha">${esc(optCfg().list.join('\n'))}</textarea><p class="hint">Exemplos: PP, P, M, G, GG para roupas. Para importados, o nome pode ser "Sabor" e a lista os sabores.</p></div>
 <div><h3>Modelo do campo Detalhes</h3><p class="hint">Estas linhas já vêm escritas ao cadastrar um produto novo. Uma por linha: escreva só o nome (ex.: Gola) e o dois-pontos entra sozinho. Apague tudo para o campo vir em branco.</p><textarea id="cf-tpl" rows="10" spellcheck="false">${esc(typeof c.tpl==='string'?c.tpl:DEF_TPL())}</textarea><p class="hint">Cada linha preenchida aparece na página do produto, na loja.</p></div></div>`;
}
function saveCfg(){
 S.cfg=S.cfg||{};const f={};
 Object.keys(FDEF).forEach(k=>{const e=$('#cf-'+k);if(!e)return;const l=e.value.trim(),ck=$('#cfs-'+k),o={};
  if(l&&l!==fdef(k))o.l=l;if(!FREQ.includes(k)&&ck&&!ck.checked)o.h=1;if(o.l||o.h)f[k]=o});
 const tpl=$('#cf-tpl').value.split(/\r?\n/).map(x=>x.replace(/[:\s]+$/,'').trim()).filter(Boolean).map(x=>x+': ').join('\n');
 const opt={name:($('#cf-optn').value.trim()),list:parseOpts($('#cf-optl').value)};
 S.cfg[aarea]={f,tpl,opt};save();render();toast('Configurações salvas.');
}
function resetCfg(){if(!confirm('Voltar aos nomes e ao modelo originais deste painel?'))return;if(S.cfg)delete S.cfg[aarea];save();render();toast('Configurações restauradas.')}
let pform=false,mvOpen=false,mvP=null;
/* histórico: marca movimentos de pedidos que foram cancelados ou excluídos */
function mvTag(m){
 const r=/^(Pedido|Cancelamento|Exclusão do pedido) (BN\d+)/.exec(m.note||'');if(!r)return {};
 if(r[1]!=='Pedido')return {back:'Devolução ao estoque'};
 const o=S.orders.find(x=>x.id===r[2]);
 if(!o)return {v:'Pedido excluído'};
 if(o.status==='Cancelado')return {v:'Pedido cancelado'};
 return {};
}
const mvRow=m=>{const t=mvTag(m),z=m.size&&m.size!=='Único'?m.size:'',en=m.type==='entrada',vd=!en&&/^Venda na loja/.test(m.note||'');
 return `<div class="mvr${t.v?' void':''}"><span class="mvb ${en?'in':vd?'sale':'out'}">${en?'Entrada':vd?'Venda':'Saída'}</span><div class="mvn"><b>${esc(m.name)}${z?' <span class="szc">'+esc(z)+'</span>':''}</b><small>${esc(m.date)}${m.note?' · '+esc(m.note):''}</small>${t.v?`<span class="mvv">${t.v}</span>`:''}${t.back?`<span class="mvk">${t.back}</span>`:''}</div><div class="mvq">${en?'+':'−'}${m.qty}</div></div>`};
function vAdmin(){
 if(!adminOk)return `<section><div class="wrap plogin" style="max-width:380px"><h2>Painel da loja</h2><p class="sub">${FBM?'Entre com o e-mail e a senha da loja.':'Digite o PIN para entrar.'}</p><form onsubmit="event.preventDefault();adminLogin()" novalidate>${FBM?`<input id="aem" type="email" value="${esc(aemv)}" placeholder="E-mail" aria-label="E-mail" autocomplete="username">`:''}<div class="pw"><input id="pin" type="password" placeholder="${FBM?'Senha':'PIN'}" aria-label="${FBM?'Senha':'PIN'}" autocomplete="current-password"${FBM?'':' inputmode="numeric"'}><button type="button" class="pwb" onclick="togglePw()" aria-label="Mostrar senha" title="Mostrar senha"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></button></div><button class="btn" type="submit">Entrar</button></form><p class="err" role="alert">${msg}</p><a class="fgt" href="https://wa.me/5546999711937?text=${encodeURIComponent('Olá! Esqueci a senha do painel da Bonely Store. Pode me ajudar?')}" target="_blank" rel="noopener">Esqueci a senha</a>${FBM?'':'<small class="tag">PIN da prévia: 1234</small>'}</div></section>`;
 if(!aarea)return '<section><div class="wrap" style="min-height:50vh"></div></section>';
 const pend=AO().filter(o=>o.status===STATUS[0]).length;
 let body='';
 if(atab==='produtos'){
  const l=AP().filter(aMatch),ep=aedit?S.products.find(x=>x.id==aedit):null,open=!!(ep||pform);
  body=`<div class="two"><div class="pform${open?' open':''}"><h3>${ep?'Editar produto':'Novo produto'}</h3>${prodForm(ep)}</div>
  <div class="plistbox">${open?'':`<button class="btn mobnew" onclick="pform=true;render();scrollTo(0,0)">+ Novo produto</button>`}${aSearch('Buscar produto pelo nome')}<div class="plist">${l.map(p=>`<div class="pit"><span class="pth">${p.img?`<img src="${p.img}" alt="">`:'B'}</span><div class="pin"><b>${esc(p.name)}</b><small>${[p.kind||(p.type==='avulso'?'Importado':''),p.coll,money(p.price)].filter(Boolean).map(esc).join(' · ')}</small><div class="szr">${stkChips(p)}</div></div><div class="pst"><b class="${p.stock<=3?'err':''}">${p.stock}</b><small>em estoque</small></div><div class="pac"><button class="btn sm ghost" onclick="editProd(${p.id})">Editar</button><button class="btn sm ghost danger" onclick="delProd(${p.id})">Excluir</button></div></div>`).join('')}</div>${l.length?'':'<div class="empty">Nenhum produto encontrado.</div>'}</div></div>`;
 }
 if(atab==='estoque'){
  const all=AP(),l=all.filter(aMatch),mp=all.find(p=>p.id==mvP)||l[0]||all[0],
   zero=all.reduce((a,p)=>a+(hasStk(p)?Object.values(p.stk).filter(v=>!(+v>0)).length:0),0);
  body=`<div class="tiles">${tile('Peças em estoque',all.reduce((a,p)=>a+p.stock,0))}${tile('Produtos',all.length)}${tile('Estoque baixo',all.filter(p=>p.stock<=LOW).length)}${tile(SZ().p+' zerados',zero)}</div>
  <details class="fold" ${mvOpen?'open':''} ontoggle="mvOpen=this.open"><summary>Registrar entrada ou saída</summary><div class="foldb">
   <label>Produto</label><select id="mp" onchange="mvP=this.value;mvSizes();mvType()">${all.map(p=>`<option value="${p.id}" ${mp&&p.id==mp.id?'selected':''}>${esc(p.name)} (${p.stock})</option>`).join('')}</select>
   <label>${SZ().s}</label><select id="ms">${mvOpts(mp)}</select>
   <div class="fg2"><div><label>Movimento</label><select id="mt" onchange="mvType()"><option value="entrada">Entrada (chegou peça)</option><option value="venda">Venda fora do site (entra como venda)</option><option value="saida">Perda ou ajuste (só baixa o estoque)</option></select></div><div><label>Quantidade</label><input id="mq" type="number" min="1" inputmode="numeric"></div></div>
   <div id="msale" style="display:none"><div class="fg2"><div><label>Valor de cada peça (R$)</label><input id="mv" type="number" step="0.01" min="0" inputmode="decimal" value="${mp?mp.price:''}"></div><div><label>Forma de pagamento</label><select id="mpay"><option>Pix</option><option>Dinheiro</option><option>Cartão de crédito</option><option>Cartão de débito</option></select></div></div><label>Cliente (opcional)</label><input id="mcl" placeholder="Nome de quem comprou"><p class="tag">A venda entra como Entregue, no faturamento, nos mais vendidos e na meta.</p></div>
   <label>Observação (opcional)</label><input id="mn">
   <div class="row"><button class="btn" onclick="addMove()">Registrar</button></div></div></details>
  <h3 class="sec">Estoque por ${SZ().s.toLowerCase()}</h3>${aSearch('Buscar produto pelo nome')}
  <div class="plist">${l.map(p=>`<div class="pit"><span class="pth">${p.img?`<img src="${p.img}" alt="">`:'B'}</span><div class="pin"><b>${esc(p.name)}</b><div class="szr">${stkChips(p)}</div></div><div class="pst"><b class="${p.stock<=LOW?'err':''}">${p.stock}</b><small>total</small></div><div class="pac"><button class="btn sm ghost" onclick="mvP=${p.id};mvOpen=true;render();scrollTo(0,0)">Movimentar</button></div></div>`).join('')}</div>${l.length?'':'<div class="empty">Nenhum produto encontrado.</div>'}
  <h3 class="sec">Histórico</h3>${AM().length?`<div class="mvl">${AM().slice(0,60).map(mvRow).join('')}</div>`:'<div class="empty">Nenhuma movimentação ainda.</div>'}`;
 }
 if(atab==='vendas'){
  const a=rangeStart(vper),inR=paidOrders().filter(o=>oTs(o)>=a),tot=sumT(inR),wait=AO().filter(o=>o.status===STATUS[0]),gi=goalInfo();
  const cnt={};inR.forEach(o=>o.items.forEach(i=>{cnt[i.name]=(cnt[i.name]||0)+i.qty}));
  const top=Object.entries(cnt).sort((x,y)=>y[1]-x[1]).slice(0,6).map(([l,v])=>({l,v}));
  body=`<div class="tabs"><button class="${vper==='7d'?'on':''}" onclick="setPer('7d')">Últimos 7 dias</button><button class="${vper==='14d'?'on':''}" onclick="setPer('14d')">Últimos 14 dias</button><button class="${vper==='30d'?'on':''}" onclick="setPer('30d')">Últimos 30 dias</button><button class="${vper==='6m'?'on':''}" onclick="setPer('6m')">Últimos 6 meses</button></div>
  <div class="tiles">${tile('Faturamento',money(tot))}${tile('Pedidos pagos',inR.length)}${tile('Ticket médio',money(inR.length?tot/inR.length:0))}${tile('Aguardando pagamento',wait.length+' ('+money(sumT(wait))+')')}</div>
  <h3>Vendas por ${DAYS[vper]?'dia':'mês'}</h3>${tot?bars(series(vper)):'<div class="empty">Ainda não há vendas pagas neste período.</div>'}
  <div class="two"><div><h3>Produtos mais vendidos</h3>${hbars(top,v=>v+' un.')}</div>
  <div><h3>Meta de vendas do mês</h3><label>Meta em reais</label><div class="row" style="margin-top:0"><input id="goal" type="number" min="0" step="50" value="${goalVal()||''}" placeholder="Ex.: 5000"><button class="btn" onclick="saveGoal()">Salvar meta</button></div>
  ${gi.g?`<div class="prog"><i style="width:${Math.min(100,gi.pct)}%"></i></div><p>${money(gi.m)} de ${money(gi.g)} (${gi.pct}%). ${gi.pct>=100?'Meta batida!':'Faltam '+money(gi.g-gi.m)+'.'}</p>`:'<p class="tag">Defina uma meta para acompanhar no topo do painel.</p>'}</div></div>
  ${vFinance(a,tot)}`;
 }
 if(atab==='pedidos'){
  const cnt=st=>AO().filter(o=>o.status===st).length,k=aq.trim().toLowerCase();
  const l=AO().filter(o=>(ofil==='Todos'||o.status===ofil)&&(!k||o.id.toLowerCase().includes(k)||o.customer.name.toLowerCase().includes(k)));
  body=`<div class="pills">${['Todos',...STATUS].map(x=>`<button class="${ofil===x?'on':''}" onclick="ofil='${x}';render()">${x} (${x==='Todos'?AO().length:cnt(x)})</button>`).join('')}</div>${aSearch('Buscar por número do pedido ou nome do cliente')}
  ${l.length?l.map(o=>`<div class="card in ord" style="margin-bottom:14px"><div class="ordh"><div><span class="ordid">${o.id}</span><span class="ordc">${esc(o.customer.name)}</span></div><span class="st" data-s="${o.status}">${o.status}</span></div><div class="ordm">${dlBadge(o)}${o.store?'<span class="ordk">Venda na loja</span>':''}<span>${esc(o.date)}</span>${o.customer.phone?`<span>${esc(o.customer.phone)}</span>`:''}${o.store?'':`<span>${esc(o.customer.addr)}${o.customer.cep?' · CEP '+esc(o.customer.cep):''}</span>`}</div><div class="ordi">${o.items.map(i=>`<div><span>${i.qty}x ${esc(i.name)}${i.size?' ('+esc(i.size)+')':''}</span><span>${money(i.price*i.qty)}</span></div>`).join('')}</div><div class="ordt"><b>${money(o.total)}</b><small>${o.store?'':'Frete '+esc(o.ship.name)+' '+money(o.ship.price)+' · '}Pagamento: ${esc(o.pay||'a combinar')}</small></div>
  <div class="row ordact">${o.status===STATUS[0]?`<button class="btn sm" onclick="setStatus('${o.id}','Pago')">Confirmar pagamento</button>`:''}<select onchange="setStatus('${o.id}',this.value)" aria-label="Status">${STATUS.map(x=>`<option ${x===o.status?'selected':''}>${x}</option>`).join('')}</select>${o.store?'':`<input id="tr${o.id}" placeholder="Código de rastreio" value="${esc(o.tracking)}"><button class="btn sm" onclick="setTrack('${o.id}')">Salvar rastreio</button>`}${o.customer.phone?`<a class="btn sm ghost" style="text-decoration:none" target="_blank" rel="noopener" href="${custWa(o)}">Avisar cliente</a>`:''}<button class="btn sm danger" onclick="askDelOrder('${o.id}')">Excluir pedido</button></div></div>`).join(''):'<div class="empty">Nenhum pedido encontrado.</div>'}`;
 }
 if(atab==='combos'){
  const l=AP().filter(p=>aMatch(p)||cbSel.includes(p.id));
  body=`<div class="two"><div><h3>Novo combo</h3><label>Nome</label><input value="${esc(cbName)}" oninput="cbName=this.value"><label>Preço do combo (R$)</label><input type="number" step="0.01" value="${esc(cbPrice)}" oninput="cbPrice=this.value"><label>Produtos do combo</label>${aSearch('Buscar produto pelo nome')}
  ${l.map(p=>`<label style="color:var(--tx)"><input type="checkbox" style="width:auto" ${cbSel.includes(p.id)?'checked':''} onchange="togCb(${p.id})"> ${esc(p.name)}</label>`).join('')||'<div class="empty">Nenhum produto encontrado.</div>'}<div class="row"><button class="btn" onclick="addCombo()">Salvar combo</button></div></div>
  <div><h3>Combos cadastrados</h3>${AC().map(c=>`<div class="line"><span>${esc(c.name)} · ${money(c.price)}</span><button class="btn sm ghost danger" onclick="delCombo(${c.id})">Excluir</button></div>`).join('')||'<div class="empty">Nenhum combo.</div>'}</div></div>`;
 }
 if(atab==='config')body=vConfig();
 if(atab==='compartilhados')body=vShareAdmin();
 return `<section><div class="wrap"><div class="tabs" style="margin-top:0">${ATABS().map(([k,l])=>`<button class="${atab===k?'on':''}" onclick="atab='${k}';aq='';aedit=null;pform=false;render()">${l}${k==='pedidos'&&pend?' ('+pend+')':''}</button>`).join('')}</div>${body}</div></section>
`;
}
function vCart(){
 const c={...(S.customer||{}),...cdraft};const sh=ship&&ship.opts?ship.opts[ship.sel]:null;const retira=IMP&&ship&&ship.mode==='retirada';
 return `<div class="drawer ${cartOpen?'open':''}" role="dialog" aria-label="Carrinho"><div class="line" style="border:0"><h2 style="margin:0">Carrinho</h2><button class="btn sm ghost" onclick="cartOpen=false;render()">Fechar</button></div>
 ${CART().length?CART().map((i,n)=>`<div class="line"><span>${i.qty}x ${esc(item(i.key).name)} ${i.size?'('+esc(i.size)+')':''}</span><span>${money(item(i.key).price*i.qty)} <button class="btn sm ghost" onclick="rm(${n})" aria-label="Remover">×</button></span></div>`).join(''):'<div class="empty">Seu carrinho está vazio. Escolha uma peça no catálogo.</div>'}
 ${CART().length?`${IMP?`<label>Como você quer receber?</label><select id="loc" onchange="setLocal(this.value)"><option value="">Escolha uma opção</option><option value="retirada" ${ship&&ship.mode==='retirada'?'selected':''}>Retirada na loja</option><optgroup label="Entrega na cidade">${CIDADES.map(x=>`<option ${ship&&!ship.other&&ship.city===x?'selected':''}>${x}</option>`).join('')}</optgroup><option value="__outra" ${ship&&ship.other?'selected':''}>Outra cidade</option></select>${ship&&ship.other?`<label for="oc">Nome da cidade</label><input id="oc" value="${esc(ship.city)}" placeholder="Ex.: Realeza" oninput="setCity(this.value)" autocomplete="off">`:''}<p class="tag">Entregamos na região. Em &ldquo;Outra cidade&rdquo; você informa o nome e a loja confirma pelo WhatsApp. O valor da entrega é calculado na hora da entrega.</p>`:`<label>CEP de entrega</label><div class="row" style="margin-top:0"><input id="cep" value="${esc(ship?.cep||'')}" placeholder="00000-000" inputmode="numeric"><button class="btn sm" onclick="doCep()">Calcular</button></div>
 ${ship&&ship.err?'<div class="err">CEP inválido.</div>':''}${ship&&ship.loading?'<div class="tag">Calculando…</div>':''}${ship&&ship.fail?'<div class="err">Não foi possível calcular o frete agora. Tente novamente.</div>':''}${ship&&ship.opts?ship.opts.map((o,n)=>`<label style="color:var(--tx);display:flex;gap:8px"><input type="radio" name="fr" style="width:auto" ${n===ship.sel?'checked':''} onchange="setShip(${n})"> ${o.name} · ${o.days} dias · ${money(o.price)}</label>`).join(''):''}
 `}
 ${S.customer?'':`<p class="tag" style="margin:14px 0 0">Já é cliente? <button class="lk inl" onclick="openLogin('cart')">Entre</button> e preenchemos seus dados. Se ainda não é, o cadastro é criado quando você finalizar o pedido.</p>`}<label>Nome</label><input id="cn" value="${esc(c.name)}"><label>WhatsApp</label><input id="cp" value="${esc(c.phone)}"><label>E-mail</label><input id="ce" type="email" value="${esc(c.email)}">${retira?'':`<label>${IMP?'Endereço de entrega (rua, número, bairro)':'Endereço completo'}</label><input id="ca" value="${esc(c.addr==='Retirada na loja'?'':c.addr)}">`}<label>Forma de pagamento</label><select id="cpay"><option>Pix</option><option>Cartão de crédito</option><option>Cartão de débito</option><option>A combinar</option></select>
 <div class="line total" style="margin-top:14px"><span>Total</span><span>${money(cartSub()+(sh?sh.price:0))}</span></div>${IMP&&sh?`<p class="tag">${retira?'Retirada sem custo de frete.':'Mais o valor da entrega, calculado na hora da entrega.'}</p>`:''}
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
 share:'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>',
 tel:'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
 mail:'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 6L2 7"/></svg>',
 ig:'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><path d="M17.5 6.5h.01"/></svg>'
};
/* acesso escondido ao painel: 5 toques seguidos na logo do rodapé (dentro de 3 segundos) */
var _at=0,_atm=0;
function admTap(){
 if(!FBM||window.STATIC_PAGE)return;
 clearTimeout(_atm);_at++;_atm=setTimeout(()=>{_at=0},3000);
 if(_at>=5){_at=0;go('admin')}
}
function vFooter(){
 return `<footer><div class="wrap">
 <div class="fgrid">
 <div><img class="flogo" src="${LOGO}" alt="Bonely Store" onclick="admTap()"><p class="fabout">Bem-vindo(a) à Bonely Store. ${IMP?'Produtos importados selecionados, com entrega em cidades da região ou retirada.':'Moda feminina e masculina com peças selecionadas e envio para todo o Brasil.'}</p></div>
 <div><h3>Categorias</h3><button class="lk" onclick="q='';cat('Feminino')">Feminino</button><button class="lk" onclick="q='';cat('Masculino')">Masculino</button><a class="lk" href="${pageUrl('importados')}">Importados</a></div>
 <div><h3>Institucional</h3><a class="lk" href="${pageUrl('privacidade')}">Política de Privacidade</a><a class="lk" href="${pageUrl('cancelamento')}">Política de Cancelamento e Trocas</a></div>
 <div><h3>Minhas compras</h3><button class="lk" onclick="${acct()}">Minha conta</button>${IMP?'':`<button class="lk" onclick="go('rastreio')">Rastrear pedido</button>`}${IMP?'':`<button class="lk" onclick="modal='frete';render()">Simular frete</button>`}</div>
 <div><h3>Contato</h3><ul class="contact"><li><a href="https://wa.me/${WA}" target="_blank" rel="noopener">${IC.wa}<span>WhatsApp</span></a></li>${EMAIL?`<li><a href="mailto:${EMAIL}">${IC.mail}<span>${EMAIL}</span></a></li>`:''}</ul><div class="hours"><b>Horário de atendimento</b><p>${HOURS}</p></div></div>
 </div>
 <div class="fline"></div>
 <div class="fpay"><div><h3>Pague com</h3><div class="pay"><span>Pix</span><span>Cartão de crédito</span><span>Cartão de débito</span></div></div>${location.protocol==='https:'?`<div><h3>Segurança</h3><div class="ssl" title="Conexão criptografada (HTTPS)"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg><span><b>Site seguro</b><small>Conexão protegida por SSL</small></span></div></div>`:''}<div><h3 style="white-space:nowrap">Acompanhe nas redes</h3><a class="soc" href="https://www.instagram.com/${IG}" target="_blank" rel="noopener" aria-label="Instagram">${IC.ig}</a></div></div>
 <div class="copy">© ${new Date().getFullYear()} Bonely Store. Todos os direitos reservados.<br>Desenvolvido por <a href="https://linkneres.vercel.app/" target="_blank" rel="noopener">Dalton Neres</a> | Full Stack developer</div>
 </div></footer>`;
}
function go(v){clearUrl();if(v!=='conta')justOrdered=null;if(v!=='rastreio')trkPre=null;pg='';if(v!=='admin'){aarea=null;apick=false;aedit=null}view=v;cartOpen=false;menu=false;render();scrollTo(0,0)}
function render(){
 if(view==='admin'&&CLEAN&&!window.STATIC_PAGE){try{const u=panelUrl();if(location.pathname!==u)history.replaceState(null,'',u)}catch(e){}}
 if(window.STATIC_PAGE&&view!=='doc'){location.href=pageUrl('index')+'?'+new URLSearchParams({v:view,f:filter,c:collF,q:q,g:pg});return}
 const n=CART().reduce((a,i)=>a+i.qty,0),cu=S.customer,panel=view==='admin';
 document.body.classList.toggle('is-panel',panel);
 $('#app').innerHTML=`${panel?vPanelHead():`<header><div class="wrap hd">
 <button class="iconbtn" onclick="menu=true;render()" aria-label="Abrir menu">${IC.menu}</button>
 <button class="brand" onclick="q='';go('loja')" aria-label="Bonely Store, início">BONELY<span class="bsub">STORE${SEC==='importados'?' <i>|</i> IMPORTADOS':''}</span></button>
 <form class="search" onsubmit="doSearch(event)"><input id="q" value="${esc(q)}" placeholder="Digite o que você procura" aria-label="Buscar produtos"><button aria-label="Buscar">${IC.search}</button></form>
 <a class="hbox central" href="https://wa.me/${WA}" target="_blank" rel="noopener">${IC.head}<span><small>Central de</small>Atendimento</span></a>
 <button class="hbox" onclick="${acct()}">${IC.user}<span><small>${cu?'Olá, '+esc(cu.name.split(' ')[0]):'Olá, Bem-vindo(a)'}</small>${cu?'Minha conta':'Entre ou Cadastre-se'}</span></button>
 <button class="cartbtn" onclick="cartOpen=true;render()" aria-label="Carrinho, ${n} itens">${IC.cart}${n?`<b>${n}</b>`:''}</button></div></header>`}
 <main>${view==='loja'?vLoja():view==='conta'?vConta():view==='rastreio'?vRastreio():view==='doc'?vDoc():view==='produto'?vProduto():vAdmin()}</main>${panel?'':vFooter()}${vCart()}${vMenu()}${modal==='frete'?vModal():''}${modal==='login'?vLogin():''}${modal==='share'?vShare():''}${modal==='neworder'?vNewOrder():''}${modal==='lowstock'?vLowStock():''}${modal==='dueorder'?vDue():''}${modal==='delorder'?vDelOrder():''}${panel&&adminOk&&(!aarea||apick)?vAreaModal():''}${panel?'':`<div class="fabs"><button class="fab up" onclick="scrollTo({top:0,behavior:'smooth'})" aria-label="Voltar ao topo">${IC.up}</button><a class="fab wa" href="https://wa.me/${WA}" target="_blank" rel="noopener" aria-label="WhatsApp">${IC.wa}</a></div>`}`;
 if(panel&&adminOk&&!modal)setTimeout(checkNew,0);
 if(panel&&adminOk){const b=document.querySelector('.tabs button.on'),t=b&&b.parentElement;if(t)t.scrollLeft=b.offsetLeft-(t.clientWidth-b.offsetWidth)/2}
}
if(window.addEventListener)window.addEventListener('storage',e=>{
 if(FBM||e.key!==K||!e.newValue)return;
 try{const old=S.orders.length;S=JSON.parse(e.newValue);if(view==='admin'&&adminOk&&S.orders.length!==old)render()}catch(_){}
});
(function(){
 const mp=(location.pathname||'').match(/\/produto\/[^/]*-(\d+)\/?$/);
 if(!window.STATIC_PAGE&&mp){pid=mp[1];view='produto';return}
 const pm=(location.pathname||'').match(/\/painel(?:\/(moda|importados))?\/?$/);
 if(!window.STATIC_PAGE&&pm){view='admin';if(pm[1])aarea=pm[1];return}
 const P=new URLSearchParams(location.search);
 if(window.STATIC_PAGE||![...P.keys()].length)return;
 if(['loja','conta',...(IMP?[]:['rastreio']),'admin'].includes(P.get('v')))view=P.get('v');
 if(P.get('f'))filter=P.get('f');
 collF=P.get('c')||'';q=P.get('q')||'';pg=P.get('g')||'';
 if(P.get('p')){pid=P.get('p');view='produto'}
 else history.replaceState(null,'',location.pathname);
})();
async function boot(){
 if(window.FB&&!window.STATIC_PAGE){
  const msgBox=h=>{$('#app').innerHTML='<div style="min-height:60vh;display:grid;place-items:center;text-align:center;padding:24px;color:#9a8f7c;font-family:Jost,sans-serif">'+h+'</div>'};
  msgBox('Carregando…');
  await FB.ready;
  if(!FB.on)return msgBox('<div>Não foi possível conectar agora.<br><br><button class="btn" onclick="location.reload()">Tentar de novo</button></div>');
  try{
   let ses={};try{ses=JSON.parse(localStorage.getItem(SK))||{}}catch(e){}
   const d=await FB.loadPublic();
   S={colls:[],products:d.products,combos:d.combos,orders:[],moves:[],expenses:[],shares:[],customers:[],cfg:{},goals:{},seen:[],seq:1000,cart:[],cartImp:[],customer:null,...ses};
   if(d.pub){S.colls=d.pub.colls||[];S.cfg=d.pub.cfg||{}}
   FBM=true;
   if(S.customer){S.customers=[S.customer];await loadMine()}
   if(view==='admin'&&FB.admin)await enterAdmin();
  }catch(e){console.error(e);FBM=false;return msgBox('<div>Não foi possível carregar a loja agora.<br><br><button class="btn" onclick="location.reload()">Tentar de novo</button></div>')}
 }
 render();
 if(pg){setTimeout(()=>{const e=document.getElementById(pg);if(e)e.scrollIntoView();pg=''},60)}
}
boot();
