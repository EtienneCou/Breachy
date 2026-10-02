import React, { useState } from "react";
import { addMidiSong } from "../Services/MidiDatabase";
import { useLanguage } from "../context/LanguageContext";

export default function MidiUploader({ onSongAdded }) {
  const { t } = useLanguage();
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const validateFile = (selectedFile) => {
    if (!selectedFile) return;

    const name = selectedFile.name.toLowerCase();

    if (!name.endsWith(".mid") && !name.endsWith(".midi")) {
      setError(t('uploader.errorFormat'));
      setFile(null);
      return;
    }

    setError("");
    setFile(selectedFile);
  };

  const handleFileChange = (event) => {
    validateFile(event.target.files[0]);
  };

  const handleDrop = (event) => {
    event.preventDefault();

    const droppedFile = event.dataTransfer.files[0];

    validateFile(droppedFile);
  };

  const handleSave = async () => {
    if (!file) return;

    try {
      setIsSaving(true);

      const song = {
        id: crypto.randomUUID(),

        title: file.name.replace(/\.(mid|midi)$/i, ""),

        fileName: file.name,

        file,

        size: file.size,

        type: file.type,

        createdAt: new Date().toISOString(),

        source: "user",
      };

      await addMidiSong(song);

      onSongAdded?.(song);

      setFile(null);
      setError("");
    } catch (err) {
      console.error(err);

      setError(t('uploader.errorGeneric'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="midi-uploader">
      <div
        className="drop-zone"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <div className="upload-icon">
          ♫
        </div>

        <h3>{t('uploader.title')}</h3>

        <p>{t('uploader.hint')}</p>

        <label className="choose-file-btn">
          {t('uploader.chooseFile')}

          <input
            type="file"
            accept=".mid,.midi,audio/midi,audio/x-midi"
            onChange={handleFileChange}
            hidden
          />
        </label>
      </div>

      {error && (
        <p className="error">
          {error}
        </p>
      )}

      {file && (
        <div className="selected-file">
          <div>
            <strong>
              {file.name}
            </strong>

            <span>
              {(file.size / 1024).toFixed(1)} Ko
            </span>
          </div>

          <button
            type="button"
            onClick={() => setFile(null)}
          >
            ×
          </button>
        </div>
      )}

      {file && (
        <button
          type="button"
          className="save-btn"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving
            ? t('uploader.adding')
            : t('uploader.addToLibrary')}
        </button>
      )}

      <style>{`
        .midi-uploader {
          width: 100%;
          max-width: 520px;
        }

        .drop-zone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          min-height: 210px;

          padding: 28px;

          border: 2px dashed #d5dbea;
          border-radius: 18px;

          background: #f9fbff;

          text-align: center;
        }

        .upload-icon {
          display: grid;
          place-items: center;

          width: 52px;
          height: 52px;

          margin-bottom: 12px;

          border-radius: 50%;

          background: #eaf3ff;
          color: #1677ff;

          font-size: 27px;
        }

        .drop-zone h3 {
          margin: 0 0 8px;

          color: #111827;

          font-size: 19px;
        }

        .drop-zone p {
          max-width: 340px;

          margin: 0 0 18px;

          color: #7180a8;

          font-size: 14px;
          line-height: 1.5;
        }

        .choose-file-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;

          min-height: 42px;

          padding: 0 18px;

          border-radius: 10px;

          background: #1677ff;
          color: white;

          font-size: 14px;
          font-weight: 600;

          cursor: pointer;
        }

        .selected-file {
          display: flex;
          align-items: center;
          justify-content: space-between;

          margin-top: 12px;

          padding: 12px 14px;

          border: 1px solid #e4e8f1;
          border-radius: 12px;

          background: #ffffff;
        }

        .selected-file div {
          display: flex;
          flex-direction: column;
          gap: 3px;

          min-width: 0;
        }

        .selected-file strong {
          overflow: hidden;

          color: #111827;

          font-size: 14px;

          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .selected-file span {
          color: #8994b0;
          font-size: 12px;
        }

        .selected-file button {
          border: 0;
          background: transparent;

          color: #7481a3;

          font-size: 24px;

          cursor: pointer;
        }

        .save-btn {
          width: 100%;
          height: 44px;

          margin-top: 12px;

          border: 0;
          border-radius: 10px;

          background: #111827;
          color: white;

          font-weight: 600;

          cursor: pointer;
        }

        .save-btn:disabled {
          opacity: 0.6;
          cursor: default;
        }

        .error {
          margin: 10px 0 0;

          color: #dc2626;

          font-size: 13px;
        }
      `}</style>
    </div>
  );
}