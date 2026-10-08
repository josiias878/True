#!/usr/bin/env bash
# Probevideo zusammensetzen: Kolbi-Clip (Higgsfield) + eigene Standbilder. Aufruf: compose.sh <clip.mp4> <hook-name> <framesDir> <stackPng> <out.mp4>
set -euo pipefail
FF=${FF:-$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")}
CLIP=$1; HOOK=$2; FR=$3; STACK=$4; OUT=$5
T=$(mktemp -d)
V="-c:v libx264 -pix_fmt yuv420p -r 30 -preset medium -crf 20 -an"
# A: Clip + Hook-Text (5 s)
$FF -y -loglevel error -i "$CLIP" -i "$FR/$HOOK.png" -filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,trim=0:5,setpts=PTS-STARTPTS[v];[v][1:v]overlay=0:0" $V "$T/a.mp4"
# B: Coach-Karte mit leichtem Zoom (3,5 s)
$FF -y -loglevel error -loop 1 -i "$FR/coach.png" -vf "zoompan=z='min(zoom+0.0005,1.05)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=105:s=1080x1920:fps=30" -t 3.5 $V "$T/b.mp4"
# C: Stack scrollt im Fenster (4 s)
$FF -y -loglevel error -loop 1 -i "$FR/stack-bg.png" -loop 1 -i "$STACK" -filter_complex "[1:v]scale=900:-1,crop=900:1300:0:'min(t*260\,ih-1300)'[s];[0:v][s]overlay=90:470,format=yuv420p" -t 4 $V "$T/c.mp4"
# D: Schlussbild (3 s)
$FF -y -loglevel error -loop 1 -i "$FR/end.png" -vf "zoompan=z='min(zoom+0.0007,1.06)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=90:s=1080x1920:fps=30" -t 3 $V "$T/d.mp4"
printf "file '%s'\n" "$T/a.mp4" "$T/b.mp4" "$T/c.mp4" "$T/d.mp4" > "$T/list.txt"
$FF -y -loglevel error -f concat -safe 0 -i "$T/list.txt" -c copy -movflags +faststart "$OUT"
rm -rf "$T"; echo "✓ $OUT"
