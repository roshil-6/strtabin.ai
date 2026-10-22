import { useState, useRef, useLayoutEffect } from 'react';
import { Plus, Coffee, Trash2, Undo2 } from 'lucide-react';
import { timetableGrid, periodMinutes, insertTimedBreak, type Timetable, type TimetableGridData } from '../lib/timetable';
import { generateId } from '../utils/uuid';

export default function TimetableGrid({table,save}:{table:Timetable;save:(table:Timetable)=>void}) {
 const regionRef=useRef<HTMLDivElement>(null);
 const [focusAdded,setFocusAdded]=useState('');
 const grid=timetableGrid(table);
 const [breakDraft,setBreakDraft]=useState<{label:string;start:string;end:string}|null>(null);
 const [breakError,setBreakError]=useState('');
 function openBreak(){setBreakError('');setBreakDraft({label:'Break',start:'',end:''});}

 useLayoutEffect(()=>{
  if(!focusAdded)return;
  const input=regionRef.current?.querySelector<HTMLInputElement>(`[data-focus-id="${focusAdded}"]`);
  input?.focus();
  input?.scrollIntoView({block:'nearest',inline:'nearest'});
 },[focusAdded]);
 function addRow(){const id=generateId();change({...grid,rows:[...grid.rows,{id,start:'',end:'',cells:{}}]},true);setFocusAdded(id);}
 function addColumn(){const id=generateId();change({...grid,columns:[...grid.columns,{id,label:`Day ${grid.columns.length+1}`}]},true);setFocusAdded(id);}
 const [history,setHistory]=useState<TimetableGridData[]>([]);
 function change(next:TimetableGridData, structural=false){if(structural)setHistory(h=>[...h.slice(-19),grid]);else setHistory([]);save({...table,grid:next});}
 function cell(rowId:string,columnId:string,patch:Partial<{text:string;isBreak:boolean}>){change({...grid,rows:grid.rows.map(r=>r.id===rowId?{...r,cells:{...r.cells,[columnId]:{...(r.cells[columnId] || {text:'',isBreak:false}),...patch}}}:r)});}
 return <section aria-label="Weekly timetable grid">
 <div className="timetable-grid-tools"><div className="planning-actions"><button onClick={addColumn}><Plus size={16}/>Add day row</button><button className="add-timed-break" onClick={openBreak}><Coffee size={16}/>Add timed break</button><button onClick={addRow}><Plus size={16}/>Add time column</button><button disabled={!history.length} onClick={()=>{const previous=history[history.length-1];if(previous){save({...table,grid:previous});setHistory(h=>h.slice(0,-1));}}}><Undo2 size={16}/>Undo row / column change</button></div><p>Plan activities in each day. Add a timed break across the week, or mark a single cell as a break.</p></div>
 {breakDraft&&<form className="timed-break-editor" onSubmit={e=>{e.preventDefault();try{const id=generateId();change(insertTimedBreak(grid,id,breakDraft.label,breakDraft.start,breakDraft.end),true);setBreakDraft(null);setFocusAdded(id);}catch(error){setBreakError(error instanceof Error?error.message:'Could not add break.');}}}>
 <div><h3><Coffee size={18}/> Make time for a break</h3><p>A dedicated time column across all days, placed in time order.</p></div>
 <div className="timed-break-fields"><label>Break name<input autoFocus required maxLength={100} value={breakDraft.label} onChange={e=>setBreakDraft({...breakDraft,label:e.target.value})}/></label><label>From<input type="time" required value={breakDraft.start} onChange={e=>setBreakDraft({...breakDraft,start:e.target.value})}/></label><label>Until<input type="time" required value={breakDraft.end} onChange={e=>setBreakDraft({...breakDraft,end:e.target.value})}/></label><span className="break-duration">{periodMinutes(breakDraft.start,breakDraft.end)||'-'} min</span></div>
 {breakError&&<p role="alert">{breakError}</p>}<div className="planning-actions"><button className="planning-primary">Add break</button><button type="button" onClick={()=>setBreakDraft(null)}>Cancel</button></div></form>}
 <div ref={regionRef} className="timetable-grid-scroll" role="region" aria-label="Scrollable timetable" tabIndex={0}>
 <table className="weekly-grid days-as-rows" style={{minWidth:180+grid.rows.length*190}}>
 <caption className="sr-only">{table.name}: days down the side and time periods across the top</caption>
 <thead><tr><th scope="col" className="time-column">Day / time</th>{grid.rows.map((period,i)=><th scope="col" key={period.id} className={period.kind==='break'?'break-period-heading':''}>
 <span className="grid-row-label">{period.kind==='break'?'BREAK':`PERIOD ${i+1}`}<span>{periodMinutes(period.start,period.end)>0?`${periodMinutes(period.start,period.end)} min`:null}</span></span>
 {period.kind==='break'&&<input className="break-name" aria-label={`Break ${i+1} name`} value={period.label??'Break'} maxLength={100} onChange={e=>change({...grid,rows:grid.rows.map(r=>r.id===period.id?{...r,label:e.target.value}:r)})}/>}
 <div className="period-time-inputs"><input data-focus-id={period.id} type="time" aria-label={`Period ${i+1} start time`} value={period.start} onChange={e=>change({...grid,rows:grid.rows.map(r=>r.id===period.id?{...r,start:e.target.value}:r)})}/><span>to</span><input type="time" aria-label={`Period ${i+1} end time`} value={period.end} onChange={e=>change({...grid,rows:grid.rows.map(r=>r.id===period.id?{...r,end:e.target.value}:r)})}/></div>
 {period.start&&period.end&&period.end<=period.start&&<small role="alert">End must be after start.</small>}
 <button aria-label={`Remove time column ${i+1}`} disabled={grid.rows.length<=1} onClick={()=>change({...grid,rows:grid.rows.filter(r=>r.id!==period.id)},true)}><Trash2 size={14}/>Remove period</button>
 </th>)}</tr></thead>
 <tbody>{grid.columns.map((day,dayIndex)=><tr key={day.id}><th scope="row" className="time-column day-row-heading">
 <input data-focus-id={day.id} aria-label={`Day ${dayIndex+1} name`} value={day.label} maxLength={60} onChange={e=>change({...grid,columns:grid.columns.map(c=>c.id===day.id?{...c,label:e.target.value}:c)})}/>
 <button aria-label={`Remove day row ${day.label}`} disabled={grid.columns.length<=1} onClick={()=>change({...grid,columns:grid.columns.filter(c=>c.id!==day.id),rows:grid.rows.map(r=>({...r,cells:Object.fromEntries(Object.entries(r.cells).filter(([id])=>id!==day.id))}))},true)}><Trash2 size={14}/>Remove day</button>
 </th>{grid.rows.map((period,i)=>{const value=period.cells[day.id]||{text:'',isBreak:false};return period.kind==='break'?<td key={period.id} className="timed-break-column"><Coffee size={20}/><span>{period.label||'Break'}</span><small>{periodMinutes(period.start,period.end)>0?`${periodMinutes(period.start,period.end)} min`:'Set break times'}</small></td>:<td key={period.id} className={value.isBreak?'grid-break':''}>
 <textarea aria-label={`${day.label}, period ${i+1}`} placeholder={value.isBreak?'Break':'Add activity...'} value={value.text} maxLength={1000} onChange={e=>cell(period.id,day.id,{text:e.target.value})}/>
 <button className="grid-break-button" aria-label={`Break for ${day.label}, period ${i+1}`} aria-pressed={value.isBreak} onClick={()=>cell(period.id,day.id,{isBreak:!value.isBreak})}><Coffee size={14}/>{value.isBreak?'Break':'Set break'}</button></td>;})}</tr>)}</tbody>
 </table></div>
 </section>;
}
