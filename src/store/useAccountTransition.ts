import { create } from 'zustand';
export const useAccountTransition = create<{ signingOut: boolean }>(() => ({ signingOut: false }));
