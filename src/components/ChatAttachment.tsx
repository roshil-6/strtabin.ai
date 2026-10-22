import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../constants';

export default function ChatAttachment({ url, name }: { url: string; name: string }) {
    const { getToken } = useAuth();
    const [busy, setBusy] = useState(false);
    const download = async () => {
        if (busy) return;
        setBusy(true);
        try {
            if (!/^\/uploads\/chat\/[\w.-]+$/.test(url)) throw new Error('Invalid attachment.');
            const token = await getToken();
            if (!token) throw new Error('Sign in to download this attachment.');
            const response = await fetch(`${API_BASE_URL}${url}`, { headers: { Authorization: `Bearer ${token}` } });
            if (!response.ok) throw new Error('Attachment unavailable or access denied.');
            const objectUrl = URL.createObjectURL(await response.blob());
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = name.replace(/[/\\]/g, '_') || 'attachment';
            link.click();
            setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        } catch (error) { toast.error(error instanceof Error ? error.message : 'Download failed.'); }
        finally { setBusy(false); }
    };
    return <button type="button" disabled={busy} onClick={() => void download()} className="mb-1.5 inline-flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-white/10 disabled:opacity-60"><Download size={16} />{busy ? 'Downloading…' : name}</button>;
}
