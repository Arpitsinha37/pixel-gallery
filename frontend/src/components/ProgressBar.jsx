export default function ProgressBar({ progress, status }) {
    return (
        <div className="progress-container animate-in">
            <div className="progress-bar">
                <div
                    className="progress-bar__fill"
                    style={{ width: `${progress}%` }}
                />
            </div>
            <div className="progress-status">
                <span className="progress-status__text">{status}</span>
                <span className="progress-status__pct">{progress}%</span>
            </div>
        </div>
    );
}
