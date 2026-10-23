import type { Meta, StoryObj } from '@storybook/react';
import {
  Skeleton,
  SkeletonList,
  SkeletonTableRows,
} from '../components/Skeleton';

const meta: Meta = {
  title: 'Components/Skeleton',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;

export const Single: StoryObj = {
  render: () => <Skeleton className="h-8 w-64" />,
};

export const Card: StoryObj = {
  render: () => (
    <div className="card p-6 space-y-4 w-96">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-8 w-32" />
    </div>
  ),
};

export const List: StoryObj = {
  render: () => (
    <div className="card divide-y divide-gray-100 w-full max-w-md">
      <SkeletonList rows={5} />
    </div>
  ),
};

export const TableRows: StoryObj = {
  render: () => (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 border-b border-gray-100">
        <tr>
          {['Reference', 'Amount', 'Status', 'Created', ''].map((h) => (
            <th
              key={h}
              className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        <SkeletonTableRows rows={5} cols={5} />
      </tbody>
    </table>
  ),
};
