export type TimeSlot = { id:string; title:string; day:number; start:string; end:string; kind:'work'|'break' };
export type Timetable = { id:string; name:string; projectId:string; from:string; until:string; slots:TimeSlot[]; grid?: TimetableGridData };
export function slotError(slot:TimeSlot, slots:TimeSlot[]):string {
 if(!slot.title.trim())return 'Give this time slot a name.';
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.end)||slot.end<=slot.start)return 'End time must be after start time. Split overnight sessions across two days.';
 if(slots.some(s=>s.id!==slot.id&&s.day===slot.day&&slot.start<s.end&&slot.end>s.start))return 'This overlaps another slot on the same day. Adjust the times first.';
 return '';
}

export type TimetableGridData = { columns: {id:string; label:string}[]; rows: {id:string; start:string; end:string; kind?:'break'; label?:string; cells:Record<string,{text:string; isBreak:boolean}>}[] };
export function timetableGrid(table:Timetable):TimetableGridData {
 if(table.grid)return table.grid;
 const columns=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((label,i)=>({id:`day-${i}`,label}));
 const periods=[...new Set(table.slots.map(s=>`${s.start}|${s.end}`))].sort();
 if(!periods.length)periods.push('09:00|10:00','10:00|11:00','11:00|12:00');
 return {columns,rows:periods.map((period,i)=>{const [start,end]=period.split('|');return {id:`period-${i}`,start,end,cells:Object.fromEntries(columns.map((c,day)=>{const slots=table.slots.filter(s=>s.day===day&&s.start===start&&s.end===end);return [c.id,{text:slots.map(s=>s.title).join(' / '),isBreak:slots.length>0&&slots.every(s=>s.kind==='break')}];}))};})};
}

// The editable grid supersedes legacy slots; exporting both would revive removed activities.
export function currentTimetable(table:Timetable):Timetable {
 return table.grid ? {...table,slots:[]} : table;
}

export function periodMinutes(start:string,end:string):number {
 const valid=/^([01]\d|2[0-3]):[0-5]\d$/;
 if(!valid.test(start)||!valid.test(end))return 0;
 const minutes=(time:string)=>Number(time.slice(0,2))*60+Number(time.slice(3));
 return Math.max(0,minutes(end)-minutes(start));
}
export function insertTimedBreak(grid:TimetableGridData,id:string,label:string,start:string,end:string):TimetableGridData {
 if(!label.trim())throw new Error('Give your break a name.');
 if(!periodMinutes(start,end))throw new Error('Choose an end time after the start time.');
 if(grid.rows.some(r=>periodMinutes(r.start,r.end)>0&&start<r.end&&end>r.start))throw new Error('This overlaps a period. Choose a gap or adjust that period’s times first.');
 const rows=[...grid.rows];
 const next=rows.findIndex(r=>r.start&&r.start>=end);
 rows.splice(next<0?rows.length:next,0,{id,start,end,kind:'break',label:label.trim(),cells:{}});
 return {...grid,rows};
}
