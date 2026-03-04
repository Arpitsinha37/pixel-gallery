interface Settings {
    tileSize: number
    density: number
    theme: string
}

interface SettingsPanelProps {
    settings: Settings
    onChange: (settings: Settings) => void
}

const tileSizes = [
    { value: 8, label: "8px" },
    { value: 16, label: "16px" },
    { value: 24, label: "24px" },
    { value: 32, label: "32px" },
]

const densities = [
    { value: 25000, label: "25K" },
    { value: 50000, label: "50K" },
    { value: 100000, label: "100K" },
    { value: 250000, label: "250K" },
]

const themes = [
    { value: "all", label: "🎨 All" },
    { value: "faces", label: "😀 Faces" },
    { value: "hearts", label: "❤️ Hearts" },
    { value: "animals", label: "🐶 Animals" },
    { value: "food", label: "🍕 Food" },
]

export default function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
    const Btn = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
        <button
            onClick={onClick}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-200 ${active
                    ? "bg-gradient-to-r from-purple-600 to-pink-500 border-transparent text-white shadow-lg shadow-purple-500/20"
                    : "border-white/10 text-gray-400 hover:border-purple-500/40 hover:text-white bg-white/5"
                }`}
        >
            {children}
        </button>
    )

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">Tile Size</label>
                <div className="flex flex-wrap gap-1.5">
                    {tileSizes.map((o) => (
                        <Btn key={o.value} active={settings.tileSize === o.value} onClick={() => onChange({ ...settings, tileSize: o.value })}>
                            {o.label}
                        </Btn>
                    ))}
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">Density</label>
                <div className="flex flex-wrap gap-1.5">
                    {densities.map((o) => (
                        <Btn key={o.value} active={settings.density === o.value} onClick={() => onChange({ ...settings, density: o.value })}>
                            {o.label}
                        </Btn>
                    ))}
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">Theme</label>
                <div className="flex flex-wrap gap-1.5">
                    {themes.map((o) => (
                        <Btn key={o.value} active={settings.theme === o.value} onClick={() => onChange({ ...settings, theme: o.value })}>
                            {o.label}
                        </Btn>
                    ))}
                </div>
            </div>
        </div>
    )
}

export type { Settings }
