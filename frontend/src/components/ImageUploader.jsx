import { useRef, useState, useCallback } from 'react';

const API_BASE = '/api';

export default function ImageUploader({ onUpload, uploadedFile }) {
    const fileInputRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const handleFile = useCallback(async (file) => {
        if (!file) return;

        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            alert('Please upload a JPG, PNG, or WebP image.');
            return;
        }

        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch(`${API_BASE}/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Upload failed');
            }

            const data = await res.json();

            // Create a local preview URL
            const previewUrl = URL.createObjectURL(file);

            onUpload({
                fileId: data.file_id,
                filename: data.filename,
                sizeKb: data.size_kb,
                previewUrl,
            });
        } catch (err) {
            alert(`Upload error: ${err.message}`);
        } finally {
            setIsUploading(false);
        }
    }, [onUpload]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        handleFile(file);
    }, [handleFile]);

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleInputChange = (e) => {
        const file = e.target.files[0];
        handleFile(file);
    };

    if (uploadedFile) {
        return (
            <div className="upload-preview animate-in">
                <img
                    src={uploadedFile.previewUrl}
                    alt="Uploaded"
                    className="upload-preview__img"
                />
                <div className="upload-preview__info">
                    <div className="upload-preview__name">{uploadedFile.filename}</div>
                    <div className="upload-preview__size">{uploadedFile.sizeKb} KB</div>
                </div>
                <button
                    className="upload-preview__change"
                    onClick={handleClick}
                >
                    Change
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleInputChange}
                />
            </div>
        );
    }

    return (
        <div
            className={`upload-zone ${isDragging ? 'upload-zone--drag' : ''}`}
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            role="button"
            tabIndex={0}
            id="upload-zone"
        >
            <span className="upload-zone__icon">
                {isUploading ? <span className="spinner" /> : '📷'}
            </span>
            <div className="upload-zone__text">
                {isUploading ? 'Uploading...' : 'Drop your photo here or click to upload'}
            </div>
            <div className="upload-zone__subtext">
                Supports JPG, PNG, WebP
            </div>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleInputChange}
            />
        </div>
    );
}
