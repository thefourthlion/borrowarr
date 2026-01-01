"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Spinner } from "@nextui-org/spinner";
import { ChevronDown, ChevronRight, Settings as SettingsIcon } from "lucide-react";
import "../../../styles/System.scss";

interface Settings {
  id?: number;
  minQuality: string;
  maxQuality: string;
  autoDownload: boolean;
  checkInterval: number;
}

const System = () => {
  const [settings, setSettings] = useState<Settings>({
    minQuality: "720p",
    maxQuality: "1080p",
    autoDownload: true,
    checkInterval: 60,
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['quality', 'automation']));

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
      // Only send the fields that are editable on this page
      const updateData = {
        minQuality: settings.minQuality,
        maxQuality: settings.maxQuality,
        autoDownload: settings.autoDownload,
        checkInterval: settings.checkInterval,
      };
      
      const response = await axios.put(
        "http://localhost:3013/api/Settings",
        updateData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      // Update local state with the full response
      setSettings(response.data);
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      
      // Auto-clear success message
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error("Error saving settings:", error);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Failed to save settings';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-secondary/20 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-secondary/10">
                <SettingsIcon className="w-6 h-6 text-secondary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-secondary to-secondary-600 bg-clip-text text-transparent truncate">
                  System Settings
                </h1>
                <p className="text-xs sm:text-sm text-foreground/60 mt-1">
                  Configure quality and automation settings.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Loading state */}
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-secondary/20 bg-content1 shadow-lg">
            <Spinner size="lg" color="secondary" />
            <p className="mt-4 text-sm sm:text-base text-foreground/60">
              Loading system settings...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-secondary/20 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-secondary/10">
              <SettingsIcon className="w-6 h-6 text-secondary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-secondary to-secondary-600 bg-clip-text text-transparent truncate">
                System Settings
              </h1>
              <p className="text-xs sm:text-sm text-foreground/60 mt-1">
                Configure quality limits and automation behaviour.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <div className="System">
          <div className="container">
            {message && (
              <div className={`message message-${message.type}`}>
                {message.text}
              </div>
            )}

            <div className="content-body">
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
        </div>
      </div>
    </div>
  );
};

export default System;
