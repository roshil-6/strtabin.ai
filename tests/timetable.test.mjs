import test from 'node:test';
import assert from 'node:assert/strict';
import { slotError } from '../src/lib/timetable.ts';
const slot={id:'one',title:'Work',day:0,start:'09:00',end:'10:00',kind:'work'};
test('timetable rejects invalid and overlapping time slots including breaks',()=>{
 assert.match(slotError({...slot,end:'08:00'},[]),/after/);
 assert.match(slotError({...slot,start:'25:00'},[]),/after/);
 assert.match(slotError({...slot,id:'two',kind:'break',start:'09:30'},[slot]),/overlaps/);
 assert.equal(slotError({...slot,id:'two',start:'10:00',end:'10:30'},[slot]),'');
 assert.equal(slotError({...slot,id:'two',day:1},[slot]),'');
 assert.equal(slotError(slot,[slot]),'');
});
import { timetableGrid } from '../src/lib/timetable.ts';
test('weekly grid migrates all existing activities and breaks into weekday cells',()=>{
 const grid=timetableGrid({slots:[{...slot,title:'Research'},{...slot,id:'break',day:1,kind:'break',title:'Rest'}]});
 assert.equal(grid.columns.length,7);
 assert.equal(grid.rows.length,1);
 assert.equal(grid.rows[0].cells['day-0'].text,'Research');
 assert.equal(grid.rows[0].cells['day-1'].isBreak,true);
});
test('custom timetable rows and columns survive without being regenerated',()=>{
 const grid={columns:[{id:'custom',label:'Extra day'}],rows:[{id:'custom-row',start:'',end:'',cells:{custom:{text:'Custom plan',isBreak:false}}}]};
 assert.deepEqual(timetableGrid({slots:[],grid:JSON.parse(JSON.stringify(grid))}),grid);
 assert.equal(timetableGrid({slots:[]}).rows.length,3);
});
import { currentTimetable } from '../src/lib/timetable.ts';
test('saving and exporting a grid does not retain deleted legacy activities',()=>{
 const table={slots:[{...slot,title:'Removed legacy task'}],grid:{columns:[{id:'day-0',label:'Monday'}],rows:[]}};
 assert.deepEqual(currentTimetable(table).slots,[]);
 assert.equal(currentTimetable(table).grid,table.grid);
 assert.equal(table.slots.length,1);
 assert.deepEqual(currentTimetable({slots:[slot]}).slots,[slot]);
});
import { insertTimedBreak, periodMinutes } from '../src/lib/timetable.ts';
test('timed breaks insert into a gap without changing existing activities',()=>{
 const grid={columns:[{id:'mon',label:'Monday'}],rows:[{id:'a',start:'09:00',end:'10:00',cells:{mon:{text:'Work',isBreak:false}}},{id:'b',start:'10:15',end:'11:00',cells:{}}]};
 const result=insertTimedBreak(grid,'rest','Tea break','10:00','10:15');
 assert.deepEqual(result.rows.map(r=>r.id),['a','rest','b']);
 assert.equal(result.rows[1].kind,'break');
 assert.equal(result.rows[0].cells.mon.text,'Work');
 assert.equal(grid.rows.length,2);
 assert.equal(periodMinutes('10:00','10:15'),15);
 assert.throws(()=>insertTimedBreak(grid,'x','Rest','09:30','10:15'),/overlaps/);
 assert.throws(()=>insertTimedBreak(grid,'x','Rest','11:00','10:00'),/after/);
 assert.throws(()=>insertTimedBreak(grid,'x',' ','11:00','11:15'),/name/);
 assert.equal(periodMinutes('',''),0);
});
