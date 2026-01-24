import Image from 'next/image';

export default function Loading() {
  return (
    <div className="loading-screen">
      <Image
        src="/logo.png"
        alt="Loading..."
        width={60}
        height={60}
        priority
        className="loading-logo"
      />
    </div>
  );
}
