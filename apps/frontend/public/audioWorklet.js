// AudioWorklet processor: converts Float32 microphone samples to PCM16 and posts the raw bytes.
class PCMProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0]?.[0];
    if (channel?.length) {
      const pcm = new Int16Array(channel.length);
      for (let i = 0; i < channel.length; i++) {
        pcm[i] = Math.max(-32768, Math.min(32767, channel[i] * 32768));
      }
      this.port.postMessage(pcm.buffer, [pcm.buffer]);
    }
    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
