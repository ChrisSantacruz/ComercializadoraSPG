import React from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { cn } from '../../lib/cn';

export interface DropdownMenuItem {
  key: string;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
}

export interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownMenuItem[];
  align?: 'left' | 'right';
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  trigger,
  items,
  align = 'right',
}) => (
  <Menu as="div" className="relative inline-block text-left">
    <MenuButton className="inline-flex focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2">
      {trigger}
    </MenuButton>
    <MenuItems
      anchor={align === 'right' ? 'bottom end' : 'bottom start'}
      transition
      className={cn(
        'z-dropdown mt-2 w-48 origin-top-right rounded-lg border border-gray-200 bg-white py-1 shadow-medium outline-none transition',
        'data-[closed]:scale-95 data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75',
      )}
    >
      {items.map((item) => (
        <MenuItem key={item.key} disabled={item.disabled}>
          {({ focus }) => (
            <button
              type="button"
              className={cn(
                'flex w-full px-3 py-2 text-left text-sm text-gray-700',
                focus && 'bg-gray-50 text-gray-900',
                item.disabled && 'cursor-not-allowed opacity-50',
              )}
              onClick={item.onSelect}
            >
              {item.label}
            </button>
          )}
        </MenuItem>
      ))}
    </MenuItems>
  </Menu>
);
