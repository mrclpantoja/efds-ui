// Ponto de entrada: node --env-file=.env src/index.js
import { createAudit } from './audit.js';
import { createTokenAuthenticator } from './auth.js';
import { loadConfig } from './config.js';
import { createDriver } from './drivers/index.js';
import { createFilesServer } from './server.js';
import { createFilesService } from './service.js';

const config = loadConfig();
if (!Object.keys(config.tokens).length) {
  console.error('Defina FILES_TOKENS (veja .env.example): sem ele ninguém consegue autenticar.');
  process.exit(1);
}

const driver = await createDriver(config);
const audit = createAudit();
const service = createFilesService({ driver, config, audit });
const server = createFilesServer({
  service,
  authenticate: createTokenAuthenticator(config.tokens),
  config,
});

// Limpeza da lixeira pelo prazo de retenção (a cada hora e na partida).
const sweep = () =>
  service.purgeExpired().catch((e) => console.error('Falha ao limpar a lixeira:', e?.message));
await sweep();
setInterval(sweep, 3600_000).unref();

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '127.0.0.1'; // atrás de proxy reverso com HTTPS; não exponha direto
server.listen(port, host, () => {
  console.log(
    `Servidor de arquivos em http://${host}:${port}${config.basePath} (driver: ${config.driver})`,
  );
});
