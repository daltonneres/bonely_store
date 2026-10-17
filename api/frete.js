// Função serverless (Vercel): cotação de frete pelo Melhor Envio.
// O token fica só no servidor (variável de ambiente), nunca no navegador.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const body = req.body || {};
  const to = String(body.cep || '').replace(/\D/g, '');
  if (to.length !== 8) return res.status(400).json({ error: 'cep' });

  const token = process.env.MELHORENVIO_TOKEN;
  const from = String(process.env.ORIGIN_CEP || '').replace(/\D/g, '');
  if (!token || from.length !== 8) return res.status(500).json({ error: 'config' });

  const qty = Math.max(1, Math.min(50, (body.items || []).reduce((a, i) => a + (+i.qty || 0), 0) || 1));
  const unitKg = +process.env.ITEM_WEIGHT_KG || 0.4;
  const value = Math.max(0, Math.min(5000, +body.value || 0));
  const payload = {
    from: { postal_code: from },
    to: { postal_code: to },
    package: { width: 25, length: 30, height: Math.min(40, 5 + qty * 3), weight: +(unitKg * qty).toFixed(2) },
    options: { insurance_value: value, receipt: false, own_hand: false },
  };
  if (process.env.ME_SERVICES) payload.services = process.env.ME_SERVICES; // ex.: "1,2" = PAC e SEDEX

  const base = process.env.ME_SANDBOX === '1' ? 'https://sandbox.melhorenvio.com.br' : 'https://melhorenvio.com.br';
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(base + '/api/v2/me/shipment/calculate', {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
        'User-Agent': 'Bonely Store (' + (process.env.CONTACT_EMAIL || 'sem-email') + ')',
      },
      body: JSON.stringify(payload),
    });
    if (!r.ok) return res.status(502).json({ error: 'provider', status: r.status });
    const data = await r.json();
    const opts = (Array.isArray(data) ? data : [])
      .filter((s) => !s.error && (s.custom_price || s.price))
      .map((s) => ({
        name: ((s.company && s.company.name) || '') + ' ' + s.name,
        price: +(s.custom_price || s.price),
        days: +(s.custom_delivery_time || s.delivery_time) || null,
      }))
      .sort((a, b) => a.price - b.price)
      .slice(0, 5);
    return res.status(200).json({ opts });
  } catch (e) {
    return res.status(502).json({ error: 'timeout' });
  } finally {
    clearTimeout(timer);
  }
};
