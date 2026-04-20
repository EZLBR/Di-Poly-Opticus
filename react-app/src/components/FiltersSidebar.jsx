export default function FiltersSidebar({
  selectedShapes,
  selectedMaterials,
  onShapeToggle,
  onMaterialToggle,
  onClear
}) {
  return (
    <aside className="filters">
      <h3>FILTER BY</h3>

      <div className="filter-group">
        <p>Shape</p>
        <label>
          <input
            type="checkbox"
            checked={selectedShapes.includes("round")}
            onChange={() => onShapeToggle("round")}
          />
          Round
        </label>
        <label>
          <input
            type="checkbox"
            checked={selectedShapes.includes("square")}
            onChange={() => onShapeToggle("square")}
          />
          Square
        </label>
      </div>

      <div className="filter-group">
        <p>Material</p>
        <label>
          <input
            type="checkbox"
            checked={selectedMaterials.includes("metal")}
            onChange={() => onMaterialToggle("metal")}
          />
          Metal
        </label>
        <label>
          <input
            type="checkbox"
            checked={selectedMaterials.includes("acetate")}
            onChange={() => onMaterialToggle("acetate")}
          />
          Acetate
        </label>
      </div>

      <button type="button" className="btn" onClick={onClear}>
        CLEAR FILTERS
      </button>
    </aside>
  );
}
