#!/bin/bash
# Deploy-Script für TRUE App → STRATO VPS
# Ausführen mit: bash deploy.sh

set -e  # Abbruch bei jedem Fehler

SERVER="root@82.165.114.183"
REMOTE="/var/www/true"
LOCAL="/Users/josiias878/Desktop/TRUE"

echo "▶ 1/5  Dateien zum Server übertragen..."
rsync -az --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.env.local' \
  "$LOCAL/" "$SERVER:$REMOTE/"

echo "▶ 2/5  Env-Variablen auf Server setzen..."
ssh "$SERVER" "
  # Helper: upsert a KEY=VALUE in .env.local
  upsert_env() {
    local KEY=\$1 VAL=\$2
    if grep -q \"^\$KEY=\" $REMOTE/.env.local 2>/dev/null; then
      sed -i \"s|^\$KEY=.*|\$KEY=\$VAL|\" $REMOTE/.env.local
      echo \"   \$KEY aktualisiert\"
    else
      echo \"\$KEY=\$VAL\" >> $REMOTE/.env.local
      echo \"   \$KEY hinzugefügt\"
    fi
  }
  upsert_env CRON_SECRET         truecron2026secure
  upsert_env ADMIN_SECRET        true2026admin
  upsert_env NEXT_PUBLIC_ADMIN_SECRET true2026admin
"

echo "▶ 3/5  Dependencies installieren & Build starten..."
ssh "$SERVER" "
  cd $REMOTE &&
  npm install --legacy-peer-deps &&
  npm run build
"

echo "▶ 4/5  Cron-Jobs aktualisieren (neues Secret)..."
ssh "$SERVER" "
  # Aktuelle Crontab sichern
  crontab -l > /tmp/crontab_backup.txt 2>/dev/null || true

  # Altes Secret durch neues ersetzen
  sed -i 's/secret=true-cron-2024/secret=truecron2026secure/g' /tmp/crontab_backup.txt

  # Crontab neu laden
  crontab /tmp/crontab_backup.txt
  echo '   Cron-Jobs aktualisiert:'
  crontab -l | grep cron
"

echo "▶ 5/5  PM2 neu starten..."
ssh "$SERVER" "pm2 restart 0 && pm2 status"

echo ""
echo "✓ Deploy abgeschlossen — https://get-true.de"
