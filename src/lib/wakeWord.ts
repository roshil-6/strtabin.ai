export type WakeRecognition = {
    lang: string; continuous: boolean; interimResults: boolean;
    onstart: (() => void) | null; onend: (() => void) | null;
    onerror: ((event: {error:string}) => void) | null;
    onresult: ((event: {resultIndex:number;results:ArrayLike<{isFinal:boolean;0:{transcript:string}}>}) => void) | null;
    start():void; abort():void;
};
export type WakeStatus = 'off' | 'starting' | 'listening';

/** Only an addressed phrase at the start of an utterance activates Sasha. */
export function wakeRequest(transcript:string, name:string): string | null {
    const normalized = transcript.normalize('NFKC').trim();
    const names = [...new Set(['Sasha',name.trim()].filter(Boolean))];
    for (const value of names) {
        const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g,'\\s+');
        const match = new RegExp(`^hey[\\s,]+${escaped}(?=$|[\\s,.!?;:])[,\\s.!?;:]*`, 'iu').exec(normalized);
        if (match) return normalized.slice(match[0].length).trim().slice(0,3000);
    }
    return null;
}

/** One opt-in wake listener; releases recognition before handing off to live audio. */
export class WakeWordListener {
    private recognition:WakeRecognition;
    private stopped=false;
    private request:string|null=null;
    private timer:ReturnType<typeof setTimeout>|undefined;
    private handoff:ReturnType<typeof setTimeout>|undefined;
    private startedAt=0;
    private earlyEnds=0;
    private name:string;
    private callbacks:{onState:(state:WakeStatus)=>void;onWake:(request:string)=>void;onError:(message:string)=>void};
    constructor(makeRecognition:()=>WakeRecognition, name:string, callbacks:{onState:(state:WakeStatus)=>void;onWake:(request:string)=>void;onError:(message:string)=>void}) {
        this.name=name;this.callbacks=callbacks;
        this.recognition=makeRecognition();
        this.recognition.lang='en-US';this.recognition.continuous=true;this.recognition.interimResults=false;
        this.recognition.onstart=()=>{if(!this.stopped)this.callbacks.onState('listening');};
        this.recognition.onresult=event=>{
            if(this.stopped||this.request!==null)return;
            for(let i=event.resultIndex;i<event.results.length;i++) {
                const result=event.results[i];if(!result.isFinal)continue;
                const request=wakeRequest(result[0].transcript,this.name);
                if(request===null)continue;
                this.request=request;
                // Do not start a second microphone owner until recognition actually ends.
                this.handoff=setTimeout(()=>this.fail('Wake listener did not release the microphone. Tap Sasha to start instead.'),3000);
                this.recognition.abort();return;
            }
        };
        this.recognition.onerror=event=>{
            if(this.stopped||this.request!==null||event.error==='no-speech')return;
            this.fail(event.error==='not-allowed'||event.error==='service-not-allowed'?'Wake listening needs microphone and speech-service permission. You can still tap Sasha.':'Wake listening stopped. Check browser speech support and try again.');
        };
        this.recognition.onend=()=>{
            if(this.stopped)return;
            if(this.request!==null){const request=this.request;this.stop();this.callbacks.onWake(request);return;}
            this.earlyEnds=Date.now()-this.startedAt<1000?this.earlyEnds+1:0;
            if(this.earlyEnds>=3){this.fail('This browser keeps stopping wake listening. Use tap to talk.');return;}
            this.callbacks.onState('starting');this.timer=setTimeout(()=>this.start(),500);
        };
    }
    start(){if(this.stopped)return;this.startedAt=Date.now();this.callbacks.onState('starting');try{this.recognition.start();}catch{this.fail('Could not start wake listening. Try tap to talk.');}}
    private fail(message:string){if(this.stopped)return;this.stop();this.callbacks.onError(message);}
    stop(){if(this.stopped)return;this.stopped=true;clearTimeout(this.timer);clearTimeout(this.handoff);this.recognition.onstart=null;this.recognition.onend=null;this.recognition.onresult=null;this.recognition.onerror=null;try{this.recognition.abort();}catch{/* already ended */}this.callbacks.onState('off');}
}
