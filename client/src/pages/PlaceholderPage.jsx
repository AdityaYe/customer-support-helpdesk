export default function PlaceholderPage({ title }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-slate-600">Protected role route is in place for the next milestone.</p>
    </section>
  );
}
