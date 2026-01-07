import { AppError } from '../utils/errors.js';

/**
 * Thin Vectara client for semantic search + summarization.
 * Supports:
 * v1 (api key): VECTARA_API_KEY, CUSTOMER_ID, CORPORA_IDS (comma-separated)
 * v2 (bearer): VECTARA_AUTH_TOKEN, VECTARA_CORPUS_KEYS (preferred) or CORPORA_IDS
 *     (or supply VECTARA_CLIENT_ID + VECTARA_CLIENT_SECRET to auto-fetch token)
 * Toggle with VECTARA_USE_V2=true; otherwise defaults to v1 if api key present.
 */
class VectaraClient {
  constructor() {
    // Defer env loading to runtime to avoid preload ordering issues
    this.apiKey = null;
    this.customerId = null;
    this.rawCorpusIds = [];
    this.corpusIds = [];
    this.authToken = null;
    this.corpusKeys = [];
    this.clientId = null;
    this.clientSecret = null;
    this.tokenCache = { token: null, expiresAt: 0 };
  }

  _loadEnv() {
    this.apiKey = process.env.VECTARA_API_KEY;
    this.customerId = process.env.CUSTOMER_ID;
    this.authToken = process.env.VECTARA_AUTH_TOKEN;
    this.clientId = process.env.VECTARA_CLIENT_ID;
    this.clientSecret = process.env.VECTARA_CLIENT_SECRET;
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
    this.corpusKeys = (process.env.VECTARA_CORPUS_KEYS || '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
  }

  _ensureConfig() {
    this._loadEnv(); // always refresh from current process.env

    const useV2 = process.env.VECTARA_USE_V2 === 'true';

    if (useV2) {
      if (!this.authToken && (!this.clientId || !this.clientSecret)) {
        throw new AppError(
          'Vectara v2 requires VECTARA_AUTH_TOKEN or VECTARA_CLIENT_ID + VECTARA_CLIENT_SECRET.',
          500,
          'VECTARA_CONFIG_MISSING'
        );
      }
      if (this.corpusKeys.length === 0 && this.corpusIds.length === 0) {
        throw new AppError(
          'Vectara v2 requires VECTARA_CORPUS_KEYS or CORPORA_IDS.',
          500,
          'VECTARA_CONFIG_MISSING'
        );
      }
      return;
    }

    if (!this.apiKey || !this.customerId || this.corpusIds.length === 0) {
      throw new AppError(
        'Vectara is not configured. Set VECTARA_API_KEY, CUSTOMER_ID, CORPORA_IDS (or enable VECTARA_USE_V2 with VECTARA_AUTH_TOKEN).',
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

  async _getV2Token() {
    // If static token provided, use it (no refresh)
    if (this.authToken) return this.authToken;

    // Cached token valid?
    if (this.tokenCache.token && Date.now() < this.tokenCache.expiresAt) {
      return this.tokenCache.token;
    }

    if (!this.clientId || !this.clientSecret) {
      throw new AppError(
        'Missing VECTARA_CLIENT_ID or VECTARA_CLIENT_SECRET for v2 token fetch.',
        500,
        'VECTARA_CONFIG_MISSING'
      );
    }

    const resp = await fetch('https://auth.vectara.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('[Vectara] v2 token fetch failed', {
        status: resp.status,
        errText: errText?.slice(0, 300),
      });
      throw new AppError(
        `Vectara v2 token fetch failed: ${resp.status} ${errText}`,
        502,
        'VECTARA_TOKEN_FAILED'
      );
    }

    const json = await resp.json();
    const token = json.access_token;
    const expiresIn = json.expires_in || 3600;
    // refresh 1 minute early
    this.tokenCache = {
      token,
      expiresAt: Date.now() + Math.max(60, expiresIn - 60) * 1000,
    };
    return token;
  }

  async _callV2(queryText, options) {
    const {
      numResults = 6,
      sentencesBefore = 1,
      sentencesAfter = 1,
    } = options;

    const generationPreset =
      process.env.VECTARA_GENERATION_PRESET || 'vectara-summary-ext-24k';
    const responseLanguage = process.env.VECTARA_RESPONSE_LANGUAGE || 'eng';

    const corpora =
      this.corpusKeys.length > 0
        ? this.corpusKeys.map((key) => ({
            corpus_key: key,
            metadata_filter: '',
            lexical_interpolation: 0.005,
          }))
        : this.corpusIds.map((id) => ({
            corpus_id: Number(id),
            metadata_filter: '',
            lexical_interpolation: 0.005,
          }));

    const body = {
      query: queryText,
      search: {
        corpora,
        offset: 0,
        limit: numResults,
        context_configuration: {
          sentences_before: sentencesBefore,
          sentences_after: sentencesAfter,
          start_tag: '%START_SNIPPET%',
          end_tag: '%END_SNIPPET%',
        },
      },
      stream_response: false,
      generation: {
        generation_preset_name: generationPreset,
        response_language: responseLanguage,
      },
      save_history: false,
    };

    const bearer = await this._getV2Token();

    const resp = await fetch('https://api.vectara.io/v2/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bearer}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('[Vectara] v2 query failed', {
        status: resp.status,
        errText: errText?.slice(0, 300),
      });
      throw new AppError(
        `Vectara v2 query failed: ${resp.status} ${errText}`,
        502,
        'VECTARA_QUERY_FAILED'
      );
    }

    const data = await resp.json();
    const respObj = data?.responseSet?.[0] || {};
    const summaryText = respObj?.summary?.[0]?.text || respObj?.summary?.text || null;

    const passages = (respObj?.response || []).map((item) => {
      const rawUrl =
        item.metadata?.url ||
        item.metadata?.link ||
        item.metadata?.href ||
        item.metadata?.source_url ||
        '';
      let url = rawUrl && typeof rawUrl === 'string' ? rawUrl.trim() : '';
      if (!url) {
        const match = item.text?.match(/https?:\/\/\S+/);
        if (match && match[0]) url = match[0].replace(/[),.;]+$/, '');
      }
      let host = '';
      try {
        if (url) host = new URL(url).hostname;
      } catch (_) {}

      return {
        text: item.text,
        score: item.score,
        corpusId: item.corpusKey?.corpus_id || item.corpusKey?.corpusId,
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

    const useV2 = process.env.VECTARA_USE_V2 === 'true' && this.authToken;
    if (useV2) {
      return this._callV2(queryText, {
        numResults,
        sentencesBefore,
        sentencesAfter,
      });
    }

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

      const snippetText = item.text || '';
      const resolvedTitle =
        item.metadata?.doc_title ||
        item.metadata?.title ||
        host ||
        (snippetText ? snippetText.slice(0, 80) : 'Reference');

      return {
        text: snippetText,
        score: item.score,
        corpusId: item.corpusKey?.corpusId,
        documentId: item.documentId,
        source: host || item.metadata?.source || item.metadata?.doc_title || 'KnowledgeBase',
        url,
        title: resolvedTitle,
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

