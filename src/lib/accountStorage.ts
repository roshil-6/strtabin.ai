import type { StateStorage } from 'zustand/middleware';
let account: string | null = null;
export const accountKey = (owner:string, name:string) => `stratabin-account:${encodeURIComponent(owner)}:${name}`;
export const currentAccount = () => account;
export function selectAccount(owner:string|null) { account=owner; }
export const accountStorage:StateStorage = {
    getItem: name => account ? localStorage.getItem(accountKey(account,name)) : null,
    setItem: (name,value) => { if(account) localStorage.setItem(accountKey(account,name),value); },
    removeItem: name => { if(account) localStorage.removeItem(accountKey(account,name)); },
};
