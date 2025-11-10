// Script to generate indexer data from the user's table
// This will parse the table and create the complete indexersData array

const fs = require('fs');
const path = require('path');

// Known category abbreviations that should be kept together
const categoryMap = {
  'PC': 'PC',
  'TV': 'TV',
  'XXX': 'XXX',
  'Movies': 'Movies',
  'Audio': 'Audio',
  'Console': 'Console',
  'Books': 'Books',
  'Other': 'Other',
};

function parseCategories(catStr) {
  if (!catStr || catStr === 'None') return [];
  
  // Handle common patterns
  const categories = [];
  let remaining = catStr;
  
  // Known multi-character categories first
  const knownCategories = ['Console', 'Movies', 'Audio', 'PC', 'TV', 'XXX', 'Books', 'Other'];
  
  for (const cat of knownCategories) {
    if (remaining.includes(cat)) {
      categories.push(cat);
      remaining = remaining.replace(cat, '');
    }
  }
  
  return categories;
}

// All indexers from the user's table (truncated for now - we'll add the rest)
const rawData = `nzb	Headphones VIP	en-US	A Private Usenet indexer for music	Private	Audio
nzb	abNZB	en-US	Newznab is an API search specification for Usenet	Private	MoviesAudioPCTVXXXBooksOther
nzb	altHUB	en-US	Newznab is an API search specification for Usenet	Private	MoviesAudioPCTVBooks
nzb	AnimeTosho (Usenet)	en-US	Newznab is an API search specification for Usenet	Private	MoviesTV
nzb	DOGnzb	en-US	Newznab is an API search specification for Usenet	Private	ConsoleMoviesAudioPCTVXXXBooksOther
nzb	DrunkenSlug	en-US	Newznab is an API search specification for Usenet	Private	ConsoleMoviesAudioPCTVXXXBooks
nzb	GingaDADDY	en-US	Newznab is an API search specification for Usenet	Private	None
nzb	Miatrix	en-US	Newznab is an API search specification for Usenet	Private	ConsoleMoviesAudioPCTVXXXBooksOther
nzb	Newz69	en-US	Newznab is an API search specification for Usenet	Private	ConsoleMoviesAudioPCTVXXXBooksOther
nzb	NinjaCentral	en-US	Newznab is an API search specification for Usenet	Private	ConsoleMoviesAudioPCTVXXXBooksOther
nzb	Nzb.su	en-US	Newznab is an API search specification for Usenet	Private	ConsoleMoviesAudioPCTVXXXBooksOther
nzb	NZBCat	en-US	Newznab is an API search specification for Usenet	Private	ConsoleMoviesAudioPCTVXXXBooks
nzb	NZBFinder	en-US	Newznab is an API search specification for Usenet	Private	MoviesAudioTVXXXBooks
nzb	NZBgeek	en-US	Newznab is an API search specification for Usenet	Private	ConsoleMoviesAudioPCTVXXXBooksOther
nzb	NzbNoob	en-US	Newznab is an API search specification for Usenet	Private	MoviesAudioPCTVXXXBooksOther
nzb	NZBNDX	en-US	Newznab is an API search specification for Usenet	Private	ConsoleMoviesAudioPCTVXXXBooksOther
nzb	NzbPlanet	en-US	Newznab is an API search specification for Usenet	Private	ConsoleMoviesAudioPCTVXXXBooksOther
nzb	NZBStars	en-US	Newznab is an API search specification for Usenet	Private	ConsoleMoviesAudioPCTVXXXBooks
nzb	Tabula Rasa	en-US	Newznab is an API search specification for Usenet	Private	ConsoleMoviesAudioPCTVXXXBooks
nzb	Generic Newznab	en-US	Newznab is an API search specification for Usenet	Private	None`;

const lines = rawData.trim().split('\n');
const indexers = [];

for (const line of lines) {
  const parts = line.split('\t');
  if (parts.length >= 6) {
    const protocol = parts[0];
    const name = parts[1];
    const language = parts[2];
    const description = parts[3];
    const privacy = parts[4];
    const categories = parseCategories(parts[5]);
    
    indexers.push({
      name,
      protocol,
      language,
      description,
      privacy,
      categories,
    });
  }
}

console.log(JSON.stringify(indexers, null, 2));

