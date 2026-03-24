import { useMemo } from "react";

function formatSummary(design) {
  return `${design.model || "custom"} | width: ${Number(design.frameWidth || 0).toFixed(2)} | lens: ${Number(
    design.lensSize || 0
  ).toFixed(2)} | leg: ${Number(design.legLength || 0).toFixed(2)}`;
}

export default function DesignsModal({
  open,
  designs,
  activeIndex,
  onClose,
  onOpenDesign,
  onTogglePublish,
  onDeleteDesign
}) {
  const hasDesigns = useMemo(() => designs.length > 0, [designs]);

  if (!open) return null;

  return (
    <div className="modal open" aria-hidden="false" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-head">
          <h3>MY DESIGNS</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-body">
          {!hasDesigns ? (
            <p className="hint">No saved designs yet. Create one in the legacy creator first.</p>
          ) : (
            designs.map((design, index) => (
              <div className="design-row" key={design.id || index}>
                <div className="meta">
                  <strong>{design.name || `Design #${index + 1}`}</strong>
                  <div className="design-summary">{formatSummary(design)}</div>
                  <div className="design-status">
                    {design.published ? "Published" : "Private"}
                    {activeIndex === index ? " | Active" : ""}
                  </div>
                </div>

                <div className="actions">
                  <button type="button" className="btn primary" onClick={() => onOpenDesign(index)}>
                    OPEN
                  </button>
                  <button type="button" className="btn" onClick={() => onTogglePublish(index)}>
                    {design.published ? "UNPUBLISH" : "PUBLISH"}
                  </button>
                  <button type="button" className="btn" onClick={() => onDeleteDesign(index)}>
                    DELETE
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
