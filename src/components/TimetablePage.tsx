import TimetableGrid from './TimetableGrid';
import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Plus, Clock, Pencil, Trash2, ArrowLeft, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';
import { useTimetables } from '../store/useTimetables';
import { type Timetable } from '../lib/timetable';
import { localDateKey } from '../lib/localDate';
import { generateId } from '../utils/uuid';
import './Planning.css';
export default function TimetablePage() {
 const {id:projectId=''}=useParams();
 const navigate=useNavigate();
 const projects=useStore(s=>s.canvases);
 const {tables,save,remove}=useTimetables();
 const visible=tables.filter(t=>!projectId||t.projectId===projectId);
 const [selected,setSelected]=useState('');
 const table=visible.find(t=>t.id===selected)||visible[0];
 const [settings,setSettings]=useState<Timetable|null>(null);
 const [error,setError]=useState('');
 function newTable(){setError('');setSettings({id:generateId(),name:'My timetable',projectId,from:localDateKey(),until:'',slots:[]});}
 function commitSettings(){if(!settings)return;if(!settings.name.trim()){setError('Give your timetable a name.');return;}if(!settings.from||settings.until&&settings.until<settings.from){setError('Choose a valid date range.');return;}save({...settings,grid:tables.find(t=>t.id===settings.id)?.grid||settings.grid,name:settings.name.trim()});setSelected(settings.id);setSettings(null);setError('');if(projectId&&settings.projectId!==projectId)navigate('/timetable');}

 return <main className="planning-page timetable-page">{!projectId&&<Link className="planning-back" to="/dashboard"><ArrowLeft size={16}/>Back to projects</Link>}<header className="planning-heading"><div><p className="planning-eyebrow">A RHYTHM THAT WORKS FOR YOU</p><h1>Timetable</h1><p>Plan your week, protect your breaks, and leave room to breathe.</p></div><button className="planning-primary" onClick={newTable}><Plus size={18}/>New timetable</button></header>
 <p className="planning-storage">Saved in this browser. Project links are optional.</p>
 {visible.length>0&&<div className="timetable-toolbar"><label>Timetable<select value={table?.id||''} onChange={e=>{setSelected(e.target.value);setSettings(null);setError('');}}>{visible.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>{table&&<><button onClick={()=>{setSettings({...table});setError('');}}><Pencil size={16}/>Edit timetable</button><button onClick={()=>{const copy={...table,id:generateId(),name:table.name+' (copy)',slots:table.slots.map(s=>({...s,id:generateId()}))};save(copy);setSelected(copy.id);setSettings(null);}}><Copy size={16}/>Duplicate</button><button onClick={()=>{remove(table.id);setSettings(null);toast(t=><span>Timetable removed. <button onClick={()=>{save(table);setSelected(table.id);toast.dismiss(t.id);}}>Undo</button></span>);}}><Trash2 size={16}/>Delete</button></>}</div>}
 {settings&&<form className="planning-editor" onSubmit={e=>{e.preventDefault();commitSettings();}}><h2>{tables.some(t=>t.id===settings.id)?'Edit timetable':'Create your timetable'}</h2><div className="planning-fields"><label>Name<input autoFocus required maxLength={100} value={settings.name} onChange={e=>setSettings({...settings,name:e.target.value})}/></label><label>Project (optional)<select value={settings.projectId} onChange={e=>setSettings({...settings,projectId:e.target.value})}><option value="">Personal · no project</option>{Object.values(projects).map(p=><option key={p.id} value={p.id}>{p.name||p.title||'Untitled project'}</option>)}</select></label><label>Starts on<input type="date" required value={settings.from} onChange={e=>setSettings({...settings,from:e.target.value})}/></label><label>Ends on (optional)<input type="date" min={settings.from} value={settings.until} onChange={e=>setSettings({...settings,until:e.target.value})}/></label></div><p>The weekly pattern repeats within these dates.</p>{error&&<p role="alert">{error}</p>}<div className="planning-actions"><button className="planning-primary">Save timetable</button><button type="button" onClick={()=>{setSettings(null);setError('');}}>Cancel</button></div></form>}

 {table&&<><div className="timetable-summary"><div><h2>{table.name}</h2><p>{table.from} {table.until?`— ${table.until}`:'onwards'} · Repeats weekly</p></div>{table.projectId&&projects[table.projectId]?<Link to={`/project/${table.projectId}`}>{projects[table.projectId].name||projects[table.projectId].title||'Linked project'} ↗</Link>:<span>Personal timetable</span>}</div><TimetableGrid key={table.id} table={table} save={save} /></>}
 {!table&&!settings&&<div className="planning-empty"><Clock size={36}/><h2>Your week, thoughtfully planned.</h2><p>Create a timetable with work sessions, daily routines and proper breaks.</p><button className="planning-primary" onClick={newTable}>Create a timetable</button></div>}
 </main>;
}
