export default function HeavyWidget() {
  const items = Array.from({ length: 8 }, (_, index) => ({
    title: `Settlement ${index + 1}`,
    detail: 'Queued payments syncing across chains.'
  }));

  return (
    <div className="feature-grid">
      {items.map((item) => (
        <div className="feature" key={item.title}>
          <h3>{item.title}</h3>
          <p>{item.detail}</p>
        </div>
      ))}
    </div>
  );
}
