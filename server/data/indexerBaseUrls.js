// Base URLs for each indexer
// This data can be populated from Prowlarr's indexer definitions
// Prowlarr stores these in Cardigann YAML files in their Indexers repository:
// https://github.com/Prowlarr/Indexers

const indexerBaseUrls = {
  "The Pirate Bay": [
    "https://thepiratebay.org/",
    "https://thepiratebay10.xyz/",
    "https://thepiratebay.unblockninja.com/",
    "https://thepiratebay.ninjaproxy1.com/",
    "https://tpb.proxyninja.org/",
    "https://thepiratebay.proxyninja.net/",
    "https://thepiratebay.torrentbay.st/",
    "https://tpb.skynetcloud.site/",
    "https://piratehaven.xyz/",
    "https://mirrorbay.top/",
    "https://thepiratebay0.org/",
    "https://pirateproxylive.org/",
    "https://thehiddenbay.com/",
    "https://thepiratebay.zone/",
    "https://tpb.party/",
    "https://piratebayproxy.live/",
    "https://piratebay.live/",
    "https://piratebay.party/",
    "https://thepiratebaye.org/",
    "https://thepiratebay.cloud/",
    "https://tpb-proxy.xyz/",
    "https://tpb.re/",
    "https://tpirbay.site/",
    "https://tpirbay.top/",
    "https://tpirbay.xyz/",
  ],
  "1337x": [
    "https://1337x.to/",
    "https://1337x.st/",
    "https://www.1377x.to/",
    "https://x1337x.ws/",
    "https://x1337x.eu/",
    "https://x1337x.se/",
  ],
  "BitSearch": [
    "https://bitsearch.to/",
  ],
  "LimeTorrents": [
    "https://www.limetorrents.lol/",
    "https://www.limetorrents.info/",
  ],
  "abNZB": [
    "https://abnzb.com/",
  ],
  "NZBgeek": [
    "https://api.nzbgeek.info/",
    "https://nzbgeek.info/",
  ],
  "0day.kiev": [
    "https://0day.kiev.ua/",
  ],
  "0Magnet": [
    "https://0magnet.com/",
  ],
};

// Get base URLs for an indexer by name
function getBaseUrlsForIndexer(indexerName) {
  return indexerBaseUrls[indexerName] || [];
}

// Get all base URLs data
function getAllBaseUrls() {
  return indexerBaseUrls;
}

module.exports = {
  getBaseUrlsForIndexer,
  getAllBaseUrls,
  indexerBaseUrls,
};

