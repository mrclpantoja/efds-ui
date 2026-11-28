/**
 * Interface comum dos drivers de armazenamento. O serviço só conhece isto.
 *
 * Todos os caminhos são lógicos ("/contratos/a.pdf"), já normalizados pelo serviço.
 * Os caminhos internos "/.trash/..." e "/.versions/..." só são usados pelo serviço e pelos drivers.
 *
 * @typedef {{ type: 'file' | 'folder', size?: number, modified?: string }} DriverStat
 * @typedef {{ name: string } & DriverStat} DriverEntry
 * @typedef {{ stream: import('node:stream').Readable, size: number, modified?: string,
 *             rangeSupported: boolean, contentType?: string }} DriverObject
 *
 * @typedef {object} StorageDriver
 * @property {'fs' | 's3'} kind
 * @property {() => Promise<boolean>} supportsVersions  histórico de versões disponível?
 * @property {() => boolean} supportsDirectUpload       upload direto por URL assinada disponível?
 * @property {(path: string) => Promise<DriverStat | null>} stat
 * @property {(path: string) => Promise<DriverEntry[]>} list         filhos diretos (sem itens ocultos)
 * @property {(path: string, o?: { limit?: number }) => Promise<(DriverEntry & { path: string })[]>} walk
 * @property {(path: string, o?: { parents?: boolean }) => Promise<void>} mkdir
 * @property {(path: string, data: Buffer, o?: { contentType?: string, overwrite?: boolean }) => Promise<DriverStat>} put
 * @property {(path: string, o?: { version?: string, range?: { start: number, end: number } }) => Promise<DriverObject>} get
 * @property {(from: string, to: string, o?: { overwrite?: boolean }) => Promise<void>} copy
 * @property {(from: string, to: string, o?: { overwrite?: boolean }) => Promise<void>} move
 * @property {(path: string) => Promise<void>} remove                remoção definitiva (inclui histórico)
 * @property {(path: string) => Promise<{ version: string, modified: string, size: number, author?: string, current?: boolean }[]>} versions
 * @property {(path: string, version: string) => Promise<DriverStat>} restoreVersion
 * @property {(path: string) => Promise<string | null>} readText
 * @property {(path: string, o: object) => Promise<string | null>} presignDownload  null = não suportado
 * @property {(path: string, o: object) => Promise<{ url: string, method: string, headers?: object } | null>} presignUpload
 *
 */
/**
 * @param {import('../config.js').Config} config
 * @returns {Promise<any>} StorageDriver
 */
export async function createDriver(config) {
  if (config.driver === 's3') {
    // Import dinâmico: quem usa só o disco não precisa instalar o SDK da AWS.
    const { createS3Driver } = await import('./s3.js');
    return createS3Driver(config.s3);
  }
  const { createFsDriver } = await import('./fs.js');
  return createFsDriver({ root: config.root, maxVersions: config.maxVersions });
}
