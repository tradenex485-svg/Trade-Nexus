import type { Meta, StoryObj } from '@storybook/nextjs';
import { Badge } from './badge';

/**
 * Badge component displays small labels or status indicators.
 *
 * ## Features
 * - Multiple variants (default, secondary, destructive, outline)
 * - Rounded pill shape
 * - Used for status, counts, or categories
 * - Customizable with className
 */
const meta = {
  title: 'UI/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A badge component used to display status, counts, or categories. Perfect for compliance statuses, position counts, and risk indicators in Trade Nexus.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline'],
      description: 'Visual style variant of the badge',
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default primary badge variant
 */
export const Default: Story = {
  args: {
    children: 'Default',
  },
};

/**
 * Secondary badge for less prominent labels
 */
export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary',
  },
};

/**
 * Destructive badge for warnings or errors
 */
export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Destructive',
  },
};

/**
 * Outline badge with border
 */
export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline',
  },
};

/**
 * All badge variants displayed together
 */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default">Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  ),
};

/**
 * Compliance status badges
 */
export const ComplianceStatus: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
        Compliant
      </Badge>
      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
        Warning
      </Badge>
      <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
        Breach
      </Badge>
      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
        Pending Review
      </Badge>
    </div>
  ),
};

/**
 * Position count badges
 */
export const PositionCounts: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Active Positions</span>
        <Badge variant="default">24</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">At Risk</span>
        <Badge variant="destructive">3</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Pending</span>
        <Badge variant="secondary">12</Badge>
      </div>
    </div>
  ),
};

/**
 * Market badges
 */
export const MarketBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="outline">NYMEX</Badge>
      <Badge variant="outline">ICE</Badge>
      <Badge variant="outline">CME</Badge>
      <Badge variant="outline">LME</Badge>
      <Badge variant="outline">COMEX</Badge>
    </div>
  ),
};

/**
 * Commodity type badges
 */
export const CommodityTypes: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50">
        Crude Oil
      </Badge>
      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
        Natural Gas
      </Badge>
      <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/50">
        Silver
      </Badge>
      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
        Gold
      </Badge>
      <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50">
        Copper
      </Badge>
    </div>
  ),
};

/**
 * Risk level badges
 */
export const RiskLevels: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm">Low Risk</span>
        <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
          &lt; 50%
        </Badge>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm">Medium Risk</span>
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
          50-75%
        </Badge>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm">High Risk</span>
        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50">
          75-90%
        </Badge>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm">Critical Risk</span>
        <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
          &gt; 90%
        </Badge>
      </div>
    </div>
  ),
};

/**
 * Badge with custom styling
 */
export const CustomStyled: Story = {
  args: {
    className: 'text-base px-4 py-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 border-blue-500/50',
    children: 'Premium',
  },
};
