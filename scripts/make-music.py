"""Renders the site's music-box soundtrack to WAV files.

  python3 scripts/make-music.py <out_dir>

Happy Birthday to You, Pachelbel's Canon and Für Elise are public domain;
"Marfoa's Waltz" is an original written for this site.
"""
import os, sys, wave
import numpy as np

SR = 44100
NAMES = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def hz(note):
    n = NAMES[note[0]] + (1 if '#' in note else -1 if note[1] == 'b' else 0)
    return 440 * 2 ** ((n + 12 * (int(note[-1]) + 1) - 69) / 12)


def bell(f, dur, amp):
    t = np.arange(int(SR * dur)) / SR
    env = np.exp(-t * 3.2) * (1 - np.exp(-t * 400))
    tone = (np.sin(2 * np.pi * f * t) + .45 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 4)
            + .2 * np.sin(2 * np.pi * f * 3.01 * t) * np.exp(-t * 7) + .12 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 12))
    return amp * env * tone


def pad(f, dur, amp):
    t = np.arange(int(SR * dur)) / SR
    env = np.minimum(1, t / .25) * np.minimum(1, np.maximum(0, (dur - t) / .4))
    tone = sum(np.sin(2 * np.pi * f * d * t) for d in (1, 1.004, .996)) / 3 + .25 * np.sin(2 * np.pi * f * 2 * t)
    return amp * env * tone


class Track:
    def __init__(self, seconds):
        self.buf = np.zeros(int((seconds + 5) * SR))

    def add(self, sig, at):
        i = int(at * SR)
        self.buf[i:i + len(sig)] += sig[:len(self.buf) - i]

    def bell(self, note, at, dur=2.2, amp=.3, sparkle=0):
        self.add(bell(hz(note), max(dur, 1.6), amp), at)
        if sparkle:
            self.add(bell(hz(note) * 2, 1.4, sparkle), at + .012)

    def pad(self, notes, at, dur, amp=.05):
        for n in notes:
            self.add(pad(hz(n), dur, amp), at)

    def write(self, path):
        out = self.buf
        wet = np.zeros_like(out)
        for d, g in ((.0297, .78), (.0371, .76), (.0411, .74), (.0437, .72)):  # simple comb reverb
            n = int(d * SR)
            comb = out.copy()
            for i in range(n, len(comb), n):
                comb[i:i + n] += g * comb[i - n:i][:len(comb[i:i + n])]
            wet += comb
        out = out + .18 * wet / 4
        last = np.nonzero(np.abs(out) > 1e-4)[0][-1]
        out = out[:min(len(out), last + SR)]
        out /= np.max(np.abs(out)) * 1.12
        fade = int(SR * 1.5)
        out[-fade:] *= np.linspace(1, 0, fade)
        with wave.open(path, 'wb') as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes((out * 32767).astype(np.int16).tobytes())
        print(f'{len(out) / SR:5.1f}s  {path}')


def happy_birthday():
    B = 60 / 96
    melody = [(0, 'G4', .75), (.75, 'G4', .25), (1, 'A4', 1), (2, 'G4', 1), (3, 'C5', 1), (4, 'B4', 2),
              (6, 'G4', .75), (6.75, 'G4', .25), (7, 'A4', 1), (8, 'G4', 1), (9, 'D5', 1), (10, 'C5', 2),
              (12, 'G4', .75), (12.75, 'G4', .25), (13, 'G5', 1), (14, 'E5', 1), (15, 'C5', 1), (16, 'B4', 1), (17, 'A4', 2),
              (19, 'F5', .75), (19.75, 'F5', .25), (20, 'E5', 1), (21, 'C5', 1), (22, 'D5', 1), (23, 'C5', 3)]
    chords = [(1, 4, ['C3', 'E4', 'G4']), (4, 10, ['G2', 'F4', 'B3']), (10, 13, ['C3', 'E4', 'G3']),
              (13, 16, ['C3', 'Bb3', 'E4']), (16, 20, ['F2', 'A3', 'C4']), (20, 22, ['C3', 'E4', 'G3']),
              (22, 23, ['G2', 'F3', 'B3']), (23, 26, ['C3', 'E3', 'G3', 'C4'])]
    V = 26
    t = Track((V * 2 + 1) * B)
    for v in range(2):
        off = v * (V + 1) * B
        for beat, note, length in melody:
            t.bell(note, off + beat * B, length * B + 1.5, .32, sparkle=.07 if v else 0)
        for s, e, notes in chords:
            t.pad(notes, off + s * B, (e - s) * B + .3, .05 if v == 0 else .07)
            t.bell(notes[0], off + s * B, 1.8, .12)
        for k, n in enumerate(['C5', 'E5', 'G5', 'C6']):
            t.bell(n, off + (V - 2.5) * B + k * .09, 2.5, .1)
    return t


def canon():
    B = 60 / 66
    bass = ['D3', 'A2', 'B2', 'F#2', 'G2', 'D2', 'G2', 'A2']
    chords = [['F#3', 'A3', 'D4'], ['E3', 'A3', 'C#4'], ['F#3', 'B3', 'D4'], ['F#3', 'A3', 'C#4'],
              ['G3', 'B3', 'D4'], ['F#3', 'A3', 'D4'], ['G3', 'B3', 'D4'], ['E3', 'A3', 'C#4']]
    line1 = ['F#5', 'E5', 'D5', 'C#5', 'B4', 'A4', 'B4', 'C#5']
    line2 = ['D5', 'C#5', 'B4', 'A4', 'G4', 'F#4', 'G4', 'E4']
    line3 = ['D5', 'F#5', 'A5', 'G5', 'F#5', 'D5', 'F#5', 'E5', 'D5', 'B4', 'D5', 'A5', 'G5', 'B5', 'A5', 'G5']
    cycles = 6
    t = Track(cycles * 16 * B + 4)
    for c in range(cycles):
        off = c * 16 * B
        for i in range(8):
            at = off + i * 2 * B
            t.bell(bass[i], at, 2.4, .16)
            t.pad(chords[i], at, 2 * B + .3, .035 + .01 * min(c, 3))
            if c in (1, 5):
                t.bell(line1[i], at, 2 * B + 1.2, .28, sparkle=.05 if c == 5 else 0)
            if c in (2, 5):
                t.bell(line2[i], at, 2 * B + 1.2, .24 if c == 2 else .16)
            if c == 4:  # arpeggio variation built from the chord tones
                tones = [n[:-1] + str(int(n[-1]) + 1) for n in chords[i]]
                for j, n in enumerate(tones + [tones[1]]):
                    t.bell(n, at + j * B / 2, 1.4, .2)
        if c == 3:
            for j, n in enumerate(line3):
                t.bell(n, off + j * B, B + 1.2, .27)
    end = cycles * 16 * B
    t.bell('D3', end, 4, .2)
    t.pad(['F#3', 'A3', 'D4'], end, 3.5, .06)
    for k, n in enumerate(['D5', 'F#5', 'A5', 'D6']):
        t.bell(n, end + k * .12, 3, .16)
    return t


def fur_elise():
    U = .19  # one sixteenth
    pickup = [(0, 'E5'), (1, 'D#5')]
    bars = [  # (right hand [(sixteenth, note)], left-hand arpeggio)
        ([(0, 'E5'), (1, 'D#5'), (2, 'E5'), (3, 'B4'), (4, 'D5'), (5, 'C5')], []),
        ([(0, 'A4'), (3, 'C4'), (4, 'E4'), (5, 'A4')], ['A2', 'E3', 'A3']),
        ([(0, 'B4'), (3, 'E4'), (4, 'G#4'), (5, 'B4')], ['E2', 'E3', 'G#3']),
        ([(0, 'C5'), (3, 'E4'), (4, 'E5'), (5, 'D#5')], ['A2', 'E3', 'A3']),
        ([(0, 'E5'), (1, 'D#5'), (2, 'E5'), (3, 'B4'), (4, 'D5'), (5, 'C5')], []),
        ([(0, 'A4'), (3, 'C4'), (4, 'E4'), (5, 'A4')], ['A2', 'E3', 'A3']),
        ([(0, 'B4'), (3, 'E4'), (4, 'C5'), (5, 'B4')], ['E2', 'E3', 'G#3']),
        ([(0, 'A4')], ['A2', 'E3', 'A3']),
    ]
    reps = 3
    section = (2 + 8 * 6 + 2) * U
    t = Track(reps * section + 4)
    for r in range(reps):
        off = r * section
        for at, n in pickup:
            t.bell(n, off + at * U, 1.2, .28)
        for b, (rh, lh) in enumerate(bars):
            bar = off + (2 + b * 6) * U
            for at, n in rh:
                t.bell(n, bar + at * U, 1.6, .3, sparkle=.05 if r == 1 else 0)
            for j, n in enumerate(lh):
                t.bell(n, bar + j * U, 1.5, .14)
    end = reps * section
    t.bell('A2', end, 4, .18)
    t.pad(['A3', 'C4', 'E4'], end, 3.5, .05)
    for k, n in enumerate(['A4', 'C5', 'E5', 'A5']):
        t.bell(n, end + k * .14, 3, .15)
    return t


def marfoas_waltz():
    B = 60 / 88
    prog = [('F2', ['A3', 'C4', 'F4']), ('D2', ['A3', 'D4', 'F4']), ('Bb1', ['Bb3', 'D4', 'F4']), ('C2', ['G3', 'C4', 'E4']),
            ('F2', ['A3', 'C4', 'F4']), ('A2', ['A3', 'C4', 'E4']), ('Bb1', ['Bb3', 'D4', 'F4']), ('C2', ['G3', 'Bb3', 'E4']),
            ('D2', ['A3', 'D4', 'F4']), ('Bb1', ['Bb3', 'D4', 'F4']), ('F2', ['A3', 'C4', 'F4']), ('C2', ['G3', 'C4', 'E4']),
            ('Bb1', ['Bb3', 'D4', 'F4']), ('C2', ['G3', 'Bb3', 'E4']), ('F2', ['A3', 'C4', 'F4']), ('F2', ['A3', 'C4', 'F4'])]
    melody = [
        [('A4', 2), ('C5', 1)], [('D5', 2), ('F5', 1)], [('F5', 1.5), ('E5', .5), ('D5', 1)], [('C5', 3)],
        [('A4', 1), ('C5', 1), ('F5', 1)], [('E5', 2), ('C5', 1)], [('D5', 1), ('F5', 1), ('D5', 1)], [('C5', 2), ('G4', 1)],
        [('A4', 1), ('D5', 1), ('F5', 1)], [('F5', 1.5), ('G5', .5), ('F5', 1)], [('A5', 2), ('F5', 1)], [('E5', 2), ('C5', 1)],
        [('D5', 1), ('Bb4', 1), ('D5', 1)], [('C5', 1), ('E5', 1), ('G5', 1)], [('F5', 3)], [('A5', 1), ('C6', 1), ('F6', 1)],
    ]
    reps = 2
    t = Track(reps * 16 * 3 * B + 4)
    for r in range(reps):
        for b in range(16):
            at = (r * 16 + b) * 3 * B
            root, ch = prog[b]
            t.bell(root, at, 2.2, .17)
            for beat in (1, 2):
                t.pad(ch, at + beat * B, B * .9, .03)
            t.pad(ch, at, 3 * B + .2, .02 + .01 * r)
            x = at
            for n, d in melody[b]:
                t.bell(n, x, d * B + 1.4, .3 if b != 15 else .18, sparkle=.06 if r == 1 else 0)
                x += d * B
    end = reps * 16 * 3 * B
    t.bell('F2', end, 4, .18)
    t.pad(['A3', 'C4', 'F4'], end, 3.5, .06)
    for k, n in enumerate(['F5', 'A5', 'C6', 'F6']):
        t.bell(n, end + k * .13, 3, .14)
    return t


if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else '.'
    for name, fn in [('happy-birthday', happy_birthday), ('canon-in-d', canon),
                     ('fur-elise', fur_elise), ('marfoas-waltz', marfoas_waltz)]:
        fn().write(os.path.join(out, f'{name}.wav'))
