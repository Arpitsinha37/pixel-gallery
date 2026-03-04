import { useState, useEffect, useCallback } from "react"
import { Download, Trash2, X, ImageIcon } from "lucide-react"

const API_BASE = import.meta.env.VITE_API_URL || "/api"

interface GalleryEntry {
    id: string
    file_id: string
    mosaic_filename: string
    tile_size: number
    density: number
    theme: string
    mode: string
    created_at: string
}

export default function Gallery() {
    const [entries, setEntries] = useState<GalleryEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [selected, setSelected] = useState<GalleryEntry | null>(null)

    const fetchGallery = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/gallery`)
            if (res.ok) {
                const data = await res.json()
                setEntries(data.entries || [])
            }
        } catch { } finally { setLoading(false) }
    }, [])

    useEffect(() => {
        fetchGallery()
        const interval = setInterval(fetchGallery, 5000)
        return () => clearInterval(interval)
    }, [fetchGallery])

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this mosaic?")) return
        const res = await fetch(`${API_BASE}/gallery/${id}`, { method: "DELETE" })
        if (res.ok) {
            setEntries((prev) => prev.filter((e) => e.id !== id))
            if (selected?.id === id) setSelected(null)
        }
    }

    const handleDownload = (filename: string) => {
        const a = document.createElement("a")
        a.href = `${API_BASE}/download/${filename}`
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
    }

    const densityLabel = (d: number) => (d >= 1000 ? `${Math.round(d / 1000)}K` : String(d))

    if (loading) {
        return <div className="flex items-center justify-center gap-2 py-8 text-gray-500 text-sm"><div className="w-4 h-4 border-2 border-white/20 border-t-purple-400 rounded-full animate-spin" /> Loading...</div>
    }

    if (!entries.length) {
        return (
            <div className="flex flex-col items-center gap-3 py-12 text-gray-600">
                <ImageIcon className="w-10 h-10 opacity-30" />
                <p className="text-sm">No mosaics yet! Upload a photo and generate your first emoji mosaic.</p>
            </div>
        )
    }

    return (
        <>
            {/* Lightbox */}
            {selected && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelected(null)}>
                    <div className="relative max-w-3xl w-full bg-gray-950 border border-white/10 rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setSelected(null)} className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center hover:bg-red-600/60 transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                        <img src={`${API_BASE}/mosaic-image/${selected.mosaic_filename}`} alt="Mosaic" className="w-full max-h-[450px] object-contain bg-gray-900" />
                        <div className="p-5 space-y-3">
                            <div className="flex items-center gap-2 flex-wrap text-sm text-gray-400">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${selected.mode === "preview" ? "bg-purple-600/80" : "bg-emerald-500/80"} text-white`}>
                                    {selected.mode === "preview" ? "⚡ Preview" : "✨ HD"}
                                </span>
                                <span>{densityLabel(selected.density)} emojis</span>
                                <span>•</span>
                                <span>{selected.tile_size}px</span>
                                <span>•</span>
                                <span className="capitalize">{selected.theme}</span>
                            </div>
                            <p className="text-xs text-gray-600">{selected.created_at}</p>
                            <div className="flex gap-3">
                                <button onClick={() => handleDownload(selected.mosaic_filename)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-shadow">
                                    <Download className="w-4 h-4" /> Download PNG
                                </button>
                                <button onClick={() => handleDelete(selected.id)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-500/20 hover:shadow-red-500/40 transition-shadow">
                                    <Trash2 className="w-4 h-4" /> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {entries.map((entry) => (
                    <div key={entry.id} onClick={() => setSelected(entry)} className="group cursor-pointer rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300 hover:-translate-y-1">
                        <div className="relative aspect-square bg-gray-900">
                            <img src={`${API_BASE}/mosaic-image/${entry.mosaic_filename}`} alt="Mosaic" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                            <span className={`absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[9px] font-bold backdrop-blur-md ${entry.mode === "preview" ? "bg-purple-600/70" : "bg-emerald-500/70"
                                } text-white`}>
                                {entry.mode === "preview" ? "⚡" : "✨"} {densityLabel(entry.density)}
                            </span>
                        </div>
                        <div className="p-2.5">
                            <p className="text-xs font-semibold capitalize">{entry.theme} • {entry.tile_size}px</p>
                            <p className="text-[10px] text-gray-600 mt-0.5">{entry.created_at}</p>
                        </div>
                    </div>
                ))}
            </div>
        </>
    )
}
