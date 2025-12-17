import React, { useRef } from 'react';

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  setActiveTab: (id: string) => void;
  disabled?: boolean;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, setActiveTab, disabled }) => {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (disabled) return;

    let nextIndex = -1;
    const tabsCount = tabs.length;

    if (event.key === 'ArrowRight') {
      nextIndex = (index + 1) % tabsCount;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (index - 1 + tabsCount) % tabsCount;
    }

    if (nextIndex !== -1) {
      event.preventDefault();
      const nextTab = tabs[nextIndex];
      setActiveTab(nextTab.id);
      tabRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <nav className="flex space-x-2 bg-dark-surface p-1.5 rounded-xl border border-dark-border" role="tablist" aria-label="Tabs">
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          // FIX: The callback ref function should not return a value. Wrapped the assignment in curly braces to ensure a void return type.
          ref={(el) => { tabRefs.current[index] = el; }}
          onClick={() => setActiveTab(tab.id)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          disabled={disabled}
          role="tab"
          aria-selected={activeTab === tab.id}
          className={`
            flex-1
            ${
              activeTab === tab.id
                ? 'bg-brand-primary text-dark-bg'
                : 'text-dark-text-secondary hover:text-dark-text-primary hover:bg-dark-border/50'
            }
            flex items-center justify-center gap-2 whitespace-nowrap py-2.5 px-4 rounded-lg font-bold text-sm sm:text-base transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </nav>
  );
};