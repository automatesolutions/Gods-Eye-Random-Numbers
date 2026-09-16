#!/bin/sh
set -eu

UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
SHEET_DIR=/usr/share/nginx/html/_sheets

sheet_id() {
  printf '%s' "$1" | sed -n 's|.*/spreadsheets/d/\([^/?#]*\).*|\1|p'
}

sheet_gid() {
  gid=$(printf '%s' "$1" | sed -n 's/.*[?&#]gid=\([0-9]*\).*/\1/p')
  printf '%s' "${gid:-0}"
}

gviz_from() {
  raw=$1
  [ -z "$raw" ] && return 0
  case "$raw" in
    *tqx=out:csv*|*output=csv*|*/export?*)
      printf '%s' "$raw"
      return 0
      ;;
  esac
  id=$(sheet_id "$raw")
  [ -n "$id" ] && printf 'https://docs.google.com/spreadsheets/d/%s/gviz/tq?tqx=out:csv&gid=%s' "$id" "$(sheet_gid "$raw")"
}

export_from() {
  raw=$1
  id=$(sheet_id "$raw")
  [ -n "$id" ] && printf 'https://docs.google.com/spreadsheets/d/%s/export?format=csv&gid=%s' "$id" "$(sheet_gid "$raw")"
}

is_csv() {
  f=$1
  [ -s "$f" ] || return 1
  head=$(dd if="$f" bs=200 count=1 2>/dev/null || true)
  printf '%s' "$head" | grep -qiE '<(!DOCTYPE |html)' && return 1
  return 0
}

fetch_sheet() {
  game=$1
  raw=$2
  dest=$(gviz_from "$raw" || true)
  [ -z "$dest" ] && return 0
  out="${SHEET_DIR}/${game}"
  tmp="${out}.tmp"
  for url in "$dest" "$(export_from "$raw" || true)"; do
    [ -z "$url" ] && continue
    if curl -fsSL --max-time 25 -A "$UA" -H 'Accept: text/csv,text/plain,*/*' -o "$tmp" "$url" && is_csv "$tmp"; then
      mv "$tmp" "$out"
      return 0
    fi
    rm -f "$tmp"
  done
  return 0
}

mkdir -p "$SHEET_DIR"
fetch_sheet 42 "${VITE_SHEET_42:-}" &
fetch_sheet 45 "${VITE_SHEET_45:-}" &
fetch_sheet 49 "${VITE_SHEET_49:-}" &
fetch_sheet 55 "${VITE_SHEET_55:-}" &
fetch_sheet 58 "${VITE_SHEET_58:-}" &
wait || true

cat > /etc/nginx/conf.d/default.conf <<'EOF'
server {
    listen 8080;
    server_name _;
    root /usr/share/nginx/html;
    gzip on;
    gzip_types text/plain text/css application/javascript application/json text/csv;

    location ^~ /_sheets/ {
        default_type text/csv;
        add_header Cache-Control "no-store";
        try_files $uri =404;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

exec nginx -g 'daemon off;'
