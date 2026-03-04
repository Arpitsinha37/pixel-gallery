import { ImageIcon } from "lucide-react"

interface MosaicPreviewProps {
    previewUrl: string | null
    mosaicUrl: string | null
    isPreview: boolean
}

export default function MosaicPreview({ previewUrl, mosaicUrl, isPreview }: MosaicPreviewProps) {
    const imageUrl = mosaicUrl || previewUrl

    if (!imageUrl) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-600">
                <ImageIcon className="w-10 h-10 opacity-30" />
                <p className="text-sm">Upload a photo and generate a preview to see your emoji mosaic here</p>
            </div>
        )
    }

    return (
        <div className="flex justify-center">
            <div className="relative inline-block max-w-full rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-purple-500/5">
                <img src={imageUrl} alt="Emoji Mosaic" className="max-w-full max-h-[500px] object-contain" id="mosaic-image" />
                <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide backdrop-blur-md ${isPreview ? "bg-purple-600/80 text-white" : "bg-emerald-500/80 text-white"
                    }`}>
                    {isPreview ? "⚡ Preview" : "✨ HD Mosaic"}
                </span>
            </div>
        </div>
    )
}
