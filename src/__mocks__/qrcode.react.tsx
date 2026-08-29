import React from 'react';

export const QRCodeSVG = ({ value }: { value: string }) =>
  React.createElement('div', { 'data-testid': 'qrcode', 'data-value': value });
