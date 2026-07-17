import { useState, useEffect } from 'react';
import * as api from '../../services/api';
import ProductImage from '../ProductImage';

/* Gallery-or-URL picker for a product's imageUrl. Gallery lists the files
   the server actually serves from /images; Custom keeps free-text entry for
   external URLs. The input is type="text" on purpose — type="url" rejects
   relative /images/... paths. */
export default function ImagePicker({ value, onChange }) {
  const [mode, setMode] = useState(value && !value.startsWith('/images/') ? 'custom' : 'gallery');
  const [groups, setGroups] = useState([]);
  const [galleryError, setGalleryError] = useState(false);

  useEffect(() => {
    api
      .fetchAdminImages()
      .then((d) => setGroups(d.groups))
      .catch(() => setGalleryError(true));
  }, []);

  return (
    <div>
      <label className="block text-xs font-medium text-ink-light mb-1">Image</label>

      {/* live preview */}
      <ProductImage src={value} alt="Preview" aspect="4/3" padding="p-2" className="mb-2" />

      {/* mode toggle */}
      <div className="flex gap-1.5 mb-2">
        {[
          { key: 'gallery', label: 'Gallery' },
          { key: 'custom', label: 'Custom URL' },
        ].map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMode(m.key)}
            className={`px-3 py-1 rounded-card text-xs font-medium transition-all duration-200 ${
              mode === m.key
                ? 'bg-ink text-white'
                : 'bg-bg-alt text-ink-light hover:text-ink border border-border'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'gallery' ? (
        galleryError ? (
          <p className="text-xs text-ink-faint">Couldn't load the gallery — use Custom URL instead.</p>
        ) : (
          <div className="max-h-56 overflow-y-auto border border-border rounded-card p-2.5 space-y-2.5">
            {groups.map((g) => (
              <div key={g.folder}>
                <p className="text-[10px] uppercase tracking-wider text-ink-faint mb-1.5">{g.folder}</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {g.files.map((f) => (
                    <button
                      key={f.url}
                      type="button"
                      onClick={() => onChange(f.url)}
                      title={f.name}
                      className={`rounded-card transition-all ${
                        value === f.url ? 'ring-2 ring-accent' : 'hover:ring-2 hover:ring-border'
                      }`}
                    >
                      <ProductImage src={f.url} alt={f.name} padding="p-1" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {groups.length === 0 && <p className="text-xs text-ink-faint py-2 text-center">Loading gallery...</p>}
          </div>
        )
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://... or /images/..."
          className="input-field"
        />
      )}
    </div>
  );
}
