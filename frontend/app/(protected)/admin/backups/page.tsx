"use client";

import { useEffect, useMemo, useState } from 'react';
import { apiClient, BackupMetadata, BackupJob } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type BackupFormState = {
  includeDb: boolean;
  includeUploads: boolean;
  includeEnv: boolean;
  includeCerts: boolean;
  encrypt: boolean;
  passphrase: string;
};

type RestoreFormState = {
  mode: 'staged' | 'in-place';
  restoreDb: boolean;
  restoreUploads: boolean;
  restoreEnv: boolean;
  restoreCerts: boolean;
  passphrase: string;
};

const formatBytes = (bytes: number) => {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, idx);
  return `${value.toFixed(2)} ${units[idx]}`;
};

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

export default function BackupsPage() {
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [backupForm, setBackupForm] = useState<BackupFormState>({
    includeDb: true,
    includeUploads: true,
    includeEnv: true,
    includeCerts: true,
    encrypt: false,
    passphrase: '',
  });

  const [restoreForm, setRestoreForm] = useState<RestoreFormState>({
    mode: 'staged',
    restoreDb: true,
    restoreUploads: true,
    restoreEnv: false,
    restoreCerts: false,
    passphrase: '',
  });

  const [selectedBackup, setSelectedBackup] = useState<BackupMetadata | null>(null);
  const [activeJob, setActiveJob] = useState<BackupJob | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const loadBackups = async () => {
    try {
      setLoading(true);
      const response = await apiClient.listBackups();
      setBackups(response.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load backups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  useEffect(() => {
    if (!jobId) return;
    const interval = window.setInterval(async () => {
      try {
        const response = await apiClient.getBackupJob(jobId);
        setActiveJob(response.data as BackupJob);
        if (response.data.status === 'completed' || response.data.status === 'failed') {
          window.clearInterval(interval);
          setJobId(null);
          loadBackups();
        }
      } catch (err) {
        window.clearInterval(interval);
        setJobId(null);
      }
    }, 2000);

    return () => window.clearInterval(interval);
  }, [jobId]);

  const handleCreateBackup = async () => {
    try {
      setError('');
      setSuccess('');
      const response = await apiClient.createBackup({
        includeDb: backupForm.includeDb,
        includeUploads: backupForm.includeUploads,
        includeEnv: backupForm.includeEnv,
        includeCerts: backupForm.includeCerts,
        encrypt: backupForm.encrypt,
        passphrase: backupForm.encrypt ? backupForm.passphrase : undefined,
      });
      setJobId(response.data.jobId);
      setSuccess('Backup started. It may take a few minutes.');
    } catch (err: any) {
      setError(err.message || 'Failed to start backup');
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackup) return;
    try {
      setError('');
      setSuccess('');
      const response = await apiClient.restoreBackup(selectedBackup.id, {
        mode: restoreForm.mode,
        restoreDb: restoreForm.restoreDb,
        restoreUploads: restoreForm.restoreUploads,
        restoreEnv: restoreForm.restoreEnv,
        restoreCerts: restoreForm.restoreCerts,
        passphrase: selectedBackup.encrypted ? restoreForm.passphrase : undefined,
      });
      setJobId(response.data.jobId);
      setSuccess('Restore started.');
    } catch (err: any) {
      setError(err.message || 'Failed to start restore');
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    try {
      setError('');
      await apiClient.deleteBackup(backupId);
      setSuccess('Backup deleted');
      loadBackups();
    } catch (err: any) {
      setError(err.message || 'Failed to delete backup');
    }
  };

  const handleDownload = (backupId: string) => {
    if (typeof window === 'undefined') return;
    window.location.href = `${window.location.origin}/api/v1/admin/backups/${backupId}/download`;
  };

  const handleDownloadBundle = (backupId: string) => {
    if (typeof window === 'undefined') return;
    window.location.href = `${window.location.origin}/api/v1/admin/backups/${backupId}/bundle`;
  };

  const includesLabel = (backup: BackupMetadata) => {
    const parts = [];
    if (backup.includes.db) parts.push('db');
    if (backup.includes.uploads) parts.push('uploads');
    if (backup.includes.env) parts.push('env');
    if (backup.includes.certs) parts.push('certs');
    return parts.length > 0 ? parts.join(', ') : 'none';
  };

  const restoreHelp = useMemo(() => {
    if (restoreForm.mode === 'staged') {
      return 'Staged restore keeps the current site running. You will get a new database name to cut over later.';
    }
    return 'In-place restore overwrites the current database and may cause downtime.';
  }, [restoreForm.mode]);

  return (
    <div className="container py-12">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Backups</h1>
            <p className="text-muted-foreground">Create and restore full backups.</p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {success}
          </div>
        )}

        {activeJob && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
            Job {activeJob.id}: {activeJob.status}
            {activeJob.message ? ` (${activeJob.message})` : ''}
            {activeJob.status === 'completed' && activeJob.result?.stagedDatabase && (
              <div className="mt-2 text-xs text-blue-800">
                Staged database: {activeJob.result.stagedDatabase}
                <div className="mt-1">
                  Update DATABASE_URL to point to this database and restart the backend to cut over.
                </div>
              </div>
            )}
            {activeJob.status === 'completed' && activeJob.result?.envPath && (
              <div className="mt-1 text-xs text-blue-800">
                Restored config at: {activeJob.result.envPath}
              </div>
            )}
            {activeJob.status === 'completed' && activeJob.result?.certsPath && (
              <div className="mt-1 text-xs text-blue-800">
                Restored certs at: {activeJob.result.certsPath}
              </div>
            )}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Create Backup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={backupForm.includeDb}
                  onChange={(e) => setBackupForm((prev) => ({ ...prev, includeDb: e.target.checked }))}
                />
                Database (required)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={backupForm.includeUploads}
                  onChange={(e) => setBackupForm((prev) => ({ ...prev, includeUploads: e.target.checked }))}
                />
                Uploads
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={backupForm.includeEnv}
                  onChange={(e) => setBackupForm((prev) => ({ ...prev, includeEnv: e.target.checked }))}
                />
                Config (.env)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={backupForm.includeCerts}
                  onChange={(e) => setBackupForm((prev) => ({ ...prev, includeCerts: e.target.checked }))}
                />
                TLS certs
              </label>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={backupForm.encrypt}
                  onChange={(e) => setBackupForm((prev) => ({ ...prev, encrypt: e.target.checked }))}
                />
                Encrypt with GPG (recommended)
              </label>
              {backupForm.encrypt && (
                <div className="max-w-md">
                  <Label htmlFor="backup-passphrase">Passphrase</Label>
                  <Input
                    id="backup-passphrase"
                    type="password"
                    value={backupForm.passphrase}
                    onChange={(e) => setBackupForm((prev) => ({ ...prev, passphrase: e.target.value }))}
                    placeholder="Enter a strong passphrase"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">Passphrase is not stored. Keep it safe.</p>
                </div>
              )}
            </div>

            <Button onClick={handleCreateBackup}>Start Backup</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Available Backups</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading backups...</p>
            ) : backups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No backups yet.</p>
            ) : (
              <div className="space-y-4">
                {backups.map((backup) => (
                  <div key={backup.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{backup.id}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(backup.createdAt)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatBytes(backup.size)} · {includesLabel(backup)}{backup.encrypted ? ' · encrypted' : ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => handleDownload(backup.id)}>Download</Button>
                        <Button variant="outline" onClick={() => handleDownloadBundle(backup.id)}>Restore Bundle</Button>
                        <Button variant="outline" onClick={() => setSelectedBackup(backup)}>Restore</Button>
                        <Button variant="destructive" onClick={() => handleDeleteBackup(backup.id)}>Delete</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Restore Backup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedBackup ? (
              <>
                <p className="text-sm text-muted-foreground">Selected: {selectedBackup.id}</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={restoreForm.mode === 'staged'}
                      onChange={() => setRestoreForm((prev) => ({ ...prev, mode: 'staged' }))}
                    />
                    Staged restore (recommended)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={restoreForm.mode === 'in-place'}
                      onChange={() => setRestoreForm((prev) => ({ ...prev, mode: 'in-place' }))}
                    />
                    In-place restore (downtime)
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">{restoreHelp}</p>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={restoreForm.restoreDb}
                      onChange={(e) => setRestoreForm((prev) => ({ ...prev, restoreDb: e.target.checked }))}
                    />
                    Database
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={restoreForm.restoreUploads}
                      onChange={(e) => setRestoreForm((prev) => ({ ...prev, restoreUploads: e.target.checked }))}
                    />
                    Uploads
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={restoreForm.restoreEnv}
                      onChange={(e) => setRestoreForm((prev) => ({ ...prev, restoreEnv: e.target.checked }))}
                    />
                    Config (.env)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={restoreForm.restoreCerts}
                      onChange={(e) => setRestoreForm((prev) => ({ ...prev, restoreCerts: e.target.checked }))}
                    />
                    TLS certs
                  </label>
                </div>

                {selectedBackup.encrypted && (
                  <div className="max-w-md">
                    <Label htmlFor="restore-passphrase">Passphrase</Label>
                    <Input
                      id="restore-passphrase"
                      type="password"
                      value={restoreForm.passphrase}
                      onChange={(e) => setRestoreForm((prev) => ({ ...prev, passphrase: e.target.value }))}
                      placeholder="Enter the backup passphrase"
                    />
                  </div>
                )}

                <Button onClick={handleRestoreBackup}>Start Restore</Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Select a backup to restore.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
