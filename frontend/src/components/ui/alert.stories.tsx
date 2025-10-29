import type { Meta, StoryObj } from '@storybook/nextjs';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, TrendingUp, Bell } from 'lucide-react';

/**
 * Alert component displays important messages and notifications.
 *
 * ## Composition
 * - Alert: Main container
 * - AlertTitle: Title/heading
 * - AlertDescription: Detailed message
 * - Icon (optional): Visual indicator
 *
 * ## Features
 * - Two variants (default, destructive)
 * - Icon support
 * - Accessible with role="alert"
 * - Used for system messages, warnings, and notifications
 */
const meta = {
  title: 'UI/Alert',
  component: Alert,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'An alert component for displaying important messages, warnings, and notifications throughout Trade Nexus. Commonly used for compliance alerts, risk warnings, and system notifications.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive'],
      description: 'Visual style variant of the alert',
    },
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default alert variant
 */
export const Default: Story = {
  render: () => (
    <Alert className="w-[500px]">
      <Info className="h-4 w-4" />
      <AlertTitle>Information</AlertTitle>
      <AlertDescription>
        This is a default alert message with important information for the user.
      </AlertDescription>
    </Alert>
  ),
};

/**
 * Destructive alert for errors and warnings
 */
export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive" className="w-[500px]">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        Your session has expired. Please log in again to continue.
      </AlertDescription>
    </Alert>
  ),
};

/**
 * Success alert
 */
export const Success: Story = {
  render: () => (
    <Alert className="w-[500px] border-green-500/50 text-green-400 [&>svg]:text-green-400">
      <CheckCircle2 className="h-4 w-4" />
      <AlertTitle>Success</AlertTitle>
      <AlertDescription>
        Your position has been successfully updated and is now compliant.
      </AlertDescription>
    </Alert>
  ),
};

/**
 * Warning alert
 */
export const Warning: Story = {
  render: () => (
    <Alert className="w-[500px] border-yellow-500/50 text-yellow-400 [&>svg]:text-yellow-400">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Warning</AlertTitle>
      <AlertDescription>
        You are approaching 85% of your position limit for Crude Oil (CL).
      </AlertDescription>
    </Alert>
  ),
};

/**
 * Alert without icon
 */
export const WithoutIcon: Story = {
  render: () => (
    <Alert className="w-[500px]">
      <AlertTitle>System Notification</AlertTitle>
      <AlertDescription>
        The system will undergo scheduled maintenance on Sunday at 2:00 AM UTC.
      </AlertDescription>
    </Alert>
  ),
};

/**
 * Alert with only description
 */
export const DescriptionOnly: Story = {
  render: () => (
    <Alert className="w-[500px]">
      <Info className="h-4 w-4" />
      <AlertDescription>
        Market data will be delayed by 15 minutes during peak trading hours.
      </AlertDescription>
    </Alert>
  ),
};

/**
 * Position limit breach alert
 */
export const PositionLimitBreach: Story = {
  render: () => (
    <Alert variant="destructive" className="w-[550px]">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Position Limit Breach Detected</AlertTitle>
      <AlertDescription className="mt-2">
        <div className="space-y-1 text-sm">
          <p className="font-medium">Your position in Natural Gas (NG) has exceeded the regulatory limit:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Current Position: 12,500 contracts</li>
            <li>Position Limit: 10,000 contracts</li>
            <li>Excess: 2,500 contracts (25% over limit)</li>
          </ul>
          <p className="mt-2">Please reduce your position immediately to avoid CFTC penalties.</p>
        </div>
      </AlertDescription>
    </Alert>
  ),
};

/**
 * Compliance warning alert
 */
export const ComplianceWarning: Story = {
  render: () => (
    <Alert className="w-[550px] border-yellow-500/50 text-yellow-400 [&>svg]:text-yellow-400">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Approaching Position Limit</AlertTitle>
      <AlertDescription className="mt-2">
        <div className="space-y-1 text-sm">
          <p>Your position in Crude Oil (CL) is approaching the regulatory limit:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Current Position: 8,750 contracts</li>
            <li>Position Limit: 10,000 contracts</li>
            <li>Utilization: 87.5%</li>
          </ul>
          <p className="mt-2">Consider reducing exposure to maintain compliance.</p>
        </div>
      </AlertDescription>
    </Alert>
  ),
};

/**
 * Market update alert
 */
export const MarketUpdate: Story = {
  render: () => (
    <Alert className="w-[500px] border-blue-500/50 [&>svg]:text-blue-400">
      <TrendingUp className="h-4 w-4" />
      <AlertTitle className="text-blue-400">Market Update</AlertTitle>
      <AlertDescription>
        Significant volatility detected in energy markets. WTI Crude up 5.2% today.
      </AlertDescription>
    </Alert>
  ),
};

/**
 * Notification alert
 */
export const Notification: Story = {
  render: () => (
    <Alert className="w-[500px]">
      <Bell className="h-4 w-4" />
      <AlertTitle>New Report Available</AlertTitle>
      <AlertDescription>
        Your monthly compliance report for October 2025 is ready for review.
      </AlertDescription>
    </Alert>
  ),
};

/**
 * All alert variants
 */
export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4 w-[500px]">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Information</AlertTitle>
        <AlertDescription>
          This is an informational message.
        </AlertDescription>
      </Alert>

      <Alert className="border-green-500/50 text-green-400 [&>svg]:text-green-400">
        <CheckCircle2 className="h-4 w-4" />
        <AlertTitle>Success</AlertTitle>
        <AlertDescription>
          Operation completed successfully.
        </AlertDescription>
      </Alert>

      <Alert className="border-yellow-500/50 text-yellow-400 [&>svg]:text-yellow-400">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>
          Please review this warning message.
        </AlertDescription>
      </Alert>

      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          An error has occurred.
        </AlertDescription>
      </Alert>
    </div>
  ),
};

/**
 * Minimal alert
 */
export const Minimal: Story = {
  render: () => (
    <Alert className="w-[500px]">
      <AlertDescription>
        Quick status update without icon or title.
      </AlertDescription>
    </Alert>
  ),
};
