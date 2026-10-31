import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Folder, Plus, Search, X, Check } from 'lucide-react';

export default function AssistantProjectPicker({ projects, value, disabled, onChange }: { projects: { id: string; name?: string }[]; value: string; disabled: boolean; onChange: (id: string) => void }) {
    const dialog = useRef<HTMLDialogElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const [query, setQuery] = useState('');
    const close = () => { dialog.current?.close(); trigger.current?.focus(); };
    const choose = (id: string) => { if (disabled) return; if (id !== value) onChange(id); close(); };
    const selected = projects.find(project => project.id === value);
    return <>
        <button ref={trigger} className="sasha-project-trigger" disabled={disabled} aria-haspopup="dialog" onClick={() => {setQuery('');dialog.current?.showModal();}}><Folder size={16}/><span>{value ? selected?.name || 'Selected project' : 'New idea'}</span><span className="sasha-project-change">Change</span></button>
        {createPortal(<dialog ref={dialog} className="sasha-project-picker" aria-labelledby="sasha-picker-title" onKeyDown={event => event.stopPropagation()} onClick={event => {if (event.target === event.currentTarget) { const rect=event.currentTarget.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)close(); }}}>
            <header><div><h2 id="sasha-picker-title">Choose project context</h2><p>Start a new idea or work with an existing project.</p></div><button aria-label="Close project picker" onClick={close}><X size={19}/></button></header>
            <label className="sasha-picker-search"><Search size={17}/><input autoFocus aria-label="Search projects" placeholder="Search your projects…" value={query} onChange={event => setQuery(event.target.value)}/></label>
            <div className="sasha-picker-results"><button disabled={disabled} onClick={() => choose('')}><Plus size={18}/><span>New idea<small>No existing project attached</small></span>{!value && <Check size={16}/>}</button>
            {projects.filter(project => (project.name || 'Untitled project').toLowerCase().includes(query.trim().toLowerCase())).map(project => <button key={project.id} disabled={disabled} onClick={() => choose(project.id)}><Folder size={18}/><span>{project.name || 'Untitled project'}</span>{value === project.id && <Check size={16}/>}</button>)}
            {!projects.some(project => (project.name || 'Untitled project').toLowerCase().includes(query.trim().toLowerCase())) && <p className="sasha-picker-empty">{projects.length ? 'No projects match your search.' : 'Your projects will appear here.'}</p>}
            </div><p className="sasha-picker-hint">Changing projects starts a fresh conversation.</p>
        </dialog>, document.body)}
    </>;
}
