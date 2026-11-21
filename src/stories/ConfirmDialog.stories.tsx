import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

const meta: Meta<typeof ConfirmDialog> = {
  title: 'Components/ConfirmDialog',
  component: ConfirmDialog,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ConfirmDialog>;

function ConfirmDialogDemo(props: Partial<React.ComponentProps<typeof ConfirmDialog>>) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
      >
        Open dialog
      </button>
      <ConfirmDialog
        open={open}
        message="Are you sure you want to proceed with this action?"
        onConfirm={() => setOpen(false)}
        onCancel={() => setOpen(false)}
        {...props}
      />
    </>
  );
}

export const Default: Story = {
  render: () => <ConfirmDialogDemo title="Confirm Action" message="Are you sure you want to proceed?" />,
};

export const Destructive: Story = {
  render: () => (
    <ConfirmDialogDemo
      title="Delete API Key"
      message="This action cannot be undone. Any active integration using this key will immediately stop working."
      confirmLabel="Delete"
      destructive
    />
  ),
};

export const Loading: Story = {
  render: () => (
    <ConfirmDialogDemo
      title="Processing"
      message="Please wait while the operation finishes."
      loading
    />
  ),
};
