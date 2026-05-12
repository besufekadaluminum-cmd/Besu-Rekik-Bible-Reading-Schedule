// api/amharic-bible.js
// API endpoint to serve Amharic Bible verses

import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  const { book, chapter, verse } = req.query;

  // Validate required parameters
  if (!book || !chapter) {
    return res.status(400).json({ 
      error: 'Missing parameters. Use ?book=John&chapter=3&verse=16 (verse is optional)' 
    });
  }

  try {
    // Path to the Amharic Bible JSON file
    // You need to place the JSON file at: public/data/amharic-bible.json
    const filePath = path.join(process.cwd(), 'public', 'data', 'amharic-bible.json');
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        error: 'Amharic Bible data file not found. Please place the JSON file at public/data/amharic-bible.json',
        hint: 'Download from https://github.com/magna25/amharic-bible-json'
      });
    }
    
    // Read and parse the JSON file
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const bibleData = JSON.parse(fileContents);
    
    // Normalize book name (handle common variations)
    const normalizedBook = normalizeBookName(book);
    const bookData = bibleData[normalizedBook];
    
    if (!bookData) {
      // Provide list of available books for debugging
      const availableBooks = Object.keys(bibleData).slice(0, 20);
      return res.status(404).json({ 
        error: `Book "${book}" not found`,
        availableBooksExample: availableBooks,
        message: 'Check the book name. Use exact spelling from the list above.'
      });
    }

    // Convert chapter to number
    const chapterNum = parseInt(chapter, 10);
    const chapterData = bookData[chapterNum];
    
    if (!chapterData) {
      const maxChapter = Object.keys(bookData).length;
      return res.status(404).json({ 
        error: `Chapter ${chapterNum} not found in ${normalizedBook}`,
        maxChapter: maxChapter,
        message: `Valid chapters: 1-${maxChapter}`
      });
    }

    // If verse is specified, return just that verse
    if (verse) {
      const verseNum = parseInt(verse, 10);
      const verseText = chapterData[verseNum];
      
      if (!verseText) {
        const maxVerse = Object.keys(chapterData).length;
        return res.status(404).json({ 
          error: `Verse ${verseNum} not found in ${normalizedBook} ${chapterNum}`,
          maxVerse: maxVerse,
          message: `Valid verses: 1-${maxVerse}`
        });
      }
      
      return res.status(200).json({
        success: true,
        reference: `${normalizedBook} ${chapterNum}:${verseNum}`,
        book: normalizedBook,
        chapter: chapterNum,
        verse: verseNum,
        text: verseText
      });
    }
    
    // Return entire chapter if no verse specified
    return res.status(200).json({
      success: true,
      reference: `${normalizedBook} ${chapterNum}`,
      book: normalizedBook,
      chapter: chapterNum,
      verses: chapterData,
      verseCount: Object.keys(chapterData).length
    });
    
  } catch (error) {
    console.error('Amharic Bible API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

// Helper function to normalize book names
// This handles common variations in book name spelling
function normalizeBookName(book) {
  // Map of common variations to standard names
  const bookNameMap = {
    // New Testament
    'matthew': 'Matthew',
    'mark': 'Mark',
    'luke': 'Luke',
    'john': 'John',
    'acts': 'Acts',
    'romans': 'Romans',
    '1 corinthians': '1 Corinthians',
    '2 corinthians': '2 Corinthians',
    'galatians': 'Galatians',
    'ephesians': 'Ephesians',
    'philippians': 'Philippians',
    'colossians': 'Colossians',
    '1 thessalonians': '1 Thessalonians',
    '2 thessalonians': '2 Thessalonians',
    '1 timothy': '1 Timothy',
    '2 timothy': '2 Timothy',
    'titus': 'Titus',
    'philemon': 'Philemon',
    'hebrews': 'Hebrews',
    'james': 'James',
    '1 peter': '1 Peter',
    '2 peter': '2 Peter',
    '1 john': '1 John',
    '2 john': '2 John',
    '3 john': '3 John',
    'jude': 'Jude',
    'revelation': 'Revelation',
    
    // Old Testament (if you add it later)
    'genesis': 'Genesis',
    'exodus': 'Exodus',
    'leviticus': 'Leviticus',
    'numbers': 'Numbers',
    'deuteronomy': 'Deuteronomy',
    // Add more as needed
  };
  
  const lowerBook = book.toLowerCase().trim();
  return bookNameMap[lowerBook] || book;
}
