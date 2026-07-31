export default function LoadingScreen({ label = 'جارٍ التحميل…' }) {
  return (
    <div className="loading-screen">
      <div className="spinner" />
      <p>{label}</p>
    </div>
  )
}
