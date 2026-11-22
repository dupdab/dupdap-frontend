import type { Meta, StoryObj } from '@storybook/react';
import StatusBadge from '../components/StatusBadge';

const meta: Meta<typeof StatusBadge> = {
  title: 'Components/StatusBadge',
  component: StatusBadge,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof StatusBadge>;

export const Settled: Story = {
  args: {
    status: 'settled',
  },
};

export const Pending: Story = {
  args: {
    status: 'pending',
  },
};

export const Processing: Story = {
  args: {
    status: 'processing',
  },
};

export const Failed: Story = {
  args: {
    status: 'failed',
  },
};

export const Expired: Story = {
  args: {
    status: 'expired',
  },
};
