import { useState, useCallback, useRef } from 'react';

function UploadSection({ onUpload, disabled }) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const validateFile = (file) => {
    if (!file) return 'No file selected';
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return 'Please upload a CSV file';
    }
    if (file.size > 50 * 1024 * 1024) {
      return 'File size exceeds 50MB limit';
    }
    return null;
  };

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const file = e.dataTransfer.files[0];
      const error = validateFile(file);

      if (error) {
        alert(error);
        return;
      }

      setSelectedFile(file);
    },
    [disabled]
  );

  const handleFileSelect = useCallback(
    (e) => {
      if (disabled) return;

      const file = e.target.files[0];
      const error = validateFile(file);

      if (error) {
        alert(error);
        return;
      }

      setSelectedFile(file);
    },
    [disabled]
  );

  const handleUploadClick = useCallback(() => {
    if (selectedFile && !disabled) {
      onUpload(selectedFile);
    }
  }, [selectedFile, disabled, onUpload]);

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="glass-card p-8 max-w-2xl mx-auto">
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-300 ${
          isDragging
            ? 'border-primary-500 bg-primary-500/10'
            : 'border-dark-600 hover:border-dark-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!selectedFile ? handleBrowseClick : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />

        {!selectedFile ? (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-800 flex items-center justify-center">
              <svg
                className={`w-8 h-8 ${
                  isDragging ? 'text-primary-500' : 'text-dark-400'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <p className="text-lg font-medium text-white mb-1">
              Drop your CSV file here
            </p>
            <p className="text-dark-400 mb-4">
              or{' '}
              <span className="text-primary-400 hover:text-primary-300 cursor-pointer">
                browse
              </span>{' '}
              to upload
            </p>
            <p className="text-xs text-dark-500">
              Maximum file size: 50MB
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-primary-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-medium text-white">{selectedFile.name}</p>
                <p className="text-sm text-dark-400">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveFile();
              }}
              className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
              disabled={disabled}
            >
              <svg
                className="w-5 h-5 text-dark-400 hover:text-danger-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      {selectedFile && (
        <div className="mt-6">
          <button
            onClick={handleUploadClick}
            disabled={disabled}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
            Analyze Transactions
          </button>
        </div>
      )}

      <div className="mt-6 p-4 bg-dark-800/50 rounded-xl">
        <h4 className="text-sm font-medium text-white mb-2">Required CSV Format:</h4>
        <div className="font-mono text-xs text-dark-400 bg-dark-900 p-3 rounded-lg overflow-x-auto">
          transaction_id, sender_id, receiver_id, amount, timestamp<br />
          TXN_001, ACC_001, ACC_002, 1500.00, 2024-01-15 10:30:00
        </div>
      </div>
    </div>
  );
}

export default UploadSection;
