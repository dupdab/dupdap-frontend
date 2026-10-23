import type { Meta, StoryObj } from '@storybook/react';
import { CopyButton } from '../components/CopyButton';

const meta: Meta<typeof CopyButton> = {
  title: 'Components/CopyButton',
  component: CopyButton,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof CopyButton>;

export const Default: Story = {
  args: {
    value: 'PAY-001-ABCDEF',
    label: 'Copy payment reference',
    copiedLabel: 'Reference copied',
  },
};

export const PaymentLink: Story = {
  args: {
    value: 'https://app.dupdub.com/pay/PAY-001-ABCDEF',
    label: 'Copy payment link',
    copiedLabel: 'Link copied',
    className: 'text-brand-500 hover:text-brand-700',
  },
};

export const ApiKey: Story = {
  args: {
    value: 'sk_live_1234567890abcdef',
    label: 'Copy API key',
    copiedLabel: 'API key copied',
    iconSize: 'w-3 h-3',
    className: 'text-gray-300 hover:text-gray-100',
  },
};

/** Inline usage alongside a code element */
export const InlineWithCode: Story = {
  render: (args) => (
    <div className="flex items-center gap-2 font-mono text-sm text-gray-600">
      <code>PAY-001-ABCDEF</code>
      <CopyButton {...args} />
    </div>
  ),
  args: {
    value: 'PAY-001-ABCDEF',
    label: 'Copy reference',
    copiedLabel: 'Copied',
  },
};
