/**
 * Avisa os buscadores que aceitam IndexNow (Bing, Yandex, Seznam, Naver...) que as páginas do site
 * foram publicadas ou mudaram. Rodar **depois** do deploy (`pnpm site:indexnow`): lê o sitemap
 * publicado e envia todas as URLs de uma vez. O Google não usa IndexNow (lá vale o sitemap).
 *
 * A chave é pública por desenho do protocolo: o arquivo `public/<chave>.txt` prova que o envio vem
 * do dono do domínio. Só endereços públicos do site são enviados.
 */
const SITE = 'https://efds-ui.com.br';
const KEY = '32662dcea5cdf1fecb91c1380b3db6a8';
const keyLocation = `${SITE}/${KEY}.txt`;

const published = await fetch(keyLocation).then((r) => (r.ok ? r.text() : ''));
if (published.trim() !== KEY) {
  console.error(`A chave não está publicada em ${keyLocation}: faça o deploy antes.`);
  process.exit(1);
}

const sitemap = await fetch(`${SITE}/sitemap.xml`).then((r) => r.text());
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (urlList.length === 0) {
  console.error('Sitemap sem URLs.');
  process.exit(1);
}

const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation, urlList }),
});
// 200 = aceito; 202 = aceito, chave ainda em validação. Outros códigos: ver indexnow.org/documentation.
console.log(`IndexNow: ${response.status} ${response.statusText} (${urlList.length} URLs).`);
if (response.status !== 200 && response.status !== 202) {
  console.error(await response.text());
  process.exit(1);
}
