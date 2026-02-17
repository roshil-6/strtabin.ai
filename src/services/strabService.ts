
export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export const sendStrabMessage = async (messages: ChatMessage[], projectContext: any) => {
    try {
        const response = await fetch('http://localhost:3001/api/chat', {
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
        return "I'm having trouble connecting to my neural core. Please ensure the backend server is running.";
    }
};
