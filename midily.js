/* Bonely Store | /api/midily
   Ponte segura entre a página /midily e a API da Anthropic.
   - A chave fica só no servidor (variável de ambiente ANTHROPIC_API_KEY na Vercel).
   - Só responde se o token do Firebase for da conta da loja (mesmo e-mail do painel).
   - GET devolve {ai:true|false} para a página saber se o chat livre está configurado. */
const ADMIN_EMAIL='bonelystore@gmail.com';
const FB_KEY='AIzaSyD9bZsll8fK-2aNhwie6K_C7Ak6KYyC6Cw'; /* chave pública do app web (a mesma do firebase.js) */
const MODEL=process.env.MIDILY_MODEL||'claude-sonnet-5-5';
const MAX_BODY=3.5e6;

async function adminOk(token){
  if(!token)return false;
  try{
    const r=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+FB_KEY,{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:token})});
    if(!r.ok)return false;
    const d=await r.json(),u=d.users&&d.users[0];
    return !!(u&&String(u.email||'').toLowerCase()===ADMIN_EMAIL);
  }catch(e){return false}
}

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  const key=process.env.ANTHROPIC_API_KEY;
  if(req.method==='GET')return res.status(200).json({ai:!!key});
  if(req.method!=='POST')return res.status(405).json({error:'method'});
  if(!key)return res.status(503).json({error:'no-key'});

  const auth=String(req.headers.authorization||'');
  if(!(await adminOk(auth.startsWith('Bearer ')?auth.slice(7):'')))return res.status(401).json({error:'auth'});

  const b=typeof req.body==='string'?safeParse(req.body):req.body;
  if(!b||!Array.isArray(b.messages)||!b.messages.length||b.messages.length>60)return res.status(400).json({error:'bad-request'});
  if(JSON.stringify(b).length>MAX_BODY)return res.status(413).json({error:'too-large'});

  try{
    const r=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'content-type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01'},
      body:JSON.stringify({
        model:MODEL,max_tokens:1500,
        system:String(b.system||'').slice(0,60000),
        messages:b.messages,
        tools:Array.isArray(b.tools)?b.tools.slice(0,20):undefined
      })
    });
    const d=await r.json();
    if(!r.ok){console.error('anthropic',r.status,d&&d.error);return res.status(502).json({error:'upstream',status:r.status})}
    return res.status(200).json({content:d.content,stop_reason:d.stop_reason});
  }catch(e){
    console.error('midily api',e);
    return res.status(502).json({error:'upstream'});
  }
};
function safeParse(s){try{return JSON.parse(s)}catch(e){return null}}
