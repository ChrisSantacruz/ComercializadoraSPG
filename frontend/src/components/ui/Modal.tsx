import React from 'react';
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  DialogDescription,
} from '@headlessui/react';
import { cn } from '../../lib/cn';

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: keyof typeof sizes;
  children?: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
  className,
}) => (
  <Dialog open={open} onClose={() => onClose()} className="relative z-modal">
    <DialogBackdrop
      transition
      className="fixed inset-0 z-modal bg-gray-900/40 transition data-[closed]:opacity-0 data-[enter]:duration-200 data-[leave]:duration-150"
    />
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4 max-sm:pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
      <DialogPanel
        transition
        className={cn(
          'w-full max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-bottom,0px)-env(safe-area-inset-top,0px)-2rem))] overflow-y-auto rounded-2xl bg-white p-5 shadow-strong transition sm:max-h-[85vh]',
          'data-[closed]:scale-95 data-[closed]:opacity-0 data-[enter]:duration-200 data-[leave]:duration-150',
          sizes[size],
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
