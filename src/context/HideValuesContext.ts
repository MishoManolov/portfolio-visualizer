import { createContext, useContext } from 'react';

export const HideValuesContext = createContext(false);
export function useHideValues() { return useContext(HideValuesContext); }
