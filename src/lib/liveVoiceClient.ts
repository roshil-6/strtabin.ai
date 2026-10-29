import { decodePcm, pcmBase64, parseVoiceProposal, type VoiceProposal } from './voiceProtocol.ts';

export type VoiceState = 'idle' | 'connecting' | 'listening' | 'speaking' | 'muted';
type Options = {
    provider: string;
    audioContext?: AudioContext;
    initialRequest?: string;
    createSession: (signal: AbortSignal) => Promise<{ token: string; setup?: object; maxSeconds: number }>;
    onState: (state: VoiceState) => void;
    onLevel: (level: number) => void;
    onTranscript: (role: 'user' | 'assistant', text: string) => void;
    onProposal: (proposal: VoiceProposal) => void;
    onError: (message: string) => void;
};

/** One explicit microphone session; never reconnect or re-enable a microphone silently. */
export class LiveVoiceClient {
    private stopped = false;
    private muted = false;
    private abort = new AbortController();
    private stream?: MediaStream;
    private pc?: RTCPeerConnection;
    private channel?: RTCDataChannel;
    private socket?: WebSocket;
    private audio?: HTMLAudioElement;
    private context?: AudioContext;
    private capture?: AudioWorkletNode;
    private sources = new Set<AudioBufferSourceNode>();
    private playhead = 0;
    private timers: ReturnType<typeof setTimeout>[] = [];
    private ready = false;
    private calls = new Set<string>();
    private transcript = { user: '', assistant: '' };
    private options: Options;
    constructor(options: Options) { this.options = options; }
    private state(value: VoiceState) { if (!this.stopped) this.options.onState(this.muted ? 'muted' : value); }
    private fail(message: string) { if (this.stopped) return; this.stop(); this.options.onError(message); }
    async start() {
        this.options.onState('connecting');
        try {
            this.context = this.options.audioContext;
            if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('Live voice needs HTTPS and a browser with microphone support.');
            this.context = this.context || new AudioContext({ sampleRate: 16000 });
            await this.context.resume();
            if (this.stopped) return;
            if (this.context.state === 'suspended') throw new Error('Tap Sasha once to allow audio playback in this browser.');
            this.timers.push(setTimeout(() => { if (!this.ready) this.fail('Voice connection timed out. Check microphone permission and try again.'); }, 30000));
            const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
            if (this.stopped) { stream.getTracks().forEach(track => track.stop()); return; }
            this.stream = stream;
            stream.getAudioTracks().forEach(track => track.addEventListener('ended', () => this.fail('Microphone disconnected. Start a new voice session when ready.')));
            const session = await this.options.createSession(this.abort.signal);
            if (this.stopped) return;
            this.timers.push(setTimeout(() => this.fail('Voice session time is complete. Start a new session to continue.'), Math.min(session.maxSeconds, 540) * 1000));
            if (this.options.provider === 'openai') await this.startOpenAI(session.token);
            else await this.startGemini(session.token, session.setup || {});
        } catch (error) {
            if (!this.stopped) this.fail(error instanceof DOMException && error.name === 'NotAllowedError' ? 'Microphone permission was denied. Allow microphone access in your browser settings.' : error instanceof Error ? error.message : 'Live voice could not start.');
        }
    }
    private async startOpenAI(token: string) {
        const pc = new RTCPeerConnection(); this.pc = pc;
        const audio = new Audio(); audio.autoplay = true; this.audio = audio;
        pc.ontrack = event => { audio.srcObject = event.streams[0]; void audio.play().catch(() => this.fail('Your browser blocked voice playback. Allow audio for this site and reconnect.')); };
        this.stream!.getTracks().forEach(track => pc.addTrack(track, this.stream!));
        pc.onconnectionstatechange = () => { if (['failed', 'disconnected', 'closed'].includes(pc.connectionState) && !this.stopped) this.fail('Voice connection ended. Start a new session to reconnect.'); };
        const channel = pc.createDataChannel('oai-events'); this.channel = channel;
        channel.onopen = () => { this.ready = true; this.state('listening'); };
        channel.onmessage = event => {
            if (this.stopped) return;
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'error') { this.fail('The voice provider reported an error. Check model access and reconnect.'); return; }
                if (data.type === 'input_audio_buffer.speech_started') this.state('listening');
                if (data.type === 'response.output_audio.delta' || data.type === 'output_audio_buffer.started') this.state('speaking');
                if (data.type === 'output_audio_buffer.stopped') this.state('listening');
                if (data.type === 'conversation.item.input_audio_transcription.completed') this.options.onTranscript('user', String(data.transcript || '').slice(0, 12000));
                if (data.type === 'response.output_audio_transcript.done' || data.type === 'response.audio_transcript.done') this.options.onTranscript('assistant', String(data.transcript || '').slice(0, 12000));
                if (data.type === 'response.function_call_arguments.done') {
                    const result = this.propose(data.call_id, data.name, JSON.parse(data.arguments));
                    channel.send(JSON.stringify({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: data.call_id, output: JSON.stringify(result) } }));
                    channel.send(JSON.stringify({ type: 'response.create' }));
                }
            } catch { this.options.onError('A voice event could not be read. No action was applied.'); }
        };
        const offer = await pc.createOffer();
        if (this.stopped) return;
        await pc.setLocalDescription(offer);
        const response = await fetch('https://api.openai.com/v1/realtime/calls', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/sdp' }, body: offer.sdp, signal: this.abort.signal });
        if (!response.ok) throw new Error('OpenAI voice connection failed. Check your voice model and API access.');
        const sdp = await response.text();
        if (this.stopped) return;
        await pc.setRemoteDescription({ type: 'answer', sdp });
    }
    private propose(id: string, name: string, args: unknown) {
        if (name !== 'propose_actions' || typeof id !== 'string') return { status: 'rejected', reason: 'Unsupported tool.' };
        if (this.calls.has(id)) return { status: 'awaiting_user_approval', executed: false };
        try {
            const proposal = parseVoiceProposal(args);
            this.calls.add(id); this.options.onProposal(proposal);
            return { status: 'awaiting_user_approval', executed: false, instruction: 'Ask the user to review the action card and click Apply. Nothing has been saved yet.' };
        } catch { return { status: 'rejected', executed: false, reason: 'Invalid proposal; clarify the request.' }; }
    }
    private async startGemini(token: string, setup: object) {
        await this.context!.audioWorklet.addModule('/assistant-capture.js');
        if (this.stopped) return;
        const socket = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(token)}`);
        this.socket = socket;
        socket.onopen = () => { if (!this.stopped) socket.send(JSON.stringify({ setup })); };
        socket.onclose = () => { if (!this.stopped) this.fail('Gemini voice session ended. Start a new session to continue.'); };
        socket.onerror = () => this.fail('Gemini voice connection failed. Check API access and your network.');
        let chain = Promise.resolve();
        socket.onmessage = event => { chain = chain.then(async () => {
            if (this.stopped) return;
            const data = JSON.parse(typeof event.data === 'string' ? event.data : await event.data.text());
            if (this.stopped) return;
            if (data.error) { this.fail('Gemini rejected the voice session. Check your live model ID and account access.'); return; }
            if (data.setupComplete && !this.ready) {
                this.ready = true; this.state('listening');
                if (this.options.initialRequest) this.options.onTranscript('user', this.options.initialRequest);
                if (this.options.initialRequest !== undefined) socket.send(JSON.stringify({clientContent:{turns:[{role:'user',parts:[{text:this.options.initialRequest || 'I called your wake word. Briefly say you are ready, then listen.'}]}],turnComplete:true}}));
                const source = this.context!.createMediaStreamSource(this.stream!);
                this.capture = new AudioWorkletNode(this.context!, 'assistant-capture');
                const silence = this.context!.createGain(); silence.gain.value = 0;
                source.connect(this.capture).connect(silence).connect(this.context!.destination);
                this.capture.port.onmessage = event => {
                    if (this.stopped || this.muted || socket.readyState !== WebSocket.OPEN) return;
                    if (socket.bufferedAmount > 256000) { this.fail('Your connection is too slow for live audio. Try again on a stable network.'); return; }
                    const samples = event.data as Float32Array;
                    this.options.onLevel(Math.min(1, Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length) * 5));
                    socket.send(JSON.stringify({ realtimeInput: { audio: { mimeType: 'audio/pcm;rate=16000', data: pcmBase64(samples) } } }));
                };
            }
            const content = data.serverContent;
            if (content?.interrupted) this.clearAudio();
            if (content?.inputTranscription?.text) this.transcript.user = (this.transcript.user + content.inputTranscription.text).slice(-12000);
            if (content?.outputTranscription?.text) this.transcript.assistant = (this.transcript.assistant + content.outputTranscription.text).slice(-12000);
            for (const part of (content?.interrupted ? [] : content?.modelTurn?.parts || [])) if (part.inlineData?.mimeType?.startsWith('audio/pcm')) this.play(part.inlineData.data, Number(/rate=(\d+)/.exec(part.inlineData.mimeType)?.[1] || 24000));
            if (content?.turnComplete || content?.interrupted) {
                for (const role of ['user', 'assistant'] as const) { if (this.transcript[role]) this.options.onTranscript(role, this.transcript[role]); this.transcript[role] = ''; }
            }
            if (data.toolCall?.functionCalls) {
                const functionResponses = data.toolCall.functionCalls.map((call: { id: string; name: string; args: unknown }) => ({ id: call.id, name: call.name, response: this.propose(call.id, call.name, call.args) }));
                socket.send(JSON.stringify({ toolResponse: { functionResponses } }));
            }
            if (data.goAway) this.options.onError('This voice session will end shortly. Reconnect after it ends.');
        }).catch(() => this.fail('Could not read the voice stream. Reconnect to continue.')); };
    }
    private play(data: string, rate: number) {
        if (this.stopped || ![16000, 24000, 48000].includes(rate)) return;
        const context = this.context!;
        if (this.playhead - context.currentTime > 20) { this.fail('Voice playback fell behind. Reconnect to continue.'); return; }
        const samples = decodePcm(data);
        const buffer = context.createBuffer(1, samples.length, rate); buffer.copyToChannel(new Float32Array(samples), 0);
        const source = context.createBufferSource(); source.buffer = buffer; source.connect(context.destination);
        this.sources.add(source); this.state('speaking');
        source.onended = () => { source.disconnect(); this.sources.delete(source); if (!this.sources.size) this.state('listening'); };
        const start = Math.max(context.currentTime + 0.035, this.playhead); source.start(start); this.playhead = start + buffer.duration;
    }
    private clearAudio() { for (const source of this.sources) { source.onended = null; try { source.stop(); } catch { /* already stopped */ } source.disconnect(); } this.sources.clear(); this.playhead = 0; this.state('listening'); }
    setMuted(muted: boolean) {
        this.muted = muted; this.stream?.getAudioTracks().forEach(track => { track.enabled = !muted; });
        if (muted && this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
        this.state(muted ? 'muted' : 'listening');
    }
    updateContext(text: string) {
        if (this.stopped || !this.ready) return;
        if (this.channel?.readyState === 'open') this.channel.send(JSON.stringify({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: `Application state update (not a new user command): ${text}` }] } }));
        if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify({ realtimeInput: { text: `Application state update (not a new user command): ${text}` } }));
    }
    stop() {
        if (this.stopped) return;
        this.stopped = true; this.abort.abort(); this.timers.forEach(clearTimeout);
        this.stream?.getTracks().forEach(track => track.stop());
        this.channel?.close(); this.pc?.close(); this.socket?.close();
        if (this.audio) { this.audio.pause(); this.audio.srcObject = null; }
        if (this.capture) { this.capture.port.onmessage = null; this.capture.disconnect(); }
        this.clearAudio(); void this.context?.close().catch(() => {});
        this.options.onLevel(0); this.options.onState('idle');
    }
}
