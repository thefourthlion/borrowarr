#!/usr/bin/env python3
import re
import json

# Known categories in order of length (longest first to avoid partial matches)
KNOWN_CATEGORIES = ["Console", "Movies", "Audio", "Books", "Other", "PC", "TV", "XXX"]

def parse_categories(cat_str):
    if not cat_str or cat_str == "None":
        return []
    
    found = []
    remaining = cat_str
    
    # Check for known categories (longest first)
    for cat in sorted(KNOWN_CATEGORIES, key=len, reverse=True):
        if cat in remaining:
            found.append(cat)
            remaining = remaining.replace(cat, "", 1)  # Replace only first occurrence
    
    return found

# Read from stdin or use sample data
data = """nzb	Headphones VIP	en-US	A Private Usenet indexer for music	Private	Audio
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
nzb	Generic Newznab	en-US	Newznab is an API search specification for Usenet	Private	None"""

lines = data.strip().split('\n')
indexers = []

for line in lines:
    parts = line.split('\t')
    if len(parts) >= 6:
        indexers.append({
            "name": parts[1],
            "protocol": parts[0],
            "language": parts[2],
            "description": parts[3],
            "privacy": parts[4],
            "categories": parse_categories(parts[5])
        })

print(json.dumps(indexers, indent=2))
