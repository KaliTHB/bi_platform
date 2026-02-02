// web-application/src/store/hooks.ts (Fixed)
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './index';

// Export properly typed hooks
export const useAppDispatch = (): AppDispatch => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Export default for convenience
export default {
  useAppDispatch,
  useAppSelector
};