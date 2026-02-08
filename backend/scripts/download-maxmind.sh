#!/bin/sh
set -e

if [ -z "$MAXMIND_LICENSE_KEY" ]; then
  echo "MAXMIND_LICENSE_KEY is required"
  exit 1
fi

EDITION_ID=${MAXMIND_EDITION_ID:-GeoLite2-City}
DEST_DIR=${MAXMIND_DEST_DIR:-./data}

mkdir -p "$DEST_DIR"

TMP_DIR=$(mktemp -d)
ARCHIVE="$TMP_DIR/maxmind.tar.gz"
URL="https://download.maxmind.com/app/geoip_download?edition_id=${EDITION_ID}&license_key=${MAXMIND_LICENSE_KEY}&suffix=tar.gz"

if command -v curl >/dev/null 2>&1; then
  curl -fsSL -o "$ARCHIVE" "$URL"
elif command -v wget >/dev/null 2>&1; then
  wget -O "$ARCHIVE" "$URL"
else
  echo "curl or wget is required to download MaxMind database"
  exit 1
fi

tar -xzf "$ARCHIVE" -C "$TMP_DIR"

DB_PATH=$(find "$TMP_DIR" -name "${EDITION_ID}.mmdb" | head -n 1)
if [ -z "$DB_PATH" ]; then
  echo "MaxMind database not found after extraction"
  exit 1
fi

cp "$DB_PATH" "$DEST_DIR/${EDITION_ID}.mmdb"
echo "MaxMind database saved to $DEST_DIR/${EDITION_ID}.mmdb"
