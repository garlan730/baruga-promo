"""Export an animated story page (window.renderAt(t)) to a 1080x1920 MP4.

Usage:
  python render_story.py ig-story-braces.html ig-story-braces.mp4
  python render_story.py ig-story-braces.html stills/ --stills 1,4,6.5,9,11,14

Needs: pip install playwright imageio-ffmpeg  (uses the installed Google Chrome)
"""
import argparse
import subprocess
from pathlib import Path

import imageio_ffmpeg
from playwright.sync_api import sync_playwright

W, H = 1080, 1920


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('html')
    ap.add_argument('out')
    ap.add_argument('--fps', type=int, default=30)
    ap.add_argument('--stills', help='comma-separated times (s) to save as PNGs instead of a video')
    args = ap.parse_args()

    url = Path(args.html).resolve().as_uri() + '?export'
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome')
        page = browser.new_page(viewport={'width': W, 'height': H}, device_scale_factor=1)
        page.goto(url, wait_until='networkidle')
        page.evaluate('document.fonts.ready')
        page.wait_for_function('[...document.images].every((i) => i.complete)')

        if args.stills:
            out = Path(args.out)
            out.mkdir(parents=True, exist_ok=True)
            for t in [float(x) for x in args.stills.split(',')]:
                page.evaluate(f'renderAt({t})')
                page.screenshot(path=str(out / f't{t:05.2f}.png'))
            print('stills saved to', out)
        else:
            duration = page.evaluate('window.DURATION')
            frames = int(duration * args.fps)
            ffmpeg = subprocess.Popen([
                imageio_ffmpeg.get_ffmpeg_exe(), '-y', '-loglevel', 'error',
                '-f', 'image2pipe', '-framerate', str(args.fps), '-i', '-',
                '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',  # silent track; add music in IG
                # JPEG frames are full-range; convert to standard (tv) range so phones don't wash it out.
                '-shortest', '-vf', 'scale=in_range=full:out_range=tv,format=yuv420p',
                '-c:v', 'libx264', '-crf', '18',
                '-preset', 'medium', '-c:a', 'aac', '-movflags', '+faststart', args.out,
            ], stdin=subprocess.PIPE)
            for i in range(frames):
                page.evaluate(f'renderAt({i / args.fps})')
                ffmpeg.stdin.write(page.screenshot(type='jpeg', quality=95))
            ffmpeg.stdin.close()
            ffmpeg.wait()
            print(f'{frames} frames -> {args.out}')
        browser.close()


if __name__ == '__main__':
    main()
