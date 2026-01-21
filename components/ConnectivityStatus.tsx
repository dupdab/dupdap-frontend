'use client';

import { useEffect, useState } from 'react';

export default function ConnectivityStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();

    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return (
    <div className={`connectivity ${online ? '' : 'offline'}`}>
      <span />
      {online ? 'Online' : 'Offline'}
    </div>
  );
}
