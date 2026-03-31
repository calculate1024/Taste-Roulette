// LLM-based reason rewriter using Claude Sonnet
// Takes track metadata + source context, generates natural zh-TW + en reasons

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';

// Manually read ANTHROPIC_API_KEY from root .env (dotenv preload may skip it)
function getAnthropicKey(): string {
  const envPath = path.resolve(__dirname, '../../../../../.env');
  try {
    const content = fs.readFileSync(envPath, 'utf-8');
    const match = content.match(/ANTHROPIC_API_KEY=(.+)/);
    if (match) return match[1].trim();
  } catch { /* fallback to env */ }
  return process.env.ANTHROPIC_API_KEY || '';
}

const client = new Anthropic({
  apiKey: getAnthropicKey(),
});

interface RewriteInput {
  artist: string;
  title: string;
  genres: string[];
  sourceName: string;
  excerpt?: string; // original article excerpt if available
}

interface RewriteOutput {
  zh: string;
  en: string;
}

const SYSTEM_PROMPT = `你是音樂推薦 APP「Taste Roulette」的推薦語撰寫者。

規則：
1. 每則推薦語開頭標示來源（如「Earmilk 推薦 —」或「NPR Music 推薦 —」）
2. 後面接一句自然、口語的推薦理由（10-25 字）
3. 語氣像朋友分享歌，不要像廣告或評論
4. 如果有文章摘錄 (excerpt)，從中提煉核心語意改寫，不要直接翻譯或複製原文
5. 如果沒有摘錄，根據歌手和曲名寫一句自然的推薦
6. 同時產生繁體中文 (zh) 和英文 (en) 版本
7. 英文版也要口語自然，不要翻譯腔

好的例子：
- zh: "NPR Music 推薦 — 越聽越上癮的節奏"
- en: "NPR Music pick — rhythm that gets under your skin"
- zh: "Earmilk 推薦 — 很適合深夜獨處時聽"
- en: "Earmilk pick — perfect for those late-night solo moments"

不好的例子（避免）：
- "這首歌融合了多種風格的元素，展現了藝術家的創意才華" ← 太空泛
- "A track that changed how I think about jazz" ← 太誇張
- "推" ← 太短，沒有來源`;

/**
 * Batch rewrite reasons using Claude Sonnet.
 * Processes in chunks to manage rate limits.
 */
export async function batchRewrite(
  tracks: RewriteInput[],
  batchSize = 20,
): Promise<Map<string, RewriteOutput>> {
  const results = new Map<string, RewriteOutput>();

  for (let i = 0; i < tracks.length; i += batchSize) {
    const chunk = tracks.slice(i, i + batchSize);
    const key = (t: RewriteInput) => `${t.artist}|||${t.title}`;

    const userPrompt = chunk
      .map(
        (t, idx) =>
          `[${idx + 1}] Artist: ${t.artist} | Title: ${t.title} | Genres: ${t.genres.join(', ')} | Source: ${t.sourceName}${t.excerpt ? ` | Excerpt: ${t.excerpt.slice(0, 200)}` : ''}`,
      )
      .join('\n');

    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `為以下 ${chunk.length} 首歌各寫一則推薦語（zh + en）。\n用 JSON array 回覆，格式：[{"idx":1,"zh":"...","en":"..."},...]。只回覆 JSON，不要其他文字。\n\n${userPrompt}`,
          },
        ],
      });

      const text =
        response.content[0].type === 'text' ? response.content[0].text : '';
      // Strip markdown fences if present
      const jsonStr = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonStr) as Array<{
        idx: number;
        zh: string;
        en: string;
      }>;

      for (const item of parsed) {
        const track = chunk[item.idx - 1];
        if (track) {
          results.set(key(track), { zh: item.zh, en: item.en });
        }
      }

      console.log(
        `  Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tracks.length / batchSize)}: ${parsed.length} reasons generated`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  Batch ${Math.floor(i / batchSize) + 1} failed:`, msg);
    }

    // Rate limit: wait between batches
    if (i + batchSize < tracks.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return results;
}

/**
 * Rewrite a single track's reason (for use in harvest pipeline).
 */
export async function rewriteSingle(input: RewriteInput): Promise<RewriteOutput> {
  const results = await batchRewrite([input], 1);
  const key = `${input.artist}|||${input.title}`;
  return results.get(key) || { zh: `${input.sourceName} 推薦`, en: `${input.sourceName} pick` };
}
