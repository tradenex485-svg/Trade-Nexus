import type { Meta, StoryObj } from '@storybook/nextjs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';
import { Button } from './button';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react';

/**
 * Card component provides a flexible container for grouping related content.
 *
 * ## Composition
 * - Card: Main container
 * - CardHeader: Header section
 * - CardTitle: Title heading (h3)
 * - CardDescription: Subtitle/description text
 * - CardContent: Main content area
 * - CardFooter: Footer section with actions
 */
const meta = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A flexible card container component with header, content, and footer sections. Features glass morphism effect and is commonly used throughout the Trade Nexus dashboard.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic card with all sections
 */
export const Default: Story = {
  render: () => (
    <Card className="w-[380px]">
      <CardHeader>
        <CardTitle>Position Summary</CardTitle>
        <CardDescription>Current trading positions overview</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          You have 12 active positions across 5 different commodities with a total exposure of $2.5M.
        </p>
      </CardContent>
      <CardFooter>
        <Button className="w-full">View Details</Button>
      </CardFooter>
    </Card>
  ),
};

/**
 * Card with just header and content
 */
export const HeaderAndContent: Story = {
  render: () => (
    <Card className="w-[380px]">
      <CardHeader>
        <CardTitle>Market Limits</CardTitle>
        <CardDescription>NYMEX position limits for crude oil</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Spot Month:</span>
            <span className="font-medium">10,000</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Single Month:</span>
            <span className="font-medium">25,000</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">All Months:</span>
            <span className="font-medium">50,000</span>
          </div>
        </div>
      </CardContent>
    </Card>
  ),
};

/**
 * Stats card with icon
 */
export const StatsCard: Story = {
  render: () => (
    <Card className="w-[300px]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">$45,231.89</div>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
          <TrendingUp className="h-3 w-3 text-green-500" />
          <span className="text-green-500">+20.1%</span> from last month
        </p>
      </CardContent>
    </Card>
  ),
};

/**
 * Alert card with warning
 */
export const AlertCard: Story = {
  render: () => (
    <Card className="w-[380px] border-yellow-500/50 bg-yellow-500/10">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-500" />
          <CardTitle className="text-yellow-500">Position Limit Warning</CardTitle>
        </div>
        <CardDescription>Approaching CFTC position limits</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">
          Your current position in CL (Crude Oil) is at 87% of the regulatory limit. Consider reducing exposure.
        </p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline" className="flex-1">View Position</Button>
        <Button variant="default" className="flex-1">Reduce Exposure</Button>
      </CardFooter>
    </Card>
  ),
};

/**
 * Trading dashboard card grid
 */
export const DashboardGrid: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Positions</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">24</div>
          <p className="text-xs text-muted-foreground">
            +12% from last week
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-500">98.5%</div>
          <p className="text-xs text-muted-foreground">
            All limits within threshold
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Risk Exposure</CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">$2.5M</div>
          <p className="text-xs text-muted-foreground">
            -5% from yesterday
          </p>
        </CardContent>
      </Card>
    </div>
  ),
};

/**
 * Position detail card
 */
export const PositionDetailCard: Story = {
  render: () => (
    <Card className="w-[420px]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>CL - Crude Oil</CardTitle>
            <CardDescription>NYMEX WTI Crude Oil Futures</CardDescription>
          </div>
          <div className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-medium">
            Compliant
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Current Position</p>
            <p className="text-2xl font-bold">8,750</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Position Limit</p>
            <p className="text-2xl font-bold">10,000</p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Utilization</span>
            <span className="font-medium">87.5%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-yellow-500" style={{ width: '87.5%' }} />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-700 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Spot Month</span>
            <span>2,100 / 2,500</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Single Month</span>
            <span>3,200 / 4,000</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">All Months</span>
            <span>8,750 / 10,000</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline" size="sm" className="flex-1">View History</Button>
        <Button size="sm" className="flex-1">Manage Position</Button>
      </CardFooter>
    </Card>
  ),
};

/**
 * Minimal card
 */
export const Minimal: Story = {
  render: () => (
    <Card className="w-[300px]">
      <CardContent className="pt-6">
        <p className="text-center text-muted-foreground">
          Simple card with just content
        </p>
      </CardContent>
    </Card>
  ),
};

/**
 * Custom styled card
 */
export const CustomStyled: Story = {
  render: () => (
    <Card className="w-[380px] border-blue-500/50 bg-gradient-to-br from-blue-500/10 to-purple-500/10">
      <CardHeader>
        <CardTitle className="text-blue-400">Premium Feature</CardTitle>
        <CardDescription>Upgrade to unlock advanced analytics</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            Real-time risk monitoring
          </li>
          <li className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            Advanced compliance reporting
          </li>
          <li className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            API access for automation
          </li>
        </ul>
      </CardContent>
      <CardFooter>
        <Button variant="cyber" className="w-full">Upgrade Now</Button>
      </CardFooter>
    </Card>
  ),
};
