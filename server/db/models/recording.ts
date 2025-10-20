import {getDatabase} from '../database';

export type AccessLevel = 'public' | 'authenticated' | 'admin';

export interface Recording {
    id: number;
    folder_name: string;
    name: string;
    access_level: AccessLevel;
    created_at: string;
    file_path: string;
}

export interface NewRecording {
    folder_name: string;
    name: string;
    access_level?: AccessLevel;
    file_path: string;
}

export class RecordingModel {
    // create a new recording entry
    static create(recording: NewRecording): Recording {
        const db = getDatabase();
        const stmt = db.prepare(`
            INSERT INTO recordings (folder_name, name, access_level, file_path)
            VALUES (@folder_name, @name, @access_level, @file_path)
        `);

        const result = stmt.run({
            folder_name: recording.folder_name,
            name: recording.name,
            access_level: recording.access_level || 'authenticated',
            file_path: recording.file_path,
        });

        return this.findById(result.lastInsertRowid as number)!;
    }

    // find recording by id
    static findById(id: number): Recording | undefined {
        const db = getDatabase();
        const stmt = db.prepare('SELECT * FROM recordings WHERE id = ?');
        return stmt.get(id) as Recording | undefined;
    }

    // find recording by folder name
    static findByFolderName(folderName: string): Recording | undefined {
        const db = getDatabase();
        const stmt = db.prepare('SELECT * FROM recordings WHERE folder_name = ?');
        return stmt.get(folderName) as Recording | undefined;
    }

    // get all recordings filtered by access level
    static findByAccessLevel(accessLevels: AccessLevel[]): Recording[] {
        const db = getDatabase();
        const placeholders = accessLevels.map(() => '?').join(',');
        const stmt = db.prepare(`
            SELECT *
            FROM recordings
            WHERE access_level IN (${placeholders})
            ORDER BY created_at DESC
        `);
        return stmt.all(...accessLevels) as Recording[];
    }

    // get all recordings
    static findAll(): Recording[] {
        const db = getDatabase();
        const stmt = db.prepare('SELECT * FROM recordings ORDER BY created_at DESC');
        return stmt.all() as Recording[];
    }

    // update recording access level
    static updateAccessLevel(folderName: string, accessLevel: AccessLevel): boolean {
        const db = getDatabase();
        const stmt = db.prepare(`
            UPDATE recordings
            SET access_level = @access_level
            WHERE folder_name = @folder_name
        `);
        const result = stmt.run({folder_name: folderName, access_level: accessLevel});
        return result.changes > 0;
    }

    // delete recording by folder name
    static delete(folderName: string): boolean {
        const db = getDatabase();
        const stmt = db.prepare('DELETE FROM recordings WHERE folder_name = ?');
        const result = stmt.run(folderName);
        return result.changes > 0;
    }

    // ensure recording exists in database, create if not
    static ensureExists(folderName: string, filePath: string): Recording {
        const existing = this.findByFolderName(folderName);
        if (existing) {
            return existing;
        }

        // create new entry with default authenticated access
        return this.create({
            folder_name: folderName,
            name: folderName,
            file_path: filePath,
            access_level: 'authenticated',
        });
    }
}
