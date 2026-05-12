// api/amharic-bible.js
// Simple working API for Amharic Bible

// Direct URL to a reliable Amharic Bible source (using a CDN)
const AMHARIC_BIBLE_URL = 'https://cdn.jsdelivr.net/gh/getbible/Unbound-Biola/Amharic__Haile_Selassie_Amharic_Bible__hsab__LTR.json';

// Cache for Bible data
let cachedBibleData = null;
let lastFetchTime = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { book, chapter, verse } = req.query;

  console.log(`Request received: book=${book}, chapter=${chapter}, verse=${verse}`);

  if (!book || !chapter) {
    return res.status(200).json({ 
      success: false,
      error: 'Missing parameters',
      demo: true,
      text: getDemoText(book, chapter, verse)
    });
  }

  try {
    // Get Bible data
    let bibleData = await getBibleData();
    
    if (!bibleData) {
      console.log('No Bible data available, returning demo text');
      return res.status(200).json({
        success: true,
        demo: true,
        book: book,
        chapter: chapter,
        verse: verse || 'all',
        text: getDemoText(book, chapter, verse)
      });
    }

    // Find the book (case-insensitive)
    const bookKey = findBookKey(bibleData, book);
    
    if (!bookKey) {
      console.log(`Book "${book}" not found`);
      return res.status(200).json({
        success: true,
        demo: true,
        book: book,
        chapter: chapter,
        text: getDemoText(book, chapter, verse),
        message: `Book "${book}" not found. Using demo text.`
      });
    }

    const bookData = bibleData[bookKey];
    const chapterNum = parseInt(chapter, 10);
    
    // Find the chapter
    let chapterData = null;
    if (bookData.chapters && bookData.chapters[chapterNum]) {
      chapterData = bookData.chapters[chapterNum];
    } else if (bookData[chapterNum]) {
      chapterData = bookData[chapterNum];
    } else if (bookData.verses && bookData.verses[chapterNum]) {
      chapterData = bookData.verses[chapterNum];
    }
    
    if (!chapterData) {
      console.log(`Chapter ${chapterNum} not found in ${bookKey}`);
      return res.status(200).json({
        success: true,
        demo: true,
        book: book,
        chapter: chapter,
        text: getDemoText(book, chapter, verse),
        message: `Chapter ${chapter} not found. Using demo text.`
      });
    }

    // If verse is specified
    if (verse) {
      const verseNum = parseInt(verse, 10);
      let verseText = null;
      
      if (chapterData[verseNum]) {
        verseText = chapterData[verseNum];
      } else if (chapterData.verses && chapterData.verses[verseNum]) {
        verseText = chapterData.verses[verseNum];
      }
      
      if (verseText) {
        return res.status(200).json({
          success: true,
          reference: `${book} ${chapter}:${verse}`,
          text: verseText,
          book: book,
          chapter: chapter,
          verse: verse
        });
      } else {
        return res.status(200).json({
          success: true,
          demo: true,
          reference: `${book} ${chapter}:${verse}`,
          text: getDemoText(book, chapter, verse),
          message: `Verse ${verse} not found. Using demo text.`
        });
      }
    }

    // Return entire chapter
    return res.status(200).json({
      success: true,
      reference: `${book} ${chapter}`,
      verses: chapterData,
      verseCount: Object.keys(chapterData).length,
      book: book,
      chapter: chapter
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(200).json({
      success: true,
      demo: true,
      book: book,
      chapter: chapter,
      verse: verse || 'all',
      text: getDemoText(book, chapter, verse),
      error: error.message
    });
  }
}

async function getBibleData() {
  // Return cached data if still valid
  if (cachedBibleData && (Date.now() - lastFetchTime) < CACHE_DURATION) {
    console.log('Using cached Bible data');
    return cachedBibleData;
  }

  try {
    console.log(`Fetching Bible data from: ${AMHARIC_BIBLE_URL}`);
    const response = await fetch(AMHARIC_BIBLE_URL);
    
    if (!response.ok) {
      console.log(`Failed to fetch: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    cachedBibleData = data;
    lastFetchTime = Date.now();
    console.log('Bible data cached successfully');
    return data;
  } catch (error) {
    console.error('Error fetching Bible data:', error.message);
    return null;
  }
}

function findBookKey(bibleData, searchBook) {
  const searchLower = searchBook.toLowerCase().trim();
  
  // Common book name mappings
  const bookMappings = {
    'matthew': 'Matthew',
    'mark': 'Mark',
    'luke': 'Luke',
    'john': 'John',
    'acts': 'Acts',
    'romans': 'Romans',
    '1 corinthians': '1Corinthians',
    '1corinthians': '1Corinthians',
    '2 corinthians': '2Corinthians',
    '2corinthians': '2Corinthians',
    'galatians': 'Galatians',
    'ephesians': 'Ephesians',
    'philippians': 'Philippians',
    'colossians': 'Colossians',
    '1 thessalonians': '1Thessalonians',
    '1thessalonians': '1Thessalonians',
    '2 thessalonians': '2Thessalonians',
    '2thessalonians': '2Thessalonians',
    '1 timothy': '1Timothy',
    '1timothy': '1Timothy',
    '2 timothy': '2Timothy',
    '2timothy': '2Timothy',
    'titus': 'Titus',
    'philemon': 'Philemon',
    'hebrews': 'Hebrews',
    'james': 'James',
    '1 peter': '1Peter',
    '1peter': '1Peter',
    '2 peter': '2Peter',
    '2peter': '2Peter',
    '1 john': '1John',
    '1john': '1John',
    '2 john': '2John',
    '2john': '2John',
    '3 john': '3John',
    '3john': '3John',
    'jude': 'Jude',
    'revelation': 'Revelation'
  };
  
  const mappedName = bookMappings[searchLower] || searchBook;
  
  // Try to find the book
  for (const key of Object.keys(bibleData)) {
    if (key.toLowerCase() === mappedName.toLowerCase()) {
      return key;
    }
    if (key.toLowerCase() === searchLower) {
      return key;
    }
  }
  
  // Try partial match
  for (const key of Object.keys(bibleData)) {
    if (key.toLowerCase().includes(searchLower) || searchLower.includes(key.toLowerCase())) {
      return key;
    }
  }
  
  return null;
}

function getDemoText(book, chapter, verse) {
  const verseNum = parseInt(verse) || 1;
  
  // Demo Amharic verses
  const demoVerses = {
    1: `በመጀመሪያ እግዚአብሔር ሰማያትንና ምድርን ፈጠረ። (${book} ${chapter}:1 - ማሳያ ጽሑፍ)`,
    2: `ምድር ግን ባድማ ባዶ ነበረች፤ ጥላቻም በጥልቁ ላይ ነበረ፤ (${book} ${chapter}:2 - ማሳያ ጽሑፍ)`,
    3: `እግዚአብሔርም። ብርሃን ይሁን አለ፤ ብርሃንም ሆነ። (${book} ${chapter}:3 - ማሳያ ጽሑፍ)`,
    16: `እግዚአብሔር ዓለሙን እንዲሁ ወደደ፤ አንድ ወልድ ልጁን እንኳ ሰጠ፥ በእርሱ የሚያምን ሁሉ ይጠፋ ዘንድ አይደለም ነገር ግን የዘላለም ሕይወት ይኖረው ዘንድ ነው። (ዮሐንስ 3:16 - ማሳያ ጽሑፍ)`
  };
  
  if (verseNum === 16) {
    return demoVerses[16];
  }
  
  return demoVerses[verseNum] || `የ${book} ምዕራፍ ${chapter} ቁጥር ${verseNum} በአማርኛ። (ማሳያ ጽሑፍ - ይህ ጊዜያዊ ጽሑፍ ነው)`;
}
