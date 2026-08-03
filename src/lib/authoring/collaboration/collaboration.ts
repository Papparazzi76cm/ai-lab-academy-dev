export interface ActiveEditor {
  id: string;
  name: string;
  avatar_url?: string;
  active_block_id?: string;
  last_active: string;
}

export interface LockState {
  isLocked: boolean;
  lockedBy?: ActiveEditor;
  lockedAt?: string;
}

export function createLockState(editor?: ActiveEditor): LockState {
  const state: LockState = {
    isLocked: Boolean(editor),
  };
  if (editor) {
    state.lockedBy = editor;
    state.lockedAt = new Date().toISOString();
  }
  return state;
}
