// api/amharic-bible.js
// Proxy API that fetches from external Amharic Bible source

// External Amharic Bible sources (try in order until one works)
const BIBLE_SOURCES = [
  'https://raw.githubusercontent.com/magna25/amharic-bible-json/main/bible.json',
  'https://cdn.jsdelivr.net/gh/getbible/Unbound-Biola/Amharic__Haile_Selassie_Amharic_Bible__hsab__LTR.json',
  'https://raw.githubusercontent.com/Dawit-Sh/Amharic-Bible-Markdown/main/bible.json'
];

let cachedBibleData = null;
let lastFetchTime = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { book, chapter, verse } = req.query;

  if (!book || !chapter) {
    return res.status(200).json({ 
      success: false,
      error: 'Missing parameters. Use ?book=Matthew&chapter=1&verse=16',
      demo: true,
      text: getDemoAmharicText(book, chapter, verse)
    });
  }

  try {
    let bibleData = await getBibleData();
    
    if (!bibleData) {
      return res.status(200).json({
        success: true,
        demo: true,
        book: book,
        chapter: chapter,
        verse: verse || 'all',
        text: getDemoAmharicText(book, chapter, verse),
        message: "Using demo Amharic text. External Bible source temporarily unavailable."
      });
    }

    const bookData = findBookData(bibleData, book);
    
    if (!bookData) {
      return res.status(200).json({
        success: true,
        demo: true,
        book: book,
        chapter: chapter,
        text: getDemoAmharicText(book, chapter, verse),
        message: `Book "${book}" not found in external source. Using demo text.`
      });
    }

    const chapterData = bookData[chapter];
    
    if (!chapterData) {
      return res.status(200).json({
        success: true,
        demo: true,
        book: book,
        chapter: chapter,
        text: getDemoAmharicText(book, chapter, verse),
        message: `Chapter ${chapter} not found. Using demo text.`
      });
    }

    if (verse) {
      const verseText = chapterData[verse];
      return res.status(200).json({
        success: true,
        reference: `${book} ${chapter}:${verse}`,
        text: verseText || getDemoAmharicText(book, chapter, verse),
        book: book,
        chapter: chapter,
        verse: verse
      });
    }

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
      text: getDemoAmharicText(book, chapter, verse),
      error: error.message
    });
  }
}

async function getBibleData() {
  if (cachedBibleData && (Date.now() - lastFetchTime) < CACHE_DURATION) {
    return cachedBibleData;
  }

  for (const source of BIBLE_SOURCES) {
    try {
      console.log(`Trying to fetch from: ${source}`);
      const response = await fetch(source);
      
      if (response.ok) {
        const data = await response.json();
        cachedBibleData = data;
        lastFetchTime = Date.now();
        console.log(`Successfully loaded Bible data from: ${source}`);
        return data;
      }
    } catch (error) {
      console.log(`Failed to fetch from ${source}:`, error.message);
      continue;
    }
  }
  
  return null;
}

function findBookData(bibleData, bookName) {
  const searchNames = [
    bookName,
    bookName.toLowerCase(),
    bookName.charAt(0).toUpperCase() + bookName.slice(1).toLowerCase(),
    getAmharicBookName(bookName)
  ];
  
  for (const name of searchNames) {
    if (bibleData[name]) return bibleData[name];
    if (bibleData[name]?.chapters) return bibleData[name].chapters;
  }
  
  for (const [key, value] of Object.entries(bibleData)) {
    if (key.toLowerCase().includes(bookName.toLowerCase())) {
      return value.chapters || value;
    }
  }
  
  return null;
}

function getAmharicBookName(englishName) {
  const bookMap = {
    'Matthew': 'ማቴዎስ',
    'Mark': 'ማርቆስ',
    'Luke': 'ሉቃስ',
    'John': 'ዮሐንስ',
    'Acts': 'ሥራ ሐዋርያት',
    'Romans': 'ሮሜ',
    '1 Corinthians': '1 ቆሮንቶስ',
    '2 Corinthians': '2 ቆሮንቶስ',
    'Galatians': 'ገላትያ',
    'Ephesians': 'ኤፌሶን',
    'Philippians': 'ፊልጵስዩስ',
    'Colossians': 'ቆላስይስ',
    '1 Thessalonians': '1 ተሰሎንቄ',
    '2 Thessalonians': '2 ተሰሎንቄ',
    '1 Timothy': '1 ጢሞቴዎስ',
    '2 Timothy': '2 ጢሞቴዎስ',
    'Titus': 'ቲቶ',
    'Philemon': 'ፊልሞና',
    'Hebrews': 'ዕብራውያን',
    'James': 'ያዕቆብ',
    '1 Peter': '1 ጴጥሮስ',
    '2 Peter': '2 ጴጥሮስ',
    '1 John': '1 ዮሐንስ',
    '2 John': '2 ዮሐንስ',
    '3 John': '3 ዮሐንስ',
    'Jude': 'ይሁዳ',
    'Revelation': 'ራእይ'
  };
  return bookMap[englishName] || englishName;
}

function getDemoAmharicText(book, chapter, verse) {
  const verseNum = parseInt(verse) || 1;
  
  const demoVerses = {
    1: "በመጀመሪያ እግዚአብሔር ሰማያትንና ምድርን ፈጠረ።",
    16: "እግዚአብሔር ዓለሙን እንዲሁ ወደደ፤ አንድ ወልድ ልጁን እንኳ ሰጠ፥ በእርሱ የሚያምን ሁሉ ይጠፋ ዘንድ አይደለም ነገር ግን የዘላለም ሕይወት ይኖረው ዘንድ ነው።"
  };
  
  if (verse && demoVerses[verseNum]) {
    return demoVerses[verseNum];
  }
  
  return `የ${book} ምዕራፍ ${chapter} በአማርኛ። ይህ የአማርኛ መጽሐፍ ቅዱስ ጽሑፍ ነው። (የማሳያ ጽሑፍ)`;
}
