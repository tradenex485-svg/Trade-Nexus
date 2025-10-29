import React from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs';
import { Button } from './button';
import { ChevronRight, Download, Plus, Trash2, Check } from 'lucide-react';

/**
 * Button component is a versatile interactive element used throughout Trade Nexus.
 *
 * ## Features
 * - Multiple variants (default, destructive, outline, secondary, ghost, link, cyber)
 * - Three sizes (sm, default, lg)
 * - Icon support
 * - Full accessibility support with keyboard navigation
 * - Responsive and mobile-friendly
 */
const meta = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A customizable button component with multiple variants and sizes. Built with Radix UI primitives and styled with Tailwind CSS.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link', 'cyber'],
      description: 'Visual style variant of the button',
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
      description: 'Size of the button',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the button',
    },
    asChild: {
      control: 'boolean',
      description: 'Use Radix Slot for composition',
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default primary button variant
 */
export const Default: Story = {
  args: {
    children: 'Primary Button',
  },
};

/**
 * Destructive button for dangerous actions like delete
 */
export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Delete Item',
  },
};

/**
 * Outline button with border and transparent background
 */
export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline Button',
  },
};

/**
 * Secondary button for less prominent actions
 */
export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button',
  },
};

/**
 * Ghost button with minimal styling
 */
export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost Button',
  },
};

/**
 * Link styled button
 */
export const Link: Story = {
  args: {
    variant: 'link',
    children: 'Link Button',
  },
};

/**
 * Cyber themed button with glowing effects
 */
export const Cyber: Story = {
  args: {
    variant: 'cyber',
    children: 'Cyber Button',
  },
};

/**
 * Small size button
 */
export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small Button',
  },
};

/**
 * Large size button
 */
export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large Button',
  },
};

/**
 * Disabled state button
 */
export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled Button',
  },
};

/**
 * Button with leading icon
 */
export const WithLeadingIcon: Story = {
  args: {
    children: (
      <>
        <Plus className="h-4 w-4" />
        Add New Position
      </>
    ),
  },
};

/**
 * Button with trailing icon
 */
export const WithTrailingIcon: Story = {
  args: {
    children: (
      <>
        Continue
        <ChevronRight className="h-4 w-4" />
      </>
    ),
  },
};

/**
 * Icon-only button
 */
export const IconOnly: Story = {
  args: {
    size: 'icon',
    children: <Download className="h-4 w-4" />,
    'aria-label': 'Download report',
  },
};

/**
 * All button variants displayed together
 */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="default">Default</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
        <Button variant="cyber">Cyber</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm">Small</Button>
        <Button size="default">Default</Button>
        <Button size="lg">Large</Button>
        <Button size="icon" aria-label="Icon button"><Check className="h-4 w-4" /></Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled>Disabled</Button>
        <Button variant="destructive" disabled>Disabled Destructive</Button>
        <Button variant="outline" disabled>Disabled Outline</Button>
      </div>
    </div>
  ),
};

/**
 * Real-world trading platform examples
 */
export const TradingExamples: Story = {
  render: () => (
    <div className="flex flex-col gap-4 max-w-md">
      <div className="flex gap-2">
        <Button className="flex-1">
          <Plus className="h-4 w-4" />
          New Trade
        </Button>
        <Button variant="outline" className="flex-1">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>
      <div className="flex gap-2">
        <Button variant="cyber" className="flex-1">
          Execute Trade
        </Button>
        <Button variant="destructive" size="icon" aria-label="Cancel trade">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <Button variant="secondary" className="w-full">
        View Position Limits
      </Button>
      <Button variant="link" className="w-full">
        Learn more about CFTC compliance
      </Button>
    </div>
  ),
};

/**
 * Button with loading state (custom implementation example)
 */
export const WithLoadingState: Story = {
  render: () => {
    const [isLoading, setIsLoading] = React.useState(false);

    const handleClick = () => {
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 2000);
    };

    return (
      <Button onClick={handleClick} disabled={isLoading}>
        {isLoading ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Processing...
          </>
        ) : (
          <>
            <Check className="h-4 w-4" />
            Submit Trade
          </>
        )}
      </Button>
    );
  },
};
