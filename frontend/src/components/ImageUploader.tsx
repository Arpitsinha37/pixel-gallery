import { useRef, useState, useCallback } from "react"
import { Upload, ImageIcon, RefreshCw } from "lucide-react"

const API_BASE = import.meta.env.VITE_API_URL || "/api"

interface UploadedFile {
    fileId: string
    filename: string
    sizeKb: number
    previewUrl: string
}

interface ImageUploaderProps {
    onUpload: (file: UploadedFile) => void
    uploadedFile: UploadedFile | null
}

export default function ImageUploader({ onUpload, uploadedFile }: ImageUploaderProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [isUploading, setIsUploading] = useState(false)

    const handleFile = useCallback(async (file: File) => {
        if (!file) return

        const validTypes = ["image/jpeg", "image/png", "image/webp"]
        if (!validTypes.includes(file.type)) {
            alert("Please upload a JPG, PNG, or WebP image.")
            return
        }

        setIsUploading(true)
        try {
            const formData = new FormData()
            formData.append("file", file)

            const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: formData })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.detail || "Upload failed")
            }

            const data = await res.json()
            const previewUrl = URL.createObjectURL(file)

            onUpload({
                fileId: data.file_id,
                filename: data.filename,
                sizeKb: data.size_kb,
                previewUrl,
            })
        } catch (err: any) {
            alert(`Upload error: ${err.message}`)
        } finally {
            setIsUploading(false)
        }
    }, [onUpload])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback(() => setIsDragging(false), [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
    }, [handleFile])

    const handleClick = () => fileInputRef.current?.click()
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) handleFile(file)
    }

    if (uploadedFile) {
        return (
            <div className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5">
                <img src={uploadedFile.previewUrl} alt="Uploaded" className="w-24 h-24 object-cover rounded-lg border border-white/10" />
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{uploadedFile.filename}</p>
                    <p className="text-xs text-gray-400">{uploadedFile.sizeKb} KB</p>
                </div>
                <button onClick={handleClick} className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg border border-white/10 hover:border-purple-500/50 hover:text-purple-400 transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" /> Change
                </button>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleInputChange} className="hidden" />
            </div>
        )
    }

    return (
        <div
            className={`group relative flex flex-col items-center justify-center gap-3 p-12 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-300 ${isDragging
                ? "border-purple-500 bg-purple-500/10"
                : "border-white/10 hover:border-purple-500/40 hover:bg-white/[0.02]"
                }`}
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            role="button"
            tabIndex={0}
            id="upload-zone"
        >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                {isUploading ? (
                    <RefreshCw className="w-6 h-6 text-purple-400 animate-spin" />
                ) : (
                    <Upload className="w-6 h-6 text-purple-400" />
                )}
            </div>
            <div className="text-center">
                <p className="font-semibold text-sm">{isUploading ? "Uploading..." : "Drop your photo here or click to upload"}</p>
                <p className="text-xs text-gray-500 mt-1">Supports JPG, PNG, WebP</p>
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleInputChange} className="hidden" />
        </div>
    )
}

export type { UploadedFile }
