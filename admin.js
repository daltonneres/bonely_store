/* Painel da loja | Bonely Store
   Carregado antes do app.js. Usa os dados e funções globais do app.js (S, save, money, setStatus...). */
const ADM=(()=>{
const REV=['Pago','Separando','Enviado','Entregue'];
const SC={'Aguardando pagamento':'#d9a441',Pago:'#8fb08a',Separando:'#7fa3c4',Enviado:'#a995c9',Entregue:'#5f9c78',Cancelado:'#d9806b'};
const NAV=[['geral','Visão geral','grid'],['pedidos','Pedidos','bag'],['produtos','Produtos','tag'],['estoque','Estoque','box'],['combos','Combos','layers'],['planilhas','Planilhas','sheet']];
const PA={grid:'<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
bag:'<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/>',
tag:'<path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><path d="M7 7h.01"/>',
box:'<path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7z"/><path d="M3.3 7l8.7 5 8.7-5M12 22V12"/>',
layers:'<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>',
sheet:'<path d="M18 20V10M12 20V4M6 20v-6"/>',out:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
store:'<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>',
plus:'<path d="M12 5v14M5 12h14"/>',x:'<path d="M18 6L6 18M6 6l12 12"/>',menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',
dl:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
chat:'<path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 21l2.1-5.4A8.5 8.5 0 1 1 21 11.5z"/>',
up:'<path d="M23 6l-9.5 9.5-5-5L1 18M17 6h6v6"/>',down:'<path d="M23 18l-9.5-9.5-5 5L1 6M17 18h6v-6"/>',
spark:'<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>'};
const i=n=>`<svg class="a-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PA[n]}</svg>`;
const st={tab:'geral',days:30,q:'',f:'',lim:25,sort:{},nav:false,drawer:null,modal:null,img:null,msg:''};
let Q=[],rz=null;

/* ---------- utilidades ---------- */
const sod=t=>{const d=new Date(t);d.setHours(0,0,0,0);return d.getTime()};
const addD=(t,n)=>{const d=new Date(t);d.setDate(d.getDate()+n);return d.getTime()};
const ptTime=s=>{const m=String(s||'').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\D+(\d{1,2}):(\d{2}))?/);return m?new Date(+m[3],+m[2]-1,+m[1],+(m[4]||12),+(m[5]||0)).getTime():0};
const ot=o=>o.ts||(o.ts=ptTime(o.date));
const fmtD=t=>new Date(t).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
const fmtDT=t=>new Date(t).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'});
const sum=(a,f)=>a.reduce((x,y)=>x+f(y),0);
const num=n=>Number(n).toLocaleString('pt-BR');
const compact=v=>v>=1000?(v/1000).toLocaleString('pt-BR',{maximumFractionDigits:1})+' mil':String(Math.round(v));
const first=n=>String(n||'').trim().split(/\s+/)[0];
const isSale=o=>REV.includes(o.status);
const prod=id=>S.products.find(p=>p.id==id);
const waLink=(ph,t)=>{let d=String(ph||'').replace(/\D/g,'');if(d.length<=11)d='55'+d;return 'https://wa.me/'+d+(t?'?text='+encodeURIComponent(t):'')};
const pill=s=>`<span class="a-pill" style="--c:${SC[s]||'#9a8f7c'}">${esc(s)}</span>`;
const thumb=p=>`<span class="a-th">${p.img?`<img src="${p.img}" alt="">`:esc((p.name||'B')[0])}</span>`;
const niceStep=v=>{const p=Math.pow(10,Math.floor(Math.log10(v))),f=v/p;return(f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*p};
function toast(t){const e=document.createElement('div');e.className='a-toast';e.setAttribute('role','status');e.textContent=t;document.body.appendChild(e);setTimeout(()=>e.remove(),3200)}
const catOf=it=>{if(String(it.key).startsWith('c'))return 'Combos';const p=prod(it.key);return p?(p.type==='avulso'?'Avulsos':(p.gen||'Unissex')):'Outros'};

/* ---------- números do período ---------- */
function stats(n){
 const end=addD(sod(Date.now()),1),start=addD(end,-n),pst=addD(start,-n);
 const inR=(o,a,b)=>{const t=ot(o);return t>=a&&t<b};
 const cur=S.orders.filter(o=>inR(o,start,end)),prev=S.orders.filter(o=>inR(o,pst,start));
 const sales=cur.filter(isSale),ps=prev.filter(isSale);
 const daily=[],pd=[];
 for(let k=0;k<n;k++){
  const a=addD(start,k),b=addD(start,k+1),pa=addD(pst,k),pb=addD(pst,k+1);
  const s=sales.filter(o=>inR(o,a,b)),p=ps.filter(o=>inR(o,pa,pb));
  daily.push({t:a,rev:sum(s,o=>o.subtotal),n:s.length,u:sum(s,o=>sum(o.items,x=>x.qty))});
  pd.push({t:pa,rev:sum(p,o=>o.subtotal),n:p.length});
 }
 const rev=sum(sales,o=>o.subtotal),prevRev=sum(ps,o=>o.subtotal);
 const units=sum(sales,o=>sum(o.items,x=>x.qty)),pUnits=sum(ps,o=>sum(o.items,x=>x.qty));
 const tp={};sales.forEach(o=>o.items.forEach(x=>{const t=tp[x.name]||(tp[x.name]={name:x.name,qty:0,rev:0});t.qty+=x.qty;t.rev+=x.price*x.qty}));
 const wd=Array(7).fill(0);sales.forEach(o=>wd[new Date(ot(o)).getDay()]+=o.subtotal);
 const cats={};sales.forEach(o=>o.items.forEach(x=>{const k=catOf(x);cats[k]=(cats[k]||0)+x.price*x.qty}));
 const fs={};S.orders.forEach(o=>{const e=o.customer.email,t=ot(o);if(!(e in fs)||t<fs[e])fs[e]=t});
 const em=[...new Set(sales.map(o=>o.customer.email))],nw=em.filter(e=>fs[e]>=start).length;
 return{n,cur,sales,daily,pd,rev,prevRev,units,pUnits,tk:sales.length?rev/sales.length:0,ptk:ps.length?prevRev/ps.length:0,pn:ps.length,
  status:STATUS.map(s=>({label:s,val:cur.filter(o=>o.status===s).length,color:SC[s]})).filter(x=>x.val),
  top:Object.values(tp).sort((a,b)=>b.rev-a.rev),wd,cats,newC:nw,retC:em.length-nw,
  recv:sum(cur.filter(o=>o.status==='Aguardando pagamento'),o=>o.total)};
}

/* ---------- gráficos ---------- */
function delta(c,p){if(!p&&!c)return '';if(!p)return `<span class="a-chip up">${i('up')}novo</span>`;const v=(c-p)/p*100;return `<span class="a-chip ${v>=0?'up':'dn'}">${i(v>=0?'up':'down')}${v>=0?'+':''}${v.toFixed(0)}%</span>`}
function spark(v,c){const mx=Math.max(1,...v),n=v.length;return `<svg class="a-sp" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true"><polyline points="${v.map((y,k)=>`${k/(n-1||1)*100},${26-y/mx*24}`).join(' ')}" fill="none" stroke="${c}" stroke-width="1.6" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>`}
function donut(items,big,small){
 const tot=sum(items,x=>x.val);if(!tot)return '<div class="a-empty">Sem vendas neste período.</div>';
 const C=2*Math.PI*46;let off=0;
 const arcs=items.map(x=>{const L=x.val/tot*C,l=Math.max(0,L-(items.length>1?3:0));const s=`<circle cx="60" cy="60" r="46" fill="none" stroke="${x.color}" stroke-width="13" stroke-dasharray="${l} ${C-l}" stroke-dashoffset="${-off}" transform="rotate(-90 60 60)"/>`;off+=L;return s}).join('');
 return `<div class="a-dn"><svg viewBox="0 0 120 120" role="img" aria-label="${esc(small)}: ${big}"><circle cx="60" cy="60" r="46" fill="none" stroke="var(--a-line)" stroke-width="13"/>${arcs}<text x="60" y="62" text-anchor="middle" class="dn-big">${big}</text><text x="60" y="78" text-anchor="middle" class="dn-sm">${esc(small)}</text></svg><ul class="a-lg">${items.map(x=>`<li><i style="background:${x.color}"></i><span>${esc(x.label)}</span><b>${x.fmt||num(x.val)}</b></li>`).join('')}</ul></div>`;
}
function hbars(a,fmt){const mx=Math.max(1,...a.map(x=>x.val));return `<div class="a-hb">${a.map(x=>`<div class="a-hr"><div class="a-hl"><span>${esc(x.label)}</span><b>${fmt(x.val)}</b></div><div class="a-bar"><i style="width:${x.val/mx*100}%;background:${x.color||'var(--a-gold)'}"></i></div>${x.sub?`<small>${x.sub}</small>`:''}</div>`).join('')}</div>`}
function wdBars(a){const L=['dom','seg','ter','qua','qui','sex','sáb'],mx=Math.max(1,...a),t=a.indexOf(Math.max(...a));return `<div class="a-wd">${[1,2,3,4,5,6,0].map(k=>`<div class="a-wc ${k===t&&a[k]>0?'top':''}" title="${L[k]}: ${money(a[k])}"><b>${a[k]?compact(a[k]):''}</b><div class="a-wb"><i style="height:${a[k]/mx*100}%"></i></div><span>${L[k]}</span></div>`).join('')}</div>`}
function box(id,h,fn){Q.push([id,fn]);return `<div class="ch" id="${id}" style="height:${h}px"></div>`}
function sm(p,lo,hi){if(p.length<2)return p.length?`M${p[0][0]},${p[0][1]}`:'';const c=y=>Math.max(lo,Math.min(hi,y));let s=`M${p[0][0]},${p[0][1]}`;for(let k=0;k<p.length-1;k++){const a=p[k-1]||p[k],b=p[k],d=p[k+1],e=p[k+2]||d,t=.18;s+=` C${b[0]+(d[0]-a[0])*t},${c(b[1]+(d[1]-a[1])*t)} ${d[0]-(e[0]-b[0])*t},${c(d[1]-(e[1]-b[1])*t)} ${d[0]},${d[1]}`}return s}
function area(el,d){
 const W=Math.max(280,el.clientWidth),H=el.clientHeight||250,pl=42,pr=8,pt=10,pb=24,iw=W-pl-pr,ih=H-pt-pb,n=d.vals.length;
 const step=niceStep(Math.max(1,...d.vals,...d.prev)/4),max=step*4;
 const X=k=>pl+(n<2?iw/2:k*iw/(n-1)),Y=v=>pt+ih-v/max*ih,base=pt+ih;
 const pts=d.vals.map((v,k)=>[X(k),Y(v)]),pp=d.prev.map((v,k)=>[X(k),Y(v)]);
 let g='';for(let k=0;k<=4;k++){const y=Y(step*k);g+=`<line x1="${pl}" x2="${W-pr}" y1="${y}" y2="${y}" class="gl"/><text x="${pl-8}" y="${y+4}" text-anchor="end" class="ax">${compact(step*k)}</text>`}
 const ev=Math.ceil(n/Math.max(2,Math.floor(iw/64)));
 const xl=d.labels.map((l,k)=>k%ev===0?`<text x="${X(k)}" y="${H-6}" text-anchor="middle" class="ax">${l}</text>`:'').join('');
 const line=sm(pts,pt,base),id='g'+el.id;
 el.innerHTML=`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Faturamento por dia"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9a25f" stop-opacity=".38"/><stop offset="1" stop-color="#c9a25f" stop-opacity="0"/></linearGradient></defs>${g}${xl}<path d="${sm(pp,pt,base)}" class="pv"/><path d="${line} L${X(n-1)},${base} L${X(0)},${base}Z" fill="url(#${id})"/><path d="${line}" class="ln"/><line class="hl" y1="${pt}" y2="${base}" visibility="hidden"/><circle class="hd" r="4.5" visibility="hidden"/></svg><div class="a-tip" hidden></div>`;
 const svg=el.firstChild,tip=el.lastChild,hl=svg.querySelector('.hl'),hd=svg.querySelector('.hd');
 const mv=e=>{const r=svg.getBoundingClientRect(),k=Math.max(0,Math.min(n-1,Math.round((e.clientX-r.left-pl)/iw*(n-1)))),x=X(k);
  hl.setAttribute('x1',x);hl.setAttribute('x2',x);hd.setAttribute('cx',x);hd.setAttribute('cy',Y(d.vals[k]));hl.removeAttribute('visibility');hd.removeAttribute('visibility');
  tip.innerHTML=d.tips[k];tip.hidden=false;tip.style.left=Math.max(0,Math.min(W-150,x-70))+'px'};
 svg.addEventListener('pointermove',mv);svg.addEventListener('pointerdown',mv);
 svg.addEventListener('pointerleave',()=>{tip.hidden=true;hl.setAttribute('visibility','hidden');hd.setAttribute('visibility','hidden')});
}
const draw=()=>Q.forEach(([id,fn])=>{const e=document.getElementById(id);if(e)fn(e)});

/* ---------- visão geral ---------- */
const kpi=(l,v,d,sub,sp)=>`<div class="a-card a-kpi c3"><div class="a-kl">${l}</div><div class="a-kv">${v}</div><div class="a-kf">${d}<span>${sub}</span></div>${sp||''}</div>`;
function queue(){
 const aw=S.orders.filter(o=>o.status==='Aguardando pagamento'),pg=S.orders.filter(o=>o.status==='Pago'),sp=S.orders.filter(o=>o.status==='Separando'),low=S.products.filter(p=>p.stock<=3);
 const row=(t,s,b)=>`<div class="a-task"><div><b>${t}</b><small>${s}</small></div>${b}</div>`;
 const grp=(t,n,rows,go)=>n?`<div class="a-grp"><div class="a-gh"><span>${t}</span><button class="a-link" onclick="ADM.go('pedidos','${go}')">Ver todos (${n})</button></div>${rows}</div>`:'';
 let h=grp('Aguardando pagamento',aw.length,aw.slice(0,3).map(o=>row(`${o.id} · ${esc(first(o.customer.name))}`,money(o.total),`<span class="a-ta"><a class="a-btn sm ghost" target="_blank" rel="noopener" href="${waLink(o.customer.phone,`Olá, ${first(o.customer.name)}! Aqui é a ${OWNER}, da Bonely Store. Seu pedido ${o.id} (${money(o.total)}) está aguardando o pagamento. Posso te ajudar a finalizar?`)}">${i('chat')}Cobrar</a><button class="a-btn sm" onclick="ADM.status('${o.id}','Pago')">Recebi</button></span>`)).join(''),'Aguardando pagamento')
 +grp('Pagos, prontos para separar',pg.length,pg.slice(0,3).map(o=>row(`${o.id} · ${esc(first(o.customer.name))}`,`${sum(o.items,x=>x.qty)} peça(s) · ${money(o.total)}`,`<button class="a-btn sm" onclick="ADM.status('${o.id}','Separando')">Separar</button>`)).join(''),'Pago')
 +grp('Separados, falta enviar',sp.length,sp.slice(0,3).map(o=>row(`${o.id} · ${esc(first(o.customer.name))}`,esc(o.ship.name),`<button class="a-btn sm" onclick="ADM.open('${o.id}')">Rastreio</button>`)).join(''),'Separando');
 if(low.length)h+=`<div class="a-grp"><div class="a-gh"><span>Estoque baixo</span><button class="a-link" onclick="ADM.go('estoque')">Ver estoque</button></div>${low.slice(0,3).map(p=>row(esc(p.name),p.stock?`Restam ${p.stock}`:'Esgotado',`<button class="a-btn sm ghost" onclick="ADM.modal('mv',${p.id})">Repor</button>`)).join('')}</div>`;
 return `<div class="a-card c4"><div class="a-ct"><h3>Para fazer hoje</h3></div>${h||`<div class="a-empty">Tudo em dia, ${esc(OWNER)}. Nenhum pedido esperando por você.</div>`}</div>`;
}
function pGeral(){
 const n=st.days,s=stats(n);
 if(!S.orders.length)return `<div class="a-grid"><div class="a-card c8 a-zero"><h3>O painel ganha vida com o primeiro pedido</h3><p class="a-mut">Quando a primeira venda entrar, aqui aparecem faturamento, pedidos, produtos mais vendidos e muito mais. Quer ver como fica cheio?</p><button class="a-btn" onclick="ADM.seed()">${i('spark')}Ver com dados de exemplo</button></div>${queue()}</div>`;
 const lowP=S.products.slice().sort((a,b)=>a.stock-b.stock).slice(0,5);
 const tips=s.daily.map((d,k)=>`<b>${fmtD(d.t)}</b>${money(d.rev)} · ${d.n} pedido${d.n===1?'':'s'}<small>Antes: ${money(s.pd[k].rev)}</small>`);
 return `<div class="a-grid">
 <div class="a-card a-hero c8"><div class="a-ht"><div><div class="a-kl">Faturamento nos últimos ${n} dias</div><div class="a-big">${money(s.rev)}</div><div class="a-kf">${delta(s.rev,s.prevRev)}<span>vs. ${n} dias antes · sem o frete</span></div></div><div class="a-key"><span><i class="s1"></i>Agora</span><span><i class="s2"></i>Antes</span></div></div>
  ${box('c-rev',250,el=>area(el,{labels:s.daily.map(d=>fmtD(d.t)),vals:s.daily.map(d=>d.rev),prev:s.pd.map(d=>d.rev),tips}))}</div>
 ${queue()}
 ${kpi('Pedidos pagos',num(s.sales.length),delta(s.sales.length,s.pn),s.recv?`${money(s.recv)} a receber`:'nenhum a receber',spark(s.daily.map(d=>d.n),'#c9a25f'))}
 ${kpi('Ticket médio',money(s.tk),delta(s.tk,s.ptk),'por pedido',spark(s.daily.map(d=>d.n?d.rev/d.n:0),'#c98a86'))}
 ${kpi('Peças vendidas',num(s.units),delta(s.units,s.pUnits),`em ${n} dias`,spark(s.daily.map(d=>d.u),'#8fa58a'))}
 ${kpi('Clientes novas',num(s.newC),'',`${s.retC} já eram clientes`,'')}
 <div class="a-card c4"><div class="a-ct"><h3>Mais vendidos</h3><small>por faturamento</small></div>${s.top.length?hbars(s.top.slice(0,5).map(t=>({label:t.name,val:t.rev,sub:`${t.qty} un.`})),money):'<div class="a-empty">Sem vendas neste período.</div>'}</div>
 <div class="a-card c4"><div class="a-ct"><h3>Pedidos por status</h3></div>${donut(s.status,s.cur.length,'pedidos')}</div>
 <div class="a-card c4"><div class="a-ct"><h3>O que mais sai</h3><small>faturamento por categoria</small></div>${donut(Object.entries(s.cats).map(([k,v],x)=>({label:k,val:v,color:['#c9a25f','#c98a86','#8fa58a','#7f9bb3','#a995c9'][x%5],fmt:money(v)})),money(s.rev).replace(/,\d+$/,''),'total')}</div>
 <div class="a-card c6"><div class="a-ct"><h3>Dias da semana</h3><small>quando a loja mais vende</small></div>${wdBars(s.wd)}</div>
 <div class="a-card c6"><div class="a-ct"><h3>Estoque mais apertado</h3><button class="a-link" onclick="ADM.go('estoque')">Ver tudo</button></div>${hbars(lowP.map(p=>({label:p.name,val:p.stock,color:p.stock<=0?'var(--a-err)':p.stock<=3?'#d9a441':'#8fb08a'})),v=>v+' un.')}</div>
 </div>`;
}

/* ---------- listas (tabelas) ---------- */
const TH=(t,k,l)=>{const s=st.sort[t]||{};return `<th><button class="a-sh" onclick="ADM.sort('${t}','${k}')">${l}${s.k===k?(s.d>0?' ▲':' ▼'):''}</button></th>`};
function srt(r,t,v,def){const s=st.sort[t]||def;return r.sort((a,b)=>{const x=v[s.k](a),y=v[s.k](b);return(x>y?1:x<y?-1:0)*s.d})}
const more=n=>n>st.lim?`<button class="a-btn ghost" onclick="ADM.more()">Mostrar mais (${n-st.lim})</button>`:'';
function lPed(){
 let r=S.orders.slice();if(st.f)r=r.filter(o=>o.status===st.f);
 if(st.q){const k=st.q.toLowerCase();r=r.filter(o=>(o.id+o.customer.name+o.customer.email).toLowerCase().includes(k))}
 srt(r,'ped',{ts:ot,id:o=>o.id,name:o=>o.customer.name.toLowerCase(),total:o=>o.total,status:o=>STATUS.indexOf(o.status)},{k:'ts',d:-1});
 if(!r.length)return '<div class="a-empty">Nenhum pedido encontrado.</div>';
 return `<div class="a-scroll"><table class="a-t a-ped"><tr>${TH('ped','id','Pedido')}${TH('ped','ts','Data')}${TH('ped','name','Cliente')}<th>Peças</th>${TH('ped','total','Total')}${TH('ped','status','Status')}</tr>${r.slice(0,st.lim).map(o=>`<tr tabindex="0" onclick="ADM.open('${o.id}')" onkeydown="if(event.key==='Enter')ADM.open('${o.id}')"><td><b>${o.id}</b></td><td>${fmtDT(ot(o))}</td><td>${esc(o.customer.name)}</td><td>${sum(o.items,x=>x.qty)}</td><td>${money(o.total)}</td><td>${pill(o.status)}</td></tr>`).join('')}</table></div>${more(r.length)}`;
}
const sold=()=>{const m={};S.orders.filter(isSale).forEach(o=>o.items.forEach(x=>{m[x.key]=(m[x.key]||0)+x.qty}));return m};
const lvl=p=>p.stock<=0?'var(--a-err)':p.stock<=3?'#d9a441':'#8fb08a';
function lProd(){
 const sd=sold();let r=S.products.slice();
 if(st.f==='low')r=r.filter(p=>p.stock<=3);else if(st.f)r=r.filter(p=>p.type===st.f);
 if(st.q){const k=st.q.toLowerCase();r=r.filter(p=>(p.name+(p.coll||'')).toLowerCase().includes(k))}
 srt(r,'prod',{name:p=>p.name.toLowerCase(),price:p=>p.price,sold:p=>sd[p.id]||0,stock:p=>p.stock},{k:'name',d:1});
 if(!r.length)return '<div class="a-empty">Nenhum produto encontrado.</div>';
 return `<div class="a-scroll"><table class="a-t a-prd"><tr>${TH('prod','name','Produto')}${TH('prod','price','Preço')}${TH('prod','sold','Vendidos')}${TH('prod','stock','Estoque')}</tr>${r.slice(0,st.lim).map(p=>`<tr tabindex="0" onclick="ADM.modal('prod',${p.id})" onkeydown="if(event.key==='Enter')ADM.modal('prod',${p.id})"><td><div class="a-pn">${thumb(p)}<div><b>${esc(p.name)}</b><small>${p.type==='avulso'?'Avulso':esc(p.gen||'Unissex')}${p.coll?' · '+esc(p.coll):''}</small></div></div></td><td>${money(p.price)}</td><td>${sd[p.id]||0}</td><td><div class="a-stk"><b>${p.stock}</b><div class="a-bar"><i style="width:${Math.min(100,p.stock/12*100)}%;background:${lvl(p)}"></i></div></div></td></tr>`).join('')}</table></div>${more(r.length)}`;
}
function lMov(){
 if(!S.moves.length)return '<div class="a-empty">Nenhuma movimentação ainda.</div>';
 return `<div class="a-scroll"><table class="a-t"><tr><th>Data</th><th>Produto</th><th>Qtd</th><th>Obs.</th></tr>${S.moves.slice(0,st.lim).map(m=>`<tr><td>${fmtDT(m.ts||ptTime(m.date))}</td><td>${esc(m.name)}</td><td class="${m.type==='entrada'?'a-pos':'a-neg'}">${m.type==='entrada'?'+':'−'}${m.qty}</td><td>${esc(m.note)}</td></tr>`).join('')}</table></div>${more(S.moves.length)}`;
}
const list=()=>{const e=document.getElementById('a-list');if(e)e.innerHTML={pedidos:lPed,produtos:lProd,estoque:lMov}[st.tab]()};
const tools=(chips,ph)=>`<div class="a-tools"><div class="a-find">${i('search')}<input value="${esc(st.q)}" placeholder="${ph}" aria-label="${ph}" oninput="ADM.find(this.value)"></div><div class="a-chips">${chips.map(([k,l,c])=>`<button class="${st.f===k?'on':''}" onclick="ADM.fil('${k}')">${l}${c!=null?` <em>${c}</em>`:''}</button>`).join('')}</div></div>`;
const pPed=()=>`<div class="a-card">${tools([['','Todos',S.orders.length]].concat(STATUS.map(s=>[s,s,S.orders.filter(o=>o.status===s).length])),'Buscar por pedido, nome ou e-mail')}<div id="a-list"></div></div>`;
const pProd=()=>`<div class="a-card">${tools([['','Todos',null],['roupa','Roupas',null],['avulso','Avulsos',null],['low','Estoque baixo',S.products.filter(p=>p.stock<=3).length]],'Buscar produto ou coleção')}<div id="a-list"></div></div>`;
function pEst(){
 const pc=sum(S.products,p=>p.stock),val=sum(S.products,p=>p.stock*p.price),low=S.products.filter(p=>p.stock>0&&p.stock<=3).length,out=S.products.filter(p=>p.stock<=0).length;
 return `<div class="a-grid">${kpi('Peças em estoque',num(pc),'',`${S.products.length} produtos`,'')}${kpi('Valor em estoque',money(val),'','a preço de venda','')}${kpi('Estoque baixo',low,'','3 peças ou menos','')}${kpi('Esgotados',out,'','sem nenhuma peça','')}
 <div class="a-card c6"><div class="a-ct"><h3>Níveis por produto</h3><small>do menor para o maior</small></div>${S.products.slice().sort((a,b)=>a.stock-b.stock).map(p=>`<div class="a-lv">${thumb(p)}<div class="a-lvb"><div class="a-hl"><span>${esc(p.name)}</span><b>${p.stock}</b></div><div class="a-bar"><i style="width:${Math.min(100,p.stock/12*100)}%;background:${lvl(p)}"></i></div></div><button class="a-btn sm ghost" onclick="ADM.modal('mv',${p.id})">Movimentar</button></div>`).join('')||'<div class="a-empty">Nenhum produto.</div>'}</div>
 <div class="a-card c6"><div class="a-ct"><h3>Histórico</h3></div><div id="a-list"></div></div></div>`;
}
function pCmb(){
 if(!S.combos.length)return `<div class="a-card a-zero"><h3>Nenhum combo ainda</h3><p class="a-mut">Combine 2 ou mais produtos com um preço especial para aumentar o ticket médio.</p><button class="a-btn" onclick="ADM.modal('cmb')">${i('plus')}Criar combo</button></div>`;
 return `<div class="a-grid">${S.combos.map(c=>{const ps=c.items.map(prod).filter(Boolean),full=sum(ps,p=>p.price),pc=full?Math.round((1-c.price/full)*100):0;
  return `<div class="a-card c4"><div class="a-ct"><h3>${esc(c.name)}</h3>${pc>0?`<span class="a-chip up">${pc}% off</span>`:''}</div><div class="a-cth">${ps.map(thumb).join('')}</div><p class="a-mut">${ps.map(p=>esc(p.name)).join(' + ')}</p><div class="a-kv">${money(c.price)}</div><small class="a-mut">Separado: ${money(full)} · ${stockOf('c'+c.id)} disponíveis</small><div class="a-ac"><button class="a-btn ghost sm" onclick="ADM.modal('cmb',${c.id})">Editar</button></div></div>`}).join('')}</div>`;
}

/* ---------- planilhas ---------- */
function DS(){
 const os=S.orders.slice().sort((a,b)=>ot(a)-ot(b)),cu={};
 os.forEach(o=>{const c=o.customer,k=c.email||c.phone,r=cu[k]||(cu[k]={'Cliente':c.name,'E-mail':c.email,'WhatsApp':c.phone,'Pedidos':0,'Total gasto':0,'Último pedido':0});r['Pedidos']++;if(isSale(o))r['Total gasto']+=o.subtotal;r['Último pedido']=ot(o)});
 return{Pedidos:os.map(o=>({'Pedido':o.id,'Data':new Date(ot(o)),'Cliente':o.customer.name,'E-mail':o.customer.email,'WhatsApp':o.customer.phone,'CEP':o.customer.cep,'Endereço':o.customer.addr,'Peças':sum(o.items,x=>x.qty),'Subtotal':o.subtotal,'Frete':o.ship.price,'Total':o.total,'Pagamento':o.pay,'Status':o.status,'Rastreio':o.tracking})),
 Itens:os.flatMap(o=>o.items.map(x=>({'Pedido':o.id,'Data':new Date(ot(o)),'Produto':x.name,'Tamanho':x.size,'Qtd':x.qty,'Preço unit.':x.price,'Total':x.price*x.qty,'Status':o.status}))),
 Produtos:S.products.map(p=>({'Produto':p.name,'Tipo':p.type,'Público':p.gen||'','Coleção':p.coll||'','Tamanhos':p.sizes,'Preço':p.price,'Estoque':p.stock,'Valor em estoque':p.price*p.stock})),
 'Movimentações':S.moves.map(m=>({'Data':new Date(m.ts||ptTime(m.date)),'Produto':m.name,'Movimento':m.type,'Qtd':m.qty,'Obs.':m.note})),
 Clientes:Object.values(cu).map(r=>({...r,'Último pedido':new Date(r['Último pedido'])}))};
}
const slug=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function csv(n){
 const r=DS()[n];if(!r.length)return toast('Ainda não há dados em '+n+'.');
 const h=Object.keys(r[0]),f=v=>{v=v instanceof Date?v.toLocaleString('pt-BR'):typeof v==='number'?String(v).replace('.',','):String(v??'');return /[;"\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+[h].concat(r.map(x=>h.map(k=>x[k]))).map(l=>l.map(f).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
 a.download='bonely-'+slug(n)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1e3);
}
const loadX=()=>window.XLSX?Promise.resolve():new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';s.onload=ok;s.onerror=no;document.head.appendChild(s)});
async function xlsx(){
 toast('Preparando a planilha…');
 try{await loadX()}catch(e){return toast('Não consegui gerar o .xlsx agora. Use os downloads em CSV, que abrem no Excel.')}
 const ds=DS(),wb=XLSX.utils.book_new(),MONEY=['Subtotal','Frete','Total','Preço unit.','Preço','Valor em estoque','Total gasto'];
 Object.entries(ds).forEach(([n,r])=>{
  const ws=r.length?XLSX.utils.json_to_sheet(r,{cellDates:true}):XLSX.utils.aoa_to_sheet([['Sem dados ainda']]);
  if(r.length){const h=Object.keys(r[0]);
   ws['!cols']=h.map(k=>({wch:Math.min(40,Math.max(k.length,...r.slice(0,200).map(x=>String(x[k] instanceof Date?'dd/mm/aaaa hh:mm':x[k]??'').length))+2)}));
   ws['!autofilter']={ref:ws['!ref']};
   h.forEach((k,c)=>r.forEach((x,y)=>{const cell=ws[XLSX.utils.encode_cell({r:y+1,c})];if(!cell)return;if(cell.t==='d')cell.z='dd/mm/yyyy hh:mm';else if(MONEY.includes(k))cell.z='"R$" #,##0.00'}));}
  XLSX.utils.book_append_sheet(wb,ws,n);
 });
 XLSX.writeFile(wb,'bonely-dados-'+new Date().toISOString().slice(0,10)+'.xlsx',{cellDates:true});
 toast('Planilha baixada.');
}
function pPlan(){
 const s=stats(st.days),tot=s.rev||1;
 return `<div class="a-grid"><div class="a-card c8"><div class="a-ct"><h3>Vendas por produto</h3><small>últimos ${st.days} dias</small></div>${s.top.length?`<div class="a-scroll"><table class="a-t"><tr><th>Produto</th><th>Qtd</th><th>Faturamento</th><th>Participação</th></tr>${s.top.map(t=>`<tr><td><b>${esc(t.name)}</b></td><td>${t.qty}</td><td>${money(t.rev)}</td><td><div class="a-stk"><b>${(t.rev/tot*100).toFixed(0)}%</b><div class="a-bar"><i style="width:${t.rev/tot*100}%;background:var(--a-gold)"></i></div></div></td></tr>`).join('')}<tr class="a-tot"><td>Total</td><td>${s.units}</td><td>${money(s.rev)}</td><td></td></tr></table></div>`:'<div class="a-empty">Sem vendas neste período.</div>'}</div>
 <div class="a-card c4"><div class="a-ct"><h3>Baixar planilhas</h3></div><p class="a-mut">Leva todos os dados da loja, não só o período escolhido.</p><button class="a-btn" onclick="ADM.xlsx()">${i('dl')}Planilha completa (.xlsx)</button><p class="a-mut" style="margin:18px 0 8px">Ou uma tabela por vez, em CSV:</p><div class="a-chips">${['Pedidos','Itens','Produtos','Movimentações','Clientes'].map(n=>`<button onclick="ADM.csv('${n}')">${n}</button>`).join('')}</div></div></div>`;
}

/* ---------- painel lateral e janelas ---------- */
const M=(t,b)=>`<div class="a-scrim" onclick="ADM.close()"></div><div class="a-modal" role="dialog" aria-modal="true" aria-label="${t}"><div class="a-mbx"><div class="a-dh"><h2>${t}</h2><button class="a-ibtn" onclick="ADM.close()" aria-label="Fechar">${i('x')}</button></div>${b}</div></div>`;
const F=(l,id,v,x='')=>`<div><label for="${id}">${l}</label><input id="${id}" value="${esc(v??'')}" ${x}></div>`;
function drawer(){
 const o=S.orders.find(x=>x.id===st.drawer);if(!o)return '';const c=o.customer;
 return `<div class="a-scrim" onclick="ADM.close()"></div><aside class="a-drawer" role="dialog" aria-modal="true" aria-label="Pedido ${o.id}"><div class="a-dh"><div><h2>${o.id}</h2><small class="a-mut">${fmtDT(ot(o))}</small></div><button class="a-ibtn" onclick="ADM.close()" aria-label="Fechar">${i('x')}</button></div>
 <div style="margin:10px 0 14px">${pill(o.status)}</div>${steps(o)}
 <h3>Cliente</h3><p><b>${esc(c.name)}</b><br><span class="a-mut">${esc(c.phone)} · ${esc(c.email)}<br>${esc(c.addr)} · CEP ${esc(c.cep||'')}</span></p>
 <a class="a-btn ghost sm" target="_blank" rel="noopener" href="${waLink(c.phone,`Olá, ${first(c.name)}! Aqui é a ${OWNER}, da Bonely Store, sobre o seu pedido ${o.id}.`)}">${i('chat')}Chamar no WhatsApp</a>
 <h3>Itens</h3>${o.items.map(x=>`<div class="a-ln"><span>${x.qty}x ${esc(x.name)}${x.size?' ('+esc(x.size)+')':''}</span><span>${money(x.price*x.qty)}</span></div>`).join('')}<div class="a-ln"><span>Frete ${esc(o.ship.name)}</span><span>${money(o.ship.price)}</span></div><div class="a-ln a-tt"><span>Total · ${esc(o.pay||'a combinar')}</span><span>${money(o.total)}</span></div>
 <h3>Atualizar pedido</h3><label for="a-st">Status</label><select id="a-st" onchange="ADM.status('${o.id}',this.value)">${STATUS.map(s=>`<option ${s===o.status?'selected':''}>${s}</option>`).join('')}</select>
 <label for="a-trk">Código de rastreio</label><div class="a-row"><input id="a-trk" value="${esc(o.tracking)}" placeholder="AA123456789BR"><button class="a-btn" onclick="ADM.track('${o.id}')">Salvar</button></div>
 ${c.phone?`<a class="a-btn sm" style="margin-top:12px" target="_blank" rel="noopener" href="${waLink(c.phone,custMsg(o))}">${i('chat')}Avisar cliente: ${esc(o.status.toLowerCase())}</a><p class="a-mut"><small>Abre o WhatsApp com a mensagem pronta, com o número do pedido${o.status==='Enviado'&&o.tracking?' e o passo a passo para rastrear (site da loja e Correios)':' e como acompanhar pelo site'}.</small></p>`:''}</aside>`;
}
function mProd(){
 const p=st.modal.id?prod(st.modal.id):{},e=!!p.id;
 return M(e?'Editar produto':'Novo produto',`<div class="a-fg">${F('Nome','pf-n',p.name)}${F('Preço (R$)','pf-p',p.price,'type="number" step="0.01" min="0"')}
 <div><label for="pf-t">Tipo</label><select id="pf-t"><option value="roupa" ${p.type!=='avulso'?'selected':''}>Roupa</option><option value="avulso" ${p.type==='avulso'?'selected':''}>Avulso</option></select></div>
 <div><label for="pf-g">Público</label><select id="pf-g">${['Feminino','Masculino','Unissex'].map(g=>`<option ${p.gen===g?'selected':''}>${g}</option>`).join('')}</select></div>
 ${F('Coleção','pf-c',p.coll,'list="pf-cl"')}<datalist id="pf-cl">${S.colls.map(c=>`<option value="${esc(c)}">`).join('')}</datalist>${F('Tamanhos (separe por vírgula)','pf-s',p.sizes,'placeholder="P,M,G"')}${F('Estoque','pf-q',p.stock,'type="number" min="0"')}
 <div><label for="pf-i">Foto</label><input id="pf-i" type="file" accept="image/*" onchange="ADM.pick(this)"><small id="pf-ok" class="a-mut">${p.img?'Foto atual mantida.':''}</small></div></div>
 <p class="a-err" id="pf-err" role="alert"></p><div class="a-ac">${e?`<button class="a-btn ghost danger" onclick="ADM.delProd(${p.id})">Excluir</button>`:''}<button class="a-btn" onclick="ADM.saveProd(${e?p.id:0})">Salvar produto</button></div>`);
}
const mMv=()=>M('Registrar movimento',`<div class="a-fg"><div><label for="mv-p">Produto</label><select id="mv-p">${S.products.map(p=>`<option value="${p.id}" ${p.id==st.modal.id?'selected':''}>${esc(p.name)} (${p.stock})</option>`).join('')}</select></div><div><label for="mv-t">Movimento</label><select id="mv-t"><option value="entrada">Entrada (chegou peça)</option><option value="saida">Saída (venda fora do site, perda)</option></select></div>${F('Quantidade','mv-q','','type="number" min="1"')}${F('Observação','mv-n','')}</div><p class="a-err" id="pf-err" role="alert"></p><div class="a-ac"><button class="a-btn" onclick="ADM.saveMv()">Registrar</button></div>`);
function mCmb(){
 const c=st.modal.id?S.combos.find(x=>x.id==st.modal.id):{items:[]},e=!!c.id;
 return M(e?'Editar combo':'Novo combo',`<div class="a-fg">${F('Nome','cb-n',c.name)}${F('Preço do combo (R$)','cb-p',c.price,'type="number" step="0.01" min="0"')}</div><label>Produtos (escolha 2 ou mais)</label><div class="a-pick">${S.products.map(p=>`<label class="a-ck"><input class="cb" type="checkbox" value="${p.id}" ${c.items.includes(p.id)?'checked':''} onchange="ADM.cbSum()">${thumb(p)}<span>${esc(p.name)}<small>${money(p.price)}</small></span></label>`).join('')}</div><p class="a-mut" id="cb-sum"></p><p class="a-err" id="pf-err" role="alert"></p><div class="a-ac">${e?`<button class="a-btn ghost danger" onclick="ADM.delCmb(${c.id})">Excluir</button>`:''}<button class="a-btn" onclick="ADM.saveCmb(${e?c.id:0})">Salvar combo</button></div>`);
}

/* ---------- estrutura da página ---------- */
const greet=()=>{const h=new Date().getHours();return(h<12?'Bom dia':h<18?'Boa tarde':'Boa noite')+', '+OWNER};
function summary(){
 const d=new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'}),a=S.orders.filter(o=>o.status==='Aguardando pagamento').length,b=S.orders.filter(o=>o.status==='Pago').length;
 const t=[b?`${b} pedido${b>1?'s pagos esperam':' pago espera'} separação`:'',a?`${a} aguardando pagamento`:''].filter(Boolean).join(' e ');
 return d[0].toUpperCase()+d.slice(1)+'. '+(t||'Nenhum pedido pendente agora.');
}
const seg=()=>`<div class="a-seg" role="group" aria-label="Período">${[7,30,90].map(n=>`<button class="${st.days===n?'on':''}" aria-pressed="${st.days===n}" onclick="ADM.days(${n})">${n} dias</button>`).join('')}</div>`;
function top(){
 const t=st.tab,act={geral:seg(),planilhas:seg(),produtos:`<button class="a-btn" onclick="ADM.modal('prod')">${i('plus')}Novo produto</button>`,estoque:`<button class="a-btn" onclick="ADM.modal('mv')">${i('plus')}Registrar movimento</button>`,combos:`<button class="a-btn" onclick="ADM.modal('cmb')">${i('plus')}Novo combo</button>`,pedidos:`<button class="a-btn ghost" onclick="ADM.csv('Pedidos')">${i('dl')}Baixar planilha</button>`}[t];
 const sub=t==='geral'?summary():{pedidos:`${S.orders.length} pedidos no total`,produtos:`${S.products.length} produtos cadastrados`,estoque:'Entradas, saídas e o que precisa repor.',combos:'Kits com preço especial.',planilhas:'Resumo de vendas e downloads para o Excel.'}[t];
 return `<div class="a-top"><div><h1>${t==='geral'?greet():NAV.find(n=>n[0]===t)[1]}</h1><p class="a-mut">${sub}</p></div><div class="a-act">${act}</div></div>`;
}
function shell(){
 const bd={pedidos:S.orders.filter(o=>o.status==='Pago'||o.status==='Separando').length,estoque:S.products.filter(p=>p.stock<=3).length};
 const demo=S.orders.some(o=>o.demo)?`<div class="a-demo">${i('spark')}<span>Você está vendo dados de exemplo.</span><button class="a-link" onclick="ADM.unseed()">Remover exemplos</button></div>`:'';
 return `<div class="adm"><aside class="a-side ${st.nav?'open':''}" aria-label="Menu do painel"><img class="a-logo" src="${LOGO}" alt="Bonely Store"><nav>${NAV.map(([k,l,ic])=>`<button class="a-nav ${st.tab===k?'on':''}" onclick="ADM.go('${k}')" ${st.tab===k?'aria-current="page"':''}>${i(ic)}<span>${l}</span>${bd[k]?`<em>${bd[k]}</em>`:''}</button>`).join('')}</nav>
 <div class="a-sf"><div class="a-me"><span class="a-av">${esc(OWNER[0])}</span><div><b>${esc(OWNER)}</b><small>Painel da loja</small></div></div><button class="a-nav" onclick="ADM.exit()">${i('store')}<span>Ver a loja</span></button><button class="a-nav" onclick="ADM.logout()">${i('out')}<span>Sair do painel</span></button></div></aside>
 <div class="a-scr ${st.nav?'show':''}" onclick="ADM.nav(false)"></div>
 <div class="a-main"><div class="a-mbar"><button class="a-ibtn" onclick="ADM.nav(true)" aria-label="Abrir menu">${i('menu')}</button><img class="a-mlogo" src="${LOGO}" alt="Bonely Store"><span></span></div>${demo}${top()}<div class="a-page">${({geral:pGeral,pedidos:pPed,produtos:pProd,estoque:pEst,combos:pCmb,planilhas:pPlan})[st.tab]()}</div></div>
 ${st.drawer?drawer():''}${st.modal?({prod:mProd,mv:mMv,cmb:mCmb})[st.modal.t]():''}</div>`;
}
const login=()=>`<div class="a-login"><form class="a-lc" onsubmit="ADM.enter(event)"><img src="${LOGO}" alt="Bonely Store"><h1>Olá, ${esc(OWNER)}</h1><p class="a-mut">Digite o PIN para abrir o painel da loja.</p><label for="pin">PIN</label><input id="pin" type="password" inputmode="numeric" autocomplete="current-password"><button class="a-btn" type="submit">Entrar</button><p class="a-err" role="alert">${esc(st.msg)}</p><button type="button" class="a-link" onclick="ADM.exit()">Voltar para a loja</button><small class="a-mut">Prévia: o PIN é 1234</small></form></div>`;
function render(){
 const y=scrollY;Q=[];
 if(!adminOk){$('#app').innerHTML=login();document.body.style.overflow='';setTimeout(()=>{const e=$('#pin');e&&e.focus()},0);return}
 $('#app').innerHTML=shell();
 document.body.style.overflow=(st.drawer||st.modal||st.nav)?'hidden':'';
 draw();list();scrollTo(0,y);
 if(!rz){rz=1;let t;addEventListener('resize',()=>{clearTimeout(t);t=setTimeout(()=>{if(view==='admin'&&adminOk)draw()},150)})}
}

/* ---------- ações ---------- */
function seed(){
 if(!S.products.length)return toast('Cadastre alguns produtos primeiro.');
 let r=7;const R=()=>(r=r*16807%2147483647)/2147483647;
 const C=[['Marina Alves','marina.alves@email.com','21 99871-2210','Rua das Acácias, 120, Niterói - RJ','24020-001'],['Camila Rocha','camila.rocha@email.com','21 98812-4471','Av. Atlântica, 800, Rio de Janeiro - RJ','22010-000'],['Juliana Prado','ju.prado@email.com','11 97766-5544','Rua Augusta, 455, São Paulo - SP','01305-000'],['Renata Lima','renata.lima@email.com','31 99655-3321','Rua da Bahia, 90, Belo Horizonte - MG','30160-010'],['Bruno Carvalho','bruno.carvalho@email.com','21 99123-0098','Rua Voluntários, 33, Petrópolis - RJ','25620-000'],['Patrícia Neves','pat.neves@email.com','24 98877-1020','Rua do Ouro, 18, Volta Redonda - RJ','27255-000'],['Larissa Duarte','lari.duarte@email.com','41 99811-7766','Rua XV de Novembro, 210, Curitiba - PR','80020-310'],['Thiago Moreira','thiago.m@email.com','21 97444-8123','Rua Siqueira Campos, 77, Rio de Janeiro - RJ','22031-070']];
 const out=[];
 for(let d=60;d>=0;d--){
  const n=Math.floor(R()*(1.4+(60-d)/28))+(R()<.45?1:0);
  for(let k=0;k<n;k++){
   const c=C[R()*C.length|0],items=[];
   for(let j=0,m=1+(R()<.4?1:0);j<m;j++){const p=S.products[R()*S.products.length|0],sz=p.sizes.split(',').map(x=>x.trim());items.push({key:p.id,name:p.name,price:p.price,qty:R()<.18?2:1,size:sz[R()*sz.length|0]})}
   const sub=sum(items,x=>x.price*x.qty),sh={name:R()<.6?'Correios PAC':'Correios SEDEX',price:+(18+R()*20).toFixed(2),days:5};
   let ts=addD(sod(Date.now()),-d)+(9+(R()*11|0))*36e5;if(ts>Date.now())ts=Date.now()-36e5;
   const x=R(),s=d>12?(x<.06?'Cancelado':'Entregue'):d>5?(x<.3?'Enviado':'Entregue'):d>2?(x<.35?'Pago':x<.7?'Separando':'Enviado'):(x<.5?'Aguardando pagamento':'Pago');
   out.push({id:'BN'+(++S.seq),date:new Date(ts).toLocaleString('pt-BR'),ts,customer:{name:c[0],email:c[1],phone:c[2],addr:c[3],cep:c[4]},items,subtotal:sub,ship:sh,total:sub+sh.price,pay:R()<.55?'Pix':R()<.8?'Cartão de crédito':'Cartão de débito',status:s,tracking:s==='Enviado'||s==='Entregue'?'AA'+(100000000+R()*8e8|0)+'BR':'',stockDone:true,demo:true});
  }
 }
 S.orders=S.orders.concat(out).sort((a,b)=>ot(b)-ot(a));save();render();toast('Dados de exemplo carregados.');
}
const close=()=>{st.drawer=null;st.modal=null;st.img=null;render()};
return{render,seed,close,csv,xlsx,
 enter(e){e.preventDefault();if($('#pin').value==='1234'){adminOk=true;st.msg='';render()}else{st.msg='PIN incorreto. Tente de novo.';render()}},
 logout(){adminOk=false;st.drawer=st.modal=null;st.nav=false;render()},
 exit(){st.nav=false;view='loja';document.body.style.overflow='';window.render();scrollTo(0,0)},
 go(t,f){st.tab=t;st.q='';st.f=f||'';st.lim=25;st.nav=false;st.drawer=st.modal=null;render();scrollTo(0,0)},
 nav(v){st.nav=v;render()},days(n){st.days=n;render()},
 find(v){st.q=v;st.lim=25;list()},fil(k){st.f=k;st.lim=25;render()},more(){st.lim+=25;list()},
 sort(t,k){const s=st.sort[t];st.sort[t]={k,d:s&&s.k===k?-s.d:(k==='name'||k==='id'?1:-1)};list()},
 open(id){st.drawer=id;render()},modal(t,id){st.modal={t,id};st.img=null;render()},
 status(id,v){setStatus(id,v);toast('Status: '+v)},
 track(id){const o=S.orders.find(x=>x.id===id);o.tracking=$('#a-trk').value.trim();if(o.tracking&&o.status!=='Entregue')o.status='Enviado';save();render();toast('Rastreio salvo.')},
 pick(el){if(el.files[0])readImg(el.files[0],d=>{st.img=d;$('#pf-ok').textContent='Foto carregada.'})},
 saveProd(id){
  const g=k=>$('#'+k).value.trim(),n=g('pf-n'),pr=parseFloat(g('pf-p')),q=parseInt(g('pf-q'))||0,err=t=>{$('#pf-err').textContent=t};
  if(!n||isNaN(pr)||pr<0)return err('Informe o nome e o preço do produto.');
  const t=g('pf-t'),d={name:n,price:pr,type:t,gen:t==='roupa'?g('pf-g'):'',coll:g('pf-c'),sizes:g('pf-s')||'Único'},mv=(p,ty,qt,note)=>S.moves.unshift({date:new Date().toLocaleString('pt-BR'),ts:Date.now(),name:p.name,type:ty,qty:qt,note});
  if(id){const p=prod(id),df=q-p.stock;Object.assign(p,d);if(st.img)p.img=st.img;if(df){mv(p,df>0?'entrada':'saida',Math.abs(df),'Ajuste no cadastro');p.stock=q}}
  else{const p={id:Date.now(),...d,stock:q,img:st.img||''};S.products.push(p);if(q>0)mv(p,'entrada',q,'Cadastro inicial')}
  if(d.coll&&!S.colls.includes(d.coll))S.colls.push(d.coll);
  save();st.modal=null;st.img=null;render();toast('Produto salvo.');
 },
 delProd(id){if(confirm('Excluir este produto?')){S.products=S.products.filter(p=>p.id!==id);save();st.modal=null;render();toast('Produto excluído.')}},
 saveMv(){
  const p=prod($('#mv-p').value),q=parseInt($('#mv-q').value),t=$('#mv-t').value,err=x=>{$('#pf-err').textContent=x};
  if(!p||!q||q<1)return err('Escolha o produto e uma quantidade.');
  if(t==='saida'&&q>p.stock)return err('A saída é maior que o estoque atual ('+p.stock+').');
  p.stock+=t==='entrada'?q:-q;S.moves.unshift({date:new Date().toLocaleString('pt-BR'),ts:Date.now(),name:p.name,type:t,qty:q,note:$('#mv-n').value.trim()});
  save();st.modal=null;render();toast('Movimento registrado.');
 },
 cbSum(){const ps=[...document.querySelectorAll('.cb:checked')].map(x=>prod(x.value));$('#cb-sum').textContent=ps.length?`Comprando separado: ${money(sum(ps,p=>p.price))}`:''},
 saveCmb(id){
  const ids=[...document.querySelectorAll('.cb:checked')].map(x=>+x.value),n=$('#cb-n').value.trim(),pr=parseFloat($('#cb-p').value);
  if(!n||isNaN(pr)||ids.length<2)return $('#pf-err').textContent='Informe nome, preço e escolha ao menos 2 produtos.';
  if(id){Object.assign(S.combos.find(c=>c.id==id),{name:n,price:pr,items:ids})}else S.combos.push({id:Date.now(),name:n,price:pr,items:ids});
  save();st.modal=null;render();toast('Combo salvo.');
 },
 delCmb(id){if(confirm('Excluir este combo?')){S.combos=S.combos.filter(c=>c.id!==id);save();st.modal=null;render()}},
 unseed(){S.orders=S.orders.filter(o=>!o.demo);save();render();toast('Exemplos removidos.')}};
})();
