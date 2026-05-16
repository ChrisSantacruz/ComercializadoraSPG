import React from 'react';
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  DialogDescription,
} from '@headlessui/react';
import { cn } from '../../lib/cn';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  side?: 'right' | 'left';
  children?: React.ReactNode;
  className?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  open,
  onClose,
  title,
  description,
  side = 'right',
  children,
  className,
}) => {
  const sidePos = side === 'right' ? 'right-0' : 'left-0';

  return (
    <Dialog open={open} onClose={() => onClose()} className="relative z-modal">
      <DialogBackdrop
        transition
        className="fixed inset-0 z-modal bg-gray-900/40 transition data-[closed]:opacity-0 data-[enter]:duration-200 data-[leave]:duration-150"
      />
      <div className="fixed inset-0 z-modal flex">
        <DialogPanel
          transition
          className={cn(
            'fixed top-0 z-modal flex h-full w-full max-w-md flex-col bg-white p-4 shadow-strong transition sm:p-6 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] pt-[max(1.5rem,env(safe-area-inset-top,0px))]',
            'data-[closed]:opacity-0 data-[enter]:duration-200 data-[leave]:duration-150',
            sidePos,
            className,
          )}
        >
          <DialogTitle className="text-lg font-semibold text-gray-900">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="mt-1 text-sm text-gray-600">
              {description}
            </DialogDescription>
          ) : null}
          {children ? <div className="mt-4 flex-1 overflow-y-auto">{children}</div> : null}
        </DialogPanel>
      </div>
    </Dialog>
  );
};

/** Bottom / compact sheet — same headless dialog, tuned for mobile panels */
export const Sheet: React.FC<
  Omit<DrawerProps, 'side'> & { title: string }
> = ({ open, onClose, title, description, children, className }) => (
  <Dialog open={open} onClose={() => onClose()} className="relative z-modal">
    <DialogBackdrop
      transition
      className="fixed inset-0 z-modal bg-gray-900/40 transition data-[closed]:opacity-0 data-[enter]:duration-200 data-[leave]:duration-150"
    />
    <div className="fixed inset-0 z-modal flex items-end justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:items-center sm:px-4">
      <DialogPanel
        transition
        className={cn(
          'w-full max-w-lg rounded-t-2xl bg-white p-4 shadow-strong transition sm:rounded-2xl sm:p-6',
          'data-[closed]:translate-y-8 data-[closed]:opacity-0 data-[enter]:duration-200 data-[leave]:duration-150',
          className,
        )}
      >
        <DialogTitle className="text-lg font-semibold text-gray-900">{title}</DialogTitle>
        {description ? (
          <DialogDescription className="mt-1 text-sm text-gray-600">
            {description}
          </DialogDescription>
        ) : null}
        {children ? <div className="mt-4">{children}</div> : null}
      </DialogPanel>
    </div>
  </Dialog>
);
