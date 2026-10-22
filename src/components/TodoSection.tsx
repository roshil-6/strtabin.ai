import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { Check, Plus, Scissors, Pencil, Trash2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';
import { generateId } from '../utils/uuid';
import './Planning.css';

export default function TodoSection() {
 const { id = '' } = useParams();
 const canvas = useStore(s => s.canvases[id]);
 const [draft, setDraft] = useState('');
 const [filter, setFilter] = useState('all');
 const [editing, setEditing] = useState<{id:string; mode:'edit'|'split'; value:string}|null>(null);
 const todos = canvas?.todos || [];
 function save() {
  if (!editing) return;
  const texts = (editing.mode === 'split' ? editing.value.split('\n') : [editing.value]).map(v=>v.trim()).filter(Boolean);
  if (!texts.length || (editing.mode === 'split' && texts.length < 2)) { toast.error(editing.mode==='split'?'Enter at least two steps, one per line.':'Enter a task description.'); return; }
  if (texts.some(t=>t.length>200) || texts.length>30) { toast.error('Use up to 30 steps, each under 200 characters.'); return; }
  useStore.setState(s=> { const c=s.canvases[id]; if(!c) return s; return {canvases:{...s.canvases,[id]:{...c, updatedAt:Date.now(), todos:(c.todos||[]).flatMap(t=>t.id!==editing.id ? [t] : texts.map((text,i)=>({...t, id:i===0?t.id:generateId(),text,completed:editing.mode==='split'?false:t.completed})))}}}; });
  setEditing(null);
 }
 return <main className="planning-page"><header className="planning-heading"><div><p className="planning-eyebrow">MAKE ROOM FOR PROGRESS</p><h1>Tasks</h1><p>{todos.filter(t=>t.completed).length} of {todos.length} complete · One clear next step at a time.</p></div><Link to={`/timetable/${id}`}><Clock size={18}/> Plan your time</Link></header>
 <div className="planning-filters" aria-label="Task filters">{['all','open','done'].map(f=><button key={f} aria-pressed={filter===f} onClick={()=>setFilter(f)}>{f==='all'?'All tasks':f==='open'?'In progress':'Completed'}</button>)}</div>
 <div className="task-card-grid"><form className="task-card task-composer" onSubmit={e=>{e.preventDefault(); if(!draft.trim())return; useStore.getState().addCanvasTodo(id,draft.trim());setDraft('');setFilter('open');}}><span className="planning-eyebrow">YOUR NEXT STEP</span><textarea aria-label="New task" placeholder="Add your task here…" value={draft} maxLength={200} onChange={e=>setDraft(e.target.value)} required/><button className="planning-primary" disabled={!draft.trim()}><Plus size={17}/>Add task</button></form>
 {todos.filter(t=>filter==='all'||(filter==='done'?t.completed:!t.completed)).map(t=><article key={t.id} className={`task-card ${t.completed?'task-done':''}`}><span className="planning-eyebrow">{t.completed?'COMPLETED':'IN PROGRESS'}</span>{editing?.id===t.id ? <div className="task-edit"><label>{editing.mode==='split'?'One smaller task per line':'Edit task'}<textarea autoFocus value={editing.value} onChange={e=>setEditing({...editing,value:e.target.value})}/></label>{editing.mode==='split'&&<p>This replaces the task with separate, actionable task cards.</p>}<div className="planning-actions"><button onClick={save}>Save</button><button onClick={()=>setEditing(null)}>Cancel</button></div></div>:<><h2>{t.text}</h2><div className="planning-actions"><button onClick={()=>useStore.getState().toggleCanvasTodo(id,t.id)}><Check size={16}/>{t.completed?'Reopen':'Mark as done'}</button><button onClick={()=>setEditing({id:t.id,mode:'split',value:t.text+'\n'})}><Scissors size={16}/>Split task</button><button aria-label={`Edit ${t.text}`} onClick={()=>setEditing({id:t.id,mode:'edit',value:t.text})}><Pencil size={16}/></button><button aria-label={`Delete ${t.text}`} onClick={()=>{useStore.getState().deleteCanvasTodo(id,t.id);toast(s=><span>Task removed. <button onClick={()=>{useStore.setState(state=>{const c=state.canvases[id];return c?{canvases:{...state.canvases,[id]:{...c,todos:(c.todos||[]).some(item=>item.id===t.id)?c.todos:[...(c.todos||[]),t],updatedAt:Date.now()}}}:state;});toast.dismiss(s.id);}}>Undo</button></span>);}}><Trash2 size={16}/></button></div></>}</article>)}
 </div></main>;
}
