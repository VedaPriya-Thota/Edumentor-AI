export default function Header({ title }) {
  return (
    <div className="glass-panel m-4 p-4 flex justify-between items-center rounded-xl">
      <h1 className="text-xl font-semibold">{title}</h1>

      <button
        className="btn"
        onClick={() => {
          localStorage.removeItem("access_token");
          window.location.reload();
        }}
      >
        Logout
      </button>
    </div>
  );
}