'use strict';

// Tiny JSON-file store. Good enough for one wedding: a few dozen dreams and
// a few hundred contributions. Writes are serialised and atomic (tmp + rename).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_DATA = {
  settings: {
    brideName: 'The Bride',
    groomName: 'The Groom',
    currency: 'USD',
    welcome:
      'Your presence is the greatest gift. If you would like to help us towards one of our dreams, we would be truly grateful.',
  },
  dreams: [],
  contributions: [],
};

class Store {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.file = path.join(dataDir, 'db.json');
    this.uploadsDir = path.join(dataDir, 'uploads');
    fs.mkdirSync(this.uploadsDir, { recursive: true });
    this.data = this._load();
    this._writing = Promise.resolve();
  }

  _load() {
    if (!fs.existsSync(this.file)) return structuredClone(DEFAULT_DATA);
    const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8'));
    return {
      settings: { ...DEFAULT_DATA.settings, ...parsed.settings },
      dreams: parsed.dreams || [],
      contributions: parsed.contributions || [],
    };
  }

  save() {
    const snapshot = JSON.stringify(this.data, null, 2);
    this._writing = this._writing.then(async () => {
      const tmp = `${this.file}.${process.pid}.tmp`;
      await fs.promises.writeFile(tmp, snapshot);
      await fs.promises.rename(tmp, this.file);
    });
    return this._writing;
  }

  static id() {
    return crypto.randomUUID();
  }

  // ---- settings ----
  getSettings() {
    return { ...this.data.settings };
  }

  async updateSettings(patch) {
    Object.assign(this.data.settings, patch);
    await this.save();
    return this.getSettings();
  }

  // ---- dreams ----
  listDreams() {
    return [...this.data.dreams].sort((a, b) => a.order - b.order);
  }

  getDream(id) {
    return this.data.dreams.find((d) => d.id === id) || null;
  }

  async addDream(fields) {
    const maxOrder = this.data.dreams.reduce((m, d) => Math.max(m, d.order), 0);
    const dream = {
      id: Store.id(),
      order: maxOrder + 1,
      createdAt: new Date().toISOString(),
      ...fields,
    };
    this.data.dreams.push(dream);
    await this.save();
    return dream;
  }

  async updateDream(id, patch) {
    const dream = this.getDream(id);
    if (!dream) return null;
    Object.assign(dream, patch, { updatedAt: new Date().toISOString() });
    await this.save();
    return dream;
  }

  async deleteDream(id) {
    const idx = this.data.dreams.findIndex((d) => d.id === id);
    if (idx === -1) return null;
    const [removed] = this.data.dreams.splice(idx, 1);
    await this.save();
    return removed;
  }

  // ---- contributions ----
  listContributions() {
    return [...this.data.contributions].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
  }

  async addContribution(fields) {
    const c = { id: Store.id(), createdAt: new Date().toISOString(), ...fields };
    this.data.contributions.push(c);
    await this.save();
    return c;
  }

  async deleteContribution(id) {
    const idx = this.data.contributions.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    const [removed] = this.data.contributions.splice(idx, 1);
    await this.save();
    return removed;
  }
}

module.exports = { Store };
