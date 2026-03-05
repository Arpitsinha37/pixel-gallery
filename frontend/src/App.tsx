import { useState, useCallback, useRef } from "react"
import { HeroSection } from "@/components/ui/hero-section-dark"
import ImageUploader, { type UploadedFile } from "@/components/ImageUploader"
import SettingsPanel, { type Settings } from "@/components/SettingsPanel"
import ProgressBar from "@/components/ProgressBar"
import MosaicPreview from "@/components/MosaicPreview"
import Gallery from "@/components/Gallery"
import { Zap, Sparkles, Download, Camera, Settings as SettingsIcon, Image, Rocket } from "lucide-react"

const API_BASE = import.meta.env.VITE_API_URL || "/api"

export default function App() {
    const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
    const [settings, setSettings] = useState<Settings>({ tileSize: 16, density: 50000, theme: "all" })
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [mosaicUrl, setMosaicUrl] = useState<string | null>(null)
    const [mosaicFilename, setMosaicFilename] = useState<string | null>(null)
    const [progress, setProgress] = useState(0)
    const [status, setStatus] = useState("")
    const [isGenerating, setIsGenerating] = useState(false)
    const [isPreview, setIsPreview] = useState(true)
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const handleUpload = useCallback((file: UploadedFile) => {
        setUploadedFile(file)
        setPreviewUrl(null)
        setMosaicUrl(null)
        setMosaicFilename(null)
        setProgress(0)
        setStatus("")
    }, [])

    const pollProgress = useCallback((taskId: string, onComplete: (filename: string) => void) => {
        if (pollingRef.current) clearInterval(pollingRef.current)
        pollingRef.current = setInterval(async () => {
            try {
                const res = await fetch(`${API_BASE}/progress/${taskId}`)
                if (!res.ok) return
                const data = await res.json()
                setProgress(data.progress)
                setStatus(data.status)
                if (data.error) {
                    clearInterval(pollingRef.current!)
                    setIsGenerating(false)
                    alert(`Error: ${data.error}`)
                    return
                }
                if (data.progress >= 100 && data.result) {
                    clearInterval(pollingRef.current!)
                    onComplete(data.result)
                }
            } catch { }
        }, 800)
    }, [])

    const handleGenerate = useCallback(async (preview: boolean) => {
        if (!uploadedFile) return
        setIsGenerating(true)
        setProgress(0)
        setStatus(preview ? "Starting preview..." : "Starting HD generation...")
        setIsPreview(preview)

        try {
            const res = await fetch(`${API_BASE}/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    file_id: uploadedFile.fileId,
                    tile_size: preview ? 24 : settings.tileSize,
                    density: preview ? 1000 : settings.density,
                    theme: settings.theme,
                    preview,
                }),
            })
            if (!res.ok) {
                let errMessage = `Server Error ${res.status}`
                try {
                    const err = await res.json()
                    if (err.detail) errMessage = err.detail
                } catch { }
                throw new Error(errMessage)
            }
            const data = await res.json()
            pollProgress(data.task_id, (result) => {
                const url = `${API_BASE}/mosaic-image/${result}`
                if (preview) setPreviewUrl(url)
                else setMosaicUrl(url)
                setMosaicFilename(result)
                setIsGenerating(false)
            })
        } catch (err: any) {
            setIsGenerating(false)
            alert(`Error: ${err.message}`)
        }
    }, [uploadedFile, settings, pollProgress])

    const handleDownload = () => {
        if (!mosaicFilename) return
        const a = document.createElement("a")
        a.href = `${API_BASE}/download/${mosaicFilename}`
        a.download = mosaicFilename.includes(".png") ? mosaicFilename : `${mosaicFilename}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
    }

    const densityLabel = (d: number) => (d >= 1000 ? `${d / 1000}K` : String(d))

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Hero Section */}
            <HeroSection
                title="Pixel Gallery — Emoji Mosaic Generator"
                subtitle={{
                    regular: "Transform your photos into ",
                    gradient: "stunning emoji art",
                }}
                description="Upload any photo and watch it transform into a beautiful mosaic made of up to 250,000 emoji tiles. Free, fast, and runs entirely on your machine."
                ctaText="Start Creating"
                ctaHref="#workspace"
                bottomImage={undefined}
                gridOptions={{
                    angle: 65,
                    opacity: 0.3,
                    cellSize: 50,
                    lightLineColor: "#4a4a4a",
                    darkLineColor: "#2a2a2a",
                }}
            />

            {/* Workspace */}
            <div className="max-w-5xl mx-auto px-4 pb-20 -mt-20 relative z-10" id="workspace">
                {/* Upload Card */}
                <section className="rounded-2xl border border-white/[0.06] bg-gray-950/80 backdrop-blur-xl p-6 mb-4 shadow-xl">
                    <h2 className="text-base font-bold flex items-center gap-2 mb-4">
                        <Camera className="w-4 h-4 text-purple-400" /> Upload Photo
                    </h2>
                    <ImageUploader onUpload={handleUpload} uploadedFile={uploadedFile} />
                </section>

                {/* Settings Card */}
                {uploadedFile && (
                    <section className="rounded-2xl border border-white/[0.06] bg-gray-950/80 backdrop-blur-xl p-6 mb-4 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <h2 className="text-base font-bold flex items-center gap-2 mb-4">
                            <SettingsIcon className="w-4 h-4 text-purple-400" /> Settings
                        </h2>
                        <SettingsPanel settings={settings} onChange={setSettings} />
                    </section>
                )}

                {/* Generate Actions */}
                {uploadedFile && (
                    <section className="rounded-2xl border border-white/[0.06] bg-gray-950/80 backdrop-blur-xl p-6 mb-4 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <h2 className="text-base font-bold flex items-center gap-2 mb-4">
                            <Rocket className="w-4 h-4 text-purple-400" /> Generate
                        </h2>
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={() => handleGenerate(true)}
                                disabled={isGenerating}
                                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl border border-white/10 bg-white/5 hover:border-purple-500/40 hover:bg-purple-500/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                {isGenerating && isPreview ? (
                                    <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Generating...</>
                                ) : (
                                    <><Zap className="w-4 h-4 text-yellow-400" /> Quick Preview</>
                                )}
                            </button>
                            <button
                                onClick={() => handleGenerate(false)}
                                disabled={isGenerating}
                                className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-shadow disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                {isGenerating && !isPreview ? (
                                    <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Generating...</>
                                ) : (
                                    <><Sparkles className="w-4 h-4" /> Generate HD ({densityLabel(settings.density)} emojis)</>
                                )}
                            </button>
                            {(mosaicUrl || previewUrl) && !isGenerating && (
                                <button onClick={handleDownload} className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-shadow">
                                    <Download className="w-4 h-4" /> Download PNG
                                </button>
                            )}
                        </div>
                        {isGenerating && <ProgressBar progress={progress} status={status} />}
                    </section>
                )}

                {/* Result */}
                {uploadedFile && (
                    <section className="rounded-2xl border border-white/[0.06] bg-gray-950/80 backdrop-blur-xl p-6 mb-4 shadow-xl">
                        <h2 className="text-base font-bold flex items-center gap-2 mb-4">
                            <Image className="w-4 h-4 text-purple-400" /> Result
                        </h2>
                        <MosaicPreview previewUrl={previewUrl} mosaicUrl={mosaicUrl} isPreview={isPreview && !mosaicUrl} />
                    </section>
                )}

                {/* Gallery */}
                <section className="rounded-2xl border border-white/[0.06] bg-gray-950/80 backdrop-blur-xl p-6 shadow-xl">
                    <h2 className="text-base font-bold flex items-center gap-2 mb-4">
                        <Camera className="w-4 h-4 text-purple-400" /> My Mosaics Gallery
                    </h2>
                    <Gallery />
                </section>
            </div>

            {/* Footer */}
            <footer className="text-center py-8 text-xs text-gray-600">
                Made with 💜 and lots of emojis • Runs 100% locally
            </footer>
        </div>
    )
}
