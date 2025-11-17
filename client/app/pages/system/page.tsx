"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { ChevronDown, ChevronRight } from "lucide-react";
import DirectoryPicker from "../../../components/DirectoryPicker";
import "../../../styles/System.scss";

interface Settings {
  id?: number;
  movieDirectory: string | null;
  seriesDirectory: string | null;
  movieFileFormat: string;
  seriesFileFormat: string;
  minQuality: string;
  maxQuality: string;
  autoDownload: boolean;
  autoRename: boolean;
  checkInterval: number;
}

const System = () => {
  const [settings, setSettings] = useState<Settings>({
    movieDirectory: null,
    seriesDirectory: null,
    movieFileFormat: "{Movie Title} ({Release Year})",
    seriesFileFormat: "{Series Title}/Season {season:00}/{Series Title} - S{season:00}E{episode:00} - {Episode Title}",
    minQuality: "720p",
    maxQuality: "1080p",
    autoDownload: true,
    autoRename: false,
    checkInterval: 60,
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [testingMovieDir, setTestingMovieDir] = useState(false);
  const [testingSeriesDir, setTestingSeriesDir] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renamePreview, setRenamePreview] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [renaming, setRenaming] = useState(false);
  
  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['directories', 'naming', 'quality', 'automation']));
  
  // Modal state
  const [infoModal, setInfoModal] = useState<{ show: boolean; title: string; message: string; type: 'success' | 'error' | 'info' }>({
    show: false,
    title: '',
    message: '',
    type: 'info',
  });
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; title: string; message: string; onConfirm: () => void }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:3013/api/Settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSettings(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching settings:", error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        "http://localhost:3013/api/Settings",
        settings,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSettings(response.data);
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error: any) {
      console.error("Error saving settings:", error);
      const errorMsg = error.response?.data?.error || 'Failed to save settings';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const testDirectory = async (type: 'movie' | 'series') => {
    const directory = type === 'movie' ? settings.movieDirectory : settings.seriesDirectory;
    
    if (!directory) {
      setMessage({ type: 'error', text: `Please enter a ${type} directory first` });
      return;
    }

    if (type === 'movie') {
      setTestingMovieDir(true);
    } else {
      setTestingSeriesDir(true);
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:3013/api/Settings/test-directory",
        { directory },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.accessible) {
        setMessage({ type: 'success', text: `✓ ${type === 'movie' ? 'Movie' : 'Series'} directory is accessible` });
      }
    } catch (error: any) {
      console.error("Error testing directory:", error);
      const errorMsg = error.response?.data?.error || `Failed to access ${type} directory`;
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      if (type === 'movie') {
        setTestingMovieDir(false);
      } else {
        setTestingSeriesDir(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="System page">
        <div className="container">
          <h1 className="content-header">System Settings</h1>
          <div className="content-body">
            <p>Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="System page">
      <div className="container">
        <h1 className="content-header">System Settings</h1>
        
        {message && (
          <div className={`message message-${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="content-body">
          {/* Media Directories Section */}
          <section className="settings-section">
            <div className="section-header" onClick={() => toggleSection('directories')}>
              <h2>
                {expandedSections.has('directories') ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                Media Directories
              </h2>
            </div>
            {expandedSections.has('directories') && (
              <>
                <p className="section-description">
                  Configure where your movies and TV series are stored. BorrowArr will check these locations
                  to see if content already exists before downloading.
                </p>

                <div className="setting-group">
              <DirectoryPicker
                label={
                  <>
                    Movie Directory
                    <span className="label-hint">Where your movies are stored</span>
                  </>
                }
                value={settings.movieDirectory}
                onChange={(path) => setSettings({ ...settings, movieDirectory: path })}
                placeholder="/path/to/movies (e.g., /Users/you/Movies)"
              />
              <div className="button-group-inline">
                <button
                  onClick={() => testDirectory('movie')}
                  disabled={testingMovieDir || !settings.movieDirectory}
                  className="test-button-inline"
                >
                  {testingMovieDir ? 'Testing...' : 'Test Directory'}
                </button>
                <button
                  onClick={() => {
                    if (!settings.movieDirectory) {
                      setInfoModal({
                        show: true,
                        title: 'Configuration Required',
                        message: 'Please configure your movie directory first!',
                        type: 'error',
                      });
                      return;
                    }

                    setConfirmModal({
                      show: true,
                      title: 'Import Movies',
                      message: `This will scan your movie directory and add all found movies to your monitored list.\n\nDirectory: ${settings.movieDirectory}\n\nContinue?`,
                      onConfirm: async () => {
                        setConfirmModal({ ...confirmModal, show: false });
                        setSaving(true);
                        setMessage(null);

                        try {
                          const token = localStorage.getItem("token");
                          const response = await axios.post(
                            "http://localhost:3013/api/Settings/import-movies",
                            { dryRun: false },
                            {
                              headers: { Authorization: `Bearer ${token}` },
                              timeout: 300000,
                            }
                          );

                          const { results } = response.data;
                          
                          let message = `Import Complete!\n\n`;
                          message += `✅ Imported: ${results.imported} movies\n`;
                          if (results.alreadyMonitored > 0) {
                            message += `⏭️  Already monitored: ${results.alreadyMonitored}\n`;
                          }
                          if (results.errors > 0) {
                            message += `❌ Errors: ${results.errors}\n`;
                          }
                          message += `\nTotal files scanned: ${results.total}`;

                          setInfoModal({
                            show: true,
                            title: 'Import Complete',
                            message,
                            type: 'success',
                          });
                          setMessage({ 
                            type: 'success', 
                            text: `Successfully imported ${results.imported} movies!` 
                          });
                        } catch (error: any) {
                          console.error("Error importing movies:", error);
                          const errorMsg = error.response?.data?.error || error.message || 'Failed to import movies';
                          setInfoModal({
                            show: true,
                            title: 'Import Failed',
                            message: errorMsg,
                            type: 'error',
                          });
                          setMessage({ type: 'error', text: errorMsg });
                        } finally {
                          setSaving(false);
                        }
                      },
                    });
                  }}
                  disabled={saving || !settings.movieDirectory}
                  className="import-button-inline"
                >
                  {saving ? '🔄 Importing...' : '📥 Import'}
                </button>
              </div>
            </div>

            <div className="setting-group">
              <DirectoryPicker
                label={
                  <>
                    Series Directory
                    <span className="label-hint">Where your TV shows are stored</span>
                  </>
                }
                value={settings.seriesDirectory}
                onChange={(path) => setSettings({ ...settings, seriesDirectory: path })}
                placeholder="/path/to/series (e.g., /Users/you/TV Shows)"
              />
              <div className="button-group-inline">
                <button
                  onClick={() => testDirectory('series')}
                  disabled={testingSeriesDir || !settings.seriesDirectory}
                  className="test-button-inline"
                >
                  {testingSeriesDir ? 'Testing...' : 'Test Directory'}
                </button>
                <button
                  onClick={() => {
                    if (!settings.seriesDirectory) {
                      setInfoModal({
                        show: true,
                        title: 'Configuration Required',
                        message: 'Please configure your series directory first!',
                        type: 'error',
                      });
                      return;
                    }

                    setConfirmModal({
                      show: true,
                      title: 'Import Series',
                      message: `This will scan your series directory and add all found TV shows to your monitored list.\n\nDirectory: ${settings.seriesDirectory}\n\nContinue?`,
                      onConfirm: async () => {
                        setConfirmModal({ ...confirmModal, show: false });
                        setSaving(true);
                        setMessage(null);

                        try {
                          const token = localStorage.getItem("token");
                          const response = await axios.post(
                            "http://localhost:3013/api/Settings/import-series",
                            { dryRun: false },
                            {
                              headers: { Authorization: `Bearer ${token}` },
                              timeout: 300000,
                            }
                          );

                          const { results } = response.data;
                          
                          let message = `Import Complete!\n\n`;
                          message += `✅ Imported: ${results.imported} series\n`;
                          if (results.alreadyMonitored > 0) {
                            message += `⏭️  Already monitored: ${results.alreadyMonitored}\n`;
                          }
                          if (results.errors > 0) {
                            message += `❌ Errors: ${results.errors}\n`;
                          }
                          message += `\nTotal series scanned: ${results.total}`;

                          setInfoModal({
                            show: true,
                            title: 'Import Complete',
                            message,
                            type: 'success',
                          });
                          setMessage({ 
                            type: 'success', 
                            text: `Successfully imported ${results.imported} series!` 
                          });
                        } catch (error: any) {
                          console.error("Error importing series:", error);
                          const errorMsg = error.response?.data?.error || error.message || 'Failed to import series';
                          setInfoModal({
                            show: true,
                            title: 'Import Failed',
                            message: errorMsg,
                            type: 'error',
                          });
                          setMessage({ type: 'error', text: errorMsg });
                        } finally {
                          setSaving(false);
                        }
                      },
                    });
                  }}
                  disabled={saving || !settings.seriesDirectory}
                  className="import-button-inline"
                >
                  {saving ? '🔄 Importing...' : '📥 Import'}
                </button>
              </div>
            </div>
              </>
            )}
          </section>

          {/* File Naming Section */}
          <section className="settings-section">
            <div className="section-header" onClick={() => toggleSection('naming')}>
              <h2>
                {expandedSections.has('naming') ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                File Naming
              </h2>
            </div>
            {expandedSections.has('naming') && (
              <>
                <p className="section-description">
                  Configure how files should be named when downloaded and renamed. Use tokens to build your custom format.
                </p>

                <div className="setting-group">
              <label htmlFor="movieFileFormat">
                Movie File Format
              </label>
              <input
                id="movieFileFormat"
                type="text"
                value={settings.movieFileFormat}
                onChange={(e) => setSettings({ ...settings, movieFileFormat: e.target.value })}
                placeholder="{Movie Title} ({Release Year})"
              />
              
              <div className="tokens-guide">
                <h4>Available Tokens:</h4>
                <div className="tokens-grid">
                  <div className="token-item">
                    <code>{'{Movie Title}'}</code>
                    <span>Movie name</span>
                  </div>
                  <div className="token-item">
                    <code>{'{Release Year}'}</code>
                    <span>Year released</span>
                  </div>
                  <div className="token-item">
                    <code>{'{Quality}'}</code>
                    <span>720p, 1080p, 2160p</span>
                  </div>
                  <div className="token-item">
                    <code>{'{Source}'}</code>
                    <span>BluRay, WEB-DL, etc.</span>
                  </div>
                  <div className="token-item">
                    <code>{'{Codec}'}</code>
                    <span>x264, x265, HEVC</span>
                  </div>
                  <div className="token-item">
                    <code>{'{Audio}'}</code>
                    <span>AAC, DTS, AC3</span>
                  </div>
                  <div className="token-item">
                    <code>{'{Edition}'}</code>
                    <span>Extended, Unrated</span>
                  </div>
                  <div className="token-item">
                    <code>{'{Release Group}'}</code>
                    <span>YIFY, RARBG</span>
                  </div>
                </div>
                
                <h4>Example Formats:</h4>
                <div className="format-examples">
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, movieFileFormat: '{Movie Title} ({Release Year})' })}
                    className="example-button"
                  >
                    <code>{'{Movie Title} ({Release Year})'}</code>
                    <span className="example-result">Shrek (2001).mp4</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, movieFileFormat: '{Movie Title} ({Release Year}) [{Quality}]' })}
                    className="example-button"
                  >
                    <code>{'{Movie Title} ({Release Year}) [{Quality}]'}</code>
                    <span className="example-result">Shrek (2001) [1080p].mp4</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, movieFileFormat: '{Movie Title} ({Release Year}) {Quality} {Source} {Codec}' })}
                    className="example-button"
                  >
                    <code>{'{Movie Title} ({Release Year}) {Quality} {Source} {Codec}'}</code>
                    <span className="example-result">Shrek (2001) 1080p BluRay x264.mp4</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, movieFileFormat: '{Movie Title}.{Release Year}.{Quality}.{Codec}-{Release Group}' })}
                    className="example-button"
                  >
                    <code>{'{Movie Title}.{Release Year}.{Quality}.{Codec}-{Release Group}'}</code>
                    <span className="example-result">Shrek.2001.1080p.x264-YIFY.mp4</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="setting-group">
              <label htmlFor="seriesFileFormat">
                Series File Format
              </label>
              <input
                id="seriesFileFormat"
                type="text"
                value={settings.seriesFileFormat}
                onChange={(e) => setSettings({ ...settings, seriesFileFormat: e.target.value })}
                placeholder="{Series Title}/Season {season:00}/{Series Title} - S{season:00}E{episode:00} - {Episode Title}"
              />
              
              <div className="tokens-guide">
                <h4>Available Tokens:</h4>
                <div className="tokens-grid">
                  <div className="token-item">
                    <code>{'{Series Title}'}</code>
                    <span>Show name</span>
                  </div>
                  <div className="token-item">
                    <code>{'{season:00}'}</code>
                    <span>Season (01, 02, etc.)</span>
                  </div>
                  <div className="token-item">
                    <code>{'{episode:00}'}</code>
                    <span>Episode (01, 02, etc.)</span>
                  </div>
                  <div className="token-item">
                    <code>{'{Episode Title}'}</code>
                    <span>Episode name</span>
                  </div>
                  <div className="token-item">
                    <code>{'{Quality}'}</code>
                    <span>720p, 1080p, 2160p</span>
                  </div>
                  <div className="token-item">
                    <code>{'{Source}'}</code>
                    <span>BluRay, WEB-DL, etc.</span>
                  </div>
                  <div className="token-item">
                    <code>{'{Codec}'}</code>
                    <span>x264, x265, HEVC</span>
                  </div>
                  <div className="token-item">
                    <code>{'{Audio}'}</code>
                    <span>AAC, DTS, AC3</span>
                  </div>
                </div>
                
                <h4>Example Formats:</h4>
                <div className="format-examples">
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, seriesFileFormat: '{Series Title} - S{season:00}E{episode:00} - {Episode Title}' })}
                    className="example-button"
                  >
                    <code>{'{Series Title} - S{season:00}E{episode:00} - {Episode Title}'}</code>
                    <span className="example-result">Breaking Bad - S01E01 - Pilot.mp4</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, seriesFileFormat: '{Series Title}/Season {season:00}/{Series Title} - S{season:00}E{episode:00}' })}
                    className="example-button"
                  >
                    <code>{'{Series Title}/Season {season:00}/{Series Title} - S{season:00}E{episode:00}'}</code>
                    <span className="example-result">Breaking Bad/Season 01/Breaking Bad - S01E01.mp4</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, seriesFileFormat: '{Series Title}.S{season:00}E{episode:00}.{Quality}.{Codec}' })}
                    className="example-button"
                  >
                    <code>{'{Series Title}.S{season:00}E{episode:00}.{Quality}.{Codec}'}</code>
                    <span className="example-result">Breaking.Bad.S01E01.1080p.x264.mp4</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="rename-actions">
              <button
                onClick={async () => {
                  if (!settings.movieDirectory && !settings.seriesDirectory) {
                    setInfoModal({
                      show: true,
                      title: 'Configuration Required',
                      message: 'Please configure at least one media directory (movies or series) first!',
                      type: 'error',
                    });
                    return;
                  }

                  setLoadingPreview(true);
                  setMessage(null);

                  try {
                    const token = localStorage.getItem("token");
                    const response = await axios.post(
                      "http://localhost:3013/api/Settings/preview-renames",
                      { 
                        movieFileFormat: settings.movieFileFormat,
                        seriesFileFormat: settings.seriesFileFormat,
                      },
                      {
                        headers: { Authorization: `Bearer ${token}` },
                        timeout: 60000,
                      }
                    );

                    // Response now contains both movies and series
                    const allRenames = [
                      ...(response.data.movies || []).map((r: any) => ({ ...r, type: 'movie' })),
                      ...(response.data.series || []).map((r: any) => ({ ...r, type: 'series' }))
                    ];
                    
                    setRenamePreview(allRenames);
                    setShowRenameModal(true);
                  } catch (error: any) {
                    console.error("Error previewing renames:", error);
                    const errorMsg = error.response?.data?.error || error.message || 'Failed to preview renames';
                    setInfoModal({
                      show: true,
                      title: 'Preview Failed',
                      message: errorMsg,
                      type: 'error',
                    });
                    setMessage({ type: 'error', text: errorMsg });
                  } finally {
                    setLoadingPreview(false);
                  }
                }}
                disabled={loadingPreview || (!settings.movieDirectory && !settings.seriesDirectory)}
                className="preview-rename-button"
              >
                {loadingPreview ? '🔄 Loading Preview...' : '🔍 Preview File Renames'}
              </button>
              <p className="rename-hint">
                💡 Preview how your files will be renamed according to the formats above. You can review and modify individual names before applying changes.
              </p>
            </div>
              </>
            )}
          </section>

          {/* Quality Settings Section */}
          <section className="settings-section">
            <div className="section-header" onClick={() => toggleSection('quality')}>
              <h2>
                {expandedSections.has('quality') ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                Quality Settings
              </h2>
            </div>
            {expandedSections.has('quality') && (
              <>
                <p className="section-description">
                  Set the minimum and maximum quality for downloads.
                </p>

                <div className="setting-group">
              <label htmlFor="minQuality">Minimum Quality</label>
              <select
                id="minQuality"
                value={settings.minQuality}
                onChange={(e) => setSettings({ ...settings, minQuality: e.target.value })}
              >
                <option value="480p">480p</option>
                <option value="720p">720p</option>
                <option value="1080p">1080p</option>
                <option value="2160p">2160p (4K)</option>
              </select>
            </div>

            <div className="setting-group">
              <label htmlFor="maxQuality">Maximum Quality</label>
              <select
                id="maxQuality"
                value={settings.maxQuality}
                onChange={(e) => setSettings({ ...settings, maxQuality: e.target.value })}
              >
                <option value="480p">480p</option>
                <option value="720p">720p</option>
                <option value="1080p">1080p</option>
                <option value="2160p">2160p (4K)</option>
              </select>
            </div>
              </>
            )}
          </section>

          {/* Automation Settings Section */}
          <section className="settings-section">
            <div className="section-header" onClick={() => toggleSection('automation')}>
              <h2>
                {expandedSections.has('automation') ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                Automation
              </h2>
            </div>
            {expandedSections.has('automation') && (
              <>
                <p className="section-description">
                  Configure automatic actions for monitored content. Auto Download is enabled by default.
                </p>

                <div className="setting-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.autoDownload}
                      onChange={(e) => setSettings({ ...settings, autoDownload: e.target.checked })}
                    />
                    <span>
                      <strong>Auto Download</strong>
                      <span className="label-hint">Automatically download monitored content when available</span>
                    </span>
                  </label>
                </div>

                <div className="setting-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.autoRename}
                      onChange={(e) => setSettings({ ...settings, autoRename: e.target.checked })}
                    />
                    <span>
                      <strong>Auto Rename</strong>
                      <span className="label-hint">Automatically rename files after download based on your file naming format</span>
                    </span>
                  </label>
                </div>

                <div className="setting-group">
                  <label htmlFor="checkInterval">
                    Check Interval (minutes)
                    <span className="label-hint">How often to check for new releases and missing files</span>
                  </label>
                  <input
                    id="checkInterval"
                    type="number"
                    min="5"
                    max="1440"
                    value={settings.checkInterval}
                    onChange={(e) => setSettings({ ...settings, checkInterval: parseInt(e.target.value) || 60 })}
                  />
                </div>
              </>
            )}
          </section>

          {/* Save Button */}
          <div className="actions">
            <button
              onClick={handleSave}
              disabled={saving}
              className="save-button"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* Rename Preview Modal */}
      {showRenameModal && (
        <>
          <div className="modal-overlay" onClick={() => setShowRenameModal(false)} />
          <div className="rename-modal">
            <div className="modal-header">
              <h2>Preview File Renames</h2>
              <button className="close-button" onClick={() => setShowRenameModal(false)}>
                ×
              </button>
            </div>

            <div className="modal-body">
              {renamePreview.length === 0 ? (
                <div className="empty-state">
                  <p>No files need to be renamed. All files already match the naming format!</p>
                </div>
              ) : (
                <>
                  <div className="rename-summary">
                    <p><strong>{renamePreview.length}</strong> file(s) will be renamed</p>
                    <p className="text-sm text-default-500">
                      {renamePreview.filter((r: any) => r.type === 'movie').length} movies, {renamePreview.filter((r: any) => r.type === 'series').length} series episodes
                    </p>
                  </div>

                  <div className="rename-list">
                    {/* Movies Section */}
                    {renamePreview.filter((r: any) => r.type === 'movie').length > 0 && (
                      <>
                        <div className="rename-section-header">
                          <h3>🎬 Movies</h3>
                        </div>
                        {renamePreview.filter((r: any) => r.type === 'movie').map((item, index) => (
                          <div key={`movie-${index}`} className="rename-item">
                            <div className="file-info">
                              <label className="file-label">Current:</label>
                              <div className="current-name">{item.currentName}</div>
                            </div>
                            <div className="arrow">→</div>
                            <div className="file-info">
                              <label className="file-label">New:</label>
                              <input
                                type="text"
                                className="new-name-input"
                                value={item.newName}
                                onChange={(e) => {
                                  const updated = [...renamePreview];
                                  const actualIndex = renamePreview.findIndex(r => r === item);
                                  updated[actualIndex].newName = e.target.value;
                                  setRenamePreview(updated);
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </>
                    )}

                    {/* Series Section */}
                    {renamePreview.filter((r: any) => r.type === 'series').length > 0 && (
                      <>
                        <div className="rename-section-header">
                          <h3>📺 Series Episodes</h3>
                        </div>
                        {renamePreview.filter((r: any) => r.type === 'series').map((item, index) => (
                          <div key={`series-${index}`} className="rename-item">
                            <div className="file-info">
                              <label className="file-label">Current:</label>
                              <div className="current-name">{item.currentName}</div>
                            </div>
                            <div className="arrow">→</div>
                            <div className="file-info">
                              <label className="file-label">New:</label>
                              <input
                                type="text"
                                className="new-name-input"
                                value={item.newName}
                                onChange={(e) => {
                                  const updated = [...renamePreview];
                                  const actualIndex = renamePreview.findIndex(r => r === item);
                                  updated[actualIndex].newName = e.target.value;
                                  setRenamePreview(updated);
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="cancel-button"
                onClick={() => setShowRenameModal(false)}
              >
                Cancel
              </button>
              {renamePreview.length > 0 && (
                <button
                  className="rename-all-button"
                  onClick={() => {
                    setConfirmModal({
                      show: true,
                      title: 'Confirm Rename',
                      message: `Are you sure you want to rename ${renamePreview.length} file(s)?\n\nThis action cannot be undone!`,
                      onConfirm: async () => {
                        setConfirmModal({ ...confirmModal, show: false });
                        setRenaming(true);
                        setMessage(null);

                        try {
                          const token = localStorage.getItem("token");
                          
                          // Separate movies and series
                          const movies = renamePreview.filter((r: any) => r.type === 'movie');
                          const series = renamePreview.filter((r: any) => r.type === 'series');
                          
                          let totalSuccess = 0;
                          let totalFailed = 0;

                          // Rename movies
                          if (movies.length > 0) {
                            const movieResponse = await axios.post(
                              "http://localhost:3013/api/Settings/execute-renames",
                              { renames: movies, type: 'movies' },
                              {
                                headers: { Authorization: `Bearer ${token}` },
                                timeout: 120000,
                              }
                            );
                            totalSuccess += movieResponse.data.results.success;
                            totalFailed += movieResponse.data.results.failed;
                          }

                          // Rename series
                          if (series.length > 0) {
                            const seriesResponse = await axios.post(
                              "http://localhost:3013/api/Settings/execute-renames",
                              { renames: series, type: 'series' },
                              {
                                headers: { Authorization: `Bearer ${token}` },
                                timeout: 120000,
                              }
                            );
                            totalSuccess += seriesResponse.data.results.success;
                            totalFailed += seriesResponse.data.results.failed;
                          }
                          
                          setInfoModal({
                            show: true,
                            title: 'Rename Complete',
                            message: `✅ Renamed: ${totalSuccess} files\n❌ Failed: ${totalFailed} files`,
                            type: 'success',
                          });

                          setMessage({ 
                            type: 'success', 
                            text: `Successfully renamed ${totalSuccess} files!` 
                          });
                          
                          setShowRenameModal(false);
                        } catch (error: any) {
                          console.error("Error renaming files:", error);
                          const errorMsg = error.response?.data?.error || error.message || 'Failed to rename files';
                          setInfoModal({
                            show: true,
                            title: 'Rename Failed',
                            message: errorMsg,
                            type: 'error',
                          });
                          setMessage({ type: 'error', text: errorMsg });
                        } finally {
                          setRenaming(false);
                        }
                      },
                    });
                  }}
                  disabled={renaming}
                >
                  {renaming ? '🔄 Renaming...' : '✅ Rename All'}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Info/Alert Modal */}
      {infoModal.show && (
        <>
          <div className="modal-overlay" onClick={() => setInfoModal({ ...infoModal, show: false })} />
          <div className="info-modal">
            <div className="modal-header">
              <h2>
                {infoModal.type === 'success' && '✅ '}
                {infoModal.type === 'error' && '❌ '}
                {infoModal.type === 'info' && 'ℹ️ '}
                {infoModal.title}
              </h2>
            </div>
            <div className="modal-body">
              <p className="modal-message">{infoModal.message}</p>
            </div>
            <div className="modal-footer">
              <button
                className="primary-button"
                onClick={() => setInfoModal({ ...infoModal, show: false })}
              >
                OK
              </button>
            </div>
          </div>
        </>
      )}

      {/* Confirm Modal */}
      {confirmModal.show && (
        <>
          <div className="modal-overlay" onClick={() => setConfirmModal({ ...confirmModal, show: false })} />
          <div className="confirm-modal">
            <div className="modal-header">
              <h2>⚠️ {confirmModal.title}</h2>
            </div>
            <div className="modal-body">
              <p className="modal-message">{confirmModal.message}</p>
            </div>
            <div className="modal-footer">
              <button
                className="cancel-button"
                onClick={() => setConfirmModal({ ...confirmModal, show: false })}
              >
                Cancel
              </button>
              <button
                className="primary-button"
                onClick={confirmModal.onConfirm}
              >
                Confirm
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default System;
