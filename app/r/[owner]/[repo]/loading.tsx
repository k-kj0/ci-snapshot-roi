import "../../../receipt.css";

export default function Loading() {
  return (
    <main className="rc-home">
      <div className="rc-spinner" />
      <h1>Printing receipt…</h1>
      <p>Reading recent workflow runs from GitHub. The first receipt for a repo can take up to 30 seconds.</p>
    </main>
  );
}
