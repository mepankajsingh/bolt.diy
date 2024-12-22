import { useStore } from '@nanostores/react';
import { useState } from 'react';
import useViewport from '~/lib/hooks';
import { useGit } from '~/lib/hooks/useGit';
import { chatStore } from '~/lib/stores/chat';
import { workbenchStore } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import { PullRequestTestingBanner } from './PRTestingBanner';
import { ReturnBranchDialog } from './ReturnBranchDialog';

interface HeaderActionButtonsProps {}

export function HeaderActionButtons({}: HeaderActionButtonsProps) {
  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const { showChat } = useStore(chatStore);
  const { returnToPreviousBranch } = useGit();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isSmallViewport = useViewport(1024);
  const canHideChat = showWorkbench || !showChat;

  const handleReturn = async () => {
    setIsLoading(true);

    try {
      await returnToPreviousBranch();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to return to previous branch:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <PullRequestTestingBanner />
      <div className="flex gap-2 items-center">
        <button
          onClick={() => setIsDialogOpen(true)}
          className={classNames(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            'bg-bolt-primary text-white hover:bg-bolt-primary/90',
            'border border-bolt-primary/20',
          )}
        >
          <div className="i-ph:git-branch" />
          Return to Previous Branch
        </button>
        <div className="flex border border-bolt-elements-borderColor rounded-md overflow-hidden">
          <Button
            active={showChat}
            disabled={!canHideChat || isSmallViewport}
            onClick={() => {
              if (canHideChat) {
                chatStore.setKey('showChat', !showChat);
              }
            }}
          >
            <div className="i-bolt:chat text-sm" />
          </Button>
          <div className="w-[1px] bg-bolt-elements-borderColor" />
          <Button
            active={showWorkbench}
            onClick={() => {
              if (showWorkbench && !showChat) {
                chatStore.setKey('showChat', true);
              }

              workbenchStore.showWorkbench.set(!showWorkbench);
            }}
          >
            <div className="i-ph:code-bold" />
          </Button>
        </div>
      </div>
      <ReturnBranchDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onConfirm={handleReturn}
        isLoading={isLoading}
      />
    </>
  );
}

interface ButtonProps {
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}

const Button = ({ active = false, disabled = false, children, onClick }: ButtonProps) => (
  <button
    className={classNames('p-2 transition-colors', {
      'bg-bolt-elements-background-depth-2': active,
      'hover:bg-bolt-elements-background-depth-1': !active && !disabled,
      'opacity-50 cursor-not-allowed': disabled,
    })}
    disabled={disabled}
    onClick={onClick}
  >
    {children}
  </button>
);
