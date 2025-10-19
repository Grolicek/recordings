#!/usr/bin/env bash
set -euo pipefail

SRC_DIR="/var/www/data.oga.sk/muni/recordings/playlists"
shopt -s nullglob
cd "$SRC_DIR"

for f in *.mp4 *.ts; do
  [ -e "$f" ] || continue
  base="${f%.*}"
  outdir="$SRC_DIR/$base"
  playlist="$outdir/$base.m3u8"

  if [ -f "$playlist" ]; then
    echo "Skip (exists): $playlist"
    continue
  fi

  mkdir -p "$outdir"
  echo "Converting (fMP4): $f -> $playlist"

  ffmpeg -y -i "$f" \
    -c:v libx264 -preset fast -crf 22 \
    -c:a aac -b:a 128k \
    -movflags +faststart \
    -hls_time 6 \
    -hls_playlist_type vod \
    -hls_segment_type fmp4 \
    -hls_fmp4_init_filename "init.mp4" \
    -hls_segment_filename "$outdir/${base}_%03d.m4s" \
    "$playlist"

  echo "Done: $playlist"
done
