import { qGet } from '../db/driver.js';
import { requireClerkAuth } from '../middleware/requireClerkAuth.js';
export function registerPersonalWorkspaceRoutes(app, authenticate=requireClerkAuth) {
    app.get('/api/personal-workspace',authenticate,async(req,res)=>{
        res.set('Cache-Control','no-store');
        try { const row=await qGet('SELECT revision, snapshot FROM personal_workspaces WHERE user_id = ?',[req.userId]);
            res.json({revision:row?.revision || 0,snapshot:row?JSON.parse(row.snapshot):null});
        } catch {res.status(503).json({error:'Your cloud workspace could not be loaded. Please retry.'});}
    });
    app.put('/api/personal-workspace',authenticate,async(req,res)=>{
        res.set('Cache-Control','no-store');
        const {revision,snapshot}=req.body||{};
        if(!Number.isSafeInteger(revision)||revision<0||!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot)||!snapshot.workspace||typeof snapshot.workspace!=='object'||Array.isArray(snapshot.workspace)||!Array.isArray(snapshot.tables)||Object.keys(snapshot).some(key=>!['workspace','tables'].includes(key))) return res.status(400).json({error:'Invalid workspace snapshot.'});
        const serialized=JSON.stringify(snapshot);
        if(Buffer.byteLength(serialized)>8*1024*1024)return res.status(413).json({error:'Workspace exceeds the 8 MB cloud snapshot limit. Export large attachments separately.'});
        try {
            const row=revision===0
                ? await qGet('INSERT INTO personal_workspaces (user_id, revision, snapshot) VALUES (?, 1, ?) ON CONFLICT (user_id) DO NOTHING RETURNING revision',[req.userId,serialized])
                : await qGet('UPDATE personal_workspaces SET snapshot = ?, revision = revision + 1 WHERE user_id = ? AND revision = ? RETURNING revision',[serialized,req.userId,revision]);
            if(!row)return res.status(409).json({error:'This workspace changed on another device. Reload to review both copies.'});
            res.json({revision:row.revision});
        } catch {res.status(503).json({error:'Cloud save failed. Your local copy is retained.'});}
    });
}
