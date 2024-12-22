import { Dialog } from '@headlessui/react';
import { memo } from 'react';
import { classNames } from '~/utils/classNames';

interface ReturnBranchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export const ReturnBranchDialog = memo(({ isOpen, onClose, onConfirm, isLoading }: ReturnBranchDialogProps) => (
  <Dialog open={isOpen} onClose={onClose} className="relative z-50">
    <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
    <div className="fixed inset-0 flex items-center justify-center p-4">
      <Dialog.Panel className="bg-bolt-background rounded-lg p-6 max-w-sm">
        <Dialog.Title className="text-lg font-medium mb-4">Return to Previous Branch?</Dialog.Title>
        <Dialog.Description className="text-bolt-text-secondary mb-6">
          This will discard any uncommitted changes and return to your previous branch. Are you sure?
        </Dialog.Description>
        <div className="flex justify-end gap-3">
          <button
            className="px-4 py-2 rounded-md bg-bolt-elements-background-depth-1 hover:bg-bolt-elements-background-depth-2"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className={classNames(
              'px-4 py-2 rounded-md bg-bolt-primary text-white',
              isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-bolt-primary/90',
            )}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="i-ph:circle-notch animate-spin" />
                Returning...
              </span>
            ) : (
              'Return'
            )}
          </button>
        </div>
      </Dialog.Panel>
    </div>
  </Dialog>
));
