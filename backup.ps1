# Ruh Theme — SQLite Günlük Backup Scripti (Aşama 4)
# Kullanım: .\backup.ps1
# Cron (Windows Task Scheduler) ile her gün otomatik çalıştırılabilir.

$DbPath = Join-Path $PSScriptRoot "data\manga.db"
$BackupDir = Join-Path $PSScriptRoot "data\backup"
$Date = Get-Date -Format "yyyyMMdd_HHmm"
$BackupPath = Join-Path $BackupDir "manga_$Date.db"

# Backup dizini yoksa oluştur
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

# SQLite .backup komutu ile güvenli kopya al
$SqliteCmd = "sqlite3"
& $SqliteCmd $DbPath ".backup '$BackupPath'"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backup alındı: $BackupPath"
} else {
    Write-Host "❌ Backup başarısız! sqlite3 kurulu mu?"
}

# 30 günden eski backupları sil
Get-ChildItem -Path $BackupDir -Filter "manga_*.db" |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
    Remove-Item -Force

Write-Host "🧹 30 günden eski backuplar temizlendi."