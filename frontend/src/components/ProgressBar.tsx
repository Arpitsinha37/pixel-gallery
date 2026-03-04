interface ProgressBarProps {
    progress: number
    status: string
}

export default function ProgressBar({ progress, status }: ProgressBarProps) {
    return (
        <div className="mt-4 space-y-2">
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-purple-600 to-pink-500 rounded-full transition-all duration-300 relative"
                    style={{ width: `${progress}%` }}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_1.5s_ease-in-out_infinite]" />
                </div>
            </div>
            <div className="flex justify-between text-xs">
                <span className="text-gray-500">{status}</span>
                <span className="text-purple-400 font-bold tabular-nums">{progress}%</span>
            </div>
        </div>
    )
}
