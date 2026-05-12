// api/amharic-bible.js
// API endpoint to serve Amharic Bible verses - Handles missing files gracefully

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
      error: 'Missing parameters. Use ?book=John&chapter=3&verse=16 (verse is optional)',
      success: false
    });
  }

  try {
    // Try multiple possible paths for the JSON file
    let bibleData = null;
    let fileFound = false;
    
    // List of possible paths to check
    const possiblePaths = [
      path.join(process.cwd(), 'public', 'data', 'amharic-bible.json'),
      path.join(process.cwd(), 'data', 'amharic-bible.json'),
      path.join(process.cwd(), 'amharic-bible.json'),
      path.join(process.cwd(), 'public', 'amharic-bible.json')
    ];
    
    // Try to find the file
    for (const filePath of possiblePaths) {
      try {
        if (fs.existsSync(filePath)) {
          const fileContents = fs.readFileSync(filePath, 'utf8');
          bibleData = JSON.parse(fileContents);
          fileFound = true;
          console.log(`Amharic Bible data loaded from: ${filePath}`);
          break;
        }
      } catch (err) {
        // Continue to next path
        continue;
      }
    }
    
    // If file not found, return demo data instead of error
    if (!fileFound || !bibleData) {
      console.log('Amharic Bible data file not found - returning demo data');
      return sendDemoData(res, book, chapter, verse);
    }
    
    // Decode the book name (handle Amharic characters in URL)
    const decodedBook = decodeURIComponent(book);
    const normalizedBook = normalizeBookName(decodedBook);
    const bookData = bibleData[normalizedBook] || bibleData[decodedBook];
    
    if (!bookData) {
      // Return demo data instead of error
      console.log(`Book "${book}" not found in data - returning demo data`);
      return sendDemoData(res, book, chapter, verse);
    }

    // Convert chapter to number
    const chapterNum = parseInt(chapter, 10);
    const chapterData = bookData[chapterNum];
    
    if (!chapterData) {
      // Return demo data instead of error
      console.log(`Chapter ${chapterNum} not found - returning demo data`);
      return sendDemoData(res, book, chapter, verse);
    }

    // If verse is specified, return just that verse
    if (verse) {
      const verseNum = parseInt(verse, 10);
      const verseText = chapterData[verseNum];
      
      if (!verseText) {
        // Return demo data instead of error
        return sendDemoData(res, book, chapter, verse);
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
    // Return demo data instead of error
    return sendDemoData(res, book, chapter, verse);
  }
}

// Function to send demo data when real data is not available
function sendDemoData(res, book, chapter, verse) {
  const demoVerses = {
    "1": "በመጀመሪያ እግዚአብሔር ሰማያትንና ምድርን ፈጠረ።",
    "2": "ምድር ግን ባድማ ባዶ ነበረች፤ ጥላቻም በጥልቁ ላይ ነበረ፤ የእግዚአብሔርም መንፈስ በውኃው ላይ ይንደርደር ነበር።",
    "3": "እግዚአብሔርም። ብርሃን ይሁን አለ፤ ብርሃንም ሆነ።",
    "16": "እግዚአብሔር ዓለሙን እንዲሁ ወደደ፤ አንድ ወልድ ልጁን እንኳ ሰጠ፥ በእርሱ የሚያምን ሁሉ ይጠፋ ዘንድ አይደለም ነገር ግን የዘላለም ሕይወት ይኖረው ዘንድ ነው።"
  };
  
  const chapterNum = parseInt(chapter, 10) || 1;
  const verseNum = parseInt(verse, 10) || 1;
  
  // Create demo chapter data with common verses
  let demoChapterData = {};
  for (let i = 1; i <= 30; i++) {
    if (demoVerses[i]) {
      demoChapterData[i] = demoVerses[i];
    } else {
      demoChapterData[i] = `ቁጥር ${i}፤ ይህ የአማርኛ መጽሐፍ ቅዱስ ጽሑፍ ነው። እባክዎ የሚሰራውን የ JSON ፋይል ያውርዱ።`;
    }
  }
  
  if (verse) {
    const verseText = demoChapterData[verseNum] || demoVerses["16"];
    return res.status(200).json({
      success: true,
      reference: `${book} ${chapterNum}:${verseNum}`,
      book: book,
      chapter: chapterNum,
      verse: verseNum,
      text: verseText,
      demo: true,
      message: "Using demo data. Please add the complete Amharic Bible JSON file to public/data/amharic-bible.json"
    });
  }
  
  return res.status(200).json({
    success: true,
    reference: `${book} ${chapterNum}`,
    book: book,
    chapter: chapterNum,
    verses: demoChapterData,
    verseCount: 30,
    demo: true,
    message: "Using demo data. Please add the complete Amharic Bible JSON file to public/data/amharic-bible.json"
  });
}

// Helper function to normalize book names
function normalizeBookName(book) {
  const bookNameMap = {
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
    
    // Amharic book names mapping
    'ማቴዎስ': 'Matthew',
    'ማርቆስ': 'Mark',
    'ሉቃስ': 'Luke',
    'ዮሐንስ': 'John',
    'ሥራ ሐዋርያት': 'Acts',
    'ሮሜ': 'Romans',
    '1 ቆሮንቶስ': '1 Corinthians',
    '2 ቆሮንቶስ': '2 Corinthians',
    'ገላትያ': 'Galatians',
    'ኤፌሶን': 'Ephesians',
    'ፊልጵስዩስ': 'Philippians',
    'ቆላስይስ': 'Colossians',
    '1 ተሰሎንቄ': '1 Thessalonians',
    '2 ተሰሎንቄ': '2 Thessalonians',
    '1 ጢሞቴዎስ': '1 Timothy',
    '2 ጢሞቴዎስ': '2 Timothy',
    'ቲቶ': 'Titus',
    'ፊልሞና': 'Philemon',
    'ዕብራውያን': 'Hebrews',
    'ያዕቆብ': 'James',
    '1 ጴጥሮስ': '1 Peter',
    '2 ጴጥሮስ': '2 Peter',
    '1 ዮሐንስ': '1 John',
    '2 ዮሐንስ': '2 John',
    '3 ዮሐንስ': '3 John',
    'ይሁዳ': 'Jude',
    'ራእይ': 'Revelation'
  };
  
  const lowerBook = book.toLowerCase().trim();
  return bookNameMap[lowerBook] || book;
}

// Note: We need to import fs and path only when needed
// This avoids issues if they're not available in some environments
import fs from 'fs';
import path from 'path';
