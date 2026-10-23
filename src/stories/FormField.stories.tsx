import type { Meta, StoryObj } from '@storybook/react';
import { FormField } from '../components/FormField';

const meta: Meta<typeof FormField> = {
  title: 'Components/FormField',
  component: FormField,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  args: {
    label: 'Email address',
    type: 'email',
    placeholder: 'merchant@example.com',
  },
};

export default meta;
type Story = StoryObj<typeof FormField>;

export const Default: Story = {};

export const WithValue: Story = {
  args: {
    label: 'Amount (USD)',
    type: 'number',
    value: '49.99',
  },
};

export const Required: Story = {
  args: {
    label: 'Business name',
    required: true,
    placeholder: 'Acme Corp',
  },
};

export const WithError: Story = {
  args: {
    label: 'Password',
    type: 'password',
    value: 'short',
    error: 'Password must be at least 8 characters',
  },
};

export const WithHint: Story = {
  args: {
    label: 'Description (optional)',
    value: 'Invoice for consultation',
    hint: <span>30/255</span>,
  },
};

export const Disabled: Story = {
  args: {
    label: 'API key',
    type: 'text',
    value: 'sk_live_••••••••••••',
    disabled: true,
  },
};

export const Textarea: Story = {
  args: {
    label: 'Metadata (optional)',
    as: 'textarea',
    rows: 4,
    placeholder: '{"orderId": "123", "product": "Acme Widget"}',
    hint: <span>Optional JSON object attached to the payment.</span>,
  },
};

export const Select: Story = {
  args: {
    label: 'Country',
    as: 'select',
    placeholder: 'Select a country',
    options: [
      { value: 'us', label: 'United States' },
      { value: 'gb', label: 'United Kingdom' },
      { value: 'ng', label: 'Nigeria' },
    ],
  },
};
