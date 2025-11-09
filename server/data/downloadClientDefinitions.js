/**
 * Download Client Definitions
 * All supported download clients from Prowlarr
 */

const downloadClientDefinitions = {
  // Usenet Clients
  usenet: [
    {
      implementation: "DownloadStation",
      name: "Download Station",
      protocol: "usenet",
      description: "Synology Download Station",
      fields: [
        { name: "host", label: "Host", type: "textbox", defaultValue: "localhost" },
        { name: "port", label: "Port", type: "number", defaultValue: 5000 },
        { name: "useSsl", label: "Use SSL", type: "checkbox", defaultValue: false },
        { name: "username", label: "Username", type: "textbox" },
        { name: "password", label: "Password", type: "password" },
        { name: "category", label: "Default Category", type: "textbox", defaultValue: "prowlarr" },
        { name: "priority", label: "Priority", type: "select", options: [1, 2, 3, 4, 5], defaultValue: 1 },
        { name: "addPaused", label: "Add Paused", type: "checkbox", defaultValue: false },
      ],
    },
    {
      implementation: "Nzbget",
      name: "NZBGet",
      protocol: "usenet",
      description: "NZBGet is a binary downloader for Usenet",
      fields: [
        { name: "host", label: "Host", type: "textbox", defaultValue: "localhost" },
        { name: "port", label: "Port", type: "number", defaultValue: 6789 },
        { name: "useSsl", label: "Use SSL", type: "checkbox", defaultValue: false },
        { name: "username", label: "Username", type: "textbox", defaultValue: "nzbget" },
        { name: "password", label: "Password", type: "password" },
        { name: "category", label: "Default Category", type: "textbox", defaultValue: "prowlarr" },
        { name: "priority", label: "Priority", type: "select", options: [-100, -50, 0, 50, 100], defaultValue: 0 },
        { name: "addPaused", label: "Add Paused", type: "checkbox", defaultValue: false },
      ],
    },
    {
      implementation: "NzbVortex",
      name: "NZBVortex",
      protocol: "usenet",
      description: "NZBVortex is a Usenet downloader for macOS",
      fields: [
        { name: "host", label: "Host", type: "textbox", defaultValue: "localhost" },
        { name: "port", label: "Port", type: "number", defaultValue: 4321 },
        { name: "useSsl", label: "Use SSL", type: "checkbox", defaultValue: false },
        { name: "apiKey", label: "API Key", type: "password" },
        { name: "category", label: "Default Category", type: "textbox", defaultValue: "prowlarr" },
        { name: "priority", label: "Priority", type: "select", options: ["Normal", "High"], defaultValue: "Normal" },
        { name: "addPaused", label: "Add Paused", type: "checkbox", defaultValue: false },
      ],
    },
    {
      implementation: "Pneumatic",
      name: "Pneumatic",
      protocol: "usenet",
      description: "Pneumatic is a NZB downloader for macOS",
      fields: [
        { name: "nzbFolder", label: "NZB Folder", type: "textbox" },
        { name: "watchFolder", label: "Watch Folder", type: "textbox" },
      ],
    },
    {
      implementation: "Sabnzbd",
      name: "SABnzbd",
      protocol: "usenet",
      description: "SABnzbd is a binary newsreader",
      fields: [
        { name: "host", label: "Host", type: "textbox", defaultValue: "localhost" },
        { name: "port", label: "Port", type: "number", defaultValue: 8080 },
        { name: "useSsl", label: "Use SSL", type: "checkbox", defaultValue: false },
        { name: "apiKey", label: "API Key", type: "password" },
        { name: "urlBase", label: "URL Base", type: "textbox", advanced: true },
        { name: "category", label: "Default Category", type: "textbox", defaultValue: "prowlarr" },
        { name: "priority", label: "Priority", type: "select", options: ["Default", "Paused", "Low", "Normal", "High", "Force"], defaultValue: "Default" },
        { name: "addPaused", label: "Add Paused", type: "checkbox", defaultValue: false },
      ],
    },
    {
      implementation: "UsenetBlackhole",
      name: "Usenet Blackhole",
      protocol: "usenet",
      description: "Download NZBs to a folder for external processing",
      fields: [
        { name: "nzbFolder", label: "NZB Folder", type: "textbox" },
        { name: "watchFolder", label: "Watch Folder", type: "textbox" },
      ],
    },
  ],

  // Torrent Clients
  torrent: [
    {
      implementation: "Aria2",
      name: "Aria2",
      protocol: "torrent",
      description: "Aria2 is a lightweight multi-protocol download utility",
      fields: [
        { name: "host", label: "Host", type: "textbox", defaultValue: "localhost" },
        { name: "port", label: "Port", type: "number", defaultValue: 6800 },
        { name: "useSsl", label: "Use SSL", type: "checkbox", defaultValue: false },
        { name: "rpcPath", label: "RPC Path", type: "textbox", defaultValue: "/jsonrpc" },
        { name: "secretToken", label: "Secret Token", type: "password" },
        { name: "category", label: "Default Category", type: "textbox", defaultValue: "prowlarr" },
        { name: "priority", label: "Priority", type: "select", options: [1, 2, 3, 4, 5], defaultValue: 1 },
        { name: "addPaused", label: "Add Paused", type: "checkbox", defaultValue: false },
      ],
    },
    {
      implementation: "Deluge",
      name: "Deluge",
      protocol: "torrent",
      description: "Deluge is a lightweight, cross-platform BitTorrent client",
      fields: [
        { name: "host", label: "Host", type: "textbox", defaultValue: "localhost" },
        { name: "port", label: "Port", type: "number", defaultValue: 8112 },
        { name: "useSsl", label: "Use SSL", type: "checkbox", defaultValue: false },
        { name: "urlBase", label: "URL Base", type: "textbox", advanced: true },
        { name: "password", label: "Password", type: "password", defaultValue: "deluge" },
        { name: "category", label: "Default Category", type: "textbox", defaultValue: "prowlarr" },
        { name: "priority", label: "Priority", type: "select", options: ["Last", "First"], defaultValue: "Last" },
        { name: "addPaused", label: "Add Paused", type: "checkbox", defaultValue: false },
      ],
    },
    {
      implementation: "DownloadStation",
      name: "Download Station",
      protocol: "torrent",
      description: "Synology Download Station",
      fields: [
        { name: "host", label: "Host", type: "textbox", defaultValue: "localhost" },
        { name: "port", label: "Port", type: "number", defaultValue: 5000 },
        { name: "useSsl", label: "Use SSL", type: "checkbox", defaultValue: false },
        { name: "username", label: "Username", type: "textbox" },
        { name: "password", label: "Password", type: "password" },
        { name: "category", label: "Default Category", type: "textbox", defaultValue: "prowlarr" },
        { name: "priority", label: "Priority", type: "select", options: [1, 2, 3, 4, 5], defaultValue: 1 },
        { name: "addPaused", label: "Add Paused", type: "checkbox", defaultValue: false },
      ],
    },
    {
      implementation: "Flood",
      name: "Flood",
      protocol: "torrent",
      description: "Flood is a modern web UI for rTorrent, Transmission and qBittorrent",
      fields: [
        { name: "host", label: "Host", type: "textbox", defaultValue: "localhost" },
        { name: "port", label: "Port", type: "number", defaultValue: 3000 },
        { name: "useSsl", label: "Use SSL", type: "checkbox", defaultValue: false },
        { name: "username", label: "Username", type: "textbox" },
        { name: "password", label: "Password", type: "password" },
        { name: "category", label: "Default Category", type: "textbox", defaultValue: "prowlarr" },
        { name: "priority", label: "Priority", type: "select", options: ["Last", "First"], defaultValue: "Last" },
        { name: "addPaused", label: "Add Paused", type: "checkbox", defaultValue: false },
      ],
    },
    {
      implementation: "FreeboxDownload",
      name: "Freebox Download",
      protocol: "torrent",
      description: "Freebox Download client",
      fields: [
        { name: "host", label: "Host", type: "textbox", defaultValue: "mafreebox.freebox.fr" },
        { name: "port", label: "Port", type: "number", defaultValue: 443 },
        { name: "appId", label: "App ID", type: "textbox" },
        { name: "appToken", label: "App Token", type: "password" },
        { name: "category", label: "Default Category", type: "textbox", defaultValue: "prowlarr" },
        { name: "priority", label: "Priority", type: "select", options: [1, 2, 3, 4, 5], defaultValue: 1 },
        { name: "addPaused", label: "Add Paused", type: "checkbox", defaultValue: false },
      ],
    },
    {
      implementation: "Hadouken",
      name: "Hadouken",
      protocol: "torrent",
      description: "Hadouken is a C# based torrent client",
      fields: [
        { name: "host", label: "Host", type: "textbox", defaultValue: "localhost" },
        { name: "port", label: "Port", type: "number", defaultValue: 7070 },
        { name: "useSsl", label: "Use SSL", type: "checkbox", defaultValue: false },
        { name: "apiKey", label: "API Key", type: "password" },
        { name: "category", label: "Default Category", type: "textbox", defaultValue: "prowlarr" },
        { name: "priority", label: "Priority", type: "select", options: [1, 2, 3, 4, 5], defaultValue: 1 },
        { name: "addPaused", label: "Add Paused", type: "checkbox", defaultValue: false },
      ],
    },
    {
      implementation: "QBittorrent",
      name: "qBittorrent",
      protocol: "torrent",
      description: "qBittorrent is a cross-platform BitTorrent client",
      fields: [
        { name: "host", label: "Host", type: "textbox", defaultValue: "localhost" },
        { name: "port", label: "Port", type: "number", defaultValue: 8080 },
        { name: "useSsl", label: "Use SSL", type: "checkbox", defaultValue: false },
        { name: "username", label: "Username", type: "textbox", defaultValue: "admin" },
        { name: "password", label: "Password", type: "password" },
        { name: "category", label: "Default Category", type: "textbox", defaultValue: "prowlarr" },
        { name: "priority", label: "Priority", type: "select", options: ["Last", "First"], defaultValue: "Last" },
        { name: "addPaused", label: "Add Paused", type: "checkbox", defaultValue: false },
      ],
    },
    {
      implementation: "RTorrent",
      name: "rTorrent",
      protocol: "torrent",
      description: "rTorrent is a command-line BitTorrent client",
      fields: [
        { name: "host", label: "Host", type: "textbox", defaultValue: "localhost" },
        { name: "port", label: "Port", type: "number", defaultValue: 5000 },
        { name: "useSsl", label: "Use SSL", type: "checkbox", defaultValue: false },
        { name: "urlBase", label: "URL Base", type: "textbox", defaultValue: "/RPC2", advanced: true },
        { name: "username", label: "Username", type: "textbox" },
        { name: "password", label: "Password", type: "password" },
        { name: "category", label: "Default Category", type: "textbox", defaultValue: "prowlarr" },
        { name: "priority", label: "Priority", type: "select", options: [0, 1, 2, 3], defaultValue: 0 },
        { name: "addPaused", label: "Add Paused", type: "checkbox", defaultValue: false },
      ],
    },
    {
      implementation: "TorrentBlackhole",
      name: "Torrent Blackhole",
      protocol: "torrent",
      description: "Download torrents to a folder for external processing",
      fields: [
        { name: "torrentFolder", label: "Torrent Folder", type: "textbox" },
        { name: "watchFolder", label: "Watch Folder", type: "textbox" },
      ],
    },
    {
      implementation: "Transmission",
      name: "Transmission",
      protocol: "torrent",
      description: "Transmission is a BitTorrent client",
      fields: [
        { name: "host", label: "Host", type: "textbox", defaultValue: "localhost" },
        { name: "port", label: "Port", type: "number", defaultValue: 9091 },
        { name: "useSsl", label: "Use SSL", type: "checkbox", defaultValue: false },
        { name: "urlBase", label: "URL Base", type: "textbox", advanced: true },
        { name: "username", label: "Username", type: "textbox" },
        { name: "password", label: "Password", type: "password" },
        { name: "category", label: "Default Category", type: "textbox", defaultValue: "prowlarr" },
        { name: "priority", label: "Priority", type: "select", options: [1, 2, 3, 4, 5], defaultValue: 1 },
        { name: "addPaused", label: "Add Paused", type: "checkbox", defaultValue: false },
      ],
    },
    {
      implementation: "UTorrent",
      name: "uTorrent",
      protocol: "torrent",
      description: "uTorrent is a BitTorrent client",
      fields: [
        { name: "host", label: "Host", type: "textbox", defaultValue: "localhost" },
        { name: "port", label: "Port", type: "number", defaultValue: 8080 },
        { name: "useSsl", label: "Use SSL", type: "checkbox", defaultValue: false },
        { name: "username", label: "Username", type: "textbox", defaultValue: "admin" },
        { name: "password", label: "Password", type: "password" },
        { name: "category", label: "Default Category", type: "textbox", defaultValue: "prowlarr" },
        { name: "priority", label: "Priority", type: "select", options: [0, 1, 2, 3, 4], defaultValue: 0 },
        { name: "addPaused", label: "Add Paused", type: "checkbox", defaultValue: false },
      ],
    },
    {
      implementation: "Vuze",
      name: "Vuze",
      protocol: "torrent",
      description: "Vuze is a BitTorrent client",
      fields: [
        { name: "host", label: "Host", type: "textbox", defaultValue: "localhost" },
        { name: "port", label: "Port", type: "number", defaultValue: 6881 },
        { name: "useSsl", label: "Use SSL", type: "checkbox", defaultValue: false },
        { name: "username", label: "Username", type: "textbox" },
        { name: "password", label: "Password", type: "password" },
        { name: "category", label: "Default Category", type: "textbox", defaultValue: "prowlarr" },
        { name: "priority", label: "Priority", type: "select", options: [1, 2, 3, 4, 5], defaultValue: 1 },
        { name: "addPaused", label: "Add Paused", type: "checkbox", defaultValue: false },
      ],
    },
  ],
};

/**
 * Get all download client definitions
 */
function getAllDownloadClients() {
  return [
    ...downloadClientDefinitions.usenet,
    ...downloadClientDefinitions.torrent,
  ];
}

/**
 * Get download clients by protocol
 */
function getDownloadClientsByProtocol(protocol) {
  return downloadClientDefinitions[protocol] || [];
}

/**
 * Get download client definition by implementation
 */
function getDownloadClientDefinition(implementation) {
  const all = getAllDownloadClients();
  return all.find((client) => client.implementation === implementation);
}

module.exports = {
  getAllDownloadClients,
  getDownloadClientsByProtocol,
  getDownloadClientDefinition,
  downloadClientDefinitions,
};
