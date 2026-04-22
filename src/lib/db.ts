import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

class DatabaseService {
  private sqlite: SQLiteConnection | null = null;
  private db: SQLiteDBConnection | null = null;
  public isNative = Capacitor.isNativePlatform();
  public isInitialized = false;

  async init() {
    if (this.isNative) {
      try {
        this.sqlite = new SQLiteConnection(CapacitorSQLite);
        
        // Wait for connection to be correctly instantiated on Android
        this.db = await this.sqlite.createConnection('cycle_harmony_db', false, 'no-encryption', 1, false);
        await this.db.open();
        
        const schema = `
          CREATE TABLE IF NOT EXISTS local_user_data (
            id TEXT PRIMARY KEY,
            profiles TEXT,
            folders TEXT,
            updated_at TEXT
          );
        `;
        await this.db.execute(schema);
        this.isInitialized = true;
      } catch (e) {
        console.error("SQLite Init Error:", e);
      }
    } else {
      this.isInitialized = true;
    }
  }

  async loadData() {
    if (!this.isInitialized) await this.init();

    if (this.isNative && this.db) {
      try {
        const res = await this.db.query("SELECT * FROM local_user_data WHERE id = 'default_user'");
        if (res.values && res.values.length > 0) {
          const row = res.values[0];
          return {
            profiles: JSON.parse(row.profiles || '[]'),
            folders: JSON.parse(row.folders || '["Uncategorized"]')
          };
        }
      } catch (e) {
        console.error("SQLite loadData Error:", e);
      }
      return { profiles: [], folders: ['Uncategorized'] };
    } else {
      const data = localStorage.getItem('cycle_harmony_web_data');
      if (data) return JSON.parse(data);
      return { profiles: [], folders: ['Uncategorized'] };
    }
  }

  async saveData(profiles: any, folders: any) {
    if (!this.isInitialized) await this.init();

    if (this.isNative && this.db) {
      try {
        const profilesStr = JSON.stringify(profiles);
        const foldersStr = JSON.stringify(folders);
        const now = new Date().toISOString();
        
        await this.db.run(`
          INSERT INTO local_user_data (id, profiles, folders, updated_at) 
          VALUES (?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET 
            profiles = excluded.profiles, 
            folders = excluded.folders, 
            updated_at = excluded.updated_at;
        `, ['default_user', profilesStr, foldersStr, now]);
      } catch(e) {
        console.error("SQLite saveData Error:", e);
      }
    } else {
      localStorage.setItem('cycle_harmony_web_data', JSON.stringify({ profiles, folders }));
    }
  }
}

export const dbService = new DatabaseService();
