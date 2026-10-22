import type { Node, Edge } from '@xyflow/react';
export type BoardSnapshot = {nodes:Node[];edges:Edge[]};
export function availableBoardPosition(nodes:Node[],initial:{x:number;y:number},width=220,height=190) {
 const position={...initial};
 while(nodes.some(n=>position.x<n.position.x+(Number(n.measured?.width||n.width||n.style?.width)||220)+24&&position.x+width+24>n.position.x&&position.y<n.position.y+(Number(n.measured?.height||n.height||n.style?.height)||190)+24&&position.y+height+24>n.position.y))position.y+=height+40;
 return position;
}
export function duplicateBoardSelection(current:BoardSnapshot,makeId:()=>string):BoardSnapshot {
 const selected=current.nodes.filter(n=>n.selected);
 if(!selected.length)return current;
 const left=Math.min(...selected.map(n=>n.position.x));
 const top=Math.min(...selected.map(n=>n.position.y));
 const right=Math.max(...selected.map(n=>n.position.x+(Number(n.measured?.width||n.width||n.style?.width)||220)));
 const bottom=Math.max(...selected.map(n=>n.position.y+(Number(n.measured?.height||n.height||n.style?.height)||190)));
 const origin=availableBoardPosition(current.nodes,{x:left+40,y:top+40},right-left,bottom-top);
 const ids=new Map(selected.map(n=>[n.id,makeId()]));
 const nodes=current.nodes.map(n=>({...n,selected:false}));
 for(const n of selected) {
  const data={...n.data};
  if(typeof data.parentIdeaId==='string'&&ids.has(data.parentIdeaId))data.parentIdeaId=ids.get(data.parentIdeaId);
  nodes.push({...n,id:ids.get(n.id)!,data,position:{x:origin.x+n.position.x-left,y:origin.y+n.position.y-top},selected:true});
 }
 return {nodes,edges:[...current.edges.map(e=>({...e,selected:false})),...current.edges.filter(e=>ids.has(e.source)&&ids.has(e.target)).map(e=>({...e,id:makeId(),source:ids.get(e.source)!,target:ids.get(e.target)!,selected:false}))]};
}
export function projectBoardPatch<T extends {canvases:Record<string,BoardSnapshot & {updatedAt:number}>;currentCanvasId:string|null}>(state:T,id:string,next:BoardSnapshot) {
 const project=state.canvases[id];
 if(!project)return {};
 return {canvases:{...state.canvases,[id]:{...project,...next,updatedAt:Date.now()}},...(state.currentCanvasId===id?next:{})};
}
export function readableBoardLabel(value:unknown):string {
 return String(value??'').replaceAll('\u00e2\u20ac\u00a6','...').replaceAll('\u00c2\u00b7',' / ');
}
export function boardConnectionError(current:BoardSnapshot,connection:{source:string|null;target:string|null},replacingId?:string):string {
 if(!connection.source||!connection.target)return 'Choose two ideas to connect.';
 if(connection.source===connection.target)return 'Choose a different idea to connect to.';
 if(!current.nodes.some(n=>n.id===connection.source)||!current.nodes.some(n=>n.id===connection.target))return 'One of these ideas was removed. Choose another pair.';
 if(current.edges.some(e=>e.id!==replacingId&&e.source===connection.source&&e.target===connection.target))return 'These ideas are already connected.';
 return '';
}
