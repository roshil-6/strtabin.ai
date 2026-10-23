// Capture mono PCM at 16 kHz without recording or retaining microphone audio.
class AssistantCapture extends AudioWorkletProcessor {
    constructor() { super(); this.samples = []; this.sum = 0; this.count = 0; this.phase = 0; }
    process(inputs) {
        const input = inputs[0]?.[0];
        if (!input) return true;
        for (const sample of input) {
            this.sum += sample; this.count++; this.phase += 16000;
            if (this.phase >= sampleRate) {
                this.samples.push(this.sum / this.count);
                this.phase -= sampleRate; this.sum = 0; this.count = 0;
            }
            if (this.samples.length === 1024) {
                const samples = new Float32Array(this.samples);
                this.port.postMessage(samples, [samples.buffer]); this.samples = [];
            }
        }
        return true;
    }
}
registerProcessor('assistant-capture', AssistantCapture);
