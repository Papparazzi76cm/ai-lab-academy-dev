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
  return {
    isLocked: Boolean(editor),
    lockedBy: editor,
    lockedAt: editor ? new Date().toISOString() : undefined,
  };
}
