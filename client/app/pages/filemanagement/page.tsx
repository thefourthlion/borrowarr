"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Spinner } from "@nextui-org/spinner";
import { Button } from "@nextui-org/button";
import { Input } from "@nextui-org/input";
import { Card, CardBody, CardHeader } from "@nextui-org/card";
import { Chip } from "@nextui-org/chip";
import { Switch } from "@nextui-org/switch";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@nextui-org/modal";
import {
  FolderOpen,
  Film,
  Tv,
  FileText,
  RefreshCw,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  HardDrive,
  Pencil,
  Eye,
  Download,
  AlertTriangle,
  Info,
  Clock,
  Zap,
  Shield,
} from "lucide-react";
import DirectoryPicker from "../../../components/DirectoryPicker";
import { useAuth } from "@/context/AuthContext";
import "../../../styles/FileManagement.scss";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3013";

interface FileSettings {
  id?: number;
  movieDirectory: string | null;
  seriesDirectory: string | null;
  movieFileFormat: string;
  seriesFileFormat: string;
  autoRename: boolean;
  autoRenameInterval: number;
  autoRenameWarningShown: boolean;
}

interface RenameItem {
  currentPath: string;
  currentName: string;
  newName: string;
  type: 'movie' | 'series';
}

// Default settings for new users
const DEFAULT_SETTINGS: FileSettings = {
  movieDirectory: null,
  seriesDirectory: null,
  movieFileFormat: "{Movie Title} ({Release Year})",
  seriesFileFormat: "{Series Title}/Season {season:00}/{Series Title} - S{season:00}E{episode:00} - {Episode Title}",
  autoRename: false,
  autoRenameInterval: 60,
  autoRenameWarningShown: false,
};

const FileManagement = () => {
  const { user } = useAuth();
  
  const [settings, setSettings] = useState<FileSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Directory testing state
  const [testingMovieDir, setTestingMovieDir] = useState(false);
  const [testingSeriesDir, setTestingSeriesDir] = useState(false);
  const [movieDirStatus, setMovieDirStatus] = useState<'untested' | 'success' | 'error'>('untested');
  const [seriesDirStatus, setSeriesDirStatus] = useState<'untested' | 'success' | 'error'>('untested');
  
  // Import state
  const [importingMovies, setImportingMovies] = useState(false);
  const [importingSeries, setImportingSeries] = useState(false);
  
  // Rename preview state
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renamePreview, setRenamePreview] = useState<RenameItem[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameType, setRenameType] = useState<'movies' | 'series' | 'bulk'>('bulk');
  
  // Section expansion state
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['directories', 'movieNaming', 'seriesNaming', 'autoRename'])
  );
  
  // Beta warning modal state
  const [showBetaWarning, setShowBetaWarning] = useState(false);
  const [pendingAutoRenameEnable, setPendingAutoRenameEnable] = useState(false);
  
  // Modal state
  const [infoModal, setInfoModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });
  
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await axios.get(`${API_BASE_URL}/api/Settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Merge with defaults to ensure all fields exist
      setSettings({
        ...DEFAULT_SETTINGS,
        ...response.data,
      });
      setLoading(false);
    } catch (error) {
      console.error("Error fetching settings:", error);
      // Use defaults if fetch fails
      setSettings(DEFAULT_SETTINGS);
      setMessage({ type: 'error', text: 'Failed to load settings. Using defaults.' });
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("accessToken");
      const response = await axios.put(
        `${API_BASE_URL}/api/Settings`,
        settings,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSettings({ ...DEFAULT_SETTINGS, ...response.data });
      setMessage({ type: 'success', text: 'File management settings saved successfully!' });
      
      // Auto-clear success message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
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
      setInfoModal({
        isOpen: true,
        title: 'No Directory',
        message: `Please enter a ${type} directory first.`,
        type: 'warning',
      });
      return;
    }

    if (type === 'movie') {
      setTestingMovieDir(true);
      setMovieDirStatus('untested');
    } else {
      setTestingSeriesDir(true);
      setSeriesDirStatus('untested');
    }

    try {
      const token = localStorage.getItem("accessToken");
      const response = await axios.post(
        `${API_BASE_URL}/api/Settings/test-directory`,
        { directory },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.accessible) {
        if (type === 'movie') {
          setMovieDirStatus('success');
        } else {
          setSeriesDirStatus('success');
        }
        setMessage({ type: 'success', text: `✓ ${type === 'movie' ? 'Movie' : 'Series'} directory is accessible` });
      }
    } catch (error: any) {
      console.error("Error testing directory:", error);
      if (type === 'movie') {
        setMovieDirStatus('error');
      } else {
        setSeriesDirStatus('error');
      }
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

  const importMedia = async (type: 'movie' | 'series') => {
    const directory = type === 'movie' ? settings.movieDirectory : settings.seriesDirectory;
    
    if (!directory) {
      setInfoModal({
        isOpen: true,
        title: 'Configuration Required',
        message: `Please configure your ${type} directory first!`,
        type: 'error',
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: `Import ${type === 'movie' ? 'Movies' : 'Series'}`,
      message: `This will scan your ${type} directory and add all found ${type === 'movie' ? 'movies' : 'TV shows'} to your monitored list.\n\nDirectory: ${directory}\n\nContinue?`,
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        
        if (type === 'movie') {
          setImportingMovies(true);
        } else {
          setImportingSeries(true);
        }
        setMessage(null);

        try {
          const token = localStorage.getItem("accessToken");
          const response = await axios.post(
            `${API_BASE_URL}/api/Settings/import-${type === 'movie' ? 'movies' : 'series'}`,
            { dryRun: false },
            {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 300000,
            }
          );

          const { results } = response.data;
          
          let message = `Import Complete!\n\n`;
          message += `✅ Imported: ${results.imported} ${type === 'movie' ? 'movies' : 'series'}\n`;
          if (results.alreadyMonitored > 0) {
            message += `⏭️ Already monitored: ${results.alreadyMonitored}\n`;
          }
          if (results.errors > 0) {
            message += `❌ Errors: ${results.errors}\n`;
          }
          message += `\nTotal files scanned: ${results.total}`;

          setInfoModal({
            isOpen: true,
            title: 'Import Complete',
            message,
            type: 'success',
          });
          setMessage({ 
            type: 'success', 
            text: `Successfully imported ${results.imported} ${type === 'movie' ? 'movies' : 'series'}!` 
          });
        } catch (error: any) {
          console.error(`Error importing ${type}:`, error);
          const errorMsg = error.response?.data?.error || error.message || `Failed to import ${type}`;
          setInfoModal({
            isOpen: true,
            title: 'Import Failed',
            message: errorMsg,
            type: 'error',
          });
          setMessage({ type: 'error', text: errorMsg });
        } finally {
          if (type === 'movie') {
            setImportingMovies(false);
          } else {
            setImportingSeries(false);
          }
        }
      },
    });
  };

  const previewRenames = async (type: 'movies' | 'series' | 'bulk') => {
    // Validate directories based on type
    if (type === 'movies' && !settings.movieDirectory) {
      setInfoModal({
        isOpen: true,
        title: 'Configuration Required',
        message: 'Please configure your movie directory first!',
        type: 'error',
      });
      return;
    }
    if (type === 'series' && !settings.seriesDirectory) {
      setInfoModal({
        isOpen: true,
        title: 'Configuration Required',
        message: 'Please configure your series directory first!',
        type: 'error',
      });
      return;
    }
    if (type === 'bulk' && !settings.movieDirectory && !settings.seriesDirectory) {
      setInfoModal({
        isOpen: true,
        title: 'Configuration Required',
        message: 'Please configure at least one media directory first!',
        type: 'error',
      });
      return;
    }

    setLoadingPreview(true);
    setRenameType(type);
    setMessage(null);

    try {
      const token = localStorage.getItem("accessToken");
      const response = await axios.post(
        `${API_BASE_URL}/api/Settings/preview-renames`,
        { 
          movieFileFormat: settings.movieFileFormat,
          seriesFileFormat: settings.seriesFileFormat,
          type: type, // Pass the type to backend
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 60000,
        }
      );

      let allRenames: RenameItem[] = [];
      
      if (type === 'movies' || type === 'bulk') {
        allRenames = [
          ...allRenames,
          ...(response.data.movies || []).map((r: any) => ({ ...r, type: 'movie' as const }))
        ];
      }
      if (type === 'series' || type === 'bulk') {
        allRenames = [
          ...allRenames,
          ...(response.data.series || []).map((r: any) => ({ ...r, type: 'series' as const }))
        ];
      }
      
      setRenamePreview(allRenames);
      setShowRenameModal(true);
    } catch (error: any) {
      console.error("Error previewing renames:", error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to preview renames';
      setInfoModal({
        isOpen: true,
        title: 'Preview Failed',
        message: errorMsg,
        type: 'error',
      });
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setLoadingPreview(false);
    }
  };

  const executeRenames = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirm Rename',
      message: `Are you sure you want to rename ${renamePreview.length} file(s)?\n\nThis action cannot be undone!`,
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        setRenaming(true);
        setMessage(null);

        try {
          const token = localStorage.getItem("accessToken");
          
          const movies = renamePreview.filter(r => r.type === 'movie');
          const series = renamePreview.filter(r => r.type === 'series');
          
          let totalSuccess = 0;
          let totalFailed = 0;

          if (movies.length > 0) {
            const movieResponse = await axios.post(
              `${API_BASE_URL}/api/Settings/execute-renames`,
              { renames: movies, type: 'movies' },
              {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 120000,
              }
            );
            totalSuccess += movieResponse.data.results.success;
            totalFailed += movieResponse.data.results.failed;
          }

          if (series.length > 0) {
            const seriesResponse = await axios.post(
              `${API_BASE_URL}/api/Settings/execute-renames`,
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
            isOpen: true,
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
            isOpen: true,
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
  };

  const handleAutoRenameToggle = (enabled: boolean) => {
    if (enabled && !settings.autoRenameWarningShown) {
      // First time enabling - show beta warning
      setPendingAutoRenameEnable(true);
      setShowBetaWarning(true);
    } else {
      // Already seen warning or disabling
      setSettings({ ...settings, autoRename: enabled });
    }
  };

  const confirmAutoRenameEnable = async () => {
    setShowBetaWarning(false);
    setPendingAutoRenameEnable(false);
    
    // Mark warning as shown and enable auto-rename
    const updatedSettings = { 
      ...settings, 
      autoRename: true, 
      autoRenameWarningShown: true 
    };
    setSettings(updatedSettings);
    
    // Save immediately so the warning flag is persisted
    try {
      const token = localStorage.getItem("accessToken");
      await axios.put(
        `${API_BASE_URL}/api/Settings`,
        updatedSettings,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessage({ type: 'success', text: 'Auto-rename enabled! The service will start scanning your files.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error saving auto-rename setting:", error);
    }
  };

  const getDirStatusIcon = (status: 'untested' | 'success' | 'error') => {
    switch (status) {
      case 'success':
        return <Check size={16} className="text-success" />;
      case 'error':
        return <X size={16} className="text-danger" />;
      default:
        return null;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardBody className="text-center py-8">
            <AlertTriangle size={48} className="mx-auto mb-4 text-warning" />
            <h2 className="text-xl font-bold mb-2">Authentication Required</h2>
            <p className="text-default-500">Please sign in to access file management settings.</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-secondary/20 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <HardDrive className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  File Management
                </h1>
                <p className="text-xs sm:text-sm text-foreground/60 mt-1">
                  Configure media directories and file naming conventions
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-primary/20 bg-content1">
            <Spinner size="lg" color="primary" />
            <p className="mt-4 text-foreground/60">Loading file management settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-primary/20 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <HardDrive className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  File Management
                </h1>
                <p className="text-xs sm:text-sm text-foreground/60 mt-1">
                  Configure media directories and file naming conventions
                </p>
              </div>
            </div>
            <Button
              color="primary"
              variant="shadow"
              isLoading={saving}
              onPress={handleSave}
              startContent={!saving && <Check size={18} />}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-success/10 border-success/30 text-success' 
              : 'bg-danger/10 border-danger/30 text-danger'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? <Check size={18} /> : <X size={18} />}
              <span>{message.text}</span>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Media Directories Section */}
          <Card className="border border-content2">
            <CardHeader 
              className="cursor-pointer hover:bg-content2/50 transition-colors"
              onClick={() => toggleSection('directories')}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <FolderOpen size={24} className="text-primary" />
                  <div>
                    <h2 className="text-lg font-semibold">Media Directories</h2>
                    <p className="text-sm text-default-500">Configure where your movies and TV series are stored</p>
                  </div>
                </div>
                {expandedSections.has('directories') ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </div>
            </CardHeader>
            {expandedSections.has('directories') && (
              <CardBody className="pt-0 space-y-6">
                {/* Movie Directory */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Film size={18} className="text-primary" />
                    <span className="font-medium">Movie Directory</span>
                    {getDirStatusIcon(movieDirStatus)}
                  </div>
                  <DirectoryPicker
                    label=""
                    value={settings.movieDirectory}
                    onChange={(path) => {
                      setSettings({ ...settings, movieDirectory: path });
                      setMovieDirStatus('untested');
                    }}
                    placeholder="/path/to/movies (e.g., /Users/you/Movies)"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="flat"
                      color="secondary"
                      isLoading={testingMovieDir}
                      isDisabled={!settings.movieDirectory}
                      onPress={() => testDirectory('movie')}
                      startContent={!testingMovieDir && <RefreshCw size={14} />}
                    >
                      Test Directory
                    </Button>
                    <Button
                      size="sm"
                      variant="flat"
                      color="primary"
                      isLoading={importingMovies}
                      isDisabled={!settings.movieDirectory}
                      onPress={() => importMedia('movie')}
                      startContent={!importingMovies && <Download size={14} />}
                    >
                      Import Movies
                    </Button>
                  </div>
                </div>

                {/* Series Directory */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Tv size={18} className="text-secondary" />
                    <span className="font-medium">Series Directory</span>
                    {getDirStatusIcon(seriesDirStatus)}
                  </div>
                  <DirectoryPicker
                    label=""
                    value={settings.seriesDirectory}
                    onChange={(path) => {
                      setSettings({ ...settings, seriesDirectory: path });
                      setSeriesDirStatus('untested');
                    }}
                    placeholder="/path/to/series (e.g., /Users/you/TV Shows)"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="flat"
                      color="secondary"
                      isLoading={testingSeriesDir}
                      isDisabled={!settings.seriesDirectory}
                      onPress={() => testDirectory('series')}
                      startContent={!testingSeriesDir && <RefreshCw size={14} />}
                    >
                      Test Directory
                    </Button>
                    <Button
                      size="sm"
                      variant="flat"
                      color="primary"
                      isLoading={importingSeries}
                      isDisabled={!settings.seriesDirectory}
                      onPress={() => importMedia('series')}
                      startContent={!importingSeries && <Download size={14} />}
                    >
                      Import Series
                    </Button>
                  </div>
                </div>
              </CardBody>
            )}
          </Card>

          {/* Movie Naming Section */}
          <Card className="border border-content2">
            <CardHeader 
              className="cursor-pointer hover:bg-content2/50 transition-colors"
              onClick={() => toggleSection('movieNaming')}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <Film size={24} className="text-primary" />
                  <div>
                    <h2 className="text-lg font-semibold">Movie File Naming</h2>
                    <p className="text-sm text-default-500">Configure how movie files should be named</p>
                  </div>
                </div>
                {expandedSections.has('movieNaming') ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </div>
            </CardHeader>
            {expandedSections.has('movieNaming') && (
              <CardBody className="pt-0 space-y-4">
                <Input
                  label="Movie File Format"
                  value={settings.movieFileFormat}
                  onChange={(e) => setSettings({ ...settings, movieFileFormat: e.target.value })}
                  placeholder="{Movie Title} ({Release Year})"
                  variant="bordered"
                  classNames={{
                    input: "font-mono text-sm",
                  }}
                />

                {/* Available Tokens */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Info size={14} />
                    Available Tokens
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { token: '{Movie Title}', desc: 'Movie name' },
                      { token: '{Release Year}', desc: 'Year released' },
                      { token: '{Quality}', desc: '720p, 1080p, 2160p' },
                      { token: '{Source}', desc: 'BluRay, WEB-DL, etc.' },
                      { token: '{Codec}', desc: 'x264, x265, HEVC' },
                      { token: '{Audio}', desc: 'AAC, DTS, AC3' },
                      { token: '{Edition}', desc: 'Extended, Unrated' },
                      { token: '{Release Group}', desc: 'YIFY, RARBG' },
                    ].map(({ token, desc }) => (
                      <Chip
                        key={token}
                        size="sm"
                        variant="flat"
                        className="cursor-pointer hover:bg-primary/20"
                        onClick={() => setSettings({ 
                          ...settings, 
                          movieFileFormat: settings.movieFileFormat + token 
                        })}
                      >
                        <code className="text-xs">{token}</code>
                        <span className="ml-1 text-xs text-default-500">{desc}</span>
                      </Chip>
                    ))}
                  </div>
                </div>

                {/* Quick Templates */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Quick Templates</h4>
                  <div className="grid gap-2">
                    {[
                      { format: '{Movie Title} ({Release Year})', example: 'Shrek (2001).mp4' },
                      { format: '{Movie Title} ({Release Year}) [{Quality}]', example: 'Shrek (2001) [1080p].mp4' },
                      { format: '{Movie Title} ({Release Year}) {Quality} {Source} {Codec}', example: 'Shrek (2001) 1080p BluRay x264.mp4' },
                      { format: '{Movie Title}.{Release Year}.{Quality}.{Codec}-{Release Group}', example: 'Shrek.2001.1080p.x264-YIFY.mp4' },
                    ].map(({ format, example }) => (
                      <button
                        key={format}
                        type="button"
                        className="flex justify-between items-center p-3 rounded-lg border border-content3 hover:border-primary hover:bg-primary/5 transition-all text-left"
                        onClick={() => setSettings({ ...settings, movieFileFormat: format })}
                      >
                        <code className="text-xs text-primary">{format}</code>
                        <span className="text-xs text-default-500 ml-2">→ {example}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rename Movies Button */}
                <div className="pt-4 border-t border-content3">
                  <Button
                    color="primary"
                    variant="flat"
                    isLoading={loadingPreview && renameType === 'movies'}
                    isDisabled={!settings.movieDirectory}
                    onPress={() => previewRenames('movies')}
                    startContent={!(loadingPreview && renameType === 'movies') && <Pencil size={16} />}
                    className="w-full sm:w-auto"
                  >
                    Rename Movies Only
                  </Button>
                </div>
              </CardBody>
            )}
          </Card>

          {/* Series Naming Section */}
          <Card className="border border-content2">
            <CardHeader 
              className="cursor-pointer hover:bg-content2/50 transition-colors"
              onClick={() => toggleSection('seriesNaming')}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <Tv size={24} className="text-secondary" />
                  <div>
                    <h2 className="text-lg font-semibold">Series File Naming</h2>
                    <p className="text-sm text-default-500">Configure how TV series files should be named</p>
                  </div>
                </div>
                {expandedSections.has('seriesNaming') ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </div>
            </CardHeader>
            {expandedSections.has('seriesNaming') && (
              <CardBody className="pt-0 space-y-4">
                <Input
                  label="Series File Format"
                  value={settings.seriesFileFormat}
                  onChange={(e) => setSettings({ ...settings, seriesFileFormat: e.target.value })}
                  placeholder="{Series Title}/Season {season:00}/{Series Title} - S{season:00}E{episode:00} - {Episode Title}"
                  variant="bordered"
                  classNames={{
                    input: "font-mono text-sm",
                  }}
                />

                {/* Available Tokens */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Info size={14} />
                    Available Tokens
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { token: '{Series Title}', desc: 'Show name' },
                      { token: '{season:00}', desc: 'Season (01, 02)' },
                      { token: '{episode:00}', desc: 'Episode (01, 02)' },
                      { token: '{Episode Title}', desc: 'Episode name' },
                      { token: '{Quality}', desc: '720p, 1080p, 2160p' },
                      { token: '{Source}', desc: 'BluRay, WEB-DL' },
                      { token: '{Codec}', desc: 'x264, x265, HEVC' },
                      { token: '{Audio}', desc: 'AAC, DTS, AC3' },
                    ].map(({ token, desc }) => (
                      <Chip
                        key={token}
                        size="sm"
                        variant="flat"
                        className="cursor-pointer hover:bg-secondary/20"
                        onClick={() => setSettings({ 
                          ...settings, 
                          seriesFileFormat: settings.seriesFileFormat + token 
                        })}
                      >
                        <code className="text-xs">{token}</code>
                        <span className="ml-1 text-xs text-default-500">{desc}</span>
                      </Chip>
                    ))}
                  </div>
                </div>

                {/* Quick Templates */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Quick Templates</h4>
                  <div className="grid gap-2">
                    {[
                      { format: '{Series Title} - S{season:00}E{episode:00} - {Episode Title}', example: 'Breaking Bad - S01E01 - Pilot.mp4' },
                      { format: '{Series Title}/Season {season:00}/{Series Title} - S{season:00}E{episode:00}', example: 'Breaking Bad/Season 01/Breaking Bad - S01E01.mp4' },
                      { format: '{Series Title}.S{season:00}E{episode:00}.{Quality}.{Codec}', example: 'Breaking.Bad.S01E01.1080p.x264.mp4' },
                    ].map(({ format, example }) => (
                      <button
                        key={format}
                        type="button"
                        className="flex justify-between items-center p-3 rounded-lg border border-content3 hover:border-secondary hover:bg-secondary/5 transition-all text-left"
                        onClick={() => setSettings({ ...settings, seriesFileFormat: format })}
                      >
                        <code className="text-xs text-secondary">{format}</code>
                        <span className="text-xs text-default-500 ml-2">→ {example}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rename Series Button */}
                <div className="pt-4 border-t border-content3">
                  <Button
                    color="secondary"
                    variant="flat"
                    isLoading={loadingPreview && renameType === 'series'}
                    isDisabled={!settings.seriesDirectory}
                    onPress={() => previewRenames('series')}
                    startContent={!(loadingPreview && renameType === 'series') && <Pencil size={16} />}
                    className="w-full sm:w-auto"
                  >
                    Rename Series Only
                  </Button>
                </div>
              </CardBody>
            )}
          </Card>

          {/* Bulk Rename Action */}
          <Card className="border border-content2 bg-gradient-to-r from-primary/5 to-secondary/5">
            <CardBody className="py-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Pencil size={24} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Bulk File Rename</h3>
                    <p className="text-sm text-default-500">Rename all movies and series at once</p>
                  </div>
                </div>
                <Button
                  color="primary"
                  variant="shadow"
                  isLoading={loadingPreview && renameType === 'bulk'}
                  isDisabled={!settings.movieDirectory && !settings.seriesDirectory}
                  onPress={() => previewRenames('bulk')}
                  startContent={!(loadingPreview && renameType === 'bulk') && <Eye size={18} />}
                >
                  Preview All Renames
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Auto-Rename Section */}
          <Card className="border border-warning/30 bg-warning/5">
            <CardHeader 
              className="cursor-pointer hover:bg-warning/10 transition-colors"
              onClick={() => toggleSection('autoRename')}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <Zap size={24} className="text-warning" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">Auto-Rename</h2>
                      <Chip size="sm" color="warning" variant="flat">BETA</Chip>
                    </div>
                    <p className="text-sm text-default-500">Automatically rename files on a schedule</p>
                  </div>
                </div>
                {expandedSections.has('autoRename') ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </div>
            </CardHeader>
            {expandedSections.has('autoRename') && (
              <CardBody className="pt-0 space-y-4">
                {/* Beta Warning Banner */}
                <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/30">
                  <AlertTriangle size={20} className="text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-warning">Beta Feature Warning</p>
                    <p className="text-xs text-default-500 mt-1">
                      Auto-rename is in beta and may cause unexpected changes to your media library. 
                      We recommend backing up your files before enabling this feature. 
                      Use at your own risk.
                    </p>
                  </div>
                </div>

                {/* Auto-Rename Toggle */}
                <div className="flex items-center justify-between p-4 rounded-lg border border-content3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${settings.autoRename ? 'bg-success/20' : 'bg-content3'}`}>
                      <Zap size={18} className={settings.autoRename ? 'text-success' : 'text-default-500'} />
                    </div>
                    <div>
                      <p className="font-medium">Enable Auto-Rename</p>
                      <p className="text-xs text-default-500">
                        Automatically scan and rename files based on your naming formats
                      </p>
                    </div>
                  </div>
                  <Switch
                    isSelected={settings.autoRename}
                    onValueChange={handleAutoRenameToggle}
                    color="warning"
                  />
                </div>

                {/* Interval Setting */}
                {settings.autoRename && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Clock size={14} />
                      Scan Interval (minutes)
                    </label>
                    <Input
                      type="number"
                      min={15}
                      max={1440}
                      value={settings.autoRenameInterval.toString()}
                      onChange={(e) => setSettings({ 
                        ...settings, 
                        autoRenameInterval: Math.max(15, Math.min(1440, parseInt(e.target.value) || 60))
                      })}
                      variant="bordered"
                      description="How often to scan your directories for files to rename (minimum 15 minutes)"
                    />
                  </div>
                )}

                {/* Status indicator */}
                {settings.autoRename && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/30">
                    <Check size={16} className="text-success" />
                    <span className="text-sm text-success">
                      Auto-rename is active. Files will be scanned every {settings.autoRenameInterval} minutes.
                    </span>
                  </div>
                )}
              </CardBody>
            )}
          </Card>
        </div>
      </div>

      {/* Rename Preview Modal */}
      <Modal 
        isOpen={showRenameModal} 
        onClose={() => setShowRenameModal(false)}
        size="4xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            <Pencil size={20} />
            Preview File Renames
            {renameType !== 'bulk' && (
              <Chip size="sm" color={renameType === 'movies' ? 'primary' : 'secondary'}>
                {renameType === 'movies' ? 'Movies Only' : 'Series Only'}
              </Chip>
            )}
          </ModalHeader>
          <ModalBody>
            {renamePreview.length === 0 ? (
              <div className="text-center py-8">
                <Check size={48} className="mx-auto mb-4 text-success" />
                <p className="text-lg font-medium">All files already match your naming format!</p>
                <p className="text-default-500">No files need to be renamed.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 rounded-lg bg-primary/10">
                  <Info size={20} className="text-primary" />
                  <div>
                    <p className="font-medium">{renamePreview.length} file(s) will be renamed</p>
                    <p className="text-sm text-default-500">
                      {renamePreview.filter(r => r.type === 'movie').length} movies, {renamePreview.filter(r => r.type === 'series').length} series episodes
                    </p>
                  </div>
                </div>

                {/* Movies */}
                {renamePreview.filter(r => r.type === 'movie').length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Film size={16} className="text-primary" />
                      Movies
                    </h4>
                    {renamePreview.filter(r => r.type === 'movie').map((item, index) => (
                      <div key={`movie-${index}`} className="p-3 rounded-lg border border-content3 space-y-2">
                        <div className="text-sm">
                          <span className="text-default-500">Current:</span>
                          <p className="font-mono text-xs bg-content2 p-1 rounded mt-1">{item.currentName}</p>
                        </div>
                        <div className="text-sm">
                          <span className="text-default-500">New:</span>
                          <Input
                            size="sm"
                            variant="bordered"
                            value={item.newName}
                            classNames={{ input: "font-mono text-xs" }}
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
                  </div>
                )}

                {/* Series */}
                {renamePreview.filter(r => r.type === 'series').length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Tv size={16} className="text-secondary" />
                      Series Episodes
                    </h4>
                    {renamePreview.filter(r => r.type === 'series').map((item, index) => (
                      <div key={`series-${index}`} className="p-3 rounded-lg border border-content3 space-y-2">
                        <div className="text-sm">
                          <span className="text-default-500">Current:</span>
                          <p className="font-mono text-xs bg-content2 p-1 rounded mt-1">{item.currentName}</p>
                        </div>
                        <div className="text-sm">
                          <span className="text-default-500">New:</span>
                          <Input
                            size="sm"
                            variant="bordered"
                            value={item.newName}
                            classNames={{ input: "font-mono text-xs" }}
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
                  </div>
                )}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setShowRenameModal(false)}>
              Cancel
            </Button>
            {renamePreview.length > 0 && (
              <Button
                color="primary"
                isLoading={renaming}
                onPress={executeRenames}
                startContent={!renaming && <Check size={18} />}
              >
                Rename All Files
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Beta Warning Modal */}
      <Modal 
        isOpen={showBetaWarning} 
        onClose={() => {
          setShowBetaWarning(false);
          setPendingAutoRenameEnable(false);
        }}
      >
        <ModalContent>
          <ModalHeader className="flex items-center gap-2 text-warning">
            <AlertTriangle size={24} />
            Beta Feature Warning
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-warning/10 border border-warning/30">
                <Shield size={32} className="text-warning flex-shrink-0" />
                <p className="text-sm">
                  <strong>Important:</strong> Auto-rename is an experimental feature that may 
                  cause unexpected changes to your media library file names and structure.
                </p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Before enabling, please note:</p>
                <ul className="text-sm text-default-500 space-y-1 list-disc list-inside">
                  <li>Files will be renamed automatically based on your naming format</li>
                  <li>This action cannot be easily undone</li>
                  <li>We recommend backing up your media library first</li>
                  <li>Some media players may lose track of renamed files</li>
                  <li>Metadata files (NFO, subtitles) may become orphaned</li>
                </ul>
              </div>
              
              <p className="text-sm text-warning font-medium">
                Do you understand the risks and want to enable auto-rename?
              </p>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button 
              variant="light" 
              onPress={() => {
                setShowBetaWarning(false);
                setPendingAutoRenameEnable(false);
              }}
            >
              Cancel
            </Button>
            <Button 
              color="warning"
              onPress={confirmAutoRenameEnable}
              startContent={<Zap size={16} />}
            >
              I Understand, Enable Auto-Rename
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Info Modal */}
      <Modal isOpen={infoModal.isOpen} onClose={() => setInfoModal({ ...infoModal, isOpen: false })}>
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            {infoModal.type === 'success' && <Check size={20} className="text-success" />}
            {infoModal.type === 'error' && <X size={20} className="text-danger" />}
            {infoModal.type === 'warning' && <AlertTriangle size={20} className="text-warning" />}
            {infoModal.type === 'info' && <Info size={20} className="text-primary" />}
            {infoModal.title}
          </ModalHeader>
          <ModalBody>
            <p className="whitespace-pre-wrap">{infoModal.message}</p>
          </ModalBody>
          <ModalFooter>
            <Button color="primary" onPress={() => setInfoModal({ ...infoModal, isOpen: false })}>
              OK
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Confirm Modal */}
      <Modal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}>
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-warning" />
            {confirmModal.title}
          </ModalHeader>
          <ModalBody>
            <p className="whitespace-pre-wrap">{confirmModal.message}</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setConfirmModal({ ...confirmModal, isOpen: false })}>
              Cancel
            </Button>
            <Button color="primary" onPress={confirmModal.onConfirm}>
              Confirm
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default FileManagement;
