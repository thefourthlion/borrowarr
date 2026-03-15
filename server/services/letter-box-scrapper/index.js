const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const FeaturedList = require('../../models/FeaturedLists');

/**
 * Letterboxd Scraper Service
 *
 * Uses Puppeteer (visible browser by default) to scrape Letterboxd.
 * Set LETTERBOXD_HEADLESS=true to run headless.
 */

const DEFAULT_DELAY = 2000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;
const LIST_PAGE_TIMEOUT = 60000; // List pages have many posters, need longer

class LetterboxdScraper {
  constructor(options = {}) {
    this.baseUrl = 'https://letterboxd.com';
    this.requestDelay = options.requestDelay ?? DEFAULT_DELAY;
    this.headless = options.headless ?? (process.env.LETTERBOXD_HEADLESS === 'true');
    this.browser = null;
    this.page = null;
  }

  async delay(ms = this.requestDelay) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async init() {
    if (this.browser) return;
    console.log(this.headless ? 'Launching browser (headless)...' : 'Launching browser (visible)...');
    this.browser = await puppeteer.launch({
      headless: this.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 800 },
    });
    this.page = await this.browser.newPage();
    await this.page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      console.log('Browser closed.');
    }
  }

  async makeRequest(url, options = {}) {
    const { retries = MAX_RETRIES, timeout = 30000, waitUntil = 'load' } = options;
    await this.init();
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await this.page.goto(url, {
          waitUntil,
          timeout,
        });
        if (response && response.status() >= 400) {
          throw new Error(`Request failed with status code ${response.status()}`);
        }
        const html = await this.page.content();
        return html;
      } catch (error) {
        const isLast = attempt === retries;
        console.error(`Request failed (attempt ${attempt}/${retries}): ${url}`, error.message);
        if (isLast) throw error;
        await this.delay(RETRY_DELAY);
      }
    }
  }

  /** Request for list detail pages (many posters) - longer timeout, waits for content */
  async makeListPageRequest(url) {
    await this.init();
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await this.page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: LIST_PAGE_TIMEOUT,
        });
        if (response && response.status() >= 400) {
          throw new Error(`Request failed with status code ${response.status()}`);
        }
        await this.page.waitForSelector('li.posteritem, .poster-list, .js-list-entries, body', {
          timeout: 15000,
        });
        const html = await this.page.content();
        return html;
      } catch (error) {
        const isLast = attempt === MAX_RETRIES;
        console.error(`Request failed (attempt ${attempt}/${MAX_RETRIES}): ${url}`, error.message);
        if (isLast) throw error;
        await this.delay(RETRY_DELAY);
      }
    }
  }

  /**
   * Scrape the featured lists page - gets EVERY list on the page
   */
  async scrapeFeaturedListsPage() {
    console.log('Scraping Letterboxd featured lists...');
    const url = `${this.baseUrl}/lists/featured/`;
    const html = await this.makeRequest(url);
    const $ = cheerio.load(html);

    const lists = [];

    $('section.list.js-list, section.list').each((index, element) => {
      try {
        const $section = $(element);

        const listLink = $section.find('a.poster-list-link').attr('href');
        if (!listLink) return;

        const listUrl = listLink.startsWith('http') ? listLink : `${this.baseUrl}${listLink}`;
        const pathParts = listLink.replace(/\/$/, '').split('/').filter(Boolean);
        const slug = pathParts.length >= 3 ? pathParts[pathParts.length - 1] : `list-${index}`;

        const title =
          $section.find('h3.title-3 a').text().trim() ||
          $section.find('h3 a').text().trim() ||
          $section.find('.list-title a').text().trim();
        if (!title || !slug) return;

        const authorLink =
          $section.find('.attribution-block .owner').attr('href') ||
          $section.find('.attribution-block a.avatar').attr('href') ||
          $section.find('.list-owner a').attr('href');
        const author = authorLink ? authorLink.replace(/^\//, '').replace(/\/$/, '') : null;
        const authorUrl = author ? `${this.baseUrl}/${author}/` : null;

        const filmCountText =
          $section.find('.content-reactions-strip .value').text().trim() ||
          $section.find('.list-number').text().trim();
        const filmCountParsed = filmCountText ? parseInt(String(filmCountText).replace(/[^\d]/g, ''), 10) : 0;
        const filmCount = Number.isNaN(filmCountParsed) ? 0 : filmCountParsed;

        const posterUrls = [];
        $section.find('.posterlist img, .posterlist .poster img, .poster.film-poster img').each((i, img) => {
          if (i < 10) {
            let src = $(img).attr('src');
            if (src && !src.includes('empty-poster')) {
              src = src.replace(/-70-0-105|-0-70-0-105/, '-230-0-345');
              posterUrls.push(src);
            }
          }
        });
        if (posterUrls.length === 0) {
          $section.find('[data-poster-url]').each((i, el) => {
            if (i < 10) {
              const path = $(el).attr('data-poster-url');
              if (path && !path.includes('empty')) {
                posterUrls.push(path.startsWith('http') ? path : `${this.baseUrl}${path}`);
              }
            }
          });
        }

        const likesText = $section.find('.like-count').text().trim();
        const commentsText = $section.find('.comment-count').text().trim();
        const likesParsed = likesText ? parseInt(String(likesText).replace(/[^\d]/g, ''), 10) : 0;
        const likes = Number.isNaN(likesParsed) ? 0 : likesParsed;
        const commentsParsed = commentsText ? parseInt(String(commentsText).replace(/[^\d]/g, ''), 10) : 0;
        const comments = Number.isNaN(commentsParsed) ? 0 : commentsParsed;

        lists.push({
          slug,
          title,
          author,
          authorUrl,
          listUrl,
          filmCount,
          likes,
          comments,
          posterUrls,
          category: 'community',
          featured: true,
        });
      } catch (err) {
        console.error('Error parsing list:', err.message);
      }
    });

    console.log(`Found ${lists.length} lists`);
    return lists;
  }

  _extractFilmFromPosterItem($, $el, position) {
    const $comp = $el.find('[data-item-slug]').first();
    if ($comp.length === 0) return null;

    const filmSlug = $comp.attr('data-item-slug');
    const filmName = $comp.attr('data-item-name') || $comp.attr('data-item-full-display-name');
    const filmLink = $comp.attr('data-item-link') || $comp.attr('data-target-link');
    const filmId = $comp.attr('data-film-id');

    if (!filmSlug) return null;

    let posterUrl = $el.find('img.image, img[src*="ltrbxd"], .poster img').attr('src') ||
      $el.find('img').attr('data-src') ||
      $el.find('img').attr('src');
    if (posterUrl && !posterUrl.includes('empty-poster')) {
      posterUrl = posterUrl.replace(/-70-0-105|-0-70-0-105|-0-125-0-187/, '-230-0-345');
    } else {
      posterUrl = null;
    }

    const positionEl = $el.find('.list-number').text().trim();
    const pos = positionEl ? parseInt(positionEl, 10) : position;

    return {
      slug: filmSlug,
      title: filmName || filmSlug,
      posterUrl,
      letterboxdUrl: filmLink ? `${this.baseUrl}${filmLink}` : `${this.baseUrl}/film/${filmSlug}/`,
      letterboxdFilmId: filmId ? parseInt(filmId, 10) : null,
      position: pos,
    };
  }

  async _scrapeListFilmsPage(listUrl, pageNum = 1) {
    const base = listUrl.replace(/\/$/, '');
    const url = pageNum > 1 ? `${base}/page/${pageNum}/` : `${base}/`;
    const html = await this.makeListPageRequest(url);
    const $ = cheerio.load(html);

    const films = [];
    $('li.posteritem, li.posteritem.numbered-list-item').each((index, el) => {
      const film = this._extractFilmFromPosterItem($, $(el), index + 1);
      if (film) films.push(film);
    });

    if (films.length === 0) {
      $('.poster-list li.posteritem, .js-list-entries li.posteritem').each((index, el) => {
        const film = this._extractFilmFromPosterItem($, $(el), index + 1);
        if (film) films.push(film);
      });
    }

    const hasNext = $('.pagination a.next[href]').length > 0;

    return { films, hasNext, $: pageNum === 1 ? $ : null };
  }

  _extractListMetadata($) {
    const title =
      $('.list-title-intro h1').text().trim() ||
      $('h1.title-1').text().trim() ||
      $('meta[property="og:title"]').attr('content') ||
      '';
    const description =
      $('.body-text.-prose').first().text().trim() ||
      $('.collapsed-text').text().trim() ||
      $('.body-text.-hero').first().text().trim() ||
      $('meta[property="og:description"]').attr('content') ||
      '';
    return { title, description };
  }

  async scrapeListDetails(listUrl) {
    console.log(`Scraping list: ${listUrl}`);
    const allFilms = [];
    let pageNum = 1;
    let hasNext = true;
    let metadata = { title: '', description: '' };

    while (hasNext) {
      const result = await this._scrapeListFilmsPage(listUrl, pageNum);
      allFilms.push(...result.films);
      if (pageNum === 1 && result.$) {
        metadata = this._extractListMetadata(result.$);
      }
      hasNext = result.hasNext && result.films.length > 0;
      pageNum++;

      if (hasNext) {
        await this.delay();
      }
    }

    console.log(`Found ${allFilms.length} films in list`);
    return {
      title: metadata.title,
      description: metadata.description,
      filmCount: allFilms.length,
      films: allFilms,
    };
  }

  async saveList(listData) {
    try {
      const [list, created] = await FeaturedList.findOrCreate({
        where: { slug: listData.slug },
        defaults: {
          ...listData,
          lastScrapedAt: new Date(),
        },
      });

      if (!created) {
        await list.update({
          ...listData,
          lastScrapedAt: new Date(),
        });
      }
      return list;
    } catch (error) {
      console.error('Error saving list:', error.message);
      throw error;
    }
  }

  async scrapeFeaturedLists() {
    console.log('Starting Letterboxd featured lists scraper...');
    try {
      const lists = await this.scrapeFeaturedListsPage();

      const savedLists = [];
      for (const listData of lists) {
        try {
          const saved = await this.saveList(listData);
          savedLists.push(saved);
          console.log(`  ✓ ${listData.title}`);
          await this.delay();
        } catch (err) {
          console.error(`  ✗ ${listData.title}:`, err.message);
        }
      }

      console.log(`\nSaved ${savedLists.length}/${lists.length} lists`);
      return savedLists;
    } finally {
      await this.close();
    }
  }

  async scrapeFullListDetails(slug) {
    const list = await FeaturedList.findOne({ where: { slug } });
    if (!list) {
      throw new Error(`List not found: ${slug}`);
    }

    console.log(`Scraping full details: ${list.title}`);
    const details = await this.scrapeListDetails(list.listUrl);

    await list.update({
      title: details.title || list.title,
      description: details.description || list.description,
      filmCount: details.filmCount,
      scrapedFilms: details.films,
      posterUrls: details.films.slice(0, 10).map((f) => f.posterUrl).filter(Boolean),
      lastScrapedAt: new Date(),
    });

    console.log(`  ✓ ${details.films.length} films`);
    return list;
  }

  async scrapeAllListsWithFilms() {
    console.log('=== Full scrape: all lists + all films ===\n');

    try {
      const lists = await this.scrapeFeaturedListsPage();
      console.log(`\nFound ${lists.length} lists. Saving...`);

      const savedLists = [];
      for (const listData of lists) {
        try {
          const saved = await this.saveList(listData);
          savedLists.push(saved);
          console.log(`  ✓ ${listData.title}`);
          await this.delay();
        } catch (err) {
          console.error(`  ✗ ${listData.title}:`, err.message);
        }
      }

      console.log(`\nScraping films for ${savedLists.length} lists...`);
      for (const list of savedLists) {
        try {
          await this.scrapeFullListDetails(list.slug);
          await this.delay();
        } catch (err) {
          console.error(`  ✗ Films for ${list.slug}:`, err.message);
        }
      }

      console.log('\n=== Full scrape complete ===');
      return savedLists;
    } finally {
      await this.close();
    }
  }

  async updateAllLists() {
    const lists = await FeaturedList.findAll({ where: { featured: true } });
    console.log(`Updating ${lists.length} lists...`);

    try {
      for (const list of lists) {
        try {
          await this.scrapeFullListDetails(list.slug);
          await this.delay();
        } catch (err) {
          console.error(`Failed ${list.slug}:`, err.message);
        }
      }
      console.log('Update complete');
    } finally {
      await this.close();
    }
  }
}

// Visible by default for CLI; set LETTERBOXD_HEADLESS=true for headless (e.g. API/Docker)
const scraper = new LetterboxdScraper({
  headless: process.env.LETTERBOXD_HEADLESS === 'true',
});

module.exports = {
  LetterboxdScraper,
  scraper,
  scrapeFeaturedLists: () => scraper.scrapeFeaturedLists(),
  scrapeFullListDetails: (slug) => scraper.scrapeFullListDetails(slug),
  scrapeAllListsWithFilms: () => scraper.scrapeAllListsWithFilms(),
  updateAllLists: () => scraper.updateAllLists(),
};
