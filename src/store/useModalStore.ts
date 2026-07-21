import { create } from 'zustand';

interface ConfirmOptions {
    message: string;
    resolve: (value: boolean) => void;
}

interface PromptOptions {
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

const useModalStore = create<ModalStore>((set) => ({
    confirmConfig: null,
    promptConfig: null,
    confirm: (message) => {
        return new Promise((resolve) => {
            set({ confirmConfig: { message, resolve } });
        });
    },
    prompt: (message, defaultValue = '') => {
        return new Promise((resolve) => {
            set({ promptConfig: { message, defaultValue, resolve } });
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
