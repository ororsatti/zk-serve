import Database from "better-sqlite3"
import { constructFromSymbol } from "date-fns/constants"

export const dbInit = (path, opt = {}) => {
    try {
        const db = new Database(path, opt)
        db.pragma("journal_mode = WAL")
        return db
    } catch (e) {
        console.error(e)
        return null
    }
}

export const searchNotes = (db, query) => {
    const searchPStmt = db.prepare(
        `
        WITH fts AS(
            SELECT
                rowid,
                path,
                title,
                body,
                bm25(notes_fts, 500.0, 1000.0, 1.0) as rank
            FROM 
                notes_fts
            WHERE notes_fts MATCH ?
        )
        SELECT
            fts.path,
            n.title
        FROM
            fts
        JOIN
            notes AS n
        ON
            n.id = fts.rowid
    `
    )

    return searchPStmt.all(query)
}
