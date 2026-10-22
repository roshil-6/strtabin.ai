import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { currentTimetable, type Timetable } from '../lib/timetable';
export const useTimetables = create<{tables:Timetable[]; save:(table:Timetable)=>void; remove:(id:string)=>void}>()(persist((set)=>({tables:[],save:table=>set(s=>({tables:s.tables.some(t=>t.id===table.id)?s.tables.map(t=>t.id===table.id?currentTimetable(table):t):[...s.tables,currentTimetable(table)]})),remove:id=>set(s=>({tables:s.tables.filter(t=>t.id!==id)}))}),{name:'stratabin-timetables-v1'}));
