
export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export const sendStrabMessage = async (messages: ChatMessage[], projectContext: any) => {
    // Use environment variable for deployment (Render), fallback to localhost
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    console.log("[STRAB Service] Using API URL:", API_URL);

    try {
        const response = await fetch(`${API_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages,
                projectContext
            }),
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.content[0].text;
    } catch (error) {
        console.error("Failed to fetch STRAB response:", error);
        return `I'm having trouble connecting to my neural core.\n\n[DEBUG INFO]\nTarget URL: ${API_URL}\nError: ${error instanceof Error ? error.message : String(error)}`;
    }
};
