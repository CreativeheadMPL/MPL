/**
 * Synthesizes pure 16-bit stereo 44.1kHz PCM WAV audio buffers.
 * Generates original, royalty-free ambient and melodic soundscapes for demo previews.
 */

export function createWavHeader(sampleRate: number, numChannels: number, numSamples: number): Buffer {
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const buffer = Buffer.alloc(headerSize);

  // RIFF identifier
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);

  // "fmt " sub-chunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // "data" sub-chunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

export function generateAmbientTrack(
  durationSec = 45,
  chordNotes: number[] = [220, 277.18, 329.63, 440], // A minor / major variant
  tempoBpm = 60
): Buffer {
  const sampleRate = 44100;
  const numChannels = 2;
  const numSamples = Math.floor(sampleRate * durationSec);
  const header = createWavHeader(sampleRate, numChannels, numSamples);
  const data = Buffer.alloc(numSamples * numChannels * 2);

  let offset = 0;
  const beatSec = 60 / tempoBpm;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Fade in first 2 seconds, fade out last 3 seconds
    let envelope = 1.0;
    if (t < 2.0) envelope = t / 2.0;
    else if (t > durationSec - 3.0) envelope = Math.max(0, (durationSec - t) / 3.0);

    // Subtle gentle rhythmic pulse
    const pulse = 0.85 + 0.15 * Math.sin((2 * Math.PI * t) / (beatSec * 2));

    // Slow filter modulation
    const lfo = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.1 * t);

    let left = 0;
    let right = 0;

    for (let c = 0; c < chordNotes.length; c++) {
      const baseFreq = chordNotes[c];
      const pan = (c / (chordNotes.length - 1)) * 0.6 + 0.2; // 0.2 to 0.8
      
      // Warm fundamental sine with gentle second harmonic
      const s1 = Math.sin(2 * Math.PI * baseFreq * t);
      const s2 = 0.3 * Math.sin(2 * Math.PI * baseFreq * 2 * t * (1 + 0.002 * lfo));
      const sSub = 0.4 * Math.sin(2 * Math.PI * (baseFreq * 0.5) * t);
      
      const noteSample = (s1 + s2 + sSub) / 2.5;

      left += noteSample * (1 - pan);
      right += noteSample * pan;
    }

    // Apply master envelope, pulse and soft saturation
    const masterGain = 0.6;
    const finalLeft = Math.tanh(left * masterGain * envelope * pulse);
    const finalRight = Math.tanh(right * masterGain * envelope * pulse);

    // Convert to 16-bit integer
    const intLeft = Math.max(-32767, Math.min(32767, Math.floor(finalLeft * 32000)));
    const intRight = Math.max(-32767, Math.min(32767, Math.floor(finalRight * 32000)));

    data.writeInt16LE(intLeft, offset);
    data.writeInt16LE(intRight, offset + 2);
    offset += 4;
  }

  return Buffer.concat([header, data]);
}
