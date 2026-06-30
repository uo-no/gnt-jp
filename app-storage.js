/**
 * app-storage.js — アプリ全体の永続化レイヤー（単一窓口）
 *
 * 設計方針：
 *   - localStorage への直接アクセスはこのファイルのみが行う。
 *     他のスクリプトは window.App.storage 経由でのみ読み書きする。
 *   - 1キー（app_user_data）に全データを集約し、JSON として保存する。
 *   - private mode / quota超過などで localStorage が例外を投げても
 *     アプリ全体を落とさないよう、読み書きは必ず try/catch で保護する。
 *   - getter は内部状態への参照ではなく複製を返し、呼び出し側の
 *     直接変更で内部状態が壊れないようにする。
 */

(function () {
    'use strict';

    var STORAGE_KEY = 'app_user_data';
    var MAX_RECENT_VERSES = 30;
    var MAX_RECENT_WORDS = 50;

    function defaultState() {
        return {
            version: 1,
            bookmarks: [],
            notes: [],
            recentVerses: [],
            recentWords: [],
        };
    }

    var _state = null;

    /* 旧形式（refの生文字列のみ）を検出した場合、ref文字列は解析せずそのまま温存し、
       構造化フィールド（bookKey/chapter/verse）は未確定値で初期化する。
       そのrefが次回 addRecentVerse() で再訪問されれば、SSOT経由の正規データで自然に上書きされる。 */
    function migrateRecentVerseEntry(entry) {
        if (typeof entry === 'string') {
            return { ref: entry, bookKey: '', chapter: null, verse: null, timestamp: Date.now() };
        }
        if (entry && typeof entry === 'object' && entry.ref) {
            return {
                ref: entry.ref,
                bookKey: entry.bookKey || '',
                chapter: entry.chapter != null ? entry.chapter : null,
                verse: entry.verse != null ? entry.verse : null,
                timestamp: entry.timestamp != null ? entry.timestamp : Date.now(),
            };
        }
        return null;
    }

    /* 旧形式（{lemma, strong}のみ）に構造化フィールドを補完する。lemma/strongのパースは発生しない。 */
    function migrateRecentWordEntry(entry) {
        if (!entry || !entry.strong) return null;
        return {
            lemma: entry.lemma || '',
            strong: entry.strong,
            bookKey: entry.bookKey || '',
            chapter: entry.chapter != null ? entry.chapter : null,
            verse: entry.verse != null ? entry.verse : null,
            timestamp: entry.timestamp != null ? entry.timestamp : Date.now(),
        };
    }

    /* 旧形式（{ref}のみ）に構造化フィールドを補完する。ref文字列のパースは発生しない。
       bookKey/chapter/verseが未確定のまま残ったエントリは、そのrefが次回toggleBookmark()で
       再保存（解除→追加）されれば、SSOT経由の正規データで自然に上書きされる。 */
    function migrateBookmarkEntry(entry) {
        if (!entry || typeof entry !== 'object' || !entry.ref) return null;
        return {
            ref: entry.ref,
            bookKey: entry.bookKey || '',
            chapter: entry.chapter != null ? entry.chapter : null,
            verse: entry.verse != null ? entry.verse : null,
            createdAt: entry.createdAt != null ? entry.createdAt : Date.now(),
        };
    }

    /* 旧形式（{ref, content, updatedAt}のみ）に構造化フィールドを補完する。ref文字列のパースは発生しない。
       bookKey/chapter/verseが未確定のまま残ったエントリは、そのrefが次回saveNote()で
       再保存されれば、SSOT経由の正規データで自然に上書きされる。
       status/deletedAt（soft delete用）が無い既存データは active 扱いとして補完する。 */
    function migrateNoteEntry(entry) {
        if (!entry || typeof entry !== 'object' || !entry.ref) return null;
        return {
            ref: entry.ref,
            bookKey: entry.bookKey || '',
            chapter: entry.chapter != null ? entry.chapter : null,
            verse: entry.verse != null ? entry.verse : null,
            content: entry.content || '',
            updatedAt: entry.updatedAt != null ? entry.updatedAt : Date.now(),
            status: entry.status === 'deleted' ? 'deleted' : 'active',
            deletedAt: entry.deletedAt != null ? entry.deletedAt : null,
        };
    }

    function normalize(raw) {
        var state = defaultState();
        if (raw && typeof raw === 'object') {
            if (Array.isArray(raw.bookmarks)) {
                state.bookmarks = raw.bookmarks.map(migrateBookmarkEntry).filter(function (e) { return e; });
            }
            if (Array.isArray(raw.notes)) {
                state.notes = raw.notes.map(migrateNoteEntry).filter(function (e) { return e; });
            }
            if (Array.isArray(raw.recentVerses)) {
                state.recentVerses = raw.recentVerses.map(migrateRecentVerseEntry).filter(function (e) { return e; });
            }
            if (Array.isArray(raw.recentWords)) {
                state.recentWords = raw.recentWords.map(migrateRecentWordEntry).filter(function (e) { return e; });
            }
        }
        return state;
    }

    function loadUserData() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            _state = normalize(raw ? JSON.parse(raw) : null);
        } catch (_) {
            _state = defaultState();
        }
        return _state;
    }

    function ensureState() {
        if (!_state) loadUserData();
        return _state;
    }

    function saveUserData() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(ensureState()));
            return true;
        } catch (_) {
            return false;
        }
    }

    function addRecentVerse(entry) {
        if (!entry || !entry.ref) return;
        var state = ensureState();
        state.recentVerses = state.recentVerses.filter(function (v) {
            return v.ref !== entry.ref;
        });
        state.recentVerses.unshift({
            ref: entry.ref,
            bookKey: entry.bookKey || '',
            chapter: entry.chapter != null ? entry.chapter : null,
            verse: entry.verse != null ? entry.verse : null,
            timestamp: Date.now(),
        });
        if (state.recentVerses.length > MAX_RECENT_VERSES) {
            state.recentVerses = state.recentVerses.slice(0, MAX_RECENT_VERSES);
        }
        return saveUserData();
    }

    function addRecentWord(word) {
        if (!word || !word.strong) return;
        var state = ensureState();
        state.recentWords = state.recentWords.filter(function (w) {
            return w.strong !== word.strong;
        });
        state.recentWords.unshift({
            lemma: word.lemma,
            strong: word.strong,
            bookKey: word.bookKey || '',
            chapter: word.chapter != null ? word.chapter : null,
            verse: word.verse != null ? word.verse : null,
            timestamp: Date.now(),
        });
        if (state.recentWords.length > MAX_RECENT_WORDS) {
            state.recentWords = state.recentWords.slice(0, MAX_RECENT_WORDS);
        }
        return saveUserData();
    }

    function addBookmark(bookmark) {
        if (!bookmark || !bookmark.ref) return;
        var state = ensureState();
        var existed = state.bookmarks.some(function (b) {
            return b.ref === bookmark.ref;
        });
        if (existed) {
            state.bookmarks = state.bookmarks.filter(function (b) {
                return b.ref !== bookmark.ref;
            });
        } else {
            state.bookmarks.unshift({
                ref: bookmark.ref,
                bookKey: bookmark.bookKey || '',
                chapter: bookmark.chapter != null ? bookmark.chapter : null,
                verse: bookmark.verse != null ? bookmark.verse : null,
                createdAt: Date.now(),
            });
        }
        return saveUserData();
    }

    function removeBookmark(ref) {
        if (!ref) return;
        var state = ensureState();
        state.bookmarks = state.bookmarks.filter(function (b) {
            return b.ref !== ref;
        });
        return saveUserData();
    }

    function saveNote(ref, content, bookKey, chapter, verse) {
        if (!ref) return;
        var state = ensureState();
        var existing = state.notes.find(function (n) {
            return n.ref === ref;
        });
        if (existing) {
            existing.content = content;
            existing.bookKey = bookKey || existing.bookKey || '';
            existing.chapter = chapter != null ? chapter : (existing.chapter != null ? existing.chapter : null);
            existing.verse = verse != null ? verse : (existing.verse != null ? existing.verse : null);
            existing.updatedAt = Date.now();
        } else {
            state.notes.push({
                ref: ref,
                bookKey: bookKey || '',
                chapter: chapter != null ? chapter : null,
                verse: verse != null ? verse : null,
                content: content,
                updatedAt: Date.now(),
                status: 'active',
                deletedAt: null,
            });
        }
        return saveUserData();
    }

    /* soft delete: 物理削除はしない。status を 'deleted' にし、deletedAt を記録するのみ。 */
    function deleteNote(ref) {
        if (!ref) return;
        var state = ensureState();
        var existing = state.notes.find(function (n) {
            return n.ref === ref;
        });
        if (!existing) return;
        existing.status = 'deleted';
        existing.deletedAt = Date.now();
        return saveUserData();
    }

    /* ゴミ箱からの復元: status を 'active' に戻し、deletedAt をクリアする。 */
    function restoreNote(ref) {
        if (!ref) return;
        var state = ensureState();
        var existing = state.notes.find(function (n) {
            return n.ref === ref;
        });
        if (!existing) return;
        existing.status = 'active';
        existing.deletedAt = null;
        return saveUserData();
    }

    /* 完全削除（物理削除）。UIからは呼び出さない、明示的な関数としてのみ存在する。 */
    function purgeNote(ref) {
        if (!ref) return;
        var state = ensureState();
        state.notes = state.notes.filter(function (n) {
            return n.ref !== ref;
        });
        return saveUserData();
    }

    function getRecentVerses() {
        return ensureState().recentVerses.map(function (v) {
            return Object.assign({}, v);
        });
    }

    function getRecentWords() {
        return ensureState().recentWords.map(function (w) {
            return Object.assign({}, w);
        });
    }

    function getBookmarks() {
        return ensureState().bookmarks.map(function (b) {
            return Object.assign({}, b);
        });
    }

    /* 通常一覧用: 削除済み（status === 'deleted'）は含めない。 */
    function getNotes() {
        return ensureState().notes.filter(function (n) {
            return n.status !== 'deleted';
        }).map(function (n) {
            return Object.assign({}, n);
        });
    }

    /* ゴミ箱一覧用: 削除済みのみを返す。 */
    function getDeletedNotes() {
        return ensureState().notes.filter(function (n) {
            return n.status === 'deleted';
        }).map(function (n) {
            return Object.assign({}, n);
        });
    }

    /* App 名前空間への登録（二重ロード耐性: 既存インスタンスを上書きしない） */
    window.App = window.App || {};
    if (!window.App.storage) {
        window.App.storage = {
            loadUserData: loadUserData,
            saveUserData: saveUserData,
            addRecentVerse: addRecentVerse,
            addRecentWord: addRecentWord,
            addBookmark: addBookmark,
            removeBookmark: removeBookmark,
            saveNote: saveNote,
            deleteNote: deleteNote,
            restoreNote: restoreNote,
            purgeNote: purgeNote,
            getRecentVerses: getRecentVerses,
            getRecentWords: getRecentWords,
            getBookmarks: getBookmarks,
            getNotes: getNotes,
            getDeletedNotes: getDeletedNotes,
        };
    }
})();
