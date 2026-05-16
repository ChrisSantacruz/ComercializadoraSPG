import React from 'react';
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/react';
import { cn } from '../../lib/cn';

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

export type TabsVariant = 'segmented' | 'underline';

export interface TabsProps {
  tabs: TabItem[];
  className?: string;
  defaultIndex?: number;
  selectedIndex?: number;
  onChange?: (index: number) => void;
  variant?: TabsVariant;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  className,
  defaultIndex = 0,
  selectedIndex,
  onChange,
  variant = 'segmented',
}) => (
  <TabGroup
    defaultIndex={defaultIndex}
    selectedIndex={selectedIndex}
    onChange={onChange}
    className={cn('w-full', className)}
  >
    <TabList
      className={cn(
        variant === 'segmented' && 'flex gap-1 rounded-lg bg-gray-100 p-1',
        variant === 'underline' &&
          'flex gap-0 border-b border-gray-200 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
      )}
    >
      {tabs.map((t) => (
        <Tab
          key={t.id}
          className={({ selected }) =>
            cn(
              'shrink-0 whitespace-nowrap text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
              variant === 'segmented' &&
                cn(
                  'flex-1 rounded-md px-3 py-2',
                  selected ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900',
                ),
              variant === 'underline' &&
                cn(
                  'border-b-2 px-3 py-2.5 -mb-px sm:px-4',
                  selected
                    ? 'border-primary-600 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800',
                ),
            )
          }
        >
          {t.label}
        </Tab>
      ))}
    </TabList>
    <TabPanels className={cn(variant === 'segmented' ? 'mt-4' : 'mt-6')}>
      {tabs.map((t) => (
        <TabPanel key={t.id} className="rounded-lg outline-none">
          {t.content}
        </TabPanel>
      ))}
    </TabPanels>
  </TabGroup>
);
