import { AppError } from '../utils/errors.js';

/**
 * Thin Vectara client for semantic search + summarization.
 * Uses env:
 * - VECTARA_API_KEY
 * - CUSTOMER_ID
 * - CORPORA_IDS (comma-separated)
 */
class VectaraClient {
  constructor() {
    // Defer env loading to runtime to avoid preload ordering issues
    this.apiKey = null;
    this.customerId = null;
    this.rawCorpusIds = [];
    this.corpusIds = [];
  }

  _loadEnv() {
    this.apiKey = process.env.VECTARA_API_KEY;
    this.customerId = process.env.CUSTOMER_ID;
    this.rawCorpusIds = (process.env.CORPORA_IDS || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    this.corpusIds = this.rawCorpusIds
      .map((id) => {
        const cleaned = id.replace(/^[a-zA-Z_]+/, '');
        const num = Number(cleaned);
        return Number.isNaN(num) ? null : num;
      })
      .filter((n) => n !== null);
  }

  _ensureConfig() {
    this._loadEnv(); // always refresh from current process.env

    if (!this.apiKey || !this.customerId || this.corpusIds.length === 0) {
      throw new AppError(
        'Vectara is not configured. Please set VECTARA_API_KEY, CUSTOMER_ID, CORPORA_IDS.',
        500,
        'VECTARA_CONFIG_MISSING'
      );
    }

    if (this.corpusIds.length !== this.rawCorpusIds.length) {
      throw new AppError(
        `Invalid CORPORA_IDS detected. Parsed: ${JSON.stringify(this.corpusIds)}, raw: ${this.rawCorpusIds.join(
          ','
        )}. Use numeric IDs (e.g., 4 or crp_4).`,
        500,
        'VECTARA_CORPUS_INVALID'
      );
    }
  }

  /**
   * Perform a Vectara query with summarization.
   * @param {string} queryText
   * @param {object} options
   * @returns {Promise<{ summary: string|null, passages: Array, citations: Array }>}
   */
  async searchAndSummarize(queryText, options = {}) {
    this._ensureConfig();
    if (!queryText || !queryText.trim()) {
      throw new AppError('Vectara query text is required.', 400, 'VECTARA_QUERY_REQUIRED');
    }

    const {
      numResults = 6,
      maxSummarizedResults = 5,
      sentencesBefore = 1,
      sentencesAfter = 1,
    } = options;

    const body = {
      query: [
        {
          query: queryText,
          numResults,
          corpusKey: this.corpusIds.map((id) => ({ corpusId: Number(id) })),
          summary: [
            {
              responseLang: 'en',
              maxSummarizedResults,
              summarizerPromptName: 'vectara-summary-ext-24k',
              enabled: true,
            },
          ],
          contextConfig: {
            sentencesBefore,
            sentencesAfter,
          },
        },
      ],
    };

    const resp = await fetch('https://api.vectara.io/v1/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'customer-id': this.customerId,
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('[Vectara] Query failed', {
        status: resp.status,
        errText: errText?.slice(0, 300),
      });
      throw new AppError(
        `Vectara query failed: ${resp.status} ${errText}`,
        502,
        'VECTARA_QUERY_FAILED'
      );
    }

    const data = await resp.json();
    console.log('[Vectara] Query success', {
      corpusCount: this.corpusIds.length,
      queryExcerpt: queryText.slice(0, 80),
      numResults,
      maxSummarizedResults,
      corpusIds: this.corpusIds,
    });
    const respObj = data?.responseSet?.[0] || {};
    const summaryText = respObj?.summary?.[0]?.text || null;
    const passages = (respObj?.response || []).map((item) => {
      const rawUrl =
        item.metadata?.url ||
        item.metadata?.link ||
        item.metadata?.href ||
        item.metadata?.source_url ||
        '';
      let url = rawUrl && typeof rawUrl === 'string' ? rawUrl.trim() : '';

      // Fallback: extract first http(s) URL from passage text if metadata missing
      if (!url) {
        const match = item.text?.match(/https?:\/\/\S+/);
        if (match && match[0]) {
          // Strip trailing punctuation
          url = match[0].replace(/[),.;]+$/, '');
        }
      }

      let host = '';
      try {
        if (url) host = new URL(url).hostname;
      } catch (_) {}

      return {
        text: item.text,
        score: item.score,
        corpusId: item.corpusKey?.corpusId,
        documentId: item.documentId,
        source: host || item.metadata?.source || item.metadata?.doc_title || '',
        url,
        title: item.metadata?.doc_title || host || 'Reference',
      };
    });

    return {
      summary: summaryText,
      passages,
      citations: passages.map((p, idx) => ({
        id: idx + 1,
        source: p.source,
        title: p.title,
        url: p.url,
        corpusId: p.corpusId,
      })),
    };
  }
}

const vectaraClient = new VectaraClient();

export default vectaraClient;

