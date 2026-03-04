export default function MosaicPreview({ previewUrl, mosaicUrl, isPreview }) {
    const imageUrl = mosaicUrl || previewUrl;

    if (!imageUrl) {
        return (
            <div className="empty-state">
                <div className="empty-state__icon">🖼️</div>
                <div className="empty-state__text">
                    Upload a photo and generate a preview to see your emoji mosaic here
                </div>
            </div>
        );
    }

    return (
        <div className="mosaic-display animate-in">
            <div className="mosaic-display__image-wrapper">
                <img
                    src={imageUrl}
                    alt="Emoji Mosaic"
                    className="mosaic-display__img"
                    id="mosaic-image"
                />
                <span className={`mosaic-display__badge ${isPreview ? 'mosaic-display__badge--preview' : 'mosaic-display__badge--hd'}`}>
                    {isPreview ? '⚡ Preview' : '✨ HD Mosaic'}
                </span>
            </div>
        </div>
    );
}
