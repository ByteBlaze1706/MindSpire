// src/lib/repositories/journal.repository.ts
// Handles database actions for wellness journal logs, integrating soft deletes, gratitude logs, and blind index keyword hashing.
import crypto from 'crypto';
import { createClient } from '../supabase/server';

export interface JournalEntry {
  id: string;
  institution_id: string;
  user_id: string;
  encrypted_content: string;
  encrypted_dek: string;
  key_reference: string;
  encryption_version: string;
  is_gratitude: boolean;
  search_indices: string[];
  sentiment_score: number | null;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  deleted_at: string | null;
}

const KEK_MASTER = process.env.ENCRYPTION_MASTER_KEY || 'mindspire-super-secret-key-phrase';
const BLIND_INDEX_KEY = process.env.BLIND_INDEX_KEY || 'mindspire-blind-index-key';

// Stopwords array to filter out common search noise
const STOPWORDS = new Set(['the', 'and', 'a', 'to', 'of', 'in', 'is', 'it', 'you', 'that', 'this', 'for', 'on', 'with', 'as', 'at']);

/**
 * Hashes a single keyword for blind indexing.
 */
function hashKeyword(word: string): string {
  return crypto
    .createHmac('sha256', BLIND_INDEX_KEY)
    .update(word.toLowerCase().trim())
    .digest('hex');
}

/**
 * Tokenizes text and produces unique keyword hashes.
 */
function generateBlindIndices(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // strip punctuation
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));

  return Array.from(new Set(words.map(hashKeyword)));
}

function encryptJournal(text: string): { ciphertext: string; encryptedDek: string; keyRef: string } {
  const dek = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', dek, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  const ciphertextPayload = `${iv.toString('hex')}:${authTag}:${encrypted}`;

  const kek = crypto.scryptSync(KEK_MASTER, 'mindspire-dek-salt', 32);
  const dekIv = crypto.randomBytes(16);
  const dekCipher = crypto.createCipheriv('aes-256-cbc', kek, dekIv);
  let encryptedDek = dekCipher.update(dek.toString('hex'), 'utf8', 'hex');
  encryptedDek += dekCipher.final('hex');
  const dekPayload = `${dekIv.toString('hex')}:${encryptedDek}`;

  return {
    ciphertext: ciphertextPayload,
    encryptedDek: dekPayload,
    keyRef: 'kms-master-v1',
  };
}

function decryptJournal(ciphertext: string, encryptedDek: string): string {
  const [dekIvHex, encryptedDekHex] = encryptedDek.split(':');
  const kek = crypto.scryptSync(KEK_MASTER, 'mindspire-dek-salt', 32);
  const dekIv = Buffer.from(dekIvHex, 'hex');
  const dekDecipher = crypto.createDecipheriv('aes-256-cbc', kek, dekIv);
  let dekHex = dekDecipher.update(encryptedDekHex, 'hex', 'utf8');
  dekHex += dekDecipher.final('utf8');
  const dek = Buffer.from(dekHex, 'hex');

  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', dek, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export class JournalRepository {
  /**
   * Creates a journal entry, encrypting content and building blind search indices.
   */
  async createEntry(
    userId: string,
    institutionId: string,
    rawText: string,
    isGratitude: boolean,
    sentimentScore: number | null,
    riskLevel: JournalEntry['risk_level']
  ): Promise<void> {
    const { ciphertext, encryptedDek, keyRef } = encryptJournal(rawText);
    const searchIndices = generateBlindIndices(rawText);
    
    const supabase = await createClient();
    const { error } = await supabase.from('journal_entries').insert({
      user_id: userId,
      institution_id: institutionId,
      encrypted_content: ciphertext,
      encrypted_dek: encryptedDek,
      key_reference: keyRef,
      encryption_version: 'v1',
      is_gratitude: isGratitude,
      search_indices: searchIndices,
      sentiment_score: sentimentScore,
      risk_level: riskLevel,
    });

    if (error) {
      throw new Error(`Journal write failed: ${error.message}`);
    }
  }

  /**
   * Fetches active journal entries. If a keyword is provided, executes blind index hashing.
   */
  async getEntries(
    userId: string,
    keyword?: string
  ): Promise<(Omit<JournalEntry, 'encrypted_content'> & { content: string })[]> {
    const supabase = await createClient();
    let queryBuilder = supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null);

    // Apply blind index search filtering if keyword is query param
    if (keyword && keyword.trim().length > 0) {
      const searchHashes = generateBlindIndices(keyword);
      if (searchHashes.length > 0) {
        // Query rows where search_indices contains ANY of the search hashes
        queryBuilder = queryBuilder.overlaps('search_indices', searchHashes);
      }
    }

    const { data, error } = await queryBuilder.order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map((row) => {
      try {
        const plaintext = decryptJournal(row.encrypted_content, row.encrypted_dek);
        return {
          ...row,
          content: plaintext,
        };
      } catch (err) {
        return {
          ...row,
          content: '[Decryption Error: Key reference mismatch]',
        };
      }
    });
  }

  /**
   * Soft deletes a journal entry.
   */
  async softDeleteEntry(id: string, userId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('journal_entries')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Journal deletion failed: ${error.message}`);
    }
  }
}
