/**
 * Monta a pasta de download de um template (html/ + react/), com README e LICENSE, e o .zip.
 *
 *   node scripts/templates/pack.ts --template painel --license <pasta com efds-license.json/js> --out <pasta>
 *
 * Pré-requisitos: `pnpm build` e `pnpm templates:vendor`. Nunca inclui chave privada nem a chave
 * de licença (o cliente cola a que recebeu).
 */

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';
import { createZip, type ZipEntry } from '../../packages/behavior/src/export/zip.ts';
import { configJsFile, root, templatesDir, TEMPLATES, writeText } from './lib.ts';
import {
  inlineTsconfig,
  parseCatalog,
  transformPackageJson,
  type PackageJson,
  type TsConfigLike,
} from './pack-lib.ts';

const { values } = parseArgs({
  options: {
    template: { type: 'string' },
    source: { type: 'string' },
    license: { type: 'string' },
    out: { type: 'string' },
  },
});

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

// --source <pasta>: template fora deste repositório (o nome do produto é o nome da pasta).
const externalSource = values.source ? resolve(values.source) : undefined;
const template = values.template ?? (externalSource ? basename(externalSource) : undefined);
if (!template || (!externalSource && !(TEMPLATES as readonly string[]).includes(template))) {
  fail(`--template deve ser um de: ${TEMPLATES.join(', ')} (ou use --source <pasta>).`);
}
if (!values.license) fail('Falta --license <pasta com efds-license.json e efds-license.js>.');
if (!values.out) fail('Falta --out <pasta>.');

const licenseDir = resolve(values.license);
for (const file of ['efds-license.json', 'efds-license.js']) {
  if (!existsSync(join(licenseDir, file))) fail(`Não achei ${file} em ${licenseDir}.`);
}
const licenseJson = JSON.parse(readFileSync(join(licenseDir, 'efds-license.json'), 'utf8')) as {
  product?: string;
};
if (licenseJson.product !== undefined && licenseJson.product !== template) {
  fail(`A licença é do produto "${licenseJson.product}", não de "${template}".`);
}

const source = externalSource ?? join(templatesDir, template);
const htmlSource = join(source, 'html');
const reactSource = join(source, 'react');
const vendorSource = join(htmlSource, 'vendor', 'efds-ui');
const licensePkg = join(templatesDir, 'license', 'dist', 'pkg');
if (!existsSync(htmlSource) || !existsSync(reactSource)) fail(`Template incompleto: ${source}.`);
if (!existsSync(vendorSource))
  fail('Faltam os arquivos de vendor. Rode "pnpm build" e "pnpm templates:vendor".');
if (!existsSync(join(licensePkg, 'index.js')))
  fail('Falta o build ESM da licença. Rode "pnpm build".');

const version = (
  JSON.parse(readFileSync(join(root, 'packages', 'core', 'package.json'), 'utf8')) as {
    version: string;
  }
).version;
const catalog = parseCatalog(readFileSync(join(root, 'pnpm-workspace.yaml'), 'utf8'));

const outRoot = resolve(values.out);
const folderName = `efds-${template}`;
const target = join(outRoot, folderName);
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });

const skipSource = (path: string): boolean => {
  const name = path.split(/[\\/]/).pop() ?? '';
  return (
    name === 'node_modules' ||
    name === 'dist' ||
    name === '.env' ||
    name === '.DS_Store' ||
    name.endsWith('.tsbuildinfo') ||
    name === 'efds-license.json' ||
    name === 'efds-license.js'
  );
};

// html/
const htmlTarget = join(target, 'html');
cpSync(htmlSource, htmlTarget, { recursive: true, filter: (p) => !skipSource(p) });
cpSync(join(licenseDir, 'efds-license.json'), join(htmlTarget, 'efds-license.json'));
cpSync(join(licenseDir, 'efds-license.js'), join(htmlTarget, 'efds-license.js'));
writeText(join(htmlTarget, 'efds-config.js'), configJsFile(''));

// react/
const reactTarget = join(target, 'react');
cpSync(reactSource, reactTarget, { recursive: true, filter: (p) => !skipSource(p) });
cpSync(join(licenseDir, 'efds-license.json'), join(reactTarget, 'src', 'efds-license.json'));
writeText(
  join(reactTarget, '.env.example'),
  '# Cole a chave de licença que acompanha o seu arquivo de licença.\nVITE_EFDS_LICENSE_KEY=\n',
);

// O vite.config.ts do repositório aponta para o código-fonte dos pacotes; o download usa os do npm.
writeText(
  join(reactTarget, 'vite.config.ts'),
  [
    "import react from '@vitejs/plugin-react';",
    "import { defineConfig } from 'vite';",
    '',
    'export default defineConfig({',
    '  plugins: [react()],',
    "  server: { host: '127.0.0.1' },",
    '});',
    '',
  ].join('\n'),
);

const pkgPath = join(reactTarget, 'package.json');
const pkg = transformPackageJson(JSON.parse(readFileSync(pkgPath, 'utf8')) as PackageJson, {
  catalog,
  version,
});
delete pkg.private;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

const tsconfigPath = join(reactTarget, 'tsconfig.json');
if (existsSync(tsconfigPath)) {
  const resolved = inlineTsconfig(
    JSON.parse(readFileSync(tsconfigPath, 'utf8')) as TsConfigLike,
    (file) =>
      JSON.parse(
        readFileSync(join(root, 'tooling', 'typescript-config', file), 'utf8'),
      ) as TsConfigLike,
  );
  writeFileSync(tsconfigPath, `${JSON.stringify(resolved, null, 2)}\n`);
}

// vendor/template-license (build ESM)
const vendorLicense = join(reactTarget, 'vendor', 'template-license');
cpSync(licensePkg, vendorLicense, { recursive: true });
writeFileSync(
  join(vendorLicense, 'package.json'),
  `${JSON.stringify(
    {
      name: '@efds-ui/template-license',
      version,
      license: 'MIT',
      type: 'module',
      main: './index.js',
      types: './index.d.ts',
      exports: {
        '.': { types: './index.d.ts', default: './index.js' },
        './react': { types: './react.d.ts', default: './react.js' },
      },
      dependencies: { '@noble/curves': catalog['@noble/curves'] ?? '^2.4.0' },
      peerDependencies: { '@efds-ui/react': `^${version}`, react: '^18.0.0 || ^19.0.0' },
    },
    null,
    2,
  )}\n`,
);

// README e LICENSE
writeText(
  join(target, 'README.md'),
  `# efDS.ui - template ${template}

Este download traz o mesmo template em duas versões: \`html/\` (HTML puro, para PHP, Java, .NET) e
\`react/\` (Vite + React). Os dados são fictícios.

## Chave de licença

Junto com o arquivo de licença (\`efds-license.json\`) você recebeu uma **chave**. Sem ela o template
não executa e mostra uma tela de bloqueio explicando o motivo. A verificação é local: não chama
nenhum servidor.

## HTML

1. Abra \`html/efds-config.js\` e cole a chave entre as aspas de \`window.EFDS_LICENSE_KEY = ''\`.
2. Sirva a pasta \`html/\` em um servidor (qualquer um; para testar: \`npx serve html\`).
3. Abra \`index.html\`. Os arquivos do efDS.ui já estão em \`vendor/\`; nada é carregado de CDN.

## React

1. Copie \`.env.example\` para \`.env\` e cole a chave em \`VITE_EFDS_LICENSE_KEY\`.
2. Rode \`npm install\` e depois \`npm run dev\`.
3. \`npm run build\` gera a pasta \`dist/\` para publicar.

Se a licença for de um site (ou de vários), o template só roda nos domínios listados em
\`efds-license.json\` e nos seus subdomínios.

Documentação: https://efds-ui.com.br/#/templates/licenca
`,
);
// Template com licença própria (premium): LICENSE na pasta do template; senão, a MIT do repositório.
const ownLicense = join(source, 'LICENSE');
cpSync(existsSync(ownLicense) ? ownLicense : join(root, 'LICENSE'), join(target, 'LICENSE'));

// .zip
const entries: ZipEntry[] = [];
const walk = (dir: string): void => {
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else
      entries.push({
        name: `${folderName}/${relative(target, full).split('\\').join('/')}`,
        data: new Uint8Array(readFileSync(full)),
      });
  }
};
walk(target);
const zipPath = join(outRoot, `${folderName}.zip`);
writeFileSync(zipPath, createZip(entries));

console.log(`Pasta: ${target}`);
console.log(`Zip:   ${zipPath} (${entries.length} arquivos)`);
