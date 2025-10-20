import Database from 'better-sqlite3';
import {SERVER_CONFIG} from '../config';

let db: Database.Database;

export function initDatabase(): Database.Database {
    if (db) {
        return db;
    }

    db = new Database(SERVER_CONFIG.databasePath);

    // enable foreign keys
    db.pragma('foreign_keys = ON');

    // create recordings table if it doesn't exist
    db.exec(`
        CREATE TABLE IF NOT EXISTS recordings
        (
            id
            INTEGER
            PRIMARY
            KEY
            AUTOINCREMENT,
            folder_name
            TEXT
            UNIQUE
            NOT
            NULL,
            name
            TEXT
            NOT
            NULL,
            access_level
            TEXT
            NOT
            NULL
            CHECK (
            access_level
            IN
        (
            'public',
            'authenticated',
            'admin'
        )) DEFAULT 'authenticated',
            created_at TEXT NOT NULL DEFAULT
        (
            datetime
        (
            'now'
        )),
            file_path TEXT NOT NULL
            )
    `);

    console.log('database initialized at', SERVER_CONFIG.databasePath);
    return db;
}

export function getDatabase(): Database.Database {
    if (!db) {
        return initDatabase();
    }
    return db;
}

export function closeDatabase(): void {
    if (db) {
        db.close();
        console.log('database connection closed');
    }
}
