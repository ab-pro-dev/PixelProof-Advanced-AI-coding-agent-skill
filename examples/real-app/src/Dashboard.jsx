export default function Dashboard() {
  const cards = [
    { title: "References", value: "12", label: "registered screenshots" },
    { title: "Accuracy", value: "94%", label: "pixel match rate" },
    { title: "Iterations", value: "3", label: "refinement cycles" },
  ];

  return (
    <main className="dashboard-content">
      <h2>Dashboard</h2>
      <div className="card-grid">
        {cards.map((card) => (
          <div className="card" key={card.title}>
            <h3>{card.title}</h3>
            <div className="value">{card.value}</div>
            <div className="label">{card.label}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
