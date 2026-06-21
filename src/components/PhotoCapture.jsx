export default function PhotoCapture({ photos, onRemove }) {
  if (photos.length === 0) return null
  return (
    <div className="photo-thumbs">
      {photos.map((src, i) => (
        <div key={i} className="photo-thumb-wrap">
          <img src={src} alt={`Photo ${i + 1}`} className="photo-thumb" />
          <button
            type="button"
            className="photo-thumb-remove"
            onClick={() => onRemove(i)}
            title="Remove"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
