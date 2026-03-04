import { useState, useEffect, useCallback } from 'react';

const API_BASE = '/api';

export default function Gallery() {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEntry, setSelectedEntry] = useState(null);

    const fetchGallery = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/gallery`);
            if (res.ok) {
                const data = await res.json();
                setEntries(data.entries || []);
            }
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchGallery();
        // Refresh gallery every 5 seconds to pick up new mosaics
        const interval = setInterval(fetchGallery, 5000);
        return () => clearInterval(interval);
    }, [fetchGallery]);

    const handleDelete = async (entryId) => {
        if (!confirm('Delete this mosaic from the gallery?')) return;
        try {
            const res = await fetch(`${API_BASE}/gallery/${entryId}`, { method: 'DELETE' });
            if (res.ok) {
                setEntries(prev => prev.filter(e => e.id !== entryId));
                if (selectedEntry?.id === entryId) setSelectedEntry(null);
            }
        } catch {
            // silent
        }
    };

    const handleDownload = (filename) => {
        const a = document.createElement('a');
        a.href = `${API_BASE}/download/${filename}`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const densityLabel = (d) => {
        if (d >= 1000) return `${Math.round(d / 1000)}K`;
        return d;
    };

    if (loading) {
        return (
            <div className="gallery-loading">
                <span className="spinner" /> Loading gallery...
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <div className="gallery-empty">
                <div className="gallery-empty__icon">📸</div>
                <div className="gallery-empty__text">
                    No mosaics yet! Upload a photo and generate your first emoji mosaic.
                </div>
            </div>
        );
    }

    return (
        <div className="gallery">
            {/* Lightbox / Selected Entry */}
            {selectedEntry && (
                <div className="gallery-lightbox" onClick={() => setSelectedEntry(null)}>
                    <div className="gallery-lightbox__content" onClick={(e) => e.stopPropagation()}>
                        <button
                            className="gallery-lightbox__close"
                            onClick={() => setSelectedEntry(null)}
                        >
                            ✕
                        </button>
                        <img
                            src={`${API_BASE}/mosaic-image/${selectedEntry.mosaic_filename}`}
                            alt="Mosaic"
                            className="gallery-lightbox__img"
                        />
                        <div className="gallery-lightbox__info">
                            <div className="gallery-lightbox__meta">
                                <span className={`gallery-lightbox__badge gallery-lightbox__badge--${selectedEntry.mode}`}>
                                    {selectedEntry.mode === 'preview' ? '⚡ Preview' : '✨ HD'}
                                </span>
                                <span>{densityLabel(selectedEntry.density)} emojis</span>
                                <span>•</span>
                                <span>{selectedEntry.tile_size}px tiles</span>
                                <span>•</span>
                                <span>{selectedEntry.theme}</span>
                            </div>
                            <div className="gallery-lightbox__date">{selectedEntry.created_at}</div>
                            <div className="gallery-lightbox__actions">
                                <button
                                    className="btn btn--download btn--sm"
                                    onClick={() => handleDownload(selectedEntry.mosaic_filename)}
                                >
                                    📥 Download PNG
                                </button>
                                <button
                                    className="btn btn--danger btn--sm"
                                    onClick={() => handleDelete(selectedEntry.id)}
                                >
                                    🗑️ Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Grid */}
            <div className="gallery-grid">
                {entries.map((entry) => (
                    <div
                        key={entry.id}
                        className="gallery-card"
                        onClick={() => setSelectedEntry(entry)}
                    >
                        <div className="gallery-card__img-wrapper">
                            <img
                                src={`${API_BASE}/mosaic-image/${entry.mosaic_filename}`}
                                alt="Mosaic"
                                className="gallery-card__img"
                                loading="lazy"
                            />
                            <span className={`gallery-card__badge gallery-card__badge--${entry.mode}`}>
                                {entry.mode === 'preview' ? '⚡' : '✨'} {densityLabel(entry.density)}
                            </span>
                        </div>
                        <div className="gallery-card__info">
                            <div className="gallery-card__theme">{entry.theme} • {entry.tile_size}px</div>
                            <div className="gallery-card__date">{entry.created_at}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
