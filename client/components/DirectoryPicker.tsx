"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/DirectoryPicker.scss";

interface Directory {
  name: string;
  path: string;
}

interface DirectoryBrowserResponse {
  currentPath: string;
  parentPath: string | null;
  directories: Directory[];
}

interface DirectoryPickerProps {
  value: string | null;
  onChange: (path: string) => void;
  label: React.ReactNode;
  placeholder?: string;
}

const DirectoryPicker: React.FC<DirectoryPickerProps> = ({
  value,
  onChange,
  label,
  placeholder = "Select a directory",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>("/Users");
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Start at user's home directory or the current value
      const startPath = value || "/Users";
      fetchDirectories(startPath);
    }
  }, [isOpen]);

  const fetchDirectories = async (path: string) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.get<DirectoryBrowserResponse>(
        `http://localhost:3002/api/Settings/browse?currentPath=${encodeURIComponent(path)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setCurrentPath(response.data.currentPath);
      setDirectories(response.data.directories);
      setParentPath(response.data.parentPath);
    } catch (error: any) {
      console.error("Error fetching directories:", error);
      setError(error.response?.data?.error || "Failed to load directories");
    } finally {
      setLoading(false);
    }
  };

  const handleDirectoryClick = (dir: Directory) => {
    fetchDirectories(dir.path);
  };

  const handleParentClick = () => {
    if (parentPath) {
      fetchDirectories(parentPath);
    }
  };

  const handleSelect = () => {
    onChange(currentPath);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="directory-picker">
      <label>{label}</label>
      
      <div className="input-with-button">
        <input
          type="text"
          value={value || ""}
          onChange={handleManualInput}
          placeholder={placeholder}
          className="directory-input"
        />
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="browse-button"
        >
          Browse...
        </button>
      </div>

      {isOpen && (
        <>
          <div className="modal-overlay" onClick={handleCancel} />
          <div className="directory-picker-modal">
            <div className="modal-header">
              <h3>Select Directory</h3>
              <button className="close-button" onClick={handleCancel}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="current-path">
                <strong>Current:</strong> {currentPath}
              </div>

              {error && <div className="error-message">{error}</div>}

              {loading ? (
                <div className="loading">Loading directories...</div>
              ) : (
                <div className="directory-list">
                  {parentPath && (
                    <div
                      className="directory-item parent"
                      onClick={handleParentClick}
                    >
                      <span className="icon">📁</span>
                      <span className="name">..</span>
                    </div>
                  )}

                  {directories.length === 0 && !loading && (
                    <div className="empty-message">
                      No subdirectories found
                    </div>
                  )}

                  {directories.map((dir) => (
                    <div
                      key={dir.path}
                      className="directory-item"
                      onClick={() => handleDirectoryClick(dir)}
                    >
                      <span className="icon">📁</span>
                      <span className="name">{dir.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="cancel-button" onClick={handleCancel}>
                Cancel
              </button>
              <button className="select-button" onClick={handleSelect}>
                Select "{currentPath}"
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DirectoryPicker;

