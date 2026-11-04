#!/usr/bin/env bash
# Homebase Hub in its own small container on Proxmox VE. Run it on the Proxmox host (Datacenter > your node > Shell):
#
#   curl -fsSLO https://raw.githubusercontent.com/Jackpison/Homebase-Hub/main/deploy/proxmox/homebase-hub-lxc.sh
#   less homebase-hub-lxc.sh                 read it first
#   bash homebase-hub-lxc.sh                 a Debian 13 container on your home network, without HTTPS
#   bash homebase-hub-lxc.sh --domain hub.example.com   with a domain that points at the container (HTTPS included)
#
# Options:  --id 120   --storage local-lvm   --template-storage local   --bridge vmbr0   --memory 1024 (MB)   --disk 8 (GB)
# It makes an unprivileged container that starts with the host, then runs deploy/vps/install.sh inside it.
set -euo pipefail
REPO=Jackpison/Homebase-Hub
ID=''; STORAGE=local-lvm; TSTORE=local; BRIDGE=vmbr0; MEMORY=1024; DISK=8; DOMAIN=''

die() { printf 'Homebase Hub on Proxmox: %s\n' "$*" >&2; exit 1; }
need() { if [ $# -lt 2 ] || [ -z "$2" ]; then die "$1 needs a value"; fi; }
while [ $# -gt 0 ]; do
  case "$1" in
    --id) need "$@"; ID=$2; shift ;;
    --storage) need "$@"; STORAGE=$2; shift ;;
    --template-storage) need "$@"; TSTORE=$2; shift ;;
    --bridge) need "$@"; BRIDGE=$2; shift ;;
    --memory) need "$@"; MEMORY=$2; shift ;;
    --disk) need "$@"; DISK=$2; shift ;;
    --domain) need "$@"; DOMAIN=$2; shift ;;
    -h|--help) sed -n '2,11p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) die "unknown option $1 (see --help)" ;;
  esac
  shift
done

[ "$(id -u)" = 0 ] || die "run it as root on the Proxmox host"
{ command -v pct && command -v pveam; } >/dev/null || die "pct is missing: run this on the Proxmox VE host, not inside a VM or container"
for v in "$STORAGE" "$TSTORE" "$BRIDGE"; do [[ "$v" =~ ^[A-Za-z0-9._-]+$ ]] || die "$v is not a storage or bridge name"; done
[[ "$MEMORY" =~ ^[0-9]+$ && "$MEMORY" -ge 512 ]] || die "--memory is in MB, at least 512"
[[ "$DISK" =~ ^[0-9]+$ && "$DISK" -ge 2 ]] || die "--disk is in GB, at least 2"
[ -z "$DOMAIN" ] || [[ "$DOMAIN" =~ ^([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$ ]] || die "$DOMAIN is not a domain name"
[ -n "$ID" ] || ID=$(pvesh get /cluster/nextid)
[[ "$ID" =~ ^[0-9]+$ ]] || die "--id must be a number"
! pct status "$ID" >/dev/null 2>&1 || die "container $ID already exists: choose another --id"

# the installer: next to this script (a copy of the repository), or from GitHub
HERE=$(cd "$(dirname "$0")" && pwd)
INSTALLER="$HERE/../vps/install.sh"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
if [ ! -f "$INSTALLER" ]; then
  INSTALLER=$TMP/install.sh
  curl -fsSL -o "$INSTALLER" "https://raw.githubusercontent.com/$REPO/main/deploy/vps/install.sh"
fi
head -1 "$INSTALLER" | grep -q bash || die "the installer did not download"

echo "== Finding the Debian 13 template"
pveam update >/dev/null || true
T=$(pveam available --section system | awk '{print $2}' | grep -E '^debian-13-standard_[0-9.-]+_amd64\.tar\.(zst|xz|gz)$' | sort -V | tail -1 || true)
[ -n "$T" ] || die "no Debian 13 template is offered (pveam available --section system)"
pveam list "$TSTORE" | grep -q "/$T" || pveam download "$TSTORE" "$T"

echo "== Making container $ID"
pct create "$ID" "$TSTORE:vztmpl/$T" --hostname homebase-hub --ostype debian --unprivileged 1 --features nesting=1 \
  --cores 1 --memory "$MEMORY" --swap 512 --rootfs "$STORAGE:$DISK" --net0 "name=eth0,bridge=$BRIDGE,ip=dhcp,ip6=auto" \
  --onboot 1 --description "Homebase Hub. Update it in Settings > Updates."
pct start "$ID"
for _ in $(seq 1 60); do
  pct exec "$ID" -- sh -c 'ip -4 route | grep -q default && getent hosts deb.debian.org >/dev/null' 2>/dev/null && break
  sleep 2
done
pct exec "$ID" -- sh -c 'getent hosts deb.debian.org >/dev/null' || die "container $ID has no network (check --bridge and DHCP)"

echo "== Installing Homebase Hub in container $ID"
pct push "$ID" "$INSTALLER" /root/homebase-hub-install.sh
if [ -n "$DOMAIN" ]; then pct exec "$ID" -- bash /root/homebase-hub-install.sh "$DOMAIN"
else pct exec "$ID" -- bash /root/homebase-hub-install.sh --lan; fi
IP=$(pct exec "$ID" -- hostname -I | awk '{print $1}')
echo
echo "Container $ID is ready at http://$IP (it starts with the host)."
echo "The setup code: pct exec $ID -- cat /var/www/homebase-hub/site-data/core/SETUP-CODE.php"
