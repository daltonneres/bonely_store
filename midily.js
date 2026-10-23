/* Bonely Store | Midily, agente virtual de atendimento
   Carregar DEPOIS do app.js (usa S, FB, FBM, WA, OWNER, HOURS, money, esc, IMP, CIDADES, pageUrl, prodPath).
   Fluxo: pede o nome -> entende o assunto -> responde / consulta o pedido -> coleta o relato -> monta um resumo objetivo
   e entrega para a Gabriely pelo WhatsApp. Tudo roda no navegador (sem chave de IA exposta). */
(function(){
if(window.__midily)return;window.__midily=1;

const SS='midily_v1'; /* chave antiga: só é limpa, a conversa NÃO é mais guardada */
const M={msgs:[],step:'menu',c:{},typing:false,busy:false,fails:0,idFails:0,nameFails:0,gen:0,closed:true,admin:false};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const fmt=t=>esc(t).replace(/\*([^*\n]+)\*/g,'<b>$1</b>').replace(/\n/g,'<br>');
const EMAIL_RE=/[^\s@]+@[^\s@]+\.[^\s@]+/;
const dt=(ts,d)=>ts?new Date(ts).toLocaleDateString('pt-BR'):(d||'');

/* ---------- base de conhecimento (alinhada às páginas de Privacidade e Cancelamento) ---------- */
const SUBJ={order:'Consulta de pedido',cancel:'Cancelamento de pedido',arrep:'Desistência (direito de arrependimento)',defeito:'Troca por defeito',tamanho:'Troca por tamanho',reemb:'Reembolso',compra:'Ajuda na compra (auxiliar de compra)',outro:'Outro assunto'};
const MENU=[['Auxiliar de compra','shop'],['Simular frete','frete'],['Consultar meu pedido','order'],['Cancelar ou trocar','cx'],['Tirar uma dúvida','faq'],['Falar com a '+OWNER,'human']];
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

/* ---------- reinício: fechar o chat apaga a conversa ---------- */
function reset(){
 M.gen++;M.msgs=[];M.step='menu';M.c={};M.typing=false;M.busy=false;M.fails=0;M.idFails=0;M.nameFails=0;
 try{sessionStorage.removeItem(SS)}catch(e){}
 const b=document.getElementById('mid-b');if(b)b.innerHTML='';
}

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
 el.innerHTML=`<div class="mid-h"><span class="mid-av" aria-hidden="true">M</span><div class="mid-t"><b>Midily</b><small>${M.admin?'Assistente de gestão da loja':'Assistente virtual da Bonely Store'}</small></div><button type="button" class="mid-x" onclick="midClose()" aria-label="Fechar conversa">${ICO.x}</button></div>
 <div class="mid-b" id="mid-b" aria-live="polite"></div>
 <form class="mid-f" onsubmit="midSend(event)" autocomplete="off"><input id="mid-i" placeholder="Escreva sua mensagem" aria-label="Sua mensagem" maxlength="600"><button type="submit" aria-label="Enviar">${ICO.send}</button></form>
 <div class="mid-wa">${M.admin?'Ações realizadas nos formulários protegidos do painel.':`Prefere falar direto? <a href="https://wa.me/${WA}" target="_blank" rel="noopener">Abrir o WhatsApp</a>`}</div>`;
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
 const n=M.msgs.length-1,ip=document.getElementById('mid-i');if(ip)ip.placeholder=PH[M.step]||'Escreva sua mensagem';
 b.innerHTML=M.msgs.map((m,i)=>msgHtml(m,i===n)).join('')+(M.typing?'<div class="mm m"><span class="dots" aria-label="Midily está escrevendo"><i></i><i></i><i></i></span></div>':'');
 b.scrollTop=b.scrollHeight;
}
const PH={name0:'Digite o seu nome',name:'Digite o seu nome',shop_bud:'Digite um valor, ex.: 300',frete_cep:'Digite o CEP, ex.: 85000-000',shop_qty:'Ex.: 2'};
async function say(...parts){
 if(M.closed)return;
 const g=M.gen;M.busy=true;
 for(const p0 of parts){
  const p=typeof p0==='string'?{t:p0}:p0;
  M.typing=true;paint();
  await wait(Math.min(850,320+String(p.t||'').length*6));
  if(g!==M.gen||M.closed)return; /* a conversa foi fechada/reiniciada no meio da digitação */
  M.typing=false;M.msgs.push({f:'m',...p});paint();
 }
 M.busy=false;
}

/* ---------- abrir / fechar ---------- */
window.midOpen=function(){
 M.admin=!!(typeof view!=='undefined'&&view==='admin'&&typeof adminOk!=='undefined'&&adminOk&&typeof aarea!=='undefined'&&aarea);
 const el=shell();el.hidden=false;document.body.classList.add('mid-open');
 const sub=el.querySelector('.mid-t small'),foot=el.querySelector('.mid-wa');
 if(sub)sub.textContent=M.admin?'Assistente de gestão da loja':'Assistente virtual da Bonely Store';
 if(foot)foot.innerHTML=M.admin?'Ações realizadas nos formulários protegidos do painel.':`Prefere falar direto? <a href="https://wa.me/${WA}" target="_blank" rel="noopener">Abrir o WhatsApp</a>`;
 M.closed=false;
 if(!M.msgs.length)greet();else paint();
 setTimeout(()=>{const i=document.getElementById('mid-i');if(i)i.focus()},50);
};
/* ao fechar, a conversa é encerrada e apagada: na próxima abertura começa do zero */
window.midClose=function(){
 const el=document.getElementById('midily');if(el)el.hidden=true;
 document.body.classList.remove('mid-open');
 M.closed=true;reset();
};
function greet(){
 if(M.admin){M.step='admin';return say({t:'Oi, Gabriely! Eu sou a Midily, sua parceira para todos os momentos. Posso abrir os formulários para você. O que precisa fazer agora?',chips:[['Registrar despesa ou receita','adm:finance'],['Atualizar estoque','adm:stock'],['Registrar venda/pedido manual','adm:sale'],['Consultar pedidos','adm:orders']]})}
 const full=(typeof S!=='undefined'&&S.customer&&S.customer.name)?clip(S.customer.name,60):'',f=full.split(' ')[0];
 M.step='name0';M.c={};M.nameFails=0;
 say('Olá! Eu sou a *Midily*, assistente virtual da Bonely Store.',
  {t:'Para começar, como posso te chamar?',chips:f?[['Sou '+f,'name:'+full]]:undefined});
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
 if(SHOP_RE.test(n))return 'shop';
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
  if(M.admin)return await adminRoute(txt,val);
  if(val)return await act(val);
  const n=norm(txt);
  if(M.step!=='name0'&&/^(menu|inicio|comecar|recomecar|reiniciar|voltar)\b/.test(n))return await act('menu');
  if(/^(shop_|frete_)/.test(M.step)){const k=intent(txt);if(k==='human'||k==='cx'||k==='order')return await free(txt)}
  switch(M.step){
   case 'name0':{
    const nm=parseName(txt);
    if(!nm){
     M.nameFails++;if(!M.c.pending&&txt.length>=3)M.c.pending=txt;
     return await say({t:'Antes de continuar, como posso te chamar? Pode ser só o primeiro nome.',chips:M.nameFails>=2?[['Continuar sem informar','name:']]:undefined});
    }
    return await setName(nm);
   }
   case 'frete_cep':{
    const c=cepOf(txt);
    if(!c)return await say('Não consegui identificar o CEP. Digite os 8 números, por exemplo 85000-000.');
    return await doFrete(c);
   }
   case 'shop_bud':{
    const b=parseBudget(txt);
    if(!b)return await say('Não consegui identificar o valor. Digite só o número, por exemplo 300 ou 1.200.');
    return await act('bud:'+b);
   }
   case 'shop_for':{
    const n=norm(txt);
    const g=/\b(feminin\w*|mulher|ela|esposa|mae|namorada|filha|irma|amiga)\b/.test(n)?'Feminino':/\b(mascul\w*|homem|ele|marido|pai|namorado|filho|irmao|amigo)\b/.test(n)?'Masculino':/tanto|qualquer|unissex|indiferente|nao sei/.test(n)?'Tanto':'';
    if(!g)return await say({t:'Me diga se é para o público feminino, masculino ou tanto faz.',chips:FOR_CHIPS});
    return await act('for:'+g);
   }
   case 'shop_qty':{
    const n=norm(txt),w={um:1,uma:1,dois:2,duas:2,tres:3,quatro:4},d=n.match(/\d+/);
    let q=0;
    if(d)q=Math.min(+d[0],4);
    else{const k=Object.keys(w).find(x=>new RegExp('\\b'+x+'\\b').test(n));if(k)q=w[k]}
    if(/maximo|o que couber|quanto couber|varias|muitas/.test(n))q='max';
    if(!q)return await say({t:qWord()+' você quer levar? Pode escolher abaixo ou digitar um número.',chips:qtyChips()});
    return await act('qty:'+q);
   }
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
async function adminRoute(txt,val){
 const v=val||'';
 if(v==='adm:finance'||/despes|receit|financeir|extrato/.test(norm(txt))){window.midPanelGo&&window.midPanelGo('finance');return say('Abri *Extrato*. Lá você registra uma despesa ou receita, informa valor, data e categoria. O lançamento fica salvo no painel.')}
 if(v==='adm:stock'||/estoque|repor|entrada de produto|atualizar estoque/.test(norm(txt))){window.midPanelGo&&window.midPanelGo('stock');return say('Abri *Estoque* e o formulário de movimentação. Escolha o produto e o tamanho, depois informe entrada, venda ou ajuste e a quantidade.')}
 if(v==='adm:sale'||/venda|vender|balcao|loja fisica|registrar pedido|pedido manual|criar pedido/.test(norm(txt))){window.midPanelGo&&window.midPanelGo('sale');return say('Abri *Estoque* já com “Venda fora do site” selecionado. Informe produto, tamanho, quantidade, valor e pagamento. Ao registrar, a venda vira um pedido no painel, entra no faturamento e dá baixa no estoque.')}
 if(v==='adm:orders'||/pedido|pedidos/.test(norm(txt))){window.midPanelGo&&window.midPanelGo('orders');return say('Abri a lista de *Pedidos* para você consultar e atualizar os pedidos recebidos pela loja.')}
 return say('Posso te levar direto ao formulário certo. Escolha uma opção:',{chips:[['Registrar despesa ou receita','adm:finance'],['Atualizar estoque','adm:stock'],['Registrar venda/pedido manual','adm:sale'],['Consultar pedidos','adm:orders']]});
}
const clip=(s,n)=>String(s).replace(/\s+/g,' ').trim().slice(0,n||500);

async function free(t){
 const k=intent(t),seed=()=>{if(t.length>=25&&!M.c.story)M.c.story=clip(t)};
 if(k==='human'){seed();return act('human')}
 if(k==='cx'){seed();const s=subOf(t);return s?act('cx:'+s):act('cx')}
 if(k==='order'){seed();const id=parseId(t);if(id){M.c.sub='order';M.c.id=id;return afterId()}return act('order')}
 if((/frete|\bcep\b|prazo de entrega|quanto (custa|fica) (pra|para) (enviar|mandar|entregar)/.test(norm(t)))&&(cepOf(t)||/simul|calcul|quanto|valor|custa|fica/.test(norm(t)))){if(IMP)return act('frete');M.c.frCep=cepOf(t);return act('frete')}
 if(k==='shop'){M.c.shopPre=parseBudget(t);return act('shop')}
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
 if(v.startsWith('name:'))return setName(v.slice(5).trim());
 if(v==='shop')return shopStart();
 if(v==='frete')return freteStart();
 if(v.startsWith('bud:')){M.c.shop=M.c.shop||{};M.c.shop.bud=+v.slice(4);return (M.c.shop.keep&&M.c.shop.n)?shopResults():shopFor()}
 if(v.startsWith('for:')){M.c.shop=M.c.shop||{};M.c.shop.gen=v.slice(4);return shopQty()}
 if(v.startsWith('qty:')){M.c.shop=M.c.shop||{};const q=v.slice(4);M.c.shop.n=q==='max'?'max':+q;return shopResults()}
 if(v==='shopbud'){const o=M.c.shop||{};M.c.shop={gen:o.gen,n:o.n,keep:1};return askBud(false)}
 if(v==='shopagain'){M.c.shop={};return askBud(false)}
 if(v==='shopgo')return shopGo();
 if(v==='bye'||v==='resolved'){M.step='menu';return say({t:'Que bom'+vc()+'! Se precisar de mais alguma coisa, é só chamar. 💛',chips:MENU})}
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
 return say({t:f.a(),links:f.links?f.links():undefined,chips:[...(f.id==='frete'&&!IMP?[['Simular frete','frete']]:[]),['Outra dúvida','faq'],['Consultar pedido','order'],['Falar com a '+OWNER,'human'],['Era só isso','bye']]});
}

/* ---------- nome do cliente ---------- */
const firstName=()=>String(M.c.name||'').trim().split(/\s+/)[0]||'';
const vc=()=>{const f=firstName();return f?', '+f:''};
const PART=new Set(['da','de','do','das','dos','e']);
function parseName(t){
 const n=norm(t);
 if(/[?\d@]/.test(t)||intent(t)||/^(quero|preciso|gostaria|queria|como|qual|quanto|onde|tem|voces|vcs|posso|cade|oi|ola)\b/.test(n)&&!/^(oi|ola)\b[\s,!.]+\S/.test(n))return '';
 const s=String(t).replace(/^\s*(?:oi|ola|olá|bom dia|boa tarde|boa noite)(?=[\s,!.]|$)[\s,!.]*/i,'')
  .replace(/^\s*(?:meu nome (?:e|é)|me chamo|eu sou|sou|aqui (?:e|é)|pode me chamar de|é)\s+(?:o |a )?/i,'')
  .replace(/[^\p{L}\s'-]/gu,' ').replace(/\s+/g,' ').trim();
 const w=s.split(' ').filter(Boolean);
 if(!w.length||w.length>4||s.length<2||w.some(x=>x.length>20))return '';
 return w.map((x,i)=>i&&PART.has(x.toLowerCase())?x.toLowerCase():x.charAt(0).toUpperCase()+x.slice(1).toLowerCase()).join(' ');
}
async function setName(nm){
 const pend=M.c.pending;M.c.pending='';M.c.name=nm||'';M.nameFails=0;M.step='menu';
 const hi=firstName()?'Prazer, *'+firstName()+'*!':'Tudo bem, vamos seguir assim.';
 if(pend){await say(hi);return route(pend)}
 return say(hi,'Posso te ajudar a *escolher produtos dentro do seu orçamento*, consultar seu pedido, explicar cancelamentos e trocas ou tirar dúvidas. Se precisar, organizo tudo e passo um resumo para a '+OWNER+' resolver.',
  {t:'Sobre o que você quer falar?',chips:MENU});
}

/* ---------- auxiliar de compra: analisa o orçamento e indica as melhores opções ---------- */
const SHOP_RE=/orcament|quanto (eu )?(posso|devo)|tenho (so |apenas )?(r\$ ?)?\d|ate r\$ ?\d|presente|me (indica|recomenda|sugere)|indicac|recomend|sugest|escolher|montar (um )?look|melhor (opcao|custo)|quero comprar|ajuda (pra|para|a) comprar/;
const FOR_CHIPS=[['Feminino','for:Feminino'],['Masculino','for:Masculino'],['Tanto faz','for:Tanto']];
const unit=()=>IMP?'itens':'peças';
const qWord=()=>IMP?'Quantos itens':'Quantas peças';
const un=k=>k===1?(IMP?'item':'peça'):unit();
const qtyChips=()=>[['1 '+un(1),'qty:1'],['2 '+unit(),'qty:2'],['3 '+unit(),'qty:3'],['O máximo que couber','qty:max']];
const onSale=p=>+p.oldPrice>+p.price;
const tot=s=>s.reduce((a,p)=>a+ +p.price,0);
const sigOf=s=>s.map(p=>p.id).sort().join(',');
function sizesOf(p){
 if(p.stk&&typeof p.stk==='object')return Object.keys(p.stk).filter(k=>+p.stk[k]>0).join(', ');
 return p.sizes&&norm(p.sizes)!=='unico'?String(p.sizes):'';
}
const pLine=p=>{const st=Number(p.stock),z=sizesOf(p);
 return '• '+p.name+(z?' ('+z+')':'')+': '+(onSale(p)?'*'+money(p.price)+'* (era '+money(p.oldPrice)+')':money(p.price))+(st>0&&st<=4?' · últimas unidades':'')};
function parseBudget(t){
 const s=norm(t).replace(/r\$\s*/g,'');
 let m=s.match(/(\d+(?:[.,]\d+)?)\s*mil\b/);
 if(m)return Math.round(parseFloat(m[1].replace(',','.'))*1000);
 m=s.match(/(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?/);
 if(!m)return 0;
 const v=parseFloat(m[1].replace(/\./g,'')+(m[2]?'.'+m[2]:''));
 return v>=10&&v<=100000?v:0;
}
/* produtos da vitrine em que o cliente está (moda ou importados), com estoque e público compatível */
function shopPool(sh){
 const P=(typeof S!=='undefined'&&S.products)||[];
 return P.filter(p=>{
  if(IMP!==(p.type==='avulso'))return false;
  if(!(+p.price>0))return false;
  const st=Number(p.stock);if(!isNaN(st)&&st<=0)return false;
  if(!IMP&&sh&&sh.gen&&sh.gen!=='Tanto'){const g=p.gen||'Unissex';if(g!==sh.gen&&g!=='Unissex')return false}
  return true;
 });
}
/* melhor conjunto de n itens com total <= cap: A = maior aproveitamento, B = maior economia em promoção */
function bestSets(L0,n,cap){
 let L=L0.filter(p=>+p.price<=cap).sort((a,b)=>b.price-a.price);
 if(L.length>30)L=[...L.slice(0,15),...L.slice(-15)];
 let A=null,B=null;const cur=[];
 const ev=t=>{
  const sav=cur.reduce((a,p)=>a+(onSale(p)?p.oldPrice-p.price:0),0),vr=new Set(cur.map(p=>p.kind||p.coll||p.gen||p.name)).size;
  const k={tot:Math.round(t*100),sav:Math.round(sav*100),vr};
  if(!A||k.tot>A.k.tot||(k.tot===A.k.tot&&k.vr>A.k.vr))A={set:cur.slice(),k};
  if(k.sav>0&&(!B||k.sav>B.k.sav||(k.sav===B.k.sav&&k.tot>B.k.tot)))B={set:cur.slice(),k};
 };
 const rec=(i,t)=>{
  if(cur.length===n){ev(t);return}
  for(let j=i;j<L.length;j++){const pr=+L[j].price;if(t+pr>cap+1e-9)continue;cur.push(L[j]);rec(j+1,t+pr);cur.pop()}
 };
 rec(0,0);return{A,B};
}
function maxCount(L,bud){
 let t=0,c=0;
 L.map(p=>+p.price).sort((a,b)=>a-b).forEach(v=>{if(c<4&&t+v<=bud+1e-9){t+=v;c++}});
 return Math.max(1,c);
}
function comboOpt(sh,bud){
 if(IMP)return null;
 const P=S.products||[],out=[];
 (S.combos||[]).forEach(c=>{
  const its=(c.items||[]).map(id=>P.find(p=>p.id==id));
  if(!its.length||its.some(p=>!p))return;
  if(its.some(p=>{const st=Number(p.stock);return !isNaN(st)&&st<=0}))return;
  if(sh.gen&&sh.gen!=='Tanto'&&its.some(p=>{const g=p.gen||'Unissex';return g!==sh.gen&&g!=='Unissex'}))return;
  const sum=tot(its),pr=+c.price;
  if(!(pr>0)||pr>bud||!(sum>pr))return;
  out.push({c,its,sum,pr,sav:sum-pr});
 });
 return out.sort((a,b)=>b.sav-a.sav)[0]||null;
}
function budChips(){
 const pr=shopPool({}).map(p=>+p.price).sort((a,b)=>a-b),lo=pr[0]||0;
 let t=[100,150,200,300,500,800,1000].filter(v=>v>=lo).slice(0,4);
 if(t.length<2)t=[lo,lo*2,lo*3].map(v=>Math.ceil(v/50)*50);
 return t;
}
function askBud(first){
 M.step='shop_bud';
 return say({t:(first?'Vou analisar o catálogo disponível e indicar as melhores opções para o seu bolso. ':'')+'Quanto você pretende investir? Escolha abaixo ou digite um valor, por exemplo 300.',
  chips:[...budChips().map(v=>['Até '+money(v).replace(/,00$/,''),'bud:'+v]),['Voltar ao início','menu']]});
}
async function shopStart(){
 if(!shopPool({}).length)return say({t:'Não consegui acessar o catálogo por aqui agora. Você pode ver os produtos na loja, ou eu passo o seu pedido de ajuda para a '+OWNER+'.',
  links:[['Abrir a loja',IMP?'/importados':'/']],chips:[['Falar com a '+OWNER,'human'],['Voltar ao início','menu']]});
 const pre=M.c.shopPre;M.c.shopPre=0;M.c.shop={};
 if(pre){await say('Anotei o seu orçamento: *'+money(pre)+'*.');M.c.shop.bud=pre;return shopFor()}
 return askBud(true);
}
function shopFor(){
 if(IMP)return shopQty();
 M.step='shop_for';
 return say({t:'Para quem é a compra?',chips:FOR_CHIPS});
}
function shopQty(){
 M.step='shop_qty';
 return say({t:qWord()+' você quer levar?',chips:qtyChips()});
}
async function shopResults(){
 const sh=M.c.shop||{},bud=+sh.bud,L=shopPool(sh);
 M.step='menu';
 await say('Certo'+vc()+'! Vou analisar o catálogo disponível para o orçamento de *'+money(bud)+'*.');
 if(!L.length)return say({t:'No momento não encontrei produtos disponíveis com esse filtro. A '+OWNER+' pode te ajudar a achar algo ideal.',chips:[['Refazer a busca','shopagain'],['Falar com a '+OWNER,'human'],['Voltar ao início','menu']]});
 const fit=L.filter(p=>+p.price<=bud);
 if(!fit.length){
  const cheap=L.slice().sort((a,b)=>a.price-b.price).slice(0,2);
  return say({t:'Com *'+money(bud)+'* ainda não encontrei uma opção disponível. A mais em conta é *'+cheap[0].name+'*, por '+money(cheap[0].price)+', ou seja, faltam *'+money(cheap[0].price-bud)+'*. O pagamento pode ser parcelado no cartão em até 12x.',
   links:cheap.map(p=>['Ver '+p.name,prodPath(p)]),
   chips:[['Mudar orçamento','shopbud'],['Falar com a '+OWNER,'human'],['Voltar ao início','menu']]});
 }
 const req=sh.n==='max'?maxCount(L,bud):(+sh.n||1);
 let n=Math.max(1,Math.min(req,fit.length)),R=null;
 for(;n>=1;n--){R=bestSets(L,n,bud);if(R.A)break}
 const pr=fit.map(p=>+p.price),lo=Math.min(...pr),hi=Math.max(...pr);
 let intro='Analisei *'+L.length+' produtos disponíveis*: *'+fit.length+'* cabem no seu orçamento, entre '+money(lo)+' e '+money(hi)+'.';
 if(sh.n==='max')intro+=' Dá para levar até *'+n+' '+un(n)+'*.';
 else if(n<req)intro+=' Com esse valor, o máximo que consigo montar é *'+n+' '+un(n)+'*.';
 const opts=[],seen=new Set();
 const add=(title,set,note)=>{const g=sigOf(set);if(seen.has(g))return;seen.add(g);opts.push({title,set,note})};
 const left=set=>{const d=bud-tot(set);return d<0.5?'Aproveita praticamente todo o orçamento.':'Sobram '+money(d)+' do orçamento.'};
 add('Melhor aproveitamento do orçamento',R.A.set,left(R.A.set));
 if(R.B)add('Maior economia (peças em promoção)',R.B.set,'Você economiza '+money(R.B.k.sav/100)+' em relação ao preço original.');
 const C=bestSets(L,n,bud*0.85).A;
 if(C)add('Com folga para '+(IMP?'a entrega':'o frete'),C.set,'Sobram '+money(bud-tot(C.set))+' para '+(IMP?'a entrega':'o frete')+'.');
 const parts=[intro];
 opts.forEach((o,i)=>parts.push({t:'*Opção '+(i+1)+': '+o.title+'*\n'+o.set.map(pLine).join('\n')+'\n*Total: '+money(tot(o.set))+'*\n'+o.note,links:o.set.map(p=>['Ver '+p.name,prodPath(p)])}));
 const cb=n>=2?comboOpt(sh,bud):null;
 if(cb)parts.push({t:'*Combo da loja que cabe no orçamento: '+cb.c.name+'*\n'+cb.its.map(p=>'• '+p.name).join('\n')+'\nDe '+money(cb.sum)+' por *'+money(cb.pr)+'*, uma economia de *'+money(cb.sav)+'*.',links:cb.its.map(p=>['Ver '+p.name,prodPath(p)])});
 M.c.frQty=n;
 sh.res=opts.map((o,i)=>'Opção '+(i+1)+': '+o.set.map(p=>p.name+' '+money(p.price)).join(' + ')+' (total '+money(tot(o.set))+')').join('; ')+(cb?'; Combo '+cb.c.name+' '+money(cb.pr):'');
 parts.push({t:'Os valores não incluem '+(IMP?'a entrega, combinada na hora':'o frete, calculado pelo CEP no carrinho')+'. O pagamento pode ser no Pix ou no cartão em até 12x. Quer que eu passe essa seleção para a '+OWNER+' te ajudar a fechar?',
  chips:[['Falar com a '+OWNER+' sobre essa compra','shopgo'],...(IMP?[]:[['Simular o frete','frete']]),['Mudar orçamento','shopbud'],['Nova busca','shopagain'],['Voltar ao início','menu']]});
 return say(...parts);
}
function shopGo(){
 const c=M.c,sh=c.shop||{};
 c.sub='compra';
 c.story=clip('Orçamento '+money(sh.bud)+(sh.gen&&sh.gen!=='Tanto'?' · público '+sh.gen.toLowerCase():'')+' · '+(sh.n==='max'?'o máximo de '+unit():sh.n+' '+un(+sh.n))+'. Sugestões da Midily: '+(sh.res||'sem sugestões'),900);
 c.told='Análise de orçamento com sugestões de produtos.';
 c.todo='Ajudar a escolher tamanhos e finalizar a compra com as opções sugeridas.';
 c.order=null;
 return intake();
}

/* ---------- simulador de frete (usa o mesmo /api/frete do carrinho) ---------- */
const cepOf=t=>{const d=String(t).replace(/\D/g,'');return d.length===8?d:''};
function freteQty(){
 try{if(typeof CART==='function'){const q=CART().reduce((a,i)=>a+i.qty,0);if(q)return q}}catch(e){}
 return M.c.frQty||1;
}
async function freteStart(){
 if(IMP)return say({t:'Nos importados a entrega é na região ('+CIDADES.join(', ')+') ou você retira na loja, sem custo de frete. O valor da entrega é combinado na hora. Para outra cidade, a '+OWNER+' confirma pelo WhatsApp.',
  chips:[['Falar com a '+OWNER,'human'],['Voltar ao início','menu']]});
 const pre=M.c.frCep;M.c.frCep='';
 if(pre)return doFrete(pre);
 M.step='frete_cep';
 return say({t:'Vou simular o frete para você. Qual é o CEP de entrega?',chips:[['Voltar ao início','menu']]});
}
async function doFrete(cep){
 M.step='menu';
 const q=freteQty();
 await say('Um instante, vou consultar o frete para o CEP *'+cep.slice(0,5)+'-'+cep.slice(5)+'*…');
 let opts=null,demo=false,fail=false;
 try{
  const r=await fetch('/api/frete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cep,items:[{qty:q}],value:(typeof CART==='function'&&CART().length&&typeof cartSub==='function')?cartSub():0})});
  if(r.status===404||r.status===405)demo=true;
  else if(!r.ok)fail=true;
  else{const d=await r.json();if(d.opts&&d.opts.length)opts=d.opts;else fail=true}
 }catch(e){demo=true}
 if(demo&&typeof freteDemo==='function'){opts=freteDemo(cep);}
 else if(demo)fail=true;
 if(fail||!opts)return say({t:'Não consegui calcular o frete agora. Você pode tentar de novo ou pedir para a '+OWNER+' calcular pelo WhatsApp.',chips:[['Tentar outro CEP','frete'],['Falar com a '+OWNER,'human'],['Voltar ao início','menu']]});
 const isDemo=demo||opts.some(o=>o.demo);
 const L=opts.map(o=>'• *'+o.name+'*: '+(+o.price>0?money(o.price):'grátis')+(o.days?' · prazo de '+o.days+(o.days===1?' dia útil':' dias úteis'):''));
 const best=opts.slice().sort((a,b)=>a.price-b.price)[0],fast=opts.slice().sort((a,b)=>(a.days||99)-(b.days||99))[0];
 const tip=opts.length>1?(best===fast?'A opção *'+best.name+'* é a mais barata e a mais rápida.':'A mais barata é *'+best.name+'* e a mais rápida é *'+fast.name+'*.'):'';
 return say({t:'Frete para o CEP '+cep.slice(0,5)+'-'+cep.slice(5)+', considerando '+q+' '+(q===1?'peça':'peças')+':\n'+L.join('\n')+(tip?'\n'+tip:'')},
  {t:(isDemo?'Atenção: estes valores são *estimativas de exemplo*. O valor real aparece no carrinho, ao informar o CEP. ':'O valor final aparece no carrinho, ao informar o CEP, e pode mudar conforme a quantidade de peças. ')+'Deseja mais alguma coisa?',
   chips:[['Simular outro CEP','frete'],['Auxiliar de compra','shop'],['Falar com a '+OWNER,'human'],['Voltar ao início','menu']]});
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
 if(sub==='compra')return{short:'Análise de orçamento com sugestões de produtos.',todo:'Ajudar a escolher tamanhos e finalizar a compra com as opções sugeridas.'};
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
  else if(window.SECTION==='importados')L.push('Seu pedido foi enviado. Qualquer dúvida sobre o andamento, é só chamar por aqui.');
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
 return say('Pronto'+vc()+'! Organizei tudo em um resumo objetivo para a '+OWNER+':',
  {sum:buildSummary()},
  {t:open?'Estamos em horário de atendimento ('+HOURS+'). Toque em *Enviar para a '+OWNER+' no WhatsApp* e ela te responde por lá.':'Agora estamos fora do horário ('+HOURS+'). Envie o resumo pelo WhatsApp e a '+OWNER+' responde assim que voltar.',
   chips:[['Corrigir meu relato','editstory'],['Novo atendimento','new']]});
}
})();
