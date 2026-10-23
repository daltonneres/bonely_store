/* Bonely Store | Midily, agente virtual de atendimento
   Carregar DEPOIS do app.js (usa S, FB, FBM, WA, OWNER, HOURS, money, esc, IMP, CIDADES, pageUrl, prodPath).
   Fluxo: entende o assunto -> responde / consulta o pedido -> coleta o relato -> monta um resumo objetivo
   e entrega para a Gabriely pelo WhatsApp. Tudo roda no navegador (sem chave de IA exposta). */
(function(){
if(window.__midily)return;window.__midily=1;

const SS='midily_v1';
const M={msgs:[],step:'menu',c:{},typing:false,busy:false,fails:0,idFails:0};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const fmt=t=>esc(t).replace(/\*([^*\n]+)\*/g,'<b>$1</b>').replace(/\n/g,'<br>');
const EMAIL_RE=/[^\s@]+@[^\s@]+\.[^\s@]+/;
const dt=(ts,d)=>ts?new Date(ts).toLocaleDateString('pt-BR'):(d||'');

/* ---------- base de conhecimento (alinhada às páginas de Privacidade e Cancelamento) ---------- */
const SUBJ={order:'Consulta de pedido',cancel:'Cancelamento de pedido',arrep:'Desistência (direito de arrependimento)',defeito:'Troca por defeito',tamanho:'Troca por tamanho',reemb:'Reembolso',outro:'Outro assunto'};
const MENU=[['Consultar meu pedido','order'],['Cancelar ou trocar','cx'],['Tirar uma dúvida','faq'],['Falar com a '+OWNER,'human']];
const FAQ=[
 {id:'frete',lbl:'Frete e entrega',k:/frete|prazo|entreg|envio|enviam|chega|correios|retirad|retirar|cep/,
  a:()=>IMP
   ?'Nos importados entregamos na região ('+CIDADES.join(', ')+') ou você retira na loja. O valor da entrega é combinado na hora da entrega. Para outra cidade, a loja confirma pelo WhatsApp.'
   :'Enviamos para todo o Brasil. Para ver as opções e o valor, informe o seu CEP no carrinho ou em *Simular frete*, no menu. Nos importados, a entrega é na região ou retirada na loja, com valor combinado na hora.'},
 {id:'pag',lbl:'Pagamento',k:/pagament|pix|cartao|parcel|credito|debito|boleto/,
  a:()=>'Aceitamos Pix, cartão de crédito (em até 12x), cartão de débito ou a combinar com a loja. Você escolhe a forma ao finalizar o pedido.'},
 {id:'hora',lbl:'Horário de atendimento',k:/horario|abre|funcion|aberto|fecha|atende/,
  a:()=>'Nosso horário de atendimento é '+HOURS+'.'},
 {id:'cupom',lbl:'Cupom de desconto',k:/cupom|desconto|promo/,
  a:()=>'Se a '+OWNER+' te enviou um link de cupom, ele já entra aplicado no carrinho. Você também pode digitar o código no campo *Cupom de desconto* do carrinho.'},
 {id:'conta',lbl:'Minha conta',k:/conta|cadastr|login|entrar/,
  a:()=>'Em *Entre ou Cadastre-se*, no topo da página, você informa seu e-mail ou WhatsApp e vê seus dados e pedidos. Se ainda não tem cadastro, ele é criado quando você finaliza o primeiro pedido.'},
 {id:'priv',lbl:'Privacidade dos dados',k:/privacidad|dados|lgpd/,
  a:()=>'Coletamos nome, e-mail, telefone, endereço e CEP, só para processar e entregar seus pedidos e falar com você sobre eles. Não vendemos seus dados. Você pode pedir acesso, correção ou exclusão pelo WhatsApp ou Instagram.',
  links:()=>[['Ler a Política de Privacidade',pageUrl('privacidade')]]}
];
const POL=()=>[['Ler a Política de Cancelamento e Trocas',pageUrl('cancelamento')]];

/* ---------- persistência leve (só nesta aba) ---------- */
function persist(){try{sessionStorage.setItem(SS,JSON.stringify({msgs:M.msgs.slice(-60),step:M.step,c:M.c,fails:M.fails}))}catch(e){}}
function restore(){try{const j=JSON.parse(sessionStorage.getItem(SS));if(j&&j.msgs&&j.msgs.length){M.msgs=j.msgs;M.step=j.step||'menu';M.c=j.c||{};M.fails=j.fails||0;return true}}catch(e){}return false}

/* ---------- interface ---------- */
const ICO={
 send:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>',
 x:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>'
};
function shell(){
 let el=document.getElementById('midily');
 if(el)return el;
 el=document.createElement('div');el.id='midily';el.className='mid';el.hidden=true;
 el.setAttribute('role','dialog');el.setAttribute('aria-label','Conversa com a Midily');
 el.innerHTML=`<div class="mid-h"><span class="mid-av" aria-hidden="true">M</span><div class="mid-t"><b>Midily</b><small>Assistente virtual da Bonely Store</small></div><button type="button" class="mid-x" onclick="midClose()" aria-label="Fechar conversa">${ICO.x}</button></div>
 <div class="mid-b" id="mid-b" aria-live="polite"></div>
 <form class="mid-f" onsubmit="midSend(event)" autocomplete="off"><input id="mid-i" placeholder="Escreva sua mensagem" aria-label="Sua mensagem" maxlength="600"><button type="submit" aria-label="Enviar">${ICO.send}</button></form>
 <div class="mid-wa">Prefere falar direto? <a href="https://wa.me/${WA}" target="_blank" rel="noopener">Abrir o WhatsApp</a></div>`;
 document.body.appendChild(el);
 el.addEventListener('keydown',e=>{if(e.key==='Escape')midClose()});
 return el;
}
function sumCard(text){
 const url='https://wa.me/'+WA+'?text='+encodeURIComponent(text);
 return `<div class="msum">${fmt(text)}</div><div class="mact"><a class="mgo" href="${esc(url)}" target="_blank" rel="noopener" onclick="midSent()">Enviar para a ${esc(OWNER)} no WhatsApp</a><button type="button" onclick="midCopy(this)">Copiar resumo</button></div>`;
}
function msgHtml(m,last){
 let h=`<div class="mm ${m.f==='u'?'u':'m'}">`;
 if(m.t)h+=`<p>${fmt(m.t)}</p>`;
 if(m.links)h+=`<div class="ml">${m.links.map(l=>`<a href="${esc(l[1])}" target="_blank" rel="noopener">${esc(l[0])}</a>`).join('')}</div>`;
 if(m.sum)h+=sumCard(m.sum);
 h+='</div>';
 if(last&&!M.typing&&m.chips&&m.chips.length)h+=`<div class="mc">${m.chips.map((c,j)=>`<button type="button" onclick="midPick(${j})">${esc(c[0])}</button>`).join('')}</div>`;
 return h;
}
function paint(){
 const b=document.getElementById('mid-b');if(!b)return;
 const n=M.msgs.length-1;
 b.innerHTML=M.msgs.map((m,i)=>msgHtml(m,i===n)).join('')+(M.typing?'<div class="mm m"><span class="dots" aria-label="Midily está escrevendo"><i></i><i></i><i></i></span></div>':'');
 b.scrollTop=b.scrollHeight;
}
async function say(...parts){
 M.busy=true;
 for(const p0 of parts){
  const p=typeof p0==='string'?{t:p0}:p0;
  M.typing=true;paint();
  await wait(Math.min(850,320+String(p.t||'').length*6));
  M.typing=false;M.msgs.push({f:'m',...p});paint();persist();
 }
 M.busy=false;
}

/* ---------- abrir / fechar ---------- */
window.midOpen=function(){
 const el=shell();el.hidden=false;document.body.classList.add('mid-open');
 if(!M.msgs.length&&!restore())greet();else paint();
 paint();
 setTimeout(()=>{const i=document.getElementById('mid-i');if(i)i.focus()},50);
};
window.midClose=function(){const el=document.getElementById('midily');if(el)el.hidden=true;document.body.classList.remove('mid-open')};
function greet(){
 const nm=(typeof S!=='undefined'&&S.customer&&S.customer.name)?String(S.customer.name).trim().split(' ')[0]:'';
 M.step='menu';M.c={};
 say('Oi'+(nm?', '+nm:'')+'! Eu sou a *Midily*, assistente virtual da Bonely Store.',
  'Posso tirar dúvidas, consultar seu pedido e explicar cancelamentos e trocas. Se precisar, eu organizo tudo e passo um resumo para a '+OWNER+' resolver.',
  {t:'Sobre o que você quer falar?',chips:MENU});
}

/* ---------- entrada do usuário ---------- */
window.midSend=function(e){
 e.preventDefault();
 const i=document.getElementById('mid-i'),v=(i.value||'').trim();
 if(!v||M.busy)return;
 i.value='';M.msgs.push({f:'u',t:v});paint();route(v);
};
window.midPick=function(j){
 if(M.busy)return;
 const m=M.msgs[M.msgs.length-1],c=m&&m.chips&&m.chips[j];if(!c)return;
 M.msgs.push({f:'u',t:c[0]});paint();route(c[0],c[1]);
};
window.midCopy=function(b){
 const m=[...M.msgs].reverse().find(x=>x.sum),t=m?m.sum:'';
 const ok=()=>{b.textContent='Copiado!'};
 try{navigator.clipboard.writeText(t).then(ok,()=>prompt('Copie o resumo:',t))}catch(e){prompt('Copie o resumo:',t)}
};
window.midSent=function(){
 setTimeout(()=>say('Abri o WhatsApp com o resumo pronto. Basta tocar em enviar. Se não abriu, use *Copiar resumo* e mande para '+PHONE+'.',
  {t:'Posso ajudar em mais alguma coisa?',chips:[['Novo atendimento','new'],['Era só isso','bye']]}),400);
};

/* ---------- detecção de assunto ---------- */
function intent(t){
 const n=norm(t);
 if(/atendente|gabriely|humano|falar com (a )?(alguem|pessoa|dona|loja)|quero falar/.test(n))return 'human';
 if(/cancel|desist|arrepen|reembols|estorn|devol|trocar|troca\b|defeit|errad|nao serviu|nao coube|apertad|rasgad|manchad/.test(n))return 'cx';
 if(/meu pedido|minha compra|rastre|cade (o|meu)|status|chegou|encomenda|bn\s?-?\d{3,}/.test(n))return 'order';
 return '';
}
function subOf(t){
 const n=norm(t);
 if(/arrepen|desist/.test(n))return 'arrep';
 if(/defeit|estrag|rasgad|manchad|errad|veio quebrad/.test(n))return 'defeito';
 if(/tamanho|serviu|coube|apertad|folgad/.test(n))return 'tamanho';
 if(/reembols|estorn|dinheiro de volta/.test(n))return 'reemb';
 if(/cancel/.test(n))return 'cancel';
 return '';
}
function parseId(t,loose){
 const s=String(t).toUpperCase();
 const m=s.match(/BN\s*-?\s*(\d{3,6})/)||(loose?s.match(/\b(\d{4,6})\b/):null);
 return m?'BN'+m[1]:'';
}
function faqOf(t){const n=norm(t);return FAQ.find(f=>f.k.test(n))||null}
function prodAnswer(t){
 const P=(typeof S!=='undefined'&&S.products)||[];if(!P.length)return null;
 const n=norm(t),stop=new Set(['tem','com','para','por','uma','uns','que','qual','quanto','custa','preco','valor','voces','vcs','tamanho','tamanhos','disponivel','estoque','ainda','esse','essa','meu','minha','das','dos','nao','mais']);
 const tk=n.split(/[^a-z0-9]+/).filter(x=>x.length>=3&&!stop.has(x));
 if(!tk.length)return null;
 const sc=P.map(p=>{const nn=norm(p.name);return{p,s:tk.filter(x=>nn.includes(x)).length}}).filter(x=>x.s>0).sort((a,b)=>b.s-a.s);
 if(!sc.length)return null;
 const det=p=>{const st=Number(p.stock);return p.name+': '+money(p.price)+(p.sizes?', tamanhos '+p.sizes:'')+(isNaN(st)?'':st<=0?' (esgotado)':st<=4?' (últimas unidades)':' (disponível)')};
 if(sc[0].s>=2&&(!sc[1]||sc[1].s<sc[0].s))return{t:det(sc[0].p),links:[['Ver o produto',prodPath(sc[0].p)]]};
 if(/tem|quanto|preco|valor|disponi|estoque|tamanho/.test(n)){
  const l=sc.slice(0,4);
  return{t:'Encontrei estas opções:\n'+l.map(x=>'• '+det(x.p)).join('\n'),links:l.map(x=>['Ver '+x.p.name,prodPath(x.p)])};
 }
 return null;
}

/* ---------- roteador ---------- */
async function route(txt,val){
 try{
  if(val)return await act(val);
  const n=norm(txt);
  if(/^(menu|inicio|comecar|recomecar|reiniciar|voltar)\b/.test(n))return await act('menu');
  switch(M.step){
   case 'ord_id':{
    const id=parseId(txt,true);
    if(!id){M.idFails++;return await say(M.idFails>=2?{t:'Não consegui identificar o número. Ele fica no comprovante e começa com *BN*. Quer tentar de novo ou falar com a '+OWNER+'?',chips:[['Tentar de novo','retry'],['Continuar sem o pedido','skipord'],['Voltar ao início','menu']]}:'Não consegui identificar o número. Ele começa com *BN* seguido de números, por exemplo BN1001.')}
    M.idFails=0;M.c.id=id;return await afterId();
   }
   case 'ord_em':{
    const m=txt.match(EMAIL_RE);
    if(!m)return await say('Preciso do e-mail completo usado na compra, por exemplo nome@email.com.');
    M.c.email=m[0].toLowerCase();return await doLookup();
   }
   case 'story':
    if(txt.length<3)return await say('Pode me contar um pouco mais?');
    M.c.story=clip(txt);return await intake();
   case 'name':
    M.c.name=clip(txt,60);return await intake();
   case 'phone':{
    if(txt.replace(/\D/g,'').length<10)return await say('Informe o WhatsApp com DDD, por exemplo 46 99999-9999.');
    M.c.phone=txt.trim();return await intake();
   }
  }
  return await free(txt);
 }catch(e){console.error('Midily',e);M.busy=false;M.typing=false;paint();say({t:'Tive um probleminha aqui. Quer falar direto com a '+OWNER+'?',chips:[['Falar com a '+OWNER,'human'],['Voltar ao início','menu']]})}
}
const clip=(s,n)=>String(s).replace(/\s+/g,' ').trim().slice(0,n||500);

async function free(t){
 const k=intent(t),seed=()=>{if(t.length>=25&&!M.c.story)M.c.story=clip(t)};
 if(k==='human'){seed();return act('human')}
 if(k==='cx'){seed();const s=subOf(t);return s?act('cx:'+s):act('cx')}
 if(k==='order'){seed();const id=parseId(t);if(id){M.c.sub='order';M.c.id=id;return afterId()}return act('order')}
 const f=faqOf(t);if(f)return answerFaq(f);
 const p=prodAnswer(t);if(p){return say({...p,chips:[['Outra dúvida','faq'],['Falar com a '+OWNER,'human'],['Era só isso','bye']]})}
 M.fails++;
 return say(M.fails>=2
  ?{t:'Ainda não consegui entender direito. Posso organizar o que você precisa e passar para a '+OWNER+', que resolve com você.',chips:[['Falar com a '+OWNER,'human'],['Ver opções','menu']]}
  :{t:'Não tenho certeza de ter entendido. Escolha uma opção ou me conte com mais detalhes.',chips:MENU});
}

async function act(v){
 if(v==='menu'||v==='new'){
  const keep={name:M.c.name,phone:M.c.phone};M.c={...keep};M.step='menu';M.fails=0;M.idFails=0;
  return say({t:v==='new'?'Claro! Sobre o que você quer falar?':'Tudo bem. Sobre o que você quer falar?',chips:MENU});
 }
 if(v==='bye'||v==='resolved'){M.step='menu';return say({t:'Que bom! Se precisar de mais alguma coisa, é só chamar. 💛',chips:MENU})}
 if(v==='order'){M.c.sub='order';return askOrder(false)}
 if(v==='retry')return askOrder(M.c.sub!=='order');
 if(v==='skipord'){M.c.skip=1;M.c.id='';M.c.order=null;return intake()}
 if(v==='cx'){
  M.step='menu';
  return say({t:'Entendi. Qual é a situação?',chips:[['Cancelar um pedido','cx:cancel'],['Desistir da compra','cx:arrep'],['Peça com defeito','cx:defeito'],['Trocar tamanho','cx:tamanho'],['Reembolso','cx:reemb']]});
 }
 if(v.startsWith('cx:')){M.c.sub=v.slice(3);return cxIntro()}
 if(v==='faq'){
  M.step='menu';
  return say({t:'Claro! Escolha um tema ou escreva sua dúvida.',chips:[...FAQ.map(f=>[f.lbl,'faq:'+f.id]),['Voltar ao início','menu']]});
 }
 if(v.startsWith('faq:'))return answerFaq(FAQ.find(f=>f.id===v.slice(4)));
 if(v.startsWith('ord:')){M.c.sub=M.c.sub||'order';M.c.id=v.slice(4);return afterId(true)}
 if(v==='human'){M.c.sub=M.c.sub||'outro';return intake(true)}
 if(v==='unresolved')return intake();
 if(v==='editstory'){M.c.story='';M.step='story';return say('Sem problema. Escreva de novo o que aconteceu, que eu atualizo o resumo.')}
}

function answerFaq(f){
 if(!f)return say({t:'Posso ajudar com outro tema?',chips:MENU});
 M.step='menu';
 return say({t:f.a(),links:f.links?f.links():undefined,chips:[['Outra dúvida','faq'],['Consultar pedido','order'],['Falar com a '+OWNER,'human'],['Era só isso','bye']]});
}

/* ---------- cancelamentos e trocas ---------- */
const CX_INTRO={
 cancel:'Antes do pagamento, o pedido pode ser cancelado sem custo. Depois do pagamento, se ainda não foi enviado, o cancelamento é feito com reembolso integral.',
 arrep:'Em compras online você pode desistir em até 7 dias corridos após o recebimento. A peça deve estar sem uso e com etiqueta.',
 defeito:'Sinto muito pelo transtorno! Solicite a troca em até 7 dias, enviando fotos da peça. A '+OWNER+' te explica como fazer o envio de volta.',
 tamanho:'Dá para trocar! Solicite em até 7 dias, enviando fotos da peça. A '+OWNER+' te explica como fazer o envio de volta.',
 reemb:'O reembolso é feito pela mesma forma de pagamento, em até 10 dias úteis depois que recebermos a peça.'
};
function cxIntro(){
 return say({t:CX_INTRO[M.c.sub],links:POL()}).then(()=>askOrder(true));
}
function advice(sub,o){
 const st=o&&o.status,sent=st==='Enviado'||st==='Entregue';
 if(sub==='cancel'){
  if(!o)return{short:'Política de cancelamento informada.',todo:'Confirmar o pedido e o status para decidir o cancelamento.'};
  if(st==='Cancelado')return{tell:'Esse pedido já consta como *cancelado*.',short:'Pedido já consta como cancelado.',todo:'Conferir se o reembolso já foi feito.'};
  if(st==='Aguardando pagamento')return{tell:'Seu pedido ainda não foi pago, então ele pode ser cancelado sem custo.',short:'Cancelamento sem custo (pedido não pago).',todo:'Cancelar o pedido (sem pagamento, sem reembolso).'};
  if(!sent)return{tell:'Como o pedido ainda não foi enviado, o cancelamento é com reembolso integral.',short:'Cancelamento com reembolso integral (pedido não enviado).',todo:'Cancelar, interromper a separação e reembolsar o valor integral'+(o.pay?' via '+o.pay:'')+'.'};
  return{tell:'Como o pedido já foi enviado, o cancelamento direto não é mais possível. Mas você ainda pode desistir em até 7 dias corridos após o recebimento, com a peça sem uso e com etiqueta.',short:'Pedido já enviado: orientado sobre desistência em 7 dias.',todo:'Pedido já enviado: orientar devolução/arrependimento e conferir o prazo de 7 dias.'};
 }
 if(sub==='arrep'){
  if(o&&!sent&&st!=='Cancelado')return{tell:'Seu pedido ainda não foi enviado, então basta cancelar, com reembolso integral se já estiver pago.',short:'Pedido não enviado: cancelamento no lugar da desistência.',todo:'Cancelar o pedido e reembolsar integral se pago.'};
  return{short:'Orientado: 7 dias após o recebimento, peça sem uso e com etiqueta.',todo:'Conferir o prazo de 7 dias desde o recebimento, orientar o envio de volta e reembolsar em até 10 dias úteis após receber a peça.'};
 }
 if(sub==='defeito')return{short:'Orientado a enviar fotos da peça em até 7 dias.',todo:'Pedir fotos da peça, orientar o envio de volta e definir troca ou reembolso.'};
 if(sub==='tamanho')return{short:'Orientado a enviar fotos da peça em até 7 dias.',todo:'Confirmar o tamanho desejado e o estoque, orientar o envio de volta e fazer a troca.'};
 if(sub==='reemb')return{short:'Prazo de reembolso informado (10 dias úteis após receber a peça).',todo:'Verificar a situação do pagamento/devolução e confirmar o prazo do reembolso.'};
 /* consulta simples de pedido */
 if(!o)return{short:'',todo:'Confirmar o número do pedido e o e-mail com o cliente.'};
 const map={'Aguardando pagamento':'Conferir o pagamento e confirmar o pedido.','Pago':'Atualizar o cliente sobre a separação e o envio.','Separando':'Atualizar o cliente sobre o envio.','Enviado':o.tracking?'Conferir o rastreio ('+o.tracking+') com o cliente.':'Pedido enviado sem código de rastreio: informar o código ao cliente.','Entregue':'Confirmar com o cliente se recebeu e qual é o problema.','Cancelado':'Pedido cancelado: explicar o motivo e conferir o reembolso.'};
 return{short:'Status do pedido informado ('+st+').',todo:map[st]||'Verificar o pedido com o cliente.'};
}

/* ---------- consulta de pedido ---------- */
function myIds(){
 try{
  const em=S.customer&&String(S.customer.email||'').toLowerCase();if(!em)return [];
  return (S.orders||[]).filter(o=>String(o.customer&&o.customer.email||'').toLowerCase()===em).sort((a,b)=>(b.ts||0)-(a.ts||0)).slice(0,3).map(o=>o.id);
 }catch(e){return []}
}
function askOrder(skip){
 M.step='ord_id';M.idFails=0;M.c.order=null;M.c.email='';M.c.id='';
 const mine=myIds();
 return say({t:'Me passa o número do pedido? Ele começa com *BN*, por exemplo BN1001.'+(mine.length?'\nOu escolha um dos seus pedidos recentes:':''),
  chips:[...mine.map(id=>[id,'ord:'+id]),...(skip?[['Não tenho agora','skipord']]:[]),['Voltar ao início','menu']]});
}
async function afterId(fromList){
 const acc=S.customer&&String(S.customer.email||'').toLowerCase();
 if(M.c.email)return doLookup(false);
 if(acc){M.c.email=acc;return doLookup(!fromList)}
 M.step='ord_em';
 return say('Para a sua segurança, confirme também o e-mail usado na compra.');
}
async function doLookup(triedAccount){
 const id=M.c.id,em=M.c.email;
 if(window.STATIC_PAGE){
  M.c.order=null;M.c.unv=1;
  await say('Anotei o pedido *'+id+'*. Nesta página não consigo consultar o andamento, então a '+OWNER+' confere para você.');
  return afterOrder();
 }
 await say('Um instante, vou consultar o pedido '+id+'…');
 let o=(S.orders||[]).find(x=>String(x.id).toUpperCase()===id&&String(x.customer&&x.customer.email||'').toLowerCase()===em);
 if(!o&&typeof FBM!=='undefined'&&FBM&&window.FB){try{o=await FB.getOrder(id,em)}catch(e){o=null}}
 if(!o){
  if(triedAccount){M.c.email='';M.step='ord_em';return say('Não achei esse pedido com o e-mail da sua conta. Qual e-mail você usou na compra?')}
  M.c.order=null;M.step='menu';
  return say({t:'Não encontrei um pedido com esse número e e-mail. Confira se são os mesmos da compra.',chips:[['Tentar de novo','retry'],['Continuar sem o pedido','skipord'],['Voltar ao início','menu']]});
 }
 M.c.order={id:o.id,status:o.status,total:o.total,ts:o.ts,date:o.date,tracking:o.tracking||'',pay:o.pay||'',local:!!(o.ship&&o.ship.local),
  items:(o.items||[]).slice(0,6).map(i=>i.qty+'x '+i.name+(i.size?' ('+i.size+')':''))};
 if(o.customer){if(!M.c.name&&o.customer.name)M.c.name=clip(o.customer.name,60);if(!M.c.phone&&o.customer.phone)M.c.phone=o.customer.phone}
 return afterOrder();
}
function orderMsg(o){
 const L=['Encontrei o pedido *'+o.id+'*, feito em '+dt(o.ts,o.date)+', no valor de '+money(o.total)+'.','Status: *'+o.status+'*'],s=o.status;
 if(s==='Aguardando pagamento')L.push('Ainda não identificamos o pagamento. Assim que a '+OWNER+' confirmar, o status muda.');
 else if(s==='Pago')L.push('Pagamento confirmado! Em breve as peças serão separadas.');
 else if(s==='Separando')L.push('Estamos separando as suas peças para '+(o.local?'entrega':'envio')+'.');
 else if(s==='Enviado'){
  if(o.local)L.push('Seu pedido saiu para entrega.');
  else if(o.tracking)L.push('Código de rastreio: *'+o.tracking+'*. Pode levar algumas horas para aparecer depois da postagem.');
  else L.push('Ainda não temos o código de rastreio. Ele aparece aqui assim que for informado.');
 }
 else if(s==='Entregue')L.push('Consta como entregue.');
 else if(s==='Cancelado')L.push('Este pedido está cancelado.');
 return L.join('\n');
}
async function afterOrder(){
 const c=M.c,o=c.order,sub=c.sub||'order',adv=advice(sub,o);
 c.todo=adv.todo;c.told=adv.short;
 if(sub==='order'){
  if(o){
   const lk=(o.status==='Enviado'&&o.tracking&&!o.local)?[['Rastrear agora','https://www.melhorrastreio.com.br/rastreio/'+encodeURIComponent(o.tracking)],['Site dos Correios','https://rastreamento.correios.com.br/app/index.php']]:undefined;
   M.step='menu';
   return say({t:orderMsg(o),links:lk},{t:'Isso resolveu a sua dúvida?',chips:[['Sim, resolveu','resolved'],['Não, preciso de ajuda','unresolved']]});
  }
  return intake();
 }
 if(o)await say(orderMsg(o));
 if(adv.tell)await say(adv.tell);
 return intake();
}

/* ---------- coleta do relato e resumo ---------- */
async function intake(fromHuman){
 const c=M.c;
 if(typeof S!=='undefined'&&S.customer){if(!c.name&&S.customer.name)c.name=clip(S.customer.name,60);if(!c.phone&&S.customer.phone)c.phone=S.customer.phone}
 if(!c.story){
  M.step='story';
  const q=c.sub==='order'?'Me conta o que você precisa saber ou o que está acontecendo com o pedido.':c.sub==='outro'?'Me conta o que você precisa, que eu organizo tudo para a '+OWNER+'.':'Para a '+OWNER+' resolver mais rápido, me conta em poucas palavras o que aconteceu.';
  return say((fromHuman?'Claro, vou te ajudar a falar com a '+OWNER+'. ':'')+q);
 }
 if(!c.name){M.step='name';return say('Qual é o seu nome?')}
 if(!c.phone){M.step='phone';return say('E qual é o seu WhatsApp, com DDD? A '+OWNER+' vai te chamar por ele.')}
 return review();
}
function buildSummary(){
 const c=M.c,o=c.order,L=['*Atendimento Midily | Bonely Store*'];
 L.push('*Cliente:* '+c.name+(c.phone?' · '+c.phone:'')+(c.email&&o?' · '+c.email:''));
 L.push('*Assunto:* '+(SUBJ[c.sub]||SUBJ.outro));
 if(o){
  L.push('*Pedido:* '+o.id+' · '+o.status+' · '+money(o.total)+' · '+dt(o.ts,o.date)+(o.pay?' · '+o.pay:''));
  if(o.items&&o.items.length)L.push('*Itens:* '+o.items.join(', '));
  if(o.tracking)L.push('*Rastreio:* '+o.tracking);
 }else if(c.id)L.push('*Pedido informado:* '+c.id+' (não verificado)'+(c.email?' · '+c.email:''));
 L.push('*Relato:* '+c.story);
 if(c.told)L.push('*Já orientado:* '+c.told);
 L.push('*Para resolver:* '+(c.todo||advice(c.sub||'outro',o).todo||'Responder ao cliente.'));
 return L.join('\n');
}
function review(){
 const c=M.c;
 if(!c.todo){const a=advice(c.sub||'outro',c.order);c.todo=a.todo||'Responder a dúvida do cliente.';c.told=c.told||a.short}
 M.step='done';
 const d=new Date(),open=d.getDay()!==0&&d.getHours()>=9&&d.getHours()<18; /* HOURS: Seg. à Sáb. 09h às 18h */
 return say('Pronto! Organizei tudo em um resumo objetivo para a '+OWNER+':',
  {sum:buildSummary()},
  {t:open?'Estamos em horário de atendimento ('+HOURS+'). Toque em *Enviar para a '+OWNER+' no WhatsApp* e ela te responde por lá.':'Agora estamos fora do horário ('+HOURS+'). Envie o resumo pelo WhatsApp e a '+OWNER+' responde assim que voltar.',
   chips:[['Corrigir meu relato','editstory'],['Novo atendimento','new']]});
}
})();
