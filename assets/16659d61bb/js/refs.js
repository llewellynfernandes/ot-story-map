/* Scripture references: the book list and a parser that turns text such as
   "Genesis 12–25", "1 Kgs 14:25" or "Exodus 2 · 15 · Numbers 12" into passages.
   Shared by the page (to make references clickable) and by the build checks. */

// [id, display name, KJV data name, chapters, ...other names people write]
const BOOK_ROWS = [
  ["genesis", "Genesis", "Genesis", 50, "gen", "ge", "gn"],
  ["exodus", "Exodus", "Exodus", 40, "exod", "exo", "ex"],
  ["leviticus", "Leviticus", "Leviticus", 27, "lev", "le", "lv"],
  ["numbers", "Numbers", "Numbers", 36, "num", "nu", "nm"],
  ["deuteronomy", "Deuteronomy", "Deuteronomy", 34, "deut", "deu", "dt"],
  ["joshua", "Joshua", "Joshua", 24, "josh", "jos"],
  ["judges", "Judges", "Judges", 21, "judg", "jdg"],
  ["ruth", "Ruth", "Ruth", 4, "ru", "rth"],
  ["1samuel", "1 Samuel", "1 Samuel", 31, "1 sam", "1 sa", "1sam", "i samuel"],
  ["2samuel", "2 Samuel", "2 Samuel", 24, "2 sam", "2 sa", "2sam", "ii samuel"],
  ["1kings", "1 Kings", "1 Kings", 22, "1 kgs", "1 ki", "1kgs", "i kings"],
  ["2kings", "2 Kings", "2 Kings", 25, "2 kgs", "2 ki", "2kgs", "ii kings"],
  ["1chronicles", "1 Chronicles", "1 Chronicles", 29, "1 chron", "1 chr", "1 ch", "1chr"],
  ["2chronicles", "2 Chronicles", "2 Chronicles", 36, "2 chron", "2 chr", "2 ch", "2chr"],
  ["ezra", "Ezra", "Ezra", 10, "ezr"],
  ["nehemiah", "Nehemiah", "Nehemiah", 13, "neh", "ne"],
  ["esther", "Esther", "Esther", 10, "esth", "est"],
  ["job", "Job", "Job", 42, "jb"],
  ["psalms", "Psalms", "Psalms", 150, "psalm", "ps", "psa", "pss"],
  ["proverbs", "Proverbs", "Proverbs", 31, "prov", "pro", "prv"],
  ["ecclesiastes", "Ecclesiastes", "Ecclesiastes", 12, "eccl", "ecc", "qoh"],
  ["songofsolomon", "Song of Songs", "Solomon's Song", 8, "song of solomon", "song", "sos", "song of sol", "canticles"],
  ["isaiah", "Isaiah", "Isaiah", 66, "isa", "is"],
  ["jeremiah", "Jeremiah", "Jeremiah", 52, "jer", "je"],
  ["lamentations", "Lamentations", "Lamentations", 5, "lam", "la"],
  ["ezekiel", "Ezekiel", "Ezekiel", 48, "ezek", "eze", "ezk"],
  ["daniel", "Daniel", "Daniel", 12, "dan", "da", "dn"],
  ["hosea", "Hosea", "Hosea", 14, "hos", "ho"],
  ["joel", "Joel", "Joel", 3, "jl"],
  ["amos", "Amos", "Amos", 9, "am"],
  ["obadiah", "Obadiah", "Obadiah", 1, "obad", "ob"],
  ["jonah", "Jonah", "Jonah", 4, "jon", "jnh"],
  ["micah", "Micah", "Micah", 7, "mic", "mc"],
  ["nahum", "Nahum", "Nahum", 3, "nah", "na"],
  ["habakkuk", "Habakkuk", "Habakkuk", 3, "hab", "hb"],
  ["zephaniah", "Zephaniah", "Zephaniah", 3, "zeph", "zep"],
  ["haggai", "Haggai", "Haggai", 2, "hag", "hg"],
  ["zechariah", "Zechariah", "Zechariah", 14, "zech", "zec"],
  ["malachi", "Malachi", "Malachi", 4, "mal"],
  ["matthew", "Matthew", "Matthew", 28, "matt", "mt"],
  ["mark", "Mark", "Mark", 16, "mk", "mrk"],
  ["luke", "Luke", "Luke", 24, "lk", "luk"],
  ["john", "John", "John", 21, "jn", "jhn"],
  ["acts", "Acts", "Acts", 28, "ac"],
  ["romans", "Romans", "Romans", 16, "rom", "ro"],
  ["1corinthians", "1 Corinthians", "1 Corinthians", 16, "1 cor", "1cor", "1 co"],
  ["2corinthians", "2 Corinthians", "2 Corinthians", 13, "2 cor", "2cor", "2 co"],
  ["galatians", "Galatians", "Galatians", 6, "gal", "ga"],
  ["ephesians", "Ephesians", "Ephesians", 6, "eph"],
  ["philippians", "Philippians", "Philippians", 4, "phil", "php"],
  ["colossians", "Colossians", "Colossians", 4, "col"],
  ["1thessalonians", "1 Thessalonians", "1 Thessalonians", 5, "1 thess", "1 th", "1thess"],
  ["2thessalonians", "2 Thessalonians", "2 Thessalonians", 3, "2 thess", "2 th", "2thess"],
  ["1timothy", "1 Timothy", "1 Timothy", 6, "1 tim", "1 ti", "1tim"],
  ["2timothy", "2 Timothy", "2 Timothy", 4, "2 tim", "2 ti", "2tim"],
  ["titus", "Titus", "Titus", 3, "tit"],
  ["philemon", "Philemon", "Philemon", 1, "phlm", "philem", "phm"],
  ["hebrews", "Hebrews", "Hebrews", 13, "heb"],
  ["james", "James", "James", 5, "jas", "jm"],
  ["1peter", "1 Peter", "1 Peter", 5, "1 pet", "1 pe", "1pet"],
  ["2peter", "2 Peter", "2 Peter", 3, "2 pet", "2 pe", "2pet"],
  ["1john", "1 John", "1 John", 5, "1 jn", "1jn", "1 jhn"],
  ["2john", "2 John", "2 John", 1, "2 jn", "2jn"],
  ["3john", "3 John", "3 John", 1, "3 jn", "3jn"],
  ["jude", "Jude", "Jude", 1, "jud"],
  ["revelation", "Revelation", "Revelation", 22, "rev", "re", "apocalypse"],
];

// Hindi book names, as in the Indian Revised Version (same order as above).
const HINDI = ["उत्पत्ति","निर्गमन","लैव्यव्यवस्था","गिनती","व्यवस्थाविवरण","यहोशू","न्यायियों","रूत","1 शमूएल","2 शमूएल","1 राजाओं","2 राजाओं","1 इतिहास","2 इतिहास","एज्रा","नहेम्याह","एस्तेर","अय्यूब","भजन संहिता","नीतिवचन","सभोपदेशक","श्रेष्ठगीत","यशायाह","यिर्मयाह","विलापगीत","यहेजकेल","दानिय्येल","होशे","योएल","आमोस","ओबद्याह","योना","मीका","नहूम","हबक्कूक","सपन्याह","हाग्गै","जकर्याह","मलाकी",
  "मत्ती","मरकुस","लूका","यूहन्ना","प्रेरितों के काम","रोमियों","1 कुरिन्थियों","2 कुरिन्थियों","गलातियों","इफिसियों","फिलिप्पियों","कुलुस्सियों","1 थिस्सलुनीकियों","2 थिस्सलुनीकियों","1 तीमुथियुस","2 तीमुथियुस","तीतुस","फिलेमोन","इब्रानियों","याकूब","1 पतरस","2 पतरस","1 यूहन्ना","2 यूहन्ना","3 यूहन्ना","यहूदा","प्रकाशितवाक्य"];

export const BOOKS = BOOK_ROWS.map(([id, name, kjv, chapters], i) => ({
  id, name, kjv, chapters, hi: HINDI[i], index: i, testament: i < 39 ? "OT" : "NT",
}));

/* A book's name in the given language ("en" or "hi"). */
export const bookName = (id, lang = "en") => (lang === "hi" ? BOOK[id].hi : BOOK[id].name);
export const BOOK = Object.fromEntries(BOOKS.map(b => [b.id, b]));

// Every way of writing a book name, longest first so "1 Samuel" wins over "1 Sam".
const ALIASES = BOOK_ROWS.flatMap(([id, name, kjv, , ...more]) =>
  [name, kjv, id, ...more].map(a => [a.toLowerCase().replace(/\.$/, ""), id])
).sort((a, b) => b[0].length - a[0].length);
const DASH = "[–—-]";

/* Match a book name at the start of s. Returns [bookId, matchedLength] or null. */
function matchBook(s) {
  const lower = s.toLowerCase();
  for (const [alias, id] of ALIASES) {
    if (!lower.startsWith(alias)) continue;
    let len = alias.length;
    if (s[len] === ".") len++;                       // "Gen."
    const next = s[len];
    if (next === undefined || /[\s\d:;,·–—-]/.test(next)) return [id, len];
  }
  return null;
}

/* The book a piece of text starts with, if any: "Genesis 51" → "genesis". */
export function leadingBook(text) {
  const m = matchBook(String(text).trimStart());
  return m ? m[0] : null;
}

/* Read "12", "12:3" or "12:3-8" at the start of s. */
function matchChapterVerse(s) {
  const m = s.match(/^(\d{1,3})(?::(\d{1,3}))?/);
  return m ? { chapter: +m[1], verse: m[2] ? +m[2] : null, len: m[0].length } : null;
}

/* Parse one reference segment (no separators inside).
   prevBook lets "Gen 15; 17" read the 17 as Genesis 17.
   Returns { passage, len } where len is how much of the segment was used. */
function parseSegment(seg, prevBook) {
  let i = 0, book = null;
  const lead = seg.match(/^\s*/)[0].length; i = lead;
  const bm = matchBook(seg.slice(i));
  if (bm) { book = bm[0]; i += bm[1]; }
  else if (!prevBook) return null;

  const rest = seg.slice(i);
  const ws = rest.match(/^\s*/)[0].length;
  const cv = matchChapterVerse(rest.slice(ws));

  if (!book) {
    // Bare numbers only count when they are the whole segment: "17" yes, "20 generations" no.
    if (!cv) return null;
    const tail = rest.slice(ws + cv.len);
    const range = tail.match(new RegExp(`^\\s*${DASH}\\s*(\\d{1,3})(?::(\\d{1,3}))?`));
    const after = range ? tail.slice(range[0].length) : tail;
    if (after.trim() !== "") return null;
    book = prevBook;
  }

  const p = { book, chapter: cv ? cv.chapter : 1, verse: cv ? cv.verse : null, wholeBook: !cv };
  i += cv ? ws + cv.len : 0;

  // Optional range: "–5", "–20" (verses), "–3:4", "– Numbers 20", "– Deuteronomy"
  const tail = seg.slice(i);
  const dm = tail.match(new RegExp(`^\\s*${DASH}\\s*`));
  if (dm) {
    const after = tail.slice(dm[0].length);
    const eb = matchBook(after);
    if (eb) {
      const r2 = after.slice(eb[1]);
      const ws2 = r2.match(/^\s*/)[0].length;
      const cv2 = matchChapterVerse(r2.slice(ws2));
      p.endBook = eb[0];
      if (cv2) { p.endChapter = cv2.chapter; p.endVerse = cv2.verse; }
      i += dm[0].length + eb[1] + (cv2 ? ws2 + cv2.len : 0);
    } else {
      const cv2 = matchChapterVerse(after);
      if (cv2 && cv) {
        if (cv2.verse != null) { p.endChapter = cv2.chapter; p.endVerse = cv2.verse; }
        else if (p.verse != null) { p.endChapter = p.chapter; p.endVerse = cv2.chapter; }
        else p.endChapter = cv2.chapter;
        i += dm[0].length + cv2.len;
      }
    }
  }
  return { passage: p, len: i };
}

/* Split text into parts: { text } for plain text and { text, passage } for references. */
export function parseRefs(text) {
  const parts = [];
  if (!text) return parts;
  // Separators: ";", "·", ",", and " and " between references.
  const pieces = String(text).split(/(\s*[;·,]\s*|\s+and\s+)/);
  let prevBook = null;
  for (const piece of pieces) {
    if (piece === "") continue;
    if (/^\s*[;·,]\s*$|^\s+and\s+$/.test(piece)) { parts.push({ text: piece }); continue; }
    const r = parseSegment(piece, prevBook);
    if (!r || !validPassage(r.passage)) { parts.push({ text: piece }); continue; }
    prevBook = r.passage.endBook || r.passage.book;
    const lead = piece.match(/^\s*/)[0];
    if (lead) parts.push({ text: lead });
    parts.push({ text: piece.slice(lead.length, r.len), passage: r.passage });
    if (r.len < piece.length) parts.push({ text: piece.slice(r.len) });
  }
  return parts;
}

/* Chapter numbers must exist. Verse counts are checked by the build, which has the text. */
export function validPassage(p) {
  const b = BOOK[p.book];
  if (!b || p.chapter < 1 || p.chapter > b.chapters) return false;
  if (p.endBook) {
    const e = BOOK[p.endBook];
    if (!e || (p.endChapter && p.endChapter > e.chapters)) return false;
  } else if (p.endChapter && (p.endChapter < p.chapter || p.endChapter > b.chapters)) return false;
  return true;
}

/* "Genesis 12:1–3" style label for a passage, in English or Hindi. */
export function passageLabel(p, lang = "en") {
  const b = bookName(p.book, lang);
  if (p.wholeBook && !p.endBook) return b;
  let s = `${b} ${p.chapter}${p.verse != null ? ":" + p.verse : ""}`;
  if (p.endBook) s += ` – ${bookName(p.endBook, lang)}${p.endChapter ? " " + p.endChapter : ""}${p.endVerse != null ? ":" + p.endVerse : ""}`;
  else if (p.endChapter && p.endVerse != null && p.endChapter !== p.chapter) s += `–${p.endChapter}:${p.endVerse}`;
  else if (p.endVerse != null) s += `–${p.endVerse}`;
  else if (p.endChapter) s += `–${p.endChapter}`;
  return s;
}

/* Compact string form used in data attributes: "genesis.12.1-genesis.12.3" */
export function encodePassage(p) {
  const a = [p.book, p.chapter, p.verse ?? ""].join(".");
  const endBook = p.endBook || p.book;
  const hasEnd = p.endBook || p.endChapter || p.endVerse != null;
  return hasEnd ? `${a}-${[endBook, p.endChapter ?? "", p.endVerse ?? ""].join(".")}` : a;
}
export function decodePassage(s) {
  const [a, b] = String(s).split("-");
  const [book, ch, v] = a.split(".");
  const p = { book, chapter: +ch || 1, verse: v ? +v : null };
  if (b) {
    const [eb, ec, ev] = b.split(".");
    if (eb && eb !== book) p.endBook = eb;
    if (ec) p.endChapter = +ec;
    if (ev) p.endVerse = +ev;
  }
  return p;
}
