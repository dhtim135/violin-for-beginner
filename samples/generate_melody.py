"""Regenerate the original four-second audio import example at 120 BPM."""

import math
from pathlib import Path
import struct
import wave


def main():
    sample_rate = 22050
    beat = sample_rate // 2
    frames = bytearray()
    for midi in (62, 66, 69, 67, 64, 71, 69, 62):
        frequency = 440 * 2 ** ((midi - 69) / 12)
        for i in range(beat):
            envelope = min(1, i / 160, (beat - 1 - i) / 900)
            phase = math.tau * frequency * i / sample_rate
            tone = math.sin(phase) + 0.22 * math.sin(2 * phase)
            frames.extend(struct.pack("<h", round(14000 * envelope * tone)))
    with wave.open(str(Path(__file__).with_name("melody.wav")), "wb") as output:
        output.setparams((1, 2, sample_rate, 0, "NONE", "not compressed"))
        output.writeframes(frames)


if __name__ == "__main__":
    main()
