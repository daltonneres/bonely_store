// Função serverless (Vercel): cotação de frete.
// Coloque este arquivo em  api/frete.js  (a rota vira /api/frete).
//
// Modo 1 (sem configurar nada): estimativa por região, calculada pela distância entre o CEP da loja e o do cliente.
// Modo 2 (com MELHORENVIO_TOKEN): cotação real pelo Melhor Envio. Se ele falhar, cai na estimativa.
// Variáveis de ambiente (opcionais): ORIGIN_CEP, MELHORENVIO_TOKEN, ME_SERVICES, ME_SANDBOX, ITEM_WEIGHT_KG, CONTACT_EMAIL.

// ---- Preços da estimativa (a Gabriely pode ajustar) ----
const TABELA = {
  pac:   { nome: 'PAC (estimativa)',   base: 14, porKm: 0.011, porPecaExtra: 3, diasBase: 3, kmPorDia: 450 },
  sedex: { nome: 'SEDEX (estimativa)', base: 24, porKm: 0.020, porPecaExtra: 5, diasBase: 1, kmPorDia: 700 },
};
// Centro aproximado da região de cada 1º dígito do CEP [lat, lng]
const REGIAO = {
  0: [-23.5, -46.6], 1: [-22.5, -47.5], 2: [-21.5, -42.0], 3: [-19.5, -44.5], 4: [-12.5, -40.5],
  5: [-8.0, -36.0], 6: [-4.0, -45.0], 7: [-16.0, -52.0], 8: [-26.0, -50.5], 9: [-30.0, -52.0],
};

function km(a, b) {
  const r = (x) => (x * Math.PI) / 180;
  const h = Math.sin(r(b[0] - a[0]) / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(r(b[1] - a[1]) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

function estimativa(to, from, qty) {
  const d = km(REGIAO[(from || '2')[0]] || REGIAO[2], REGIAO[to[0]] || REGIAO[2]);
  return Object.values(TABELA)
    .map((t) => ({
      name: t.nome,
      price: +(t.base + d * t.porKm + (qty - 1) * t.porPecaExtra).toFixed(2),
      days: t.diasBase + Math.ceil(d / t.kmPorDia),
      src: 'tabela',
    }))
    .sort((a, b) => a.price - b.price);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const body = req.body || {};
  const to = String(body.cep || '').replace(/\D/g, '');
  if (to.length !== 8) return res.status(400).json({ error: 'cep' });

  const token = process.env.MELHORENVIO_TOKEN;
  const from = String(process.env.ORIGIN_CEP || '').replace(/\D/g, '');
  const qty = Math.max(1, Math.min(50, (body.items || []).reduce((a, i) => a + (+i.qty || 0), 0) || 1));

  // Sem token (ou sem CEP de origem válido): estimativa por região.
  if (!token || from.length !== 8) return res.status(200).json({ opts: estimativa(to, from, qty) });

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
    if (!r.ok) throw new Error('provider ' + r.status);
    const data = await r.json();
    const opts = (Array.isArray(data) ? data : [])
      .filter((s) => !s.error && (s.custom_price || s.price))
      .map((s) => ({
        name: ((s.company && s.company.name) || '') + ' ' + s.name,
        price: +(s.custom_price || s.price),
        days: +(s.custom_delivery_time || s.delivery_time) || null,
        src: 'melhorenvio',
      }))
      .sort((a, b) => a.price - b.price)
      .slice(0, 5);
    if (!opts.length) throw new Error('sem opções');
    return res.status(200).json({ opts });
  } catch (e) {
    return res.status(200).json({ opts: estimativa(to, from, qty) });
  } finally {
    clearTimeout(timer);
  }
};
