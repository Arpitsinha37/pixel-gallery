export default function SettingsPanel({ settings, onChange }) {
    const tileSizes = [
        { value: 8, label: '8px' },
        { value: 16, label: '16px' },
        { value: 24, label: '24px' },
        { value: 32, label: '32px' },
    ];

    const densities = [
        { value: 25000, label: '25K' },
        { value: 50000, label: '50K' },
        { value: 100000, label: '100K' },
        { value: 250000, label: '250K' },
    ];

    const themes = [
        { value: 'all', label: '🎨 All', emoji: '🎨' },
        { value: 'faces', label: '😀 Faces', emoji: '😀' },
        { value: 'hearts', label: '❤️ Hearts', emoji: '❤️' },
        { value: 'animals', label: '🐶 Animals', emoji: '🐶' },
        { value: 'food', label: '🍕 Food', emoji: '🍕' },
    ];

    return (
        <div className="settings">
            <div className="setting-group">
                <label className="setting-group__label">Tile Size</label>
                <div className="setting-options">
                    {tileSizes.map((opt) => (
                        <button
                            key={opt.value}
                            className={`setting-btn ${settings.tileSize === opt.value ? 'setting-btn--active' : ''}`}
                            onClick={() => onChange({ ...settings, tileSize: opt.value })}
                            id={`tile-size-${opt.value}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="setting-group">
                <label className="setting-group__label">Density</label>
                <div className="setting-options">
                    {densities.map((opt) => (
                        <button
                            key={opt.value}
                            className={`setting-btn ${settings.density === opt.value ? 'setting-btn--active' : ''}`}
                            onClick={() => onChange({ ...settings, density: opt.value })}
                            id={`density-${opt.value}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="setting-group">
                <label className="setting-group__label">Emoji Theme</label>
                <div className="setting-options">
                    {themes.map((opt) => (
                        <button
                            key={opt.value}
                            className={`setting-btn ${settings.theme === opt.value ? 'setting-btn--active' : ''}`}
                            onClick={() => onChange({ ...settings, theme: opt.value })}
                            id={`theme-${opt.value}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
