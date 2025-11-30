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
  Play,
  Pause,
  FolderInput,
  FolderOutput,
  ArrowRight,
  Copy,
  Move,
  Activity,
  FileVideo,
  FileCheck,
  Ban,
  CheckCircle2,
  List,
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
  // Download Watcher settings
  downloadWatcherEnabled: boolean;
  movieDownloadDirectory: string | null;
  seriesDownloadDirectory: string | null;
  movieWatcherDestination: string | null;
  seriesWatcherDestination: string | null;
  watcherInterval: number;
  watcherAutoApprove: boolean;
}

interface PendingFile {
  id: string;
  filename: string;
  sourcePath: string;
  destinationPath: string;
  type: 'movie' | 'series';
  size: number;
  detectedAt: string;
}

interface WatcherStats {
  lastRun: string | null;
  filesProcessed: number;
  moviesProcessed: number;
  seriesProcessed: number;
  errors: number;
  recentFiles: Array<{
    name: string;
    type: string;
    destination: string;
    timestamp: string;
  }>;
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
  // Download Watcher defaults
  downloadWatcherEnabled: false,
  movieDownloadDirectory: null,
  seriesDownloadDirectory: null,
  movieWatcherDestination: null,
  seriesWatcherDestination: null,
  watcherInterval: 30,
  watcherAutoApprove: false,
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
    new Set(['directories', 'downloadWatcher', 'movieNaming', 'seriesNaming', 'autoRename'])
  );
  
  // Beta warning modal state
  const [showBetaWarning, setShowBetaWarning] = useState(false);
  const [pendingAutoRenameEnable, setPendingAutoRenameEnable] = useState(false);
  
  // Download Watcher state
  const [watcherStatus, setWatcherStatus] = useState<{ isRunning: boolean; stats: WatcherStats }>({
    isRunning: false,
    stats: { lastRun: null, filesProcessed: 0, moviesProcessed: 0, seriesProcessed: 0, errors: 0, recentFiles: [] }
  });
  const [triggeringWatcher, setTriggeringWatcher] = useState(false);
  const [testingMovieDownloadDir, setTestingMovieDownloadDir] = useState(false);
  const [testingSeriesDownloadDir, setTestingSeriesDownloadDir] = useState(false);
  const [testingMovieWatcherDest, setTestingMovieWatcherDest] = useState(false);
  const [testingSeriesWatcherDest, setTestingSeriesWatcherDest] = useState(false);
  const [movieDownloadDirStatus, setMovieDownloadDirStatus] = useState<'untested' | 'success' | 'error'>('untested');
  const [seriesDownloadDirStatus, setSeriesDownloadDirStatus] = useState<'untested' | 'success' | 'error'>('untested');
  const [movieWatcherDestStatus, setMovieWatcherDestStatus] = useState<'untested' | 'success' | 'error'>('untested');
  const [seriesWatcherDestStatus, setSeriesWatcherDestStatus] = useState<'untested' | 'success' | 'error'>('untested');
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [approvingFile, setApprovingFile] = useState<string | null>(null);
  const [rejectingFile, setRejectingFile] = useState<string | null>(null);
  
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
      fetchWatcherStatus();
    }
  }, [user]);

  // Periodically refresh watcher status when enabled
  useEffect(() => {
    if (settings.downloadWatcherEnabled) {
      const interval = setInterval(fetchWatcherStatus, 10000);
      return () => clearInterval(interval);
    }
  }, [settings.downloadWatcherEnabled]);

  // Fetch pending files when watcher is enabled and manual approval is on
  useEffect(() => {
    if (settings.downloadWatcherEnabled && !settings.watcherAutoApprove) {
      fetchPendingFiles();
      const interval = setInterval(fetchPendingFiles, 5000);
      return () => clearInterval(interval);
    }
  }, [settings.downloadWatcherEnabled, settings.watcherAutoApprove]);

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

  const fetchWatcherStatus = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await axios.get(`${API_BASE_URL}/api/Settings/download-watcher/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWatcherStatus(response.data);
    } catch (error) {
      console.error("Error fetching watcher status:", error);
    }
  };

  const fetchPendingFiles = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await axios.get(`${API_BASE_URL}/api/Settings/download-watcher/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingFiles(response.data.files || []);
    } catch (error) {
      console.error("Error fetching pending files:", error);
    }
  };

  const approveFile = async (fileId: string) => {
    setApprovingFile(fileId);
    try {
      const token = localStorage.getItem("accessToken");
      await axios.post(
        `${API_BASE_URL}/api/Settings/download-watcher/approve`,
        { fileId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage({ type: 'success', text: 'File moved successfully!' });
      fetchPendingFiles();
      fetchWatcherStatus();
    } catch (error: any) {
      console.error("Error approving file:", error);
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to move file' });
    } finally {
      setApprovingFile(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const rejectFile = async (fileId: string) => {
    setRejectingFile(fileId);
    try {
      const token = localStorage.getItem("accessToken");
      await axios.post(
        `${API_BASE_URL}/api/Settings/download-watcher/reject`,
        { fileId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage({ type: 'success', text: 'File ignored' });
      fetchPendingFiles();
    } catch (error: any) {
      console.error("Error rejecting file:", error);
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to reject file' });
    } finally {
      setRejectingFile(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const approveAllFiles = async () => {
    for (const file of pendingFiles) {
      await approveFile(file.id);
    }
  };

  const triggerWatcherScan = async () => {
    setTriggeringWatcher(true);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await axios.post(
        `${API_BASE_URL}/api/Settings/download-watcher/trigger`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Download watcher scan triggered successfully!' });
        // Refresh status after scan
        await fetchWatcherStatus();
      } else {
        setMessage({ type: 'error', text: response.data.message || 'Scan failed' });
      }
    } catch (error: any) {
      console.error("Error triggering watcher scan:", error);
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to trigger scan' });
    } finally {
      setTriggeringWatcher(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const testDownloadDirectory = async (type: 'movie' | 'series') => {
    const directory = type === 'movie' ? settings.movieDownloadDirectory : settings.seriesDownloadDirectory;
    
    if (!directory) {
      setInfoModal({
        isOpen: true,
        title: 'No Directory',
        message: `Please enter a ${type} download directory first.`,
        type: 'warning',
      });
      return;
    }

    if (type === 'movie') {
      setTestingMovieDownloadDir(true);
      setMovieDownloadDirStatus('untested');
    } else {
      setTestingSeriesDownloadDir(true);
      setSeriesDownloadDirStatus('untested');
    }

    try {
      const token = localStorage.getItem("accessToken");
      const response = await axios.post(
        `${API_BASE_URL}/api/Settings/test-directory`,
        { directory },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.accessible) {
        if (type === 'movie') {
          setMovieDownloadDirStatus('success');
        } else {
          setSeriesDownloadDirStatus('success');
        }
        setMessage({ type: 'success', text: `✓ ${type === 'movie' ? 'Movie' : 'Series'} download directory is accessible` });
      }
    } catch (error: any) {
      console.error("Error testing directory:", error);
      if (type === 'movie') {
        setMovieDownloadDirStatus('error');
      } else {
        setSeriesDownloadDirStatus('error');
      }
      const errorMsg = error.response?.data?.error || `Failed to access ${type} download directory`;
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      if (type === 'movie') {
        setTestingMovieDownloadDir(false);
      } else {
        setTestingSeriesDownloadDir(false);
      }
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const testWatcherDestination = async (type: 'movie' | 'series') => {
    const directory = type === 'movie' ? settings.movieWatcherDestination : settings.seriesWatcherDestination;
    
    if (!directory) {
      setInfoModal({
        isOpen: true,
        title: 'No Directory',
        message: `Please enter a ${type} media folder first.`,
        type: 'warning',
      });
      return;
    }

    if (type === 'movie') {
      setTestingMovieWatcherDest(true);
      setMovieWatcherDestStatus('untested');
    } else {
      setTestingSeriesWatcherDest(true);
      setSeriesWatcherDestStatus('untested');
    }

    try {
      const token = localStorage.getItem("accessToken");
      const response = await axios.post(
        `${API_BASE_URL}/api/Settings/test-directory`,
        { directory },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.accessible) {
        if (type === 'movie') {
          setMovieWatcherDestStatus('success');
        } else {
          setSeriesWatcherDestStatus('success');
        }
        setMessage({ type: 'success', text: `✓ ${type === 'movie' ? 'Movie' : 'Series'} media folder is accessible` });
      }
    } catch (error: any) {
      console.error("Error testing directory:", error);
      if (type === 'movie') {
        setMovieWatcherDestStatus('error');
      } else {
        setSeriesWatcherDestStatus('error');
      }
      const errorMsg = error.response?.data?.error || `Failed to access ${type} media folder`;
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      if (type === 'movie') {
        setTestingMovieWatcherDest(false);
      } else {
        setTestingSeriesWatcherDest(false);
      }
      setTimeout(() => setMessage(null), 3000);
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

          {/* Download Watcher Section */}
          <Card className="border border-cyan-500/30 bg-gradient-to-r from-cyan-500/5 to-blue-500/5">
            <CardHeader 
              className="cursor-pointer hover:bg-cyan-500/10 transition-colors"
              onClick={() => toggleSection('downloadWatcher')}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <FolderInput size={24} className="text-cyan-500" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">Download Watcher</h2>
                      <Chip size="sm" color="primary" variant="flat">AUTO-MOVE</Chip>
                    </div>
                    <p className="text-sm text-default-500">Move downloads from category folders to your media library</p>
                  </div>
                </div>
                {expandedSections.has('downloadWatcher') ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </div>
            </CardHeader>
            {expandedSections.has('downloadWatcher') && (
              <CardBody className="pt-0 space-y-6">
                {/* Simple explanation */}
                <div className="flex items-start gap-3 p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <Info size={20} className="text-cyan-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-cyan-500">How it works</p>
                    <p className="text-xs text-default-500 mt-1">
                      Set your download client to save movies and TV shows to separate folders. 
                      The watcher will automatically move completed files to your media library.
                    </p>
                  </div>
                </div>

                {/* Movies Row */}
                <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Film size={20} className="text-primary" />
                    <h3 className="font-semibold text-primary">Movies</h3>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {/* Source */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Download size={14} className="text-default-400" />
                        <span className="text-xs font-medium text-default-500">Download Folder</span>
                        {getDirStatusIcon(movieDownloadDirStatus)}
                      </div>
                      <DirectoryPicker
                        label=""
                        value={settings.movieDownloadDirectory}
                        onChange={(path) => {
                          setSettings({ ...settings, movieDownloadDirectory: path });
                          setMovieDownloadDirStatus('untested');
                        }}
                        placeholder="/downloads/movies"
                      />
                      <Button
                        size="sm"
                        variant="flat"
                        color="default"
                        isLoading={testingMovieDownloadDir}
                        isDisabled={!settings.movieDownloadDirectory}
                        onPress={() => testDownloadDirectory('movie')}
                        startContent={!testingMovieDownloadDir && <RefreshCw size={12} />}
                      >
                        Test
                      </Button>
                    </div>

                    {/* Arrow */}
                    <ArrowRight size={24} className="text-primary flex-shrink-0" />

                    {/* Destination */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <FolderOutput size={14} className="text-default-400" />
                        <span className="text-xs font-medium text-default-500">Media Folder</span>
                        {getDirStatusIcon(movieWatcherDestStatus)}
                      </div>
                      <DirectoryPicker
                        label=""
                        value={settings.movieWatcherDestination}
                        onChange={(path) => {
                          setSettings({ ...settings, movieWatcherDestination: path });
                          setMovieWatcherDestStatus('untested');
                        }}
                        placeholder="/media/movies"
                      />
                      <Button
                        size="sm"
                        variant="flat"
                        color="default"
                        isLoading={testingMovieWatcherDest}
                        isDisabled={!settings.movieWatcherDestination}
                        onPress={() => testWatcherDestination('movie')}
                        startContent={!testingMovieWatcherDest && <RefreshCw size={12} />}
                      >
                        Test
                      </Button>
                    </div>
                  </div>
                </div>

                {/* TV Shows Row */}
                <div className="p-4 rounded-xl border border-secondary/30 bg-secondary/5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Tv size={20} className="text-secondary" />
                    <h3 className="font-semibold text-secondary">TV Shows</h3>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {/* Source */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Download size={14} className="text-default-400" />
                        <span className="text-xs font-medium text-default-500">Download Folder</span>
                        {getDirStatusIcon(seriesDownloadDirStatus)}
                      </div>
                      <DirectoryPicker
                        label=""
                        value={settings.seriesDownloadDirectory}
                        onChange={(path) => {
                          setSettings({ ...settings, seriesDownloadDirectory: path });
                          setSeriesDownloadDirStatus('untested');
                        }}
                        placeholder="/downloads/tv"
                      />
                      <Button
                        size="sm"
                        variant="flat"
                        color="default"
                        isLoading={testingSeriesDownloadDir}
                        isDisabled={!settings.seriesDownloadDirectory}
                        onPress={() => testDownloadDirectory('series')}
                        startContent={!testingSeriesDownloadDir && <RefreshCw size={12} />}
                      >
                        Test
                      </Button>
                    </div>

                    {/* Arrow */}
                    <ArrowRight size={24} className="text-secondary flex-shrink-0" />

                    {/* Destination */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <FolderOutput size={14} className="text-default-400" />
                        <span className="text-xs font-medium text-default-500">Media Folder</span>
                        {getDirStatusIcon(seriesWatcherDestStatus)}
                      </div>
                      <DirectoryPicker
                        label=""
                        value={settings.seriesWatcherDestination}
                        onChange={(path) => {
                          setSettings({ ...settings, seriesWatcherDestination: path });
                          setSeriesWatcherDestStatus('untested');
                        }}
                        placeholder="/media/tv"
                      />
                      <Button
                        size="sm"
                        variant="flat"
                        color="default"
                        isLoading={testingSeriesWatcherDest}
                        isDisabled={!settings.seriesWatcherDestination}
                        onPress={() => testWatcherDestination('series')}
                        startContent={!testingSeriesWatcherDest && <RefreshCw size={12} />}
                      >
                        Test
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Enable/Disable Toggle */}
                <div className="flex items-center justify-between p-4 rounded-lg border border-cyan-500/30 bg-cyan-500/5">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${settings.downloadWatcherEnabled ? 'bg-success/20' : 'bg-content3'}`}>
                      {settings.downloadWatcherEnabled ? <Play size={18} className="text-success" /> : <Pause size={18} className="text-default-500" />}
                    </div>
                    <div>
                      <p className="font-medium">Enable Download Watcher</p>
                      <p className="text-xs text-default-500">
                        {settings.downloadWatcherEnabled 
                          ? `Scanning every ${settings.watcherInterval} seconds` 
                          : 'Enable to start watching downloads'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    isSelected={settings.downloadWatcherEnabled}
                    onValueChange={(checked) => setSettings({ ...settings, downloadWatcherEnabled: checked })}
                    color="success"
                  />
                </div>

                {/* Auto-Approve Toggle */}
                {settings.downloadWatcherEnabled && (
                  <div className="flex items-center justify-between p-4 rounded-lg border border-content3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${settings.watcherAutoApprove ? 'bg-primary/20' : 'bg-warning/20'}`}>
                        {settings.watcherAutoApprove ? <Zap size={18} className="text-primary" /> : <FileCheck size={18} className="text-warning" />}
                      </div>
                      <div>
                        <p className="font-medium">
                          {settings.watcherAutoApprove ? 'Auto-Move Enabled' : 'Manual Approval Required'}
                        </p>
                        <p className="text-xs text-default-500">
                          {settings.watcherAutoApprove 
                            ? 'Files are moved automatically when detected' 
                            : 'You must approve each file before it is moved'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      isSelected={settings.watcherAutoApprove}
                      onValueChange={(checked) => setSettings({ ...settings, watcherAutoApprove: checked })}
                      color="primary"
                    />
                  </div>
                )}

                {/* Status when enabled */}
                {settings.downloadWatcherEnabled && (
                  <div className="space-y-3">
                    <div className={`flex items-center justify-between p-3 rounded-lg ${
                      watcherStatus.isRunning 
                        ? 'bg-success/10 border border-success/30' 
                        : 'bg-warning/10 border border-warning/30'
                    }`}>
                      <div className="flex items-center gap-2">
                        {watcherStatus.isRunning ? (
                          <>
                            <Activity size={16} className="text-success animate-pulse" />
                            <span className="text-sm text-success">Watching for new downloads...</span>
                          </>
                        ) : (
                          <>
                            <Pause size={16} className="text-warning" />
                            <span className="text-sm text-warning">Save settings to start</span>
                          </>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="flat"
                        color={watcherStatus.isRunning ? "success" : "warning"}
                        isLoading={triggeringWatcher}
                        onPress={triggerWatcherScan}
                        startContent={!triggeringWatcher && <RefreshCw size={14} />}
                      >
                        Scan Now
                      </Button>
                    </div>

                    {/* Pending Files Queue (when manual approval is enabled) */}
                    {!settings.watcherAutoApprove && pendingFiles.length > 0 && (
                      <div className="space-y-3 p-4 rounded-lg border border-warning/30 bg-warning/5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <List size={18} className="text-warning" />
                            <span className="font-medium text-warning">Pending Approval ({pendingFiles.length})</span>
                          </div>
                          <Button
                            size="sm"
                            color="success"
                            variant="flat"
                            onPress={approveAllFiles}
                            startContent={<CheckCircle2 size={14} />}
                          >
                            Approve All
                          </Button>
                        </div>
                        
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {pendingFiles.map((file) => (
                            <div 
                              key={file.id} 
                              className="flex items-center justify-between p-3 rounded-lg bg-content2 border border-content3"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {file.type === 'movie' ? (
                                  <Film size={18} className="text-primary flex-shrink-0" />
                                ) : (
                                  <Tv size={18} className="text-secondary flex-shrink-0" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium truncate">{file.filename}</p>
                                  <p className="text-xs text-default-400 truncate">
                                    → {file.destinationPath}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2 flex-shrink-0 ml-2">
                                <Button
                                  size="sm"
                                  color="success"
                                  variant="flat"
                                  isIconOnly
                                  isLoading={approvingFile === file.id}
                                  onPress={() => approveFile(file.id)}
                                >
                                  <Check size={16} />
                                </Button>
                                <Button
                                  size="sm"
                                  color="danger"
                                  variant="flat"
                                  isIconOnly
                                  isLoading={rejectingFile === file.id}
                                  onPress={() => rejectFile(file.id)}
                                >
                                  <Ban size={16} />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No pending files message */}
                    {!settings.watcherAutoApprove && pendingFiles.length === 0 && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-content2 border border-content3">
                        <FileCheck size={16} className="text-default-400" />
                        <span className="text-sm text-default-500">No files pending approval</span>
                      </div>
                    )}

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg bg-content2 text-center">
                        <p className="text-xl font-bold text-cyan-500">{watcherStatus.stats.filesProcessed}</p>
                        <p className="text-xs text-default-500">Total</p>
                      </div>
                      <div className="p-3 rounded-lg bg-content2 text-center">
                        <p className="text-xl font-bold text-primary">{watcherStatus.stats.moviesProcessed}</p>
                        <p className="text-xs text-default-500">Movies</p>
                      </div>
                      <div className="p-3 rounded-lg bg-content2 text-center">
                        <p className="text-xl font-bold text-secondary">{watcherStatus.stats.seriesProcessed}</p>
                        <p className="text-xs text-default-500">TV Shows</p>
                      </div>
                    </div>
                  </div>
                )}
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
