import { useState, useCallback, useRef } from 'react';
import ImageUploader from './components/ImageUploader';
import SettingsPanel from './components/SettingsPanel';
import ProgressBar from './components/ProgressBar';
import MosaicPreview from './components/MosaicPreview';
import Gallery from './components/Gallery';

const API_BASE = '/api';

export default function App() {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [settings, setSettings] = useState({
    tileSize: 16,
    density: 50000,
    theme: 'all',
  });
  const [previewUrl, setPreviewUrl] = useState(null);
  const [mosaicUrl, setMosaicUrl] = useState(null);
  const [mosaicFilename, setMosaicFilename] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreview, setIsPreview] = useState(true);
  const pollingRef = useRef(null);

  const handleUpload = useCallback((fileData) => {
    setUploadedFile(fileData);
    setPreviewUrl(null);
    setMosaicUrl(null);
    setMosaicFilename(null);
    setProgress(0);
    setStatus('');
  }, []);

  const pollProgress = useCallback(async (taskId, onComplete) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/progress/${taskId}`);
        if (!res.ok) return;

        const data = await res.json();
        setProgress(data.progress);
        setStatus(data.status);

        if (data.error) {
          clearInterval(pollingRef.current);
          setIsGenerating(false);
          alert(`Generation error: ${data.error}`);
          return;
        }

        if (data.progress >= 100 && data.result) {
          clearInterval(pollingRef.current);
          onComplete(data.result);
        }
      } catch {
        // Network error, keep polling
      }
    }, 800);
  }, []);

  const handleGeneratePreview = useCallback(async () => {
    if (!uploadedFile) return;

    setIsGenerating(true);
    setProgress(0);
    setStatus('Starting preview...');
    setIsPreview(true);

    try {
      const res = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_id: uploadedFile.fileId,
          tile_size: 24,
          density: 1000,
          theme: settings.theme,
          preview: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Generation failed');
      }

      const data = await res.json();

      pollProgress(data.task_id, (resultFilename) => {
        const url = `${API_BASE}/mosaic-image/${resultFilename}`;
        setPreviewUrl(url);
        setMosaicFilename(resultFilename);
        setIsGenerating(false);
      });
    } catch (err) {
      setIsGenerating(false);
      alert(`Preview error: ${err.message}`);
    }
  }, [uploadedFile, settings.theme, pollProgress]);

  const handleGenerateHD = useCallback(async () => {
    if (!uploadedFile) return;

    setIsGenerating(true);
    setProgress(0);
    setStatus('Starting HD generation...');
    setIsPreview(false);

    try {
      const res = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_id: uploadedFile.fileId,
          tile_size: settings.tileSize,
          density: settings.density,
          theme: settings.theme,
          preview: false,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Generation failed');
      }

      const data = await res.json();

      pollProgress(data.task_id, (resultFilename) => {
        const url = `${API_BASE}/mosaic-image/${resultFilename}`;
        setMosaicUrl(url);
        setMosaicFilename(resultFilename);
        setIsGenerating(false);
      });
    } catch (err) {
      setIsGenerating(false);
      alert(`Generation error: ${err.message}`);
    }
  }, [uploadedFile, settings, pollProgress]);

  const handleDownload = useCallback(() => {
    if (!mosaicFilename) return;
    const url = `${API_BASE}/download/${mosaicFilename}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = mosaicFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [mosaicFilename]);

  const densityLabel = (d) => {
    if (d >= 1000) return `${d / 1000}K`;
    return d;
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header animate-in">
        <div className="header__emoji-row">
          🎨 🖼️ ✨ 🎭 🌈
        </div>
        <h1 className="header__title">Emoji Mosaic Generator</h1>
        <p className="header__subtitle">
          Transform your photos into stunning emoji art with up to 250,000 tiles
        </p>
      </header>

      {/* Upload Section */}
      <section className="card animate-in animate-in--delay-1" id="upload-section">
        <h2 className="card__title">
          <span className="card__title-icon">📷</span>
          Upload Photo
        </h2>
        <ImageUploader
          onUpload={handleUpload}
          uploadedFile={uploadedFile}
        />
      </section>

      {/* Settings Section */}
      {uploadedFile && (
        <section className="card animate-in" id="settings-section">
          <h2 className="card__title">
            <span className="card__title-icon">⚙️</span>
            Settings
          </h2>
          <SettingsPanel
            settings={settings}
            onChange={setSettings}
          />
        </section>
      )}

      {/* Actions */}
      {uploadedFile && (
        <section className="card animate-in" id="actions-section">
          <h2 className="card__title">
            <span className="card__title-icon">🚀</span>
            Generate
          </h2>

          <div className="actions">
            <button
              className="btn btn--secondary"
              onClick={handleGeneratePreview}
              disabled={isGenerating}
              id="btn-preview"
            >
              {isGenerating && isPreview ? (
                <><span className="spinner" /> Generating...</>
              ) : (
                <><span className="btn__icon">⚡</span> Quick Preview</>
              )}
            </button>

            <button
              className="btn btn--primary"
              onClick={handleGenerateHD}
              disabled={isGenerating}
              id="btn-generate-hd"
            >
              {isGenerating && !isPreview ? (
                <><span className="spinner" /> Generating...</>
              ) : (
                <><span className="btn__icon">✨</span> Generate HD ({densityLabel(settings.density)} emojis)</>
              )}
            </button>

            {(mosaicUrl || previewUrl) && !isGenerating && (
              <button
                className="btn btn--download"
                onClick={handleDownload}
                id="btn-download"
              >
                <span className="btn__icon">📥</span> Download PNG
              </button>
            )}
          </div>

          {/* Progress */}
          {isGenerating && (
            <ProgressBar progress={progress} status={status} />
          )}
        </section>
      )}

      {/* Mosaic Result */}
      {uploadedFile && (
        <section className="card animate-in" id="result-section">
          <h2 className="card__title">
            <span className="card__title-icon">🖼️</span>
            Result
          </h2>
          <MosaicPreview
            previewUrl={previewUrl}
            mosaicUrl={mosaicUrl}
            isPreview={isPreview && !mosaicUrl}
          />
        </section>
      )}

      {/* Gallery Section */}
      <section className="card animate-in" id="gallery-section">
        <h2 className="card__title">
          <span className="card__title-icon">📸</span>
          My Mosaics Gallery
        </h2>
        <Gallery />
      </section>

      {/* Footer */}
      <footer className="footer">
        Made with 💜 and lots of emojis • Runs 100% locally
      </footer>
    </div>
  );
}
