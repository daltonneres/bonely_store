/* Bonely Store | Midily Gestão: núcleo 100% local (sem IA externa e sem chave de API) (regras de negócio, sem tela)
   Espelha as regras do painel (app.js): estoque por tamanho (p.stk), p.stock = soma, movimentos, vendas, despesas, fotos.
   Nada aqui grava na nuvem: só altera o objeto S. Quem grava é a página (FB.flush). */
(function(g){
'use strict';

const norm=s=>String(s==null?'':s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const parseOpts=t=>{const out=[];String(t||'').split(/[\n,]+/).map(x=>x.trim()).filter(Boolean).forEach(x=>{if(!out.some(y=>y.toLowerCase()===x.toLowerCase()))out.push(x)});return out};
const r2=v=>Math.round((+v+Number.EPSILON)*100)/100;
const err=m=>({ok:false,error:m});

const EXP_CATS=['Mercadoria / estoque','Frete e embalagem','Marketing e anúncios','Taxas e tarifas','Material e equipamento','Outros'];
const REC_CATS=['Venda fora do site','Aporte / investimento','Outras receitas'];
const PAY=['Pix','Dinheiro','Cartão de crédito','Cartão de débito','A combinar'];
const PAID=['Pago','Separando','Enviado','Entregue'];
const GENS=['Feminino','Masculino','Unissex'];
const MAXIMG=5,IMGCAP=850000,LOW=4;

/* ---------- calculadora segura (sem eval) ---------- */
function calc(expr){
 let s=String(expr||'').replace(/R\$/gi,'').replace(/\s+/g,'').replace(/×/g,'*').replace(/÷/g,'/').replace(/x(?=\d)/gi,'*');
 if(s.includes(','))s=s.replace(/\./g,'').replace(/,/g,'.');
 if(!s||!/^[\d+\-*/().%^]+$/.test(s))throw new Error('Expressão inválida. Use só números e + - * / ( ) % ^');
 let i=0;
 const post=v=>{while(s[i]==='%'){i++;v/=100}return v};
 function prim(){
  if(s[i]==='('){i++;const v=expr1();if(s[i]!==')')throw new Error('Parênteses incompletos');i++;return post(v)}
  if(s[i]==='-'){i++;return -prim()}
  if(s[i]==='+'){i++;return prim()}
  const m=/^(\d+\.?\d*|\.\d+)/.exec(s.slice(i));if(!m)throw new Error('Expressão inválida');
  i+=m[0].length;return post(parseFloat(m[0]));
 }
 function pow(){const b=prim();if(s[i]==='^'){i++;return Math.pow(b,pow())}return b}
 function term(){let v=pow();while(s[i]==='*'||s[i]==='/'){const op=s[i++],r=pow();v=op==='*'?v*r:v/r}return v}
 function expr1(){let v=term();while(s[i]==='+'||s[i]==='-'){const op=s[i++],r=term();v=op==='+'?v+r:v-r}return v}
 const v=expr1();
 if(i!==s.length||!Number.isFinite(v))throw new Error('Não consegui calcular isso');
 return +v.toFixed(6);
}

const WRITE=new Set(['adjust_stock','create_product','update_product','manage_photos','register_expense','register_sale']);

/* ---------- instância ligada aos dados ---------- */
function create(o){
 const S=o.S,area=()=>o.area(),imp=()=>area()==='importados';
 const isImp=p=>!!p&&p.type==='avulso';
 const prods=()=>(S.products||[]).filter(p=>isImp(p)===imp());
 const byId=id=>(S.products||[]).find(p=>String(p.id)===String(id));
 const myProd=id=>{const p=byId(id);return p&&isImp(p)===imp()?p:null};
 const photo=id=>o.photo?o.photo(id):null;

 /* estoque por tamanho (mesmas regras do painel) */
 const szOf=p=>{const l=parseOpts(p.sizes);return l.length?l:['Único']};
 const hasStk=p=>!!(p&&p.stk&&typeof p.stk==='object');
 const stkQ=(p,s)=>hasStk(p)?(+p.stk[s]||0):(+p.stock||0);
 const sumOf=m=>Object.values(m).reduce((a,v)=>a+(+v||0),0);
 const stkSum=p=>{p.stock=sumOf(p.stk)};
 const canStk=p=>hasStk(p)||szOf(p).length<=1;
 const ensureStk=p=>{if(hasStk(p))return true;const l=szOf(p);if(l.length>1){p.stk={};l.forEach(s=>{p.stk[s]=0});return true}p.stk={[l[0]]:+p.stock||0};return true};
 const rsz=(p,s)=>{const l=szOf(p);if(s==null||String(s).trim()==='')return l.length===1?l[0]:null;const k=norm(s);return l.find(x=>norm(x)===k)||null};
 const szHelp=p=>'Tamanhos/opções de "'+p.name+'": '+szOf(p).join(', ')+'.';
 const pimgs=p=>Array.isArray(p&&p.imgs)&&p.imgs.length?p.imgs:(p&&p.img?[p.img]:[]);
 function takeStk(p,q,s){
  if(!hasStk(p)){p.stock=Math.max(0,(+p.stock||0)-q);return}
  if(s&&s in p.stk)p.stk[s]=Math.max(0,(+p.stk[s]||0)-q);
  stkSum(p);
 }
 const fmtD=ts=>new Date(ts).toLocaleDateString('pt-BR');
 function move(p,size,type,qty,note){
  const ts=Date.now();S.moves=S.moves||[];
  S.moves.unshift({date:new Date(ts).toLocaleString('pt-BR'),ts,name:p.name,size,type,qty,note:note||'',area:area()});
 }

 /* ---------- visões ---------- */
 function view(p){
  const sizes={};szOf(p).forEach(s=>{sizes[s]=stkQ(p,s)});
  return{id:String(p.id),nome:p.name,preco:+p.price,preco_antigo:+p.oldPrice>0?+p.oldPrice:undefined,faixa:p.tag||undefined,estoque_total:+p.stock||0,por_tamanho:sizes,fotos:pimgs(p).length,tipo:p.kind||undefined,publico:p.gen||undefined,cor:p.color||undefined,marca:p.brand||undefined,sem_divisao_de_estoque:canStk(p)?undefined:true};
 }
 function find(q,onlyLow,limit){
  limit=Math.min(25,Math.max(1,Math.floor(+limit)||12));
  let L=prods();
  const toks=norm(q).split(/\s+/).filter(Boolean);
  if(toks.length)L=L.filter(p=>{const h=norm([p.name,p.color,p.brand,p.kind,p.coll,p.gen,p.id].join(' '));return toks.every(t=>h.includes(t))});
  if(onlyLow)L=L.filter(p=>(+p.stock||0)<=LOW);
  if(!toks.length)L=L.slice().sort((a,b)=>(b.id||0)-(a.id||0));
  return{total:L.length,produtos:L.slice(0,limit).map(view)};
 }

 /* ---------- pedidos / relatório ---------- */
 const oTs=x=>{if(x.ts)return x.ts;const m=String(x.date).match(/(\d+)\/(\d+)\/(\d+)/);return m?new Date(+m[3],+m[2]-1,+m[1]).getTime():Date.now()};
 const oArea=x=>x.area||((x.items||[]).some(i=>!String(i.key).startsWith('c')&&isImp((S.products||[]).find(p=>p.id==i.key)))?'importados':'moda');
 const areaOrders=()=>(S.orders||[]).filter(x=>!x.sample&&oArea(x)===area());
 function units(list){const m={};list.forEach(x=>(x.items||[]).forEach(i=>{m[i.name]=(m[i.name]||0)+(+i.qty||0)}));return m}
 function report(days){
  days=Math.min(365,Math.max(1,Math.floor(+days)||7));
  const from=Date.now()-days*864e5,os=areaOrders(),paid=os.filter(x=>PAID.includes(x.status)&&oTs(x)>=from);
  const rev=paid.reduce((a,x)=>a+(+x.total||0),0),u=units(paid);
  const top=Object.entries(u).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([nome,unidades])=>({nome,unidades}));
  const ex=(S.expenses||[]).filter(x=>(x.area||'moda')===area()&&(x.ts||0)>=from);
  const desp=ex.filter(x=>x.kind!=='in').reduce((a,x)=>a+(+x.val||0),0),rece=ex.filter(x=>x.kind==='in').reduce((a,x)=>a+(+x.val||0),0);
  const P=prods(),low=P.filter(p=>(+p.stock||0)<=LOW).map(p=>({nome:p.name,estoque:+p.stock||0}));
  const holes=P.filter(p=>(+p.stock||0)>0&&szOf(p).length>1&&szOf(p).some(s=>stkQ(p,s)<=0)).map(p=>({nome:p.name,zerados:szOf(p).filter(s=>stkQ(p,s)<=0)}));
  const sold60=units(os.filter(x=>PAID.includes(x.status)&&oTs(x)>=Date.now()-60*864e5));
  const slow=P.filter(p=>(+p.stock||0)>0&&!sold60[p.name]).sort((a,b)=>(+b.stock||0)-(+a.stock||0)).slice(0,5).map(p=>({nome:p.name,estoque:+p.stock||0}));
  const noPhoto=P.filter(p=>!pimgs(p).length).map(p=>p.name);
  return{setor:imp()?'Importados':'Moda',dias:days,faturamento:r2(rev),pedidos_pagos:paid.length,ticket_medio:paid.length?r2(rev/paid.length):0,mais_vendidos:top,despesas:r2(desp),receitas_avulsas:r2(rece),
   estoque_baixo:low.slice(0,12),tamanhos_zerados:holes.slice(0,12),parados_60_dias:slow,sem_foto:noPhoto.slice(0,12),
   aguardando_pagamento:os.filter(x=>x.status==='Aguardando pagamento').length,para_separar:os.filter(x=>x.status==='Pago'||x.status==='Separando').length,lista_de_espera:os.filter(x=>x.status==='Lista de espera').length,produtos_no_setor:P.length};
 }
 function reportText(days){
  const r=report(days),L=['*Resumo dos últimos '+r.dias+' dias · '+r.setor+'*'];
  L.push('Faturamento: *'+money(r.faturamento)+'* em '+r.pedidos_pagos+' pedido(s)'+(r.pedidos_pagos?' (ticket médio '+money(r.ticket_medio)+')':''));
  L.push('Despesas: '+money(r.despesas)+(r.receitas_avulsas?' · Receitas avulsas: '+money(r.receitas_avulsas):''));
  if(r.mais_vendidos.length)L.push('\n*Mais vendidos*\n'+r.mais_vendidos.map(x=>'• '+x.nome+': '+x.unidades+' un.').join('\n'));
  if(r.estoque_baixo.length)L.push('\n*Estoque baixo*\n'+r.estoque_baixo.map(x=>'• '+x.nome+': '+x.estoque).join('\n'));
  if(r.tamanhos_zerados.length)L.push('\n*Tamanhos zerados*\n'+r.tamanhos_zerados.map(x=>'• '+x.nome+': '+x.zerados.join(', ')).join('\n'));
  if(r.parados_60_dias.length)L.push('\n*Sem venda há 60 dias*\n'+r.parados_60_dias.map(x=>'• '+x.nome+' ('+x.estoque+' em estoque)').join('\n'));
  const pend=[r.para_separar&&r.para_separar+' para separar',r.aguardando_pagamento&&r.aguardando_pagamento+' aguardando pagamento',r.lista_de_espera&&r.lista_de_espera+' na lista de espera'].filter(Boolean);
  if(pend.length)L.push('\n*Pendências:* '+pend.join(' · '));
  return L.join('\n');
 }
 function listOrders(status,limit){
  limit=Math.min(15,Math.max(1,Math.floor(+limit)||8));
  let L=areaOrders();if(status)L=L.filter(x=>x.status===status);
  L=L.slice().sort((a,b)=>oTs(b)-oTs(a));
  return{total:L.length,pedidos:L.slice(0,limit).map(x=>({id:x.id,status:x.status,cliente:(x.customer&&x.customer.name)||'Cliente',total:+x.total,data:x.date,pagamento:x.pay||'',itens:(x.items||[]).map(i=>i.qty+'x '+i.name+(i.size?' ('+i.size+')':'')).join(', ')}))};
 }

 /* ---------- simulação de desconto ---------- */
 function simulate(a){
  const p=myProd(a.product_id);if(!p)return err('Produto não encontrado neste setor.');
  const price=+p.price;let np=a.new_price!=null?+a.new_price:(a.percent!=null?price*(1-(+a.percent)/100):NaN);
  if(!Number.isFinite(np)||np<0)return err('Informe percent ou new_price.');
  np=r2(np);const out={ok:true,produto:p.name,preco_atual:price,novo_preco:np,desconto_percentual:price?r2((1-np/price)*100):0,economia_por_peca:r2(price-np)};
  if(+p.oldPrice>price)out.ja_em_promocao_de=+p.oldPrice;
  const fee=a.card_fee_percent>0?+a.card_fee_percent:0,net=r2(np*(1-fee/100));
  if(fee)out.recebe_liquido_apos_taxa=net;
  if(a.cost!=null&&+a.cost>=0){const c=+a.cost;out.custo=c;out.lucro_por_peca_atual=r2(price*(1-fee/100)-c);out.lucro_por_peca_novo=r2(net-c);out.margem_atual_percent=price?r2((price*(1-fee/100)-c)/price*100):0;out.margem_nova_percent=np?r2((net-c)/np*100):0;out.preco_minimo_sem_prejuizo=r2(c/(1-fee/100))}
  return out;
 }

 /* ---------- planos de alteração: validam sem mexer em S; apply() grava em S ---------- */
 function planStock(ch){
  if(!Array.isArray(ch)||!ch.length)return err('Nenhuma alteração informada.');
  const cur={},rows=[];
  for(const c of ch){
   const p=myProd(c.product_id);if(!p)return err('Não encontrei o produto '+c.product_id+' neste setor.');
   const split=!canStk(p);
   if(split){const cs=ch.filter(x=>String(x.product_id)===String(p.id));if(!szOf(p).every(s=>cs.some(x=>x.mode==='definir'&&norm(x.size)===norm(s))))return err('"'+p.name+'" ainda não tem o estoque dividido. Informe a quantidade de TODOS os tamanhos de uma vez: '+szOf(p).join(', ')+'.')}
   const sz=rsz(p,c.size);if(!sz)return err((c.size?'Não existe o tamanho/opção "'+c.size+'" em "'+p.name+'". ':'Informe o tamanho/opção. ')+szHelp(p));
   const k=p.id+'|'+sz;if(!(k in cur))cur[k]=split?0:stkQ(p,sz);
   const q=Math.floor(+c.qty),mode=c.mode;
   if(!Number.isFinite(q)||q<0||(mode!=='definir'&&q<1))return err('Quantidade inválida para "'+p.name+'".');
   let after;
   if(mode==='entrada')after=cur[k]+q;
   else if(mode==='saida'){if(q>cur[k])return err('"'+p.name+'" ('+sz+') só tem '+cur[k]+' em estoque; não dá para tirar '+q+'.');after=cur[k]-q}
   else if(mode==='definir')after=q;
   else return err('Modo inválido. Use entrada, saida ou definir.');
   rows.push({p,sz,before:cur[k],after,delta:after-cur[k],note:String(c.note||'').trim(),mode,split});cur[k]=after;
  }
  const real=rows.filter(r=>r.delta!==0);
  if(!real.length)return err('Nada muda: o estoque já está com esses valores.');
  return{ok:true,
   lines:real.map(r=>'*'+r.p.name+'*'+(szOf(r.p).length>1?' · '+r.sz:'')+': '+r.before+' → *'+r.after+'* ('+(r.delta>0?'+':'−')+Math.abs(r.delta)+')'),
   apply(){
    const res=[];
    real.forEach(r=>{
     ensureStk(r.p);r.p.stk[r.sz]=r.after;stkSum(r.p);
     if(!r.split)move(r.p,r.sz,r.delta>0?'entrada':'saida',Math.abs(r.delta),r.note||(r.mode==='definir'?'Ajuste de inventário (Midily)':'Ajuste pela Midily'));
     res.push({produto:r.p.name,tamanho:r.sz,antes:r.before,depois:r.after,estoque_total:r.p.stock});
    });
    return{ok:true,atualizados:res};
   }};
 }

 function planCreate(a){
  const name=String(a.name||'').trim(),price=+a.price;
  if(!name)return err('Informe o nome do produto.');
  if(!(price>=0)||!Number.isFinite(price))return err('Informe um preço válido.');
  const dup=prods().find(p=>norm(p.name)===norm(name));
  if(dup)return err('Já existe "'+dup.name+'" (id '+dup.id+') neste setor. Quer atualizar o estoque ou os dados dele em vez de criar outro?');
  const seen=new Set(),list=[];
  (Array.isArray(a.sizes)&&a.sizes.length?a.sizes:[{size:'Único',qty:0}]).forEach(x=>{
   const s=String(x.size||'').trim()||'Único',k=norm(s);if(seen.has(k))return;seen.add(k);list.push({size:s,qty:Math.max(0,Math.floor(+x.qty)||0)});
  });
  const ids=[...new Set(a.photo_ids||[])],imgs=ids.map(photo);
  if(imgs.some(x=>!x))return err('Não encontrei alguma das fotos informadas (use foto1, foto2...).');
  if(imgs.length>MAXIMG)return err('Máximo de '+MAXIMG+' fotos por produto.');
  if(imgs.reduce((t,x)=>t+x.length,0)>IMGCAP)return err('As fotos ficaram pesadas demais para um produto. Use menos fotos.');
  const gen=imp()?'':(GENS.includes(a.gen)?a.gen:'Unissex'),tot=list.reduce((t,x)=>t+x.qty,0);
  const lines=['*'+name+'* · '+money(price),'Estoque inicial: '+list.map(x=>(list.length>1?x.size+': ':'')+x.qty).join(' · ')+' (total '+tot+')'];
  if(gen)lines.push('Público: '+gen);if(a.kind)lines.push('Tipo: '+a.kind);if(a.coll&&!imp())lines.push('Coleção: '+a.coll);
  lines.push(imgs.length?imgs.length+' foto(s) (a primeira é a capa)':'Sem fotos por enquanto');
  return{ok:true,lines,photos:ids,apply(){
   let id=Date.now();while(byId(id))id++;
   const stk={};list.forEach(x=>{stk[x.size]=x.qty});
   const p={id,type:imp()?'avulso':'roupa',coll:imp()?'':String(a.coll||'').trim(),sizes:list.map(x=>x.size).join(','),color:String(a.color||'').trim(),brand:String(a.brand||'').trim(),desc:String(a.desc||'').trim(),specs:'',name,price:r2(price),gen,stk,stock:sumOf(stk),imgs:imgs.slice(),img:imgs[0]||''};
   if(a.kind)p.kind=String(a.kind).trim();
   S.products=S.products||[];S.products.push(p);
   if(p.coll){S.colls=S.colls||[];if(!S.colls.includes(p.coll))S.colls.push(p.coll)}
   list.forEach(x=>{if(x.qty>0)move(p,x.size,'entrada',x.qty,'Cadastro inicial (Midily)')});
   return{ok:true,id:String(p.id),produto:p.name,estoque_total:p.stock,fotos:imgs.length};
  }};
 }

 function planUpdate(a){
  const p=myProd(a.product_id);if(!p)return err('Não encontrei o produto '+a.product_id+' neste setor.');
  const patch={},lines=[],has=k=>a[k]!==undefined&&a[k]!==null;
  if(has('name')){const n=String(a.name).trim();if(!n)return err('O nome não pode ficar vazio.');if(n!==p.name){patch.name=n;lines.push('Nome: '+p.name+' → *'+n+'*')}}
  const priceF=has('price')?+a.price:+p.price;
  if(has('price')){if(!(priceF>=0)||!Number.isFinite(priceF))return err('Preço inválido.');if(r2(priceF)!==+p.price){patch.price=r2(priceF);lines.push('Preço: '+money(p.price)+' → *'+money(priceF)+'*')}}
  if(has('price')||has('tag')||has('old_price')){
   const tg=has('tag')?String(a.tag).trim():String(p.tag||'');
   if(tg.length>18)return err('A faixa pode ter no máximo 18 letras.');
   if(tg==='Promoção'){
    const old=has('old_price')?+a.old_price:(+p.oldPrice||0);
    if(!(old>priceF))return err('Na promoção, o preço antigo ('+money(old)+') precisa ser maior que o preço atual ('+money(priceF)+'). Informe old_price ou encerre a promoção.');
    if(tg!==(p.tag||'')){patch.tag=tg;lines.push('Faixa: '+(p.tag||'nenhuma')+' → *Promoção*')}
    if(r2(old)!==+p.oldPrice){patch.oldPrice=r2(old);lines.push('Preço antigo (riscado): '+(+p.oldPrice>0?money(p.oldPrice):'nenhum')+' → *'+money(old)+'*')}
   }else if(has('tag')||has('old_price')||(p.tag==='Promoção')){
    if(tg!==(p.tag||'')){patch.tag=tg;lines.push('Faixa: '+(p.tag||'nenhuma')+' → '+(tg?'*'+tg+'*':'*nenhuma*'))}
    if(+p.oldPrice>0){patch.oldPrice=0;lines.push('Preço antigo riscado removido')}
   }
  }
  ['desc','color','brand','kind','coll'].forEach(k=>{if(has(k)){const v=String(a[k]).trim();if(v!==String(p[k]||'')){patch[k]=v;lines.push({desc:'Descrição',color:'Cor',brand:'Marca',kind:'Tipo',coll:'Coleção'}[k]+': *'+(v||'vazio')+'*')}}});
  if(has('gen')&&!imp()){if(!GENS.includes(a.gen))return err('Público inválido.');if(a.gen!==p.gen){patch.gen=a.gen;lines.push('Público: '+(p.gen||'—')+' → *'+a.gen+'*')}}
  if(!lines.length)return err('Nada muda: o produto já está assim.');
  return{ok:true,title:'Alterar '+p.name,lines,apply(){
   Object.assign(p,patch);
   if(patch.coll){S.colls=S.colls||[];if(!S.colls.includes(patch.coll))S.colls.push(patch.coll)}
   return{ok:true,produto:p.name,preco:+p.price,preco_antigo:+p.oldPrice>0?+p.oldPrice:undefined,faixa:p.tag||''};
  }};
 }

 function planPhotos(a){
  const p=myProd(a.product_id);if(!p)return err('Não encontrei o produto '+a.product_id+' neste setor.');
  const cur=pimgs(p).slice(),act=a.action,ids=[...new Set(a.photo_ids||[])];let nxt,lines;
  if(act==='add'||act==='replace'){
   const imgs=ids.map(photo);
   if(!ids.length||imgs.some(x=>!x))return err('Não encontrei essas fotos na conversa. Peça para a Gabriely enviar de novo (elas aparecem como foto1, foto2...).');
   nxt=act==='add'?cur.concat(imgs):imgs.slice();
   lines=[(act==='add'?'Adicionar ':'Trocar todas por ')+ids.length+' foto(s) em *'+p.name+'*','Ficará com '+nxt.length+' de '+MAXIMG+' fotos'];
  }else if(act==='remove'||act==='set_cover'){
   const i=Math.floor(+a.index)-1;
   if(!(i>=0&&i<cur.length))return err('"'+p.name+'" tem '+cur.length+' foto(s). Informe o número da foto (1 é a capa).');
   nxt=act==='remove'?cur.filter((_,k)=>k!==i):[cur[i],...cur.filter((_,k)=>k!==i)];
   lines=[(act==='remove'?'Remover a foto '+(i+1):'Tornar a foto '+(i+1)+' a capa')+' de *'+p.name+'*'];
  }else return err('Ação inválida.');
  if(nxt.length>MAXIMG)return err('Máximo de '+MAXIMG+' fotos por produto (ficaria com '+nxt.length+'). Remova ou substitua alguma.');
  if(nxt.reduce((t,x)=>t+x.length,0)>IMGCAP)return err('As fotos ficaram pesadas demais para um produto. Use menos fotos.');
  return{ok:true,lines,photos:(act==='add'||act==='replace')?ids:[],apply(){p.imgs=nxt;p.img=nxt[0]||'';return{ok:true,produto:p.name,fotos:nxt.length}}};
 }

 function planExpense(a){
  const kind=a.kind==='in'?'in':'out',desc=String(a.description||'').trim().slice(0,100),val=+a.value,cats=kind==='in'?REC_CATS:EXP_CATS;
  if(!desc)return err('Descreva o lançamento.');
  if(!(val>0)||!Number.isFinite(val))return err('O valor precisa ser maior que zero.');
  const cat=cats.find(c=>norm(c)===norm(a.category))||cats[cats.length-1];
  return{ok:true,lines:['*'+(kind==='in'?'Receita':'Despesa')+'*: '+desc,'Valor: *'+money(val)+'*','Categoria: '+cat+' · '+(imp()?'Importados':'Moda')],apply(){
   const ts=Date.now();S.expenses=S.expenses||[];
   S.expenses.unshift({id:'x'+ts.toString(36)+Math.random().toString(36).slice(2,6),ts,date:fmtD(ts),desc,cat,val:r2(val),kind,area:area()});
   return{ok:true,tipo:kind==='in'?'receita':'despesa',descricao:desc,valor:r2(val),categoria:cat};
  }};
 }

 function planSale(a){
  const p=myProd(a.product_id);if(!p)return err('Não encontrei o produto '+a.product_id+' neste setor.');
  if(!canStk(p))return err('"'+p.name+'" ainda não tem o estoque dividido por tamanho. Abra o produto no painel e informe quanto tem de cada um.');
  const sz=rsz(p,a.size);if(!sz)return err((a.size?'Não existe "'+a.size+'". ':'Informe o tamanho/opção. ')+szHelp(p));
  const q=Math.floor(+a.qty),v=a.unit_price!=null?+a.unit_price:+p.price,pay=PAY.find(x=>norm(x)===norm(a.payment))||'A combinar';
  if(!(q>0))return err('A quantidade precisa ser maior que zero.');
  if(!(v>=0)||!Number.isFinite(v))return err('Preço inválido.');
  if(q>stkQ(p,sz))return err('"'+p.name+'" ('+sz+') só tem '+stkQ(p,sz)+' em estoque.');
  const cli=String(a.customer||'').trim().slice(0,80),tot=r2(v*q);
  return{ok:true,lines:['*'+p.name+'*'+(szOf(p).length>1?' · '+sz:''),q+' × '+money(v)+' = *'+money(tot)+'*','Pagamento: '+pay,'Cliente: '+(cli||'Venda na loja'),'Vira pedido *Entregue* e dá baixa no estoque ('+stkQ(p,sz)+' → '+(stkQ(p,sz)-q)+').'],
   async apply(){
    const seq=await o.nextSeq();if(!seq)return err('Não foi possível gerar o número do pedido.');
    ensureStk(p);
    const id='BN'+seq,ts=Date.now(),when=new Date(ts).toLocaleString('pt-BR');
    S.orders=S.orders||[];
    S.orders.unshift({id,date:when,ts,customer:{name:cli||'Venda na loja',email:'',phone:'',addr:'Venda na loja',cep:''},items:[{key:p.id,name:p.name,price:r2(v),qty:q,size:sz}],subtotal:tot,ship:{name:'Venda na loja',price:0,local:true},total:tot,pay,status:'Entregue',tracking:'',stockDone:true,store:true,area:area()});
    S.seen=[...(S.seen||[]),id];
    takeStk(p,q,sz);
    move(p,sz,'saida',q,'Venda na loja '+id+' (Midily)');
    return{ok:true,pedido:id,total:tot,produto:p.name,tamanho:sz,estoque_restante:stkQ(p,sz)};
   }};
 }

 const PLAN={adjust_stock:a=>planStock(a.changes),create_product:planCreate,update_product:planUpdate,manage_photos:planPhotos,register_expense:planExpense,register_sale:planSale};

 function read(name,a){
  a=a||{};
  try{
   if(name==='find_products')return find(a.query,a.only_low_stock,a.limit);
   if(name==='get_report')return report(a.days);
   if(name==='list_orders')return listOrders(a.status,a.limit);
   if(name==='calculate')return{expressao:a.expression,resultado:calc(a.expression)};
   if(name==='simulate_discount')return simulate(a);
  }catch(e){return err(String(e&&e.message||e))}
  return err('Ferramenta desconhecida.');
 }


 /* ---------- sugestões locais (regras, sem IA): lista TODOS os produtos do setor, com ou sem estoque ---------- */
 function suggest(){
  const P=prods(),sold=units(areaOrders().filter(x=>PAID.includes(x.status)&&oTs(x)>=Date.now()-60*864e5)),L=[];
  P.forEach(p=>{
   const st=+p.stock||0,n=p.name,id=String(p.id),stk={kind:'stock',pid:id};
   if(st<=0){
    L.push({pr:1,t:'*'+n+'* está sem estoque'+(sold[n]?' e vendeu '+sold[n]+' un. nos últimos 60 dias. Vale repor.':'.'),b:'Repor estoque',a:stk});
    if(p.tag==='Promoção'&&+p.oldPrice>0)L.push({pr:2,t:'*'+n+'* continua marcado como Promoção mesmo sem estoque.',b:'Encerrar promoção',a:{kind:'plan',name:'update_product',input:{product_id:id,price:+p.oldPrice,tag:''}}});
    return;
   }
   if(!canStk(p))L.push({pr:2,t:'*'+n+'* tem '+st+' peça(s) sem divisão por tamanho. Informe quanto tem de cada um.',b:'Dividir estoque',a:stk});
   else if(st<=LOW)L.push({pr:2,t:'*'+n+'* tem só '+st+' em estoque'+(sold[n]?' e vendeu '+sold[n]+' em 60 dias.':'.'),b:'Ajustar estoque',a:stk});
   else if(szOf(p).length>1&&szOf(p).some(s=>stkQ(p,s)<=0))L.push({pr:3,t:'*'+n+'*: sem estoque em '+szOf(p).filter(s=>stkQ(p,s)<=0).join(', ')+'.',b:'Ajustar estoque',a:stk});
   if(!sold[n]&&!(+p.oldPrice>+p.price)&&!/novidade/i.test(p.tag||'')){const np=r2(+p.price*0.85);L.push({pr:4,t:'*'+n+'* sem venda há 60 dias ('+st+' em estoque). Sugestão: 15% off, de '+money(p.price)+' por '+money(np)+'.',b:'Aplicar 15%',a:{kind:'plan',name:'update_product',input:{product_id:id,price:np,tag:'Promoção',old_price:+p.price}}})}
   if(!pimgs(p).length)L.push({pr:5,t:'*'+n+'* está sem foto. Produto sem foto vende menos.',b:'',a:null});
  });
  return L.sort((a,b)=>a.pr-b.pr);
 }

 return{suggest,prods,find,view,report,reportText,simulate,listOrders,read,PLAN,planStock,planUpdate,szOf,stkQ,canStk,pimgs,hasStk,myProd,imp};
}

g.MidilyCore={create,calc,WRITE,EXP_CATS,REC_CATS,PAY,MAXIMG,IMGCAP,LOW,norm,money,parseOpts};
if(typeof module!=='undefined'&&module.exports)module.exports=g.MidilyCore;
})(typeof window!=='undefined'?window:globalThis);
