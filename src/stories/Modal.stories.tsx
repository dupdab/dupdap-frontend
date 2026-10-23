import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import Modal from '../components/Modal';

const meta: Meta<typeof Modal> = {
  title: 'Components/Modal',
  component: Modal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Modal>;

/** Controlled wrapper so we can demo open/close from Storybook. */
function ModalDemo({
  title,
  children,
  contentClassName,
}: {
  title?: string;
  children: React.ReactNode;
  contentClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
      >
        Open modal
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        contentClassName={contentClassName}
      >
        {children}
      </Modal>
    </>
  );
}

export const Default: Story = {
  render: () => (
    <ModalDemo title="Create Payment">
      <p className="text-sm text-gray-600">
        Fill in the details below to generate a new payment link.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700"
        >
          Create
        </button>
      </div>
    </ModalDemo>
  ),
};

export const NoTitle: Story = {
  render: () => (
    <ModalDemo>
      <p className="text-sm text-gray-600">
        This modal has no title bar — close it by pressing Escape or clicking
        the backdrop.
      </p>
    </ModalDemo>
  ),
};

export const Narrow: Story = {
  render: () => (
    <ModalDemo title="QR Code" contentClassName="max-w-sm text-center">
      <div className="mx-auto my-4 h-[200px] w-[200px] rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
        QR placeholder
      </div>
      <p className="text-sm text-gray-600">Scan to pay $25.00</p>
    </ModalDemo>
  ),
};
