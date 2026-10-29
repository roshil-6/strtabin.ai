import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth, useClerk } from '@clerk/clerk-react';
import useStore from '../store/useStore';
import { useTimetables } from '../store/useTimetables';
import { accountKey, currentAccount, selectAccount } from '../lib/accountStorage';
import { API_BASE_URL, STORAGE_KEY, LEGACY_STORAGE_KEY, GUEST_DATA_BACKUP_KEY } from '../constants';
import { NotificationManager } from '../services/NotificationManager';

type Snapshot = { workspace:Record<string,unknown>; tables:ReturnType<typeof useTimetables.getState>['tables'] };
function workspaceData(state=useStore.getState()) {
    return Object.fromEntries(Object.entries(state).filter(([,value])=>typeof value!=='function'));
}
function snapshot():Snapshot {return {workspace:workspaceData(),tables:useTimetables.getState().tables};}
function applySnapshot(data:Snapshot) {
    const initial=workspaceData(useStore.getInitialState());
    const safe=Object.fromEntries(Object.keys(initial).map(key=>[key,data.workspace[key] ?? initial[key]]));
    useStore.setState(safe); useTimetables.setState({tables:data.tables});
}
function exportCopy(value:unknown, filename:string) {
    const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

/** Resolve identity before hydrating or rendering any workspace data. */
export default function AccountWorkspace({children}:{children:ReactNode}) {
    const {isLoaded,userId,getToken}=useAuth();
    const {signOut}=useClerk();
    const tokenRef=useRef(getToken);
    useEffect(()=>{tokenRef.current=getToken;},[getToken]);
    const owner=isLoaded?(userId || 'guest'):null;
    const initialOwner=useRef<string|null>(null);
    const [result,setResult]=useState<{owner:string;ready:boolean;error:string}>({owner:'',ready:false,error:''});
    const [saveStatus,setSaveStatus]=useState('');
    const [conflict,setConflict]=useState<{local:Snapshot;cloud:Snapshot;revision:number}|null>(null);
    const [legacy,setLegacy]=useState(false);
    const retry=useRef<()=>void>(()=>{});
    useEffect(()=>{
        if(!owner)return;
        if(initialOwner.current && initialOwner.current!==owner) {
            // Terminate all stale requests, chat sockets, editors and speech sessions.
            selectAccount(null); NotificationManager.cancelAllNotifications(); window.location.reload();return;
        }
        initialOwner.current=owner;
        let stopped=false, timer:ReturnType<typeof setTimeout>|undefined, running=false;
        const abort=new AbortController();
        const unsubs:Array<()=>void>=[];
        let revision=0, dirty=false;
        const metaKey=accountKey(owner,'cloud-meta');
        const active=()=>!stopped&&currentAccount()===owner;
        const meta=()=>localStorage.setItem(metaKey,JSON.stringify({revision,dirty}));
        const request=async(method='GET',data?:unknown)=>{
            const token=await tokenRef.current();
            if(!active()||!token)throw new Error('Account changed. Reload to continue.');
            const claims=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
            if(claims.sub!==owner)throw new Error('Account changed. Reload to continue.');
            const response=await fetch(`${API_BASE_URL}/api/personal-workspace`,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.any([abort.signal,AbortSignal.timeout(30000)])});
            const body=await response.json().catch(()=>({}));
            if(!response.ok)throw new Error(body.error||'Cloud workspace is unavailable. Retry after the backend is deployed.');
            return body as {revision:number;snapshot:Snapshot|null};
        };
        const save=async()=>{
            if(!active()||!dirty||running||owner==='guest')return;
            running=true;const copy=snapshot();const serialized=JSON.stringify(copy);
            setSaveStatus('Saving your workspace…');
            try {
                const response=await request('PUT',{revision,snapshot:copy});if(!active())return;
                revision=response.revision;dirty=JSON.stringify(snapshot())!==serialized;meta();
                setSaveStatus(dirty?'Saving your workspace…':'Saved to your account');
                if(dirty)timer=setTimeout(()=>void save(),800);
            } catch(error){if(active())setSaveStatus(error instanceof Error?error.message:'Cloud save failed; your local copy is retained.');}
            finally{running=false;}
        };
        retry.current=()=>{void save();};
        const changed=()=>{
            if(!active()||owner==='guest')return;
            dirty=true;
            try{meta();}catch{setSaveStatus('Browser storage is full. Keep this tab open until cloud saving finishes.');}
            clearTimeout(timer);timer=setTimeout(()=>void save(),1000);
        };
        const beforeUnload=(event:BeforeUnloadEvent)=>{if(dirty){event.preventDefault();event.returnValue='';}};
        const online=()=>{void save();};
        void (async()=>{
            try {
                selectAccount(null);
                useStore.setState(useStore.getInitialState(),true);
                useTimetables.setState(useTimetables.getInitialState(),true);
                selectAccount(owner);
                await useStore.persist.rehydrate();await useTimetables.persist.rehydrate();
                if(!active())return;
                setLegacy([STORAGE_KEY,LEGACY_STORAGE_KEY,GUEST_DATA_BACKUP_KEY,'stratabin-timetables-v1'].some(key=>!!localStorage.getItem(key)));
                if(owner!=='guest') {
                    const previous=JSON.parse(localStorage.getItem(metaKey)||'{}');
                    revision=Number(previous.revision)||0;dirty=previous.dirty===true;
                    const cloud=await request();if(!active())return;
                    if(dirty&&cloud.revision!==revision&&cloud.snapshot) {
                        setConflict({local:snapshot(),cloud:cloud.snapshot,revision:cloud.revision});
                        setResult({owner,ready:false,error:'This account has different changes on another device. Export this device’s copy before loading the cloud copy.'});return;
                    }
                    if(cloud.snapshot&&!dirty)applySnapshot(cloud.snapshot);
                    revision=cloud.revision;meta();
                }
                unsubs.push(useStore.subscribe(changed),useTimetables.subscribe(changed));
                window.addEventListener('beforeunload',beforeUnload);window.addEventListener('online',online);
                setConflict(null);setResult({owner,ready:true,error:''});
                useStore.getState().checkNotifications();
                if(dirty)void save();
            }catch(error){if(active())setResult({owner,ready:false,error:error instanceof Error?error.message:'Could not open your private workspace.'});}
        })();
        return ()=>{stopped=true;abort.abort();clearTimeout(timer);unsubs.forEach(unsub=>unsub());window.removeEventListener('beforeunload',beforeUnload);window.removeEventListener('online',online);};
    },[owner]);
    if(!owner||result.owner!==owner||!result.ready)return <main className="theme-page min-h-screen flex items-center justify-center p-8"><div className="max-w-xl space-y-4" role="status"><p>{result.owner===owner&&result.error?result.error:'Opening your private workspace…'}</p>{result.owner===owner&&result.error&&<><button onClick={()=>window.location.reload()}>Retry</button><button onClick={()=>void signOut({redirectUrl:'/auth'})}>Sign out</button></>}{conflict&&result.owner===owner&&<><button onClick={()=>exportCopy(conflict.local,'stratabin-device-backup.json')}>Export this device’s copy</button><button onClick={()=>{
        localStorage.setItem(accountKey(owner,'conflict-backup'),JSON.stringify(conflict.local));
        localStorage.setItem(accountKey(owner,'cloud-meta'),JSON.stringify({revision:conflict.revision,dirty:false}));
        window.location.reload();
    }}>Keep backup and load cloud copy</button></>}</div></main>;
    return <>{children}{(saveStatus||legacy)&&<aside className="fixed left-3 bottom-3 z-[95] max-w-sm rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] p-3 text-xs shadow-lg" aria-label="Account storage"><p role="status">{saveStatus}</p>{saveStatus&&saveStatus!=='Saved to your account'&&<button onClick={()=>retry.current()}>Retry cloud save</button>}{legacy&&<details><summary>Older local work is preserved separately</summary><p>This backup may contain another account’s work from this device. It is not assigned to your account. Export it before recovery.</p><button onClick={()=>{
        if(Object.keys(useStore.getState().canvases).length||useTimetables.getState().tables.length){window.alert('Recovery is available only into an empty workspace, to avoid overwriting your projects. Export the backup first.');return;}
        if(!window.confirm('Only recover this data if it belongs to you. Add the unassigned local work to the account currently signed in?'))return;
        try {
            let recovered:Record<string,unknown>={};
            for(const key of [STORAGE_KEY,LEGACY_STORAGE_KEY,GUEST_DATA_BACKUP_KEY]) {
                const raw=localStorage.getItem(key);if(!raw)continue;const parsed=JSON.parse(raw);const state=parsed.state || parsed;
                if(state.canvases&&Object.keys(state.canvases).length){recovered=state;break;}
            }
            const parsedTables=JSON.parse(localStorage.getItem('stratabin-timetables-v1')||'{}');
            // Server/team projects must be fetched with membership checks, never restored as private copies.
            recovered.canvases=Object.fromEntries(Object.entries((recovered.canvases||{}) as Record<string,unknown>).filter(([id])=>!/^proj_\d+$/.test(id)&&!id.startsWith('shared_')));
            recovered.currentCanvasId=null;recovered.nodes=[];recovered.edges=[];
            applySnapshot({workspace:recovered,tables:Array.isArray(parsedTables.state?.tables)?parsedTables.state.tables:[]});
        }catch{window.alert('The older backup could not be read. It has not been removed.');}
    }}>Recover my old work into this account</button><button onClick={()=>exportCopy(Object.fromEntries([STORAGE_KEY,LEGACY_STORAGE_KEY,GUEST_DATA_BACKUP_KEY,'stratabin-timetables-v1'].map(key=>[key,localStorage.getItem(key)])),'stratabin-unassigned-backup.json')}>Export unassigned backup</button></details>}</aside>}</>;
}
