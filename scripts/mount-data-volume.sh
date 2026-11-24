#!/usr/bin/env bash
set -euo pipefail

VOLUME_UUID="${1:?Indica el UUID del sistema de archivos}"
MOUNT_DIR="/data/dgraph"

if [[ ! "$VOLUME_UUID" =~ ^[a-fA-F0-9-]+$ ]]; then
  echo "UUID no válido." >&2
  exit 1
fi

DEVICE="$(sudo blkid -U "$VOLUME_UUID")"

if [[ -z "$DEVICE" ]]; then
  echo "No se encontró un volumen con ese UUID." >&2
  exit 1
fi

FS_TYPE="$(sudo blkid -s TYPE -o value "$DEVICE")"

if [[ "$FS_TYPE" != "xfs" ]]; then
  echo "Se esperaba XFS; se encontró: $FS_TYPE" >&2
  exit 1
fi

sudo mkdir -p "$MOUNT_DIR"

# Si ya está montado, comprobar que sea el volumen correcto.
if mountpoint -q "$MOUNT_DIR"; then
  CURRENT_UUID="$(findmnt -n -o UUID --target "$MOUNT_DIR")"
  if [[ "$CURRENT_UUID" != "$VOLUME_UUID" ]]; then
    echo "Hay otro volumen montado en $MOUNT_DIR." >&2
    exit 1
  fi
elif [[ -n "$(sudo ls -A "$MOUNT_DIR")" ]]; then
  echo "El directorio contiene archivos sin un volumen montado." >&2
  echo "Revísalos antes de continuar."
  exit 1
fi

# No reemplazar una entrada existente que apunte a otro volumen.
EXISTING_SOURCE="$(awk '$2 == "/data/dgraph" {print $1}' /etc/fstab)"

if [[ -n "$EXISTING_SOURCE" ]]; then
  if [[ "$EXISTING_SOURCE" != "UUID=$VOLUME_UUID" ]]; then
    echo "La entrada existente en fstab no coincide." >&2
    exit 1
  fi
else
  sudo cp -a /etc/fstab "/etc/fstab.backup-$(date +%Y%m%d%H%M%S)"
  echo "UUID=$VOLUME_UUID $MOUNT_DIR xfs defaults,nofail 0 2" \
    | sudo tee -a /etc/fstab
fi

sudo systemctl daemon-reload
sudo findmnt --verify --verbose

if ! mountpoint -q "$MOUNT_DIR"; then
  sudo mount "$MOUNT_DIR"
fi

df -hT "$MOUNT_DIR"