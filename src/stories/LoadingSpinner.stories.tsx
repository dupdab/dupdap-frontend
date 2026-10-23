import type { Meta, StoryObj } from '@storybook/react';
import { LoadingSpinner } from '../components/LoadingSpinner';

const meta: Meta<typeof LoadingSpinner> = {
  title: 'Components/LoadingSpinner',
  component: LoadingSpinner,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof LoadingSpinner>;

export const Default: Story = {};

export const WithLabel: Story = {
  args: {
    showLabel: true,
    label: 'Loading payments…',
  },
};

export const CustomLabel: Story = {
  args: {
    showLabel: true,
    label: 'Fetching analytics data…',
  },
};

export const Inline: Story = {
  args: {
    showLabel: true,
    label: 'Saving…',
    className: 'text-sm text-gray-500',
  },
};
