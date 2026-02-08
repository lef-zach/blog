import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import crypto from 'crypto';
import { config } from '../config';

type BackupIncludes = {
  db: boolean;
  uploads: boolean;
  env: boolean;
  certs: boolean;
};

export type BackupOptions = {
  includes: BackupIncludes;
  encrypt: boolean;
  passphrase?: string;
};

export type RestoreOptions = {
  mode: 'staged' | 'in-place';
  restoreDb: boolean;
  restoreUploads: boolean;
  restoreEnv: boolean;
  restoreCerts: boolean;
  passphrase?: string;
};

export type BackupMetadata = {
  id: string;
  createdAt: string;
  filename: string;
  encrypted: boolean;
  includes: BackupIncludes;
  size: number;
  s3Key?: string;
};

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export type BackupJob = {
  id: string;
  type: 'backup' | 'restore';
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  message?: string;
  result?: any;
};

const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
};

const runCommand = (
  command: string,
  args: string[],
  options?: { env?: NodeJS.ProcessEnv; input?: string }
) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      env: options?.env || process.env,
      stdio: ['pipe', 'inherit', 'inherit'],
    });

    if (options?.input) {
      child.stdin.write(options.input);
      child.stdin.end();
    }

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });

const parseDatabaseUrl = () => {
  const dbUrl = config.database.url;
  if (!dbUrl) {
    throw new Error('DATABASE_URL is not configured');
  }

  const url = new URL(dbUrl);
  const database = url.pathname.replace(/^\//, '');
  return {
    host: url.hostname,
    port: url.port || '5432',
    user: decodeURIComponent(url.username || ''),
    password: decodeURIComponent(url.password || ''),
    database,
  };
};

const backupRoot = () => config.backup.dir;
const backupsDir = () => path.join(backupRoot(), 'files');
const metadataDir = () => path.join(backupRoot(), 'metadata');
const jobsDir = () => path.join(backupRoot(), 'jobs');
const tmpDir = () => path.join(backupRoot(), 'tmp');

const writeJob = async (job: BackupJob) => {
  await ensureDir(jobsDir());
  await fs.writeFile(path.join(jobsDir(), `${job.id}.json`), JSON.stringify(job, null, 2));
};

const readJob = async (jobId: string): Promise<BackupJob | null> => {
  try {
    const content = await fs.readFile(path.join(jobsDir(), `${jobId}.json`), 'utf8');
    return JSON.parse(content) as BackupJob;
  } catch {
    return null;
  }
};

const writeMetadata = async (metadata: BackupMetadata) => {
  await ensureDir(metadataDir());
  await fs.writeFile(path.join(metadataDir(), `${metadata.id}.json`), JSON.stringify(metadata, null, 2));
};

const readMetadata = async (backupId: string): Promise<BackupMetadata | null> => {
  try {
    const content = await fs.readFile(path.join(metadataDir(), `${backupId}.json`), 'utf8');
    return JSON.parse(content) as BackupMetadata;
  } catch {
    return null;
  }
};

const listMetadata = async (): Promise<BackupMetadata[]> => {
  try {
    await ensureDir(metadataDir());
    const files = await fs.readdir(metadataDir());
    const items = await Promise.all(
      files
        .filter((file) => file.endsWith('.json'))
        .map(async (file) => {
          const content = await fs.readFile(path.join(metadataDir(), file), 'utf8');
          return JSON.parse(content) as BackupMetadata;
        })
    );
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
};

const getSafeId = (prefix: string) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const rand = crypto.randomBytes(4).toString('hex');
  return `${prefix}-${timestamp}-${rand}`;
};

const enforceRetention = async () => {
  const retentionDays = Number.isFinite(config.backup.retentionDays) && config.backup.retentionDays > 0
    ? config.backup.retentionDays
    : 30;
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const items = await listMetadata();

  for (const item of items) {
    const createdAt = Date.parse(item.createdAt);
    if (!Number.isNaN(createdAt) && createdAt < cutoff) {
      await deleteBackup(item.id).catch(() => undefined);
    }
  }
};

const encryptFile = async (inputFile: string, passphrase: string) => {
  const outputFile = `${inputFile}.gpg`;
  await runCommand('gpg', ['--batch', '--yes', '--pinentry-mode', 'loopback', '--passphrase-fd', '0', '-c', inputFile], {
    input: passphrase,
  });
  await fs.unlink(inputFile);
  return outputFile;
};

const decryptFile = async (inputFile: string, outputFile: string, passphrase: string) => {
  await runCommand('gpg', ['--batch', '--yes', '--pinentry-mode', 'loopback', '--passphrase-fd', '0', '-o', outputFile, '-d', inputFile], {
    input: passphrase,
  });
};

const createDbDump = async (outputFile: string) => {
  const { host, port, user, password, database } = parseDatabaseUrl();
  const env = { ...process.env, PGPASSWORD: password };
  await runCommand('pg_dump', ['-Fc', '--no-owner', '--no-privileges', '-h', host, '-p', port, '-U', user, '-f', outputFile, database], {
    env,
  });
};

const restoreDbDump = async (inputFile: string, database: string, clean: boolean) => {
  const { host, port, user, password } = parseDatabaseUrl();
  const env = { ...process.env, PGPASSWORD: password };
  const args = ['-h', host, '-p', port, '-U', user, '-d', database, '--no-owner', '--no-privileges'];
  if (clean) {
    args.push('--clean', '--if-exists');
  }
  args.push(inputFile);
  await runCommand('pg_restore', args, { env });
};

const createDatabase = async (database: string) => {
  const { host, port, user, password } = parseDatabaseUrl();
  const env = { ...process.env, PGPASSWORD: password };
  await runCommand('createdb', ['-h', host, '-p', port, '-U', user, database], { env });
};

const pathExists = async (target: string) => {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
};

const createArchiveFromPath = async (sourcePath: string, outputFile: string) => {
  await runCommand('tar', ['-czf', outputFile, '-C', sourcePath, '.']);
};

const extractArchiveToPath = async (archiveFile: string, targetPath: string) => {
  await ensureDir(targetPath);
  await runCommand('tar', ['-xzf', archiveFile, '-C', targetPath]);
};

const ensurePaths = async () => {
  await Promise.all([ensureDir(backupRoot()), ensureDir(backupsDir()), ensureDir(metadataDir()), ensureDir(jobsDir()), ensureDir(tmpDir())]);
};

const buildManifest = (id: string, includes: BackupIncludes, encrypted: boolean) => ({
  id,
  createdAt: new Date().toISOString(),
  includes,
  encrypted,
});

const buildRestoreInstructions = (metadata: BackupMetadata) => {
  return [
    'Restore Guide',
    '=============',
    '',
    `Backup ID: ${metadata.id}`,
    `Created: ${metadata.createdAt}`,
    `Encrypted: ${metadata.encrypted ? 'yes' : 'no'}`,
    `Includes: ${Object.entries(metadata.includes)
      .filter(([, value]) => value)
      .map(([key]) => key)
      .join(', ') || 'none'}`,
    '',
    'Contents',
    '--------',
    '- backup archive (the .tar.gz or .tar.gz.gpg file)',
    '- metadata.json (place into /backups/metadata)',
    '- this restore guide',
    '',
    'Restore on an existing server (recommended, zero-downtime staged)',
    '-----------------------------------------------------------------',
    '1) Copy the backup file into /backups/files on the server.',
    '2) Copy metadata.json into /backups/metadata/<backup-id>.json.',
    '3) Open Admin -> Backups, select the backup, choose Staged restore.',
    '4) After restore completes, update DATABASE_URL to the staged DB name.',
    '5) Restart backend container to cut over.',
    '',
    'Restore on a brand new machine (manual DB restore)',
    '---------------------------------------------------',
    '1) Install Docker + Docker Compose.',
    '2) Clone the repo and configure backend/.env + frontend/.env.',
    '3) Start postgres: docker compose up -d postgres',
    '4) Decrypt the backup (if encrypted):',
    '   gpg --output backup.tar.gz -d <backup-file>.tar.gz.gpg',
    '5) Extract the archive:',
    '   tar -xzf backup.tar.gz',
    '6) Restore DB inside the backend container:',
    '   docker compose up -d backend',
    '   docker compose exec backend pg_restore -d <database> --clean --if-exists /path/to/db.dump',
    '7) Start the stack: docker compose up -d',
    '',
    'Notes',
    '-----',
    '- db.dump is included only if Database was selected.',
    '- uploads.tar.gz is included only if Uploads were selected.',
    '- env.tar.gz and certs.tar.gz are included if enabled.',
    '- If you restored to a staged DB, update DATABASE_URL and restart backend.',
  ].join('\n');
};

const bundleBackup = async (id: string, workingDir: string, encrypt: boolean, passphrase?: string) => {
  await ensureDir(backupsDir());
  const tarFile = path.join(backupsDir(), `${id}.tar.gz`);
  await runCommand('tar', ['-czf', tarFile, '-C', tmpDir(), id]);

  if (encrypt) {
    if (!passphrase) {
      throw new Error('Passphrase is required for encryption');
    }
    const encryptedFile = await encryptFile(tarFile, passphrase);
    return encryptedFile;
  }

  return tarFile;
};

const computeFileSize = async (filePath: string) => {
  const stats = await fs.stat(filePath);
  return stats.size;
};

const createRestoreBundleFile = async (backupId: string) => {
  await ensurePaths();
  const metadata = await readMetadata(backupId);
  if (!metadata) {
    throw new Error('Backup not found');
  }

  const archivePath = path.join(backupsDir(), metadata.filename);
  if (!(await pathExists(archivePath))) {
    throw new Error('Backup archive not found');
  }

  const bundleId = getSafeId('restore-bundle');
  const bundleDir = path.join(tmpDir(), bundleId);
  await ensureDir(bundleDir);

  await fs.copyFile(archivePath, path.join(bundleDir, metadata.filename));
  await fs.writeFile(path.join(bundleDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
  await fs.writeFile(path.join(bundleDir, 'restore-instructions.txt'), buildRestoreInstructions(metadata));

  const bundleFile = path.join(tmpDir(), `${bundleId}.tar.gz`);
  await runCommand('tar', ['-czf', bundleFile, '-C', bundleDir, '.']);

  return { bundleFile, bundleDir, bundleId };
};

const deleteBackup = async (backupId: string) => {
  const metadata = await readMetadata(backupId);
  if (!metadata) return;
  const filePath = path.join(backupsDir(), metadata.filename);
  await fs.rm(filePath, { force: true });
  await fs.rm(path.join(metadataDir(), `${backupId}.json`), { force: true });
};

export const backupService = {
  async listBackups() {
    return listMetadata();
  },

  async getBackup(backupId: string) {
    return readMetadata(backupId);
  },

  async deleteBackup(backupId: string) {
    await deleteBackup(backupId);
  },

  async createRestoreBundle(backupId: string) {
    const { bundleFile, bundleDir } = await createRestoreBundleFile(backupId);
    return { bundleFile, bundleDir };
  },

  async getJob(jobId: string) {
    return readJob(jobId);
  },

  async createBackupJob(options: BackupOptions) {
    await ensurePaths();
    const jobId = getSafeId('backup');
    const job: BackupJob = {
      id: jobId,
      type: 'backup',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await writeJob(job);

    setImmediate(async () => {
      const started: BackupJob = { ...job, status: 'running', updatedAt: new Date().toISOString() };
      await writeJob(started);
      try {
        const result = await this.createBackup(jobId, options);
        await writeJob({
          ...started,
          status: 'completed',
          updatedAt: new Date().toISOString(),
          result,
        });
      } catch (error: any) {
        await writeJob({
          ...started,
          status: 'failed',
          updatedAt: new Date().toISOString(),
          message: error?.message || 'Backup failed',
        });
      }
    });

    return jobId;
  },

  async createBackup(jobId: string, options: BackupOptions) {
    await ensurePaths();
    const id = getSafeId('backup');
    const workingDir = path.join(tmpDir(), id);
    await ensureDir(workingDir);

    const includes = options.includes;
    const manifest = buildManifest(id, includes, options.encrypt);
    const files: string[] = [];

    if (includes.db) {
      const dbDump = path.join(workingDir, 'db.dump');
      await createDbDump(dbDump);
      files.push('db.dump');
    }

    if (includes.uploads) {
      const uploadsPath = config.backup.uploadsPath;
      if (await pathExists(uploadsPath)) {
        const uploadsArchive = path.join(workingDir, 'uploads.tar.gz');
        await createArchiveFromPath(uploadsPath, uploadsArchive);
        files.push('uploads.tar.gz');
      }
    }

    if (includes.env) {
      const envArchive = path.join(workingDir, 'env.tar.gz');
      const envDir = path.join(workingDir, 'env');
      const envFiles: { source: string; target: string }[] = [];

      if (await pathExists(config.backup.backendEnvPath)) {
        envFiles.push({
          source: config.backup.backendEnvPath,
          target: path.join(envDir, 'backend.env'),
        });
      }
      if (await pathExists(config.backup.frontendEnvPath)) {
        envFiles.push({
          source: config.backup.frontendEnvPath,
          target: path.join(envDir, 'frontend.env'),
        });
      }

      if (envFiles.length > 0) {
        await ensureDir(envDir);
        await Promise.all(
          envFiles.map(async (entry) => {
            await fs.copyFile(entry.source, entry.target);
          })
        );
        await createArchiveFromPath(envDir, envArchive);
        files.push('env.tar.gz');
      }
    }

    if (includes.certs) {
      const certsPath = config.backup.certsPath;
      if (await pathExists(certsPath)) {
        const certsArchive = path.join(workingDir, 'certs.tar.gz');
        await createArchiveFromPath(certsPath, certsArchive);
        files.push('certs.tar.gz');
      }
    }

    await fs.writeFile(path.join(workingDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    files.push('manifest.json');

    const bundledFile = await bundleBackup(id, workingDir, options.encrypt, options.passphrase);
    const filename = path.basename(bundledFile);
    const size = await computeFileSize(bundledFile);

    await writeMetadata({
      id,
      createdAt: manifest.createdAt,
      filename,
      encrypted: options.encrypt,
      includes,
      size,
    });

    await fs.rm(workingDir, { recursive: true, force: true });

    await enforceRetention();

    return { backupId: id, filename, size };
  },

  async restoreBackupJob(backupId: string, options: RestoreOptions) {
    await ensurePaths();
    const jobId = getSafeId('restore');
    const job: BackupJob = {
      id: jobId,
      type: 'restore',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await writeJob(job);

    setImmediate(async () => {
      const started: BackupJob = { ...job, status: 'running', updatedAt: new Date().toISOString() };
      await writeJob(started);
      try {
        const result = await this.restoreBackup(backupId, options);
        await writeJob({
          ...started,
          status: 'completed',
          updatedAt: new Date().toISOString(),
          result,
        });
      } catch (error: any) {
        await writeJob({
          ...started,
          status: 'failed',
          updatedAt: new Date().toISOString(),
          message: error?.message || 'Restore failed',
        });
      }
    });

    return jobId;
  },

  async restoreBackup(backupId: string, options: RestoreOptions) {
    await ensurePaths();
    const metadata = await readMetadata(backupId);
    if (!metadata) {
      throw new Error('Backup not found');
    }

    const archivePath = path.join(backupsDir(), metadata.filename);
    const workId = getSafeId('restore');
    const workDir = path.join(tmpDir(), workId);
    await ensureDir(workDir);

    let tarPath = archivePath;
    if (metadata.encrypted) {
      if (!options.passphrase) {
        throw new Error('Passphrase is required to restore encrypted backup');
      }
      tarPath = path.join(workDir, `${backupId}.tar.gz`);
      await decryptFile(archivePath, tarPath, options.passphrase);
    }

    await runCommand('tar', ['-xzf', tarPath, '-C', workDir]);

    const extractedDir = path.join(workDir, backupId);
    const manifestPath = path.join(extractedDir, 'manifest.json');
    const manifestRaw = await fs.readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestRaw) as { includes: BackupIncludes };

    const restoreResult: Record<string, any> = {};

    if (options.restoreDb && manifest.includes.db) {
      const dbDump = path.join(extractedDir, 'db.dump');
      if (options.mode === 'staged') {
        const { database } = parseDatabaseUrl();
        const newDatabase = `${database}_restore_${Date.now()}`;
        await createDatabase(newDatabase);
        await restoreDbDump(dbDump, newDatabase, false);
        restoreResult.stagedDatabase = newDatabase;
      } else {
        const { database } = parseDatabaseUrl();
        await restoreDbDump(dbDump, database, true);
        restoreResult.inPlace = true;
      }
    }

    if (options.restoreUploads && manifest.includes.uploads) {
      const uploadsArchive = path.join(extractedDir, 'uploads.tar.gz');
      if (await pathExists(uploadsArchive)) {
        await extractArchiveToPath(uploadsArchive, config.backup.uploadsPath);
        restoreResult.uploads = config.backup.uploadsPath;
      }
    }

    if (options.restoreEnv && manifest.includes.env) {
      const envArchive = path.join(extractedDir, 'env.tar.gz');
      if (await pathExists(envArchive)) {
        const envRestorePath = path.join(backupRoot(), 'restored-config', workId);
        await extractArchiveToPath(envArchive, envRestorePath);
        restoreResult.envPath = envRestorePath;
      }
    }

    if (options.restoreCerts && manifest.includes.certs) {
      const certsArchive = path.join(extractedDir, 'certs.tar.gz');
      if (await pathExists(certsArchive)) {
        const certsRestorePath = path.join(backupRoot(), 'restored-certs', workId);
        await extractArchiveToPath(certsArchive, certsRestorePath);
        restoreResult.certsPath = certsRestorePath;
      }
    }

    await fs.rm(workDir, { recursive: true, force: true });
    return restoreResult;
  },
};
