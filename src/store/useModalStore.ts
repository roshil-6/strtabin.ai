import { create } from 'zustand';

interface ConfirmOptions {
    id: number;
    message: string;
    resolve: (value: boolean) => void;
}

interface PromptOptions {
    id: number;
    message: string;
    defaultValue?: string;
    resolve: (value: string | null) => void;
}

interface ModalStore {
    confirmConfig: ConfirmOptions | null;
    promptConfig: PromptOptions | null;
    confirm: (message: string) => Promise<boolean>;
    prompt: (message: string, defaultValue?: string) => Promise<string | null>;
    resolveConfirm: (value: boolean) => void;
    resolvePrompt: (value: string | null) => void;
}

let nextModalId = 0;

const useModalStore = create<ModalStore>((set) => ({
    confirmConfig: null,
    promptConfig: null,
    confirm: (message) => {
        return new Promise((resolve) => {
            set(state => { state.confirmConfig?.resolve(false); state.promptConfig?.resolve(null); return { confirmConfig: { id: ++nextModalId, message, resolve }, promptConfig: null }; });
        });
    },
    prompt: (message, defaultValue = '') => {
        return new Promise((resolve) => {
            set(state => { state.promptConfig?.resolve(null); state.confirmConfig?.resolve(false); return { promptConfig: { id: ++nextModalId, message, defaultValue, resolve }, confirmConfig: null }; });
        });
    },
    resolveConfirm: (value) => {
        set((state) => {
            if (state.confirmConfig) state.confirmConfig.resolve(value);
            return { confirmConfig: null };
        });
    },
    resolvePrompt: (value) => {
        set((state) => {
            if (state.promptConfig) state.promptConfig.resolve(value);
            return { promptConfig: null };
        });
    },
}));

export default useModalStore;
