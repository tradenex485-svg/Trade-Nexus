import type { Meta, StoryObj } from '@storybook/nextjs';
import { Input } from './input';
import { Label } from './label';
import { Search, Mail, Lock, User, DollarSign, Calendar } from 'lucide-react';

/**
 * Input component is a form control for text input.
 *
 * ## Features
 * - Standard HTML input types supported
 * - File upload support
 * - Placeholder text
 * - Disabled state
 * - Accessible with proper labeling
 * - Can be paired with Label component
 * - Responsive and mobile-friendly
 */
const meta = {
  title: 'UI/Input',
  component: Input,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A versatile input component for forms throughout Trade Nexus. Supports various input types including text, email, password, number, date, and file.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url', 'search', 'date', 'time', 'datetime-local', 'file'],
      description: 'HTML input type',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the input',
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default text input
 */
export const Default: Story = {
  args: {
    type: 'text',
    placeholder: 'Enter text...',
  },
};

/**
 * Input with label
 */
export const WithLabel: Story = {
  render: () => (
    <div className="w-[350px] space-y-2">
      <Label htmlFor="email">Email</Label>
      <Input type="email" id="email" placeholder="your@email.com" />
    </div>
  ),
};

/**
 * Disabled input
 */
export const Disabled: Story = {
  render: () => (
    <div className="w-[350px] space-y-2">
      <Label htmlFor="disabled">Disabled Input</Label>
      <Input type="text" id="disabled" placeholder="Cannot edit" disabled />
    </div>
  ),
};

/**
 * Email input
 */
export const Email: Story = {
  render: () => (
    <div className="w-[350px] space-y-2">
      <Label htmlFor="email-input">Email Address</Label>
      <div className="relative">
        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          type="email"
          id="email-input"
          placeholder="trader@company.com"
          className="pl-10"
        />
      </div>
    </div>
  ),
};

/**
 * Password input
 */
export const Password: Story = {
  render: () => (
    <div className="w-[350px] space-y-2">
      <Label htmlFor="password">Password</Label>
      <div className="relative">
        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          type="password"
          id="password"
          placeholder="Enter password"
          className="pl-10"
        />
      </div>
    </div>
  ),
};

/**
 * Search input
 */
export const SearchInput: Story = {
  render: () => (
    <div className="w-[350px]">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search positions..."
          className="pl-10"
        />
      </div>
    </div>
  ),
};

/**
 * Number input
 */
export const NumberInput: Story = {
  render: () => (
    <div className="w-[350px] space-y-2">
      <Label htmlFor="contracts">Number of Contracts</Label>
      <Input
        type="number"
        id="contracts"
        placeholder="1000"
        min="0"
        step="100"
      />
    </div>
  ),
};

/**
 * Date input
 */
export const DateInput: Story = {
  render: () => (
    <div className="w-[350px] space-y-2">
      <Label htmlFor="trade-date">Trade Date</Label>
      <Input
        type="date"
        id="trade-date"
      />
    </div>
  ),
};

/**
 * File input
 */
export const FileInput: Story = {
  render: () => (
    <div className="w-[350px] space-y-2">
      <Label htmlFor="file-upload">Upload Report</Label>
      <Input
        type="file"
        id="file-upload"
        accept=".csv,.xlsx,.pdf"
      />
    </div>
  ),
};

/**
 * Form with multiple inputs
 */
export const FormExample: Story = {
  render: () => (
    <div className="w-[400px] space-y-4">
      <div className="space-y-2">
        <Label htmlFor="trader-name">Trader Name</Label>
        <div className="relative">
          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            id="trader-name"
            placeholder="John Doe"
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="commodity">Commodity Symbol</Label>
        <Input
          type="text"
          id="commodity"
          placeholder="CL (Crude Oil)"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="position-size">Position Size</Label>
        <Input
          type="number"
          id="position-size"
          placeholder="5000"
          min="0"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="trade-date-form">Trade Date</Label>
        <div className="relative">
          <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            id="trade-date-form"
            className="pl-10"
          />
        </div>
      </div>
    </div>
  ),
};

/**
 * Trading form inputs
 */
export const TradingFormInputs: Story = {
  render: () => (
    <div className="w-[400px] space-y-4">
      <div className="space-y-2">
        <Label htmlFor="instrument">Instrument Code</Label>
        <Input
          type="text"
          id="instrument"
          placeholder="CLF25 (Mar 2025 Crude Oil)"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="buy-quantity">Buy Quantity</Label>
          <Input
            type="number"
            id="buy-quantity"
            placeholder="2500"
            min="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sell-quantity">Sell Quantity</Label>
          <Input
            type="number"
            id="sell-quantity"
            placeholder="1500"
            min="0"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="price">Price (USD)</Label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="number"
            id="price"
            placeholder="75.50"
            step="0.01"
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Trade Notes</Label>
        <Input
          type="text"
          id="notes"
          placeholder="Optional notes about this trade"
        />
      </div>
    </div>
  ),
};

/**
 * Input with validation states
 */
export const ValidationStates: Story = {
  render: () => (
    <div className="w-[350px] space-y-4">
      <div className="space-y-2">
        <Label htmlFor="valid-input">Valid Input</Label>
        <Input
          type="text"
          id="valid-input"
          placeholder="Success!"
          className="border-green-500 focus-visible:ring-green-500"
          defaultValue="trader@company.com"
        />
        <p className="text-xs text-green-400">Email is valid</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="invalid-input">Invalid Input</Label>
        <Input
          type="text"
          id="invalid-input"
          placeholder="Error!"
          className="border-red-500 focus-visible:ring-red-500"
          defaultValue="invalid email"
        />
        <p className="text-xs text-red-400">Please enter a valid email address</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="warning-input">Warning Input</Label>
        <Input
          type="number"
          id="warning-input"
          placeholder="Warning!"
          className="border-yellow-500 focus-visible:ring-yellow-500"
          defaultValue="9500"
        />
        <p className="text-xs text-yellow-400">Approaching position limit (10,000)</p>
      </div>
    </div>
  ),
};

/**
 * Input with helper text
 */
export const WithHelperText: Story = {
  render: () => (
    <div className="w-[400px] space-y-2">
      <Label htmlFor="position-limit">Position Limit</Label>
      <Input
        type="number"
        id="position-limit"
        placeholder="Enter limit"
        defaultValue="10000"
      />
      <p className="text-xs text-muted-foreground">
        CFTC spot month limit for crude oil futures. Maximum allowed: 10,000 contracts.
      </p>
    </div>
  ),
};
