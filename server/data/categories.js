// Newznab/Torznab category definitions
// These match Prowlarr's category system

const categories = [
  // Console (1000)
  { id: 1000, name: "Console", parentId: null, type: "Console" },
  { id: 1010, name: "Console/NDS", parentId: 1000, type: "Console" },
  { id: 1020, name: "Console/PSP", parentId: 1000, type: "Console" },
  { id: 1030, name: "Console/Wii", parentId: 1000, type: "Console" },
  { id: 1040, name: "Console/XBox", parentId: 1000, type: "Console" },
  { id: 1050, name: "Console/XBox 360", parentId: 1000, type: "Console" },
  { id: 1060, name: "Console/Wiiware", parentId: 1000, type: "Console" },
  { id: 1070, name: "Console/XBox 360 DLC", parentId: 1000, type: "Console" },
  { id: 1080, name: "Console/PS3", parentId: 1000, type: "Console" },
  { id: 1090, name: "Console/Other", parentId: 1000, type: "Console" },
  { id: 1110, name: "Console/3DS", parentId: 1000, type: "Console" },
  { id: 1120, name: "Console/PS Vita", parentId: 1000, type: "Console" },
  { id: 1130, name: "Console/WiiU", parentId: 1000, type: "Console" },
  { id: 1140, name: "Console/XBox One", parentId: 1000, type: "Console" },
  { id: 1180, name: "Console/PS4", parentId: 1000, type: "Console" },
  
  // Movies (2000)
  { id: 2000, name: "Movies", parentId: null, type: "Movies" },
  { id: 2010, name: "Movies/Foreign", parentId: 2000, type: "Movies" },
  { id: 2020, name: "Movies/Other", parentId: 2000, type: "Movies" },
  { id: 2030, name: "Movies/SD", parentId: 2000, type: "Movies" },
  { id: 2040, name: "Movies/HD", parentId: 2000, type: "Movies" },
  { id: 2045, name: "Movies/UHD", parentId: 2000, type: "Movies" },
  { id: 2050, name: "Movies/BluRay", parentId: 2000, type: "Movies" },
  { id: 2060, name: "Movies/3D", parentId: 2000, type: "Movies" },
  { id: 2070, name: "Movies/DVD", parentId: 2000, type: "Movies" },
  { id: 2080, name: "Movies/WEB-DL", parentId: 2000, type: "Movies" },
  { id: 2090, name: "Movies/x265", parentId: 2000, type: "Movies" },
  
  // Audio (3000)
  { id: 3000, name: "Audio", parentId: null, type: "Audio" },
  { id: 3010, name: "Audio/MP3", parentId: 3000, type: "Audio" },
  { id: 3020, name: "Audio/Video", parentId: 3000, type: "Audio" },
  { id: 3030, name: "Audio/Audiobook", parentId: 3000, type: "Audio" },
  { id: 3040, name: "Audio/Lossless", parentId: 3000, type: "Audio" },
  { id: 3050, name: "Audio/Other", parentId: 3000, type: "Audio" },
  { id: 3060, name: "Audio/Foreign", parentId: 3000, type: "Audio" },
  
  // PC (4000)
  { id: 4000, name: "PC", parentId: null, type: "PC" },
  { id: 4010, name: "PC/0day", parentId: 4000, type: "PC" },
  { id: 4020, name: "PC/ISO", parentId: 4000, type: "PC" },
  { id: 4030, name: "PC/Mac", parentId: 4000, type: "PC" },
  { id: 4040, name: "PC/Mobile-Other", parentId: 4000, type: "PC" },
  { id: 4050, name: "PC/Games", parentId: 4000, type: "PC" },
  { id: 4060, name: "PC/Mobile-iOS", parentId: 4000, type: "PC" },
  { id: 4070, name: "PC/Mobile-Android", parentId: 4000, type: "PC" },
  
  // TV (5000)
  { id: 5000, name: "TV", parentId: null, type: "TV" },
  { id: 5010, name: "TV/WEB-DL", parentId: 5000, type: "TV" },
  { id: 5020, name: "TV/Foreign", parentId: 5000, type: "TV" },
  { id: 5030, name: "TV/SD", parentId: 5000, type: "TV" },
  { id: 5040, name: "TV/HD", parentId: 5000, type: "TV" },
  { id: 5045, name: "TV/UHD", parentId: 5000, type: "TV" },
  { id: 5050, name: "TV/Other", parentId: 5000, type: "TV" },
  { id: 5060, name: "TV/Sport", parentId: 5000, type: "TV" },
  { id: 5070, name: "TV/Anime", parentId: 5000, type: "TV" },
  { id: 5080, name: "TV/Documentary", parentId: 5000, type: "TV" },
  { id: 5090, name: "TV/x265", parentId: 5000, type: "TV" },
  
  // XXX (6000)
  { id: 6000, name: "XXX", parentId: null, type: "XXX" },
  { id: 6010, name: "XXX/DVD", parentId: 6000, type: "XXX" },
  { id: 6020, name: "XXX/WMV", parentId: 6000, type: "XXX" },
  { id: 6030, name: "XXX/XviD", parentId: 6000, type: "XXX" },
  { id: 6040, name: "XXX/x264", parentId: 6000, type: "XXX" },
  { id: 6045, name: "XXX/UHD", parentId: 6000, type: "XXX" },
  { id: 6050, name: "XXX/Pack", parentId: 6000, type: "XXX" },
  { id: 6060, name: "XXX/ImageSet", parentId: 6000, type: "XXX" },
  { id: 6070, name: "XXX/Other", parentId: 6000, type: "XXX" },
  { id: 6080, name: "XXX/SD", parentId: 6000, type: "XXX" },
  { id: 6090, name: "XXX/WEB-DL", parentId: 6000, type: "XXX" },
  
  // Books (7000)
  { id: 7000, name: "Books", parentId: null, type: "Books" },
  { id: 7010, name: "Books/Mags", parentId: 7000, type: "Books" },
  { id: 7020, name: "Books/EBook", parentId: 7000, type: "Books" },
  { id: 7030, name: "Books/Comics", parentId: 7000, type: "Books" },
  { id: 7040, name: "Books/Technical", parentId: 7000, type: "Books" },
  { id: 7050, name: "Books/Other", parentId: 7000, type: "Books" },
  { id: 7060, name: "Books/Foreign", parentId: 7000, type: "Books" },
  
  // Other (8000)
  { id: 8000, name: "Other", parentId: null, type: "Other" },
  { id: 8010, name: "Other/Misc", parentId: 8000, type: "Other" },
  { id: 8020, name: "Other/Hashed", parentId: 8000, type: "Other" },
  { id: 0, name: "Other", parentId: null, type: "Other" },
  { id: 10, name: "Other/Misc", parentId: 0, type: "Other" },
];

module.exports = categories;

